import os
import sys
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

# Ensure the backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import BusinessSettings, Client, Invoice, InvoiceItem, User

Base.metadata.create_all(engine)

db = SessionLocal()

demo_email = "demo@billflow.app"
user = db.query(User).filter_by(email=demo_email).first()

if not user:
    user = User(email=demo_email, password_hash=hash_password("Demo123!"))
    db.add(user)
    db.flush()
    settings = BusinessSettings(
        user_id=user.id,
        business_name="Northstar Design Studio",
        currency="USD",
        invoice_prefix="NST"
    )
    db.add(settings)
    db.flush()
else:
    # ensure password is Demo123!
    user.password_hash = hash_password("Demo123!")
    if not user.settings:
        db.add(BusinessSettings(user_id=user.id, business_name="Northstar Design Studio", currency="USD", invoice_prefix="NST"))
    db.flush()

# Remove any previous test clients/invoices for a clean demo state
db.query(Invoice).filter_by(user_id=user.id).delete()
db.query(Client).filter_by(user_id=user.id).delete()
db.flush()

# 1. Create realistic clients
c1 = Client(
    user_id=user.id,
    name="Maya Chen",
    email="maya@lumencollective.com",
    company="Lumen Collective",
    address="86 Spring Street, Floor 4\nNew York, NY 10012",
    phone="+1 (212) 555-0188"
)
c2 = Client(
    user_id=user.id,
    name="David Sterling",
    email="david@sterlingventures.io",
    company="Sterling Ventures",
    address="100 Montgomery St, Suite 1500\nSan Francisco, CA 94104",
    phone="+1 (415) 555-0142"
)
c3 = Client(
    user_id=user.id,
    name="Elena Rostova",
    email="elena@aurorabrand.co",
    company="Aurora Creative Labs",
    address="240 Richmond St W\nToronto, ON M5V 1V6",
    phone="+1 (416) 555-0199"
)
c4 = Client(
    user_id=user.id,
    name="Marcus Vance",
    email="marcus@vancemedia.com",
    company="Vance Media Group",
    address="1200 Westlake Ave N\nSeattle, WA 98109",
    phone="+1 (206) 555-0164"
)

db.add_all([c1, c2, c3, c4])
db.flush()

today = date.today()

# 2. Invoices with varied statuses and realistic line items
# Invoice 1: PAID (Historical)
inv1 = Invoice(
    user_id=user.id,
    client_id=c1.id,
    number="NST-0001",
    issue_date=today - timedelta(days=45),
    due_date=today - timedelta(days=30),
    status="paid",
    paid_at=datetime.now(timezone.utc) - timedelta(days=32),
    notes="Thanks for trusting us with your brand rollout. Receipt for completed work.",
    subtotal=6000.00,
    discount=0.00,
    tax_rate=5.00,
    total=6300.00
)
db.add(inv1)
db.flush()
db.add_all([
    InvoiceItem(invoice_id=inv1.id, description="Brand strategy & positioning framework", quantity=1, rate=3500.0, amount=3500.0),
    InvoiceItem(invoice_id=inv1.id, description="Design system & Figma token library", quantity=1, rate=2500.0, amount=2500.0),
])

# Invoice 2: PAID (Recent)
inv2 = Invoice(
    user_id=user.id,
    client_id=c2.id,
    number="NST-0002",
    issue_date=today - timedelta(days=25),
    due_date=today - timedelta(days=10),
    status="paid",
    paid_at=datetime.now(timezone.utc) - timedelta(days=12),
    notes="Q3 investor deck and visual assets. Payment received with thanks.",
    subtotal=2800.00,
    discount=200.00,
    tax_rate=0.00,
    total=2600.00
)
db.add(inv2)
db.flush()
db.add_all([
    InvoiceItem(invoice_id=inv2.id, description="Investor pitch deck redesign (22 slides)", quantity=1, rate=2200.0, amount=2200.0),
    InvoiceItem(invoice_id=inv2.id, description="Data visualization graphics & chart templates", quantity=1, rate=600.0, amount=600.0),
])

