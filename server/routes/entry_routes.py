# routes/entry_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.db_utils import get_db_connection
from datetime import datetime, timedelta
from dateutil import parser
import traceback
from psycopg2.extras import RealDictCursor
from openai import OpenAI
import os
import re
import json
import threading
import time

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

entry_bp = Blueprint("entry", __name__, url_prefix="/api/entries")

def register_entry_routes(app):
    """Register the entry blueprint with the app"""
    app.register_blueprint(entry_bp)
    print("✅ Entry routes registered")
    return app

@entry_bp.route('', methods=['POST'])
@jwt_required()
def create_entry():
    try:
        family_id = get_jwt_identity()
        data = request.get_json()
        diary_text = (data.get('text') or '').strip()
        entry_date = data.get('date') or datetime.now().date().isoformat()
        user_id = data.get('user_id')

        if not diary_text:
            return jsonify({"error": "Entry text cannot be empty"}), 400
        if not user_id:
            return jsonify({"error": "User profile must be selected"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT id FROM users WHERE id = %s AND family_id = %s", (user_id, family_id))
        if not cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"error": "Invalid user profile"}), 403

        # 1) Insert RAW entry only
        cursor.execute("""
            INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (user_id, diary_text, entry_date, datetime.now()))
        raw_entry_id = cursor.fetchone()['id']

        # (optional) mark user last_active now
        cursor.execute("UPDATE users SET last_active = NOW() WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close(); conn.close()

        # 2) Fire-and-forget AI processing
        threading.Thread(
            target=_process_entries_async,
            args=([{
                "raw_entry_id": raw_entry_id,
                "user_id": user_id,
                "entry_date": datetime.fromisoformat(entry_date).date() if isinstance(entry_date, str) else entry_date,
                "entry_text": diary_text
            }],),
            daemon=True
        ).start()

        # 3) Return immediately
        return jsonify({
            "success": True,
            "entry_id": raw_entry_id,
            "status": "queued",              # client can show a 'processing…' badge
            "message": "Entry saved and queued for AI processing."
        }), 202

    except Exception as e:
        print(f"❌ Error creating entry: {e}")
        return jsonify({"error": "Failed to create entry"}), 500

@entry_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_entries():
    try:
        family_id = get_jwt_identity()
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Total count for pagination
        cursor.execute('''
            SELECT COUNT(*) FROM raw_entries re
            JOIN users u ON re.user_id = u.id
            WHERE u.family_id = %s
        ''', (family_id,))
        total = cursor.fetchone()['count']
        total_pages = (total + page_size - 1) // page_size

        # Paginated entries
        cursor.execute('''
            SELECT re.id, re.entry_text as text, re.entry_date, re.created_at,
                   re.user_id, u.display_name as member_name,
                   hm.mood_score, hm.energy_level, hm.pain_level, 
                   hm.sleep_quality, hm.sleep_hours, hm.stress_level, 
                   hm.ai_confidence
            FROM raw_entries re
            JOIN users u ON re.user_id = u.id
            LEFT JOIN health_metrics hm ON re.id = hm.raw_entry_id
            WHERE u.family_id = %s
            ORDER BY re.created_at DESC
            LIMIT %s OFFSET %s
        ''', (family_id, page_size, offset))

        entries = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({
            "entries": entries,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch entries", "details": str(e)}), 500


@entry_bp.route('', methods=['GET'])
@jwt_required()
def get_member_entries():
    try:
        family_id = get_jwt_identity()
        user_id = request.args.get('user_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50)

        if not user_id:
            return jsonify({"error": "user_id parameter is required"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT id FROM users WHERE id = %s AND family_id = %s", (user_id, family_id))
        if not cursor.fetchone():
            return jsonify({"error": "Invalid user profile"}), 403

        query = """
            SELECT re.id, re.entry_text as text, re.entry_date, re.created_at,
                   hm.mood_score, hm.energy_level, hm.pain_level, 
                   hm.sleep_quality, hm.sleep_hours, hm.stress_level, 
                   hm.ai_confidence
            FROM raw_entries re
            LEFT JOIN health_metrics hm ON re.id = hm.raw_entry_id
            WHERE re.user_id = %s
        """
        params = [user_id]
        if start_date:
            query += " AND re.entry_date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND re.entry_date <= %s"
            params.append(end_date)
        query += " ORDER BY re.created_at DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        entries = cursor.fetchall()

        return jsonify({"entries": [dict(entry) for entry in entries], "count": len(entries)})

    except Exception as e:
        print(f"❌ Error fetching entries: {e}")
        return jsonify({"error": "Failed to fetch entries"}), 500
    finally:
        if 'conn' in locals(): conn.close()

@entry_bp.route('/<int:entry_id>', methods=['PUT'])
@jwt_required()
def update_entry(entry_id):
    try:
        family_id = get_jwt_identity()
        data = request.get_json()
        new_text = data.get('text', '').strip()

        if not new_text:
            return jsonify({"error": "Entry text cannot be empty"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT re.user_id, re.entry_date FROM raw_entries re
            JOIN users u ON re.user_id = u.id
            WHERE re.id = %s AND u.family_id = %s
        """, (entry_id, family_id))

        entry = cursor.fetchone()
        if not entry:
            return jsonify({"error": "Entry not found or unauthorized"}), 404

        user_id = entry['user_id']
        entry_date = entry['entry_date']

        ai_data = extract_health_data_with_ai(new_text, user_id, entry_date)

        cursor.execute("UPDATE raw_entries SET entry_text = %s WHERE id = %s", (new_text, entry_id))
        cursor.execute("DELETE FROM health_metrics WHERE raw_entry_id = %s", (entry_id,))
        cursor.execute("""
            INSERT INTO health_metrics (
                user_id, raw_entry_id, entry_date, mood_score, energy_level,
                pain_level, sleep_quality, sleep_hours, stress_level,
                ai_confidence, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, entry_id, entry_date,
            ai_data.get('mood_score'), ai_data.get('energy_level'),
            ai_data.get('pain_level'), ai_data.get('sleep_quality'),
            ai_data.get('sleep_hours'), ai_data.get('stress_level'),
            ai_data.get('confidence', 0.0), datetime.now()
        ))

        cursor.execute("UPDATE users SET last_active = NOW() WHERE id = %s", (user_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "entry_id": entry_id,
            "ai_confidence": ai_data.get('confidence', 0.0),
            "message": "Entry updated successfully",
            "ai_extracted_data": ai_data
        })

    except Exception as e:
        print(f"❌ Error updating entry {entry_id}: {e}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to update entry"}), 500
    finally:
        if 'conn' in locals(): conn.close()


@entry_bp.route('/<int:entry_id>', methods=['DELETE'])
@jwt_required()
def delete_entry(entry_id):
    try:
        family_id = get_jwt_identity()

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT re.user_id FROM raw_entries re
            JOIN users u ON re.user_id = u.id
            WHERE re.id = %s AND u.family_id = %s
        """, (entry_id, family_id))

        entry = cursor.fetchone()
        if not entry:
            return jsonify({"error": "Entry not found or unauthorized"}), 404

        user_id = entry['user_id']
        cursor.execute("DELETE FROM health_metrics WHERE raw_entry_id = %s", (entry_id,))
        cursor.execute("DELETE FROM raw_entries WHERE id = %s AND user_id = %s", (entry_id, user_id))

        conn.commit()
        return jsonify({"success": True, "message": f"Entry {entry_id} deleted successfully"})

    except Exception as e:
        print(f"❌ Error deleting entry {entry_id}: {e}")
        return jsonify({"error": "Failed to delete entry"}), 500
    finally:
        if 'conn' in locals(): conn.close()


