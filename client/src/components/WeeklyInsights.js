import React, { useState, useEffect } from 'react';
import './WeeklyInsights.css';

function WeeklyInsights() {
    const [summaryData, setSummaryData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Load analytics data when component mounts
    useEffect(() => {
        loadWeeklySummary();
    }, []);

    const loadWeeklySummary = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('🔄 Loading weekly analytics...');
            
            const response = await fetch('http://localhost:5001/api/analytics/weekly-summary');
            const data = await response.json();
            
            if (data.success) {
                setSummaryData(data.summary);
                setLastUpdated(new Date().toLocaleString());
                console.log('✅ Analytics loaded successfully:', data.summary);
            } else {
                throw new Error(data.error || 'Failed to load analytics');
            }
            
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to get color for health metrics based on value and type
    const getMetricColor = (value, metricType) => {
        if (!value) return '#95a5a6';
        
        switch(metricType) {
            case 'mood':
            case 'energy':
                // Higher is better (1-10 scale)
                if (value >= 7) return '#27ae60';      // Good - Green
                if (value >= 5) return '#f39c12';      // Okay - Orange  
                return '#e74c3c';                      // Poor - Red
                
            case 'pain':
            case 'stress':
                // Lower is better (0-10 scale)
                if (value <= 3) return '#27ae60';      // Good - Green
                if (value <= 6) return '#f39c12';      // Moderate - Orange
                return '#e74c3c';                      // High - Red
                
            case 'sleep':
                // Hours of sleep
                if (value >= 7) return '#27ae60';      // Good - Green
                if (value >= 6) return '#f39c12';      // Okay - Orange
                return '#e74c3c';                      // Poor - Red
                
            default:
                return '#3498db';
        }
    };

    // Helper function to get trend emoji
    const getTrendEmoji = (trend) => {
        switch(trend) {
            case 'improving': return '📈';
            case 'declining': return '📉';
            case 'stable': return '➡️';
            default: return '❓';
        }
    };

    // Helper function to format metric names
    const formatMetricName = (metric) => {
        const names = {
            'mood': 'Mood',
            'energy': 'Energy Level', 
            'pain': 'Pain Level',
            'sleep': 'Sleep Quality',
            'stress': 'Stress Level'
        };
        return names[metric] || metric;
    };

    if (isLoading) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <h2>🧠 Weekly Health Insights</h2>
                    <p>AI-powered analysis of your health patterns</p>
                </div>
                <div className="loading-analytics">
                    <div className="loading-spinner"></div>
                    <p>🤖 AI is analyzing your health data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <h2>🧠 Weekly Health Insights</h2>
                    <p>AI-powered analysis of your health patterns</p>
                </div>
                <div className="analytics-error">
                    <h3>⚠️ Unable to Generate Insights</h3>
                    <p>{error}</p>
                    <button onClick={loadWeeklySummary} className="retry-btn">
                        🔄 Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!summaryData) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <h2>🧠 Weekly Health Insights</h2>
                    <p>AI-powered analysis of your health patterns</p>
                </div>
                <div className="no-data">
                    <h3>📊 Insufficient Data</h3>
                    <p>Add more diary entries throughout the week to generate AI insights.</p>
                </div>
            </div>
        );
    }

    const { period, health_metrics, correlations, insights } = summaryData;

    return (
        <div className="analytics-dashboard">
            {/* Header Section */}
            <div className="analytics-header">
                <h2>🧠 Weekly Health Insights</h2>
                <p className = 'mini-header'>AI-powered analysis of your health patterns</p>
                <div className="period-info">
                    <span className="period-dates">
                        📅 {period.start_date} to {period.end_date}
                    </span>
                    <span className="entry-count">
                        📝 {period.total_entries} entries analyzed
                    </span>
                    {lastUpdated && (
                        <span className="last-updated">
                            🕒 Updated: {lastUpdated}
                        </span>
                    )}
                </div>
                <button onClick={loadWeeklySummary} className="refresh-btn">
                    🔄 Refresh Analysis
                </button>
            </div>

            {/* Health Metrics Overview */}
            <div className="metrics-overview">
                <h3>📊 Health Metrics Summary</h3>
                <div className="metrics-grid">
                    {Object.entries(health_metrics).map(([metric, data]) => (
                        <div key={metric} className="metric-card">
                            <div className="metric-header">
                                <h4>{formatMetricName(metric)}</h4>
                                {data.trend && (
                                    <span className="trend-indicator">
                                        {getTrendEmoji(data.trend)}
                                    </span>
                                )}
                            </div>
                            <div className="metric-value">
                                <span 
                                    className="value-number"
                                    style={{ 
                                        color: getMetricColor(
                                            data.average || data.average_hours, 
                                            metric
                                        ) 
                                    }}
                                >
                                    {data.average || data.average_hours || 'N/A'}
                                </span>
                                <span className="value-scale">
                                    {data.scale || '/10'}
                                </span>
                            </div>
                            {data.trend && data.trend !== 'stable' && (
                                <div className="trend-text">
                                    <small>
                                        {data.trend === 'improving' ? '↗️ Improving' : '↘️ Declining'}
                                    </small>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Correlations Section */}
            {correlations && correlations.length > 0 && (
                <div className="correlations-section">
                    <h3>🔍 Pattern Analysis</h3>
                    <p className="section-description">
                        Relationships found between your health metrics:
                    </p>
                    <div className="correlations-list">
                        {correlations.map((correlation, index) => (
                            <div key={index} className="correlation-card">
                                <div className="correlation-header">
                                    <span className="correlation-strength">
                                        {correlation.strength === 'strong' ? '🔴' : 
                                         correlation.strength === 'moderate' ? '🟡' : '🟢'}
                                        {correlation.strength.toUpperCase()} CORRELATION
                                    </span>
                                    <span className="correlation-coefficient">
                                        r = {correlation.coefficient}
                                    </span>
                                </div>
                                <p className="correlation-insight">
                                    {correlation.insight}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Insights Section */}
            <div className="insights-section">
                <h3>🤖 AI Health Analysis</h3>
                
                {/* Key Findings */}
                {insights.key_findings && insights.key_findings.length > 0 && (
                    <div className="insights-subsection">
                        <h4>💡 Key Findings</h4>
                        <div className="insights-list">
                            {insights.key_findings.map((finding, index) => (
                                <div key={index} className="insight-item key-finding">
                                    <span className="insight-icon">🔍</span>
                                    <p>{finding}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Potential Triggers */}
                {insights.potential_triggers && insights.potential_triggers.length > 0 && (
                    <div className="insights-subsection">
                        <h4>⚠️ Potential Triggers</h4>
                        <div className="insights-list">
                            {insights.potential_triggers.map((trigger, index) => (
                                <div key={index} className="insight-item trigger">
                                    <span className="insight-icon">🚨</span>
                                    <p>{trigger}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                    <div className="insights-subsection">
                        <h4>💡 Recommendations</h4>
                        <div className="insights-list">
                            {insights.recommendations.map((recommendation, index) => (
                                <div key={index} className="insight-item recommendation">
                                    <span className="insight-icon">✅</span>
                                    <p>{recommendation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="analytics-footer">
                <p className="disclaimer">
                    ⚠️ <strong>Disclaimer:</strong> These insights are generated by AI based on your diary entries 
                    and are for informational purposes only. Always consult healthcare professionals for medical advice.
                </p>
            </div>
        </div>
    );
}

export default WeeklyInsights;