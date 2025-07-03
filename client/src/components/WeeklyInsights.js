import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import './WeeklyInsights.css';

function WeeklyInsights({ lastEntryTimestamp, entries, selectedProfile }) {
    const [summaryData, setSummaryData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isUsingCache, setIsUsingCache] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    // Cache management functions
    const getCacheKey = () => selectedProfile ? `health_insights_cache_${selectedProfile.id}` : 'health_insights_cache';
    const getTimestampKey = () => selectedProfile ? `health_insights_timestamp_${selectedProfile.id}` : 'health_insights_timestamp';

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
        if (!selectedProfile) {
            return false;
        }

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

    const toggleSection = (sectionKey) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }));
    };

    const loadWeeklySummary = async (forceRefresh = false) => {
        console.log('🔄 loadWeeklySummary called, forceRefresh:', forceRefresh);

        if (!selectedProfile) {
            console.log('❌ No profile selected for WeeklyInsights');
            setError('Please select a profile to view insights');
            return;
        }

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
            
            const data = await apiService.getHealthSummary(selectedProfile, 30);
            
            
            console.log('📊 Weekly insights API response:', data);
            
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
        if (selectedProfile) {
            // Clear previous data when switching profiles
            setSummaryData(null);
            setLastUpdated(null);
            setIsUsingCache(false);
            setError(null);
            
            // Load data for new profile
            loadWeeklySummary();
        }
    }, [selectedProfile?.id, lastEntryTimestamp]);

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

    if (!selectedProfile) {
        return (
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <h2>🧠 Weekly Health Insights</h2>
                    <p>AI-powered analysis of your health patterns</p>
                </div>
                <div className="no-profile">
                    <h3>👤 No Profile Selected</h3>
                    <p>Please select a profile to view AI insights.</p>
                </div>
            </div>
        );
    }

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
    
    <div className="insights-card-grid">
        {/* Key Insights Card */}
        {insights.key_insights && insights.key_insights.length > 0 && (
            <div className="insight-card key-findings">
                <div className="card-header">
                    <div className="card-icon">📊</div>
                    <div className="card-title">Key Health Patterns</div>
                </div>
                <div className="card-content">
                    <ul className="insight-bullets">
                        {(expandedSections.keyInsights ? insights.key_insights : insights.key_insights.slice(0, 4))
                            .map((insight, index) => (
                            <li key={index}>{insight}</li>
                        ))}
                    </ul>
                    {insights.key_insights.length > 4 && (
                        <button 
                            className="show-more-btn"
                            onClick={() => toggleSection('keyInsights')}
                        >
                            {expandedSections.keyInsights 
                                ? '- Show less' 
                                : `+ ${insights.key_insights.length - 4} more insights`
                            }
                        </button>
                    )}
                </div>
                <div className="card-meta">
                    <span className="finding-count">{insights.key_insights.length} Findings Identified</span>
                    <span className="confidence-badge">High Confidence</span>
                </div>
            </div>
        )}

        {/* Areas of Concern Card */}
        {insights.areas_of_concern && insights.areas_of_concern.length > 0 && (
            <div className="insight-card concerns">
                <div className="card-header">
                    <div className="card-icon">⚠️</div>
                    <div className="card-title">Areas Requiring Attention</div>
                </div>
                <div className="card-content">
                    <ul className="insight-bullets">
                        {(expandedSections.concerns ? insights.areas_of_concern : insights.areas_of_concern.slice(0, 3))
                            .map((concern, index) => (
                            <li key={index}>{concern}</li>
                        ))}
                    </ul>
                    {insights.areas_of_concern.length > 3 && (
                        <button 
                            className="show-more-btn"
                            onClick={() => toggleSection('concerns')}
                        >
                            {expandedSections.concerns 
                                ? '- Show less' 
                                : `+ ${insights.areas_of_concern.length - 3} more areas`
                            }
                        </button>
                    )}
                </div>
                <div className="card-meta">
                    <span className="finding-count">{insights.areas_of_concern.length} Areas Identified</span>
                    <span className="confidence-badge">Action Required</span>
                </div>
            </div>
        )}

        {/* Positive Patterns Card */}
        {insights.positive_patterns && insights.positive_patterns.length > 0 && (
            <div className="insight-card positive">
                <div className="card-header">
                    <div className="card-icon">✅</div>
                    <div className="card-title">Positive Developments</div>
                </div>
                <div className="card-content">
                    <ul className="insight-bullets">
                        {(expandedSections.positive ? insights.positive_patterns : insights.positive_patterns.slice(0, 3))
                            .map((pattern, index) => (
                            <li key={index}>{pattern}</li>
                        ))}
                    </ul>
                    {insights.positive_patterns.length > 3 && (
                        <button 
                            className="show-more-btn"
                            onClick={() => toggleSection('positive')}
                        >
                            {expandedSections.positive 
                                ? '- Show less' 
                                : `+ ${insights.positive_patterns.length - 3} more patterns`
                            }
                        </button>
                    )}
                </div>
                <div className="card-meta">
                    <span className="finding-count">{insights.positive_patterns.length} Positive Trends</span>
                    <span className="confidence-badge">Validated</span>
                </div>
            </div>
        )}

        {/* Health Triggers Card - Enhanced with Acute Trigger Separation */}
        {insights.potential_triggers && insights.potential_triggers.length > 0 && (
            <div className="insight-card triggers">
                <div className="card-header">
                    <div className="card-icon">🚨</div>
                    <div className="card-title">Health Triggers</div>
                </div>
                <div className="card-content">
                    {(() => {
                        // Separate acute triggers from other triggers
                        const acuteTriggers = insights.potential_triggers.filter(trigger => 
                            trigger.toLowerCase().includes('acute trigger')
                        );
                        const otherTriggers = insights.potential_triggers.filter(trigger => 
                            !trigger.toLowerCase().includes('acute trigger')
                        );

                        const showingAcute = expandedSections.acuteTriggers ? acuteTriggers : acuteTriggers.slice(0, 2);
                        const showingOther = expandedSections.otherTriggers ? otherTriggers : otherTriggers.slice(0, 2);

                        return (
                            <>
                                {acuteTriggers.length > 0 && (
                                    <div className="trigger-subsection">
                                        <h5 className="subsection-title">🔥 Acute Triggers</h5>
                                        <ul className="insight-bullets acute">
                                            {showingAcute.map((trigger, index) => (
                                                <li key={index}>
                                                    {trigger.replace(/^Acute trigger insight \d+:\s*/i, '')}
                                                </li>
                                            ))}
                                        </ul>
                                        {acuteTriggers.length > 2 && (
                                            <button 
                                                className="show-more-btn"
                                                onClick={() => toggleSection('acuteTriggers')}
                                            >
                                                {expandedSections.acuteTriggers 
                                                    ? '- Show less' 
                                                    : `+ ${acuteTriggers.length - 2} more acute triggers`
                                                }
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                {otherTriggers.length > 0 && (
                                    <div className="trigger-subsection">
                                        <h5 className="subsection-title">⚡ General Triggers</h5>
                                        <ul className="insight-bullets">
                                            {showingOther.map((trigger, index) => (
                                                <li key={index}>{trigger}</li>
                                            ))}
                                        </ul>
                                        {otherTriggers.length > 2 && (
                                            <button 
                                                className="show-more-btn"
                                                onClick={() => toggleSection('otherTriggers')}
                                            >
                                                {expandedSections.otherTriggers 
                                                    ? '- Show less' 
                                                    : `+ ${otherTriggers.length - 2} more general triggers`
                                                }
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
                <div className="card-meta">
                    <span className="finding-count">{insights.potential_triggers.length} Triggers Mapped</span>
                    <span className="confidence-badge">Statistically Significant</span>
                </div>
            </div>
        )}

        {/* Recommendations Card - Enhanced with Priorities */}
        {insights.recommendations && insights.recommendations.length > 0 && (
            <div className="insight-card recommendations full-width">
                <div className="card-header">
                    <div className="card-icon">🎯</div>
                    <div className="card-title">Strategic Recommendations</div>
                </div>
                <div className="card-content">
                    <div className="recommendations-grid">
                        <div className="priority-section">
                            <h5 className="subsection-title">🚀 High Priority</h5>
                            <ul className="insight-bullets priority">
                                {(expandedSections.highPriority ? insights.recommendations : insights.recommendations.slice(0, 2))
                                    .map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                ))}
                            </ul>
                            {insights.recommendations.length > 2 && (
                                <button 
                                    className="show-more-btn"
                                    onClick={() => toggleSection('highPriority')}
                                >
                                    {expandedSections.highPriority 
                                        ? '- Show less' 
                                        : `+ ${insights.recommendations.length - 2} more recommendations`
                                    }
                                </button>
                            )}
                        </div>
                        
                        {!expandedSections.highPriority && insights.recommendations.length > 2 && (
                            <div className="priority-section">
                                <h5 className="subsection-title">📋 Additional Actions</h5>
                                <ul className="insight-bullets">
                                    {insights.recommendations.slice(2, 4).map((rec, index) => (
                                        <li key={index + 2}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card-meta">
                    <span className="finding-count">{insights.recommendations.length} Action Items</span>
                    <span className="confidence-badge">Evidence-Based</span>
                </div>
            </div>
        )}
    </div>
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