@entry_bp.route('/clear-all', methods=['DELETE'])
@jwt_required()
def clear_all_entries():
    try:
        family_id = get_jwt_identity()
        user_id = request.get_json().get('user_id')

        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT id FROM users WHERE id = %s AND family_id = %s", (user_id, family_id))
        if not cursor.fetchone():
            return jsonify({"error": "User not found or unauthorized"}), 403

        cursor.execute("DELETE FROM health_metrics WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM raw_entries WHERE user_id = %s", (user_id,))

        conn.commit()
        return jsonify({"success": True, "message": f"All entries for user {user_id} deleted"})

    except Exception as e:
        print(f"❌ Error clearing all entries: {e}")
        return jsonify({"error": "Failed to clear entries"}), 500
    finally:
        if 'conn' in locals(): conn.close()


@entry_bp.route('/bulk-delete', methods=['DELETE'])
@jwt_required()
def bulk_delete_entries():
    try:
        family_id = get_jwt_identity()
        entry_ids = request.get_json().get('entry_ids', [])

        if not entry_ids:
            return jsonify({"error": "No entry IDs provided"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Validate ownership
        placeholders = ','.join(['%s'] * len(entry_ids))
        cursor.execute(f"""
            SELECT re.id FROM raw_entries re
            JOIN users u ON re.user_id = u.id
            WHERE re.id IN ({placeholders}) AND u.family_id = %s
        """, entry_ids + [family_id])

        found = cursor.fetchall()
        if len(found) != len(entry_ids):
            return jsonify({"error": "Some entries not found or unauthorized"}), 403

        # Delete metrics and entries
        cursor.execute(f"DELETE FROM health_metrics WHERE raw_entry_id IN ({placeholders})", entry_ids)
        cursor.execute(f"DELETE FROM raw_entries WHERE id IN ({placeholders})", entry_ids)

        conn.commit()
        return jsonify({"success": True, "message": f"{len(entry_ids)} entries deleted"})

    except Exception as e:
        print(f"❌ Bulk delete error: {e}")
        return jsonify({"error": "Bulk delete failed"}), 500
    finally:
        if 'conn' in locals(): conn.close()


@entry_bp.route('/bulk-import', methods=['POST'])
@jwt_required()
def bulk_import_entries():
    """
    Accept bulk text, split into entries, insert RAW rows only, return 202 immediately.
    A background thread will later run AI and insert health_metrics.
    """
    try:
        family_id = get_jwt_identity()

        data = request.get_json()
        bulk_text = data.get('text', '')
        user_id = data.get('user_id')

        if not bulk_text.strip():
            return jsonify({"error": "No text provided for bulk import"}), 400
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        # Split
        entries = split_bulk_text_into_entries(bulk_text)
        if not entries:
            return jsonify({"error": "No valid entries found in the text"}), 400

        # Insert RAW entries only (no AI yet)
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Security: ensure user belongs to family
        cursor.execute("SELECT id FROM users WHERE id = %s AND family_id = %s", (user_id, family_id))
        if not cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"error": "Invalid user profile"}), 403

        queued_items = []
        skipped_entries = []

        for i, entry_data in enumerate(entries, start=1):
            entry_text = (entry_data.get('text') or '').strip()
            entry_date = entry_data.get('date')

            # Skip obviously too-short lines
            if len(entry_text) < 20:
                skipped_entries.append(f"Entry {i}: Too short ({len(entry_text)} chars)")
                continue

            # Insert raw entry
            cursor.execute("""
                INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (user_id, entry_text, entry_date, datetime.now()))
            raw_entry_id = cursor.fetchone()['id']

            queued_items.append({
                "raw_entry_id": raw_entry_id,
                "user_id": user_id,
                "entry_date": entry_date,
                "entry_text": entry_text
            })

        conn.commit()
        cursor.close()
        conn.close()

        # Fire-and-forget background processing
        if queued_items:
            t = threading.Thread(
                target=_process_entries_async,
                args=(queued_items,),
                daemon=True
            )
            t.start()

        return jsonify({
            "success": True,
            "message": "Bulk import received. Entries queued for AI processing.",
            "total_found": len(entries),
            "queued": len(queued_items),
            "skipped": len(skipped_entries),
            "skipped_reasons": skipped_entries[:5]
        }), 202

    except Exception as e:
        print(f"❌ Error in bulk import: {e}")
        return jsonify({"success": False, "error": f"Bulk import failed: {str(e)}"}), 500

def split_bulk_text_into_entries(bulk_text):
    """
    Fixed version: Correctly splits bulk text into individual diary entries.
    Works even when the date and text are on the same line.
    """
    print(f"Bulk text: {bulk_text[:100]}...")  # Short preview
    entries = []
    
    # Enhanced date patterns (no $ to allow text after the date)
    date_patterns = [
        r'^\*\*([^*]+)\*\*',  # **June 19, 2025** (Markdown bold dates)
        r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
        r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}',
        r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
        r'^\d{4}[/-]\d{1,2}[/-]\d{1,2}',
    ]
    
    lines = bulk_text.split('\n')
    current_entry = ""
    current_date = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        is_date_line = False
        found_date = None
        match = None
        
        # Check if line starts with a date pattern
        for pattern in date_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                try:
                    date_str = match.group(1) if pattern.startswith(r'^\*\*') else match.group(0)
                    found_date = parse_flexible_date(date_str)
                    is_date_line = True
                    break
                except Exception as e:
                    print(f"❌ Date parse error for '{line}': {e}")
        
        # Save previous entry if a new date is found
        if is_date_line:
            if current_entry.strip():
                entries.append({
                    'text': current_entry.strip(),
                    'date': current_date or datetime.now().date()
                })
                current_entry = ""
            
            current_date = found_date
            
            # Add the remaining text after the date in the same line
            remainder = line[match.end():].strip()
            if remainder:
                current_entry += remainder + "\n"
        else:
            current_entry += line + "\n"
    
    # Save the final entry
    if current_entry.strip():
        entries.append({
            'text': current_entry.strip(),
            'date': current_date or datetime.now().date()
        })
    
    print(f"📊 Split result: {len(entries)} entries total")
    for i, entry in enumerate(entries):
        print(f"  Entry {i+1}: {entry['date']} - {len(entry['text'])} chars")
    
    return entries

def parse_flexible_date(date_str):
    """
    Enhanced date parsing with better error handling
    """
    date_str = date_str.replace('*', '').strip()
    try:
        parsed_date = parser.parse(date_str).date()
        return parsed_date
    except Exception:
        # Manual fallback
        fallback = datetime.now().date()
        return fallback

def extract_health_data_with_ai(diary_text, user_id=1, entry_date=None):
    """Complete AI extraction with both context-awareness and temporal analysis"""
    
    # STEP 1: First categorize what this entry is primarily about
    categorization_prompt = f"""Analyze this diary entry and determine its primary focus areas.

DIARY ENTRY: "{diary_text}"

Categorize the main themes (mark as true/false):
Return ONLY JSON:
{{
  "primary_themes": {{
    "food_focused": [true if significant food/eating content],
    "relationship_focused": [true if family/social interactions prominent],  
    "physical_symptoms": [true if pain/illness prominent],
    "sleep_focused": [true if sleep quality/patterns discussed],
    "work_stress": [true if work/professional stress mentioned],
    "exercise_activity": [true if physical activity mentioned],
    "mood_emotions": [true if emotional states prominent]
  }},
  "complexity_level": ["simple", "moderate", "complex"],
  "analysis_depth_needed": ["basic", "enhanced", "comprehensive"]
}}"""

    try:
        # Get categorization first
        categorization_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": categorization_prompt}],
            temperature=0.1,
            max_tokens=300
        )
        
        categorization_text = categorization_response.choices[0].message.content.strip()
        if categorization_text.startswith('```json'):
            categorization_text = categorization_text.strip('```json').strip('```')
        
        categorization = json.loads(categorization_text)
        themes = categorization.get('primary_themes', {})
        
        print(f"🔍 Entry themes detected: {[k for k, v in themes.items() if v]}")
        
        # STEP 2: Get temporal context (previous days)
        temporal_context = get_temporal_context(user_id, entry_date)
        print(f"📅 Retrieved {len(temporal_context)} previous entries for temporal context")
        
        # STEP 3: Build adaptive prompt based on both context and temporal data
        adaptive_prompt = build_complete_adaptive_prompt(diary_text, themes, temporal_context)
        
        # STEP 4: Get full analysis with smart prompt
        analysis_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": adaptive_prompt}],
            temperature=0.1,
            max_tokens=2000  # Allow more tokens for comprehensive analysis
        )
        
        ai_response = analysis_response.choices[0].message.content.strip()
        
        # Clean and parse response
        if ai_response.startswith('```json'):
            ai_response = ai_response.strip('```json').strip('```')
        elif ai_response.startswith('```'):
            ai_response = ai_response.strip('```')
            
        result = json.loads(ai_response)
        
        # Add categorization metadata
        result['entry_categorization'] = categorization
        result['temporal_context_used'] = len(temporal_context)
        
        return result
    
    except Exception as e:
        print(f"❌ Complete AI processing error: {e}")
        return get_enhanced_fallback_data()

def get_enhanced_fallback_data():
    """Enhanced fallback data with all analysis structures"""
    return {
        "mood_score": None,
        "energy_level": None,
        "pain_level": None,
        "sleep_quality": None,
        "sleep_hours": None,
        "stress_level": None,
        "symptoms": [],
        "activities": [],
        "food_intake": [],
        "social_interactions": None,
        "triggers": [],
        "medications": [],
        "locations": [],
        "confidence": 0.0,
        "entry_categorization": {
            "primary_themes": {},
            "complexity_level": "basic",
            "analysis_depth_needed": "basic"
        },
        "temporal_context_used": 0,
        "temporal_analysis": {
            "delayed_food_effects": [],
            "cumulative_stress_effects": [],
            "pattern_recognition": {
                "repeated_food_symptom_pattern": "",
                "behavioral_health_pattern": "",
                "trigger_confidence_level": "low"
            },
            "recovery_indicators": []
        }
    }

def get_temporal_context(user_id, current_entry_date=None, days_back=3):
    """Get recent entries for temporal context analysis"""
    try:
        conn = get_db_connection()
        if not conn:
            return []
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # If no entry date provided, use today
        if current_entry_date is None:
            current_entry_date = datetime.now().date()
        elif isinstance(current_entry_date, str):
            current_entry_date = datetime.fromisoformat(current_entry_date).date()
        
        # Get entries from the last few days (excluding current date)
        start_date = current_entry_date - timedelta(days=days_back)
        end_date = current_entry_date  # Exclude current date
        
        query = """
            SELECT 
                re.entry_date,
                re.entry_text,
                re.created_at,
                hm.mood_score,
                hm.energy_level,
                hm.pain_level,
                hm.sleep_quality,
                hm.sleep_hours,
                hm.stress_level
            FROM raw_entries re
            LEFT JOIN health_metrics hm ON re.id = hm.raw_entry_id
            WHERE re.user_id = %s 
            AND re.entry_date >= %s 
            AND re.entry_date < %s
            ORDER BY re.entry_date DESC, re.created_at DESC
        """
        
        cursor.execute(query, (user_id, start_date, end_date))
        results = cursor.fetchall()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        print(f"Error getting temporal context: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()

def format_temporal_context(temporal_data):
    """Format temporal context for AI prompt"""
    if not temporal_data:
        return "No recent entries available for temporal analysis."
    
    formatted_context = "RECENT HEALTH HISTORY:\n"
    
    for entry in temporal_data:
        date = entry['entry_date']
        text = entry['entry_text']
        
        # Add health metrics if available
        metrics = []
        if entry.get('mood_score'):
            metrics.append(f"mood: {entry['mood_score']}/10")
        if entry.get('energy_level'):
            metrics.append(f"energy: {entry['energy_level']}/10")
        if entry.get('pain_level'):
            metrics.append(f"pain: {entry['pain_level']}/10")
        if entry.get('sleep_hours'):
            metrics.append(f"sleep: {entry['sleep_hours']}hrs")
        
        metrics_str = f" [{', '.join(metrics)}]" if metrics else ""
        
        formatted_context += f"\n{date}{metrics_str}:\n{text[:200]}{'...' if len(text) > 200 else ''}\n"
    
    return formatted_context

def build_complete_adaptive_prompt(diary_text, themes, temporal_context):
    """Build the ultimate adaptive prompt with both context and temporal awareness"""
    
    # Base prompt with temporal context
    base_prompt = f"""You are an advanced health data extraction specialist with expertise in temporal health patterns, delayed health effects, and context-aware analysis.

TEMPORAL CONTEXT (for identifying delayed effects):
{format_temporal_context(temporal_context)}

CURRENT DIARY ENTRY TO ANALYZE: "{diary_text}"

ADAPTIVE ANALYSIS INSTRUCTIONS:
Based on the entry content, you will provide enhanced analysis for relevant categories.
Look for both immediate patterns and delayed effects from previous days."""

    # Add context-specific analysis instructions based on themes
    if themes.get('food_focused'):
        base_prompt += """

🍽️ ENHANCED FOOD ANALYSIS (entry contains significant food content):
- Categorize foods by macronutrients (proteins, carbohydrates, fats) without cultural bias
- Note cooking methods and preparation complexity
- Identify meal timing patterns and frequency
- Look for food-symptom timing correlations (especially 3-8 hour delays)
- Compare with recent eating patterns from temporal context
- Assess food variety vs repetition patterns
- Consider cultural cuisine patterns naturally emerging from text"""

    if themes.get('relationship_focused'):
        base_prompt += """

👥 ENHANCED SOCIAL ANALYSIS (entry contains significant social content):
- Analyze family dynamics and interpersonal stress patterns
- Identify social support vs conflict indicators
- Note impact of social interactions on mood/stress levels
- Track social meal contexts and their emotional effects
- Consider cumulative social stress from previous days"""

    if themes.get('physical_symptoms'):
        base_prompt += """

🩺 ENHANCED SYMPTOM ANALYSIS (entry contains significant physical symptoms):
- Track symptom timing relative to activities and food consumption
- Correlate current symptoms with activities from previous days
- Note pain patterns and potential delayed triggers
- Identify cumulative physical strain indicators
- Look for symptom progression or improvement patterns"""

    if themes.get('sleep_focused'):
        base_prompt += """

😴 ENHANCED SLEEP ANALYSIS (entry discusses sleep patterns):
- Analyze sleep quality indicators and duration patterns
- Correlate sleep with previous day's activities, stress, or food
- Identify factors affecting sleep quality from temporal context
- Track sleep consistency and its impact on next-day energy"""

    if themes.get('work_stress') or themes.get('mood_emotions'):
        base_prompt += """

🧠 ENHANCED STRESS/MOOD ANALYSIS (entry contains stress or emotional content):
- Analyze stress triggers and emotional response patterns
- Track mood progression and stress accumulation over time
- Identify coping mechanisms and their effectiveness
- Correlate emotional states with physical symptoms or food choices"""

    # Standard extraction format with adaptive enhancements
    base_prompt += f"""

TEMPORAL ANALYSIS GUIDELINES:
- Look for delayed effects: food/activities from yesterday affecting today's symptoms
- Consider timing: evening activities affecting next morning symptoms  
- Track cumulative effects: repeated exposures building up over days
- Identify trigger patterns: specific foods/activities consistently followed by symptoms

Extract and return ONLY valid JSON in this exact format:
{{
  "mood_score": [1-10 number or null],
  "energy_level": [1-10 number or null], 
  "pain_level": [0-10 number or null],
  "sleep_quality": [1-10 number or null],
  "sleep_hours": [number of hours or null],
  "stress_level": [0-10 number or null],
  "symptoms": [array of strings or empty array],
  "activities": [array of strings or empty array],
  "food_intake": [array of strings or empty array],
  "social_interactions": [string description or null],
  "triggers": [array of potential trigger strings or empty array],
  "medications": [array of strings or empty array],
  "locations": [array of strings or empty array],
  "confidence": [0.0-1.0 number indicating extraction confidence]"""

    # Add enhanced sections based on detected themes
    enhanced_sections = []
    
    if themes.get('food_focused'):
        enhanced_sections.append('''
  "enhanced_food_analysis": {{
    "macronutrient_breakdown": {{
      "proteins": [specific protein sources identified],
      "carbohydrates": [carbohydrate sources], 
      "fats": [fat sources including oils, ghee, nuts]
    }},
    "cooking_complexity": "simple/moderate/complex",
    "meal_timing": {{"breakfast": "time", "lunch": "time", "dinner": "time", "snacks": "times"}},
    "preparation_methods": [cooking methods like fried, steamed, roasted],
    "food_variety_today": [unique foods vs repeated from recent days],
    "potential_delayed_effects": [foods that might cause delayed symptoms based on temporal context]
  }}''')

    if themes.get('relationship_focused'):
        enhanced_sections.append('''
  "enhanced_social_analysis": {{
    "relationship_dynamics": "description of family/social interactions quality",
    "social_stress_level": [1-10 rating of social stress intensity],
    "support_vs_conflict": "supportive/neutral/conflicted",
    "social_meal_context": "description if meals involved social dynamics",
    "family_appreciation_level": "description of recognition/criticism patterns"
  }}''')

    if themes.get('physical_symptoms'):
        enhanced_sections.append('''
  "enhanced_symptom_analysis": {{
    "symptom_timing": "when symptoms occurred relative to activities",
    "potential_delayed_triggers": [activities/foods from previous days that may have caused current symptoms],
    "symptom_severity_trend": "improving/stable/worsening compared to recent days",
    "cumulative_strain_indicators": [signs of building physical stress],
    "pain_location_specificity": [specific body areas affected]
  }}''')

    if themes.get('sleep_focused'):
        enhanced_sections.append('''
  "enhanced_sleep_analysis": {{
    "sleep_factors": [factors mentioned that affected sleep quality],
    "sleep_consistency": "regular/irregular compared to recent pattern",
    "next_day_energy_correlation": "how sleep affected today's energy levels",
    "sleep_environment_factors": [bedroom conditions, noise, temperature etc]
  }}''')

    # Add temporal analysis for all entries
    enhanced_sections.append('''
  "temporal_analysis": {{
    "delayed_food_effects": [
      {{"food": "specific food", "consumed_when": "yesterday evening/this morning", "potential_symptom": "current symptom", "confidence": "low/medium/high"}}
    ],
    "cumulative_stress_effects": [
      {{"stressor": "ongoing situation", "building_since": "timeframe", "current_impact": "how it affects today"}}
    ],
    "pattern_recognition": {{
      "repeated_food_symptom_pattern": "description of any recurring food-symptom timing patterns",
      "behavioral_health_pattern": "recurring activity-health outcome patterns",
      "trigger_confidence_level": "low/medium/high based on pattern consistency across days"
    }},
    "recovery_indicators": [signs of improvement or positive changes from previous days]
  }}''')

    # Add enhanced sections to prompt
    for section in enhanced_sections:
        base_prompt += "," + section

    base_prompt += """
}}

CRITICAL SCORING GUIDELINES:
- mood_score: 1=very depressed/sad, 5=neutral, 10=extremely happy/great
- energy_level: 1=exhausted/no energy, 5=normal energy, 10=very energetic
- pain_level: 0=no pain at all, 5=moderate pain, 10=severe/unbearable pain
- sleep_quality: 1=terrible sleep/insomnia, 5=okay sleep, 10=excellent restful sleep
- sleep_hours: actual number of hours slept (e.g., 7.5, 8, 4)
- stress_level: 0=completely relaxed/no stress, 5=normal stress, 10=extremely stressed

ENHANCED ANALYSIS GUIDELINES:
- Only provide enhanced analysis for categories relevant to this specific entry
- Use culture-neutral food analysis - let cuisine patterns emerge naturally
- Focus on timing relationships and delayed correlations
- Consider cumulative effects and daily routine impacts
- Look for patterns across multiple days, not just today
- Identify both positive and negative health patterns

If information is not mentioned or unclear, use null for numbers and empty arrays for lists."""

    return base_prompt

def _process_entries_async(items):
    """
    Daemon thread: for each queued raw entry
    - run extract_health_data_with_ai
    - write health_metrics
    - be resilient to transient errors
    """
    print(f"🧵 Async processor started for {len(items)} entries")
    for idx, it in enumerate(items, start=1):
        conn = None
        cursor = None
        try:
            user_id = it["user_id"]
            entry_date = it.get("entry_date")
            raw_entry_id = it["raw_entry_id"]
            entry_text = it["entry_text"]

            # Normalize date
            if isinstance(entry_date, str):
                entry_date = datetime.fromisoformat(entry_date).date()
            if entry_date is None:
                entry_date = datetime.utcnow().date()

            # Retry AI a couple of times (transient failures)
            ai = None
            for attempt in range(3):
                try:
                    ai = extract_health_data_with_ai(entry_text, user_id=user_id, entry_date=entry_date)
                    break
                except Exception as ai_err:
                    wait = 0.5 * (2 ** attempt)  # 0.5s, 1s, 2s
                    print(f"⚠️ AI attempt {attempt+1}/3 failed for raw_entry_id={raw_entry_id}: {ai_err}. Retrying in {wait:.1f}s")
                    time.sleep(wait)
            if ai is None:
                print(f"❌ AI failed after retries for raw_entry_id={raw_entry_id}; skipping metrics insert")
                continue

            # Fresh DB connection per item
            conn = get_db_connection()
            if not conn:
                print("⚠️ Async: DB connection failed; skipping this item")
                continue
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute("""
                INSERT INTO health_metrics (
                    user_id, raw_entry_id, entry_date, mood_score, energy_level,
                    pain_level, sleep_quality, sleep_hours, stress_level,
                    ai_confidence, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (raw_entry_id) DO NOTHING
            """, (
                user_id,
                raw_entry_id,
                entry_date,
                ai.get('mood_score'),
                ai.get('energy_level'),
                ai.get('pain_level'),
                ai.get('sleep_quality'),
                ai.get('sleep_hours'),
                ai.get('stress_level'),
                ai.get('confidence', 0.0),
                datetime.utcnow()
            ))

            conn.commit()
            print(f"✅ Async processed {idx}/{len(items)} (raw_entry_id={raw_entry_id})")

            # gentle pacing to avoid rate limits; tune as needed
            time.sleep(0.2)

        except Exception as e:
            print(f"❌ Async processing error for raw_entry_id={it.get('raw_entry_id')}: {e}")
            try:
                if conn:
                    conn.rollback()
            except Exception:
                pass
        finally:
            try:
                if cursor:
                    cursor.close()
            except Exception:
                pass
            try:
                if conn:
                    conn.close()
            except Exception:
                pass

    print("🧵 Async processor finished")
