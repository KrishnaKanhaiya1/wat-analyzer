"""
Adaptive Word Selection using Epsilon-Greedy Multi-Armed Bandit.

The algorithm tracks per-user trait scores by theme over time.
It surfaces more prompts from weak themes while occasionally exploring others.

Algorithm:
- Each theme is an "arm" in the bandit.
- Reward is the user's average trait score for prompts of that theme.
- With probability epsilon, select a random theme (exploration).
- With probability 1-epsilon, select the theme with lowest average score (exploitation = targeting weakness).
"""

import random
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session as DBSession
from .models import Prompt, Response, Session
import logging

logger = logging.getLogger(__name__)

EPSILON = 0.3  # 30% exploration, 70% exploitation of weak areas
DEFAULT_PROMPTS_PER_SESSION = 15

def get_adaptive_prompts(
    db: DBSession,
    user_id: str,
    module: str,
    count: int = DEFAULT_PROMPTS_PER_SESSION,
    epsilon: float = EPSILON
) -> List[Prompt]:
    """
    Select prompts using epsilon-greedy strategy.
    
    1. Get all active prompts for this module
    2. Compute per-theme weakness scores from user history
    3. With probability epsilon: pick random themes (exploration)
    4. With probability 1-epsilon: pick weakest themes (exploitation)
    5. Select prompts from chosen themes, avoiding recent repeats
    """
    # Get all available prompts
    all_prompts = db.query(Prompt).filter(
        Prompt.module == module,
        Prompt.active == True
    ).all()
    
    if not all_prompts or len(all_prompts) <= count:
        return all_prompts[:count] if all_prompts else []
    
    # Get user's historical performance by theme
    theme_scores = _compute_theme_scores(db, user_id, module)
    
    if not theme_scores:
        # No history; random selection
        selected = random.sample(all_prompts, min(count, len(all_prompts)))
        return selected
    
    # Get recently used prompt IDs to avoid immediate repetition
    recent_ids = _get_recent_prompt_ids(db, user_id, module, limit=count * 2)
    
    # Build theme -> prompts mapping
    theme_prompts: Dict[str, List[Prompt]] = {}
    for p in all_prompts:
        if p.id in recent_ids:
            continue
        themes = p.themes or ["general"]
        for theme in themes:
            if theme not in theme_prompts:
                theme_prompts[theme] = []
            theme_prompts[theme].append(p)
    
    if not theme_prompts:
        # All recent; just random pick
        return random.sample(all_prompts, min(count, len(all_prompts)))
    
    # Epsilon-greedy theme selection
    selected_prompts = []
    selected_ids = set()
    
    # Sort themes by weakness (lowest score first)
    all_themes = list(theme_prompts.keys())
    sorted_themes = sorted(all_themes, key=lambda t: theme_scores.get(t, 0.5))
    
    while len(selected_prompts) < count and theme_prompts:
        if random.random() < epsilon:
            # Exploration: random theme
            theme = random.choice(all_themes)
        else:
            # Exploitation: weakest theme
            theme = sorted_themes[0] if sorted_themes else random.choice(all_themes)
            # Rotate weakest themes to spread selection
            sorted_themes = sorted_themes[1:] + sorted_themes[:1]
        
        if theme in theme_prompts and theme_prompts[theme]:
            prompt = random.choice(theme_prompts[theme])
            if prompt.id not in selected_ids:
                selected_prompts.append(prompt)
                selected_ids.add(prompt.id)
                theme_prompts[theme].remove(prompt)
                if not theme_prompts[theme]:
                    del theme_prompts[theme]
                    all_themes = list(theme_prompts.keys())
                    sorted_themes = [t for t in sorted_themes if t in all_themes]
    
    # If we still need more, fill from any remaining
    if len(selected_prompts) < count:
        remaining = [p for p in all_prompts if p.id not in selected_ids]
        random.shuffle(remaining)
        selected_prompts.extend(remaining[:count - len(selected_prompts)])
    
    random.shuffle(selected_prompts)
    return selected_prompts[:count]

def _compute_theme_scores(
    db: DBSession, user_id: str, module: str
) -> Dict[str, float]:
    """Compute average trait scores per theme from user's history."""
    sessions = db.query(Session).filter(
        Session.user_id == user_id,
        Session.module == module,
        Session.is_complete == True
    ).order_by(Session.completed_at.desc()).limit(10).all()
    
    if not sessions:
        return {}
    
    theme_totals: Dict[str, List[float]] = {}
    
    for session in sessions:
        for response in session.responses:
            if not response.trait_scores or not response.prompt:
                continue
            prompt = response.prompt
            themes = prompt.themes or ["general"]
            avg_trait = sum(response.trait_scores.values()) / max(len(response.trait_scores), 1)
            for theme in themes:
                if theme not in theme_totals:
                    theme_totals[theme] = []
                theme_totals[theme].append(avg_trait)
    
    return {
        theme: sum(scores) / len(scores)
        for theme, scores in theme_totals.items()
        if scores
    }

def _get_recent_prompt_ids(
    db: DBSession, user_id: str, module: str, limit: int = 30
) -> set:
    """Get IDs of prompts used in recent sessions to avoid repetition."""
    sessions = db.query(Session).filter(
        Session.user_id == user_id,
        Session.module == module
    ).order_by(Session.started_at.desc()).limit(3).all()
    
    ids = set()
    for session in sessions:
        for response in session.responses:
            ids.add(response.prompt_id)
    return ids
