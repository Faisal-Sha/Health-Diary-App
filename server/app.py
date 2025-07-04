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
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from datetime import timedelta


from auth_routes import register_auth_routes
from family_routes import register_family_routes


# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

CORS(app, origins=["http://localhost:3000"])  # Allow React frontend to connect

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost/health_app')

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['JWT_ALGORITHM'] = 'HS256'

jwt = JWTManager(app)

# JWT error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"❌ Invalid token error: {error}")
    return jsonify({'error': 'Invalid token'}), 422

@jwt.unauthorized_loader
def missing_token_callback(error):
    print(f"❌ Missing token error: {error}")
    return jsonify({'error': 'Authorization token is required'}), 401


register_auth_routes(app)
register_family_routes(app)

@app.route('/api/test-auth', methods=['GET'])
@jwt_required()
def test_auth():
    """Test endpoint to verify JWT authentication"""
    family_id = get_jwt_identity()
    return jsonify({
        "message": "Authentication working!",
        "family_id": family_id
    })


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

def extract_health_data_with_ai(diary_text, user_id=1, entry_date=None):
    """Enhanced AI extraction with temporal context for delayed health effects"""
    
    # Get temporal context (last 2-3 days for delayed effects)
    temporal_context = get_temporal_context(user_id, entry_date)
    
    # Build enhanced prompt with temporal awareness
    enhanced_prompt = f"""You are a health data extraction specialist with expertise in temporal health patterns and delayed health effects.

TEMPORAL CONTEXT (for identifying delayed effects):
{format_temporal_context(temporal_context)}

CURRENT DIARY ENTRY TO ANALYZE: "{diary_text}"

CRITICAL TEMPORAL ANALYSIS GUIDELINES:
- Look for delayed effects: food/activities from yesterday affecting today's symptoms
- Consider timing: evening activities affecting next morning symptoms  
- Track cumulative effects: repeated exposures building up over days
- Identify trigger patterns: specific foods/activities consistently followed by symptoms
- Consider sleep quality: how yesterday's events affected last night's sleep

SPECIFIC DELAYED EFFECT PATTERNS TO WATCH FOR:
- Food consumed 3-8 hours ago causing digestive issues, headaches, or energy changes
- High-fat foods (ghee, fried items) from previous evening causing morning headaches
- Stressful events from yesterday affecting today's mood/energy
- Physical strain from yesterday causing today's pain/stiffness
- Late eating affecting sleep quality and next-day energy

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
  "confidence": [0.0-1.0 number indicating extraction confidence],
  
  "temporal_analysis": {{
    "delayed_food_effects": [
      {{"food": "specific food", "consumed_when": "yesterday evening/this morning", "potential_symptom": "headache/nausea/energy_drop", "confidence": "low/medium/high"}}
    ],
    "cumulative_stress_effects": [
      {{"stressor": "activity/situation", "building_since": "date", "current_impact": "description"}}
    ],
    "sleep_impact_from_yesterday": {{
      "yesterday_factors_affecting_sleep": ["factors that influenced last night's sleep"],
      "sleep_quality_correlation": "how yesterday impacted sleep"
    }},
    "physical_strain_carryover": {{
      "yesterday_activities": ["physical activities from yesterday"],
      "today_physical_effects": ["current pain/stiffness potentially from yesterday"]
    }},
    "pattern_recognition": {{
      "repeated_food_symptom_pattern": "description of any recurring food-symptom timing",
      "behavioral_health_pattern": "recurring activity-health outcome pattern",
      "trigger_confidence_level": "low/medium/high based on pattern consistency"
    }}
  }}
}}

SCORING GUIDELINES:
- mood_score: 1=very depressed/sad, 5=neutral, 10=extremely happy/great
- energy_level: 1=exhausted/no energy, 5=normal energy, 10=very energetic
- pain_level: 0=no pain at all, 5=moderate pain, 10=severe/unbearable pain
- sleep_quality: 1=terrible sleep/insomnia, 5=okay sleep, 10=excellent restful sleep
- sleep_hours: actual number of hours slept
- stress_level: 0=completely relaxed, 5=normal stress, 10=extremely stressed

TEMPORAL CORRELATION INSTRUCTIONS:
- If current symptoms match patterns from temporal context, note in delayed_food_effects
- Consider timing: ghee/heavy fats 4-8 hours before symptoms = medium confidence correlation
- Look for cumulative patterns: same trigger → same symptom across multiple days = high confidence
- Note negative correlations: absence of usual triggers with absence of usual symptoms
- Consider compound effects: multiple factors from yesterday contributing to today's state

If information is not mentioned or unclear, use null for numbers and empty arrays for lists."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",  # Use best model for complex temporal analysis
            messages=[{"role": "user", "content": enhanced_prompt}],
            temperature=0.1,
            max_tokens=2000  # Allow more tokens for temporal analysis
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Clean up response
        if ai_response.startswith('```json'):
            ai_response = ai_response.strip('```json').strip('```')
        elif ai_response.startswith('```'):
            ai_response = ai_response.strip('```')
            
        return json.loads(ai_response)
    
    except Exception as e:
        print(f"AI processing error: {e}")
        return get_fallback_data()

def get_temporal_context(user_id, current_entry_date=None, days_back=3):
    """Get recent entries for temporal context analysis"""
    try:
        conn = get_db_connection()
        if not conn:
            return []
        
        cursor = conn.cursor()
        
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

def get_fallback_data():
    """Enhanced fallback data with temporal structure"""
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
        "temporal_analysis": {
            "delayed_food_effects": [],
            "cumulative_stress_effects": [],
            "sleep_impact_from_yesterday": {
                "yesterday_factors_affecting_sleep": [],
                "sleep_quality_correlation": ""
            },
            "physical_strain_carryover": {
                "yesterday_activities": [],
                "today_physical_effects": []
            },
            "pattern_recognition": {
                "repeated_food_symptom_pattern": "",
                "behavioral_health_pattern": "",
                "trigger_confidence_level": "low"
            }
        }
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
@jwt_required()  # Now requires authentication
def create_entry():
    """Create a new diary entry with temporal-aware AI processing"""
    try:
        # Get the family_id from the JWT token
        family_id = get_jwt_identity()
        
        data = request.get_json()
        diary_text = data.get('text', '')
        entry_date = data.get('date', datetime.now().date().isoformat())
        user_id = data.get('user_id')  # Profile ID passed from frontend
        
        if not diary_text.strip():
            return jsonify({"error": "Entry text cannot be empty"}), 400
        
        if not user_id:
            return jsonify({"error": "User profile must be selected"}), 400
        
        # Verify the user belongs to this family (SECURITY CHECK)
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Make sure this user profile belongs to the authenticated family
        cursor.execute("""
            SELECT id FROM users 
            WHERE id = %s AND family_id = %s
        """, (user_id, family_id))
        
        if not cursor.fetchone():
            return jsonify({"error": "Invalid user profile"}), 403
        
        print(f"🔄 Processing entry for user {user_id} on {entry_date}")
        
        # Process text with enhanced temporal-aware AI
        ai_data = extract_health_data_with_ai(diary_text, user_id, entry_date)
        
        # Insert raw entry
        cursor.execute("""
            INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (user_id, diary_text, entry_date, datetime.now()))
        
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
        
        # Update user's last_active timestamp
        cursor.execute("""
            UPDATE users SET last_active = NOW() WHERE id = %s
        """, (user_id,))
        
        conn.commit()
        
        print(f"✅ Entry saved successfully")
        
        return jsonify({
            "success": True,
            "entry_id": raw_entry_id,
            "ai_confidence": ai_data.get('confidence', 0.0),
            "temporal_insights": {
                "delayed_effects_detected": len(ai_data.get('temporal_analysis', {}).get('delayed_food_effects', [])),
                "pattern_confidence": ai_data.get('temporal_analysis', {}).get('pattern_recognition', {}).get('trigger_confidence_level', 'low')
            },
            "message": "Entry processed with temporal health analysis"
        })
        
    except Exception as e:
        print(f"❌ Error creating entry: {e}")
        return jsonify({"error": "Failed to create entry"}), 500
    finally:
        if 'conn' in locals():
            conn.close()


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


