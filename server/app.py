from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
from openai import OpenAI
import json
from dotenv import load_dotenv
from analytics_engine import HealthAnalyticsEngine
import re
from datetime import datetime, timedelta


# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

CORS(app, origins=["http://localhost:3000"])  # Allow React frontend to connect

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost/health_app')

# OpenAI configuration
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

analytics_engine = HealthAnalyticsEngine(
    database_url=DATABASE_URL,
    openai_api_key=os.getenv('OPENAI_API_KEY')
)

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
    

@app.route('/api/analytics/weekly-summary', methods=['GET'])
def get_weekly_summary():
    """
    Generate comprehensive weekly health summary with AI insights
    This is the main endpoint for your new analytics feature
    """
    try:
        user_id = request.args.get('user_id', 1, type=int)
        
        print(f"🔄 Generating weekly summary for user {user_id}")
        
        # Generate the complete analysis
        summary = analytics_engine.generate_weekly_summary(user_id)
        
        # Convert to JSON-serializable format
        response_data = {
            "success": True,
            "summary": {
                "period": {
                    "start_date": summary.period_start,
                    "end_date": summary.period_end,
                    "total_entries": summary.total_entries
                },
                "health_metrics": {
                    "mood": {
                        "average": summary.avg_mood,
                        "trend": summary.mood_trend,
                        "scale": "1-10 (higher is better)"
                    },
                    "energy": {
                        "average": summary.avg_energy,
                        "trend": summary.energy_trend,
                        "scale": "1-10 (higher is better)"
                    },
                    "pain": {
                        "average": summary.avg_pain,
                        "trend": summary.pain_trend,
                        "scale": "0-10 (lower is better)"
                    },
                    "sleep": {
                        "average_hours": summary.avg_sleep_hours,
                        "scale": "hours per night"
                    },
                    "stress": {
                        "average": summary.avg_stress,
                        "scale": "0-10 (lower is better)"
                    }
                },
                "correlations": summary.correlations,
                "insights": {
                    "key_findings": summary.insights,
                    "potential_triggers": summary.potential_triggers,
                    "recommendations": summary.recommendations
                },
                "generated_at": datetime.now().isoformat()
            }
        }
        
        print("✅ Weekly summary generated successfully")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error generating weekly summary: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to generate weekly summary",
            "details": str(e)
        }), 500

@app.route('/api/analytics/correlations', methods=['GET'])
def get_health_correlations():
    """
    Get just the correlation analysis - useful for debugging or focused analysis
    """
    try:
        user_id = request.args.get('user_id', 1, type=int)
        weeks_back = request.args.get('weeks', 1, type=int)
        
        # Get data and find correlations
        raw_data = analytics_engine.get_weekly_data(user_id, weeks_back)
        correlations = analytics_engine.find_correlations(raw_data)
        
        return jsonify({
            "success": True,
            "correlations": correlations,
            "data_points": len(raw_data),
            "period_weeks": weeks_back
        })
        
    except Exception as e:
        print(f"❌ Error getting correlations: {e}")
        return jsonify({
            "success": False, 
            "error": "Failed to analyze correlations"
        }), 500

@app.route('/api/analytics/trends', methods=['GET'])
def get_health_trends():
    """
    Get trend analysis for the past several weeks - for charts and graphs
    """
    try:
        user_id = request.args.get('user_id', 1, type=int)
        weeks_back = request.args.get('weeks', 4, type=int)
        
        trends_data = []
        
        # Get data for each week
        for week in range(weeks_back):
            week_data = analytics_engine.get_weekly_data(user_id, weeks_back=1)
            if week_data:
                stats = analytics_engine.calculate_basic_stats(week_data)
                trends_data.append({
                    "week": week + 1,
                    "start_date": stats.get('date_range', {}).get('start'),
                    "end_date": stats.get('date_range', {}).get('end'),
                    "metrics": {
                        "mood": stats.get('mood', {}).get('average', 0),
                        "energy": stats.get('energy', {}).get('average', 0), 
                        "pain": stats.get('pain', {}).get('average', 0),
                        "sleep": stats.get('sleep', {}).get('average_hours', 0),
                        "stress": stats.get('stress', {}).get('average', 0)
                    }
                })
        
        return jsonify({
            "success": True,
            "trends": trends_data,
            "weeks_analyzed": weeks_back
        })
        
    except Exception as e:
        print(f"❌ Error getting trends: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to analyze trends"
        }), 500
    


