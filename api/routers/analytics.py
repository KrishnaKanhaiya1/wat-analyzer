from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from typing import Dict, Any, Optional

from ..database import get_db
from ..models import User, ProductAnalyticsEvent, gen_uuid
from .auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class EventRequest(BaseModel):
    event_type: str
    event_data: Dict[str, Any] = {}

def get_optional_user(request: Request, db: DBSession = Depends(get_db)) -> Optional[User]:
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    try:
        from .auth import decode_token
        token = auth.replace("Bearer ", "")
        payload = decode_token(token)
        if payload and "sub" in payload:
            return db.query(User).filter(User.id == payload["sub"]).first()
    except:
        pass
    return None

@router.post("/track")
def track_event(
    req: EventRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: DBSession = Depends(get_db)
):
    event = ProductAnalyticsEvent(
        id=gen_uuid(),
        user_id=user.id if user else None,
        event_type=req.event_type,
        event_data=req.event_data
    )
    db.add(event)
    db.commit()
    return {"status": "logged"}
