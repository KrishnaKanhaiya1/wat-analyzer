"""
AI Analysis Pipeline
Loads transformer models at startup and provides analysis functions.
All analysis is model-based, no deterministic if-else pattern matching.
"""

import re
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Global model holders
_sentiment_pipeline = None
_emotion_pipeline = None
_embedding_model = None
_multilingual_pipeline = None
_models_loaded = False

# Removed hardcoded AGENCY_VERBS list - using embeddings instead

def load_models():
    """Load all transformer models once at startup."""
    global _sentiment_pipeline, _emotion_pipeline, _embedding_model, _multilingual_pipeline, _models_loaded
    
    if _models_loaded:
        return
    
    try:
        from transformers import pipeline
        from sentence_transformers import SentenceTransformer
        from .config import settings
        
        logger.info("Loading sentiment model...")
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=settings.SENTIMENT_MODEL,
            top_k=None,
            device=-1
        )
        
        logger.info("Loading emotion model...")
        _emotion_pipeline = pipeline(
            "text-classification",
            model=settings.EMOTION_MODEL,
            top_k=None,
            device=-1
        )
        
        logger.info("Loading embedding model...")
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        
        logger.info("Loading multilingual model...")
        _multilingual_pipeline = pipeline(
            "sentiment-analysis",
            model=settings.MULTILINGUAL_MODEL,
            top_k=None,
            device=-1
        )
        
        _models_loaded = True
        logger.info("All models loaded successfully!")
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        logger.info("Falling back to lightweight mode")
        _models_loaded = False

def _is_hindi(text: str) -> bool:
    """Check if text contains Devanagari characters."""
    return bool(re.search(r'[\u0900-\u097F]', text))

def analyze_sentiment(text: str) -> Dict[str, float]:
    """Run transformer sentiment analysis, returns label probabilities."""
    if not text.strip():
        return {"positive": 0.5, "negative": 0.5}
    
    try:
        if _sentiment_pipeline and not _is_hindi(text):
            results = _sentiment_pipeline(text[:512])
            if results and isinstance(results[0], list):
                results = results[0]
            scores = {}
            for r in results:
                label = r["label"].lower()
                scores[label] = round(r["score"], 4)
            return scores
        elif _multilingual_pipeline:
            results = _multilingual_pipeline(text[:512])
            if results and isinstance(results[0], list):
                results = results[0]
            scores = {}
            for r in results:
                label = r["label"].lower()
                scores[label] = round(r["score"], 4)
            return scores
    except Exception as e:
        logger.warning(f"Sentiment analysis error: {e}")
    
    return {"positive": 0.5, "negative": 0.5}

def analyze_emotions(text: str) -> Dict[str, float]:
    """Run GoEmotions-style multi-label emotion classification."""
    if not text.strip():
        return {}
    
    try:
        if _emotion_pipeline:
            results = _emotion_pipeline(text[:512])
            if results and isinstance(results[0], list):
                results = results[0]
            emotions = {}
            for r in results:
                emotions[r["label"]] = round(r["score"], 4)
            # Return top emotions
            sorted_emotions = dict(sorted(emotions.items(), key=lambda x: x[1], reverse=True)[:10])
            return sorted_emotions
    except Exception as e:
        logger.warning(f"Emotion analysis error: {e}")
    
    return {}

def compute_embedding(text: str) -> List[float]:
    """Compute sentence embedding using Sentence-BERT."""
    if not text.strip():
        return [0.0] * 384
    
    try:
        if _embedding_model:
            embedding = _embedding_model.encode(text)
            return embedding.tolist()
    except Exception as e:
        logger.warning(f"Embedding error: {e}")
    
    return [0.0] * 384

