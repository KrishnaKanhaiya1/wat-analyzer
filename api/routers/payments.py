from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
import uuid
import time

from ..database import get_db
from ..models import User, Plan, Subscription, Payment, gen_uuid
from .auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])

class CreateOrderRequest(BaseModel):
    plan_id: str

class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str

@router.get("/plans")
def list_plans(db: DBSession = Depends(get_db)):
    plans = db.query(Plan).filter(Plan.active == True).all()
    if not plans:
        # Auto-seed mock plans if empty
        free = Plan(id="plan_free", name="Free Tier", price=0, features={"sessions": 5, "rewrites": 10})
        pro = Plan(id="plan_pro", name="Pro Individual", price=499, features={"sessions": -1, "rewrites": -1})
        org = Plan(id="plan_org", name="Institution", price=4999, features={"seats": 50})
        db.add_all([free, pro, org])
        db.commit()
        plans = [free, pro, org]
        
    return plans

@router.post("/create-order")
def create_order(
    req: CreateOrderRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    plan = db.query(Plan).filter(Plan.id == req.plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
        
    # Mock Razorpay order creation
    mock_order_id = f"order_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    
    payment = Payment(
        id=gen_uuid(),
        user_id=user.id,
        amount=plan.price,
        currency=plan.currency,
        status="created",
        gateway_order_id=mock_order_id
    )
    db.add(payment)
    db.commit()
    
    return {
        "order_id": mock_order_id,
        "amount": plan.price,
        "currency": plan.currency,
        "key": "mock_razorpay_key_123" # Mock key for frontend
    }

@router.post("/verify")
def verify_payment(
    req: VerifyPaymentRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    # Mock verification
    payment = db.query(Payment).filter(
        Payment.gateway_order_id == req.order_id,
        Payment.user_id == user.id
    ).first()
    
    if not payment:
        raise HTTPException(404, "Order not found")
        
    payment.status = "completed"
    payment.gateway_payment_id = req.payment_id
    
    # Update or create subscription
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        sub = Subscription(id=gen_uuid(), user_id=user.id, plan_id="plan_pro", status="active")
        db.add(sub)
    else:
        sub.status = "active"
        sub.plan_id = "plan_pro" # Assuming upgrade for mock
        
    db.commit()
    return {"status": "success", "message": "Payment verified successfully"}
