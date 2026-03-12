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

class RoleEnum(str, enum.Enum):
    END_USER = "end_user"
    ORG_ADMIN = "org_admin"
    PLATFORM_ADMIN = "platform_admin"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    EXPIRED = "expired"
    TRIAL = "trial"

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), default="")
    role = Column(String(50), default=RoleEnum.END_USER.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("Session", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    payments = relationship("Payment", back_populates="user")
    events = relationship("ProductAnalyticsEvent", back_populates="user")

class Plan(Base):
    __tablename__ = "plans"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    billing_cycle = Column(String(20), default="monthly") # monthly, yearly, one_time
    features = Column(JSON, default=dict)
    active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    status = Column(String(50), default=SubscriptionStatus.TRIAL.value)
    current_period_start = Column(DateTime, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="pending") # pending, completed, failed
    gateway_payment_id = Column(String(255), nullable=True) # e.g., razorpay_payment_id
    gateway_order_id = Column(String(255), nullable=True) # e.g., razorpay_order_id
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="payments")

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
    wpm = Column(Float, nullable=True)
    filler_count = Column(Integer, nullable=True)
    composure_score = Column(Float, nullable=True)
    embedding = Column(JSON, nullable=True)  # stored as list of floats
    features = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("Session", back_populates="responses")
    prompt = relationship("Prompt")

class ProductAnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Nullable for anonymous
    event_type = Column(String(100), nullable=False) # e.g., session_started, rewrite_requested
    event_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="events")
