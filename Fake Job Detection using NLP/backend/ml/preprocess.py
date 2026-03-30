"""
Text preprocessing pipeline for fake job detection.
"""
import re
import string

# Lazy import nltk to avoid errors if not installed
_stopwords = None

def _get_stopwords():
    global _stopwords
    if _stopwords is None:
        try:
            from nltk.corpus import stopwords
            import nltk
            try:
                _stopwords = set(stopwords.words('english'))
            except LookupError:
                nltk.download('stopwords', quiet=True)
                _stopwords = set(stopwords.words('english'))
        except ImportError:
            _stopwords = set()
    return _stopwords


def remove_html_tags(text):
    """Remove HTML tags from text."""
    if not isinstance(text, str):
        return ""
    return re.sub(r'<[^>]+>', ' ', text)


def remove_urls(text):
    """Remove URLs from text."""
    return re.sub(r'http\S+|www\.\S+', ' ', text)


def remove_punctuation(text):
    """Remove punctuation from text."""
    return text.translate(str.maketrans('', '', string.punctuation))


def preprocess_text(text):
    """
    Full preprocessing pipeline:
    1. Handle NaN / non-string
    2. Remove HTML tags
    3. Remove URLs
    4. Lowercase
    5. Remove punctuation
    6. Remove stopwords
    7. Strip extra whitespace
    """
    if not isinstance(text, str):
        return ""
    
    text = remove_html_tags(text)
    text = remove_urls(text)
    text = text.lower()
    text = remove_punctuation(text)
    
    stop_words = _get_stopwords()
    if stop_words:
        tokens = text.split()
        tokens = [t for t in tokens if t not in stop_words]
        text = ' '.join(tokens)
    
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def combine_text_features(row):
    """
    Combine relevant text columns from a dataset row into a single string.
    Columns: title, company_profile, description, requirements, benefits
    """
    columns = ['title', 'company_profile', 'description', 'requirements', 'benefits']
    parts = []
    for col in columns:
        val = row.get(col, '')
        if isinstance(val, str) and val.strip():
            parts.append(val.strip())
    return ' '.join(parts)
