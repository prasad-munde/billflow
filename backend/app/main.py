from pathlib import Path
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.auth import current_user
from app.config import settings
from app.database import Base, engine
from app.models import User
from app.routers import ai, auth, clients, dashboard, invoices, public, settings as settings_router
from app.schemas import UserOut

# Create tables in dev/test SQLite fallback (production uses Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BillFlow API",
    description="Production-grade SaaS Invoicing Backend API for Freelancers & Small Studios",
    version="1.0.0",
)

origins = [
    settings.frontend_url,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://billflow.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Mount modular routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(invoices.router)
app.include_router(public.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)
app.include_router(ai.router)


@app.get("/", tags=["system"])
@app.get("/health", tags=["system"])
def health():
    return {"status": "healthy", "service": "BillFlow API", "version": "1.0.0"}



@app.get("/me", response_model=UserOut, tags=["auth"])
def me(user: User = Depends(current_user)):
    return user

