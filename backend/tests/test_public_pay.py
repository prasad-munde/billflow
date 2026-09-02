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