def get_temporal_context(user_id, current_entry_date=None, days_back=3):
    """Get recent entries for temporal context analysis"""
    try:
        conn = get_db_connection()
        if not conn:
            return []
        
        cursor = conn.cursor()
        
        # Handle date conversion
        if current_entry_date is None:
            current_entry_date = datetime.now().date()
        elif isinstance(current_entry_date, str):
            current_entry_date = datetime.fromisoformat(current_entry_date).date()
        
        # Get entries from the last few days (excluding current date)
        start_date = current_entry_date - timedelta(days=days_back)
        end_date = current_entry_date
        
        query = """
            SELECT 
                re.entry_date,
                re.entry_text,
                hm.mood_score,
                hm.energy_level,
                hm.pain_level,
                hm.sleep_hours,
                hm.stress_level
            FROM raw_entries re
            LEFT JOIN health_metrics hm ON re.id = hm.raw_entry_id
            WHERE re.user_id = %s 
            AND re.entry_date >= %s 
            AND re.entry_date < %s
            ORDER BY re.entry_date DESC
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
    
    formatted_context = "RECENT HEALTH HISTORY (for delayed effect analysis):\n"
    
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
        if entry.get('stress_level'):
            metrics.append(f"stress: {entry['stress_level']}/10")
        
        metrics_str = f" [{', '.join(metrics)}]" if metrics else ""
        
        formatted_context += f"\n{date}{metrics_str}:\n{text[:200]}{'...' if len(text) > 200 else ''}\n"
    
    return formatted_context


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
    

@app.route('/api/entries', methods=['GET'])
@jwt_required()  # Now requires authentication
def get_entries():
    """Get diary entries for a specific user profile"""
    try:
        family_id = get_jwt_identity()
        
        # Get query parameters
        user_id = request.args.get('user_id')  # Profile ID
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50)
        
        if not user_id:
            return jsonify({"error": "user_id parameter is required"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor()
        
        # Security check: make sure this user belongs to the authenticated family
        cursor.execute("""
            SELECT id FROM users 
            WHERE id = %s AND family_id = %s
        """, (user_id, family_id))
        
        if not cursor.fetchone():
            return jsonify({"error": "Invalid user profile"}), 403
        
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
        
        return jsonify({
            "entries": [dict(entry) for entry in entries],
            "count": len(entries)
        })
        
    except Exception as e:
        print(f"Error fetching entries: {e}")
        return jsonify({"error": "Failed to fetch entries"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/analytics/summary', methods=['GET'])
def get_health_summary():
    """Get health analytics summary"""
    try:
        days = request.args.get('days', 30)
        user_id = request.args.get('user_id', 1, type=int)
        
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
                AND re.entry_date >= CURRENT_DATE - INTERVAL %s
            """, (user_id, f'{days} days'))
            
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
    FIXED: Proper data mapping for all AI insight fields
    """
    try:
        user_id = request.args.get('user_id', 1, type=int)
        
        print(f"🔄 Generating weekly summary for user {user_id}")
        
        # Generate the complete analysis
        summary = analytics_engine.generate_weekly_summary(user_id)
        print(f"🔍 Raw summary object: {summary}")
        
        # FIXED: Corrected data mapping to match frontend expectations
        response_data = {
            "success": True,
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
                    "trend": "stable",  # Add trend for sleep if available
                    "scale": "hours per night"
                },
                "stress": {
                    "average": summary.avg_stress,
                    "trend": "stable",  # Add trend for stress if available
                    "scale": "0-10 (lower is better)"
                }
            },
            "correlations": summary.correlations,
            "insights": {
                # FIXED: Correct field mapping
                "key_insights": summary.insights,  # ✅ Was 'key_findings'
                "potential_triggers": summary.potential_triggers,
                "recommendations": summary.recommendations,
                # MISSING: Need to add these fields to HealthSummary class
                "areas_of_concern": getattr(summary, 'areas_of_concern', []),
                "positive_patterns": getattr(summary, 'positive_patterns', [])
            },
            "generated_at": datetime.now().isoformat()
        }
        
        print("✅ Weekly summary response data:", response_data)
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
@jwt_required()
def bulk_import_entries():
    """
    Process massive amounts of diary text - split it into individual entries,
    extract dates, process each with AI, and save to database
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
@jwt_required()
def delete_entry(entry_id):
    """
    Delete a specific diary entry and its associated health metrics
    """
    try:
        family_id = get_jwt_identity()

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT re.id, re.user_id, u.display_name, u.family_id
                FROM raw_entries re
                JOIN users u ON re.user_id = u.id
                WHERE re.id = %s AND u.family_id = %s
            """, (entry_id, family_id))

            entry = cursor.fetchone()
            if not entry:
                return jsonify({
                    "success": False,
                    "error": "Entry not found or you don't have permission to delete it"
                }), 404
            
            user_id = entry['user_id']
            user_name = entry['display_name']
            
            print(f"🗑️ Deleting entry {entry_id} for user {user_name} (ID: {user_id})")
            
            # First, delete associated health metrics
            cursor.execute("""
                DELETE FROM health_metrics 
                WHERE raw_entry_id = %s
            """, (entry_id,))
            
            # Then delete the raw entry
            cursor.execute("""
                DELETE FROM raw_entries 
                WHERE id = %s AND user_id = %s
            """, (entry_id,user_id))  
            
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
    
@app.route('/api/entries/<int:entry_id>', methods=['PUT'])
@jwt_required()
def update_entry(entry_id):
    """
    Update a specific diary entry
    """
    try:
        family_id = get_jwt_identity()
        data = request.get_json()
        
        # Get the new text and validate it
        new_text = data.get('text', '').strip()
        if not new_text:
            return jsonify({"error": "Entry text cannot be empty"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()

            # First, verify the entry exists and belongs to this family
            cursor.execute("""
                SELECT re.id, re.user_id, re.entry_text, re.entry_date, u.display_name, u.family_id
                FROM raw_entries re
                JOIN users u ON re.user_id = u.id
                WHERE re.id = %s AND u.family_id = %s
            """, (entry_id, family_id))

            entry = cursor.fetchone()
            if not entry:
                return jsonify({
                    "success": False,
                    "error": "Entry not found or you don't have permission to edit it"
                }), 404
            
            user_id = entry['user_id']
            user_name = entry['display_name']
            old_text = entry['entry_text']
            entry_date = entry['entry_date']
            
            print(f"✏️ Updating entry {entry_id} for user {user_name} (ID: {user_id})")
            print(f"Old text: {old_text[:50]}...")
            print(f"New text: {new_text[:50]}...")
            
            # Re-process the new text with AI (to update health metrics)
            print("🤖 Re-processing entry with AI...")
            ai_data = extract_health_data_with_ai(new_text, user_id, entry_date)
            
            # Update ONLY the entry text (no updated_at column since it doesn't exist)
            cursor.execute("""
                UPDATE raw_entries 
                SET entry_text = %s
                WHERE id = %s AND user_id = %s
            """, (new_text, entry_id, user_id))
            
            print(f"✅ Updated raw entry text")
            
            # Delete old health metrics for this entry
            cursor.execute("""
                DELETE FROM health_metrics 
                WHERE raw_entry_id = %s
            """, (entry_id,))
            
            print(f"✅ Deleted old health metrics")
            
            # Insert new health metrics
            cursor.execute("""
                INSERT INTO health_metrics (
                    user_id, raw_entry_id, entry_date, mood_score, energy_level,
                    pain_level, sleep_quality, sleep_hours, stress_level,
                    ai_confidence, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,                              # user_id
                entry_id,                             # raw_entry_id  
                entry_date,                           # entry_date (use original date)
                ai_data.get('mood_score'),            # mood_score
                ai_data.get('energy_level'),          # energy_level
                ai_data.get('pain_level'),            # pain_level
                ai_data.get('sleep_quality'),         # sleep_quality
                ai_data.get('sleep_hours'),           # sleep_hours
                ai_data.get('stress_level'),          # stress_level
                ai_data.get('confidence', 0.0),      # ai_confidence
                datetime.now()                        # created_at
            ))
            
            print(f"✅ Inserted new health metrics")
            
            # Update user's last_active timestamp
            cursor.execute("""
                UPDATE users SET last_active = NOW() WHERE id = %s
            """, (user_id,))
            
            conn.commit()
            
            print(f"✅ Entry {entry_id} updated successfully")
            
            return jsonify({
                "success": True,
                "entry_id": entry_id,
                "ai_confidence": ai_data.get('confidence', 0.0),
                "message": f"Entry {entry_id} updated successfully",
                "ai_extracted_data": ai_data  # Return the new AI data
            })
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"❌ Error updating entry {entry_id}: {e}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": "Failed to update entry"
        }), 500

