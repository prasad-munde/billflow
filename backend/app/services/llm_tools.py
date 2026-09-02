from datetime import date, datetime, timedelta, timezone
import json
import re
from typing import Any
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import BusinessSettings, Client, Invoice, InvoiceItem, User
from app.services.invoice_service import calculate_invoice_totals, generate_next_invoice_number, get_effective_status

# Tool Specifications in standard OpenAI/Gemini function calling format
BILLFLOW_TOOLS_SPEC = [
    {
        "name": "get_clients",
        "description": "List all clients with their segregated financial metrics (revenue collected, overdue amount, pending balance, and invoice count).",
        "parameters": {
            "type": "object",
            "properties": {
                "search": {"type": "string", "description": "Optional search term for client name, company, or email."}
            }
        }
    },
    {
        "name": "create_client",
        "description": "Add a new client to the workspace.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Client full name."},
                "email": {"type": "string", "description": "Client billing email address."},
                "company": {"type": "string", "description": "Client organization or company name."},
                "address": {"type": "string", "description": "Physical billing address."},
                "phone": {"type": "string", "description": "Contact phone number."}
            },
            "required": ["name", "email"]
        }
    },
    {
        "name": "get_client_analytics",
        "description": "Get deep segregated financial metrics, overdue status, and invoice history for a specific client.",
        "parameters": {
            "type": "object",
            "properties": {
                "client_identifier": {"type": "string", "description": "Client name or email address."}
            },
            "required": ["client_identifier"]
        }
    },
    {
        "name": "get_invoices",
        "description": "Query invoices with optional status filter (paid, sent, overdue, draft) or client filter.",
        "parameters": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["paid", "sent", "overdue", "draft", "all"], "description": "Filter by status."},
                "client_name": {"type": "string", "description": "Filter by client name."},
                "search": {"type": "string", "description": "Search keyword."}
            }
        }
    },
    {
        "name": "create_invoice",
        "description": "Create and save a new invoice with line items for a client.",
        "parameters": {
            "type": "object",
            "properties": {
                "client_name_or_email": {"type": "string", "description": "Client name or email to bill."},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "quantity": {"type": "number"},
                            "rate": {"type": "number"}
                        },
                        "required": ["description", "quantity", "rate"]
                    },
                    "description": "List of line items with description, quantity, and rate."
                },
                "due_in_days": {"type": "integer", "description": "Payment term in days (default: 14)."},
                "tax_rate": {"type": "number", "description": "Tax percentage (e.g. 5.0 for 5%)."},
                "discount": {"type": "number", "description": "Flat discount amount in currency units."},
                "notes": {"type": "string", "description": "Payment instructions or invoice notes."}
            },
            "required": ["client_name_or_email", "items"]
        }
    },
    {
        "name": "get_dashboard_summary",
        "description": "Get high-level business performance metrics (earned revenue, pending receivables, overdue amount, and total clients).",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]

# Native Tool Executors
def tool_get_clients(db: Session, user: User, search: str | None = None) -> dict:
    query = db.query(Client).filter(Client.user_id == user.id)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            (func.lower(Client.name).like(term)) |
            (func.lower(Client.email).like(term)) |
            (func.lower(Client.company).like(term))
        )
    clients = query.order_by(Client.name.asc()).all()
    results = []
    for c in clients:
        paid = sum(float(inv.total or 0.0) for inv in c.invoices if get_effective_status(inv) == "paid")
        overdue = sum(float(inv.total or 0.0) for inv in c.invoices if get_effective_status(inv) == "overdue")
        outstanding = sum(float(inv.total or 0.0) for inv in c.invoices if get_effective_status(inv) != "paid")
        results.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "company": c.company,
            "total_paid": round(paid, 2),
            "total_overdue": round(overdue, 2),
            "total_outstanding": round(outstanding, 2),
            "invoices_count": len(c.invoices),
        })
    return {"clients": results, "total_count": len(results)}

