def test_client_crud(client, auth_headers):
    # 1. Create client
    create_res = client.post(
        "/clients",
        headers=auth_headers,
        json={
            "name": "Sophie Martin",
            "email": "sophie@atelier.com",
            "company": "Atelier Studio",
            "address": "42 Rue de Rivoli, Paris",
            "phone": "+33 1 23 45 67 89",
        },
    )
    assert create_res.status_code == 201
    c = create_res.json()
    assert c["name"] == "Sophie Martin"
    assert c["company"] == "Atelier Studio"
    client_id = c["id"]

    # 2. Get client by id
    get_res = client.get(f"/clients/{client_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["email"] == "sophie@atelier.com"

    # 3. Update client
    update_res = client.put(
        f"/clients/{client_id}",
        headers=auth_headers,
        json={
            "name": "Sophie Martin-Dupont",
            "company": "Atelier Studio Paris",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Sophie Martin-Dupont"
    assert update_res.json()["company"] == "Atelier Studio Paris"

    # 4. List clients
    list_res = client.get("/clients", headers=auth_headers)
    assert list_res.status_code == 200
    assert any(x["id"] == client_id for x in list_res.json())

    # 5. Delete client
    del_res = client.delete(f"/clients/{client_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # 6. Verify deleted
    get_after = client.get(f"/clients/{client_id}", headers=auth_headers)
    assert get_after.status_code == 404
