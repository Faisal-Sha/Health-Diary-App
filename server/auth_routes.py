from flask import request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost/health_app')

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def register_auth_routes(app):
    """Register all authentication routes with the Flask app"""
    
    @app.route('/api/auth/register', methods=['POST'])
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
            
            # Create family account
            cursor.execute("""
                INSERT INTO families (family_name, email, password_hash, created_at)
                VALUES (%s, %s, %s, NOW())
                RETURNING id, family_name, email
            """, (family_name, email, password_hash))
            
            family = cursor.fetchone()
            family_id = family['id']
            print(f"✅ Family created with ID: {family_id}")
            
            # Create admin user for the family with unique username
            # Generate unique username from email (before @ symbol)
            base_username = email.split('@')[0].lower()
            # Remove non-alphanumeric characters
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
            print(f"✅ Admin profile created with ID: {admin_profile['id']}")
            
            conn.commit()
            
            # Create JWT token
            token = create_access_token(identity=family_id)
            
            response_data = {
                "success": True,
                "token": token,
                "user": {
                    "id": family['id'],
                    "familyName": family['family_name'],
                    "email": family['email']
                },
                "message": f"Welcome to the {family_name} family health diary!"
            }
            
            print(f"✅ Registration successful for family: {family_name}")
            return jsonify(response_data)
            
        except Exception as e:
            print(f"❌ Registration error: {e}")
            import traceback
            print(f"🔍 Full traceback: {traceback.format_exc()}")
            return jsonify({"error": "Registration failed. Please try again."}), 500
        finally:
            if 'conn' in locals():
                conn.close()

    @app.route('/api/auth/login', methods=['POST'])
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
            token = create_access_token(identity=family['id'])
            
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

    @app.route('/api/auth/verify', methods=['GET'])
    @jwt_required()
    def verify_token():
        """Verify JWT token is still valid and return user info"""
        try:
            family_id = get_jwt_identity()
            
            conn = get_db_connection()
            if not conn:
                return jsonify({"error": "Database connection failed"}), 500
            
            cursor = conn.cursor()
            
            # Get family info
            cursor.execute("""
                SELECT id, family_name, email 
                FROM families WHERE id = %s
            """, (family_id,))
            
            family = cursor.fetchone()
            if not family:
                return jsonify({"error": "Family not found"}), 404
            
            return jsonify({
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

    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required()
    def logout():
        """Logout (frontend will delete the token)"""
        return jsonify({"message": "Logged out successfully"})

    print("✅ Authentication routes registered")