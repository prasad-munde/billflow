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
    Analyzes intent, selects and executes tool(s) ONLY when needed, and returns conversational synthesis.
    """
    msg = message.strip()
    msg_lower = msg.lower()
    tool_calls = []

    # Conversational greetings and pleasantries (NO TOOLS)
    greetings = ["hi", "hello", "hey", "good morning", "good evening", "howdy", "how are you", "what's up", "whats up"]
    if any(msg_lower == g or msg_lower.startswith(g + " ") or msg_lower.startswith(g + ",") or msg_lower.startswith(g + "!") for g in greetings):
        if not any(w in msg_lower for w in ["invoice", "client", "bill", "due", "pay", "revenue", "money", "summary"]):
            return {
                "text": "Hello! How can I help you today? Whether you want to check client balances, audit overdue invoices, or create a new invoice, just let me know!",
                "tool_calls": []
            }

    if msg_lower in ["thanks", "thank you", "thx", "appreciate it", "great", "awesome", "perfect", "cool", "ok", "okay"]:
        return {
            "text": "You're welcome! Let me know whenever you need anything else.",
            "tool_calls": []
        }

    # BillFlow System Knowledge Answers (NO TOOLS)
    if "portal" in msg_lower or "batch pay" in msg_lower:
        return {
            "text": (
                "### 🌐 BillFlow Client Portal & Batch Pay\n\n"
                "The **Client Portal** (`/portal`) allows your clients to see **all their invoices in one unified view**:\n\n"
                "• **No Account Setup Required**: Clients simply log in using their email address.\n"
                "• **Unified Dashboard**: Clients see all pending, overdue, and paid invoices sent to them across studios.\n"
                "• **Batch Payment**: Clients can select multiple pending invoices using checkboxes and pay them simultaneously in a single transaction!\n\n"
                "Clients can also access any individual invoice via its secure instant payment link (`/pay/[token]`)."
            ),
            "tool_calls": []
        }

    if "pdf" in msg_lower or "print" in msg_lower or "download" in msg_lower:
        return {
            "text": (
                "### 🖨️ Printing & PDF Export\n\n"
                "Every invoice in BillFlow can be printed or saved as a PDF directly:\n\n"
                "1. Navigate to any invoice at `/invoices/[id]`.\n"
                "2. Click the **'Print / Save PDF'** button in the header.\n"
                "3. Your browser's print dialog will open with print stylesheet styling formatted like a high-end physical receipt.\n"
                "4. Choose **'Save as PDF'** to export a clean digital document."
            ),
            "tool_calls": []
        }

    if ("segregation" in msg_lower or "client metrics" in msg_lower or "client breakdown" in msg_lower) and not any(k in msg_lower for k in ["maya", "david", "elena", "marcus", "show", "list", "get"]):
        return {
            "text": (
                "### 📊 Client-Wise Financial Segregation\n\n"
                "On the **Clients** page (`/clients`), BillFlow automatically segregates finances per client:\n\n"
                "• **Lifetime Revenue Collected**: Total amount paid by that specific client.\n"
                "• **Outstanding Receivables**: Unpaid sent invoices for that client.\n"
                "• **Overdue Balances**: Amount past the due date.\n"
                "• **Invoice Count**: Total invoices issued to them.\n\n"
                "You can also ask me: *'What is Maya Chen's overdue balance?'* to audit any client instantly."
            ),
            "tool_calls": []
        }

    if "how does overdue" in msg_lower or "overdue status" in msg_lower:
        return {
            "text": (
                "### 🚨 Dynamic Overdue Calculation\n\n"
                "In BillFlow, invoice overdue status is **computed automatically**:\n\n"
                "• When an invoice is created with a `due_date`, the system monitors its payment state.\n"
                "• If the invoice status is still `sent` and today's date exceeds the `due_date`, it is dynamically flagged as **Overdue**.\n"
                "• When the client completes payment, the status automatically switches to **Paid** and the overdue flag clears."
            ),
            "tool_calls": []
        }

    if "what can you do" in msg_lower or "features" in msg_lower or "help me with" in msg_lower:
        return {
            "text": (
                "### 🤖 What I Can Do As Your AI Operator\n\n"
                "I am your central command center for all studio operations and questions:\n\n"
                "1. **System Expert**: Ask me anything about BillFlow (Client Portal, Batch Pay, PDF printing, taxes, discounts, settings).\n"
                "2. **Audits & Diagnostics**: Ask *'Who owes me money?'* or *'Show Maya Chen's overdue balance'*.\n"
                "3. **Autonomous Invoicing**: Say *'Create an invoice for David Sterling for $1,500 due in 10 days'*.\n"
                "4. **Client Directory**: Say *'Add client Acme Corp with email billing@acme.com'*.\n"
                "5. **Business KPIs**: Say *'What are my studio metrics?'* for collected revenue vs receivables."
            ),
            "tool_calls": []
        }


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

    # 7. Dashboard Summary / Overview (only when explicitly requested)
    if any(k in msg_lower for k in ["summary", "overview", "metric", "kpi", "diagnostic", "performance", "how is business", "total revenue", "earnings"]):
        res = tool_get_dashboard_summary(db, user)
        tool_calls.append({"tool": "get_dashboard_summary", "args": {}, "result": res})
        text = (
            f"**Studio Financial Performance Overview**:\n\n"
            f"• **Total Revenue Earned**: `${res['total_revenue_earned']:,.2f}`\n"
            f"• **Pending Receivables**: `${res['total_pending_receivables']:,.2f}`\n"
            f"• **Overdue Balances**: `${res['total_overdue_balance']:,.2f}`\n"
            f"• **Active Clients**: `{res['total_clients']}` | **Invoices**: `{res['total_invoices']}`"
        )
        return {"text": text, "tool_calls": tool_calls}

    # 8. Conversational fallback (No tools invoked)
    text = (
        "I'm here to assist you with your invoicing and client management! "
        "You can ask me to look up any client, audit overdue payments, generate an invoice, or view financial metrics."
    )
    return {"text": text, "tool_calls": []}


OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["parameters"],
        }
    }
    for tool in BILLFLOW_TOOLS_SPEC
]


def get_llm_client_config(
    provider: str | None,
    api_key: str | None,
    model: str | None,
) -> tuple[str | None, str | None, str]:
    from app.config import settings

    effective_key = (
        api_key
        or (settings.gemini_api_key if provider == "gemini" else None)
        or (settings.groq_api_key if provider == "groq" else None)
        or (settings.openai_api_key if provider == "openai" else None)
        or settings.gemini_api_key
        or settings.groq_api_key
        or settings.openai_api_key
    )

    if not effective_key:
        return None, None, "local_engine"

    eff_provider = (provider or settings.llm_provider or "auto").lower()

    if "gemini" in eff_provider or effective_key.startswith("AIza") or effective_key.startswith("AQ."):
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        if model and model.startswith("gemini"):
            eff_model = model
        elif eff_provider.startswith("gemini-"):
            eff_model = eff_provider
        else:
            eff_model = "gemini-3.5-flash"
        return effective_key, base_url, f"Google Gemini ({eff_model})"

    if eff_provider == "groq" or effective_key.startswith("gsk_"):
        base_url = "https://api.groq.com/openai/v1"
        eff_model = model or "llama-3.3-70b-versatile"
        return effective_key, base_url, f"Groq Llama 3.3 ({eff_model})"

    if eff_provider == "openrouter":
        base_url = "https://openrouter.ai/api/v1"
        eff_model = model or "meta-llama/llama-3.3-70b-instruct:free"
        return effective_key, base_url, f"OpenRouter ({eff_model})"

    # Default OpenAI
    eff_model = model or "gpt-4o-mini"
    return effective_key, None, f"OpenAI ({eff_model})"


def run_llm_agent(
    message: str,
    db: Session,
    user: User,
    history: list[dict] | None = None,
    provider: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> dict:
    import openai

    key, base_url, provider_name = get_llm_client_config(provider, api_key, model)

    if not key:
        local_res = agent_intent_and_tool_dispatcher(message, db, user)
        return {
            "text": local_res["text"],
            "tool_calls": local_res.get("tool_calls", []),
            "provider_used": "Built-in Autonomous Engine (Connect free Gemini/Groq key in Settings for full LLM reasoning)",
            "model_used": "deterministic-agent-v1",
        }

    system_prompt = (
        "You are BillFlow AI Operator, an intelligent, conversational, and expert AI chatbot for the BillFlow Invoicing Platform.\n"
        "You act just like ChatGPT: friendly, knowledgeable, articulate, and deeply versed in every detail of the BillFlow platform.\n\n"
        "--- COMPLETE BILLFLOW SYSTEM KNOWLEDGE BASE ---\n"
        "1. OVERVIEW & PURPOSE:\n"
        "   - BillFlow is a high-speed SaaS invoicing and receivables operations platform for freelancers, creative studios, and agencies.\n"
        "   - Primary goal: eliminate payment friction, automate receivables tracking, and provide transparent client billing.\n\n"
        "2. INVOICING LIFECYCLE & ENGINE (/invoices, /invoices/new, /invoices/[id]):\n"
        "   - Invoice Creation: add multiple line items with descriptions, quantities, and unit rates. Automatic subtotal calculation.\n"
        "   - Financial Adjustments: supports percentage discounts and percentage tax rates. Total = (subtotal - discount) + tax.\n"
        "   - Due Dates & Notes: customizable due dates, custom notes, and payment instructions on each invoice.\n"
        "   - Dynamic Statuses: 'draft', 'sent', 'paid', 'overdue'.\n"
        "   - Auto Overdue Engine: if an invoice is unpaid and the current date exceeds 'due_date', the system dynamically computes its status as 'overdue'.\n"
        "   - Instant Shareable Payment Links (/pay/[token]): every invoice generates a cryptographically secure, public token. Clients do NOT need an account to view or pay their invoice.\n"
        "   - Print & PDF Export: full receipt-style printable layout directly in the invoice view with one click ('Print / Save PDF').\n\n"
        "3. CLIENT MANAGEMENT & FINANCIAL SEGREGATION (/clients):\n"
        "   - Stores client contact information (name, email, company, phone, address).\n"
        "   - Client-Wise Financial Segregation: every client card dynamically tracks lifetime revenue collected, outstanding receivables, and overdue amounts.\n"
        "   - Status tabs to quickly filter clients by billing health.\n\n"
        "4. CLIENT PORTAL & BATCH PAY (/portal):\n"
        "   - A dedicated portal designed for clients who have multiple invoices to pay across freelancers or brands.\n"
        "   - Clients log in with their email address to see their personalized dashboard showing all their pending and paid invoices.\n"
        "   - Batch Payment: clients can select multiple pending invoices using checkboxes and pay them all in a single click.\n\n"
        "5. DASHBOARD & ANALYTICS (/dashboard):\n"
        "   - Real-time studio KPIs: Total Collected Revenue, Pending Receivables, Overdue Balance, and Total Invoices.\n"
        "   - Interactive 6-month monthly revenue trajectory chart.\n"
        "   - Quick action shortcuts and recent invoice stream.\n\n"
        "6. SETTINGS & CUSTOMIZATION (/settings):\n"
        "   - Studio business profile: business name, currency code (USD, EUR, GBP, CAD, AUD, etc.), default tax rate.\n"
        "   - Payment terms and bank / Stripe transfer instructions.\n\n"
        "7. SECURITY & MULTI-TENANCY:\n"
        "   - Strict data isolation: each freelancer/studio only sees their own clients, invoices, and analytics.\n"
        "   - Protected with JWT authentication and bcrypt password hashing.\n\n"
        "--- WORKSPACE DATABASE TOOLS (ONLY WHEN NEEDED) ---\n"
        "You also have access to 6 live tools to inspect or modify the user's workspace database:\n"
        "- `get_clients`: retrieve client directory with collected revenue, pending balance, and overdue amounts.\n"
        "- `get_client_analytics`: deep dive into a specific client's history, overdue invoices, and stats.\n"
        "- `create_client`: register a new client with email, name, and company.\n"
        "- `create_invoice`: create a real invoice with itemized services, tax, discount, and due date.\n"
        "- `get_invoices`: filter and inspect invoices by status or client.\n"
        "- `get_dashboard_summary`: high level business revenue and KPI summary.\n\n"
        "--- CONVERSATIONAL & TOOL CALLING RULES ---\n"
        "1. For questions about BillFlow features, concepts, billing workflows, how-to guides, advice, greetings, or general chat, ALWAYS respond naturally, clearly, and conversationally in Markdown WITHOUT calling any tools. You are a complete knowledge authority on BillFlow!\n"
        "2. ONLY call a database tool when the user asks you to perform an action (e.g. 'create an invoice', 'add client') or inspect real workspace data (e.g. 'who owes me money?', 'show Maya Chen's balance', 'what are my KPIs?').\n"
        "3. Always format your responses using clean GitHub Flavored Markdown with bold text, bullet points, and code styling where helpful."
    )

    client = openai.OpenAI(api_key=key, base_url=base_url)

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for h in history[-8:]:
            if h.get("role") in ["user", "assistant", "system"] and h.get("content"):
                messages.append({"role": h["role"], "content": str(h["content"])})

    messages.append({"role": "user", "content": message})

    executed_tool_calls = []

    try:
        # Extract model name from provider_name or model parameter
        if "(" in provider_name and ")" in provider_name:
            chosen_model = provider_name.split("(")[1].split(")")[0]
        else:
            chosen_model = model or "gemini-3.5-flash"


        response = client.chat.completions.create(
            model=chosen_model,
            messages=messages,
            tools=OPENAI_TOOLS,
            tool_choice="auto",
        )

        choice = response.choices[0]
        assistant_msg = choice.message

        if assistant_msg.tool_calls:
            # Append assistant message with tool calls
            messages.append(assistant_msg)

            for tc in assistant_msg.tool_calls:
                tool_name = tc.function.name
                try:
                    tool_args = json.loads(tc.function.arguments)
                except Exception:
                    tool_args = {}

                result = execute_tool_call(tool_name, tool_args, db, user)
                executed_tool_calls.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": result,
                })

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tool_name,
                    "content": json.dumps(result),
                })

            # Call LLM again to synthesize response with tool results
            second_response = client.chat.completions.create(
                model=chosen_model,
                messages=messages,
            )
            final_text = second_response.choices[0].message.content or "Tool executed successfully."
        else:
            final_text = assistant_msg.content or "I have processed your request."

        return {
            "text": final_text,
            "tool_calls": executed_tool_calls,
            "provider_used": provider_name,
            "model_used": chosen_model,
        }

    except Exception as e:
        # Fallback to local dispatcher on API failure
        local_res = agent_intent_and_tool_dispatcher(message, db, user)
        return {
            "text": f"{local_res['text']}\n\n*(Note: LLM provider returned `{str(e)}`. Executed via local tool dispatcher.)*",
            "tool_calls": local_res.get("tool_calls", []),
            "provider_used": f"Fallback ({str(e)[:40]})",
            "model_used": "local-fallback",
        }

