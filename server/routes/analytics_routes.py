# routes/analytics_routes.py

from flask import Blueprint, request, jsonify
from utils.db_utils import get_db_connection
from openai import OpenAI
import os
from datetime import datetime
from analytics_engine import HealthAnalyticsEngine

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

analytics_engine = HealthAnalyticsEngine(
    openai_api_key=os.getenv('OPENAI_API_KEY')
)

def register_analytics_routes(app):
    """Register the analytics blueprint with the app"""
    app.register_blueprint(analytics_bp)
    print("✅ Analytics routes registered")
    return app

@analytics_bp.route('/summary', methods=['GET'])
def get_health_summary():
    """Get health analytics summary"""
    try:
        days = request.args.get('days', 30)
        user_id = request.args.get('user_id', 1, type=int)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
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

@analytics_bp.route('/weekly-summary', methods=['GET'])
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

@analytics_bp.route('/correlations', methods=['GET'])
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

@analytics_bp.route('/trends', methods=['GET'])
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