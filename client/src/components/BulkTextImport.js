import React, { useState } from 'react';
import './BulkTextImport.css';

function BulkTextImport({ onImportComplete }) {
    const [bulkText, setBulkText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showBulkMode, setShowBulkMode] = useState(false);

    const handleBulkImport = async () => {
        if (!bulkText.trim()) {
            alert("Please enter some diary text to import!");
            return;
        }

        if (!window.confirm(`Process ${bulkText.length} characters of diary text?\n\nThis will:\n• Split text into individual entries\n• Extract dates where possible\n• Process each entry with AI\n• Save all to database`)) {
            return;
        }

        setIsProcessing(true);
        
        try {
            console.log('🚀 Starting bulk text import...');
            
            const response = await fetch('http://localhost:5001/api/entries/bulk-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: bulkText,
                    user_id: 1 
                })
            });

            const result = await response.json();
            
            if (result.success) {
                const summary = `✅ Bulk Import Successful!\n\n` +
                    `📊 Results:\n` +
                    `• Found: ${result.total_found} potential entries\n` +
                    `• Processed: ${result.processed} entries\n` +
                    `• Skipped: ${result.skipped} entries\n` +
                    `• Avg AI Confidence: ${Math.round(result.processing_summary.avg_confidence * 100)}%\n` +
                    `• Date Range: ${result.processing_summary.date_range.earliest} to ${result.processing_summary.date_range.latest}`;
                
                alert(summary);
                
                // Clear the text area
                setBulkText('');
                setShowBulkMode(false);
                
                // Notify parent to refresh data
                if (onImportComplete) {
                    onImportComplete();
                }
            } else {
                throw new Error(result.error || 'Import failed');
            }
            
        } catch (error) {
            console.error('❌ Bulk import failed:', error);
            alert(`❌ Import failed: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const exampleText = `January 15, 2024
Had a rough night last night, only got about 4 hours of sleep. Woke up with a severe headache around 8/10 pain level. Feeling exhausted and irritable today. Work stress is really getting to me with this big project deadline coming up.

January 16, 2024  
Much better day! Got a full 8 hours of sleep and woke up feeling refreshed. Pain is down to just a minor 2/10. Energy levels are good and mood is positive. Had a productive day at work.

1/17/2024
Average day overall. Sleep was okay at 6.5 hours. Pain sitting around 4/10 - manageable but present. Energy is moderate. Stress levels building up again.

January 18th, 2024
Excellent sleep last night - 9 hours! Woke up naturally without alarm. No pain today, feeling fantastic. High energy, very positive mood. Great day overall.`;

    if (!showBulkMode) {
        return (
            <div className="bulk-import-toggle">
                <button
                    className="toggle-bulk-btn"
                    onClick={() => setShowBulkMode(true)}
                >
                    📥 Bulk Import Diary Text
                </button>
                <p className="toggle-description">
                    Import months of diary entries at once
                </p>
            </div>
        );
    }

    return (
        <div className="bulk-import-container">
            {/* Header */}
            <div className="bulk-import-header">
                <h3 className="bulk-import-title">📥 Bulk Text Import</h3>
                <p className="bulk-import-subtitle">
                    Paste multiple diary entries - AI will extract dates and process each one
                </p>
            </div>

            {/* Text Input */}
            <div className="bulk-input-section">
                <label className="bulk-input-label">
                    Diary Text (paste multiple entries):
                </label>
                <textarea
                    className={`bulk-textarea ${isProcessing ? 'disabled' : ''}`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste your diary entries here. Include dates when possible (1/15/2024, January 15th, etc.)"
                    disabled={isProcessing}
                />
                <div className="character-count">
                    {bulkText.length} characters
                </div>
            </div>

            {/* Example Button */}
            <div className="example-section">
                <button
                    className="example-btn"
                    onClick={() => setBulkText(exampleText)}
                    disabled={isProcessing}
                >
                    📝 Load Example Text
                </button>
                <span className="example-description">
                    Try the example to see how it works
                </span>
            </div>

            {/* How It Works */}
            <div className="how-it-works">
                <h4 className="how-it-works-title">🧠 How AI Processing Works:</h4>
                <ul className="how-it-works-list">
                    <li>Automatically detects dates in your text</li>
                    <li>Splits text into individual diary entries</li>
                    <li>Extracts mood, pain, sleep, stress levels from each entry</li>
                    <li>Saves everything to database for analysis</li>
                </ul>
            </div>

            {/* Action Buttons */}
            <div className="bulk-actions">
                <button
                    className={`bulk-action-btn primary ${isProcessing || !bulkText.trim() ? 'disabled' : ''}`}
                    onClick={handleBulkImport}
                    disabled={isProcessing || !bulkText.trim()}
                >
                    {isProcessing ? '⏳ Processing...' : '🚀 Process & Import'}
                </button>
                
                <button
                    className={`bulk-action-btn secondary ${isProcessing ? 'disabled' : ''}`}
                    onClick={() => setShowBulkMode(false)}
                    disabled={isProcessing}
                >
                    ❌ Cancel
                </button>
            </div>

            {/* Processing Status */}
            {isProcessing && (
                <div className="processing-status">
                    <p className="processing-title">
                        🤖 AI is processing your diary entries...
                    </p>
                    <p className="processing-subtitle">
                        This may take a few minutes for large amounts of text
                    </p>
                </div>
            )}
        </div>
    );
}

export default BulkTextImport;