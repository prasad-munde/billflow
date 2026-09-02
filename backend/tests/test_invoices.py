from datetime import date, timedelta

def test_invoice_creation_and_calculation(client, auth_headers):
    # 1. Create client
    c_res = client.post("/clients", headers=auth_headers, json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "company": "Doe Media"
    })
    client_id = c_res.json()["id"]

    # 2. Create invoice: (2 * 500) + (1 * 200) = 1200 subtotal. Discount 200 -> 1000 base. Tax 10% -> 100 tax -> 1100 total.
    inv_res = client.post("/invoices", headers=auth_headers, json={
        "client_id": client_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=14)),
        "discount": 200.0,
        "tax_rate": 10.0,
        "notes": "Test calculation notes",
        "items": [
            {"description": "Web Design", "quantity": 2, "rate": 500.0},
            {"description": "SEO Audit", "quantity": 1, "rate": 200.0}
        ]
    })
    assert inv_res.status_code == 201
    data = inv_res.json()
    assert data["subtotal"] == 1200.0
    assert data["discount"] == 200.0
    assert data["tax_rate"] == 10.0
    assert data["total"] == 1100.0
    assert len(data["items"]) == 2
    assert data["items"][0]["amount"] == 1000.0
    assert data["items"][1]["amount"] == 200.0
    assert data["number"] == "INV-0001"

def test_overdue_dynamic_status(client, auth_headers):
    c_res = client.post("/clients", headers=auth_headers, json={
        "name": "Acme Corp",
        "email": "billing@acme.com"
    })
    client_id = c_res.json()["id"]

    # Create past due invoice
    past_due_date = date.today() - timedelta(days=5)
    inv_res = client.post("/invoices", headers=auth_headers, json={
        "client_id": client_id,
        "issue_date": str(date.today() - timedelta(days=20)),
        "due_date": str(past_due_date),
        "items": [{"description": "Consulting", "quantity": 1, "rate": 1500.0}]
    })
    inv_id = inv_res.json()["id"]
    
    # In draft state, status is draft
    assert inv_res.json()["status"] == "draft"

    # Send invoice -> status becomes overdue because due_date < today
    send_res = client.post(f"/invoices/{inv_id}/send", headers=auth_headers)
    assert send_res.status_code == 200
    assert send_res.json()["status"] == "overdue"

    # Verify get invoice returns overdue
    get_res = client.get(f"/invoices/{inv_id}", headers=auth_headers)
    assert get_res.json()["status"] == "overdue"

def test_server_side_filtering_and_search(client, auth_headers):
    c1 = client.post("/clients", headers=auth_headers, json={"name": "Alpha Client", "email": "alpha@test.com"}).json()
    c2 = client.post("/clients", headers=auth_headers, json={"name": "Beta Client", "email": "beta@test.com"}).json()

    # Create invoice 1 for Alpha
    client.post("/invoices", headers=auth_headers, json={
        "client_id": c1["id"],
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=7)),
        "items": [{"description": "Alpha Work", "quantity": 1, "rate": 1000.0}]
    })

    # Create invoice 2 for Beta
    client.post("/invoices", headers=auth_headers, json={
        "client_id": c2["id"],
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=14)),
        "items": [{"description": "Beta Work", "quantity": 1, "rate": 2500.0}]
    })

    # Search by client name
    search_alpha = client.get("/invoices?q=Alpha", headers=auth_headers).json()
    assert len(search_alpha) == 1
    assert search_alpha[0]["client"]["name"] == "Alpha Client"

    # Filter by client_id
    filter_beta = client.get(f"/invoices?client_id={c2['id']}", headers=auth_headers).json()
    assert len(filter_beta) == 1
    assert filter_beta[0]["client"]["name"] == "Beta Client"

    # Sort by amount desc
    sort_res = client.get("/invoices?sort=amount_desc", headers=auth_headers).json()
    assert len(sort_res) == 2
    assert sort_res[0]["total"] >= sort_res[1]["total"]
