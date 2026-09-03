import io


def test_settings_and_ai_draft(client, auth_headers):
    # 1. Get settings
    s_res = client.get("/settings", headers=auth_headers)
    assert s_res.status_code == 200
    s_data = s_res.json()
    assert "business_name" in s_data
    assert "invoice_prefix" in s_data

    # 2. Update settings
    put_res = client.put(
        "/settings",
        headers=auth_headers,
        json={
            "business_name": "Apex Visuals Inc",
            "currency": "EUR",
            "invoice_prefix": "APX",
        },
    )
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["business_name"] == "Apex Visuals Inc"
    assert updated_data["currency"] == "EUR"
    assert updated_data["invoice_prefix"] == "APX"

    # 3. Logo upload simulation
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01")
    upload_res = client.post(
        "/settings/logo",
        headers=auth_headers,
        files={"file": ("test_logo.png", fake_png, "image/png")},
    )
    assert upload_res.status_code == 200
    assert "logo_url" in upload_res.json()
    assert upload_res.json()["logo_url"].startswith("/uploads/")

    # 4. AI Draft Invoice endpoint
    ai_res = client.post(
        "/ai/draft-invoice",
        headers=auth_headers,
        json={"prompt": "Invoice Maya Chen for 20 hours of UI design at 120/hr and brand guide for 800"},
    )
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert len(ai_data["items"]) >= 1
    assert any("design" in it["description"].lower() or "brand" in it["description"].lower() for it in ai_data["items"])

    # 5. AI Tools Registry endpoint
    tools_res = client.get("/ai/tools")
    assert tools_res.status_code == 200
    tools_list = tools_res.json()["tools"]
    tool_names = [t["name"] for t in tools_list]
    assert "get_clients" in tool_names
    assert "get_client_analytics" in tool_names
    assert "create_client" in tool_names
    assert "create_invoice" in tool_names

    # 6. AI Chat Tool Calling test (Query overview)
    chat_res = client.post(
        "/ai/chat",
        headers=auth_headers,
        json={"message": "Give me a summary of my business metrics"},
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "text" in chat_data
    assert len(chat_data["tool_calls"]) >= 1
    assert chat_data["tool_calls"][0]["tool"] == "get_dashboard_summary"

