import React, { useState, useEffect } from 'react';
import './WeeklyInsights.css';

function WeeklyInsights({ lastEntryTimestamp }) {
    const [summaryData, setSummaryData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isUsingCache, setIsUsingCache] = useState(false);

    // Cache management functions
    const getCacheKey = () => 'health_insights_cache';
    const getTimestampKey = () => 'health_insights_timestamp';

    const getCachedData = () => {
        try {
            const cached = localStorage.getItem(getCacheKey());
            const timestamp = localStorage.getItem(getTimestampKey());
            
            if (cached && timestamp) {
                return {
                    data: JSON.parse(cached),
                    timestamp: timestamp,
                    cacheTimestamp: parseInt(timestamp)
                };
            }
        } catch (error) {
            console.error('Error reading cache:', error);
        }
        return null;
    };

    const setCachedData = (data, timestamp) => {
        try {
            localStorage.setItem(getCacheKey(), JSON.stringify(data));
            localStorage.setItem(getTimestampKey(), timestamp.toString());
            console.log('✅ AI insights cached successfully');
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    };

    const shouldRefreshCache = () => {
        const cached = getCachedData();
        
        // No cache exists - need to fetch
        if (!cached) {
            console.log('🔄 No cache found, fetching fresh data...');
            return true;
        }

        // Check if new entries were added since last cache
        if (lastEntryTimestamp && lastEntryTimestamp > cached.cacheTimestamp) {
            console.log('🔄 New diary entries detected, refreshing insights...');
            return true;
        }

        // Cache is still valid
        console.log('✅ Using cached AI insights (no new entries)');
        return false;
    };

    // Load analytics data when component mounts or when entries are updated
    useEffect(() => {
        loadWeeklySummary();
    }, [lastEntryTimestamp]); // Re-run when new entries are added

    const loadWeeklySummary = async (forceRefresh = false) => {
        setError(null);
        
        // Check if we can use cached data (unless forcing refresh)
        if (!forceRefresh && !shouldRefreshCache()) {
            const cached = getCachedData();
            if (cached) {
                setSummaryData(cached.data);
                setLastUpdated(new Date(cached.cacheTimestamp).toLocaleString());
                setIsUsingCache(true);
                return;
            }
        }

        // Fetch fresh data from API
        setIsLoading(true);
        setIsUsingCache(false);
        
        try {
            console.log('🔄 Loading fresh weekly analytics...');
            
            const response = await fetch('http://localhost:5001/api/analytics/weekly-summary');
            const data = await response.json();
            
            if (data.success) {
                const now = Date.now();
                setSummaryData(data.summary);
                setLastUpdated(new Date().toLocaleString());
                
                // Cache the results
                setCachedData(data.summary, now);
                
                console.log('✅ Fresh analytics loaded and cached:', data.summary);
            } else {
                throw new Error(data.error || 'Failed to load analytics');
            }
            
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            setError(error.message);
            
            // Try to fall back to cached data if available
            const cached = getCachedData();
            if (cached) {
                console.log('⚠️ Using cached data as fallback');
                setSummaryData(cached.data);
                setLastUpdated(new Date(cached.cacheTimestamp).toLocaleString());
                setIsUsingCache(true);
                setError(`Network error - showing cached data from ${new Date(cached.cacheTimestamp).toLocaleString()}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = () => {
        loadWeeklySummary(true); // Force refresh
    };

    const clearCache = () => {
        try {
            localStorage.removeItem(getCacheKey());
            localStorage.removeItem(getTimestampKey());
            setSummaryData(null);
            setLastUpdated(null);
            setIsUsingCache(false);
            console.log('🗑️ Cache cleared');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <h2>🧠 Weekly Health Insights</h2>
                    <p>AI-powered analysis of your health patterns</p>
                </div>
                <div className="loading-analytics">
                    <div className="loading-spinner"></div>
                    <h3>🤖 Analyzing Your Health Data...</h3>
                    <p>GPT-4 is processing your diary entries and finding patterns...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !summaryData) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                <h2>🧠 Weekly Health Insights</h2>
                <p>AI-powered analysis of your health patterns</p>
                </div>
                <div className="analytics-error">
                    <h3>⚠️ Unable to Generate Insights</h3>
                    <p>{error}</p>
                    <button onClick={handleRefresh} className="retry-btn">
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

    // Helper function to safely format numbers
    const formatMetricValue = (value, defaultText = 'N/A') => {
        if (value === null || value === undefined) return defaultText;
        if (typeof value === 'number' && !isNaN(value)) {
            return value.toFixed(1);
        }
        if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            return parseFloat(value).toFixed(1);
        }
        return defaultText;
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
                if (value <= 6) return '#f39c12';      // Okay - Orange
                return '#e74c3c';                      // Poor - Red
                
            default:
                return '#3498db';                      // Neutral - Blue
        }
    };

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
                            {isUsingCache && <span className="cache-indicator"> (cached)</span>}
                        </span>
                    )}
                </div>
                <div className="analytics-controls">
                    <button 
                        onClick={handleRefresh} 
                        className="refresh-btn"
                        disabled={isLoading}
                    >
                        🔄 Refresh Insights
                    </button>
                    <button 
                        onClick={clearCache} 
                        className="clear-cache-btn"
                        title="Clear cached data"
                    >
                        🗑️ Clear Cache
                    </button>
                </div>
                {error && isUsingCache && (
                    <div className="cache-warning">
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* Health Metrics Overview */}
            <div className="metrics-overview">
                <h3>📊 Health Metrics Summary</h3>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <h4>😊 Average Mood</h4>
                        <div 
                            className="metric-value"
                            style={{ color: getMetricColor(health_metrics.mood?.average, 'mood') }}
                        >
                            {formatMetricValue(health_metrics.mood?.average)}/10
                        </div>
                        <span className="metric-trend">{health_metrics.mood?.trend || 'stable'}</span>
                    </div>
                    
                    <div className="metric-card">
                        <h4>⚡ Average Energy</h4>
                        <div 
                            className="metric-value"
                            style={{ color: getMetricColor(health_metrics.energy?.average, 'energy') }}
                        >
                            {formatMetricValue(health_metrics.energy?.average)}/10
                        </div>
                        <span className="metric-trend">{health_metrics.energy?.trend || 'stable'}</span>
                    </div>
                    
                    <div className="metric-card">
                        <h4>🤕 Average Pain</h4>
                        <div 
                            className="metric-value"
                            style={{ color: getMetricColor(health_metrics.pain?.average, 'pain') }}
                        >
                            {formatMetricValue(health_metrics.pain?.average)}/10
                        </div>
                        <span className="metric-trend">{health_metrics.pain?.trend || 'stable'}</span>
                    </div>
                    
                    <div className="metric-card">
                        <h4>😴 Average Sleep</h4>
                        <div className="metric-value" style={{ color: '#3498db' }}>
                            {formatMetricValue(health_metrics.sleep?.average_hours)}h
                        </div>
                        <span className="metric-trend">nightly</span>
                    </div>
                    
                    <div className="metric-card">
                        <h4>😰 Average Stress</h4>
                        <div 
                            className="metric-value"
                            style={{ color: getMetricColor(health_metrics.stress?.average, 'stress') }}
                        >
                            {formatMetricValue(health_metrics.stress?.average)}/10
                        </div>
                        <span className="metric-trend">{health_metrics.stress?.trend || 'stable'}</span>
                    </div>
                </div>
            </div>

            {/* Correlations */}
            {correlations && correlations.length > 0 && (
                <div className="correlations-section">
                    <h3>🔗 Health Pattern Correlations</h3>
                    <div className="correlations-grid">
                        {correlations.map((correlation, index) => (
                            <div key={index} className="correlation-card">
                                <div className="correlation-header">
                                    <span className="correlation-metrics">
                                        {correlation.metric1} ↔ {correlation.metric2}
                                    </span>
                                    <span className={`correlation-strength ${correlation.strength}`}>
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
                {insights.key_insights && insights.key_insights.length > 0 && (
                    <div className="insights-subsection">
                        <h4>💡 Key Insights</h4>
                        <div className="insights-list">
                            {insights.key_insights.map((finding, index) => (
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