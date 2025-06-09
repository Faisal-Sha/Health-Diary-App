from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
from openai import OpenAI
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
print(app);
CORS(app, origins=["http://localhost:3000"])  # Allow React frontend to connect

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost/health_app')

# OpenAI configuration
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def extract_health_data_with_ai(diary_text):
    """Extract structured health data using ChatGPT"""
    prompt = f"""You are a health data extraction specialist. Analyze the following health diary entry and extract structured information.

DIARY ENTRY: "{diary_text}"

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
  "confidence": [0.0-1.0 number indicating extraction confidence]
}}

CRITICAL SCORING GUIDELINES:
- mood_score: 1=very depressed/sad, 5=neutral, 10=extremely happy/great
- energy_level: 1=exhausted/no energy, 5=normal energy, 10=very energetic
- pain_level: 0=no pain at all, 5=moderate pain, 10=severe/unbearable pain
- sleep_quality: 1=terrible sleep/insomnia, 5=okay sleep, 10=excellent restful sleep
- sleep_hours: actual number of hours slept (e.g., 7.5, 8, 4)
- stress_level: 0=completely relaxed/no stress, 5=normal stress, 10=extremely stressed/overwhelmed

If information is not mentioned or unclear, use null for numbers and empty arrays for lists."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1  # Low temperature for consistent extraction
        )
        
        ai_response = response.choices[0].message.content.strip()
        return json.loads(ai_response)
    
    except Exception as e:
        print(f"AI processing error: {e}")
        # Return basic fallback data
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
            "confidence": 0.0
        }

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

@app.route('/api/entries', methods=['POST'])
def create_entry():
    """Create a new diary entry with AI processing"""
    try:
        data = request.get_json()
        diary_text = data.get('text', '')
        entry_date = data.get('date', datetime.now().date().isoformat())
        
        if not diary_text.strip():
            return jsonify({"error": "Entry text cannot be empty"}), 400
        
        # Process text with AI
        ai_data = extract_health_data_with_ai(diary_text)
        
        # Save to database
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            # Insert raw entry
            cursor.execute("""
                INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (1, diary_text, entry_date, datetime.now()))  # user_id=1 for now
            
            raw_entry_id = cursor.fetchone()['id']
            
            # Insert processed health metrics
            cursor.execute("""
                INSERT INTO health_metrics (
                    user_id, raw_entry_id, entry_date, mood_score, energy_level,
                    pain_level, sleep_quality, sleep_hours, stress_level,
                    ai_confidence, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                1, raw_entry_id, entry_date,
                ai_data.get('mood_score'), ai_data.get('energy_level'),
                ai_data.get('pain_level'), ai_data.get('sleep_quality'),
                ai_data.get('sleep_hours'), ai_data.get('stress_level'),
                ai_data.get('confidence', 0.0), datetime.now()
            ))
            
            health_metric_id = cursor.fetchone()['id']
            
            conn.commit()
            
            return jsonify({
                "success": True,
                "entry_id": raw_entry_id,
                "health_metric_id": health_metric_id,
                "ai_extracted_data": ai_data
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"Error creating entry: {e}")
        return jsonify({"error": "Failed to create entry"}), 500

@app.route('/api/entries', methods=['GET'])
def get_entries():
    """Get diary entries for a user"""
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    re.id,
                    re.entry_text,
                    re.entry_date,
                    re.created_at,
                    hm.mood_score,
                    hm.energy_level,
                    hm.pain_level,
                    hm.sleep_quality,
                    hm.sleep_hours,
                    hm.stress_level,
                    hm.ai_confidence
                FROM raw_entries re
                LEFT JOIN health_metrics hm ON re.id = hm.raw_entry_id
                WHERE re.user_id = %s
            """
            
            params = [1]  # user_id=1 for now
            
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
            
            return jsonify({
                "entries": [dict(entry) for entry in entries],
                "count": len(entries)
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"Error fetching entries: {e}")
        return jsonify({"error": "Failed to fetch entries"}), 500

@app.route('/api/analytics/summary', methods=['GET'])
def get_health_summary():
    """Get health analytics summary"""
    try:
        days = request.args.get('days', 30)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            # Get summary statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_entries,
                    AVG(mood_score) as avg_mood,
                    AVG(energy_level) as avg_energy,
                    AVG(pain_level) as avg_pain,
                    AVG(sleep_hours) as avg_sleep,
                    AVG(stress_level) as avg_stress
                FROM health_metrics hm
                JOIN raw_entries re ON hm.raw_entry_id = re.id
                WHERE hm.user_id = %s 
                AND re.entry_date >= CURRENT_DATE - INTERVAL '%s days'
            """, (1, days))
            
            summary = cursor.fetchone()
            
            return jsonify({
                "period_days": days,
                "summary": dict(summary) if summary else {}
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"Error fetching summary: {e}")
        return jsonify({"error": "Failed to fetch summary"}), 500

if __name__ == '__main__':
    print("🚀 Starting Health App Backend...")
    print("📊 Database URL:", DATABASE_URL)
    print("🤖 OpenAI API configured:", "✅" if os.getenv('OPENAI_API_KEY') else "❌")
    
    app.run(debug=True, host='0.0.0.0', port=5001)