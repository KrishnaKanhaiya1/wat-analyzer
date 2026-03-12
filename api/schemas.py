from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ─── Auth Schemas ───────────────────────────────────────────────

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

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True

# ─── Session Schemas ────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    module: str  # ssb, interview, student, workplace
    prompt_count: int = 15
    timer_seconds: int = 15

class SubmitResponseItem(BaseModel):
    prompt_id: int
    order_index: int
    user_text: str
    wpm: Optional[float] = None
    filler_count: Optional[int] = None
    composure_score: Optional[float] = None

class SubmitSessionRequest(BaseModel):
    responses: List[SubmitResponseItem]

class PromptOut(BaseModel):
    id: int
    word: str
    themes: List[str]
    difficulty: int

    class Config:
        from_attributes = True

class SessionStartResponse(BaseModel):
    session_id: str
    prompts: List[PromptOut]
    timer_seconds: int

class SessionOut(BaseModel):
    id: str
    module: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    overall_scores: Optional[Dict[str, float]]
    response_count: int

# ─── Rewrite Coach Schemas ──────────────────────────────────────

class RewriteRequest(BaseModel):
    text: str
    prompt_word: str
    focus_traits: List[str] = ["agency", "leadership", "positivity"]
    module: str = "ssb"

class RewriteResult(BaseModel):
    rewrite: str
    explanation: str
    trait_scores: Dict[str, float]
    domain_traits: List[Dict[str, Any]]

class RewriteResponse(BaseModel):
    original: Dict[str, Any]
    rewrites: List[RewriteResult]

# ─── Payment & Plan Schemas ─────────────────────────────────────

class PlanOut(BaseModel):
    id: str
    name: str
    description: str
    price: float
    currency: str
    billing_cycle: str
    features: Dict[str, Any]

class SubscriptionOut(BaseModel):
    id: str
    plan_id: str
    status: str
    current_period_end: Optional[datetime]
