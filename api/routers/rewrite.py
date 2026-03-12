from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from ..database import get_db
from ..models import User
from .auth import get_current_user
from ..schemas import RewriteRequest, RewriteResponse
from ..services.rewrite_coach import generate_rewrites
from ..services.ai_pipeline import analyze_single_response
from ..trait_mapper import map_traits_to_domain

router = APIRouter(prefix="/api/rewrite", tags=["rewrite"])

@router.post("", response_model=RewriteResponse)
def suggest_rewrites(
    data: RewriteRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    rewrites = generate_rewrites(
        data.text, data.prompt_word, data.focus_traits, data.module
    )
    
    rewrite_results = []
    for rw in rewrites:
        analysis = analyze_single_response(rw["rewrite"])
        domain_traits = map_traits_to_domain(analysis["trait_scores"], data.module)
        rewrite_results.append({
            "rewrite": rw["rewrite"],
            "explanation": rw["explanation"],
            "trait_scores": analysis["trait_scores"],
            "domain_traits": domain_traits,
        })
    
    original_analysis = analyze_single_response(data.text)
    original_domain = map_traits_to_domain(original_analysis["trait_scores"], data.module)
    
    return {
        "original": {
            "text": data.text,
            "trait_scores": original_analysis["trait_scores"],
            "domain_traits": original_domain,
        },
        "rewrites": rewrite_results,
    }
