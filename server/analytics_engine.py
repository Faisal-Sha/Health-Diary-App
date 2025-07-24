"""
Health Analytics Engine - Advanced pattern analysis and insights generation
This module handles all the statistical analysis and AI-powered insights
"""

from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import json
import statistics
from openai import OpenAI
from typing import Dict, List, Optional
from dataclasses import dataclass
from utils.db_utils import get_db_connection

@dataclass
class HealthSummary:
    """Data structure for health summary results - UPDATED with all fields"""
    period_start: str
    period_end: str
    total_entries: int
    avg_mood: float
    avg_energy: float
    avg_pain: float
    avg_sleep_hours: float
    avg_stress: float
    mood_trend: str  # "improving", "declining", "stable"
    pain_trend: str
    energy_trend: str
    correlations: List[Dict]
    potential_triggers: List[str]  # FIXED: Changed from List[Dict] to List[str]
    insights: List[str]  # This stores key_insights
    recommendations: List[str]
    # ADDED: Missing fields
    areas_of_concern: List[str]
    positive_patterns: List[str]




class HealthAnalyticsEngine:
    def __init__(self, openai_api_key: str):
        """Initialize the analytics engine with database and AI connections"""
        self.openai_client = OpenAI(api_key=openai_api_key)
    
    def get_weekly_data(self, user_id: int = 1, weeks_back: int = 1) -> List[Dict]:
        """
        Get health data for the specified number of weeks back
        Returns raw data that we'll analyze - FIXED: Complete SQL query
        """
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Calculate date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(weeks=weeks_back)
            
            print(f"🔍 Querying for data between {start_date} and {end_date}")
            
            # FIXED: Complete the SQL query that was cut off
            query = """
                SELECT 
                    re.id,
                    re.entry_date,
                    re.entry_text,
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
                AND re.entry_date >= %s 
                AND re.entry_date <= %s
                ORDER BY re.entry_date ASC
            """
            
            cursor.execute(query, (user_id, start_date, end_date))
            results = cursor.fetchall()
            
            print(f"✅ Found {len(results)} entries for analysis")
            
            # Debug: Print date range of found entries
            if results:
                dates = [r['entry_date'] for r in results]
                print(f"📅 Entry dates found: {min(dates)} to {max(dates)}")
            
            return [dict(row) for row in results]
            
        except Exception as e:
            print(f"❌ Error in get_weekly_data: {e}")
            return []
            
        finally:
            cursor.close()
            conn.close()

    def calculate_basic_stats(self, data: List[Dict]) -> Dict:
        """
        Calculate basic statistical measures from the health data
        This is our foundation before AI analysis
        """
        print('Basic Stats Data:', data)
        if not data:
            return {}
        
        # Filter out None values for each metric
        mood_scores = [d['mood_score'] for d in data if d['mood_score'] is not None]
        energy_levels = [d['energy_level'] for d in data if d['energy_level'] is not None]
        pain_levels = [d['pain_level'] for d in data if d['pain_level'] is not None]
        sleep_hours = [d['sleep_hours'] for d in data if d['sleep_hours'] is not None]
        stress_levels = [d['stress_level'] for d in data if d['stress_level'] is not None]

        stats = {
            'total_entries': len(data),
            'date_range': {
                'start': data[0]['entry_date'].isoformat() if data else None,
                'end': data[-1]['entry_date'].isoformat() if data else None
            }
        }

        # Calculate averages and trends
        if mood_scores:
            stats['mood'] = {
                'average': round(statistics.mean(mood_scores), 1),
                'median': round(statistics.median(mood_scores), 1),
                'min': min(mood_scores),
                'max': max(mood_scores),
                'trend': self._calculate_trend(mood_scores)
            }
        
        if energy_levels:
            stats['energy'] = {
                'average': round(statistics.mean(energy_levels), 1),
                'trend': self._calculate_trend(energy_levels)
            }
        
        if pain_levels:
            stats['pain'] = {
                'average': round(statistics.mean(pain_levels), 1),
                'bad_days': len([p for p in pain_levels if p >= 7]),  # High pain days
                'pain_free_days': len([p for p in pain_levels if p == 0]),
                'trend': self._calculate_trend(pain_levels)
            }
        
        if sleep_hours:
            stats['sleep'] = {
                'average_hours': round(statistics.mean(sleep_hours), 1),
                'good_sleep_days': len([s for s in sleep_hours if s >= 7]),  # 7+ hours
                'poor_sleep_days': len([s for s in sleep_hours if s < 6])    # <6 hours
            }
        
        if stress_levels:
            stats['stress'] = {
                'average': round(statistics.mean(stress_levels), 1),
                'high_stress_days': len([s for s in stress_levels if s >= 7]),
                'trend': self._calculate_trend(stress_levels)
            }
        
        return stats

    def _calculate_trend(self, values: List[float]) -> str:
        """
        Calculate if a metric is improving, declining, or stable
        Uses simple linear regression concept
        """

        if len(values) < 3:
            return "insufficient_data"
        
        # Split into first half and second half, compare averages
        mid_point = len(values) // 2
        first_half_avg = statistics.mean(values[:mid_point])
        second_half_avg = statistics.mean(values[mid_point:])
        
        difference = second_half_avg - first_half_avg
        
        # Define thresholds based on 10-point scale
        if abs(difference) < 0.5:
            return "stable"
        elif difference > 0:
            return "improving"
        else:
            return "declining"
        
    def find_correlations(self, data: List[Dict]) -> List[Dict]:
        """
        Find correlations between different health metrics
        This is where we identify patterns like "poor sleep → high pain"
        """
        correlations = []
        
        if len(data) < 5:  # Need enough data points
            return correlations
        
        # Extract valid data pairs for correlation analysis
        valid_entries = []
        for entry in data:
            if all(entry[field] is not None for field in ['mood_score', 'energy_level', 'pain_level', 'stress_level']):
                valid_entries.append(entry)
        
        if len(valid_entries) < 5:
            return correlations

        # Sleep vs other metrics

        # MEDICAL RESEARCH BACKING:
        # - Sleep deprivation increases pain sensitivity (hyperalgesia)
        # - Poor sleep reduces pain tolerance by 15-20%
        # - Sleep helps produce natural pain-relieving chemicals
        # - Chronic pain disrupts sleep, creating a vicious cycle
        sleep_pain_correlation = self._calculate_correlation(
            [e['sleep_hours'] for e in valid_entries if e['sleep_hours'] is not None],
            [e['pain_level'] for e in valid_entries if e['sleep_hours'] is not None]
        )

        if sleep_pain_correlation and abs(sleep_pain_correlation['coefficient']) > 0.3:
            correlations.append({
                'metric1': 'sleep_hours',
                'metric2': 'pain_level',
                'strength': sleep_pain_correlation['strength'],
                'direction': sleep_pain_correlation['direction'],
                'coefficient': sleep_pain_correlation['coefficient'],
                'insight': self._generate_correlation_insight('sleep', 'pain', sleep_pain_correlation)
            })
        
        # Mood vs Energy correlation

        # MEDICAL RESEARCH BACKING:
        # - Depression/low mood directly affects energy metabolism
        # - Neurotransmitters (serotonin, dopamine) control both mood AND energy
        # - "Psychomotor retardation" - clinical term for mood-energy connection
        # - Energy levels affect motivation, which affects mood
        mood_energy_correlation = self._calculate_correlation(
            [e['mood_score'] for e in valid_entries],
            [e['energy_level'] for e in valid_entries]
        )
        
        if mood_energy_correlation and abs(mood_energy_correlation['coefficient']) > 0.3:
            correlations.append({
                'metric1': 'mood_score',
                'metric2': 'energy_level',
                'strength': mood_energy_correlation['strength'],
                'direction': mood_energy_correlation['direction'],
                'coefficient': mood_energy_correlation['coefficient'],
                'insight': self._generate_correlation_insight('mood', 'energy', mood_energy_correlation)
            })
        
        # Stress vs Pain correlation

        # MEDICAL RESEARCH BACKING:
        # - Stress releases cortisol, which increases inflammation
        # - Chronic stress creates muscle tension (headaches, back pain)
        # - Stress sensitizes pain receptors in the nervous system
        # - "Stress-induced hyperalgesia" is a documented medical phenomenon
        stress_pain_correlation = self._calculate_correlation(
            [e['stress_level'] for e in valid_entries],
            [e['pain_level'] for e in valid_entries]
        )
        
        if stress_pain_correlation and abs(stress_pain_correlation['coefficient']) > 0.3:
            correlations.append({
                'metric1': 'stress_level',
                'metric2': 'pain_level',
                'strength': stress_pain_correlation['strength'],
                'direction': stress_pain_correlation['direction'],
                'coefficient': stress_pain_correlation['coefficient'],
                'insight': self._generate_correlation_insight('stress', 'pain', stress_pain_correlation)
            })
        
        return correlations
    
    def _calculate_correlation(self, x_values: List[float], y_values: List[float]) -> Optional[Dict]:
        """Calculate Pearson correlation coefficient between two metrics"""
        if len(x_values) != len(y_values) or len(x_values) < 3:
            return None
        
        try:
            # Remove None values
            pairs = [(x, y) for x, y in zip(x_values, y_values) if x is not None and y is not None]
            if len(pairs) < 3:
                return None
            
            x_vals, y_vals = zip(*pairs)
            
            # Calculate correlation coefficient
            # The Pearson correlation formula is:
                # r = (n*Σxy - Σx*Σy) / √[(n*Σx² - (Σx)²) * (n*Σy² - (Σy)²)]
                # Where:
                # n = number of data points
                # Σxy = sum of (x * y) for each pair
                # Σx = sum of all x values
                # Σy = sum of all y values
                # Σx² = sum of (x squared) for each x
                # Σy² = sum of (y squared) for each y
            n = len(x_vals)
            sum_x = sum(x_vals)
            sum_y = sum(y_vals)
            sum_xy = sum(x * y for x, y in pairs)
            sum_x_sq = sum(x * x for x in x_vals)
            sum_y_sq = sum(y * y for y in y_vals)
            
            numerator = n * sum_xy - sum_x * sum_y
            denominator = ((n * sum_x_sq - sum_x * sum_x) * (n * sum_y_sq - sum_y * sum_y)) ** 0.5
            
            if denominator == 0:
                return None
            
            coefficient = numerator / denominator
            
            # Categorize strength and direction
            strength = "weak"
            if abs(coefficient) > 0.7:
                strength = "strong"
            elif abs(coefficient) > 0.5:
                strength = "moderate"
            
            direction = "positive" if coefficient > 0 else "negative"
            
            return {
                'coefficient': round(coefficient, 3),
                'strength': strength,
                'direction': direction
            }
            
        except Exception as e:
            print(f"Error calculating correlation: {e}")
            return None
        
    def _generate_correlation_insight(self, metric1: str, metric2: str, correlation: Dict) -> str:
        """Generate human-readable insight from correlation data"""
        strength = correlation['strength']
        direction = correlation['direction']
        
        if metric1 == 'sleep' and metric2 == 'pain':
            if direction == 'negative':
                return f"There's a {strength} correlation between sleep and pain levels - less sleep tends to increase pain."
            else:
                return f"There's a {strength} correlation between sleep and pain levels - more sleep tends to increase pain (unusual pattern)."
        
        elif metric1 == 'mood' and metric2 == 'energy':
            if direction == 'positive':
                return f"There's a {strength} correlation between mood and energy - better mood coincides with higher energy levels."
            else:
                return f"There's a {strength} correlation between mood and energy - better mood coincides with lower energy (unusual pattern)."
        
        elif metric1 == 'stress' and metric2 == 'pain':
            if direction == 'positive':
                return f"There's a {strength} correlation between stress and pain - higher stress levels coincide with increased pain."
            else:
                return f"There's a {strength} correlation between stress and pain - higher stress levels coincide with decreased pain (unusual pattern)."
        
        return f"There's a {strength} {direction} correlation between {metric1} and {metric2}."

    
    
       
    def generate_ai_insights(self, stats: Dict, correlations: List[Dict], raw_data: List[Dict]) -> Dict:
        """
        AI insights generation focused on ACUTE TRIGGERS - FIXED to prioritize specific triggers
        """
        
        # FIXED: Create the diary_entries_with_context that was missing
        diary_entries_with_context = []
        for entry in raw_data:
            entry_context = {
                'date': entry.get('entry_date', '').isoformat() if entry.get('entry_date') and hasattr(entry.get('entry_date'), 'isoformat') else str(entry.get('entry_date', '')),
                'text': entry.get('entry_text', ''),
                'health_scores': {
                    'mood': entry.get('mood_score'),
                    'energy': entry.get('energy_level'), 
                    'pain': entry.get('pain_level'),
                    'sleep_hours': entry.get('sleep_hours'),
                    'stress': entry.get('stress_level')
                }
            }
            diary_entries_with_context.append(entry_context)
        
        # ACUTE TRIGGER-FOCUSED PROMPT - prioritizes specific environmental/situational triggers
        trigger_analysis_prompt = f"""You are an expert health detective specializing in identifying SPECIFIC triggers from diary entries.

    ANALYSIS TASK: Examine these diary entries and identify specific, named triggers that correlate with negative health symptoms.

    DATA TO ANALYZE:
    {json.dumps(diary_entries_with_context, indent=2, default=str)}

    CORRELATION INSIGHTS FROM STATISTICAL ANALYSIS:
    {json.dumps(correlations, indent=2)}

    TRIGGER DETECTION GUIDELINES:

    1. FOOD TRIGGERS - Look for specific mentions of:
    - Specific foods, ingredients, spices, or dishes
    - Eating patterns, meal timing, or food combinations
    - Food preparation methods (fried, leftover, spicy, etc.)
    - Beverages, alcohol, caffeine intake

    2. ENVIRONMENTAL TRIGGERS - Look for:
    - Weather conditions (humidity, temperature, pressure changes)
    - Air quality, pollution, allergens, dust
    - Lighting conditions (bright lights, screens, darkness)
    - Noise levels, sound environments
    - Location changes, travel, different environments

    3. SOCIAL/EMOTIONAL TRIGGERS - Identify:
    - Social situations, conflicts, or interactions
    - Work stress, deadlines, meetings
    - Family dynamics, relationship issues
    - Financial concerns, life changes

    4. LIFESTYLE TRIGGERS - Detect:
    - Sleep patterns, sleep quality, sleep timing
    - Exercise timing, intensity, or lack thereof
    - Screen time, device usage patterns
    - Routine disruptions, schedule changes

    5. PHYSICAL TRIGGERS - Note:
    - Posture changes, physical positions
    - Hormone cycles, menstrual patterns
    - Medication timing or changes
    - Physical exertion, overuse injuries

    ANALYSIS METHODOLOGY:
    - For each diary entry, identify the day's health scores
    - Look for entries where pain/stress/mood significantly worsened
    - Cross-reference what specific items were mentioned on those days
    - Identify patterns across multiple entries
    - Focus on NAMED, SPECIFIC triggers rather than vague categories

    REQUIRED OUTPUT FORMAT (valid JSON):
    {{
        "specific_triggers": [
            {{
                "trigger_name": "Old green tea leaves",
                "category": "food",
                "evidence_strength": "strong",
                "occurrences": 3,
                "symptoms_triggered": ["headache", "increased pain"],
                "evidence_dates": ["2024-06-15", "2024-06-17"],
                "explanation": "Mentioned consuming old green tea leaves on 3 occasions, all coinciding with headache reports within 2-4 hours"
            }}
        ],
        "environmental_patterns": [
            {{
                "pattern": "Humid weather correlation",
                "strength": "moderate",
                "explanation": "Higher pain scores on days with humidity mentions"
            }}
        ],
        "behavioral_insights": [
            "Late dinner timing (after 8pm) shows correlation with poor sleep quality",
            "Working late correlates with next-day headaches"
        ]
    }}

    BE EXTREMELY SPECIFIC - name exact foods, specific environmental conditions, particular social situations, etc. Avoid generic terms like "certain foods" - instead identify "leftover rice", "spicy chutney", etc."""

        try:
            print("🤖 Generating acute trigger-focused AI insights...")
            
            # STEP 1: Get trigger analysis
            trigger_response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": trigger_analysis_prompt}],
                temperature=0.1,
                max_tokens=2500
            )
            
            trigger_analysis = trigger_response.choices[0].message.content.strip()
            
            # Clean response
            if trigger_analysis.startswith('```json'):
                trigger_analysis = trigger_analysis.strip('```json').strip('```')
            elif trigger_analysis.startswith('```'):
                trigger_analysis = trigger_analysis.strip('```')
            
            try:
                trigger_data = json.loads(trigger_analysis)
            except json.JSONDecodeError:
                print("⚠️ Trigger analysis JSON parsing failed")
                trigger_data = {"specific_triggers": [], "environmental_patterns": [], "behavioral_insights": []}
            
            # STEP 2: Synthesis prompt - FIXED to actually use it
            synthesis_prompt = f"""You are a health strategist creating actionable recommendations based on trigger analysis.

    TRIGGER ANALYSIS RESULTS:
    {json.dumps(trigger_data, indent=2)}

    YOUR TASK: Create specific, actionable insights and recommendations.

    OUTPUT FORMAT (valid JSON):
    {{
        "key_insights": [
            "Identified pickles as a potential headache trigger (3/3 occurrences)",
            "Leftover rice consumption preceded pain increases in 2/2 instances"
        ],
        "potential_triggers": [
            "pickles (strong correlation with headaches)",
            "Leftover rice (moderate correlation with digestive issues)",
            "High humidity days (environmental trigger for pain)",
            "Late work sessions (stress-related trigger)"
        ],
        "recommendations": [
            "Eliminate pickles for 2 weeks and track headache frequency",
            "Avoid leftover rice or reheat thoroughly before consumption",
            "Monitor weather patterns and take preventive measures on high humidity days",
            "Set work cutoff time at 7pm to reduce next-day headache risk"
        ],
        "areas_of_concern": [
            "Recurring headaches with dietary pattern correlation",
            "Sleep quality degradation during stressful periods"
        ],
        "positive_patterns": [
            "Early morning exercise correlates with better mood scores",
            "Consistent 8+ hours sleep shows strong energy improvements"
        ]
    }}

    Make each recommendation SPECIFIC and ACTIONABLE with clear next steps."""

            print("🧠 Generating synthesis and recommendations...")
            
            # STEP 2: Get synthesis
            synthesis_response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": synthesis_prompt}],
                temperature=0.2,
                max_tokens=2000
            )
            
            synthesis_result = synthesis_response.choices[0].message.content.strip()
            
            # Clean synthesis response
            if synthesis_result.startswith('```json'):
                synthesis_result = synthesis_result.strip('```json').strip('```')
            elif synthesis_result.startswith('```'):
                synthesis_result = synthesis_result.strip('```')
            
            try:
                final_insights = json.loads(synthesis_result)
            except json.JSONDecodeError:
                print("⚠️ Synthesis JSON parsing failed")
                final_insights = {
                    "key_insights": ["Analysis completed but formatting issue occurred"],
                    "potential_triggers": ["Check diary entries for patterns"],
                    "recommendations": ["Continue detailed logging for better insights"],
                    "areas_of_concern": ["Unable to process analysis results"],
                    "positive_patterns": ["Regular logging is beneficial"]
                }
            
            print("✅ AI insights generated successfully")
            print(f"🎯 Generated {len(final_insights.get('potential_triggers', []))} potential triggers")
            
            # FIXED: Return the correct format that your frontend expects
            return final_insights
            
        except Exception as e:
            print(f"❌ AI insights generation error: {e}")
            # FIXED: Return correct fallback format
            return {
                "key_insights": ["Unable to generate insights due to processing error"],
                "potential_triggers": ["Analysis error - check data quality"],
                "recommendations": ["Verify diary entry content and try again"],
                "areas_of_concern": ["AI processing failed"],
                "positive_patterns": ["Unable to analyze patterns"]
            }
    
    # Fixed generate_weekly_summary method
    def generate_weekly_summary(self, user_id: int = 1) -> HealthSummary:
        """
        Main function to generate complete weekly health summary
        FIXED: Properly stores all AI insight fields
        """
        print("🔄 Generating weekly health summary...")
        
        # Step 1: Get raw data
        raw_data = self.get_weekly_data(user_id, weeks_back=1)
        print(f"📊 Retrieved {len(raw_data)} entries for analysis")
        
        if not raw_data:
            return self._create_empty_summary()
        
        # Step 2: Calculate statistical measures
        stats = self.calculate_basic_stats(raw_data)
        print("📈 Calculated basic statistics")
        
        # Step 3: Find correlations and patterns
        correlations = self.find_correlations(raw_data)
        print(f"🔍 Found {len(correlations)} significant correlations")
        
        # Step 4: Generate AI insights
        ai_insights = self.generate_ai_insights(stats, correlations, raw_data)
        print("🤖 Generated AI insights")
        print(f"🔍 AI insights keys: {list(ai_insights.keys())}")
        
        # Step 5: Compile everything into HealthSummary object
        # FIXED: Properly extract all fields from AI insights
        summary = HealthSummary(
            period_start=stats.get('date_range', {}).get('start', ''),
            period_end=stats.get('date_range', {}).get('end', ''),
            total_entries=stats.get('total_entries', 0),
            avg_mood=stats.get('mood', {}).get('average', 0),
            avg_energy=stats.get('energy', {}).get('average', 0),
            avg_pain=stats.get('pain', {}).get('average', 0),
            avg_sleep_hours=stats.get('sleep', {}).get('average_hours', 0),
            avg_stress=stats.get('stress', {}).get('average', 0),
            mood_trend=stats.get('mood', {}).get('trend', 'stable'),
            pain_trend=stats.get('pain', {}).get('trend', 'stable'),
            energy_trend=stats.get('energy', {}).get('trend', 'stable'),
            correlations=correlations,
            # FIXED: Properly extract all AI insight fields
            insights=ai_insights.get('key_insights', []),
            potential_triggers=ai_insights.get('potential_triggers', []),
            recommendations=ai_insights.get('recommendations', []),
            areas_of_concern=ai_insights.get('areas_of_concern', []),
            positive_patterns=ai_insights.get('positive_patterns', [])
        )
        
        print("✅ Weekly summary generated successfully")
        print(f"🔍 Summary insights count: {len(summary.insights)}")
        print(f"🔍 Summary areas of concern count: {len(summary.areas_of_concern)}")
        print(f"🔍 Summary positive patterns count: {len(summary.positive_patterns)}")
        
        return summary

    def _create_empty_summary(self) -> HealthSummary:
        """Create empty summary when no data is available - UPDATED"""
        return HealthSummary(
            period_start="",
            period_end="", 
            total_entries=0,
            avg_mood=0,
            avg_energy=0,
            avg_pain=0,
            avg_sleep_hours=0,
            avg_stress=0,
            mood_trend="no_data",
            pain_trend="no_data", 
            energy_trend="no_data",
            correlations=[],
            potential_triggers=[],
            insights=["Insufficient data for analysis."],
            recommendations=["Add more diary entries for better analysis."],
            # ADDED: Empty values for new fields
            areas_of_concern=[],
            positive_patterns=[]
        )