def tool_create_client(db: Session, user: User, name: str, email: str, company: str | None = None, address: str | None = None, phone: str | None = None) -> dict:
    client = Client(
        user_id=user.id,
        name=name.strip(),
        email=email.strip().lower(),
        company=company.strip() if company else None,
        address=address.strip() if address else None,
        phone=phone.strip() if phone else None,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return {
        "success": True,
        "message": f"Successfully created client {client.name}.",
        "client": {
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "company": client.company,
        }
    }

def tool_get_client_analytics(db: Session, user: User, client_identifier: str) -> dict:
    term = client_identifier.strip().lower()
    client = db.query(Client).filter(
        Client.user_id == user.id,
        (func.lower(Client.name) == term) | (func.lower(Client.email) == term) | (func.lower(Client.name).like(f"%{term}%"))
    ).first()

    if not client:
        return {"error": f"Client matching '{client_identifier}' not found."}

    invoices_data = []
    paid_total = 0.0
    overdue_total = 0.0
    outstanding_total = 0.0

    for inv in client.invoices:
        eff_status = get_effective_status(inv)
        inv_amt = float(inv.total or 0.0)
        if eff_status == "paid":
            paid_total += inv_amt
        else:
            outstanding_total += inv_amt
            if eff_status == "overdue":
                overdue_total += inv_amt

        invoices_data.append({
            "id": inv.id,
            "number": inv.number,
            "status": eff_status,
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "total": round(inv_amt, 2),
            "public_token": inv.public_token,
        })

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "company": client.company,
            "phone": client.phone,
        },
        "segregated_metrics": {
            "total_revenue_collected": round(paid_total, 2),
            "total_outstanding_balance": round(outstanding_total, 2),
            "total_overdue_balance": round(overdue_total, 2),
            "invoices_count": len(invoices_data),
        },
        "invoices": invoices_data
    }

def tool_get_invoices(db: Session, user: User, status: str | None = None, client_name: str | None = None, search: str | None = None) -> dict:
    query = db.query(Invoice).filter(Invoice.user_id == user.id)
    if client_name:
        query = query.join(Client).filter(func.lower(Client.name).like(f"%{client_name.lower()}%"))
    
    invoices = query.order_by(Invoice.issue_date.desc()).all()
    results = []
    for inv in invoices:
        eff_status = get_effective_status(inv)
        if status and status != "all" and eff_status != status.lower():
            continue
        if search and search.strip():
            term = search.strip().lower()
            if term not in inv.number.lower() and term not in (inv.client.name if inv.client else "").lower():
                continue

        results.append({
            "id": inv.id,
            "number": inv.number,
            "client_name": inv.client.name if inv.client else "Unknown",
            "status": eff_status,
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "total": round(float(inv.total or 0.0), 2),
            "public_token": inv.public_token,
        })

    return {"invoices": results, "count": len(results)}

def tool_create_invoice(
    db: Session,
    user: User,
    client_name_or_email: str,
    items: list[dict],
    due_in_days: int = 14,
    tax_rate: float = 0.0,
    discount: float = 0.0,
    notes: str | None = None,
) -> dict:
    term = client_name_or_email.strip().lower()
    client = db.query(Client).filter(
        Client.user_id == user.id,
        (func.lower(Client.name) == term) | (func.lower(Client.email) == term) | (func.lower(Client.name).like(f"%{term}%"))
    ).first()

    if not client:
        # Create client if not found
        client = Client(user_id=user.id, name=client_name_or_email.strip(), email=f"billing@{client_name_or_email.lower().replace(' ', '')}.com")
        db.add(client)
        db.commit()
        db.refresh(client)

    # Next invoice number
    settings = user.settings or BusinessSettings(business_name="My Studio", currency="USD", invoice_prefix="INV")
    prefix = settings.invoice_prefix or "INV"
    invoice_number = generate_next_invoice_number(db, user.id, prefix)

    today = date.today()
    due_date = today + timedelta(days=due_in_days)

    # Compute items and totals
    subtotal = 0.0
    item_models = []
    for it in items:
        qty = float(it.get("quantity", 1.0))
        rate = float(it.get("rate", 0.0))
        amt = round(qty * rate, 2)
        subtotal += amt
        item_models.append((it.get("description", "Service Item"), qty, rate, amt))

    disc = max(0.0, float(discount))
    tax = max(0.0, float(tax_rate))
    discounted_base = max(0.0, subtotal - disc)
    total = round(discounted_base * (1.0 + tax / 100.0), 2)

    invoice = Invoice(
        user_id=user.id,
        client_id=client.id,
        number=invoice_number,
        issue_date=today,
        due_date=due_date,
        status="sent",
        notes=notes or "Thank you for your business! Please remit payment before the due date.",
        subtotal=round(subtotal, 2),
        discount=disc,
        tax_rate=tax,
        total=total,
    )
    db.add(invoice)
    db.flush()

    for desc, qty, rate, amt in item_models:
        db.add(InvoiceItem(invoice_id=invoice.id, description=desc, quantity=qty, rate=rate, amount=amt))

    db.commit()
    db.refresh(invoice)

    return {
        "success": True,
        "message": f"Created invoice {invoice.number} for {client.name} totaling ${invoice.total:,.2f}.",
        "invoice": {
            "id": invoice.id,
            "number": invoice.number,
            "client_name": client.name,
            "total": round(float(invoice.total or 0.0), 2),
            "due_date": invoice.due_date.isoformat(),
            "public_token": invoice.public_token,
            "payment_url": f"/pay/{invoice.public_token}",
        }
    }

