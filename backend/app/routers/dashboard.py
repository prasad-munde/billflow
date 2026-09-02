from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.auth import current_user
from app.database import get_db
from app.models import Invoice, User
from app.schemas import DashboardStats
from app.services.invoice_service import serialize_invoice

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardStats)
@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), user: User = Depends(current_user)):
    invoices = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.items))
        .filter(Invoice.user_id == user.id)
        .order_by(Invoice.created_at.desc())
        .all()
    )

    today = date.today()
    earned = 0.0
    outstanding = 0.0
    overdue = 0.0
    counts = {"draft": 0, "sent": 0, "paid": 0, "overdue": 0, "total": len(invoices)}

    for inv in invoices:
        tot = float(inv.total or 0.0)
        if inv.status == "paid":
            earned += tot
            counts["paid"] += 1
        elif inv.status == "sent":
            if inv.due_date < today:
                overdue += tot
                counts["overdue"] += 1
            else:
                outstanding += tot
                counts["sent"] += 1
        elif inv.status == "draft":
            outstanding += tot
            counts["draft"] += 1

    months_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_year = today.year
    income_by_month = {m: 0.0 for m in range(1, 13)}

    for inv in invoices:
        if inv.status == "paid" and inv.issue_date:
            if inv.issue_date.year == current_year:
                income_by_month[inv.issue_date.month] += float(inv.total or 0.0)

    income_series = [
        {"month": months_labels[m - 1], "income": round(income_by_month[m], 2)}
        for m in range(1, 13)
    ]

    recent_invoices = [serialize_invoice(i, include_items=False) for i in invoices[:5]]

    return {
        "earned": round(earned, 2),
        "outstanding": round(outstanding, 2),
        "overdue": round(overdue, 2),
        "recent": recent_invoices,
        "income": income_series,
        "counts": counts,
    }
