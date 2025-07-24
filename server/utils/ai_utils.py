# utils/ai_utils.py

import json
from datetime import datetime, timedelta
from openai import OpenAI
import os
from psycopg2.extras import RealDictCursor
from .db_utils import get_db_connection
from prompts import (
    ENTRY_CATEGORIZATION_PROMPT_TEMPLATE,
    ADAPTIVE_PROMPT_HEADER_TEMPLATE,
    TEMPORAL_ANALYSIS_GUIDELINES,
    STANDARD_EXTRACTION_FORMAT,
    TEMPORAL_STRUCTURE_BLOCK,
    SCORING_GUIDELINES
)

openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def extract_health_data_with_ai(diary_text, user_id=1, entry_date=None):
    """Full AI-driven health analysis pipeline"""
    try:
        # Step 1: Categorize entry
        categorization_prompt = ENTRY_CATEGORIZATION_PROMPT_TEMPLATE.format(diary_text=diary_text)

        categorization_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": categorization_prompt}],
            temperature=0.1,
            max_tokens=300
        )
        raw_categorization = categorization_response.choices[0].message.content.strip()
        if raw_categorization.startswith("```json"):
            raw_categorization = raw_categorization.strip("```json").strip("```")
        themes_data = json.loads(raw_categorization)
        themes = themes_data.get("primary_themes", {})

        # Step 2: Temporal context
        temporal_context = get_temporal_context(user_id, entry_date)

        # Step 3: Adaptive prompt
        adaptive_prompt = build_complete_adaptive_prompt(diary_text, themes, temporal_context)

        # Step 4: Final AI extraction
        final_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": adaptive_prompt}],
            temperature=0.1,
            max_tokens=2000
        )
        ai_text = final_response.choices[0].message.content.strip()
        if ai_text.startswith("```json"):
            ai_text = ai_text.strip("```json").strip("```")

        result = json.loads(ai_text)
        result["entry_categorization"] = themes_data
        result["temporal_context_used"] = len(temporal_context)

        return result

    except Exception as e:
        print(f"❌ AI error: {e}")
        return get_enhanced_fallback_data()


def build_complete_adaptive_prompt(diary_text, themes, temporal_context):
    """Builds smart adaptive prompt using categories + temporal context"""
    prompt = ADAPTIVE_PROMPT_HEADER_TEMPLATE.format(
        diary_text=diary_text,
        temporal_context=format_temporal_context(temporal_context)
    )

    if themes.get("food_focused"):
        prompt += """
🍽️ ENHANCED FOOD ANALYSIS:
- Categorize foods by macronutrients
- Identify meal timing patterns and delays
- Track food variety vs repetition and delayed symptom correlations
"""

    if themes.get("relationship_focused"):
        prompt += """
👥 ENHANCED SOCIAL ANALYSIS:
- Assess social support/conflict and emotional impact
"""

    if themes.get("physical_symptoms"):
        prompt += """
🩺 ENHANCED SYMPTOM ANALYSIS:
- Identify pain/symptom timing, triggers, and trends
"""

    if themes.get("sleep_focused"):
        prompt += """
😴 ENHANCED SLEEP ANALYSIS:
- Connect sleep quality with stress, food, or late activities
"""

    if themes.get("mood_emotions") or themes.get("work_stress"):
        prompt += """
🧠 STRESS/MOOD ANALYSIS:
- Identify mood triggers, stress accumulation, and emotional coping patterns
"""

    prompt += "\n" + TEMPORAL_ANALYSIS_GUIDELINES
    prompt += "\n" + STANDARD_EXTRACTION_FORMAT
    prompt += "," + TEMPORAL_STRUCTURE_BLOCK
    prompt += "\n" + SCORING_GUIDELINES

    return prompt


def get_temporal_context(user_id, current_entry_date=None, days_back=3):
    """Returns previous diary entries with health scores"""
    try:
        conn = get_db_connection()
        if not conn:
            return []

        cursor = conn.cursor(cursor_factory=RealDictCursor)
        if current_entry_date is None:
            current_entry_date = datetime.now().date()
        elif isinstance(current_entry_date, str):
            current_entry_date = datetime.fromisoformat(current_entry_date).date()

        start_date = current_entry_date - timedelta(days=days_back)
        end_date = current_entry_date

        cursor.execute("""
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
        """, (user_id, start_date, end_date))

        return [dict(row) for row in cursor.fetchall()]

    except Exception as e:
        print(f"❌ Temporal context error: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()


def format_temporal_context(temporal_data):
    """Formats recent entry history into readable context string"""
    if not temporal_data:
        return "No recent entries available for temporal analysis."

    formatted = "RECENT HEALTH HISTORY:\n"
    for entry in temporal_data:
        date = entry["entry_date"]
        text = entry["entry_text"]
        metrics = []

        if entry.get("mood_score"): metrics.append(f"mood: {entry['mood_score']}/10")
        if entry.get("energy_level"): metrics.append(f"energy: {entry['energy_level']}/10")
        if entry.get("pain_level"): metrics.append(f"pain: {entry['pain_level']}/10")
        if entry.get("sleep_hours"): metrics.append(f"sleep: {entry['sleep_hours']} hrs")

        metrics_str = f" [{', '.join(metrics)}]" if metrics else ""
        preview = text[:200] + ("..." if len(text) > 200 else "")
        formatted += f"\n{date}{metrics_str}:\n{preview}\n"

    return formatted


def get_enhanced_fallback_data():
    """Fallback if AI fails"""
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