def tool_get_dashboard_summary(db: Session, user: User) -> dict:
    invoices = db.query(Invoice).filter(Invoice.user_id == user.id).all()
    clients_count = db.query(Client).filter(Client.user_id == user.id).count()

    earned = sum(float(inv.total or 0.0) for inv in invoices if get_effective_status(inv) == "paid")
    overdue = sum(float(inv.total or 0.0) for inv in invoices if get_effective_status(inv) == "overdue")
    outstanding = sum(float(inv.total or 0.0) for inv in invoices if get_effective_status(inv) != "paid")

    return {
        "total_revenue_earned": round(earned, 2),
        "total_pending_receivables": round(outstanding, 2),
        "total_overdue_balance": round(overdue, 2),
        "total_clients": clients_count,
        "total_invoices": len(invoices),
    }


TOOL_MAP = {
    "get_clients": tool_get_clients,
    "create_client": tool_create_client,
    "get_client_analytics": tool_get_client_analytics,
    "get_invoices": tool_get_invoices,
    "create_invoice": tool_create_invoice,
    "get_dashboard_summary": tool_get_dashboard_summary,
}

def execute_tool_call(tool_name: str, arguments: dict, db: Session, user: User) -> dict:
    fn = TOOL_MAP.get(tool_name)
    if not fn:
        return {"error": f"Unknown tool '{tool_name}'"}
    try:
        return fn(db=db, user=user, **arguments)
    except Exception as e:
        return {"error": str(e)}