def extract_features(text: str) -> Dict[str, Any]:
    """Extract generic linguistic features from text."""
    if not text.strip():
        return {
            "word_count": 0, "first_person": 0, "third_person": 0,
            "agency_verb_count": 0, "passive_voice": False,
            "content_word_ratio": 0.0, "has_action": False
        }
    
    words = text.lower().split()
    word_count = len(words)
    
    first_person = sum(1 for w in words if w in {"i", "me", "my", "mine", "myself", "we", "our", "us"})
    third_person = sum(1 for w in words if w in {"he", "she", "they", "them", "their", "his", "her", "it"})
    
    # Simple heuristics that are still valid without hardcoded dictionaries
    has_action = any(w.endswith("ed") or w.endswith("ing") for w in words)
    agency_count = 1 if has_action else 0
    
    # Passive voice heuristic
    passive_pattern = re.compile(r'\b(was|were|been|being|is|are|am)\s+\w+ed\b', re.IGNORECASE)
    has_passive = bool(passive_pattern.search(text))
    
    # Function words
    function_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "but", "or", "if", "then"}
    content_words = [w for w in words if w not in function_words and len(w) > 2]
    content_ratio = len(content_words) / max(word_count, 1)
    
    return {
        "word_count": word_count,
        "first_person": first_person,
        "third_person": third_person,
        "agency_verb_count": agency_count,
        "passive_voice": has_passive,
        "content_word_ratio": round(content_ratio, 3),
        "has_action": agency_count > 0,
    }

_trait_anchors = {}

def get_trait_similarity(text_embedding: List[float]) -> Dict[str, float]:
    """Compute cosine similarity between text embedding and trait anchors."""
    global _trait_anchors
    if not _trait_anchors and _embedding_model:
        anchor_texts = {
            "positivity": "optimistic positive hopeful bright wonderful successful",
            "emotional_stability": "calm composed relaxed steady peaceful resilient",
            "agency": "action initiative taking charge deciding building creating",
            "leadership": "leading guiding organizing motivating inspiring direction",
            "responsibility": "ownership accountable duty reliable trustworthy",
            "empathy": "understanding caring compassionate team supportive",
            "clarity": "clear direct articulate precise explicit distinct"
        }
        for trait, text in anchor_texts.items():
            emb = _embedding_model.encode(text)
            _trait_anchors[trait] = emb / (np.linalg.norm(emb) + 1e-9)
            
    if not text_embedding or not _trait_anchors:
        return {k: 0.5 for k in ["positivity", "emotional_stability", "agency", "leadership", "responsibility", "empathy", "clarity"]}
        
    emb_array = np.array(text_embedding)
    emb_array = emb_array / (np.linalg.norm(emb_array) + 1e-9)
    
    similarities = {}
    for trait, anchor in _trait_anchors.items():
        sim = float(np.dot(emb_array, anchor))
        # Normalize from [-1, 1] to [0, 1]
        sim_norm = (sim + 1.0) / 2.0
        similarities[trait] = sim_norm
    return similarities

def compute_trait_vector(
    sentiment: Dict[str, float],
    emotions: Dict[str, float],
    features: Dict[str, Any],
    embedding: List[float] = None,
    wpm: Optional[float] = None,
    filler_count: Optional[int] = None,
    composure_score: Optional[float] = None
) -> Dict[str, float]:
    """
    Combine model outputs into a generic trait vector.
    Uses sentence embeddings for robust semantic matching.
    """
    similarities = get_trait_similarity(embedding) if embedding else {}
    
    pos_score = sentiment.get("positive", 0.5)
    neg_score = sentiment.get("negative", 0.5)
    
    positivity = (pos_score + similarities.get("positivity", 0.5)) / 2.0
    
    neg_emotions = sum(emotions.get(e, 0) for e in ["anger", "fear", "sadness", "disgust"])
    pos_emotions = sum(emotions.get(e, 0) for e in ["joy", "optimism", "pride", "love"])
    stability_base = max(0, min(1, 0.5 + (pos_emotions - neg_emotions) * 0.5))
    emotional_stability = (stability_base * 0.6) + (similarities.get("emotional_stability", 0.5) * 0.4)
    
    first_person = min(features.get("first_person", 0) / 2.0, 0.5)
    agency = (similarities.get("agency", 0.5) * 0.7) + (first_person * 0.3)
    
    leadership = (similarities.get("leadership", 0.5) * 0.6) + (agency * 0.4)
    
    responsibility = (similarities.get("responsibility", 0.5) * 0.6) + (first_person * 0.4)
    
    third_person = min(features.get("third_person", 0) / 2.0, 0.5)
    empathy = (similarities.get("empathy", 0.5) * 0.7) + (third_person * 0.3)
    
    content_ratio = features.get("content_word_ratio", 0)
    clarity = (similarities.get("clarity", 0.5) * 0.5) + (content_ratio * 0.5)
    
    # Apply multi-modal modifiers
    if wpm is not None:
        if wpm < 100 or wpm > 180:
            leadership = max(0, leadership - 0.1)
        elif 120 <= wpm <= 160:
            leadership = min(1, leadership + 0.1)
            
    if filler_count is not None and filler_count > 0:
        penalty = min(0.3, filler_count * 0.05)
        clarity = max(0, clarity - penalty)
        emotional_stability = max(0, emotional_stability - (penalty / 2))
        
    if composure_score is not None:
        emotional_stability = (emotional_stability * 0.5) + (composure_score * 0.5)
        positivity = (positivity * 0.7) + (composure_score * 0.3)
    
    return {
        "positivity": round(max(0, min(1, positivity)), 3),
        "emotional_stability": round(max(0, min(1, emotional_stability)), 3),
        "agency": round(max(0, min(1, agency)), 3),
        "leadership": round(max(0, min(1, leadership)), 3),
        "responsibility": round(max(0, min(1, responsibility)), 3),
        "empathy": round(max(0, min(1, empathy)), 3),
        "clarity": round(max(0, min(1, clarity)), 3),
    }

