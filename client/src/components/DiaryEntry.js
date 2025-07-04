import React, { useState } from 'react';
import apiService from '../services/apiService';
import "./DiaryEntry.css";

function DiaryEntry({entry, deleteEntry, viewMode = 'list', onEntryUpdated}) {

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
    const handleStartEdit = () => {
        console.log('✏️ Starting edit for entry:', entry.id);
        setIsEditing(true);
        setEditText(entry.text); // Pre-populate with current text
    };

    const handleCancelEdit = () => {
        console.log('❌ Cancelling edit');
        setIsEditing(false);
        setEditText('');
    };

    const handleSaveEdit = async () => {
        // Validation
        if (editText.trim() === '') {
            alert("Entry text cannot be empty!");
            return;
        }

        if (editText.trim() === entry.text.trim()) {
            alert("No changes made!");
            handleCancelEdit();
            return;
        }

        try {
            setIsLoading(true);
            console.log('💾 Saving edited entry:', entry.id);

            // Send to backend for update
            const result = await apiService.updateEntry(entry.id, editText.trim());
            
            // Create updated entry object
            const updatedEntry = {
                ...entry,
                text: editText.trim(),
                // Update AI data from backend response
                mood: apiService.mapMoodFromScore(result.ai_extracted_data?.mood_score),
                energy: result.ai_extracted_data?.energy_level,
                painLevel: result.ai_extracted_data?.pain_level,
                sleepHours: result.ai_extracted_data?.sleep_hours,
                sleepQuality: result.ai_extracted_data?.sleep_quality,
                stressLevel: result.ai_extracted_data?.stress_level,
                aiConfidence: result.ai_extracted_data?.confidence || 0
            };

            // Notify parent component of the update
            onEntryUpdated(updatedEntry);

            // Clear editing state
            setIsEditing(false);
            setEditText('');
            
            alert(`Entry Updated! New AI Confidence: ${Math.round((result.ai_extracted_data?.confidence || 0) * 100)}%`);
            
        } catch (error) {
            console.error('Failed to update entry:', error);
            alert('Failed to update entry. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };
    // FIXED: Determine CSS class based on view mode
    const isHorizontal = viewMode === 'grid';
    const entryClass = isHorizontal ? 'diary-entry horizontal' : 'diary-entry';

    return (
            <div className={`${entryClass} ${isEditing ? 'editing' : ''}`}>
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
                    
                    {/* Action buttons */}
                    <div className="entry-actions">
                        {!isEditing ? (
                            <>
                                <button 
                                    className="edit-button"
                                    onClick={handleStartEdit}
                                    title="Edit entry"
                                    disabled={isLoading}
                                >
                                    ✏️
                                </button>
                                <button 
                                    className="delete-button"
                                    onClick={() => deleteEntry(entry.id)}
                                    title="Delete entry"
                                    disabled={isLoading}
                                >
                                    🗑️
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    className="save-edit-button"
                                    onClick={handleSaveEdit}
                                    title="Save changes"
                                    disabled={isLoading || editText.trim() === ''}
                                >
                                    {isLoading ? '⏳' : '✅'}
                                </button>
                                <button 
                                    className="cancel-edit-button"
                                    onClick={handleCancelEdit}
                                    title="Cancel editing"
                                    disabled={isLoading}
                                >
                                    ❌
                                </button>
                            </>
                        )}
                    </div>
                </div>
    
                {/* Entry content - either display or edit mode */}
                {!isEditing ? (
                    <div className="entry-text">
                        {entry.text}
                    </div>
                ) : (
                    <div className="entry-edit-section">
                        <textarea
                            className="entry-edit-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Edit your diary entry..."
                            rows={6}
                            autoFocus
                            disabled={isLoading}
                        />
                        <div className="edit-char-count">
                            {editText.length} characters
                            {editText.trim() === entry.text.trim() && (
                                <span className="no-changes"> (no changes)</span>
                            )}
                        </div>
                    </div>
                )}
    
                {/* Tags (only show when not editing) */}
                {!isEditing && (
                    <div className="entry-tags">
                        {/* Mood tag */}
                        {entry.mood && (
                            <span className={`mood-tag mood-${entry.mood}`}>
                                {getMoodEmoji(entry.mood)} Mood: {entry.mood}
                            </span>
                        )}
                        
                        {/* Energy level */}
                        {entry.energy && (
                            <span className="energy-tag">
                                ⚡ Energy: {formatScore(entry.energy)}
                            </span>
                        )}
                        
                        {/* Pain level */}
                        {entry.painLevel && entry.painLevel > 0 && (
                            <span className="pain-tag">
                                🩹 Pain: {formatScore(entry.painLevel)}
                            </span>
                        )}
                        
                        {/* Sleep */}
                        {entry.sleepHours && (
                            <span className="sleep-tag">
                                😴 Sleep: {entry.sleepHours}h
                            </span>
                        )}
                        
                        {/* Symptoms */}
                        {entry.symptoms && entry.symptoms.length > 0 && (
                            <span className="symptoms-tag">
                                💊 {entry.symptoms.join(', ')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }
    

export default DiaryEntry;
