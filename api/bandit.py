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
    Fast, non-adaptive prompt selection.
    For now we prioritize responsiveness over bandit complexity:
    simply sample random active prompts for the module.
    """
    all_prompts = (
        db.query(Prompt)
        .filter(Prompt.module == module, Prompt.active == True)
        .all()
    )

    if not all_prompts:
        return []

    if len(all_prompts) <= count:
        random.shuffle(all_prompts)
        return all_prompts

    return random.sample(all_prompts, count)

def _compute_theme_scores(
    db: DBSession, user_id: str, module: str
) -> Dict[str, float]:
    """Compute average trait scores per theme from user's history."""
    session_ids = [
        row[0]
        for row in db.query(Session.id)
        .filter(
            Session.user_id == user_id,
            Session.module == module,
            Session.is_complete == True,
        )
        .order_by(Session.completed_at.desc())
        .limit(10)
        .all()
    ]

    if not session_ids:
        return {}

    # Fetch only what we need in one query (avoids N+1 on session.responses / response.prompt)
    rows = (
        db.query(Response.trait_scores, Prompt.themes)
        .join(Prompt, Prompt.id == Response.prompt_id)
        .filter(Response.session_id.in_(session_ids))
        .all()
    )

    theme_totals: Dict[str, List[float]] = {}
    for trait_scores, themes in rows:
        if not trait_scores:
            continue
        theme_list = themes or ["general"]
        avg_trait = sum(trait_scores.values()) / max(len(trait_scores), 1)
        for theme in theme_list:
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
    recent_session_ids = [
        row[0]
        for row in db.query(Session.id)
        .filter(Session.user_id == user_id, Session.module == module)
        .order_by(Session.started_at.desc())
        .limit(3)
        .all()
    ]
    if not recent_session_ids:
        return set()

    rows = (
        db.query(Response.prompt_id)
        .filter(Response.session_id.in_(recent_session_ids))
        .limit(limit)
        .all()
    )
    return {r[0] for r in rows if r and r[0] is not None}
