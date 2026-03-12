import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "WAT Analyzer"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./wat_analyzer.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-super-secret-key-2024")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Model settings
    SENTIMENT_MODEL: str = "distilbert-base-uncased-finetuned-sst-2-english"
    EMOTION_MODEL: str = "SamLowe/roberta-base-go_emotions"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    MULTILINGUAL_MODEL: str = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
    
    class Config:
        env_file = ".env"

settings = Settings()
