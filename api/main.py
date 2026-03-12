"""
Main FastAPI application with all REST API endpoints.
"""

import logging
import threading
from datetime import datetime
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession

from .database import engine, Base, get_db, SessionLocal
from .models import User, Prompt, Session, Response, ModuleType, gen_uuid
from .auth import get_password_hash, verify_password, create_access_token, decode_token
from .seed_data import SEED_PROMPTS
from .ai_pipeline import (
    load_models, analyze_single_response, analyze_session_responses,
    compute_session_averages, compute_token_highlights,
    analyze_sentiment, analyze_emotions, extract_features, compute_trait_vector
)
from .trait_mapper import map_traits_to_domain, generate_trait_explanation, get_passport_narrative
from .bandit import get_adaptive_prompts
from .rewrite_coach import generate_rewrites

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Pydantic Schemas ───────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = ""

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str

class StartSessionRequest(BaseModel):
    module: str  # ssb, interview, student, workplace
    prompt_count: int = 15
    timer_seconds: int = 15

class SubmitResponseItem(BaseModel):
    prompt_id: int
    order_index: int
    user_text: str

class SubmitSessionRequest(BaseModel):
    responses: List[SubmitResponseItem]

class RewriteRequest(BaseModel):
    text: str
    prompt_word: str
    focus_traits: List[str] = ["agency", "leadership", "positivity"]
    module: str = "ssb"

class PromptOut(BaseModel):
    id: int
    word: str
    themes: List[str]
    difficulty: int

class SessionStartResponse(BaseModel):
    session_id: str
    prompts: List[PromptOut]
    timer_seconds: int

# ─── App Lifespan ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Seed prompts
    db = SessionLocal()
    try:
        existing = db.query(Prompt).count()
        if existing == 0:
            logger.info("Seeding prompts...")
            for module, prompts in SEED_PROMPTS.items():
                for p in prompts:
                    db.add(Prompt(
                        module=module,
                        word=p["word"],
                        themes=p["themes"],
                        difficulty=p["difficulty"],
                        language="en",
                        active=True
                    ))
            db.commit()
            logger.info(f"Seeded {db.query(Prompt).count()} prompts")
    finally:
        db.close()
    
    # Load ML models in background thread
    logger.info("Loading ML models in background...")
    t = threading.Thread(target=load_models, daemon=True)
    t.start()
    
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title="WAT Analyzer API",
    description="AI-Powered Word Association Test Analyzer",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth Helpers ───────────────────────────────────────────────────

def get_current_user(authorization: str = Header(None), db: DBSession = Depends(get_db)) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ─── Auth Endpoints ─────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=TokenResponse)
def register(data: UserCreate, db: DBSession = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    
    user = User(
        id=gen_uuid(),
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id, username=user.username)

@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: UserLogin, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user_id=user.id, username=user.username)

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "email": user.email, "full_name": user.full_name}

# ─── Session Endpoints ──────────────────────────────────────────────

@app.post("/api/sessions/start", response_model=SessionStartResponse)
def start_session(
    data: StartSessionRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    if data.module not in ["ssb", "interview", "student", "workplace"]:
        raise HTTPException(400, "Invalid module")
    
    # Use adaptive bandit to select prompts
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
    
    return SessionStartResponse(
        session_id=session.id,
        prompts=[PromptOut(id=p.id, word=p.word, themes=p.themes or [], difficulty=p.difficulty) for p in prompts],
        timer_seconds=data.timer_seconds,
    )

@app.post("/api/sessions/{session_id}/submit")
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
    
    # Analyze all responses
    response_texts = [{"user_text": r.user_text} for r in data.responses]
    analyses = analyze_session_responses(response_texts)
    
    trait_scores_list = []
    for i, resp_data in enumerate(data.responses):
        analysis = analyses[i] if i < len(analyses) else analyze_single_response(resp_data.user_text)
        
        response = Response(
            session_id=session_id,
            prompt_id=resp_data.prompt_id,
            order_index=resp_data.order_index,
            user_text=resp_data.user_text,
            sentiment_scores=analysis["sentiment_scores"],
            emotion_scores=analysis["emotion_scores"],
            trait_scores=analysis["trait_scores"],
            features=analysis["features"],
            embedding=analysis.get("embedding", []),
        )
        db.add(response)
        trait_scores_list.append(analysis["trait_scores"])
    
    # Compute session averages
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

@app.get("/api/sessions/{session_id}/results")
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

@app.get("/api/sessions")
def list_sessions(
    module: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    query = db.query(Session).filter(Session.user_id == user.id, Session.is_complete == True)
    if module:
        query = query.filter(Session.module == module)
    sessions = query.order_by(Session.completed_at.desc()).limit(50).all()
    
    return [{
        "id": s.id,
        "module": s.module,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "overall_scores": s.overall_scores,
        "response_count": len(s.responses),
    } for s in sessions]

# ─── Token Highlight Endpoint ───────────────────────────────────────

@app.get("/api/responses/{response_id}/highlights")
def get_token_highlights(
    response_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    response = db.query(Response).filter(Response.id == response_id).first()
    if not response:
        raise HTTPException(404, "Response not found")
    
    # Verify user owns this response
    session = db.query(Session).filter(Session.id == response.session_id, Session.user_id == user.id).first()
    if not session:
        raise HTTPException(403, "Access denied")
    
    # Compute token highlights (expensive, done on demand)
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

# ─── Timeline Endpoint ──────────────────────────────────────────────

@app.get("/api/timeline")
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
    
    # Compute weak themes across sessions
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

# ─── Rewrite Coach Endpoint ─────────────────────────────────────────

@app.post("/api/rewrite")
def suggest_rewrites(
    data: RewriteRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    rewrites = generate_rewrites(
        data.text, data.prompt_word, data.focus_traits, data.module
    )
    
    # Re-analyze each rewrite through the pipeline
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
    
    # Also analyze original
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

# ─── Passport / Profile Endpoint ────────────────────────────────────

@app.get("/api/passport")
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
    
    # Aggregate scores across all modules
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
    
    # Recommend next module
    module_order = ["ssb", "interview", "student", "workplace"]
    least_practiced = min(module_order, key=lambda m: module_counts.get(m, 0))
    
    # Recommend focus themes (weakest)
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

# ─── Health Check ────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    from .ai_pipeline import _models_loaded
    return {
        "status": "ok",
        "models_loaded": _models_loaded,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/prompts/{module}")
def get_prompts(module: str, db: DBSession = Depends(get_db)):
    prompts = db.query(Prompt).filter(Prompt.module == module, Prompt.active == True).all()
    return [{"id": p.id, "word": p.word, "themes": p.themes, "difficulty": p.difficulty} for p in prompts]
