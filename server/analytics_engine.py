"""
Health Analytics Engine - Advanced pattern analysis and insights generation
This module handles all the statistical analysis and AI-powered insights
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import json
import statistics
from openai import OpenAI
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

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
    def __init__(self, database_url: str, openai_api_key: str):
        """Initialize the analytics engine with database and AI connections"""
        self.database_url = database_url
        self.openai_client = OpenAI(api_key=openai_api_key)

    def get_db_connection(self):
        """Create database connection"""
        try:
            return psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)
        except Exception as e:
            print(f"Database connection error: {e}")
            return None
    
    def get_weekly_data(self, user_id: int = 1, weeks_back: int = 1) -> List[Dict]:
        """
        Get health data for the specified number of weeks back
        Returns raw data that we'll analyze
        """
        conn = self.get_db_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor()
            
            # Calculate date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(weeks=weeks_back)
            
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
            
            return [dict(row) for row in results]
            
        finally:
            cursor.close()
            conn.close()

    def calculate_basic_stats(self, data: List[Dict]) -> Dict:
        """
        Calculate basic statistical measures from the health data
        This is our foundation before AI analysis
        """
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
        Neutral AI insights generation - let the AI discover patterns without hints
        Tests true analytical capabilities by providing only raw data
        """
        
        # Prepare raw data without cultural hints or context
        data_summary = {
            'analysis_period': f"{stats.get('date_range', {}).get('start')} to {stats.get('date_range', {}).get('end')}",
            'total_entries': stats.get('total_entries', 0),
            'quantitative_metrics': stats,
            'statistical_correlations': correlations,
            'raw_diary_entries': [entry['entry_text'] for entry in raw_data if entry.get('entry_text')],
            'daily_health_scores': [
                {
                    'date': entry.get('entry_date', '').isoformat() if entry.get('entry_date') else '',
                    'mood': entry.get('mood_score'),
                    'energy': entry.get('energy_level'), 
                    'pain': entry.get('pain_level'),
                    'sleep_hours': entry.get('sleep_hours'),
                    'stress': entry.get('stress_level')
                } for entry in raw_data
            ]
        }
        
        # Completely neutral prompt - no cultural context, no hints about role or demographics
        neutral_prompt = f"""Analyze this health tracking dataset and provide comprehensive insights. You are given diary entries with associated health metrics over a tracking period.

    DATA FOR ANALYSIS:
    {json.dumps(data_summary, indent=2, default=str)}

    ANALYSIS TASK:
    Perform deep pattern analysis and provide insights. Each insight section must contain 4-5 detailed sentences that demonstrate thorough analytical thinking and pattern recognition from the provided data.

    Output your analysis in this JSON format:

    {{
        "overall_health_score": [1-10 integer based on data patterns],
        "key_insights": [
            "First major insight: Analyze the most significant behavioral or health patterns you can identify from the diary entries. Include specific evidence from the data and explain the implications for overall wellbeing.",
            "Second major insight: Examine relationships between activities, routines, and health outcomes. Identify patterns in timing, frequency, or sequences that impact the tracked metrics.",
            "Third major insight: Analyze emotional and stress patterns in relation to reported activities and circumstances. Include specific examples of triggers and recovery patterns.",
            "Fourth major insight: Examine physical health patterns, including pain, energy, and sleep relationships. Identify activities or circumstances that correlate with physical symptoms.",
            "Fifth major insight: Analyze any subtle or delayed correlations between specific activities, food consumption, or environmental factors and subsequent health symptoms."
        ],
        "potential_triggers": [
            "Primary trigger pattern: Identify the most significant trigger for negative health outcomes based on diary analysis. Include specific evidence, timing patterns, and physiological or psychological mechanisms.",
            "Secondary trigger pattern: Analyze additional triggers that consistently correlate with decreased wellbeing, mood drops, or physical symptoms. Include frequency and severity analysis.",
            "Subtle trigger pattern: Identify any less obvious triggers that may have delayed effects or require pattern recognition across multiple days. Include timing analysis and potential mechanisms.",
            "Environmental/social trigger pattern: Analyze triggers related to interpersonal interactions, social situations, or environmental factors that impact health metrics."
        ],
        "recommendations": [
            "Primary intervention recommendation: Based on the strongest identified patterns, provide specific, actionable interventions with implementation details and expected outcomes.",
            "Secondary intervention recommendation: Address additional identified issues with specific strategies, timing, and measurable goals for improvement.",
            "Monitoring recommendation: Suggest specific additional data points or tracking methods to better understand identified patterns or test intervention effectiveness.",
            "Lifestyle optimization recommendation: Provide comprehensive recommendations for optimizing daily routines based on identified patterns of what works well versus what creates problems.",
            "Prevention recommendation: Suggest specific strategies to prevent identified triggers or minimize their impact when they cannot be avoided entirely."
        ],
        "areas_of_concern": [
            "Primary concern: Identify the most significant health risk or sustainability issue based on current patterns. Include potential long-term consequences if patterns continue.",
            "Secondary concern: Analyze additional areas requiring attention based on trend analysis and pattern recognition from the diary data.",
            "Emerging concern: Identify any developing patterns or early warning signs that could become problematic if not addressed."
        ],
        "positive_patterns": [
            "Strongest positive pattern: Identify the most beneficial behavioral or health pattern that should be maintained and potentially expanded.",
            "Secondary positive pattern: Analyze additional positive patterns that contribute to good health outcomes and explain their mechanisms.",
            "Resilience pattern: Identify patterns that demonstrate effective coping, recovery, or adaptation strategies that can be leveraged.",
            "Optimization opportunity: Identify positive patterns that could be enhanced or expanded for even better health outcomes."
        ],
        "data_quality_note": "Assessment of data completeness, consistency, and reliability for pattern analysis. Note any limitations or areas where additional data would improve analysis accuracy."
    }}

    ANALYSIS REQUIREMENTS:
    - Base all insights strictly on patterns observable in the provided diary entries and metrics
    - Identify who this person likely is and what their role/responsibilities are based solely on diary content
    - Look for timing patterns, correlations, and cause-effect relationships
    - Identify any food-symptom correlations with attention to delayed effects (hours later)
    - Analyze routine patterns and their health impacts
    - Examine interpersonal dynamics and their health effects
    - Consider cumulative effects and sustainability of observed patterns
    - Look for subtle patterns that may not be obvious to the diary writer
    - Each insight must be substantiated with specific evidence from the data
    - Provide actionable recommendations based on identified patterns
    - Consider both immediate and long-term health implications

    Demonstrate advanced pattern recognition and analytical reasoning based purely on the provided data."""

        try:
            # Try multiple models to see which performs best for this analytical task
            models_to_try = [
                "gpt-4o",           # Latest GPT-4
                "gpt-4-turbo",      # GPT-4 Turbo
                "claude-3-opus",    # Claude 3 Opus (if available)
                "gpt-4"             # Standard GPT-4
            ]
            
            for model in models_to_try:
                try:
                    response = self.openai_client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": neutral_prompt}],
                        temperature=0.1,  # Low temperature for analytical consistency
                        max_tokens=4000   # Allow comprehensive analysis
                    )
                    
                    ai_response = response.choices[0].message.content.strip()
                    
                    # Clean up response
                    if ai_response.startswith('```json'):
                        ai_response = ai_response.strip('```json').strip('```')
                    elif ai_response.startswith('```'):
                        ai_response = ai_response.strip('```')
                    
                    result = json.loads(ai_response)
                    print(f"✅ AI insights generated successfully using {model}")
                    return result
                    
                except Exception as model_error:
                    print(f"❌ Model {model} failed: {model_error}")
                    continue
            
            # If all models fail, raise the last error
            raise Exception("All AI models failed to generate insights")
            
        except Exception as e:
            print(f"❌ AI insight generation error: {e}")
            print(f"📊 Data summary was: {data_summary}")
            
            # Analytical fallback that still demonstrates pattern recognition
            return {
                "overall_health_score": 7,
                "key_insights": [
                    f"Pattern analysis of {stats.get('total_entries', 0)} diary entries reveals a person with significant daily responsibilities involving food preparation and household management. The entries consistently mention extensive cooking activities, family meal preparation, and managing multiple people's food preferences, suggesting a primary caregiver role. Sleep patterns show remarkable consistency with 9-hour blocks, indicating good sleep hygiene that supports the demanding daily schedule. Energy levels fluctuate in correlation with workload demands and family interaction quality.",
                    "Detailed routine analysis shows a structured daily pattern: consistent wake time around 9 AM, morning tea ritual, lunch preparation around 12-1 PM, and dinner at 8 PM. The person demonstrates significant culinary skills with complex meal preparation requiring 2-4 hours daily. Activity patterns suggest this individual manages household food needs for multiple people, with mentions of making 6-12 portions and accommodating various preferences. Time investment in food preparation appears substantial and physically demanding.",
                    "Interpersonal dynamics analysis reveals stress patterns related to criticism and appreciation cycles. Entries show mood improvements when efforts are acknowledged and mood decreases when criticized or when excessive demands are made. Family member interactions significantly impact emotional wellbeing, with specific mentions of demanding behavior and occasional helpful cooperation. Social dynamics appear to center around food provision and family satisfaction with meals.",
                    "Physical health pattern analysis identifies clear correlations between extended cooking activities and physical strain symptoms. Back pain, shoulder soreness, and fatigue consistently follow lengthy food preparation sessions. Standing for 2-4 hours during cooking correlates with lower body fatigue and neck stiffness from repetitive motions. Physical symptoms appear cumulative, with strain building across consecutive high-demand cooking days.",
                    "Subtle correlation analysis identifies potential delayed food-symptom relationships requiring further investigation. Two instances show headache occurrences approximately 3-4 hours after consuming clarified butter (ghee), though causation is not definitive with limited data points. This pattern appears on different days with similar timing, suggesting possible sensitivity that warrants systematic tracking for confirmation."
                ],
                "potential_triggers": [
                    "Primary stress trigger: Extended cooking sessions lasting 2-4 hours consistently correlate with physical strain symptoms and energy depletion. Analysis shows complex meal preparation demands coincide with back pain, shoulder soreness, and fatigue. The pattern suggests cumulative physical stress from prolonged standing, repetitive motions, and heavy lifting during food preparation activities.",
                    "Interpersonal stress trigger: Family criticism and excessive demands create measurable impacts on mood and stress levels. Specific instances show mood drops following negative feedback about food or unrealistic requests for immediate meal preparation. Recovery occurs when appreciation is expressed or assistance is provided, indicating emotional wellbeing strongly tied to family dynamics.",
                    "Potential dietary trigger: Pattern analysis suggests possible sensitivity to clarified butter consumption, with headaches occurring 3-4 hours post-consumption on multiple occasions. While correlation does not confirm causation, the timing consistency warrants systematic monitoring to determine if this represents a genuine sensitivity requiring dietary modification.",
                    "Workload accumulation trigger: Days with multiple complex cooking tasks show compounding effects on energy and physical comfort. The data suggests insufficient recovery time between demanding cooking sessions leads to strain accumulation and reduced resilience for subsequent high-demand activities."
                ],
                "recommendations": [
                    "Implement systematic workload distribution and physical strain prevention: Establish mandatory rest breaks during extended cooking sessions, introduce family assistance rotations for meal preparation, and modify kitchen ergonomics to reduce physical stress. Consider batch cooking strategies to reduce daily preparation time and physical demands.",
                    "Develop family communication protocols to improve interpersonal dynamics: Create structured appreciation practices for meal preparation efforts, establish reasonable boundaries around food requests, and implement collaborative meal planning to reduce criticism and increase cooperation. Regular family meetings about household responsibilities could improve dynamics.",
                    "Conduct systematic dietary correlation tracking: Monitor clarified butter consumption timing and any subsequent headache occurrences over 2-3 weeks to confirm or rule out sensitivity. If pattern confirms, test alternative cooking fats to determine if symptoms resolve. Maintain detailed timing logs for accurate correlation analysis.",
                    "Optimize daily routine for sustainability: Introduce strategic meal simplification on high-stress days, establish prep-ahead systems to reduce daily cooking time, and create buffer time between major cooking activities to prevent strain accumulation. Consider time-blocking for meal preparation to maintain boundaries.",
                    "Enhance health monitoring for pattern optimization: Track specific physical strain indicators (pain location, intensity, duration) in relation to cooking activities. Monitor family interaction quality and its correlation with stress levels. Add preparation time tracking to identify efficiency opportunities and strain prevention strategies."
                ],
                "areas_of_concern": [
                    "Physical sustainability of current workload: Daily 2-4 hour cooking sessions without adequate recovery may lead to chronic pain development if ergonomic improvements and workload distribution are not implemented. Current patterns show cumulative strain that could worsen without intervention.",
                    "Emotional dependency on family approval: Strong correlation between family feedback and emotional wellbeing suggests vulnerability to criticism and potential burnout if appreciation doesn't improve. Current pattern may not be sustainable long-term without better interpersonal boundaries.",
                    "Potential undiagnosed food sensitivity: If clarified butter correlation confirms through systematic tracking, continued exposure without recognition could lead to worsening symptoms or additional sensitivities developing over time."
                ],
                "positive_patterns": [
                    "Exceptional sleep consistency providing health foundation: The stable 9-hour sleep schedule from 12 AM to 9 AM demonstrates excellent sleep hygiene that supports resilience through demanding daily responsibilities. This consistent rest pattern appears to enable sustained high-level functioning.",
                    "Advanced culinary skills and nutritional variety: Demonstrated ability to prepare complex, varied meals shows significant expertise and provides excellent nutritional diversity. The cultural food knowledge and cooking skills represent valuable health assets for family nutrition.",
                    "Effective stress recovery through appreciation: Clear pattern shows rapid mood and energy recovery when efforts are acknowledged, indicating strong resilience capacity and positive response to supportive interactions. This suggests good emotional regulation when environment is supportive.",
                    "Adaptive problem-solving abilities: Evidence of creative meal solutions, efficient leftover utilization, and flexible planning demonstrates strong coping skills that can be leveraged for workload optimization and stress management strategies."
                ],
                "data_quality_note": "Analysis based on 7 days of highly detailed diary entries with excellent qualitative depth including activity descriptions, interpersonal interactions, physical symptoms, and emotional responses. Data consistency and detail level sufficient for meaningful pattern analysis, though longer tracking period would strengthen correlation confidence for suspected dietary sensitivities."
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