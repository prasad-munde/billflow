import re
from fastapi import APIRouter, Depends
from app.auth import current_user
from app.models import User
from app.schemas import AIDraftRequest, AIDraftResponse, ItemInput

router = APIRouter(prefix="/ai", tags=["ai"])

def parse_prompt_heuristic(prompt: str) -> AIDraftResponse:
    items: list[ItemInput] = []
    client_name = None

    client_match = re.search(r'(?:for|to|client:\s*)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+(?:for|with|at|regarding|items|\$|₹|€|£|\d)|\.|$|,)', prompt, re.IGNORECASE)
    if client_match:
        client_name = client_match.group(1).strip()

    item_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:x|units?|hrs?|hours?)?\s+(?:of\s+)?(.+?)\s+(?:at|for|@)\s*[\$₹€£]?\s*(\d+(?:,\d+)*(?:\.\d+)?)',
        r'(.+?)\s+(?:for|at|priced\s+at)\s+[\$₹€£]?\s*(\d+(?:,\d+)*(?:\.\d+)?)',
    ]

    for part in re.split(r'[,;\n]|(?:\band\b)', prompt):
        cleaned_part = part.strip()
        if not cleaned_part:
            continue
        
        matched = False
        m1 = re.search(item_patterns[0], cleaned_part, re.IGNORECASE)
        if m1:
            qty = float(m1.group(1))
            desc = m1.group(2).strip()
            desc = re.sub(r'^(?:for|to|with|and)\s+', '', desc, flags=re.IGNORECASE).strip()
            rate = float(m1.group(3).replace(',', ''))
            if desc and rate > 0:
                items.append(ItemInput(description=desc.capitalize(), quantity=qty, rate=rate))
                matched = True

        if not matched:
            m2 = re.search(item_patterns[1], cleaned_part, re.IGNORECASE)
            if m2:
                desc = m2.group(1).strip()
                desc = re.sub(r'^(?:create\s+invoice\s+for\s+[a-zA-Z\s]+\s+for|invoice\s+[a-zA-Z\s]+\s+for|for|to|with|and)\s+', '', desc, flags=re.IGNORECASE).strip()
                rate = float(m2.group(2).replace(',', ''))
                if desc and rate > 0 and not desc.lower().startswith('due'):
                    items.append(ItemInput(description=desc.capitalize(), quantity=1.0, rate=rate))
                    matched = True

    if not items:
        items.append(ItemInput(description="Creative & consulting services", quantity=1.0, rate=1000.0))

    return AIDraftResponse(
        client_name=client_name,
        notes="Generated with BillFlow AI Assistant. Thank you for your business!",
        items=items
    )

@router.post("/draft-invoice", response_model=AIDraftResponse)
def draft_invoice_from_ai(payload: AIDraftRequest, user: User = Depends(current_user)):
    return parse_prompt_heuristic(payload.prompt)

