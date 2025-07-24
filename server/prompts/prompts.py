# prompts.py

### CATEGORIZATION PROMPT TEMPLATE ###
ENTRY_CATEGORIZATION_PROMPT_TEMPLATE = """Analyze this diary entry and determine its primary focus areas.

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

### BASE TEMPORAL ANALYSIS INSTRUCTIONS ###
TEMPORAL_ANALYSIS_GUIDELINES = """
TEMPORAL ANALYSIS GUIDELINES:
- Look for delayed effects: food/activities from yesterday affecting today's symptoms
- Consider timing: evening activities affecting next morning symptoms  
- Track cumulative effects: repeated exposures building up over days
- Identify trigger patterns: specific foods/activities consistently followed by symptoms
"""

### STANDARD JSON RESPONSE FORMAT ###
STANDARD_EXTRACTION_FORMAT = """
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
"""

### TEMPORAL STRUCTURE BLOCK ###
TEMPORAL_STRUCTURE_BLOCK = """
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
}}
"""

### SCORING GUIDELINES (used in both prompts and tooltips) ###
SCORING_GUIDELINES = """
CRITICAL SCORING GUIDELINES:
- mood_score: 1=very depressed/sad, 5=neutral, 10=extremely happy/great
- energy_level: 1=exhausted/no energy, 5=normal energy, 10=very energetic
- pain_level: 0=no pain at all, 5=moderate pain, 10=severe/unbearable pain
- sleep_quality: 1=terrible sleep/insomnia, 5=okay sleep, 10=excellent restful sleep
- sleep_hours: actual number of hours slept (e.g., 7.5, 8, 4)
- stress_level: 0=completely relaxed/no stress, 5=normal stress, 10=extremely stressed
"""

### ADAPTIVE PROMPT BASE HEADER ###
ADAPTIVE_PROMPT_HEADER_TEMPLATE = """You are an advanced health data extraction specialist with expertise in temporal health patterns, delayed health effects, and context-aware analysis.

TEMPORAL CONTEXT (for identifying delayed effects):
{temporal_context}

CURRENT DIARY ENTRY TO ANALYZE: "{diary_text}"

ADAPTIVE ANALYSIS INSTRUCTIONS:
Based on the entry content, you will provide enhanced analysis for relevant categories.
Look for both immediate patterns and delayed effects from previous days.
"""