@app.route('/api/analytics/test', methods=['GET'])
def test_analytics():
    """
    Test endpoint to verify analytics engine is working
    """
    try:
        # Test database connection
        conn = analytics_engine.get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        conn.close()
        
        # Test AI connection (simple test)
        test_response = analytics_engine.openai_client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[{"role": "user", "content": "Test message - respond with 'OK'"}],
            max_tokens=10
        )
        
        ai_working = "OK" in test_response.choices[0].message.content
        
        return jsonify({
            "database_connected": True,
            "ai_connected": ai_working,
            "analytics_engine": "operational",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            "error": f"Analytics test failed: {str(e)}"
        }), 500



@app.route('/api/entries/bulk-import', methods=['POST'])
def bulk_import_entries():
    """
    Process massive amounts of diary text - split it into individual entries,
    extract dates, process each with AI, and save to database
    """
    try:
        data = request.get_json()
        bulk_text = data.get('text', '')
        user_id = data.get('user_id', 1)
        
        if not bulk_text.strip():
            return jsonify({"error": "No text provided for bulk import"}), 400
        
        print(f"🚀 Starting bulk import processing...")
        print(f"📄 Text length: {len(bulk_text)} characters")
        
        # Split the bulk text into individual entries
        entries = split_bulk_text_into_entries(bulk_text)
        print(f"📝 Found {len(entries)} potential entries")
        
        if len(entries) == 0:
            return jsonify({"error": "No valid entries found in the text"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            processed_entries = []
            skipped_entries = []
            
            for i, entry_data in enumerate(entries):
                try:
                    entry_text = entry_data['text']
                    entry_date = entry_data['date']
                    
                    print(f"🔄 Processing entry {i+1}/{len(entries)}: {entry_date}")
                    
                    # Skip very short entries (likely not real diary entries)
                    if len(entry_text.strip()) < 20:
                        skipped_entries.append(f"Entry {i+1}: Too short ({len(entry_text)} chars)")
                        continue
                    
                    # Process with AI (same function as single entries)
                    ai_data = extract_health_data_with_ai(entry_text)
                    
                    # Insert raw entry
                    cursor.execute("""
                        INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id
                    """, (user_id, entry_text, entry_date, datetime.now()))
                    
                    raw_entry_id = cursor.fetchone()['id']
                    
                    # Insert processed health metrics
                    cursor.execute("""
                        INSERT INTO health_metrics (
                            user_id, raw_entry_id, entry_date, mood_score, energy_level,
                            pain_level, sleep_quality, sleep_hours, stress_level,
                            ai_confidence, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        user_id, raw_entry_id, entry_date,
                        ai_data.get('mood_score'), ai_data.get('energy_level'),
                        ai_data.get('pain_level'), ai_data.get('sleep_quality'),
                        ai_data.get('sleep_hours'), ai_data.get('stress_level'),
                        ai_data.get('confidence', 0.0), datetime.now()
                    ))
                    
                    processed_entries.append({
                        'id': raw_entry_id,
                        'date': entry_date.isoformat(),
                        'text_preview': entry_text[:100] + "..." if len(entry_text) > 100 else entry_text,
                        'ai_confidence': ai_data.get('confidence', 0.0)
                    })
                    
                except Exception as e:
                    print(f"❌ Error processing entry {i+1}: {e}")
                    skipped_entries.append(f"Entry {i+1}: Processing error - {str(e)}")
                    continue
            
            conn.commit()
            
            return jsonify({
                "success": True,
                "message": f"Bulk import completed successfully",
                "total_found": len(entries),
                "processed": len(processed_entries),
                "skipped": len(skipped_entries),
                "processed_entries": processed_entries[:10],  # First 10 for preview
                "skipped_reasons": skipped_entries[:5],  # First 5 skip reasons
                "processing_summary": {
                    "avg_confidence": sum(e.get('ai_confidence', 0) for e in processed_entries) / len(processed_entries) if processed_entries else 0,
                    "date_range": {
                        "earliest": min(e['date'] for e in processed_entries) if processed_entries else None,
                        "latest": max(e['date'] for e in processed_entries) if processed_entries else None
                    }
                }
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"❌ Error in bulk import: {e}")
        return jsonify({
            "success": False,
            "error": f"Bulk import failed: {str(e)}"
        }), 500
    
def split_bulk_text_into_entries(bulk_text):
    """
    Fixed version: More accurate splitting of bulk text into individual diary entries
    """
    entries = []
    
    # Enhanced date patterns with stricter matching
    date_patterns = [
        r'^\*\*([^*]+)\*\*$',  # **June 19, 2025** (Markdown bold dates)
        r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$',  # January 1, 2024
        r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$',  # Jan 1, 2024
        r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$',  # 1/1/2024, 01-01-24
        r'^\d{4}[/-]\d{1,2}[/-]\d{1,2}$',    # 2024/1/1, 2024-01-01
    ]
    
    # Split by lines and process
    lines = bulk_text.split('\n')
    current_entry = ""
    current_date = None
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Check if this line is ONLY a date (not mixed content)
        is_date_line = False
        found_date = None
        
        for pattern in date_patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                try:
                    # Extract date string
                    if pattern.startswith(r'^\*\*'):
                        # Extract from **date** format
                        date_str = match.group(1)
                    else:
                        date_str = match.group(0)
                    
                    found_date = parse_flexible_date(date_str)
                    is_date_line = True
                    print(f"📅 Found date line: '{line}' -> {found_date}")
                    break
                except Exception as e:
                    print(f"❌ Date parse error for '{line}': {e}")
                    continue
        
        # If we found a new date and have accumulated text, save previous entry
        if is_date_line and current_entry.strip():
            entries.append({
                'text': current_entry.strip(),
                'date': current_date or datetime.now().date()
            })
            print(f"✅ Saved entry for {current_date}: {len(current_entry)} chars")
            current_entry = ""
        
        # Update current date if we found one
        if is_date_line:
            current_date = found_date
        else:
            # Add content line to current entry
            current_entry += line + "\n"
    
    # Don't forget the last entry
    if current_entry.strip():
        entries.append({
            'text': current_entry.strip(),
            'date': current_date or datetime.now().date()
        })
        print(f"✅ Saved final entry for {current_date}: {len(current_entry)} chars")
    
    print(f"📊 Split result: {len(entries)} entries total")
    
    # If we got unexpected results, log details
    if len(entries) != 7:
        print(f"⚠️ Expected 7 entries, got {len(entries)}")
        for i, entry in enumerate(entries):
            print(f"  Entry {i+1}: {entry['date']} - {len(entry['text'])} chars")
            print(f"    Preview: {entry['text'][:100]}...")
    
    return entries



def split_by_paragraphs_or_length(bulk_text):
    """
    Fallback splitting when no dates are found
    Split by double line breaks or every ~3-5 lines
    """
    entries = []
    
    # Try splitting by double line breaks first (paragraph breaks)
    paragraphs = re.split(r'\n\s*\n', bulk_text)
    
    if len(paragraphs) > 1:
        # Use paragraph breaks
        base_date = datetime.now().date()
        for i, paragraph in enumerate(paragraphs):
            if paragraph.strip() and len(paragraph.strip()) > 20:
                # Space entries out by days
                entry_date = base_date - timedelta(days=len(paragraphs) - i - 1)
                entries.append({
                    'text': paragraph.strip(),
                    'date': entry_date
                })
    else:
        # Split by line count (every 3-5 lines becomes an entry)
        lines = [line.strip() for line in bulk_text.split('\n') if line.strip()]
        current_entry = ""
        line_count = 0
        base_date = datetime.now().date()
        entry_number = 0
        
        for line in lines:
            current_entry += line + "\n"
            line_count += 1
            
            # Create entry every 3-5 lines or if we hit a natural break
            if line_count >= 3 and (line_count >= 5 or line.endswith('.') or line.endswith('!')):
                if len(current_entry.strip()) > 20:
                    entry_date = base_date - timedelta(days=entry_number)
                    entries.append({
                        'text': current_entry.strip(),
                        'date': entry_date
                    })
                    entry_number += 1
                
                current_entry = ""
                line_count = 0
        
        # Don't forget remaining text
        if current_entry.strip() and len(current_entry.strip()) > 20:
            entry_date = base_date - timedelta(days=entry_number)
            entries.append({
                'text': current_entry.strip(),
                'date': entry_date
            })
    
    return entries


def parse_flexible_date(date_str):
    """
    Enhanced date parsing with better error handling
    """
    # Remove markdown formatting
    date_str = date_str.replace('*', '').strip()
    
    try:
        # Try using dateutil first (most flexible)
        from dateutil import parser
        parsed_date = parser.parse(date_str).date()
        print(f"✅ Parsed '{date_str}' -> {parsed_date}")
        return parsed_date
    except ImportError:
        print("⚠️ dateutil not available, using manual parsing")
    except Exception as e:
        print(f"❌ dateutil failed for '{date_str}': {e}")
    
    # Manual parsing fallbacks
    try:
        # Handle MM/DD/YYYY or MM-DD-YYYY
        if '/' in date_str or '-' in date_str:
            separator = '/' if '/' in date_str else '-'
            parts = date_str.split(separator)
            if len(parts) == 3:
                month, day, year = parts
                if len(year) == 2:
                    year = '20' + year if int(year) < 50 else '19' + year
                result = datetime(int(year), int(month), int(day)).date()
                print(f"✅ Manual parse '{date_str}' -> {result}")
                return result
        
        # Handle "Month DD, YYYY" format
        import re
        month_match = re.match(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})', date_str, re.IGNORECASE)
        if month_match:
            month_name, day, year = month_match.groups()
            month_num = {
                'january': 1, 'february': 2, 'march': 3, 'april': 4,
                'may': 5, 'june': 6, 'july': 7, 'august': 8,
                'september': 9, 'october': 10, 'november': 11, 'december': 12
            }[month_name.lower()]
            result = datetime(int(year), month_num, int(day)).date()
            print(f"✅ Month name parse '{date_str}' -> {result}")
            return result
            
    except Exception as e:
        print(f"❌ Manual parsing failed for '{date_str}': {e}")
    
    # If all else fails, return today
    fallback = datetime.now().date()
    print(f"⚠️ Using fallback date for '{date_str}' -> {fallback}")
    return fallback

@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    """
    Delete a specific diary entry and its associated health metrics
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            # First, delete associated health metrics
            cursor.execute("""
                DELETE FROM health_metrics 
                WHERE raw_entry_id = %s
            """, (entry_id,))
            
            # Then delete the raw entry
            cursor.execute("""
                DELETE FROM raw_entries 
                WHERE id = %s AND user_id = %s
            """, (entry_id, 1))  # user_id=1 for now
            
            # Check if entry was actually deleted
            if cursor.rowcount == 0:
                return jsonify({
                    "success": False,
                    "error": "Entry not found or you don't have permission to delete it"
                }), 404
            
            conn.commit()
            
            return jsonify({
                "success": True,
                "message": f"Entry {entry_id} deleted successfully"
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"Error deleting entry {entry_id}: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to delete entry"
        }), 500

@app.route('/api/entries/clear-all', methods=['DELETE'])
def clear_all_entries():
    """
    Delete ALL entries for a user (use with caution!)
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            # Delete all health metrics for this user
            cursor.execute("""
                DELETE FROM health_metrics 
                WHERE user_id = %s
            """, (1,))  # user_id=1 for now
            
            # Delete all raw entries for this user
            cursor.execute("""
                DELETE FROM raw_entries 
                WHERE user_id = %s
            """, (1,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            return jsonify({
                "success": True,
                "message": f"All {deleted_count} entries deleted successfully"
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"Error clearing all entries: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to clear all entries"
        }), 500

@app.route('/api/entries/bulk-delete', methods=['DELETE'])
def bulk_delete_entries():
    """
    Delete multiple entries by IDs
    """
    try:
        data = request.get_json()
        entry_ids = data.get('entry_ids', [])
        
        if not entry_ids:
            return jsonify({
                "success": False,
                "error": "No entry IDs provided"
            }), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            # Convert entry_ids to proper format for SQL
            id_placeholders = ','.join(['%s'] * len(entry_ids))
            
            # Delete associated health metrics
            cursor.execute(f"""
                DELETE FROM health_metrics 
                WHERE raw_entry_id IN ({id_placeholders})
            """, entry_ids)
            
            # Delete the raw entries
            cursor.execute(f"""
                DELETE FROM raw_entries 
                WHERE id IN ({id_placeholders}) AND user_id = %s
            """, entry_ids + [1])  # Add user_id at the end
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            return jsonify({
                "success": True,
                "message": f"{deleted_count} entries deleted successfully"
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"Error bulk deleting entries: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to delete entries"
        }), 500
    

if __name__ == '__main__':
    print("🚀 Starting Health App Backend...")
    print("📊 Database URL:", DATABASE_URL)
    print("🤖 OpenAI API configured:", "✅" if os.getenv('OPENAI_API_KEY') else "❌")
    
    app.run(debug=True, host='0.0.0.0', port=5001)