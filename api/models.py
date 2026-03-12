import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from .database import Base
import enum

class ModuleType(str, enum.Enum):
    SSB = "ssb"
    INTERVIEW = "interview"
    STUDENT = "student"
    WORKPLACE = "workplace"

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    sessions = relationship("Session", back_populates="user")

class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    module = Column(String(20), index=True, nullable=False)
    word = Column(String(200), nullable=False)
    themes = Column(JSON, default=list)  # e.g. ["leadership","risk","failure"]
    difficulty = Column(Integer, default=1)
    language = Column(String(10), default="en")
    active = Column(Boolean, default=True)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    module = Column(String(20), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    timer_seconds = Column(Integer, default=15)
    is_complete = Column(Boolean, default=False)
    overall_scores = Column(JSON, nullable=True)
    theme_clusters = Column(JSON, nullable=True)
    user = relationship("User", back_populates="sessions")
    responses = relationship("Response", back_populates="session", order_by="Response.order_index")

class Response(Base):
    __tablename__ = "responses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    user_text = Column(Text, default="")
    sentiment_scores = Column(JSON, nullable=True)
    emotion_scores = Column(JSON, nullable=True)
    trait_scores = Column(JSON, nullable=True)
    token_highlights = Column(JSON, nullable=True)
    embedding = Column(JSON, nullable=True)  # stored as list of floats
    features = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="responses")
    prompt = relationship("Prompt")
