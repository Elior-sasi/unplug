from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health_reports_unconfigured_adapter():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["adapterReady"] is False
    assert response.headers["cache-control"].startswith("no-store")

def test_connection_fails_closed():
    response = client.get("/api/mova/connection")
    assert response.status_code == 503
    assert response.json()["connected"] is False
    assert response.json()["capabilities"] == []

def test_credentials_cannot_be_submitted_to_placeholder():
    response = client.post("/api/mova/connection", json={"username": "example", "password": "not-a-real-password"})
    assert response.status_code == 503
    assert "password" not in response.text

def test_commands_are_disabled():
    response = client.post("/api/mova/devices/123/commands", json={"action": "start"})
    assert response.status_code == 503
    assert response.json()["errorCode"] == "MOVA_COMMANDS_DISABLED"
