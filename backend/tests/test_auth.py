def test_signup_success(client):
    res = client.post("/auth/signup", json={"email": "alice@example.com", "password": "SecurePass123!"})
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_signup_duplicate_email(client):
    client.post("/auth/signup", json={"email": "alice@example.com", "password": "SecurePass123!"})
    res = client.post("/auth/signup", json={"email": "alice@example.com", "password": "AnotherPass123!"})
    assert res.status_code == 409

def test_login_success(client):
    client.post("/auth/signup", json={"email": "bob@example.com", "password": "SecurePass123!"})
    res = client.post("/auth/login", json={"email": "bob@example.com", "password": "SecurePass123!"})
    assert res.status_code == 200
    assert "access_token" in res.json()

def test_login_wrong_password(client):
    client.post("/auth/signup", json={"email": "bob@example.com", "password": "SecurePass123!"})
    res = client.post("/auth/login", json={"email": "bob@example.com", "password": "WrongPassword!"})
    assert res.status_code == 401

def test_get_me_authenticated(client, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "tester@billflow.app"

def test_get_me_unauthenticated(client):
    res = client.get("/auth/me")
    assert res.status_code == 401
