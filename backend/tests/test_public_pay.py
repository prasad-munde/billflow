from datetime import date, timedelta

def test_public_invoice_view_and_payment(client, auth_headers):
    # 1. Create client and invoice as authenticated user
    c_res = client.post("/clients", headers=auth_headers, json={
        "name": "Tech Innovations",
        "email": "finance@techinnovations.io",
        "company": "Tech Innovations LLC"
    })
    client_id = c_res.json()["id"]

    inv_res = client.post("/invoices", headers=auth_headers, json={
        "client_id": client_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=14)),
        "tax_rate": 5.0,
        "discount": 0.0,
        "items": [{"description": "Cloud Architecture", "quantity": 10, "rate": 150.0}]
    })
    inv_data = inv_res.json()
    token = inv_data["public_token"]
    assert token is not None

    # 2. Public unauthenticated access to the invoice
    public_res = client.get(f"/public/invoices/{token}")
    assert public_res.status_code == 200
    p_data = public_res.json()
    assert p_data["number"] == inv_data["number"]
    assert p_data["total"] == 1575.0
    assert p_data["status"] == "draft"
    assert "business" in p_data
    assert p_data["business"]["currency"] == "USD"

    # 3. Public unauthenticated simulated payment
    pay_res = client.post(f"/public/invoices/{token}/pay")
    assert pay_res.status_code == 200
    assert pay_res.json()["status"] == "paid"

    # 4. Verify public invoice now shows paid
    updated_public = client.get(f"/public/invoices/{token}").json()
    assert updated_public["status"] == "paid"
    assert updated_public["paid_at"] is not None

    # 5. Verify user's dashboard earned metric updated
    dash_res = client.get("/dashboard", headers=auth_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["earned"] == 1575.0


def test_client_portal_and_batch_pay(client, auth_headers):
    # 1. Create client
    c_res = client.post("/clients", headers=auth_headers, json={
        "name": "Sarah Connor",
        "email": "sarah@cyberdyne.org",
        "company": "Cyberdyne Systems"
    })
    c_id = c_res.json()["id"]

    # 2. Create two invoices for Sarah
    inv1_res = client.post("/invoices", headers=auth_headers, json={
        "client_id": c_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=10)),
        "items": [{"description": "Security Audit", "quantity": 1, "rate": 2000.0}]
    })
    assert inv1_res.status_code == 201
    token1 = inv1_res.json()["public_token"]

    inv2_res = client.post("/invoices", headers=auth_headers, json={
        "client_id": c_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=20)),
        "items": [{"description": "Firewall Setup", "quantity": 1, "rate": 1500.0}]
    })
    assert inv2_res.status_code == 201
    token2 = inv2_res.json()["public_token"]

    # Mark both as sent
    client.post(f"/invoices/{inv1_res.json()['id']}/send", headers=auth_headers)
    client.post(f"/invoices/{inv2_res.json()['id']}/send", headers=auth_headers)


    # 3. Access Portal via email
    portal_email_res = client.get("/public/portal?email=sarah@cyberdyne.org")
    assert portal_email_res.status_code == 200
    p_data = portal_email_res.json()
    assert p_data["client_name"] == "Sarah Connor"
    assert p_data["metrics"]["total_due"] == 3500.0
    assert p_data["metrics"]["unpaid_count"] == 2
    assert len(p_data["invoices"]) == 2

    # 4. Access Portal via token
    portal_token_res = client.get(f"/public/portal?token={token1}")
    assert portal_token_res.status_code == 200
    assert portal_token_res.json()["client_email"] == "sarah@cyberdyne.org"

    # 5. Batch pay both invoices in one go
    batch_res = client.post("/public/portal/batch-pay", json={
        "invoice_tokens": [token1, token2],
        "payment_method": "corporate_card"
    })
    assert batch_res.status_code == 200
    b_data = batch_res.json()
    assert b_data["success"] is True
    assert b_data["paid_count"] == 2
    assert b_data["total_amount"] == 3500.0

    # 6. Verify portal now reflects 0 due, 3500 paid
    updated_portal = client.get("/public/portal?email=sarah@cyberdyne.org").json()
    assert updated_portal["metrics"]["total_due"] == 0.0
    assert updated_portal["metrics"]["total_paid"] == 3500.0
    assert updated_portal["metrics"]["paid_count"] == 2
    assert updated_portal["metrics"]["unpaid_count"] == 0

