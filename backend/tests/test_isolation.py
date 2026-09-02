def test_multi_user_data_isolation(client):
    # Register User A
    res_a = client.post("/auth/signup", json={"email": "user_a@example.com", "password": "PasswordA123!"})
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # Register User B
    res_b = client.post("/auth/signup", json={"email": "user_b@example.com", "password": "PasswordB123!"})
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # User A creates a client
    client_a_res = client.post("/clients", headers=headers_a, json={
        "name": "Client Alpha",
        "email": "alpha@client.com",
        "company": "Alpha Inc",
        "address": "123 Alpha Way",
        "phone": "555-0100"
    })
    assert client_a_res.status_code == 201
    client_a_id = client_a_res.json()["id"]

    # User A creates an invoice for Client Alpha
    inv_a_res = client.post("/invoices", headers=headers_a, json={
        "client_id": client_a_id,
        "issue_date": "2026-09-01",
        "due_date": "2026-09-15",
        "notes": "Confidential User A invoice",
        "tax_rate": 10,
        "discount": 50,
        "items": [{"description": "Service A", "quantity": 2, "rate": 500}]
    })
    assert inv_a_res.status_code == 201
    inv_a_id = inv_a_res.json()["id"]

    # User B tries to view User A's client -> 404
    assert client.get(f"/clients/{client_a_id}", headers=headers_b).status_code == 404

    # User B tries to edit User A's client -> 404
    assert client.put(f"/clients/{client_a_id}", headers=headers_b, json={"name": "Hacked Name"}).status_code == 404

    # User B tries to delete User A's client -> 404
    assert client.delete(f"/clients/{client_a_id}", headers=headers_b).status_code == 404

    # User B tries to view User A's invoice -> 404
    assert client.get(f"/invoices/{inv_a_id}", headers=headers_b).status_code == 404

    # User B tries to edit User A's invoice -> 404
    assert client.put(f"/invoices/{inv_a_id}", headers=headers_b, json={"notes": "Hacked note"}).status_code == 404

    # User B tries to delete User A's invoice -> 404
    assert client.delete(f"/invoices/{inv_a_id}", headers=headers_b).status_code == 404

    # User B tries to create an invoice using User A's client_id -> 404
    hack_inv_res = client.post("/invoices", headers=headers_b, json={
        "client_id": client_a_id,
        "issue_date": "2026-09-01",
        "due_date": "2026-09-15",
        "items": [{"description": "Unauthorized Item", "quantity": 1, "rate": 100}]
    })
    assert hack_inv_res.status_code == 404

    # User B list invoices returns empty list
    list_b = client.get("/invoices", headers=headers_b).json()
    assert len(list_b) == 0

    # User A list invoices returns 1
    list_a = client.get("/invoices", headers=headers_a).json()
    assert len(list_a) == 1
    assert list_a[0]["id"] == inv_a_id
