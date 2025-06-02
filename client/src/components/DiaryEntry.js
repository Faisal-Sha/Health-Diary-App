import React from 'react';
import "./DiaryEntry.css";

function DiaryEntry({entry, deleteEntry}) {
    return (
        <div key={entry.id} className="diary-entry">
            <div className="entry-header">
            <div className="entry-date-time">
                <span className="entry-time">{entry.time}</span>
            </div>
            <button 
                className="delete-button"
                onClick={() => deleteEntry(entry.id)}
            >
                🗑️
            </button>
            </div>
            
            <div className="entry-tags">
            <span className={`mood-tag mood-${entry.mood}`}>
                Mood: {entry.mood}
            </span>
            {entry.symptoms.length > 0 && (
                <span className="symptoms-tag">
                Symptoms: {entry.symptoms.join(', ')}
                </span>
            )}
            </div>
            
            <div className="entry-text">{entry.text}</div>
        </div>
    )

}

export default DiaryEntry;