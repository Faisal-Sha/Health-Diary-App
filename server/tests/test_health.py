# tests/test_health.py
def test_health_check(client):
    response = client.get("/api/health")
    data = response.get_json()

    assert response.status_code == 200
    assert "status" in data
    assert data["status"] == "healthy"
