from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import traceback
from extensions import db

# Create a Blueprint for auth routes
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@db/health_app')

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

def register_auth_routes(app):
    """Register the auth blueprint with the app"""
    app.register_blueprint(auth_bp)
    print("✅ Authentication routes registered")
    return app

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new family account with email and password"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        family_name = data.get('familyName', '')
        
        print(f"🔄 Registration attempt for email: {email}, family: {family_name}")
        
        # Validation
        if not email or not password or not family_name:
            return jsonify({"error": "All fields are required"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Basic email validation
        if '@' not in email or '.' not in email.split('@')[1]:
            return jsonify({"error": "Please enter a valid email address"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute("SELECT id FROM families WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already registered"}), 400
        
        # Hash password securely
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create family account (ID will be auto-incremented)
        cursor.execute("""
            INSERT INTO families (family_name, email, password_hash, created_at)
            VALUES (%s, %s, %s, NOW())
            RETURNING id, family_name, email
        """, (family_name, email, password_hash))
        
        family = cursor.fetchone()
        if not family:
            return jsonify({"error": "Failed to create family account"}), 500
            
        family_id = family[0]
        family_name = family[1]
        print(f"✅ Family created with ID: {family_id}")
        
        # Create admin user for the family with unique username and explicit UUID
        base_username = email.split('@')[0].lower()
        base_username = ''.join(c for c in base_username if c.isalnum())
        if not base_username:
            base_username = "admin"
        
        # Make username unique by checking if it exists
        username = base_username
        counter = 1
        while True:
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if not cursor.fetchone():
                break
            username = f"{base_username}{counter}"
            counter += 1
        
        print(f"🔄 Creating admin user with username: {username}")
        
        # Create first family member profile (admin)
        cursor.execute("""
            INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, username, display_name as name, avatar, color, role
        """, (family_id, username, "Admin", "👑", "#6c5ce7", "admin"))
        
        admin_profile = cursor.fetchone()
        print(f"✅ Admin profile created with ID: {admin_profile[0]}")
        
        conn.commit()
        
        # Create JWT token - ensure identity is a string
        token = create_access_token(identity=str(family_id))
        
        response_data = {
            "success": True,
            "token": token,
            "user": {
                "id": family_id,
                "familyName": family_name,
                "email": email
            },
            "message": f"Welcome to the {family_name} family health diary!"
        }
        
        print(f"✅ Registration successful for family: {family_name}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Registration error: {e}")
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return jsonify({"error": "Registration failed. Please try again."}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login to family account with email and password"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Get family account by email
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, family_name, email, password_hash 
            FROM families WHERE email = %s
        """, (email,))
        
        family = cursor.fetchone()
        if not family:
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Verify password against hashed password in database
        if not bcrypt.checkpw(password.encode('utf-8'), family['password_hash'].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Password is correct - create JWT token
        token = create_access_token(identity=str(family['id']))
        
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "id": family['id'],
                "familyName": family['family_name'],
                "email": family['email']
            },
            "message": "Login successful!"
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "Login failed. Please try again."}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token is still valid and return user info"""
    try:
        family_id = get_jwt_identity()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Use RealDictCursor to get results as dictionaries
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get family info
        cursor.execute("""
            SELECT id, family_name, email 
            FROM families WHERE id = %s
        """, (family_id,))
        
        family = cursor.fetchone()
        if not family:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "success": True,
            "user": {
                "id": family['id'],
                "familyName": family['family_name'],
                "email": family['email']
            }
        })
        
    except Exception as e:
        print(f"Token verification error: {e}")
        return jsonify({"error": "Token verification failed"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout (frontend will delete the token)"""
    return jsonify({"success": True, "message": "Successfully logged out"})