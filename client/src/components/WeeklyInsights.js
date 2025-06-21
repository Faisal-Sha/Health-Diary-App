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
        
        if (!cached) {
            console.log('🔄 No cache found, fetching fresh data...');
            return true;
        }

        if (lastEntryTimestamp && lastEntryTimestamp > cached.cacheTimestamp) {
            console.log('🔄 New diary entries detected, refreshing insights...');
            return true;
        }

        console.log('✅ Using cached AI insights (no new entries)');
        return false;
    };

    const loadWeeklySummary = async (forceRefresh = false) => {
        console.log('🔄 loadWeeklySummary called, forceRefresh:', forceRefresh);

        if (!forceRefresh && !shouldRefreshCache()) {
            const cached = getCachedData();
            if (cached) {
                setSummaryData(cached.data);
                setLastUpdated(cached.timestamp);
                setIsUsingCache(true);
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        setIsUsingCache(false);

        try {
            console.log('🚀 Fetching fresh weekly insights from API...');
            
            const response = await fetch('http://localhost:5001/api/analytics/weekly-summary?user_id=1');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📊 Weekly insights API response:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const now = new Date().toLocaleString();
            
            setSummaryData(data);
            setLastUpdated(now);
            
            // Cache the successful result
            setCachedData(data, Date.now());
            
            console.log('✅ Weekly insights loaded and cached successfully');
            
        } catch (error) {
            console.error('❌ Failed to load weekly insights:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWeeklySummary();
    }, [lastEntryTimestamp]);

    const handleRefresh = () => {
        loadWeeklySummary(true);
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

    // Helper function to safely format numbers
    const formatMetricValue = (value, scale = "") => {
        if (value === null || value === undefined || isNaN(value)) {
            return { number: "N/A", scale: "" };
        }
        return { number: Number(value).toFixed(1), scale };
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

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="analytics-header">
                <h2>🧠 Weekly Health Insights</h2>
                <p className="mini-header">AI-powered analysis of your health patterns</p>
                <div className="period-info">
                    <span className="period-dates">
                        📅 {period?.start_date} to {period?.end_date}
                    </span>
                    <span className="entry-count">
                        📝 {period?.total_entries} entries analyzed
                    </span>
                    {lastUpdated && (
                        <span className="last-updated">
                            🕒 Updated: {lastUpdated}
                        </span>
                    )}
                    {isUsingCache && (
                        <span className="cache-indicator">
                            💾 Using cached results
                        </span>
                    )}
                </div>
                <div className="header-actions">
                    <button onClick={handleRefresh} className="refresh-btn">
                        🔄 Refresh Insights
                    </button>
                    <button onClick={clearCache} className="clear-cache-btn">
                        🗑️ Clear Cache
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            {health_metrics && (
                <div className="metrics-overview">
                    <h3>📊 Health Metrics Summary</h3>
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-header">
                                <h4>😊 Average Mood</h4>
                                <span className="trend-indicator">
                                    {health_metrics.mood?.trend === 'improving' ? '📈' : 
                                     health_metrics.mood?.trend === 'declining' ? '📉' : '➡️'}
                                </span>
                            </div>
                            <div className="metric-value">
                                <span className="value-number" style={{ color: '#27ae60' }}>
                                    {formatMetricValue(health_metrics.mood?.average).number}
                                </span>
                                <span className="value-scale">/10</span>
                            </div>
                            <div className="trend-text">
                                <small>{health_metrics.mood?.trend || 'stable'}</small>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h4>⚡ Average Energy</h4>
                                <span className="trend-indicator">
                                    {health_metrics.energy?.trend === 'improving' ? '📈' : 
                                     health_metrics.energy?.trend === 'declining' ? '📉' : '➡️'}
                                </span>
                            </div>
                            <div className="metric-value">
                                <span className="value-number" style={{ color: '#3498db' }}>
                                    {formatMetricValue(health_metrics.energy?.average).number}
                                </span>
                                <span className="value-scale">/10</span>
                            </div>
                            <div className="trend-text">
                                <small>{health_metrics.energy?.trend || 'stable'}</small>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h4>🩹 Average Pain</h4>
                                <span className="trend-indicator">
                                    {health_metrics.pain?.trend === 'improving' ? '📉' : 
                                     health_metrics.pain?.trend === 'declining' ? '📈' : '➡️'}
                                </span>
                            </div>
                            <div className="metric-value">
                                <span className="value-number" style={{ color: '#e74c3c' }}>
                                    {formatMetricValue(health_metrics.pain?.average).number}
                                </span>
                                <span className="value-scale">/10</span>
                            </div>
                            <div className="trend-text">
                                <small>{health_metrics.pain?.trend || 'stable'}</small>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h4>😴 Average Sleep</h4>
                                <span className="trend-indicator">
                                    {health_metrics.sleep?.trend === 'improving' ? '📈' : 
                                     health_metrics.sleep?.trend === 'declining' ? '📉' : '➡️'}
                                </span>
                            </div>
                            <div className="metric-value">
                                <span className="value-number" style={{ color: '#9b59b6' }}>
                                    {formatMetricValue(health_metrics.sleep?.average_hours).number}
                                </span>
                                <span className="value-scale">hrs</span>
                            </div>
                            <div className="trend-text">
                                <small>{health_metrics.sleep?.trend || 'stable'}</small>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h4>😰 Average Stress</h4>
                                <span className="trend-indicator">
                                    {health_metrics.stress?.trend === 'improving' ? '📉' : 
                                     health_metrics.stress?.trend === 'declining' ? '📈' : '➡️'}
                                </span>
                            </div>
                            <div className="metric-value">
                                <span className="value-number" style={{ color: '#f39c12' }}>
                                    {formatMetricValue(health_metrics.stress?.average).number}
                                </span>
                                <span className="value-scale">/10</span>
                            </div>
                            <div className="trend-text">
                                <small>{health_metrics.stress?.trend || 'stable'}</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Correlations */}
            {correlations && correlations.length > 0 && (
                <div className="correlations-section">
                    <h3>🔗 Health Correlations</h3>
                    <p className="section-description">
                        Statistical relationships discovered between your health metrics
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

            {/* AI Insights Section - ALL SECTIONS INCLUDED */}
            <div className="insights-section">
                <h3>🤖 AI Health Analysis</h3>
                
                {/* Key Insights */}
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

                {/* Areas of Concern - ADDED THIS MISSING SECTION */}
                {insights.areas_of_concern && insights.areas_of_concern.length > 0 && (
                    <div className="insights-subsection">
                        <h4>🎯 Areas of Concern</h4>
                        <div className="insights-list">
                            {insights.areas_of_concern.map((concern, index) => (
                                <div key={index} className="insight-item concern">
                                    <span className="insight-icon">⚠️</span>
                                    <p>{concern}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Positive Patterns - ADDED THIS MISSING SECTION */}
                {insights.positive_patterns && insights.positive_patterns.length > 0 && (
                    <div className="insights-subsection">
                        <h4>✅ Positive Patterns</h4>
                        <div className="insights-list">
                            {insights.positive_patterns.map((pattern, index) => (
                                <div key={index} className="insight-item positive">
                                    <span className="insight-icon">🌟</span>
                                    <p>{pattern}</p>
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