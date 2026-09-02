from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from app.auth import current_user
from app.config import settings
from app.database import get_db
from app.models import Client, Invoice, InvoiceItem, User
from app.schemas import InvoiceCreate, InvoiceOut, InvoiceUpdate
from app.services.invoice_service import (
    calculate_invoice_totals,
    generate_next_invoice_number,
    get_effective_status,
    serialize_invoice,
)

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    q: str | None = Query(default=None, description="Search by client name, company, or invoice number"),
    status: str | None = Query(default=None, description="Filter by status: draft, sent, paid, overdue"),
    client_id: int | None = Query(default=None, description="Filter by client ID"),
    sort: str = Query(default="newest", description="Sorting key: newest, oldest, due, amount_asc, amount_desc, number"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    query = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.items))
        .filter(Invoice.user_id == user.id)
    )

    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    if status:
        status_clean = status.strip().lower()
        today = date.today()
        if status_clean == "overdue":
            query = query.filter(Invoice.status == "sent", Invoice.due_date < today)
        elif status_clean == "sent":
            query = query.filter(Invoice.status == "sent", Invoice.due_date >= today)
        elif status_clean in ("draft", "paid"):
            query = query.filter(Invoice.status == status_clean)

    if q:
        search_term = f"%{q.strip()}%".lower()
        query = query.join(Invoice.client).filter(
            or_(
                Invoice.number.ilike(search_term),
                Client.name.ilike(search_term),
                Client.company.ilike(search_term),
            )
        )

    if sort == "oldest":
        query = query.order_by(Invoice.created_at.asc())
    elif sort == "due":
        query = query.order_by(Invoice.due_date.asc())
    elif sort == "amount_asc":
        query = query.order_by(Invoice.total.asc())
    elif sort == "amount_desc":
        query = query.order_by(Invoice.total.desc())
    elif sort == "number":
        query = query.order_by(Invoice.number.asc())
    else:
        query = query.order_by(Invoice.created_at.desc())

    invoices = query.all()
    return [serialize_invoice(inv, include_items=True) for inv in invoices]

@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = db.query(Client).filter(Client.id == payload.client_id, Client.user_id == user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found or access denied.")

    prefix = user.settings.invoice_prefix if user.settings else "INV"
    number = generate_next_invoice_number(db, user.id, prefix)
    subtotal, total, calculated_items = calculate_invoice_totals(
        payload.items,
        discount=payload.discount,
        tax_rate=payload.tax_rate
    )

    invoice = Invoice(
        user_id=user.id,
        client_id=client.id,
        number=number,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        status="draft",
        tax_rate=payload.tax_rate,
        discount=payload.discount,
        subtotal=subtotal,
        total=total,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(invoice)
    db.flush()

    for item_data in calculated_items:
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                description=item_data["description"],
                quantity=item_data["quantity"],
                rate=item_data["rate"],
                amount=item_data["amount"],
            )
        )

    db.commit()
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.items))
        .filter(Invoice.id == invoice.id)
        .first()
    )
    return serialize_invoice(invoice, include_items=True)

@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.items))
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    return serialize_invoice(invoice, include_items=True)

@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: int, payload: InvoiceUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.items))
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    if payload.client_id is not None and payload.client_id != invoice.client_id:
        client = db.query(Client).filter(Client.id == payload.client_id, Client.user_id == user.id).first()
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target client not found.")
        invoice.client_id = client.id

    if payload.issue_date is not None:
        invoice.issue_date = payload.issue_date
    if payload.due_date is not None:
        invoice.due_date = payload.due_date
    if payload.notes is not None:
        invoice.notes = payload.notes.strip() if payload.notes else None
    if payload.tax_rate is not None:
        invoice.tax_rate = payload.tax_rate
    if payload.discount is not None:
        invoice.discount = payload.discount
    if payload.status is not None:
        valid_statuses = {"draft", "sent", "paid"}
        if payload.status in valid_statuses:
            invoice.status = payload.status

    if payload.items is not None and len(payload.items) > 0:
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
        subtotal, total, calculated_items = calculate_invoice_totals(
            payload.items,
            discount=invoice.discount,
            tax_rate=invoice.tax_rate
        )
        invoice.subtotal = subtotal
        invoice.total = total
        for item_data in calculated_items:
            db.add(
                InvoiceItem(
                    invoice_id=invoice.id,
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    rate=item_data["rate"],
                    amount=item_data["amount"],
                )
            )
    else:
        # recalculate totals if tax or discount changed
        items_inputs = [
            type("ItemObj", (), {"description": it.description, "quantity": float(it.quantity), "rate": float(it.rate)})()
            for it in invoice.items
        ]
        subtotal, total, _ = calculate_invoice_totals(
            items_inputs,
            discount=invoice.discount,
            tax_rate=invoice.tax_rate
        )
        invoice.subtotal = subtotal
        invoice.total = total

    db.commit()
    db.refresh(invoice)
    return serialize_invoice(invoice, include_items=True)

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    db.delete(invoice)
    db.commit()
    return None

@router.post("/{invoice_id}/send")
def send_invoice(invoice_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")
    if invoice.status == "draft":
        invoice.status = "sent"
        db.commit()
        db.refresh(invoice)
    share_url = f"{settings.frontend_url}/pay/{invoice.public_token}"
    return {
        "share_url": share_url,
        "public_token": invoice.public_token,
        "status": get_effective_status(invoice),
        "message": "Invoice marked as sent. Shareable link generated."
    }
