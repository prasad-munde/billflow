from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth import create_token, current_user, hash_password, verify_password
from app.database import get_db
from app.models import BusinessSettings, User
from app.schemas import AuthPayload, Token, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: AuthPayload, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    user = User(
        email=email_clean,
        password_hash=hash_password(payload.password)
    )
    db.add(user)
    db.flush()
    settings = BusinessSettings(
        user_id=user.id,
        business_name="My Studio",
        currency="USD",
        invoice_prefix="INV"
    )
    db.add(settings)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(payload: AuthPayload, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    return {"access_token": create_token(user.id), "token_type": "bearer"}

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(current_user)):
    return user