@app.route('/api/entries/clear-all', methods=['DELETE'])
@jwt_required()
def clear_all_entries():
    """
    Delete ALL entries for a user (use with caution!)
    """
    try:
        family_id = get_jwt_identity()

        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, display_name FROM users 
                WHERE id = %s AND family_id = %s
            """, (user_id, family_id))

            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found or access denied"}), 403
            
            user_name = user['display_name']
            print(f"🗑️ Clearing ALL entries for user {user_name} (ID: {user_id})")

            # Delete all health metrics for this user
            cursor.execute("""
                DELETE FROM health_metrics 
                WHERE user_id = %s
            """, (user_id,))  # user_id=1 for now
            
            # Delete all raw entries for this user
            cursor.execute("""
                DELETE FROM raw_entries 
                WHERE user_id = %s
            """, (user_id,))
            
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
@jwt_required()
def bulk_delete_entries():
    """
    Delete multiple entries by IDs
    """
    try:
        family_id = get_jwt_identity()
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
            cursor.execute(f"""
                SELECT re.id, u.family_id
                FROM raw_entries re
                JOIN users u ON re.user_id = u.id
                WHERE re.id IN ({id_placeholders})
            """, entry_ids)
            
            found_entries = cursor.fetchall()
            
            # Check if all entries belong to the authenticated family
            unauthorized_entries = [e for e in found_entries if e['family_id'] != family_id]
            if unauthorized_entries:
                return jsonify({
                    "success": False,
                    "error": "Some entries don't belong to your family"
                }), 403
            
            if len(found_entries) != len(entry_ids):
                return jsonify({
                    "success": False,
                    "error": "Some entries were not found"
                }), 404
            
            print(f"🗑️ Bulk deleting {len(entry_ids)} entries for family {family_id}")
            
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
    print("🚀 Starting Health App Backend with Authentication...")
    print("📊 Database URL:", DATABASE_URL)
    print("🤖 OpenAI API configured:", "✅" if os.getenv('OPENAI_API_KEY') else "❌")
    print("🔐 JWT Secret configured:", "✅" if os.getenv('JWT_SECRET_KEY') else "⚠️  Using default (change for production)")
    
    app.run(debug=True, host='0.0.0.0', port=5001)