import spacy.cli
from tweepy import Client, Paginator
from farcaster import Warpcast
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from transformers import pipeline
import torch
import numpy as np
from spacy_custom import add_sentiment_pipe
from textblob import TextBlob
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

def load_models():
    try:
        NLP = spacy.load("en_core_web_sm")
    except OSError:
        print("Downloading spaCy model 'en_core_web_sm'...")
        spacy.cli.download("en_core_web_sm")
        NLP = spacy.load("en_core_web_sm")

    nlp = add_sentiment_pipe(NLP)

    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    device = 0 if torch.cuda.is_available() else -1

    gpt4 = pipeline(
        "text-classification",
        model="Intel/neural-chat-7b-v3-1",
        device=device,
        torch_dtype=torch_dtype,
        truncation=True,
        max_length=512
    )

    return nlp, gpt4

nlp, gpt4 = load_models()

def get_sentiment(text):
    try:
        doc = nlp(text)
        spacy_score = doc._.sentiment
        
        if 0.4 <= spacy_score <= 0.6:
            gpt_result = gpt4(text[:512])[0]  # Truncate to 512 tokens
            if gpt_result['label'] == 'POSITIVE':
                return max(spacy_score, gpt_result['score'])
            else:
                return min(spacy_score, 1 - gpt_result['score'])
                
        return spacy_score
    except Exception as e:
        print(f"Sentiment error: {e}")
        # Fallback to TextBlob
        blob = TextBlob(text)
        return (blob.sentiment.polarity + 1) / 2

def analyze_sentiment(text):
    try:
        # Rule-based filtering
        if any(term in text.lower() for term in ['shitcoin', 'rug pull', 'scam']):
            return 0.2
        
        # Contextual sarcasm detection
        if '🚀' in text and 'dump' in text.lower():
            return 0.3
            
        # Initial spaCy analysis
        doc = nlp(text)
        spacy_score = np.mean([token.sentiment for token in doc if token.sentiment != 0] or [0.5])
        
        # GPT-4 for ambiguous cases
        if 0.4 <= spacy_score <= 0.6:
            result = gpt4(text[:512])[0]
            if result['label'] == 'POSITIVE':
                gpt_score = result['score']
                return max(spacy_score, gpt_score)
            else:
                gpt_score = 1 - result['score']
                return min(spacy_score, gpt_score)
                
        return spacy_score
    except Exception as e:
        print(f"Sentiment error: {e}")
        # Fallback with TextBlob
        blob = TextBlob(text)
        return (blob.sentiment.polarity + 1) / 2

# Scrape X (Twitter) for $TICKER
twitter = Client(bearer_token=os.getenv("TWITTER_BEARER_TOKEN"))
farcaster = Warpcast(api_key=os.getenv("FARCASTER_API_KEY"))

def get_twitter_posts(ticker, max_posts=200):
    client = Client(bearer_token=os.getenv("TWITTER_BEARER_TOKEN"))
    query = f"${ticker} lang:en -is:retweet"
    tweets = []
    
    for response in Paginator(
        client.search_recent_tweets,
        query,
        max_results=100,
        limit=5
    ):
        tweets.extend([t.text for t in response.data or []])
        if len(tweets) >= max_posts:
            break
            
    return tweets[:max_posts]

def get_farcaster_posts(ticker, max_posts=100):
    fcast = Warpcast(api_key=os.getenv("FARCASTER_API_KEY"))
    casts = fcast.get_casts_with_hashtag(ticker, limit=max_posts)
    return [cast.text for cast in casts.casts]

# Parallel processing
def get_posts(ticker):
    with ThreadPoolExecutor() as executor:
        twitter_future = executor.submit(get_twitter_posts, ticker)
        farcaster_future = executor.submit(get_farcaster_posts, ticker)
        return twitter_future.result() + farcaster_future.result()

# Main function with caching
def analyze_ticker(ticker):
    # Check cache first
    cache_file = f"sentiment_cache/{ticker}.json"
    if os.path.exists(cache_file):
        with open(cache_file) as f:
            data = json.load(f)
            if datetime.now() - datetime.fromisoformat(data['timestamp']) < timedelta(minutes=4.5):
                return data['score']
    
    posts = get_posts(ticker)
    if not posts:
        return 0.5
        
    # Parallel sentiment analysis
    with ThreadPoolExecutor(max_workers=4) as executor:
        scores = list(executor.map(analyze_sentiment, posts))
    
    avg_score = np.mean(scores)
    
    # Update cache
    os.makedirs("sentiment_cache", exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump({
            'score': avg_score,
            'timestamp': datetime.now().isoformat(),
            'sample_size': len(posts)
        }, f)
    
    return avg_score

if __name__ == "__main__":
    import sys
    ticker = sys.argv[1].lower()
    print(analyze_ticker(ticker))