from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from typing import Dict, List

from ..database import get_db
from ..models import Session, User
from .auth import get_current_user
from ..trait_mapper import get_passport_narrative

router = APIRouter(prefix="/api/passport", tags=["passport"])

@router.get("")
def get_passport(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    sessions = db.query(Session).filter(
        Session.user_id == user.id,
        Session.is_complete == True
    ).all()
    
    if not sessions:
        return {
            "has_data": False,
            "message": "Complete at least one session to see your passport."
        }
    
    all_trait_scores: Dict[str, List[float]] = {}
    module_counts: Dict[str, int] = {}
    
    for s in sessions:
        module_counts[s.module] = module_counts.get(s.module, 0) + 1
        if s.overall_scores:
            for trait, score in s.overall_scores.items():
                if trait not in all_trait_scores:
                    all_trait_scores[trait] = []
                all_trait_scores[trait].append(score)
    
    averaged = {
        trait: round(sum(scores) / len(scores), 3)
        for trait, scores in all_trait_scores.items()
    }
    
    sorted_traits = sorted(averaged.items(), key=lambda x: x[1], reverse=True)
    strengths = [{"trait": t, "label": t.replace("_"," ").title(), "score": s} for t, s in sorted_traits[:3]]
    growth_areas = [{"trait": t, "label": t.replace("_"," ").title(), "score": s} for t, s in sorted_traits[-3:]]
    
    module_order = ["ssb", "interview", "student", "workplace"]
    least_practiced = min(module_order, key=lambda m: module_counts.get(m, 0))
    weak_trait = sorted_traits[-1][0] if sorted_traits else "positivity"
    
    narrative = get_passport_narrative(averaged, module_counts)
    
    return {
        "has_data": True,
        "overall_traits": averaged,
        "strengths": strengths,
        "growth_areas": growth_areas,
        "module_counts": module_counts,
        "total_sessions": len(sessions),
        "recommended_module": least_practiced,
        "recommended_focus": weak_trait,
        "narrative": narrative,
        "user": {
            "name": user.full_name or user.username,
            "username": user.username,
        }
    }
