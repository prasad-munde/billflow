from datetime import date
from typing import Sequence
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Client, Invoice, InvoiceItem
from app.schemas import ItemInput


def calculate_invoice_totals(items: Sequence[ItemInput], discount: float = 0.0, tax_rate: float = 0.0) -> tuple[float, float, list[dict]]:
    calculated_items = []
    subtotal = 0.0
    for item in items:
        amt = round(float(item.quantity) * float(item.rate), 2)
        subtotal += amt
        calculated_items.append({
            'description': item.description.strip(),
            'quantity': float(item.quantity),
            'rate': float(item.rate),
            'amount': amt
        })
    subtotal = round(subtotal, 2)
    discount = max(0.0, float(discount))
    tax_rate = max(0.0, float(tax_rate))
    discounted_base = max(0.0, subtotal - discount)
    total = round(discounted_base * (1.0 + tax_rate / 100.0), 2)
    return subtotal, total, calculated_items


def get_effective_status(invoice: Invoice) -> str:
    if invoice.status == 'paid':
        return 'paid'
    if invoice.status == 'sent' and invoice.due_date < date.today():
        return 'overdue'
    return invoice.status


def generate_next_invoice_number(db: Session, user_id: int, prefix: str = 'INV') -> str:
    prefix = (prefix or 'INV').strip().upper()
    count = (db.query(func.count(Invoice.id)).filter(Invoice.user_id == user_id).scalar() or 0) + 1
    candidate = f'{prefix}-{count:04d}'
    while db.query(Invoice.id).filter(Invoice.user_id == user_id, Invoice.number == candidate).first():
        count += 1
        candidate = f'{prefix}-{count:04d}'
    return candidate


def serialize_client(c: Client) -> dict:
    return {
        'id': c.id,
        'name': c.name,
        'email': c.email,
        'company': c.company,
        'address': c.address,
        'phone': c.phone,
        'created_at': c.created_at,
        'updated_at': c.updated_at,
    }


def serialize_invoice(i: Invoice, include_items: bool = True) -> dict:
    data = {
        'id': i.id,
        'number': i.number,
        'status': get_effective_status(i),
        'issue_date': i.issue_date,
        'due_date': i.due_date,
        'notes': i.notes,
        'tax_rate': float(i.tax_rate or 0.0),
        'discount': float(i.discount or 0.0),
        'subtotal': float(i.subtotal or 0.0),
        'total': float(i.total or 0.0),
        'public_token': i.public_token,
        'paid_at': i.paid_at,
        'created_at': i.created_at,
        'client': serialize_client(i.client),
        'items': []
    }
    if include_items and i.items:
        data['items'] = [
            {
                'id': item.id,
                'description': item.description,
                'quantity': float(item.quantity),
                'rate': float(item.rate),
                'amount': float(item.amount),
            }
            for item in i.items
        ]
    return data
