import React from 'react';
import DataImport from './DataImport';
import BulkTextImport from './BulkTextImport';
import './DeveloperTools.css';

function DeveloperTools({ onImportData, currentEntries, allEntries, onDataImported }) {
    const handleAnalyzeDataQuality = () => {
        if (currentEntries === 0) {
            alert('No data to analyze. Import some entries first!');
            return;
        }

        const realEntries = allEntries.filter(e => e.id && !String(e.id).startsWith('demo_'));
        const demoEntries = allEntries.filter(e => e.id && String(e.id).startsWith('demo_'));
        const entriesWithAI = allEntries.filter(e => e.aiConfidence && e.aiConfidence > 0);
        const avgConfidence = entriesWithAI.length > 0 
            ? entriesWithAI.reduce((sum, e) => sum + (e.aiConfidence || 0), 0) / entriesWithAI.length 
            : 0;

        const analysis = `📊 Data Quality Analysis\n\n` +
            `Total Entries: ${currentEntries}\n` +
            `Real Entries: ${realEntries.length}\n` +
            `Demo Entries: ${demoEntries.length}\n` +
            `Entries with AI Data: ${entriesWithAI.length}\n` +
            `Average AI Confidence: ${Math.round(avgConfidence * 100)}%\n\n` +
            `Quality Assessment:\n` +
            `${avgConfidence > 0.8 ? '✅ High quality AI extraction' : 
              avgConfidence > 0.6 ? '⚠️ Moderate quality AI extraction' : 
              '❌ Low quality AI extraction'}\n` +
            `${currentEntries >= 14 ? '✅ Sufficient data for correlation analysis' : 
              `⚠️ Need ${14 - currentEntries} more entries for strong correlations`}`;

        alert(analysis);
    };

    return (
        <div className="developer-tools-container">
            {/* Header */}
            <div className="dev-tools-header">
                <h2 className="dev-tools-title">🛠️ Developer Tools & Data Management</h2>
                <p className="dev-tools-subtitle">
                    Advanced tools for testing, importing data, and managing your health analytics platform
                </p>
                <div className="warning-notice">
                    ⚠️ <strong>Note:</strong> These tools are designed for testing and development. 
                    Regular users should use the main diary entry interface.
                </div>
            </div>

            {/* Tools Grid */}
            <div className="dev-tools-grid">
                
                {/* Demo Data Import Section */}
                <div className="tool-section">
                    <div className="tool-header">
                        <h3 className="tool-title">🎭 Demo Data Import</h3>
                        <p className="tool-description">
                            Load pre-designed demo datasets to showcase AI analytics capabilities
                        </p>
                    </div>
                    <div className="tool-content">
                        <DataImport 
                            onImportData={onImportData} 
                            currentEntries={currentEntries} 
                            allEntries={allEntries}
                        />
                    </div>
                </div>

                {/* Bulk Text Import Section */}
                <div className="tool-section">
                    <div className="tool-header">
                        <h3 className="tool-title">📝 Bulk Text Import</h3>
                        <p className="tool-description">
                            Import large amounts of diary text at once for testing AI processing
                        </p>
                    </div>
                    <div className="tool-content">
                        <BulkTextImport onImportComplete={onDataImported} />
                    </div>
                </div>

                {/* Database Management Section */}
                <div className="tool-section full-width">
                    <div className="tool-header">
                        <h3 className="tool-title">🗄️ Database Overview & Analysis</h3>
                        <p className="tool-description">
                            Current database statistics and data quality analysis
                        </p>
                    </div>
                    <div className="tool-content">
                        {/* Database Stats */}
                        <div className="db-stats">
                            <div className="stat-item">
                                <div className="stat-number">{currentEntries}</div>
                                <div className="stat-label">Total Entries</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">
                                    {allEntries.filter(e => e.id && !String(e.id).startsWith('demo_')).length}
                                </div>
                                <div className="stat-label">Real Entries</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">
                                    {allEntries.filter(e => e.id && String(e.id).startsWith('demo_')).length}
                                </div>
                                <div className="stat-label">Demo Entries</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">
                                    {allEntries.filter(e => e.aiConfidence && e.aiConfidence > 0).length}
                                </div>
                                <div className="stat-label">AI Processed</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">
                                    {allEntries.length > 0 
                                        ? `${Math.round(allEntries.reduce((sum, e) => sum + (e.aiConfidence || 0), 0) / allEntries.length * 100)}%`
                                        : 'N/A'
                                    }
                                </div>
                                <div className="stat-label">Avg AI Confidence</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number">
                                    {currentEntries >= 14 ? '✅' : '⚠️'}
                                </div>
                                <div className="stat-label">Correlation Ready</div>
                            </div>
                        </div>
                        
                        {/* Single Useful Action */}
                        <div className="db-actions">
                            <button 
                                className="db-action-btn analyze-btn"
                                onClick={handleAnalyzeDataQuality}
                            >
                                🔍 Analyze Data Quality
                            </button>
                        </div>

                        {/* Quick Tips */}
                        <div className="dev-tips">
                            <h4 className="tips-title">💡 Developer Tips</h4>
                            <div className="tips-list">
                                <div className="tip-item">
                                    <strong>Need more data?</strong> Use bulk text import with months of diary entries
                                </div>
                                <div className="tip-item">
                                    <strong>Testing correlations?</strong> Import "Strong Correlation Demo" data
                                </div>
                                <div className="tip-item">
                                    <strong>AI confidence low?</strong> Try more descriptive diary entries with specific metrics
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DeveloperTools;