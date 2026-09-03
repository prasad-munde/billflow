# BillFlow — Modern Invoicing SaaS & Autonomous AI Operator

> **BillFlow** is a modern, multi-tenant B2B SaaS invoicing and receivables operations platform built for freelancers, contractors, and creative studios. It replaces messy spreadsheets and Word templates with elegant invoices, real-time revenue analytics, automated overdue tracking, unguessable public checkout links, a dedicated client portal with batch payments, and an autonomous **ChatGPT-style AI Operator** powered by Google Gemini.

---

##  Live Demo & Demo Credentials

- **Demo Account Email:** `demo@billflow.app`
- **Demo Account Password:** `Demo123!` *(or use the 1-click **Use Demo Login** button on the sign-in page)*
- **Demo Client Portal Email:** `maya@lumencollective.com`
- **Pre-seeded Dataset:** Contains 4 realistic clients (*Maya Chen, David Sterling, Elena Rostova, Marcus Vance*) and active invoices across `paid`, `sent`, `overdue`, and `draft` statuses.

---

##  Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | **Next.js 15 (App Router)**, React 19, TypeScript, Tailwind CSS, Recharts, Heroicons |
| **AI Operator** | **Google Gemini 3.5 Flash** / **Gemini 3.6 Flash** / Groq Llama 3.3 / OpenAI, Function Calling, Custom Markdown Engine |
| **Backend** | **Python 3.12, FastAPI**, SQLAlchemy 2.0 ORM, Pydantic v2, Python-Jose (JWT), Passlib (Bcrypt) |
| **Database** | **PostgreSQL** / SQLite (for zero-config local dev & testing), **Alembic** migrations |
| **Testing** | **Pytest** (14/14 passing tests), TestClient, in-memory SQLite fixtures |
| **Deployment** | Vercel (Frontend) & Render / Railway / Fly.io (Backend & PostgreSQL) |

---

##  Key Features & Capabilities

### 1.  Autonomous AI Operator (`/ai-operator`)
- **ChatGPT-Style Experience**: Full-screen, conversational command center designed like ChatGPT with wide canvas, conversation history persistence in `localStorage`, and prompt starter suggestions.
- **Deep System Knowledge Base**: The AI Operator knows everything about BillFlow (Client Portal, Batch Pay, PDF printing, taxes, discounts, settings, workflow advice).
- **Multi-LLM Provider Engine**:
  - **Google Gemini 3.5 Flash** (Active default) & **Gemini 3.6 Flash / 2.0 Flash**
  - **Groq Llama 3.3 70B** (Ultra-fast inference)
  - **OpenAI GPT-4o / GPT-4o-mini**
  - **Built-in Local Autonomous Engine** (Runs locally with zero external keys)
- **Real Autonomous Database Tool Calling**:
  - `get_clients`: Queries directory with segregated revenue & overdue balances.
  - `get_client_analytics`: Deep-dive audit into a specific client's invoicing history.
  - `create_client`: Registers new clients into the database.
  - `create_invoice`: Generates real itemized invoices with public payment links.
  - `get_invoices`: Inspects and filters invoices by status or client.
  - `get_dashboard_summary`: High-level business KPI diagnostics.
- **Zero Forced Tool Calls**: Conversational greetings (*"hi"*, *"how are you"*) and general questions are answered naturally without executing tools; tools are only dispatched when action or data retrieval is requested.
- **Rich Markdown Rendering**: Custom `MarkdownRenderer` component cleanly parses headings, bold text, bullet lists, and code blocks without raw `#` or `###` symbols.

### 2.  Client-Wise Financial Segregation (`/clients`)
- **Individual Financial Metrics**: Every client card dynamically computes and displays:
  - **Lifetime Collected Revenue**
  - **Pending Receivables**
  - **Overdue Balances**
  - **Total Invoice Count**
- **Status Filter Tabs with Live Counters**: `All`, `Pending`, `Overdue`, and `Settled`.
- **Context-Aware Empty States**: Shows celebratory feedback (e.g. *"Zero Overdue Balances 🎉"*) when filters have 0 records instead of generic onboarding prompts.

### 3.  Dedicated Client Portal & Batch Pay (`/portal`)
- Built specifically for clients who receive invoices across freelancers or brands.
- Clients log in with their email address to see their personalized dashboard showing all their pending, overdue, and paid invoices.
- **Batch Payment**: Clients can select multiple pending invoices using checkboxes and pay them simultaneously in a single transaction.

### 4.  Smart Invoice Builder & AI Drafting (`/invoices/new`)
- Sequential invoice numbering isolated per workspace (`NST-0001`, `NST-0002`, etc.) with customizable studio prefixes.
- Dynamic itemization: add/remove lines with descriptions, quantities, and unit rates.
- Authoritative backend calculations: **Subtotal, Discount %, Tax %, and Net Total Amount**.
- **Dynamic Overdue Detection**: If an invoice is unpaid and past its `due_date`, the system dynamically flags it as **OVERDUE** with visual warning badges.

### 5.  Instant Shareable Payment Links (`/pay/[token]`)
- Each invoice generates a secure, cryptographically unguessable token (`secrets.token_urlsafe(32)`).
- Clients can view, verify, and pay their invoice on desktop or mobile **without creating an account**.
- **Interactive Simulated Checkout**: Pay modal simulates card processing and converts the invoice to `PAID` in real-time.

