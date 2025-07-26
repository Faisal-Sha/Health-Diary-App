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
def sample_family_user(test_app):
    """
    Create a sample family and user for each test.
    Automatically cleaned up after test completes.
    """
    import uuid
    from datetime import datetime
    
    with test_app.app_context():
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use unique email to avoid conflicts
        unique_email = f"test-{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Create a family
            cursor.execute("""
                INSERT INTO families (family_name, email, password_hash, created_at)
                VALUES (%s, %s, 'hashedpass', NOW())
                RETURNING id
            """, (f"TestFamily-{uuid.uuid4().hex[:8]}", unique_email))
            family_id = cursor.fetchone()['id']

            # Create a user
            cursor.execute("""
                INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
                VALUES (%s, %s, 'Test User', '👤', '#2196f3', 'user', NOW())
                RETURNING id
            """, (family_id, f"testuser-{uuid.uuid4().hex[:8]}"))
            user_id = cursor.fetchone()['id']

            conn.commit()
            
            yield {
                'family_id': family_id,
                'user_id': user_id,
                'email': unique_email
            }
            
        finally:
            # Cleanup is automatic due to fresh DB per test run
            conn.close()


@pytest.fixture(scope="function")
def auth_token(test_app, sample_family_user):
    """
    Provide a valid JWT token for testing.
    Uses the family_id from sample_family_user fixture.
    """
    with test_app.app_context():
        return create_access_token(identity=str(sample_family_user['family_id']))


@pytest.fixture(scope="function")
def admin_family_user(test_app):
    """
    Create a sample family and admin user for each test.
    Automatically cleaned up after test completes.
    """
    import uuid
    from datetime import datetime
    
    with test_app.app_context():
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use unique email to avoid conflicts
        unique_email = f"admin-{uuid.uuid4().hex[:8]}@example.com"
        
        try:
            # Create a family
            cursor.execute("""
                INSERT INTO families (family_name, email, password_hash, created_at)
                VALUES (%s, %s, 'hashedpass', NOW())
                RETURNING id
            """, (f"AdminFamily-{uuid.uuid4().hex[:8]}", unique_email))
            family_id = cursor.fetchone()['id']

            # Create an admin user
            cursor.execute("""
                INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
                VALUES (%s, %s, 'Admin User', '👑', '#6c5ce7', 'admin', NOW())
                RETURNING id
            """, (family_id, f"admin-{uuid.uuid4().hex[:8]}"))
            user_id = cursor.fetchone()['id']

            conn.commit()
            
            yield {
                'family_id': family_id,
                'user_id': user_id,
                'email': unique_email
            }
            
        finally:
            # Cleanup is automatic due to fresh DB per test run
            conn.close()


@pytest.fixture(scope="function")
def admin_auth_token(test_app, admin_family_user):
    """
    Provide a valid JWT token for testing with admin user.
    Uses the family_id from admin_family_user fixture.
    """
    with test_app.app_context():
        return create_access_token(identity=str(admin_family_user['family_id']))


@pytest.fixture(scope="function")
def sample_health_data(test_app, sample_family_user):
    """
    Create sample health metrics for analytics testing.
    """
    with test_app.app_context():
        conn = get_db_connection()
        cursor = conn.cursor()
        
        user_id = sample_family_user['user_id']
        
        try:
            # Insert raw entry
            cursor.execute("""
                INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
                VALUES (%s, 'Feeling good today', CURRENT_DATE, NOW())
                RETURNING id
            """, (user_id,))
            raw_entry_id = cursor.fetchone()['id']

            # Insert health metrics
            cursor.execute("""
                INSERT INTO health_metrics (
                    user_id, raw_entry_id, entry_date, mood_score,
                    energy_level, pain_level, sleep_quality,
                    sleep_hours, stress_level, ai_confidence, created_at
                ) VALUES (%s, %s, CURRENT_DATE, 7, 8, 3, 6, 7.5, 4, 0.9, NOW())
                RETURNING id
            """, (user_id, raw_entry_id))
            health_metric_id = cursor.fetchone()['id']

            conn.commit()
            
            yield {
                'raw_entry_id': raw_entry_id,
                'health_metric_id': health_metric_id,
                'user_id': user_id
            }
            
        finally:
            conn.close()


# Legacy function for backward compatibility (deprecated)
def seed_family_user():
    """
    DEPRECATED: Use sample_family_user fixture instead.
    """
    import uuid
    conn = get_db_connection()
    cursor = conn.cursor()
    
    unique_email = f"test-{uuid.uuid4().hex[:8]}@example.com"

    # Create a family
    cursor.execute("""
        INSERT INTO families (family_name, email, password_hash, created_at)
        VALUES (%s, %s, 'hashedpass', NOW())
        RETURNING id
    """, (f"TestFamily-{uuid.uuid4().hex[:8]}", unique_email))
    family_id = cursor.fetchone()['id']

    # Create a user
    cursor.execute("""
        INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
        VALUES (%s, %s, 'Test User', '👤', '#2196f3', 'user', NOW())
        RETURNING id
    """, (family_id, f"testuser-{uuid.uuid4().hex[:8]}"))
    user_id = cursor.fetchone()['id']

    conn.commit()
    conn.close()
    return family_id, user_id
