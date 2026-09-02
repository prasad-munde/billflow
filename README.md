# BillFlow — Modern Invoicing SaaS for Freelancers & Studios

> **BillFlow** is a full-featured, multi-tenant B2B SaaS invoicing platform built for freelancers, contractors, and boutique creative studios. It replaces spreadsheet billing and Word documents with elegant invoices, real-time revenue tracking, automated overdue status derivation, unguessable public payment links, and simulated client checkout without requiring client account creation.

---

## 🚀 Live Demo & Demo Credentials

- **Demo Account Email:** `demo@billflow.app`
- **Demo Account Password:** `Demo123!` *(or use the 1-click **Use Demo Login** button on the sign-in page)*
- **Pre-seeded Data:** Contains 4 realistic clients (*Maya Chen, David Sterling, Elena Rostova, Marcus Vance*) and 6 invoices across `paid`, `sent`, `overdue`, and `draft` statuses.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | **Next.js 15 (App Router)**, React 19, TypeScript, Tailwind CSS, Recharts, Heroicons |
| **Backend** | **Python 3.12, FastAPI**, SQLAlchemy 2.0 ORM, Pydantic v2, Python-Jose (JWT), Passlib (Bcrypt) |
| **Database** | **PostgreSQL** / SQLite (for fast testing), **Alembic** migrations |
| **Testing** | **Pytest**, TestClient, Isolated in-memory SQLite fixtures |
| **Hosting** | Vercel (Frontend) & Render / Railway / Fly.io (Backend & PostgreSQL) |

---

## ✨ Key Features & SaaS Capabilities

### 1. Multi-Tenant User Isolation & Authentication
- Secure JWT bearer token authentication with bcrypt password hashing (`/auth/signup`, `/auth/login`, `/auth/me`).
- Strict tenant isolation: every client, invoice, line item, and studio setting query filters strictly by `current_user.id`.

### 2. Client Management
- Manage clients with full contact profiles: **Full Name, Email, Company Name, Billing Address, and Phone Number**.
- Client search, edit modal, delete confirmation modal, and loading skeletons.

### 3. Smart Invoice Builder & AI Assistant
- Sequential invoice numbering isolated per user (`INV-0001`, `INV-0002`, etc.) with customizable prefixes.
- Dynamic line items (add/remove, description, quantity, unit rate, calculated line total).
- Authoritative backend calculations: **Subtotal, Discount, Tax %, and Total Amount**.
- **"Draft with AI" Assistant (`/ai/draft-invoice`)**: Converts natural language prompts (e.g. *"Invoice Acme for 20 hours of UI design at $100/hr and brand guide for $800"*) directly into structured line items.

### 4. Server-Side Filtering, Searching & Sorting
- Dynamic query parameter filtering on `GET /invoices`:
  - `q`: Search by client name, client company, or invoice number
  - `status`: Filter by `draft`, `sent`, `paid`, `overdue`
  - `client_id`: Filter by specific client
  - `sort`: Sort by `newest`, `oldest`, `due`, `amount_desc`, `amount_asc`, `number`

### 5. Automatic Overdue Detection
- Invoices past their due date automatically display with an **OVERDUE** badge across the dashboard, invoice list, and client view without requiring cron jobs or manual intervention.

### 6. Public Client Payment Portal (`/pay/[token]`)
- Cryptographically secure unguessable tokens (`secrets.token_urlsafe(32)`).
- Clients can open their invoice on desktop or mobile **without creating an account**.
- **Interactive Test-Mode Payment Simulation**: Clicking "Pay Invoice" opens a simulated checkout modal with test card details. Confirming payment hits `POST /public/invoices/{token}/pay` and immediately converts the invoice to `PAID` with receipt confirmation.

### 7. Print to PDF Export
- Tailored `@media print` stylesheets ensure invoices print cleanly to PDF without dashboard navigation or interface elements.

