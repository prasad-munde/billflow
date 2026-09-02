from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.auth import current_user
from app.database import get_db
from app.models import BusinessSettings, User
from app.schemas import SettingsIn, SettingsOut

router = APIRouter(prefix="/settings", tags=["settings"])

uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

@router.get("", response_model=SettingsOut)
def get_settings(user: User = Depends(current_user)):
    s = user.settings
    if not s:
        return SettingsOut(
            business_name="My Studio",
            logo_url=None,
            currency="USD",
            invoice_prefix="INV"
        )
    return SettingsOut(
        business_name=s.business_name or "My Studio",
        logo_url=s.logo_url,
        currency=s.currency or "USD",
        invoice_prefix=s.invoice_prefix or "INV"
    )

@router.put("", response_model=SettingsOut)
@router.patch("", response_model=SettingsOut)
def update_settings(payload: SettingsIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    s = user.settings
    if not s:
        s = BusinessSettings(user_id=user.id)
        db.add(s)
        db.flush()

    s.business_name = payload.business_name.strip()
    s.currency = payload.currency.strip().upper()
    s.invoice_prefix = payload.invoice_prefix.strip().upper()
    if payload.logo_url is not None:
        s.logo_url = payload.logo_url.strip() if payload.logo_url else None

    db.commit()
    db.refresh(s)
    return SettingsOut(
        business_name=s.business_name,
        logo_url=s.logo_url,
        currency=s.currency,
        invoice_prefix=s.invoice_prefix
    )

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    allowed_types = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Please upload a PNG, JPG, WebP, or SVG logo."
        )

    suffix = Path(file.filename or "logo.png").suffix.lower() or ".png"
    filename = f"{user.id}-{uuid4().hex}{suffix}"
    file_path = uploads_dir / filename
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logo file size must be less than 5MB."
        )
    
    file_path.write_bytes(contents)

    s = user.settings
    if not s:
        s = BusinessSettings(user_id=user.id)
        db.add(s)
        db.flush()

    s.logo_url = f"/uploads/{filename}"
    db.commit()

    return {"logo_url": s.logo_url}
