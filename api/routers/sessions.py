from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from datetime import datetime
from typing import List, Dict

from ..database import get_db
from ..models import Session, Response, User, gen_uuid, Prompt
from ..schemas import StartSessionRequest, SessionStartResponse, PromptOut, SubmitSessionRequest, SessionOut
from .auth import get_current_user
from ..bandit import get_adaptive_prompts
from ..services.ai_pipeline import (
    analyze_single_response, analyze_session_responses,
    compute_session_averages, compute_token_highlights
)
from ..trait_mapper import map_traits_to_domain, generate_trait_explanation
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.post("/start", response_model=SessionStartResponse)
def start_session(
    data: StartSessionRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    logger.info(f"Starting session for user={user.id} module={data.module} prompts={data.prompt_count}")
    if data.module not in ["ssb", "interview", "student", "workplace", "scenario"]:
        raise HTTPException(400, "Invalid module")
    
    prompts = get_adaptive_prompts(db, user.id, data.module, data.prompt_count)
    if not prompts:
        raise HTTPException(404, "No prompts found for this module")

    session = Session(
        id=gen_uuid(),
        user_id=user.id,
        module=data.module,
        timer_seconds=data.timer_seconds,
    )
    db.add(session)
    db.commit()

    logger.info(
        f"Created session {session.id} with {len(prompts)} prompts for module={data.module}"
    )
    
    return SessionStartResponse(
        session_id=session.id,
        prompts=[PromptOut.model_validate(p) for p in prompts],
        timer_seconds=data.timer_seconds,
    )

@router.post("/{session_id}/submit")
def submit_session(
    session_id: str,
    data: SubmitSessionRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.is_complete:
        raise HTTPException(400, "Session already submitted")
    
    response_dicts = [{"user_text": r.user_text, "wpm": r.wpm, "filler_count": r.filler_count, "composure_score": r.composure_score} for r in data.responses]
    analyses = analyze_session_responses(response_dicts)
    
    trait_scores_list = []
    for i, resp_data in enumerate(data.responses):
        analysis = analyses[i] if i < len(analyses) else analyze_single_response(resp_data.user_text)
        
        response = Response(
            session_id=session_id,
            prompt_id=resp_data.prompt_id,
            order_index=resp_data.order_index,
            user_text=resp_data.user_text,
            wpm=resp_data.wpm,
            filler_count=resp_data.filler_count,
            composure_score=resp_data.composure_score,
            sentiment_scores=analysis.get("sentiment_scores"),
            emotion_scores=analysis.get("emotion_scores"),
            trait_scores=analysis.get("trait_scores"),
            features=analysis.get("features"),
            embedding=analysis.get("embedding", []),
        )
        db.add(response)
        trait_scores_list.append(analysis.get("trait_scores", {}))
    
    overall = compute_session_averages(trait_scores_list)
    session.overall_scores = overall
    session.is_complete = True
    session.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "session_id": session_id,
        "overall_scores": overall,
        "response_count": len(data.responses),
        "status": "analyzed"
    }

@router.get("/{session_id}/results")
def get_session_results(
    session_id: str,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    session = db.query(Session).filter(Session.id == session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    
    responses = []
    for r in session.responses:
        prompt = r.prompt
        domain_traits = map_traits_to_domain(r.trait_scores or {}, session.module) if r.trait_scores else []
        responses.append({
            "id": r.id,
            "prompt_word": prompt.word if prompt else "Unknown",
            "prompt_themes": prompt.themes if prompt else [],
            "user_text": r.user_text,
            "sentiment_scores": r.sentiment_scores,
            "emotion_scores": r.emotion_scores,
            "trait_scores": r.trait_scores,
            "domain_traits": domain_traits,
            "features": r.features,
            "order_index": r.order_index,
            "wpm": r.wpm,
            "filler_count": r.filler_count,
            "composure_score": r.composure_score,
        })
    
    overall_domain = map_traits_to_domain(session.overall_scores or {}, session.module)
    explanations = []
    if session.overall_scores:
        for trait_key, score in session.overall_scores.items():
            explanations.append({
                "trait": trait_key,
                "explanation": generate_trait_explanation(trait_key, score, session.module)
            })
    
    return {
        "session_id": session.id,
        "module": session.module,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "overall_scores": session.overall_scores,
        "overall_domain_traits": overall_domain,
        "explanations": explanations,
        "responses": responses,
        "timer_seconds": session.timer_seconds,
    }

@router.get("", response_model=List[SessionOut])
def list_sessions(
    module: str = None,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    query = db.query(Session).filter(Session.user_id == user.id, Session.is_complete == True)
    if module:
        query = query.filter(Session.module == module)
    sessions = query.order_by(Session.completed_at.desc()).limit(50).all()
    
    return [SessionOut.model_validate({
        "id": s.id,
        "module": s.module,
        "started_at": s.started_at,
        "completed_at": s.completed_at,
        "overall_scores": s.overall_scores,
        "response_count": len(s.responses),
    }) for s in sessions]

@router.get("/{session_id}/responses/{response_id}/highlights")
def get_token_highlights(
    session_id: str,
    response_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    response = db.query(Response).filter(Response.id == response_id).first()
    if not response or response.session_id != session_id:
        raise HTTPException(404, "Response not found")
    
    session = db.query(Session).filter(Session.id == response.session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(403, "Access denied")
    
    if response.token_highlights:
        highlights = response.token_highlights
    else:
        highlights = compute_token_highlights(response.user_text or "", response.trait_scores or {})
        response.token_highlights = highlights
        db.commit()
    
    domain_traits = map_traits_to_domain(response.trait_scores or {}, session.module)
    
    return {
        "response_id": response.id,
        "user_text": response.user_text,
        "token_highlights": highlights,
        "trait_scores": response.trait_scores,
        "domain_traits": domain_traits,
    }