### 8. Studio Branding & Logo Upload
- Business name configuration, default currency picker (`USD $`, `EUR €`, `GBP £`, `CAD $`, `AUD $`, `INR ₹`, `JPY ¥`, `CHF Fr`), custom invoice prefixes, and multipart logo image upload.

### 9. Analytics & Real-Time Dashboard
- Real-time revenue metrics: **Collected Revenue, Outstanding Receivables, and Overdue Amount**.
- Monthly income visualization using **Recharts**.
- Quick action shortcuts and recent invoices list.

---

## 📁 Repository Structure

```
BillFlow/
├── backend/
│   ├── alembic/              # Database migration definitions
│   │   ├── versions/
│   │   └── env.py
│   ├── app/
│   │   ├── routers/          # Modular API endpoints
│   │   │   ├── auth.py
│   │   │   ├── clients.py
│   │   │   ├── invoices.py
│   │   │   ├── public.py
│   │   │   ├── dashboard.py
│   │   │   ├── settings.py
│   │   │   └── ai.py
│   │   ├── services/
│   │   │   └── invoice_service.py # Calculations, overdue detection, numbering
│   │   ├── models.py         # SQLAlchemy 2.0 ORM models
│   │   ├── schemas.py        # Pydantic v2 validation schemas
│   │   ├── auth.py           # JWT creation & current_user dependency
│   │   ├── database.py       # Engine & SessionLocal
│   │   └── main.py           # FastAPI application entry point
│   ├── tests/                # Pytest automated test suite (13 passing tests)
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_clients.py
│   │   ├── test_invoices.py
│   │   ├── test_isolation.py
│   │   ├── test_public_pay.py
│   │   └── test_settings_and_ai.py
│   ├── seed.py               # Database seeder with demo account & records
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx   # Login page with 1-click demo button
│   │   │   └── signup/page.tsx  # Registration page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx # Analytics & Recharts graph
│   │   │   ├── clients/page.tsx   # Client CRUD & search
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx       # Filterable invoice list
│   │   │   │   ├── new/page.tsx   # Invoice builder with AI assistant
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx   # Invoice detail, print PDF & send
│   │   │   │       └── edit/page.tsx # Invoice editor
│   │   │   ├── settings/page.tsx  # Branding, logo & currency
│   │   │   └── layout.tsx         # Dashboard sidebar layout
│   │   ├── pay/[token]/page.tsx   # Public client payment portal
│   │   ├── layout.tsx             # Root layout & Toast container
│   │   ├── page.tsx               # Marketing landing page
│   │   └── globals.css            # Print media & custom styling
│   ├── components/
│   │   ├── sidebar.tsx            # Responsive navigation & user info
│   │   └── toast-container.tsx    # Global animated notification bus
│   ├── lib/
│   │   └── api.ts                 # API client, currency & date formatters
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## 🏃 Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL (or SQLite for local zero-config development)

### 2. Backend Setup
```bash
cd backend

# Create virtual environment (optional)
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations & seed demo dataset
python seed.py

# Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

### 4. Running the Automated Tests
```bash
cd backend
pytest -v
```

---

## 🌐 Production Deployment Guide

### Deploy Backend (Render / Railway / Fly.io)
1. Provision a managed **PostgreSQL database** (e.g. Neon, Supabase, or Render Postgres).
2. Set Environment Variables:
   - `DATABASE_URL`: `postgresql://user:password@host:5432/billflow`
   - `SECRET_KEY`: Long random 64-character secret key
   - `FRONTEND_URL`: `https://your-billflow-frontend.vercel.app`
3. Build Command: `pip install -r requirements.txt && python seed.py`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Deploy Frontend (Vercel)
1. Import the repository into **Vercel** and select the `frontend` root directory.
2. Set Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-api.onrender.com`
3. Deploy!

---

## 📄 License
MIT License. Built for the Full Stack SaaS Assessment.

