import React from 'react';
import './InputSection.css';

function InputSection({diaryText, onTextChange, onStartRecording, onSaveEntry}) {
    return (
        <>
            <div className = "input-section">
            <h3>How are you feeling today?</h3>
            <textarea
                className="diary-input"
                value={diaryText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Tell me about your day... How's your mood? Any pain? What did you eat?"
                rows={4}
            />
            </div>

            <button className="record-button" onClick={onStartRecording}>🎤 Start Recording</button>
            <button className="save-button" onClick={onSaveEntry}>💾 Save Entry</button>
        </>
        
    )
}

export default InputSection;