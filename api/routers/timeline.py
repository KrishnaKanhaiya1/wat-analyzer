from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from typing import Dict, List

from ..database import get_db
from ..models import Session, User
from .auth import get_current_user

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

@router.get("")
def get_timeline(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    sessions = db.query(Session).filter(
        Session.user_id == user.id,
        Session.is_complete == True
    ).order_by(Session.completed_at.asc()).all()
    
    timeline_data = []
    for s in sessions:
        if s.overall_scores:
            timeline_data.append({
                "session_id": s.id,
                "module": s.module,
                "date": s.completed_at.isoformat() if s.completed_at else s.started_at.isoformat(),
                "scores": s.overall_scores,
            })
    
    theme_weak_scores: Dict[str, List[float]] = {}
    for s in sessions:
        for r in s.responses:
            if r.trait_scores and r.prompt:
                avg = sum(r.trait_scores.values()) / max(len(r.trait_scores), 1)
                if avg < 0.4:
                    for theme in (r.prompt.themes or []):
                        if theme not in theme_weak_scores:
                            theme_weak_scores[theme] = []
                        theme_weak_scores[theme].append(avg)
    
    weak_themes = [
        {"theme": t, "count": len(scores), "avg_score": round(sum(scores)/len(scores), 3)}
        for t, scores in sorted(theme_weak_scores.items(), key=lambda x: len(x[1]), reverse=True)
    ][:10]
    
    return {
        "timeline": timeline_data,
        "weak_themes": weak_themes,
        "total_sessions": len(sessions),
    }
