import json
from unittest.mock import patch, MagicMock
from flask_jwt_extended import create_access_token
from utils.db_utils import get_db_connection


# ---------- Registration Tests ----------

def test_register_success(client):
    """Test successful registration."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    # Email does not exist, user is created
    mock_cursor.fetchone.side_effect = [None, None, {"id": 1, "username": "admin"}]
    mock_conn.cursor.return_value = mock_cursor

    with patch("utils.db_utils.get_db_connection", return_value=mock_conn):
        response = client.post(
            "/api/auth/register",
            data=json.dumps({
                "email": "test@example.com",
                "password": "password123",
                "familyName": "TestFamily"
            }),
            content_type="application/json"
        )
        data = response.get_json()
        assert response.status_code == 200
        assert data["success"] is True
        assert "token" in data


def test_register_existing_email(client):
    """Test registration when email already exists."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {"id": 1}  # Email exists
    mock_conn.cursor.return_value = mock_cursor

    with patch("utils.db_utils.get_db_connection", return_value=mock_conn):
        response = client.post(
            "/api/auth/register",
            data=json.dumps({
                "email": "test@example.com",
                "password": "password123",
                "familyName": "TestFamily"
            }),
            content_type="application/json"
        )
        data = response.get_json()
        assert response.status_code == 400
        assert "Email already registered" in data["error"]


def test_register_invalid_email(client):
    """Test registration with invalid email format."""
    response = client.post(
        "/api/auth/register",
        data=json.dumps({
            "email": "invalidemail",
            "password": "password123",
            "familyName": "TestFamily"
        }),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "valid email" in response.get_json()["error"]


def test_register_missing_fields(client):
    """Test registration with missing required fields."""
    response = client.post(
        "/api/auth/register",
        data=json.dumps({"email": "", "password": "", "familyName": ""}),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "All fields are required" in response.get_json()["error"]


# ---------- Login Tests ----------

def test_login_success(client):
    """Test successful login."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    hashed = "$2b$12$123456789012345678901uPziiUNr3CqAxxqf5gDZlfUL4IM88k."  # Fake bcrypt hash
    mock_cursor.fetchone.return_value = {
        "id": 1, "family_name": "TestFamily",
        "email": "test@example.com",
        "password_hash": hashed
    }
    mock_conn.cursor.return_value = mock_cursor

    with patch("utils.db_utils.get_db_connection", return_value=mock_conn):
        with patch("bcrypt.checkpw", return_value=True):
            response = client.post(
                "/api/auth/login",
                data=json.dumps({"email": "test@example.com", "password": "password123"}),
                content_type="application/json"
            )
            data = response.get_json()
            assert response.status_code == 200
            assert data["success"] is True
            assert "token" in data


def test_login_invalid_password(client):
    """Test login with invalid password."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": 1, "family_name": "TestFamily",
        "email": "test@example.com", "password_hash": "wronghash"
    }
    mock_conn.cursor.return_value = mock_cursor

    with patch("utils.db_utils.get_db_connection", return_value=mock_conn):
        with patch("bcrypt.checkpw", return_value=False):
            response = client.post(
                "/api/auth/login",
                data=json.dumps({"email": "test@example.com", "password": "wrongpass"}),
                content_type="application/json"
            )
            assert response.status_code == 401
            assert "Invalid email or password" in response.get_json()["error"]


def test_login_missing_fields(client):
    """Test login with missing fields."""
    response = client.post(
        "/api/auth/login",
        data=json.dumps({"email": "", "password": ""}),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "required" in response.get_json()["error"]


# ---------- Verify Token Tests ----------

def test_verify_token_success(client):
    """Test token verification with valid token."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {
        "id": 1, "family_name": "TestFamily", "email": "test@example.com"
    }
    mock_conn.cursor.return_value = mock_cursor

    token = create_access_token(identity="1")

    with patch("utils.db_utils.get_db_connection", return_value=mock_conn):
        response = client.get(
            "/api/auth/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.get_json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["user"]["familyName"] == "TestFamily"


def test_verify_token_invalid(client):
    """Test verify token with no token."""
    response = client.get("/api/auth/verify")
    assert response.status_code == 401


# ---------- Logout Tests ----------

def test_logout(client):
    """Test logout endpoint."""
    token = create_access_token(identity="1")
    response = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    data = response.get_json()
    assert response.status_code == 200
    assert data["success"] is True
