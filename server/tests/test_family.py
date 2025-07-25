import json
import psycopg2
from utils.db_utils import get_db_connection


def seed_family_and_user():
    """
    Seed a test family and an admin user directly into the database
    for testing family routes.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insert test family
    cursor.execute("""
        INSERT INTO families (family_name, email, password_hash, created_at)
        VALUES ('TestFamily', 'family@test.com', 'hash', NOW())
        RETURNING id
    """)
    family_id = cursor.fetchone()[0]
    
    # Insert test admin user
    cursor.execute("""
        INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
        VALUES (%s, 'admin', 'Admin', '👑', '#6c5ce7', 'admin', NOW())
        RETURNING id
    """, (family_id,))
    user_id = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    
    return family_id, user_id


# ---------------------------
# GET PROFILES TESTS
# ---------------------------

def test_get_family_profiles_success(client, auth_token):
    family_id, user_id = seed_family_and_user()

    response = client.get(
        "/api/family/profiles",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()
    
    # Expecting at least one profile (the admin user we seeded)
    assert response.status_code == 200
    assert isinstance(data, list)
    assert data[0]["username"] == "admin"
    assert "healthScore" in data[0]


def test_get_family_profiles_no_token(client):
    response = client.get("/api/family/profiles")
    assert response.status_code == 401


# ---------------------------
# CREATE PROFILE TESTS
# ---------------------------

def test_create_family_profile_success(client, auth_token):
    family_id, user_id = seed_family_and_user()
    
    response = client.post(
        "/api/family/profiles",
        data=json.dumps({
            "name": "John",
            "avatar": "😀",
            "color": "#ff0000"
        }),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert data["profile"]["name"] == "John"


def test_create_family_profile_missing_name(client, auth_token):
    seed_family_and_user()
    
    response = client.post(
        "/api/family/profiles",
        data=json.dumps({"name": ""}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 400
    assert "Name is required" in response.get_json()["error"]


def test_create_family_profile_duplicate_name(client, auth_token):
    family_id, user_id = seed_family_and_user()
    
    # Create first user "Alex"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
        VALUES (%s, 'alex', 'Alex', '😀', '#123456', 'user', NOW())
    """, (family_id,))
    conn.commit()
    conn.close()
    
    # Attempt to create duplicate name
    response = client.post(
        "/api/family/profiles",
        data=json.dumps({"name": "Alex"}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 400
    assert "already exists" in response.get_json()["error"]


# ---------------------------
# UPDATE PROFILE TESTS
# ---------------------------

def test_update_family_profile_success(client, auth_token):
    family_id, user_id = seed_family_and_user()
    
    response = client.put(
        f"/api/family/profiles/{user_id}",
        data=json.dumps({"name": "UpdatedAdmin"}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()
    
    assert response.status_code == 200
    assert data["success"] is True
    assert data["profile"]["name"] == "UpdatedAdmin"


def test_update_family_profile_not_found(client, auth_token):
    seed_family_and_user()
    response = client.put(
        "/api/family/profiles/999",
        data=json.dumps({"name": "NewName"}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404


# ---------------------------
# DELETE PROFILE TESTS
# ---------------------------

def test_delete_family_profile_success(client, auth_token):
    family_id, user_id = seed_family_and_user()
    
    # Add a non-admin user to delete
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
        VALUES (%s, 'john', 'John', '😀', '#000', 'user', NOW())
        RETURNING id
    """, (family_id,))
    delete_user_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    
    response = client.delete(
        f"/api/family/profiles/{delete_user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()
    
    assert response.status_code == 200
    assert "deleted successfully" in data["message"]


def test_delete_family_profile_only_admin_blocked(client, auth_token):
    family_id, user_id = seed_family_and_user()
    
    # Attempt to delete the only admin
    response = client.delete(
        f"/api/family/profiles/{user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 400
    assert "Cannot delete the only admin user" in response.get_json()["error"]
