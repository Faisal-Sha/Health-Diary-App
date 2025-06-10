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
    """Data structure for health summary results"""
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
    potential_triggers: List[Dict]
    insights: List[str]
    recommendations: List[str]

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
        Use GPT-4 to generate professional health insights based on our statistical analysis
        This is where we transform numbers into actionable intelligence
        """
        
        # Prepare data summary for AI
        data_summary = {
            'period': f"{stats.get('date_range', {}).get('start')} to {stats.get('date_range', {}).get('end')}",
            'total_entries': stats.get('total_entries', 0),
            'metrics': stats,
            'correlations': correlations,
            'sample_entries': [entry['entry_text'] for entry in raw_data[:3] if entry.get('entry_text')]  # First 3 entries for context
        }
        
        prompt = f"""You are a health data analyst providing professional insights to a patient tracking their health metrics. 

        HEALTH DATA SUMMARY:
        {json.dumps(data_summary, indent=2, default=str)}

        Please provide a comprehensive health analysis in the following JSON format:

        {{
            "overall_health_score": [1-10 integer representing overall health this period],
            "key_insights": [
                "Professional insight 1 based on the data patterns",
                "Professional insight 2 about trends or correlations", 
                "Professional insight 3 about concerning patterns or improvements"
            ],
            "potential_triggers": [
                "Specific trigger 1 that may worsen symptoms based on patterns",
                "Specific trigger 2 identified from correlations"
            ],
            "recommendations": [
                "Actionable recommendation 1 based on data analysis",
                "Actionable recommendation 2 for improving health metrics",
                "Actionable recommendation 3 for tracking or lifestyle changes"
            ],
            "areas_of_concern": [
                "Health area 1 that needs attention based on data",
                "Health area 2 showing declining trends"
            ],
            "positive_patterns": [
                "Positive pattern 1 to reinforce",
                "Positive pattern 2 that's working well"
            ],
            "data_quality_note": "Brief note about data completeness and reliability of insights"
        }}

        ANALYSIS GUIDELINES:
        - Base insights strictly on the provided data patterns and correlations
        - Use professional, medical-adjacent language (not medical advice)
        - Focus on actionable patterns and trends
        - If correlations exist, explain their potential significance
        - Consider the overall health score based on averages and trends across all metrics
        - Be specific about which metrics support each insight
        - Note any limitations due to data quantity or quality

        Provide only valid JSON in response."""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Using GPT-4 for better analysis
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1  # Low temperature for consistent, analytical responses
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Parse the JSON response
            if ai_response.startswith('```json'):
                ai_response = ai_response.strip('```json').strip('```')
            
            return json.loads(ai_response)
            
        except Exception as e:
            print(f"AI insight generation error: {e}")
            # Return fallback insights
            return {
                "overall_health_score": 5,
                "key_insights": ["Unable to generate AI insights due to processing error."],
                "potential_triggers": [],
                "recommendations": ["Continue tracking your health metrics for better analysis."],
                "areas_of_concern": [],
                "positive_patterns": [],
                "data_quality_note": "AI analysis temporarily unavailable."
            }
    
    def generate_weekly_summary(self, user_id: int = 1) -> HealthSummary:
        """
        Main function to generate complete weekly health summary
        This orchestrates all our analysis steps
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
        
        # Step 5: Compile everything into HealthSummary object
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
            potential_triggers=ai_insights.get('potential_triggers', []),
            insights=ai_insights.get('key_insights', []),
            recommendations=ai_insights.get('recommendations', [])
        )
        
        print("✅ Weekly summary generated successfully")
        return summary

    def _create_empty_summary(self) -> HealthSummary:
        """Create empty summary when no data is available"""
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
            insights=["Insufficient data for analysis. Continue tracking to generate insights."],
            recommendations=["Add more diary entries throughout the week for better analysis."]
        )