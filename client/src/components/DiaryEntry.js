import React from 'react';
import "./DiaryEntry.css";

function DiaryEntry({entry, deleteEntry, viewMode = 'list'}) {
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

    // FIXED: Determine CSS class based on view mode
    const isHorizontal = viewMode === 'grid';
    const entryClass = isHorizontal ? 'diary-entry horizontal' : 'diary-entry';

    return (
        <div key={entry.id} className={entryClass}>
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

            <div className="entry-tags">
                {/* Mood tag */}
                {entry.mood && (
                    <span className={`mood-tag mood-${entry.mood}`}>
                        {getMoodEmoji(entry.mood)} Mood: {entry.mood}
                    </span>
                )}
                
                {/* Energy level */}
                {entry.energy && (
                    <span className="mood-tag mood-neutral">
                        ⚡ Energy: {formatScore(entry.energy)}
                    </span>
                )}
                
                {/* Pain level */}
                {entry.painLevel > 0 && (
                    <span className="mood-tag mood-negative">
                        🩹 Pain: {formatScore(entry.painLevel)}
                    </span>
                )}
                
                {/* Sleep info */}
                {entry.sleepHours && (
                    <span className="mood-tag mood-neutral">
                        😴 Sleep: {entry.sleepHours}h
                    </span>
                )}
                
                {/* Stress level */}
                {entry.stressLevel && (
                    <span className="mood-tag mood-negative">
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
