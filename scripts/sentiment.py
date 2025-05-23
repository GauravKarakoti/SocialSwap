import spacy
from tweepy import Client
from farcaster import Warpcast

# Load NLP model (custom spaCy pipeline with sentiment)
nlp = spacy.load("en_core_web_sm")

def get_sentiment(text):
    doc = nlp(text)
    return doc._.sentiment # Custom attribute added via spaCy pipeline

# Scrape X (Twitter) for $TICKER
twitter = Client(bearer_token="YOUR_TWITTER_TOKEN")
farcaster = Warpcast(api_key="YOUR_FARCASTER_KEY")

def scrape_posts(ticker):
    tweets = twitter.search_recent_tweets(f"${ticker}", max_results=100)
    casts = farcaster.get_casts_with_hashtag(ticker)
    
    combined = [
        *[t.text for t in tweets.data],
        *[c.text for c in casts.casts]
    ]
    
    scores = [get_sentiment(text) for text in combined]
    return sum(scores) / len(scores) if scores else 0.5