def agent_intent_and_tool_dispatcher(message: str, db: Session, user: User) -> dict:
    """
    Intelligent natural language agent with tool calling.
    Analyzes intent, selects and executes tool(s), and returns conversational synthesis.
    """
    msg = message.strip()
    msg_lower = msg.lower()
    tool_calls = []

    # 1. Create client intent
    # e.g., "create client Acme Corp with email info@acme.com" or "add client John Doe email john@doe.com"
    create_client_match = re.search(r'(?:add|create|new)\s+client\s+([A-Za-z0-9\s&]+?)(?:\s+(?:with|email|company|@)\s+(.+))?$', msg, re.IGNORECASE)
    if ("add client" in msg_lower or "create client" in msg_lower) and create_client_match:
        name = create_client_match.group(1).strip()
        rest = create_client_match.group(2) or ""
        email_m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', rest)
        email = email_m.group(0) if email_m else f"contact@{name.lower().replace(' ', '')}.com"
        company_m = re.search(r'company[:\s]+([A-Za-z0-9\s]+)', rest, re.IGNORECASE)
        company = company_m.group(1).strip() if company_m else None
        
        res = tool_create_client(db, user, name=name, email=email, company=company)
        tool_calls.append({"tool": "create_client", "args": {"name": name, "email": email, "company": company}, "result": res})
        text = f"I've added **{name}** ({email}) to your client directory."
        return {"text": text, "tool_calls": tool_calls}

    # 2. Create invoice intent
    # e.g., "create invoice for Maya Chen for $1200 website maintenance"
    if "create invoice" in msg_lower or "bill " in msg_lower or "send invoice" in msg_lower or "draft invoice" in msg_lower:
        client_match = re.search(r'(?:for|to)\s+([A-Za-z0-9\s&]+?)(?:\s+(?:for|regarding|amount|\$|with)|\.|$)', msg, re.IGNORECASE)
        client_name = client_match.group(1).strip() if client_match else "Maya Chen"
        
        # Parse price and description
        price_match = re.search(r'[\$₹€£]?\s*(\d+(?:,\d+)*(?:\.\d+)?)', msg)
        amount = float(price_match.group(1).replace(',', '')) if price_match else 1000.0
        
        desc_match = re.search(r'(?:for|amount\s+of)\s+[\$₹€£]?\d+(?:,\d+)*(?:\.\d+)?\s*(?:for\s+)?(.+)', msg, re.IGNORECASE)
        desc = desc_match.group(1).strip() if desc_match else "Consulting & Deliverables"

        items = [{"description": desc.capitalize(), "quantity": 1.0, "rate": amount}]
        res = tool_create_invoice(db, user, client_name_or_email=client_name, items=items)
        tool_calls.append({"tool": "create_invoice", "args": {"client_name_or_email": client_name, "items": items}, "result": res})
        
        inv = res.get("invoice", {})
        text = f"I have generated and sent invoice **{inv.get('number')}** to **{inv.get('client_name')}** for **${amount:,.2f}** ({desc}). [View Payment Link]({inv.get('payment_url')})"
        return {"text": text, "tool_calls": tool_calls}

    # 3. Client specific analytics / overdue balance
    # e.g., "What is Maya Chen's overdue balance?" or "How much does David Sterling owe me?"
    client_names = [c.name for c in db.query(Client).filter(Client.user_id == user.id).all()]
    matched_client = next((cn for cn in client_names if cn.lower() in msg_lower), None)

    if matched_client or "overdue of" in msg_lower or "revenue from" in msg_lower or "client info" in msg_lower or "how much does" in msg_lower or "balance for" in msg_lower:
        c_target = matched_client
        if not c_target:
            m = re.search(r'(?:for|of|from|does)\s+([A-Za-z0-9\s]+?)(?:\s+(?:owe|have|status|balance)|\?|\.|$)', msg, re.IGNORECASE)
            c_target = m.group(1).strip() if m else "Maya Chen"

        res = tool_get_client_analytics(db, user, client_identifier=c_target)
        tool_calls.append({"tool": "get_client_analytics", "args": {"client_identifier": c_target}, "result": res})
        
        if "error" in res:
            text = f"I could not find client **{c_target}**. Would you like me to add them?"
        else:
            m = res["segregated_metrics"]
            c = res["client"]
            text = (
                f"**Client Performance: {c['name']}** ({c.get('company') or c['email']})\n\n"
                f"• **Revenue Collected**: `${m['total_revenue_collected']:,.2f}`\n"
                f"• **Outstanding Balance**: `${m['total_outstanding_balance']:,.2f}`\n"
                f"• **Overdue Amount**: `${m['total_overdue_balance']:,.2f}`\n"
                f"• **Total Invoices**: `{m['invoices_count']}` invoice(s)"
            )
        return {"text": text, "tool_calls": tool_calls}

    # 4. Overdue query / who owes me money
    if "overdue" in msg_lower or "who owes" in msg_lower or "unpaid" in msg_lower:
        res = tool_get_clients(db, user)
        tool_calls.append({"tool": "get_clients", "args": {}, "result": res})
        overdue_clients = [c for c in res["clients"] if c["total_overdue"] > 0 or c["total_outstanding"] > 0]
        if overdue_clients:
            lines = [f"• **{c['name']}**: `${c['total_outstanding']:,.2f}` pending" + (f" (*`${c['total_overdue']:,.2f}` OVERDUE*)" if c['total_overdue'] > 0 else "") for c in overdue_clients]
            text = f"Here is the current receivables and overdue breakdown by client:\n\n" + "\n".join(lines)
        else:
            text = "Great news! You have zero overdue balances across all clients."
        return {"text": text, "tool_calls": tool_calls}

    # 5. List all clients
    if "clients" in msg_lower or "client list" in msg_lower or "get client" in msg_lower:
        res = tool_get_clients(db, user)
        tool_calls.append({"tool": "get_clients", "args": {}, "result": res})
        lines = [f"• **{c['name']}** ({c.get('company') or c['email']}) — Collected: `${c['total_paid']:,.2f}` | Pending: `${c['total_outstanding']:,.2f}`" for c in res["clients"]]
        text = f"You currently have **{res['total_count']} clients**:\n\n" + "\n".join(lines)
        return {"text": text, "tool_calls": tool_calls}

    # 6. List invoices
    if "invoices" in msg_lower or "get invoice" in msg_lower or "show invoices" in msg_lower:
        res = tool_get_invoices(db, user)
        tool_calls.append({"tool": "get_invoices", "args": {}, "result": res})
        lines = [f"• **{inv['number']}** for **{inv['client_name']}** — `${inv['total']:,.2f}` ({inv['status'].upper()})" for inv in res["invoices"][:6]]
        text = f"Here are your latest **{len(res['invoices'])} invoices**:\n\n" + "\n".join(lines)
        return {"text": text, "tool_calls": tool_calls}

    # 7. Default: Dashboard Summary
    res = tool_get_dashboard_summary(db, user)
    tool_calls.append({"tool": "get_dashboard_summary", "args": {}, "result": res})
    text = (
        f"**Studio Financial Performance Overview**:\n\n"
        f"• **Total Revenue Earned**: `${res['total_revenue_earned']:,.2f}`\n"
        f"• **Pending Receivables**: `${res['total_pending_receivables']:,.2f}`\n"
        f"• **Overdue Balances**: `${res['total_overdue_balance']:,.2f}`\n"
        f"• **Active Clients**: `{res['total_clients']}` | **Invoices**: `{res['total_invoices']}`\n\n"
        f"Ask me anything! For example: *'What is Maya Chen's overdue balance?'*, *'Create an invoice for David Sterling for $800'*, or *'Add client Acme Corp'*."
    )
    return {"text": text, "tool_calls": tool_calls}
