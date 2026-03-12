"""
Main FastAPI application with modular REST API endpoints for UdaanCoach.
"""

import logging
import threading
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import engine, Base, SessionLocal
from .models import User, Prompt
from .seed_data import SEED_PROMPTS
from .services.ai_pipeline import load_models

from .routers import auth, sessions, rewrite, timeline, passport, payments, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ─── App Lifespan ───────────────────────────────────────────────────


def _ensure_schema_migrations() -> None:
    """
    Lightweight, runtime-safe migrations for SQLite dev DB.
    Ensures new nullable columns exist on older databases without
    requiring Alembic to be run.
    """
    try:
        if engine.url.get_backend_name() != "sqlite":
            return

        with engine.connect() as conn:
            cols = {row[1] for row in conn.execute(text("PRAGMA table_info(responses)"))}

            if "wpm" not in cols:
                conn.execute(text("ALTER TABLE responses ADD COLUMN wpm FLOAT"))
            if "filler_count" not in cols:
                conn.execute(text("ALTER TABLE responses ADD COLUMN filler_count INTEGER"))
            if "composure_score" not in cols:
                conn.execute(text("ALTER TABLE responses ADD COLUMN composure_score FLOAT"))

            conn.commit()
            logger.info("Ensured response metrics columns exist on SQLite DB.")
    except Exception as exc:
        # Do not crash app startup in case of migration issues; logs are enough.
        logger.error(f"Failed to ensure schema migrations: {exc}", exc_info=True)

def _ensure_sqlite_indexes_and_pragmas() -> None:
    """
    Make SQLite consistently fast for common queries.
    - Create helpful indexes (idempotent).
    - Set pragmas for better concurrency/latency in local dev.
    """
    try:
        if engine.url.get_backend_name() != "sqlite":
            return

        with engine.connect() as conn:
            # Pragmas: keep it safe but reduce stalls
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            conn.execute(text("PRAGMA busy_timeout=5000"))

            # Prompts
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prompts_module_active ON prompts(module, active)"))

            # Sessions
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_user_module_started ON sessions(user_id, module, started_at)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_user_module_complete ON sessions(user_id, module, is_complete, completed_at)"))

            # Responses
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_responses_prompt_id ON responses(prompt_id)"))

            conn.commit()
            logger.info("Ensured SQLite indexes and pragmas.")
    except Exception as exc:
        logger.error(f"Failed to ensure SQLite indexes/pragmas: {exc}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing UdaanCoach...")
    # Base.metadata.create_all(bind=engine) # Handled by Alembic now, but keep for local dev
    Base.metadata.create_all(bind=engine)

    # Ensure newer columns exist on older local SQLite DBs (dev convenience).
    _ensure_schema_migrations()
    _ensure_sqlite_indexes_and_pragmas()
    
    # Seed prompts
    db = SessionLocal()
    try:
        for module, prompts in SEED_PROMPTS.items():
            existing = db.query(Prompt).filter(Prompt.module == module).count()
            if existing < len(prompts):
                logger.info(f"Seeding prompts for module {module}...")
                current_words = {p.word for p in db.query(Prompt.word).filter(Prompt.module == module).all()}
                for p in prompts:
                    if p["word"] not in current_words:
                        db.add(Prompt(
                            module=module,
                            word=p["word"],
                            themes=p["themes"],
                            difficulty=p["difficulty"],
                            language="en",
                            active=True
                        ))
        db.commit()
        logger.info(f"Total active prompts: {db.query(Prompt).count()}")
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
    title="UdaanCoach API",
    description="AI-Powered Soft Skills, Communication & Career Growth Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Exception Handler ───────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected error occurred. Please try again later."},
    )

# ─── Include Routers ────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(rewrite.router)
app.include_router(timeline.router)
app.include_router(passport.router)
app.include_router(payments.router)
app.include_router(analytics.router)

# ─── Health Check ────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    from .services.ai_pipeline import _models_loaded
    return {
        "status": "ok",
        "models_loaded": _models_loaded,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/prompts/{module}")
def get_prompts(module: str):
    db = SessionLocal()
    try:
        prompts = db.query(Prompt).filter(Prompt.module == module, Prompt.active == True).all()
        return [{"id": p.id, "word": p.word, "themes": p.themes, "difficulty": p.difficulty} for p in prompts]
    finally:
        db.close()
