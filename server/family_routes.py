from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import traceback
from extensions import db

# Create a Blueprint for family routes
family_bp = Blueprint('family', __name__, url_prefix='/api/family')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@db/health_app')

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def register_family_routes(app):
    """Register the family blueprint with the app"""
    app.register_blueprint(family_bp)
    print("✅ Family routes registered")
    return app

@family_bp.route('/profiles', methods=['GET'])
@jwt_required()
def get_family_profiles():
    """Get all family profiles for the authenticated family"""
    try:
        family_id = get_jwt_identity()
        print(f"🔍 Getting profiles for family_id: {family_id}")
        
        conn = get_db_connection()
        if not conn:
            print("❌ Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # First, check if family exists
        cursor.execute("SELECT id, family_name FROM families WHERE id = %s", (family_id,))
        family = cursor.fetchone()
        if not family:
            print(f"❌ Family not found for ID: {family_id}")
            return jsonify({"error": "Family not found"}), 404
        
        print(f"✅ Family found: {family['family_name']}")
        
        # Get all profiles for this family with entry counts and health scores
        cursor.execute("""
            SELECT 
                u.id,
                u.username,
                u.display_name as name,
                u.avatar,
                u.color,
                u.role,
                u.last_active,
                COUNT(re.id) as entry_count,
                COALESCE(AVG(hm.mood_score), 0) as avg_mood,
                COALESCE(AVG(hm.energy_level), 0) as avg_energy
            FROM users u
            LEFT JOIN raw_entries re ON u.id = re.user_id
            LEFT JOIN health_metrics hm ON re.id = hm.raw_entry_id
            WHERE u.family_id = %s
            GROUP BY u.id, u.username, u.display_name, u.avatar, u.color, u.role, u.last_active
            ORDER BY u.role DESC, u.id
        """, (family_id,))
        
        profiles = cursor.fetchall()
        print(f"📊 Found {len(profiles)} profiles for family")
        
        # Calculate health score for each profile
        formatted_profiles = []
        for profile in profiles:
            print(f"🔄 Processing profile: {profile['name']} (ID: {profile['id']})")
            
            # Simple health score calculation (0-100)
            if profile['entry_count'] > 0:
                health_score = int((profile['avg_mood'] + profile['avg_energy']) * 5)
                health_score = max(0, min(100, health_score))  # Clamp between 0-100
            else:
                health_score = 0
            
            formatted_profile = {
                'id': profile['id'],
                'username': profile['username'],
                'name': profile['name'],
                'avatar': profile['avatar'],
                'color': profile['color'],
                'role': profile['role'],
                'entry_count': profile['entry_count'],
                'healthScore': health_score,
                'lastActive': profile['last_active'].strftime('%Y-%m-%d') if profile['last_active'] else None
            }
            
            formatted_profiles.append(formatted_profile)
            print(f"✅ Formatted profile: {formatted_profile}")
        
        print(f"✅ Returning {len(formatted_profiles)} profiles")
        return jsonify(formatted_profiles)
        
    except Exception as e:
        print(f"❌ Get profiles error: {e}")
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to get profiles"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@family_bp.route('/profiles', methods=['POST'])
@jwt_required()
def create_family_profile():
    """Create new family member profile"""
    try:
        family_id = get_jwt_identity()
        data = request.get_json()
        
        name = data.get('name', '').strip()
        avatar = data.get('avatar', '👤')
        color = data.get('color', '#2196f3')
        
        if not name:
            return jsonify({"error": "Name is required"}), 400
        
        if len(name) > 50:
            return jsonify({"error": "Name must be 50 characters or less"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Check if name already exists in this family
        cursor.execute("""
            SELECT id FROM users 
            WHERE family_id = %s AND display_name = %s
        """, (family_id, name))
        
        if cursor.fetchone():
            return jsonify({"error": "A family member with this name already exists"}), 400
        
        # Create username from name (lowercase, no spaces, alphanumeric only)
        username = ''.join(c.lower() for c in name if c.isalnum())
        if not username:
            username = "user"
        
        # Make username unique within family if needed
        base_username = username
        counter = 1
        while True:
            cursor.execute("""
                SELECT id FROM users 
                WHERE family_id = %s AND username = %s
            """, (family_id, username))
            
            if not cursor.fetchone():
                break
                
            username = f"{base_username}{counter}"
            counter += 1
        
        # Insert new profile
        cursor.execute("""
            INSERT INTO users (family_id, username, display_name, avatar, color, role, last_active)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, username, display_name as name, avatar, color, role, last_active
        """, (family_id, username, name, avatar, color, 'user'))
        
        new_profile = cursor.fetchone()
        conn.commit()
        
        # Format the response
        profile_dict = dict(new_profile)
        profile_dict['entry_count'] = 0  # Use snake_case to match frontend expectation
        profile_dict['healthScore'] = 0
        if profile_dict['last_active']:
            profile_dict['lastActive'] = profile_dict['last_active'].strftime('%Y-%m-%d')
        else:
            profile_dict['lastActive'] = None
        
        return jsonify({
            "success": True,
            "profile": profile_dict,
            "message": f"Profile for {name} created successfully!"
        })
        
    except Exception as e:
        print(f"Create profile error: {e}")
        print(f" Full traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to create profile"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@family_bp.route('/profiles/<int:profile_id>', methods=['PUT'])
@jwt_required()
def update_family_profile(profile_id):
    """Update family member profile"""
    try:
        family_id = get_jwt_identity()
        data = request.get_json()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Verify profile belongs to this family
        cursor.execute("""
            SELECT id FROM users 
            WHERE id = %s AND family_id = %s
        """, (profile_id, family_id))
        
        if not cursor.fetchone():
            return jsonify({"error": "Profile not found"}), 404
        
        # Update allowed fields
        update_fields = []
        params = []
        
        if 'name' in data:
            update_fields.append("display_name = %s")
            params.append(data['name'].strip())
        
        if 'avatar' in data:
            update_fields.append("avatar = %s")
            params.append(data['avatar'])
        
        if 'color' in data:
            update_fields.append("color = %s")
            params.append(data['color'])
        
        if not update_fields:
            return jsonify({"error": "No valid fields to update"}), 400
        
        # Add profile_id to params
        params.append(profile_id)
        
        # Update the profile
        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}, last_active = NOW()
            WHERE id = %s
            RETURNING id, username, display_name as name, avatar, color, role, last_active
        """
        
        cursor.execute(query, params)
        updated_profile = cursor.fetchone()
        conn.commit()
        
        return jsonify({
            "success": True,
            "profile": dict(updated_profile),
            "message": "Profile updated successfully!"
        })
        
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({"error": "Failed to update profile"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@family_bp.route('/profiles/<int:profile_id>', methods=['DELETE'])
@jwt_required()
def delete_family_profile(profile_id):
    """Delete family member profile and all their data"""
    try:
        family_id = get_jwt_identity()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Verify profile belongs to this family and get name
        cursor.execute("""
            SELECT display_name, role FROM users 
            WHERE id = %s AND family_id = %s
        """, (profile_id, family_id))
        
        profile = cursor.fetchone()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Don't allow deleting the last admin
        if profile['role'] == 'admin':
            cursor.execute("""
                SELECT COUNT(*) as admin_count FROM users 
                WHERE family_id = %s AND role = 'admin'
            """, (family_id,))
            
            admin_count = cursor.fetchone()['admin_count']
            if admin_count <= 1:
                return jsonify({"error": "Cannot delete the only admin user"}), 400
        
        # Delete all health data for this user (cascading delete)
        cursor.execute("DELETE FROM health_metrics WHERE user_id = %s", (profile_id,))
        cursor.execute("DELETE FROM raw_entries WHERE user_id = %s", (profile_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (profile_id,))
        
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": f"Profile for {profile['display_name']} deleted successfully"
        })
        
    except Exception as e:
        print(f"Delete profile error: {e}")
        return jsonify({"error": "Failed to delete profile"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

print(" Family routes registered")