import json
from unittest.mock import patch, MagicMock
from utils.db_utils import get_db_connection
from tests.conftest import seed_family_user


def seed_health_metrics_for_analytics(user_id):
    """Insert sample health metrics for analytics routes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert raw entries and health metrics
    cursor.execute("""
        INSERT INTO raw_entries (user_id, entry_text, entry_date, created_at)
        VALUES (%s, 'Feeling good today', CURRENT_DATE, NOW())
        RETURNING id
    """, (user_id,))
    raw_entry_id = cursor.fetchone()['id']

    cursor.execute("""
        INSERT INTO health_metrics (
            user_id, raw_entry_id, entry_date, mood_score,
            energy_level, pain_level, sleep_quality,
            sleep_hours, stress_level, ai_confidence, created_at
        ) VALUES (%s, %s, CURRENT_DATE, 7, 8, 3, 6, 7.5, 4, 0.9, NOW())
    """, (user_id, raw_entry_id))

    conn.commit()
    conn.close()


# ---------------------------
# /SUMMARY TESTS
# ---------------------------

def test_get_health_summary_success(client, auth_token):
    """Test health summary endpoint."""
    # Seed data
    _, user_id = seed_family_user()
    seed_health_metrics_for_analytics(user_id)

    response = client.get(
        f"/api/analytics/summary?days=30&user_id={user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()

    assert response.status_code == 200
    assert "summary" in data
    assert "avg_mood" in data["summary"]


def test_get_health_summary_no_data(client, auth_token):
    """Should return empty summary when no data exists."""
    _, user_id = seed_family_user()
    response = client.get(
        f"/api/analytics/summary?days=30&user_id={user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert "summary" in response.get_json()


# ---------------------------
# /WEEKLY-SUMMARY TESTS
# ---------------------------

@patch("routes.analytics_routes.analytics_engine.generate_weekly_summary")
def test_get_weekly_summary_success(mock_generate_summary, client, auth_token):
    """Test weekly summary endpoint with mocked analytics engine."""
    mock_summary = MagicMock()
    mock_summary.period_start = "2025-07-01"
    mock_summary.period_end = "2025-07-07"
    mock_summary.total_entries = 5
    mock_summary.avg_mood = 7.2
    mock_summary.mood_trend = "upward"
    mock_summary.avg_energy = 6.8
    mock_summary.energy_trend = "stable"
    mock_summary.avg_pain = 2.5
    mock_summary.pain_trend = "downward"
    mock_summary.avg_sleep_hours = 7.5
    mock_summary.avg_stress = 3.5
    mock_summary.correlations = [{"factor": "sleep", "impact": "energy"}]
    mock_summary.insights = ["Great week!"]
    mock_summary.potential_triggers = ["junk food"]
    mock_summary.recommendations = ["Sleep earlier"]
    mock_summary.areas_of_concern = ["low energy"]
    mock_summary.positive_patterns = ["regular exercise"]

    mock_generate_summary.return_value = mock_summary

    response = client.get(
        "/api/analytics/weekly-summary?user_id=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert "health_metrics" in data
    assert data["health_metrics"]["mood"]["trend"] == "upward"
    assert data["insights"]["key_insights"] == ["Great week!"]


@patch("routes.analytics_routes.analytics_engine.generate_weekly_summary")
def test_get_weekly_summary_failure(mock_generate_summary, client, auth_token):
    """Simulate exception in analytics engine."""
    mock_generate_summary.side_effect = Exception("AI Engine Failure")

    response = client.get(
        "/api/analytics/weekly-summary?user_id=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()

    assert response.status_code == 500
    assert data["success"] is False
    assert "Failed to generate weekly summary" in data["error"]


# ---------------------------
# /CORRELATIONS TESTS
# ---------------------------

@patch("routes.analytics_routes.analytics_engine.get_weekly_data")
@patch("routes.analytics_routes.analytics_engine.find_correlations")
def test_get_health_correlations_success(mock_find, mock_data, client, auth_token):
    mock_data.return_value = [{"mood_score": 7}]
    mock_find.return_value = [{"factor": "sleep", "impact": "energy"}]

    response = client.get(
        "/api/analytics/correlations?user_id=1&weeks=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert len(data["correlations"]) > 0


@patch("routes.analytics_routes.analytics_engine.get_weekly_data", side_effect=Exception("DB error"))
def test_get_health_correlations_failure(mock_data, client, auth_token):
    response = client.get(
        "/api/analytics/correlations?user_id=1&weeks=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 500
    assert "Failed to analyze correlations" in response.get_json()["error"]


# ---------------------------
# /TRENDS TESTS
# ---------------------------

@patch("routes.analytics_routes.analytics_engine.get_weekly_data")
@patch("routes.analytics_routes.analytics_engine.calculate_basic_stats")
def test_get_health_trends_success(mock_stats, mock_data, client, auth_token):
    mock_data.return_value = [{"mood_score": 7}]
    mock_stats.return_value = {
        "date_range": {"start": "2025-07-01", "end": "2025-07-07"},
        "mood": {"average": 7},
        "energy": {"average": 6},
        "pain": {"average": 2},
        "sleep": {"average_hours": 7},
        "stress": {"average": 3}
    }

    response = client.get(
        "/api/analytics/trends?user_id=1&weeks=2",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert "trends" in data
    assert len(data["trends"]) == 2


@patch("routes.analytics_routes.analytics_engine.get_weekly_data", side_effect=Exception("Trend calc failed"))
def test_get_health_trends_failure(mock_data, client, auth_token):
    response = client.get(
        "/api/analytics/trends?user_id=1&weeks=2",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 500
    assert "Failed to analyze trends" in response.get_json()["error"]
