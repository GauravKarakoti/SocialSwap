import spacy.cli
from tweepy import Client
from farcaster import Warpcast
import os
from dotenv import load_dotenv
from transformers import pipeline
import torch
from spacy_custom import add_sentiment_pipe

load_dotenv()

try:
    NLP = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy model 'en_core_web_sm'...")
    spacy.cli.download("en_core_web_sm")
    NLP = spacy.load("en_core_web_sm")

nlp = add_sentiment_pipe(NLP)
gpt4 = pipeline(
   "text-classification",
   model="Intel/neural-chat-7b-v3-1",
   device=0 if torch.cuda.is_available() else -1,
   torch_dtype=torch.float16
)

def get_sentiment(text):
    doc = nlp(text)
    spacy_score = doc._.sentiment
    
    if 0.4 <= spacy_score <= 0.6:
     gpt_result = gpt4(text[:512])[0]  # Truncate to 512 tokens
     if gpt_result['label'] == 'POSITIVE':
         return max(spacy_score, gpt_result['score'])
     else:
         return min(spacy_score, 1 - gpt_result['score'])
             
    return spacy_score

# Scrape X (Twitter) for $TICKER
twitter = Client(bearer_token=os.getenv("TWITTER_BEARER_TOKEN"))
farcaster = Warpcast(api_key=os.getenv("FARCASTER_API_KEY"))

def scrape_posts(ticker):
    tweets = twitter.search_recent_tweets(f"${ticker}", max_results=100)
    casts = farcaster.get_casts_with_hashtag(ticker)
    
    combined = [
        *[t.text for t in tweets.data],
        *[c.text for c in casts.casts]
    ]
    
    scores = [get_sentiment(text) for text in combined]
    return sum(scores) / len(scores) if scores else 0.5