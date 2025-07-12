import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import './HealthCharts.css';

function HealthCharts({ entries }) {
    // Process data for charts - same logic but let's add summary stats
    const { chartData, summaryStats } = useMemo(() => {
        if (!entries || entries.length === 0) return { chartData: [], summaryStats: {} };
        
        // Process chart data
        const processedData = entries
            .map(entry => ({
                date: entry.date,
                mood: entry.aiData?.moodScore || (entry.mood === 'positive' ? 8 : entry.mood === 'negative' ? 3 : 5),
                energy: entry.aiData?.energyLevel || entry.energy || 5,
                pain: entry.aiData?.painLevel || entry.painLevel || 0,
                sleep: entry.aiData?.sleepHours || entry.sleepHours || 7,
                stress: entry.aiData?.stressLevel || entry.stressLevel || 5,
                sleepQuality: entry.aiData?.sleepQuality || entry.sleepQuality || 5
            }))
            .reverse() // Show chronological order
            .slice(-14); // Last 14 days for readability

        // Calculate summary statistics
        const stats = {
            avgMood: processedData.reduce((sum, d) => sum + d.mood, 0) / processedData.length,
            avgEnergy: processedData.reduce((sum, d) => sum + d.energy, 0) / processedData.length,
            avgPain: processedData.reduce((sum, d) => sum + d.pain, 0) / processedData.length,
            avgSleep: processedData.reduce((sum, d) => sum + d.sleep, 0) / processedData.length,
            totalEntries: processedData.length,
            goodDays: processedData.filter(d => d.mood >= 7 && d.pain <= 3).length,
            highPainDays: processedData.filter(d => d.pain >= 7).length,
            goodSleepDays: processedData.filter(d => d.sleep >= 7).length
        };

        return { chartData: processedData, summaryStats: stats };
    }, [entries]);

    // Calculate correlations for scatter plot
    const correlationData = useMemo(() => {
        return chartData.map(day => ({
            sleep: day.sleep,
            pain: day.pain,
            mood: day.mood,
            energy: day.energy,
            date: day.date
        }));
    }, [chartData]);

    // Helper function to format numbers
    const formatNumber = (num) => {
        return Number(num).toFixed(1);
    };

    // Helper function to get color based on metric type and value
    const getMetricColor = (value, type) => {
        switch(type) {
            case 'mood':
            case 'energy':
                return value >= 7 ? '#27ae60' : value >= 5 ? '#f39c12' : '#e74c3c';
            case 'pain':
                return value <= 3 ? '#27ae60' : value <= 6 ? '#f39c12' : '#e74c3c';
            case 'sleep':
                return value >= 7 ? '#27ae60' : value >= 6 ? '#f39c12' : '#e74c3c';
            default:
                return '#3498db';
        }
    };

    if (!chartData || chartData.length === 0) {
        return (
            <div className="no-data-container">
                <h3 className="no-data-title">📊 No Data to Visualize</h3>
                <p className="no-data-text">Add more diary entries to see health trend charts</p>
            </div>
        );
    }

    return (
        <div className="health-charts-container">
            {/* Compact Header */}
            <div className="charts-header">
                <h2 className="charts-title">📈 Health Analytics Visualization</h2>
                <p className="charts-subtitle">AI-powered pattern analysis and trend detection</p>
            </div>

            {/* Quick Stats Summary */}
            <div className="charts-stats-row">
                <div className="stat-card mood-stat">
                    <span className="stat-value">{formatNumber(summaryStats.avgMood)}</span>
                    <span className="stat-label">Avg Mood</span>
                </div>
                <div className="stat-card energy-stat">
                    <span className="stat-value">{formatNumber(summaryStats.avgEnergy)}</span>
                    <span className="stat-label">Avg Energy</span>
                </div>
                <div className="stat-card pain-stat">
                    <span className="stat-value">{formatNumber(summaryStats.avgPain)}</span>
                    <span className="stat-label">Avg Pain</span>
                </div>
                <div className="stat-card sleep-stat">
                    <span className="stat-value">{formatNumber(summaryStats.avgSleep)}h</span>
                    <span className="stat-label">Avg Sleep</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{summaryStats.goodDays}</span>
                    <span className="stat-label">Good Days</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{summaryStats.totalEntries}</span>
                    <span className="stat-label">Total Days</span>
                </div>
            </div>

            {/* Compact Charts Grid - 2x2 Layout */}
            <div className="charts-grid">
                
                {/* Chart 1: Mood & Energy Trends */}
                <div className="chart-card">
                    <h3 className="chart-section-title">😊 Mood & Energy Trends</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#6c757d"
                                    fontSize={10}
                                    tick={false}
                                />
                                <YAxis 
                                    stroke="#6c757d"
                                    fontSize={10}
                                    domain={[0, 10]}
                                    width={30}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="mood" 
                                    stroke="#28a745" 
                                    strokeWidth={2}
                                    dot={{ fill: '#28a745', strokeWidth: 1, r: 3 }}
                                    name="Mood"
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="energy" 
                                    stroke="#007bff" 
                                    strokeWidth={2}
                                    dot={{ fill: '#007bff', strokeWidth: 1, r: 3 }}
                                    name="Energy"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Pain & Stress Analysis */}
                <div className="chart-card">
                    <h3 className="chart-section-title">🩹 Pain & Stress Levels</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#6c757d"
                                    fontSize={10}
                                    tick={false}
                                />
                                <YAxis 
                                    stroke="#6c757d"
                                    fontSize={10}
                                    domain={[0, 10]}
                                    width={30}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar 
                                    dataKey="pain" 
                                    fill="#dc3545" 
                                    name="Pain Level"
                                    radius={[1, 1, 0, 0]}
                                />
                                <Bar 
                                    dataKey="stress" 
                                    fill="#fd7e14" 
                                    name="Stress Level"
                                    radius={[1, 1, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 3: Sleep vs Pain Correlation */}
                <div className="chart-card">
                    <h3 className="chart-section-title">😴 Sleep vs Pain Correlation</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={180}>
                            <ScatterChart data={correlationData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                                <XAxis 
                                    type="number"
                                    dataKey="sleep" 
                                    name="Sleep Hours"
                                    stroke="#6c757d"
                                    fontSize={10}
                                    domain={[0, 12]}
                                    width={30}
                                />
                                <YAxis 
                                    type="number"
                                    dataKey="pain" 
                                    name="Pain Level"
                                    stroke="#6c757d"
                                    fontSize={10}
                                    domain={[0, 10]}
                                    width={30}
                                />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value, name) => [value, name]}
                                />
                                <Scatter 
                                    name="Sleep vs Pain" 
                                    data={correlationData} 
                                    fill="#8884d8"
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                        <div className="correlation-note">
                            📊 Look for patterns: less sleep → more pain?
                        </div>
                    </div>
                </div>

                {/* Chart 4: Sleep Quality Overview */}
                <div className="chart-card">
                    <h3 className="chart-section-title">🛏️ Sleep Pattern</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#6c757d"
                                    fontSize={10}
                                    tick={false}
                                />
                                <YAxis 
                                    stroke="#6c757d"
                                    fontSize={10}
                                    domain={[0, 12]}
                                    width={30}
                                />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="sleep" 
                                    stroke="#9b59b6" 
                                    strokeWidth={3}
                                    dot={{ fill: '#9b59b6', strokeWidth: 1, r: 3 }}
                                    name="Sleep Hours"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="correlation-note">
                            Target: 7-9 hours per night
                        </div>
                    </div>
                </div>

            </div>

            {/* Compact AI Insights */}
            <div className="ai-insights-box">
                <h4 className="ai-insights-title">
                    🤖 Quick AI Analysis
                </h4>
                <p className="ai-insights-text">
                    Analyzed {chartData.length} days: {summaryStats.goodDays} good days, {summaryStats.highPainDays} high-pain days. 
                    Average sleep: {formatNumber(summaryStats.avgSleep)}h 
                    {summaryStats.avgSleep < 7 ? ' (⚠️ Below recommended 7-9h)' : ' (✅ Good range)'}
                    {summaryStats.avgPain > 5 ? ' • High pain levels detected' : ''}
                </p>
            </div>
        </div>
    );
}

export default HealthCharts;