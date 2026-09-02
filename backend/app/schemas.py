from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AuthPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ClientBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    company: str | None = None
    address: str | None = None
    phone: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    company: str | None = None
    address: str | None = None
    phone: str | None = None


class ClientOut(ClientBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    total_billed: float = 0.0
    total_paid: float = 0.0
    total_overdue: float = 0.0
    total_outstanding: float = 0.0
    invoices_count: int = 0
    overdue_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ItemInput(BaseModel):
    description: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    rate: float = Field(ge=0)


class ItemOut(BaseModel):
    id: int
    description: str
    quantity: float
    rate: float
    amount: float

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    client_id: int
    issue_date: date
    due_date: date
    notes: str | None = None
    tax_rate: float = Field(default=0.0, ge=0)
    discount: float = Field(default=0.0, ge=0)
    items: list[ItemInput] = Field(min_length=1)


class InvoiceUpdate(BaseModel):
    client_id: int | None = None
    issue_date: date | None = None
    due_date: date | None = None
    notes: str | None = None
    tax_rate: float | None = Field(default=None, ge=0)
    discount: float | None = Field(default=None, ge=0)
    status: str | None = None
    items: list[ItemInput] | None = None


class InvoiceOut(BaseModel):
    id: int
    number: str
    status: str
    issue_date: date
    due_date: date
    notes: str | None = None
    tax_rate: float
    discount: float
    subtotal: float
    total: float
    public_token: str
    paid_at: datetime | None = None
    created_at: datetime | None = None
    client: ClientOut
    items: list[ItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class SettingsIn(BaseModel):
    business_name: str = Field(min_length=1)
    logo_url: str | None = None
    currency: str = Field(default="USD", min_length=1, max_length=10)
    invoice_prefix: str = Field(default="INV", min_length=1, max_length=20)


class SettingsOut(BaseModel):
    business_name: str
    logo_url: str | None = None
    currency: str
    invoice_prefix: str

    model_config = ConfigDict(from_attributes=True)


class PublicInvoiceOut(InvoiceOut):
    business: SettingsOut


class PayResult(BaseModel):
    status: str
    message: str | None = "Payment processed successfully"


class IncomeMonth(BaseModel):
    month: str
    income: float


class DashboardStats(BaseModel):
    earned: float
    outstanding: float
    overdue: float
    recent: list[InvoiceOut]
    income: list[IncomeMonth]
    counts: dict[str, int]


class AIDraftRequest(BaseModel):
    prompt: str = Field(min_length=3)


class AIDraftResponse(BaseModel):
    client_name: str | None = None
    notes: str | None = None
    items: list[ItemInput]


class ClientPortalInvoice(BaseModel):
    id: int
    number: str
    issue_date: date
    due_date: date
    status: str
    tax_rate: float
    discount: float
    subtotal: float
    total: float
    notes: str | None = None
    public_token: str
    paid_at: datetime | None = None
    created_at: datetime
    items: list[ItemOut]
    business_name: str
    business_logo: str | None = None
    currency: str

    model_config = ConfigDict(from_attributes=True)


class ClientPortalMetrics(BaseModel):
    total_due: float
    total_paid: float
    unpaid_count: int
    paid_count: int
    brands_count: int


class ClientPortalResponse(BaseModel):
    client_name: str
    client_email: str
    client_company: str | None = None
    metrics: ClientPortalMetrics
    brands: list[str]
    invoices: list[ClientPortalInvoice]


class BatchPayRequest(BaseModel):
    invoice_tokens: list[str] = Field(min_length=1)
    payment_method: str = "simulated_card"


class BatchPayResponse(BaseModel):
    success: bool
    paid_count: int
    total_amount: float
    updated_tokens: list[str]
    message: str


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1)


class AIToolCall(BaseModel):
    tool: str
    args: dict = Field(default_factory=dict)
    result: Any = None


class AIChatResponse(BaseModel):
    text: str
    tool_calls: list[AIToolCall] = Field(default_factory=list)


