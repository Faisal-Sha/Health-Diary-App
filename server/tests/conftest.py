import os
import pytest
from app import create_app
from extensions import db
from flask_jwt_extended import create_access_token
from utils.db_utils import get_db_connection

@pytest.fixture(scope="session")
def test_app():
    """
    Create and configure a Flask app instance for the entire test session.
    """
    os.environ["FLASK_ENV"] = "testing"
    # DATABASE_URL should already be set from .env.test file
    # If not set, use the default test database URL
    if not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = "postgresql://username:password@db-test/health_app_test"

    app = create_app()

    # Initialize the database schema
    with app.app_context():
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Clean all tables before tests
        cursor.execute("""
            TRUNCATE TABLE health_metrics, raw_entries, users, families RESTART IDENTITY CASCADE;
        """)
        
        conn.commit()
        conn.close()

    yield app


@pytest.fixture(scope="function")
def client(test_app):
    """
    Provide a Flask test client for each test function.
    Rolls back any DB changes after each test.
    """
    return test_app.test_client()


@pytest.fixture(scope="function")
def auth_token(test_app):
    """
    Provide a valid JWT token for testing.
    Assumes a family_id of 1 for test purposes.
    """
    with test_app.app_context():
        return create_access_token(identity="1")


# Utility function to seed a family & user for tests
def seed_family_user():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create a family
    cursor.execute("""
        INSERT INTO families (family_name, email, password_hash, created_at)
        VALUES ('TestFamily', 'test@example.com', 'hashedpass', NOW())
        RETURNING id
    """)
    family_id = cursor.fetchone()['id']

    # Create a user
    cursor.execute("""
        INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
        VALUES (%s, 'testuser', 'Test User', '👤', '#2196f3', 'user', NOW())
        RETURNING id
    """, (family_id,))
    user_id = cursor.fetchone()['id']

    conn.commit()
    conn.close()
    return family_id, user_id
