from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Invoice, User
from app.schemas import PayResult, PublicInvoiceOut
from app.services.invoice_service import serialize_invoice

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/invoices/{token}", response_model=PublicInvoiceOut)
def get_public_invoice(token: str, db: Session = Depends(get_db)):
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.items),
            joinedload(Invoice.user).joinedload(User.settings)
        )
        .filter(Invoice.public_token == token.strip())
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested invoice could not be found or the link has expired."
        )

    serialized = serialize_invoice(invoice, include_items=True)
    settings = invoice.user.settings if invoice.user and invoice.user.settings else None
    business_data = {
        "business_name": settings.business_name if settings else "BillFlow Studio",
        "logo_url": settings.logo_url if settings else None,
        "currency": settings.currency if settings else "USD",
        "invoice_prefix": settings.invoice_prefix if settings else "INV"
    }
    return {**serialized, "business": business_data}

@router.post("/invoices/{token}/pay", response_model=PayResult)
def pay_public_invoice(token: str, db: Session = Depends(get_db)):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.public_token == token.strip())
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested invoice could not be found."
        )

    if invoice.status != "paid":
        invoice.status = "paid"
        invoice.paid_at = datetime.now(timezone.utc)
        db.commit()

    return {"status": "paid", "message": "Payment simulation completed. Invoice marked as PAID."}
