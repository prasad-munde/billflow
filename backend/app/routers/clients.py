from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth import current_user
from app.database import get_db
from app.models import Client, User
from app.schemas import ClientCreate, ClientOut, ClientUpdate
from app.services.invoice_service import get_effective_status, serialize_client

router = APIRouter(prefix="/clients", tags=["clients"])

def enrich_client_with_metrics(client: Client) -> ClientOut:
    total_billed = 0.0
    total_paid = 0.0
    total_overdue = 0.0
    total_outstanding = 0.0
    invoices_count = len(client.invoices)
    overdue_count = 0

    for inv in client.invoices:
        eff_status = get_effective_status(inv)
        inv_total = float(inv.total or 0.0)
        total_billed += inv_total
        if eff_status == "paid":
            total_paid += inv_total
        else:
            total_outstanding += inv_total
            if eff_status == "overdue":
                total_overdue += inv_total
                overdue_count += 1

    return ClientOut(
        id=client.id,
        name=client.name,
        email=client.email,
        company=client.company,
        address=client.address,
        phone=client.phone,
        created_at=client.created_at,
        updated_at=client.updated_at,
        total_billed=round(total_billed, 2),
        total_paid=round(total_paid, 2),
        total_overdue=round(total_overdue, 2),
        total_outstanding=round(total_outstanding, 2),
        invoices_count=invoices_count,
        overdue_count=overdue_count,
    )

@router.get("", response_model=list[ClientOut])
def list_clients(db: Session = Depends(get_db), user: User = Depends(current_user)):
    clients = db.query(Client).filter(Client.user_id == user.id).order_by(Client.name.asc()).all()
    return [enrich_client_with_metrics(c) for c in clients]

@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = Client(
        user_id=user.id,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        company=payload.company.strip() if payload.company else None,
        address=payload.address.strip() if payload.address else None,
        phone=payload.phone.strip() if payload.phone else None,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return enrich_client_with_metrics(client)

@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    return enrich_client_with_metrics(client)

@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, payload: ClientUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if isinstance(value, str):
                value = value.strip()
                if field == "email":
                    value = value.lower()
            setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    return enrich_client_with_metrics(client)

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
    db.delete(client)
    db.commit()
    return None

