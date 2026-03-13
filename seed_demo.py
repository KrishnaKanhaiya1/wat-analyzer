import datetime
from sqlalchemy.orm import Session
from api.database import SessionLocal
from api.models import User, Session as AppSession, Response, Prompt, gen_uuid
from api.auth import get_password_hash
import uuid
import random

def seed():
    db = SessionLocal()
    demo_user = db.query(User).filter(User.username == 'demo_guest').first()
    
    if not demo_user:
        # Create the guest user if they don't exist
        demo_user = User(
            id=gen_uuid(),
            username='demo_guest',
            email='demo@wat-analyzer.local',
            hashed_password=get_password_hash('demopass123!'),
            full_name='Demo Judge',
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print("Created new demo_guest user.")

    # Delete existing sessions to start fresh
    existing = db.query(AppSession).filter(AppSession.user_id == demo_user.id).all()
    for s in existing:
        db.delete(s)
    db.commit()

    now = datetime.datetime.utcnow()
    traits = ['leadership', 'empathy', 'resilience', 'clarity', 'agency', 'positivity']
    
    # Needs at least one prompt to reference
    prompt = db.query(Prompt).first()
    if not prompt:
        prompt = Prompt(module="scenario", word="Hackathon Demo Setup")
        db.add(prompt)
        db.commit()

    # Create 10 historical sessions over the last 30 days showing gradual improvement
    for i in range(10):
        days_ago = 30 - (i * 3)
        session_date = now - datetime.timedelta(days=days_ago)
        
        # Improvement curve (starts around 40%, ends around 85%)
        base_score = 0.4 + (i * 0.05)
        
        overall_scores = {}
        for t in traits:
             overall_scores[t] = min(1.0, max(0.1, base_score + random.uniform(-0.1, 0.15)))

        sess = AppSession(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            module='scenario',
            started_at=session_date,
            completed_at=session_date + datetime.timedelta(minutes=5),
            timer_seconds=60,
            is_complete=True,
            overall_scores=overall_scores
        )
        db.add(sess)
        
        # Add 3 responses per session
        for j in range(3):
            resp = Response(
                session_id=sess.id,
                prompt_id=prompt.id,
                order_index=j,
                user_text="This is a simulated high-quality response demonstrating excellent communication skills and robust empathy. I prioritize team alignment.",
                sentiment_scores={"positive": 0.8, "neutral": 0.1, "negative": 0.1},
                trait_scores=overall_scores,
                emotion_scores={'joy': 0.6, 'confidence': 0.8},
                wpm=random.randint(120, 160),
                filler_count=max(0, 5 - i), # filler words decrease over time
                composure_score=min(1.0, base_score + 0.2),
                created_at=session_date
            )
            db.add(resp)
            
    db.commit()
    print("Successfully seeded rich timeline data for Demo Guest!")

if __name__ == "__main__":
    seed()