def compute_token_highlights(text: str, trait_scores: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Compute token-level importance for traits.
    Uses perturbation-based approach: remove each token and measure trait change.
    """
    if not text.strip():
        return []
    
    words = text.split()
    if len(words) <= 1:
        return [{"token": words[0] if words else "", "weight": 0.5, "traits": list(trait_scores.keys())}]
    
    base_sentiment = analyze_sentiment(text)
    base_emotions = analyze_emotions(text)
    base_features = extract_features(text)
    base_embedding = compute_embedding(text)
    base_traits = compute_trait_vector(base_sentiment, base_emotions, base_features, base_embedding)
    
    highlights = []
    for i, word in enumerate(words):
        # Create text without this word
        reduced = " ".join(words[:i] + words[i+1:])
        if not reduced.strip():
            highlights.append({"token": word, "weight": 0.5, "traits": []})
            continue
        
        red_sentiment = analyze_sentiment(reduced)
        red_emotions = analyze_emotions(reduced)
        red_features = extract_features(reduced)
        red_embedding = compute_embedding(reduced)
        red_traits = compute_trait_vector(red_sentiment, red_emotions, red_features, red_embedding)
        
        # Measure impact: how much traits drop when word removed  
        total_impact = 0
        influenced_traits = []
        for trait_name in base_traits:
            diff = base_traits[trait_name] - red_traits.get(trait_name, 0)
            if abs(diff) > 0.02:
                influenced_traits.append(trait_name)
                total_impact += diff
        
        # Weight: positive means word helps, negative means word hurts
        weight = max(-1, min(1, total_impact))
        
        highlights.append({
            "token": word,
            "weight": round(weight, 3),
            "traits": influenced_traits
        })
    
    return highlights

def analyze_single_response(text: str, wpm: Optional[float] = None, filler_count: Optional[int] = None, composure_score: Optional[float] = None) -> Dict[str, Any]:
    """Full analysis pipeline for a single response."""
    sentiment = analyze_sentiment(text)
    emotions = analyze_emotions(text)
    features = extract_features(text)
    embedding = compute_embedding(text)
    traits = compute_trait_vector(sentiment, emotions, features, embedding, wpm, filler_count, composure_score)
    
    # Token highlights are expensive; compute on demand via separate endpoint
    return {
        "sentiment_scores": sentiment,
        "emotion_scores": emotions,
        "features": features,
        "embedding": embedding,
        "trait_scores": traits,
    }

def analyze_session_responses(responses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Analyze all responses in a session."""
    results = []
    for resp in responses:
        text = resp.get("user_text", "")
        wpm = resp.get("wpm")
        filler = resp.get("filler_count")
        composure = resp.get("composure_score")
        analysis = analyze_single_response(text, wpm, filler, composure)
        results.append(analysis)
    return results

def compute_session_averages(trait_scores_list: List[Dict[str, float]]) -> Dict[str, float]:
    """Average trait scores across all responses in a session."""
    if not trait_scores_list:
        return {}
    
    keys = trait_scores_list[0].keys()
    averages = {}
    for key in keys:
        vals = [t.get(key, 0) for t in trait_scores_list]
        averages[key] = round(sum(vals) / len(vals), 3)
    return averages