### 6.  High-Fidelity Print & PDF Export
- Tailored `@media print` stylesheets allow downloading or printing invoices directly from the browser (`Print / Save PDF`) styled like high-end physical receipts without dashboard navigation.

### 7.  Dashboard & Business Analytics (`/dashboard`)
- Real-time KPIs: **Total Collected Revenue, Outstanding Receivables, and Overdue Balances**.
- Interactive monthly revenue chart powered by **Recharts**.
- Quick action shortcuts and recent invoices feed.

### 8.  Studio Branding & Workspace Isolation (`/settings`)
- Configure studio profile, business name, currency picker (`USD $`, `EUR €`, `GBP £`, `CAD $`, `AUD $`, `INR ₹`, `JPY ¥`), default tax rates, and payment instructions.
- Strict multi-tenant isolation: every query is filtered strictly by authenticated user ID with secure JWT tokens and bcrypt password hashing.

---

## 📂 Repository Structure

```
BillFlow/
├── backend/
│   ├── alembic/                  # Database migration definitions
│   │   ├── versions/
│   │   └── env.py
│   ├── app/
│   │   ├── routers/              # Modular API endpoints
│   │   │   ├── ai.py             # LLM chat & tool calling endpoints
│   │   │   ├── auth.py           # Signup, login, and current user
│   │   │   ├── clients.py        # Client CRUD & segregated metrics
│   │   │   ├── dashboard.py      # Studio KPIs & monthly chart data
│   │   │   ├── invoices.py       # Invoice builder, status & filters
│   │   │   ├── public.py         # /pay/[token] & client portal batch pay
│   │   │   └── settings.py       # Studio profile & payment details
│   │   ├── services/
│   │   │   ├── invoice_service.py # Numbering, tax, discount & overdue checks
│   │   │   └── llm_tools.py      # Autonomous tools & OpenAI-compatible agent runner
│   │   ├── auth.py               # JWT tokens & bcrypt password verification
│   │   ├── config.py             # Environment settings (Gemini, Groq, DB)
│   │   ├── database.py           # SQLAlchemy session & engine
│   │   ├── models.py             # User, Client, Invoice, Item models
│   │   ├── schemas.py            # Pydantic v2 validation schemas
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/                    # Pytest automated test suite (14 passing tests)
│   │   ├── test_auth.py
│   │   ├── test_clients.py
│   │   ├── test_invoices.py
│   │   ├── test_isolation.py
│   │   ├── test_public_pay.py
│   │   └── test_settings_and_ai.py
│   ├── seed.py                   # Database seeder with demo accounts & records
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # Sign-in with 1-click demo button
│   │   │   └── signup/page.tsx    # Studio registration
│   │   ├── (dashboard)/
│   │   │   ├── ai-operator/page.tsx # Full ChatGPT-style AI Operator interface
│   │   │   ├── ai-control/page.tsx  # Redirect to /ai-operator
│   │   │   ├── clients/page.tsx   # Client financial segregation & CRUD
│   │   │   ├── dashboard/page.tsx # Analytics & Recharts graph
│   │   │   ├── guide/page.tsx     # Interactive platform documentation
│   │   │   ├── invoices/          # Invoice management, builder & detail views
│   │   │   ├── settings/page.tsx  # Studio profile, currency & branding
│   │   │   └── layout.tsx         # Dashboard layout with left sidebar
│   │   ├── pay/[token]/page.tsx   # Public client payment portal
│   │   ├── portal/page.tsx        # Client portal with multi-invoice batch pay
│   │   ├── page.tsx               # Marketing landing page
│   │   └── globals.css            # Print stylesheet & typography
│   ├── components/
│   │   ├── markdown-renderer.tsx  # Rich Markdown parser (headings, lists, code)
│   │   ├── sidebar.tsx            # Left navigation bar with AI Operator link
│   │   └── toast-container.tsx    # Notification system
│   ├── lib/
│   │   └── api.ts                 # API client, token management & formatters
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

##  Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Google Gemini API Key *(Free tier available at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))*

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment (optional)
python -m venv .venv
# Windows: .venv\Scriptsctivate
# macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (.env)
# DATABASE_URL=sqlite:///./billflow.db
# GEMINI_API_KEY=your_gemini_key_here
# LLM_PROVIDER=gemini-3.5-flash

# Seed database with demo accounts & invoices
python seed.py

# Start FastAPI development server (http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server (http://localhost:3000)
npm run dev
```

### 4. Running the Automated Tests
```bash
cd backend
pytest -v
```
*Current test suite: 14 passed (100%).*

---

##  Production Deployment Guide

### Deploy Backend (Render / Railway / Fly.io)
1. Provision a managed **PostgreSQL database** (e.g. Neon, Supabase, or Render Postgres).
2. Set Environment Variables:
   - `DATABASE_URL`: `postgresql://user:password@host:5432/billflow`
   - `SECRET_KEY`: Random 64-character secret key
   - `FRONTEND_URL`: `https://your-billflow-frontend.vercel.app`
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `LLM_PROVIDER`: `gemini-3.5-flash`
3. Build Command: `pip install -r requirements.txt && python seed.py`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Deploy Frontend (Vercel)
1. Import repository into **Vercel** and select the `frontend` directory.
2. Set Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-api.onrender.com`
3. Deploy!