# Invoice 3: OVERDUE (due 8 days ago)
inv3 = Invoice(
    user_id=user.id,
    client_id=c3.id,
    number="NST-0003",
    issue_date=today - timedelta(days=22),
    due_date=today - timedelta(days=8),
    status="sent",
    notes="Past due invoice. Please remit payment at your earliest convenience.",
    subtotal=5000.00,
    discount=0.00,
    tax_rate=0.00,
    total=5000.00
)
db.add(inv3)
db.flush()
db.add_all([
    InvoiceItem(invoice_id=inv3.id, description="Mobile application UI design (iOS & Android)", quantity=1, rate=4200.0, amount=4200.0),
    InvoiceItem(invoice_id=inv3.id, description="Custom SVG icon library (40 icons)", quantity=1, rate=800.0, amount=800.0),
])

# Invoice 4: SENT (Outstanding, due in 12 days)
inv4 = Invoice(
    user_id=user.id,
    client_id=c2.id,
    number="NST-0004",
    issue_date=today - timedelta(days=2),
    due_date=today + timedelta(days=12),
    status="sent",
    notes="Sprint 1 deliverables completed. Payment is due in 14 days.",
    subtotal=6800.00,
    discount=300.00,
    tax_rate=8.00,
    total=7020.00
)
db.add(inv4)
db.flush()
db.add_all([
    InvoiceItem(invoice_id=inv4.id, description="SaaS analytics dashboard redesign", quantity=40, rate=125.0, amount=5000.0),
    InvoiceItem(invoice_id=inv4.id, description="Interactive high-fidelity prototype & user testing", quantity=1, rate=1800.0, amount=1800.0),
])

# Invoice 5: DRAFT
inv5 = Invoice(
    user_id=user.id,
    client_id=c4.id,
    number="NST-0005",
    issue_date=today,
    due_date=today + timedelta(days=14),
    status="draft",
    notes="Draft quote for upcoming editorial campaign & web launch.",
    subtotal=3350.00,
    discount=150.00,
    tax_rate=5.00,
    total=3360.00
)
db.add(inv5)
db.flush()
db.add_all([
    InvoiceItem(invoice_id=inv5.id, description="Marketing landing page copy & layout", quantity=1, rate=2400.0, amount=2400.0),
    InvoiceItem(invoice_id=inv5.id, description="Email campaign newsletter templates", quantity=1, rate=950.0, amount=950.0),
])

# Invoice 6: SENT (Featured Demo Public Link)
inv6 = Invoice(
    user_id=user.id,
    client_id=c1.id,
    number="NST-0006",
    issue_date=today - timedelta(days=1),
    due_date=today + timedelta(days=13),
    status="sent",
    notes="Milestone 2 - Web application frontend development & design handover. Click the link to view and pay directly.",
    subtotal=6400.00,
    discount=400.00,
    tax_rate=6.00,
    total=6360.00
)
db.add(inv6)
db.flush()
db.add_all([
    InvoiceItem(invoice_id=inv6.id, description="Next.js responsive web application frontend", quantity=1, rate=4800.0, amount=4800.0),
    InvoiceItem(invoice_id=inv6.id, description="REST API integration, client portal & Stripe setup", quantity=1, rate=1600.0, amount=1600.0),
])

db.commit()

print("=" * 60)
print("BILLFLOW SEED COMPLETED SUCCESSFULLY")
print("=" * 60)
print(f"Demo Account Email:    {demo_email}")
print(f"Demo Account Password: Demo123!")
print(f"Total Clients Seeded:  4")
print(f"Total Invoices Seeded: 6 (2 Paid, 1 Overdue, 2 Sent, 1 Draft)")
print(f"Featured Public Token: {inv6.public_token}")
print(f"Public Payment URL:    http://localhost:3000/pay/{inv6.public_token}")
print("=" * 60)

db.close()

