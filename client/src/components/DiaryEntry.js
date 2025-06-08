import React from 'react';
import "./DiaryEntry.css";

function DiaryEntry({entry, deleteEntry}) {
    // Helper function to format AI scores for display
    const formatScore = (score, maxScore = 10) => {
        if (!score) return 'N/A';
        return `${score}/${maxScore}`;
    };

    // Helper function to get emoji for mood
    const getMoodEmoji = (mood) => {
        switch(mood) {
            case 'positive': return '😊';
            case 'negative': return '😔';
            case 'neutral': return '😐';
            default: return '❓';
        }
    };

    // Helper function to format confidence percentage
    const formatConfidence = (confidence) => {
        if (!confidence) return 'N/A';
        return `${Math.round(confidence * 100)}%`;
    };

    return (
        <div key={entry.id} className="diary-entry">
            <div className="entry-header">
                <div className="entry-date-time">
                    <span className="entry-date">{entry.date}</span>
                    <span className="entry-time">{entry.time}</span>
                    {entry.aiConfidence && (
                        <span className="ai-confidence">
                            🤖 AI Confidence: {formatConfidence(entry.aiConfidence)}
                        </span>
                    )}
                </div>
                <button 
                    className="delete-button"
                    onClick={() => deleteEntry(entry.id)}
                >
                    🗑️
                </button>
            </div>
            
            {/* Enhanced tags section with AI data */}
            <div className="entry-tags">
                {/* Mood with emoji */}
                <span className={`mood-tag mood-${entry.mood}`}>
                    {getMoodEmoji(entry.mood)} Mood: {entry.mood}
                    {entry.aiData?.moodScore && ` (${entry.aiData.moodScore}/10)`}
                </span>
                
                {/* Energy level if available */}
                {entry.energy && (
                    <span className="ai-tag energy-tag">
                        ⚡ Energy: {formatScore(entry.energy)}
                    </span>
                )}
                
                {/* Pain level if above 0 */}
                {entry.painLevel > 0 && (
                    <span className="ai-tag pain-tag">
                        🩹 Pain: {formatScore(entry.painLevel)}
                    </span>
                )}
                
                {/* Sleep data if available */}
                {entry.sleepHours && (
                    <span className="ai-tag sleep-tag">
                        😴 Sleep: {entry.sleepHours}h
                        {entry.sleepQuality && ` (quality: ${formatScore(entry.sleepQuality)})`}
                    </span>
                )}
                
                {/* Stress level if above normal */}
                {entry.stressLevel > 5 && (
                    <span className="ai-tag stress-tag">
                        😰 Stress: {formatScore(entry.stressLevel)}
                    </span>
                )}
                
                {/* Symptoms if any */}
                {entry.symptoms && entry.symptoms.length > 0 && (
                    <span className="symptoms-tag">
                        🏥 Symptoms: {entry.symptoms.join(', ')}
                    </span>
                )}
            </div>
            
            {/* Original diary text */}
            <div className="entry-text">{entry.text}</div>
            
            {/* AI debugging info (you can remove this later) */}
            {entry.aiData && (
                <div className="ai-debug-info">
                    <details>
                        <summary>🤖 AI Analysis Details</summary>
                        <div className="ai-scores">
                            <div>Mood Score: {formatScore(entry.aiData.moodScore)}</div>
                            <div>Energy Level: {formatScore(entry.aiData.energyLevel)}</div>
                            <div>Pain Level: {formatScore(entry.aiData.painLevel)}</div>
                            {entry.aiData.sleepQuality && <div>Sleep Quality: {formatScore(entry.aiData.sleepQuality)}</div>}
                            {entry.aiData.sleepHours && <div>Sleep Hours: {entry.aiData.sleepHours}</div>}
                            <div>Stress Level: {formatScore(entry.aiData.stressLevel)}</div>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}

export default DiaryEntry;