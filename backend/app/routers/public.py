from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Client, Invoice, User
from app.schemas import (
    BatchPayRequest,
    BatchPayResponse,
    ClientPortalInvoice,
    ClientPortalMetrics,
    ClientPortalResponse,
    PayResult,
    PublicInvoiceOut,
)
from app.services.invoice_service import get_effective_status, serialize_invoice

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/invoices/{token}", response_model=PublicInvoiceOut)
def get_public_invoice(token: str, db: Session = Depends(get_db)):
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.items),
            joinedload(Invoice.user).joinedload(User.settings),
        )
        .filter(Invoice.public_token == token.strip())
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested invoice could not be found or the link has expired.",
        )

    serialized = serialize_invoice(invoice, include_items=True)
    settings = invoice.user.settings if invoice.user and invoice.user.settings else None
    business_data = {
        "business_name": settings.business_name if settings else "BillFlow Studio",
        "logo_url": settings.logo_url if settings else None,
        "currency": settings.currency if settings else "USD",
        "invoice_prefix": settings.invoice_prefix if settings else "INV",
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
            detail="The requested invoice could not be found.",
        )

    if invoice.status != "paid":
        invoice.status = "paid"
        invoice.paid_at = datetime.now(timezone.utc)
        db.commit()

    return {"status": "paid", "message": "Payment simulation completed. Invoice marked as PAID."}


@router.get("/portal", response_model=ClientPortalResponse)
def get_client_portal(
    email: str | None = Query(None),
    token: str | None = Query(None),
    db: Session = Depends(get_db),
):
    target_email = ""
    client_name = ""
    client_company = None

    if token and token.strip():
        inv = (
            db.query(Invoice)
            .options(joinedload(Invoice.client))
            .filter(Invoice.public_token == token.strip())
            .first()
        )
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice token not found.",
            )
        target_email = inv.client.email.strip().lower()
        client_name = inv.client.name
        client_company = inv.client.company
    elif email and email.strip():
        target_email = email.strip().lower()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an email address or invoice token to access the client portal.",
        )

    # Find all client entities matching this email
    clients = (
        db.query(Client)
        .filter(func.lower(Client.email) == target_email)
        .all()
    )

    if not clients:
        # Return graceful empty portal state
        return ClientPortalResponse(
            client_name=client_name or target_email.split("@")[0].title(),
            client_email=target_email,
            client_company=client_company,
            metrics=ClientPortalMetrics(
                total_due=0.0,
                total_paid=0.0,
                unpaid_count=0,
                paid_count=0,
                brands_count=0,
            ),
            brands=[],
            invoices=[],
        )

    if not client_name:
        client_name = clients[0].name
        client_company = clients[0].company

    client_ids = [c.id for c in clients]

    # Query all visible invoices across all studios
    raw_invoices = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.items),
            joinedload(Invoice.user).joinedload(User.settings),
        )
        .filter(Invoice.client_id.in_(client_ids), Invoice.status != "draft")
        .order_by(Invoice.issue_date.desc())
        .all()
    )

    portal_invoices: list[ClientPortalInvoice] = []
    brands_set: set[str] = set()
    total_due = 0.0
    total_paid = 0.0
    unpaid_count = 0
    paid_count = 0

    for inv in raw_invoices:
        eff_status = get_effective_status(inv)
        b_settings = inv.user.settings if inv.user and inv.user.settings else None
        b_name = b_settings.business_name if b_settings else "Independent Studio"
        b_logo = b_settings.logo_url if b_settings else None
        b_currency = b_settings.currency if b_settings else "USD"

        brands_set.add(b_name)

        if eff_status == "paid":
            total_paid += float(inv.total)
            paid_count += 1
        else:
            total_due += float(inv.total)
            unpaid_count += 1

        portal_invoices.append(
            ClientPortalInvoice(
                id=inv.id,
                number=inv.number,
                issue_date=inv.issue_date,
                due_date=inv.due_date,
                status=eff_status,
                tax_rate=float(inv.tax_rate),
                discount=float(inv.discount),
                subtotal=float(inv.subtotal),
                total=float(inv.total),
                notes=inv.notes,
                public_token=inv.public_token,
                paid_at=inv.paid_at,
                created_at=inv.created_at,
                items=[
                    {
                        "id": it.id,
                        "description": it.description,
                        "quantity": float(it.quantity),
                        "rate": float(it.rate),
                        "amount": float(it.amount),
                    }
                    for it in inv.items
                ],
                business_name=b_name,
                business_logo=b_logo,
                currency=b_currency,
            )
        )

    return ClientPortalResponse(
        client_name=client_name,
        client_email=target_email,
        client_company=client_company,
        metrics=ClientPortalMetrics(
            total_due=round(total_due, 2),
            total_paid=round(total_paid, 2),
            unpaid_count=unpaid_count,
            paid_count=paid_count,
            brands_count=len(brands_set),
        ),
        brands=sorted(list(brands_set)),
        invoices=portal_invoices,
    )


@router.post("/portal/batch-pay", response_model=BatchPayResponse)
def batch_pay_invoices(req: BatchPayRequest, db: Session = Depends(get_db)):
    tokens = [t.strip() for t in req.invoice_tokens if t.strip()]
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No invoice tokens provided.",
        )

    invoices = (
        db.query(Invoice)
        .filter(Invoice.public_token.in_(tokens))
        .all()
    )

    if not invoices:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="None of the specified invoices were found.",
        )

    now = datetime.now(timezone.utc)
    paid_count = 0
    total_amount = 0.0
    updated_tokens = []

    for inv in invoices:
        if inv.status != "paid":
            inv.status = "paid"
            inv.paid_at = now
            paid_count += 1
            total_amount += float(inv.total)
            updated_tokens.append(inv.public_token)

    db.commit()

    return BatchPayResponse(
        success=True,
        paid_count=paid_count,
        total_amount=round(total_amount, 2),
        updated_tokens=updated_tokens,
        message=f"Successfully processed payment for {paid_count} invoice(s) totaling ${round(total_amount, 2):,.2f}.",
    )

