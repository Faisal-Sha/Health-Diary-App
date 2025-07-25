import json
from unittest.mock import patch
from utils.db_utils import get_db_connection


def seed_family_user_for_entries():
    """Seed a family and user for entry tests."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert family
    cursor.execute("""
        INSERT INTO families (family_name, email, password_hash, created_at)
        VALUES ('EntryFamily', 'entry@test.com', 'hash', NOW())
        RETURNING id
    """)
    family_id = cursor.fetchone()['id']

    # Insert user
    cursor.execute("""
        INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
        VALUES (%s, 'entry_user', 'Entry User', '😀', '#000000', 'user', NOW())
        RETURNING id
    """, (family_id,))
    user_id = cursor.fetchone()['id']

    conn.commit()
    conn.close()
    return family_id, user_id


# ---------------------------
# CREATE ENTRY TESTS
# ---------------------------

@patch("routes.entry_routes.extract_health_data_with_ai")
def test_create_entry_success(mock_ai, client, auth_token):
    """Test successful diary entry creation."""
    mock_ai.return_value = {"mood_score": 7, "energy_level": 5, "confidence": 0.9}
    _, user_id = seed_family_user_for_entries()

    response = client.post(
        "/api/entries",
        data=json.dumps({"text": "Today I feel great!", "user_id": user_id}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    data = response.get_json()
    assert response.status_code == 200
    assert data["success"] is True
    assert "entry_id" in data
    assert data["ai_confidence"] == 0.9


def test_create_entry_missing_text(client, auth_token):
    """Entry creation should fail when text is empty."""
    _, user_id = seed_family_user_for_entries()

    response = client.post(
        "/api/entries",
        data=json.dumps({"text": "", "user_id": user_id}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 400
    assert "cannot be empty" in response.get_json()["error"]


# ---------------------------
# GET ENTRIES TESTS
# ---------------------------

def test_get_entries_success(client, auth_token):
    """Fetch entries for a user."""
    _, user_id = seed_family_user_for_entries()

    # Insert a sample entry
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
        VALUES (%s, 'Sample entry text', CURRENT_DATE, NOW())
        RETURNING id
    """, (user_id,))
    entry_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()

    response = client.get(
        f"/api/entries?user_id={user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    data = response.get_json()
    assert response.status_code == 200
    assert "entries" in data
    assert any(e["id"] == entry_id for e in data["entries"])


def test_get_entries_missing_user_id(client, auth_token):
    response = client.get(
        "/api/entries",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 400
    assert "user_id parameter is required" in response.get_json()["error"]


# ---------------------------
# UPDATE ENTRY TESTS
# ---------------------------

@patch("routes.entry_routes.extract_health_data_with_ai")
def test_update_entry_success(mock_ai, client, auth_token):
    """Update an existing entry."""
    mock_ai.return_value = {"mood_score": 8, "energy_level": 7, "confidence": 0.8}
    _, user_id = seed_family_user_for_entries()

    # Insert a sample entry
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
        VALUES (%s, 'Old entry text', CURRENT_DATE, NOW())
        RETURNING id
    """, (user_id,))
    entry_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()

    response = client.put(
        f"/api/entries/{entry_id}",
        data=json.dumps({"text": "Updated entry text"}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    data = response.get_json()
    assert response.status_code == 200
    assert data["success"] is True
    assert data["ai_confidence"] == 0.8


def test_update_entry_not_found(client, auth_token):
    response = client.put(
        "/api/entries/999",
        data=json.dumps({"text": "Updated text"}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404


# ---------------------------
# DELETE ENTRY TESTS
# ---------------------------

def test_delete_entry_success(client, auth_token):
    _, user_id = seed_family_user_for_entries()

    # Insert entry
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
        VALUES (%s, 'Entry to delete', CURRENT_DATE, NOW())
        RETURNING id
    """, (user_id,))
    entry_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()

    response = client.delete(
        f"/api/entries/{entry_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert "deleted successfully" in response.get_json()["message"]


def test_delete_entry_not_found(client, auth_token):
    response = client.delete(
        "/api/entries/999",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 404


# ---------------------------
# BULK DELETE TESTS
# ---------------------------

def test_bulk_delete_entries_success(client, auth_token):
    _, user_id = seed_family_user_for_entries()

    # Insert two entries
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
        VALUES (%s, 'Bulk entry 1', CURRENT_DATE, NOW()), 
               (%s, 'Bulk entry 2', CURRENT_DATE, NOW())
        RETURNING id
    """, (user_id, user_id))
    entry_ids = [row['id'] for row in cursor.fetchall()]
    conn.commit()
    conn.close()

    response = client.delete(
        "/api/entries/bulk-delete",
        data=json.dumps({"entry_ids": entry_ids}),
        content_type="application/json",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()
    assert response.status_code == 200
    assert data["success"] is True
    assert f"{len(entry_ids)} entries deleted" in data["message"]
