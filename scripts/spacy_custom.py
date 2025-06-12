import spacy
from spacy.tokens import Doc

def add_sentiment_pipe(nlp):
    # Create custom sentiment attribute
    if not Doc.has_extension("sentiment"):
        Doc.set_extension("sentiment", default=0.5)
    
    # Add simple rule-based sentiment
    nlp.add_pipe("sentiment_calculator", last=True)
    return nlp

@spacy.Language.component("sentiment_calculator")
def sentiment_calculator(doc):
    # Simple rule-based sentiment
    positive = sum(token.sentiment > 0 for token in doc)
    negative = sum(token.sentiment < 0 for token in doc)
    total = len(doc)
    
    # Calculate basic sentiment score
    if total > 0:
        sentiment = (positive - negative) / total
        doc._.sentiment = (sentiment + 1) / 2  # Scale to 0-1
    else:
        doc._.sentiment = 0.5
    
    return doc