import React, { useState } from 'react';
import './DataImport.css';
import apiService from '../services/apiService';


function DataImport({ onImportData, currentEntries, allEntries, selectedProfile }) {
    const [isImporting, setIsImporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Count demo vs real entries
    const demoEntries = allEntries.filter(entry => apiService.isDemoEntry(entry.id));
    const realEntries = allEntries.filter(entry => !apiService.isDemoEntry(entry.id));

    // Demo data sets for different scenarios
    const demoDataSets = {
        demo: {
            name: "📊 Comprehensive Demo Data",
            description: "2 weeks of varied health data showing clear patterns",
            entries: [
                {
                    text: "Had an amazing day! Slept 8.5 hours last night and woke up feeling completely refreshed. My energy is through the roof, mood is fantastic. Did a 30-minute morning run and felt no pain at all. Work was productive and stress-free.",
                    aiData: { moodScore: 9, energyLevel: 9, painLevel: 0, sleepHours: 8.5, stressLevel: 2, sleepQuality: 9 },
                    daysAgo: 0
                },
                {
                    text: "Pretty good day overall. Got about 7 hours of sleep which felt decent. Energy levels were solid throughout the day. Had a mild headache around lunch but it went away. Work was manageable.",
                    aiData: { moodScore: 7, energyLevel: 7, painLevel: 3, sleepHours: 7, stressLevel: 4, sleepQuality: 7 },
                    daysAgo: 1
                },
                {
                    text: "Rough night - only got 4 hours of sleep due to late work deadline. Feeling exhausted and irritable today. Severe headache started around noon. Pain level is really high, around 8/10. Very stressed about upcoming presentations.",
                    aiData: { moodScore: 2, energyLevel: 2, painLevel: 8, sleepHours: 4, stressLevel: 9, sleepQuality: 2 },
                    daysAgo: 2
                },
                {
                    text: "Better day after catching up on sleep. Got 9 hours last night and it made a huge difference. Energy is back up, mood improved significantly. Only minor neck tension, probably from poor posture yesterday.",
                    aiData: { moodScore: 8, energyLevel: 8, painLevel: 2, sleepHours: 9, stressLevel: 3, sleepQuality: 8 },
                    daysAgo: 3
                },
                {
                    text: "Average day. Sleep was okay at 6.5 hours but could have been better. Feeling moderately energetic. No major pain but some general fatigue. Work stress is building up again with new project deadlines.",
                    aiData: { moodScore: 5, energyLevel: 5, painLevel: 1, sleepHours: 6.5, stressLevel: 6, sleepQuality: 5 },
                    daysAgo: 4
                },
                {
                    text: "Excellent day! Full 8 hours of quality sleep. Woke up naturally without an alarm. Energy levels are fantastic, mood is very positive. Went for a bike ride and felt great. No pain or stress today.",
                    aiData: { moodScore: 9, energyLevel: 9, painLevel: 0, sleepHours: 8, stressLevel: 1, sleepQuality: 9 },
                    daysAgo: 5
                },
                {
                    text: "Struggled with insomnia last night, probably got 3 hours of broken sleep. Feeling terrible today - exhausted, cranky, and developed a migraine by afternoon. Pain is intense. Very high stress from lack of sleep.",
                    aiData: { moodScore: 1, energyLevel: 1, painLevel: 9, sleepHours: 3, stressLevel: 9, sleepQuality: 1 },
                    daysAgo: 6
                },
                {
                    text: "Recovery day. Managed to get 7.5 hours of sleep which helped a lot. Energy is slowly returning, mood is much better than yesterday. Headache is gone but still feeling some tension. Stress levels are decreasing.",
                    aiData: { moodScore: 6, energyLevel: 6, painLevel: 3, sleepHours: 7.5, stressLevel: 4, sleepQuality: 6 },
                    daysAgo: 7
                },
                {
                    text: "Great weekend day! Slept in for 9 hours and it felt amazing. High energy, excellent mood. Went hiking with friends and felt no pain during or after. Very relaxed and happy.",
                    aiData: { moodScore: 9, energyLevel: 8, painLevel: 0, sleepHours: 9, stressLevel: 2, sleepQuality: 9 },
                    daysAgo: 8
                },
                {
                    text: "Solid day. Got my usual 7 hours of sleep. Energy and mood are good. Minor lower back pain from gardening yesterday, but nothing serious. Overall feeling balanced and content.",
                    aiData: { moodScore: 7, energyLevel: 7, painLevel: 2, sleepHours: 7, stressLevel: 3, sleepQuality: 7 },
                    daysAgo: 9
                },
                {
                    text: "Challenging day. Sleep was interrupted by neighbor's loud music - maybe 5 hours total. Low energy and irritable mood. Developed tension headache from stress. Work deadlines are overwhelming.",
                    aiData: { moodScore: 3, energyLevel: 3, painLevel: 6, sleepHours: 5, stressLevel: 8, sleepQuality: 3 },
                    daysAgo: 10
                },
                {
                    text: "Much better after prioritizing sleep. Got a full 8 hours and maintained good sleep hygiene. Energy rebounded well, mood is positive. No significant pain. Feeling more in control of stress.",
                    aiData: { moodScore: 8, energyLevel: 8, painLevel: 1, sleepHours: 8, stressLevel: 3, sleepQuality: 8 },
                    daysAgo: 11
                },
                {
                    text: "Average day with standard 6.5 hours of sleep. Energy is moderate, mood is neutral. Some shoulder tension from computer work. Stress is manageable but present due to ongoing projects.",
                    aiData: { moodScore: 5, energyLevel: 5, painLevel: 3, sleepHours: 6.5, stressLevel: 5, sleepQuality: 5 },
                    daysAgo: 12
                },
                {
                    text: "Fantastic day! Perfect 8.5 hours of restorative sleep. Extremely high energy and very positive mood. Completed a challenging workout with no pain. Feeling accomplished and stress-free.",
                    aiData: { moodScore: 10, energyLevel: 9, painLevel: 0, sleepHours: 8.5, stressLevel: 1, sleepQuality: 10 },
                    daysAgo: 13
                }
            ]
        },
        correlation: {
            name: "🔍 Strong Correlation Demo", 
            description: "Data designed to show clear sleep-pain correlation",
            entries: [
                { text: "Amazing 9 hours of sleep, no pain at all, feeling incredible!", aiData: { moodScore: 9, energyLevel: 9, painLevel: 0, sleepHours: 9, stressLevel: 1 }, daysAgo: 0 },
                { text: "Only 4 hours of sleep, severe headache and body aches", aiData: { moodScore: 2, energyLevel: 2, painLevel: 8, sleepHours: 4, stressLevel: 8 }, daysAgo: 1 },
                { text: "Good 8 hours sleep, minimal pain, feeling great", aiData: { moodScore: 8, energyLevel: 8, painLevel: 1, sleepHours: 8, stressLevel: 2 }, daysAgo: 2 },
                { text: "Terrible 3 hours sleep, pain level is through the roof", aiData: { moodScore: 1, energyLevel: 1, painLevel: 9, sleepHours: 3, stressLevel: 9 }, daysAgo: 3 },
                { text: "Perfect 8.5 hours sleep, pain-free and energetic", aiData: { moodScore: 9, energyLevel: 9, painLevel: 0, sleepHours: 8.5, stressLevel: 1 }, daysAgo: 4 },
                { text: "Insomnia struck - 2 hours sleep, intense migraine", aiData: { moodScore: 1, energyLevel: 1, painLevel: 10, sleepHours: 2, stressLevel: 10 }, daysAgo: 5 },
                { text: "Great 7.5 hours sleep, very low pain levels", aiData: { moodScore: 8, energyLevel: 7, painLevel: 1, sleepHours: 7.5, stressLevel: 2 }, daysAgo: 6 }
            ]
        },
        mixed: {
            name: "🎲 Random Mixed Data",
            description: "Varied data with no clear patterns",
            entries: [
                { text: "Decent sleep but high stress from work deadline", aiData: { moodScore: 4, energyLevel: 6, painLevel: 5, sleepHours: 7, stressLevel: 8 }, daysAgo: 0 },
                { text: "Poor sleep but surprisingly good mood from positive news", aiData: { moodScore: 8, energyLevel: 4, painLevel: 3, sleepHours: 4, stressLevel: 3 }, daysAgo: 1 },
                { text: "Great sleep but dealing with seasonal allergies", aiData: { moodScore: 6, energyLevel: 7, painLevel: 4, sleepHours: 8, stressLevel: 4 }, daysAgo: 2 },
                { text: "Average everything today, nothing remarkable", aiData: { moodScore: 5, energyLevel: 5, painLevel: 5, sleepHours: 6.5, stressLevel: 5 }, daysAgo: 3 },
                { text: "Excellent sleep but got injured during exercise", aiData: { moodScore: 3, energyLevel: 8, painLevel: 7, sleepHours: 8.5, stressLevel: 6 }, daysAgo: 4 }
            ]
        }
    };

    const handleImport = async (dataSetKey) => {
        setIsImporting(true);
        
        try {
            const dataSet = demoDataSets[dataSetKey];
            const processedEntries = dataSet.entries.map((entry, index) => {
                const entryDate = new Date();
                entryDate.setDate(entryDate.getDate() - entry.daysAgo);
                
                return {
                    id: `demo_${Date.now()}_${index}`,
                    text: entry.text,
                    date: entryDate.toLocaleDateString(),
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    mood: entry.aiData.moodScore > 6 ? 'positive' : entry.aiData.moodScore < 4 ? 'negative' : 'neutral',
                    energy: entry.aiData.energyLevel,
                    painLevel: entry.aiData.painLevel,
                    sleepHours: entry.aiData.sleepHours,
                    sleepQuality: entry.aiData.sleepQuality || 7,
                    stressLevel: entry.aiData.stressLevel,
                    symptoms: entry.aiData.painLevel > 5 ? ['headache'] : [],
                    aiConfidence: 0.95,
                    aiData: entry.aiData
                };
            });

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            onImportData(processedEntries);
            
        } catch (error) {
            console.error('Import failed:', error);
            alert('Import failed. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleClearDemoData = async () => {
        if (demoEntries.length === 0) {
            alert('No demo data to clear!');
            return;
        }

        if (!window.confirm(`Are you sure you want to clear ${demoEntries.length} demo entries? Your real diary entries will be kept.`)) {
            return;
        }

        setIsClearing(true);
        
        try {
            // Clear demo entries from frontend (they're not in database anyway)
            const remainingEntries = allEntries.filter(entry => !apiService.isDemoEntry(entry.id));
            onImportData(remainingEntries, 'replace');
            
            alert(`✅ Cleared ${demoEntries.length} demo entries. Your ${realEntries.length} real entries are safe!`);
            
        } catch (error) {
            console.error('Failed to clear demo data:', error);
            alert('Failed to clear demo data. Please try again.');
        } finally {
            setIsClearing(false);
        }
    };

    const handleClearAllData = async () => {
        if (allEntries.length === 0) {
            alert('No data to clear!');
            return;
        }

        if (!selectedProfile) {
            alert('❌ No profile selected! Please select a profile first.');
            return;
          }

        const confirmText = `⚠️ DANGER: This will permanently delete ALL ${allEntries.length} entries (${realEntries.length} real + ${demoEntries.length} demo) from the database. This cannot be undone!\n\nType "DELETE ALL" to confirm:`;
        
        const userInput = window.prompt(confirmText);
        
        if (userInput !== "DELETE ALL") {
            alert('Deletion cancelled. Your data is safe.');
            return;
        }

        setIsClearing(true);
        
        try {
            // Delete real entries from database
            if (realEntries.length > 0) {
                await handleClearDemoData();
                await apiService.clearAllEntries(selectedProfile);
            }
            
            // Clear all entries from frontend
            onImportData([], 'replace');
            
            alert(`✅ All ${allEntries.length} entries have been permanently deleted.`);
            
        } catch (error) {
            console.error('Failed to clear all data:', error);
            alert('Failed to clear all data. Please try again.');
        } finally {
            setIsClearing(false);
        }
    };


    return (
        <div className="data-import-container">
            <div className="import-header">
                <h3 className="import-title">📥 Quick Data Import</h3>
                <p className="import-description">Load demo data to showcase AI analytics capabilities</p>
                {currentEntries > 0 && (
                    <div className="current-entries-warning">
                        📊 Current data: {realEntries.length} real entries + {demoEntries.length} demo entries
                    </div>
                )}
            </div>

            <div className="import-options-grid">
                {Object.entries(demoDataSets).map(([key, dataSet]) => (
                    <div key={key} className="import-option-card" onClick={() => handleImport(key)}>
                        <h4 className="option-title">{dataSet.name}</h4>
                        <p className="option-description">{dataSet.description}</p>
                        <div className="option-footer">
                            <span className="entries-count">📊 {dataSet.entries.length} entries</span>
                            <button className="import-button" disabled={isImporting || isClearing}>
                                {isImporting ? '⏳ Loading...' : '📥 Import'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Smart Clear Options */}
            <div className="clear-data-section">
                <h4 style={{ color: '#495057', marginBottom: '15px', textAlign: 'center' }}>
                    🗑️ Data Management
                </h4>
                
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {/* Clear Demo Data */}
                    {demoEntries.length > 0 && (
                        <button
                            className="clear-demo-button"
                            onClick={handleClearDemoData}
                            disabled={isImporting || isClearing}
                            style={{
                                background: '#ffc107',
                                color: '#212529',
                                border: 'none',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {isClearing ? '⏳ Clearing...' : `🧹 Clear ${demoEntries.length} Demo Entries`}
                        </button>
                    )}
                    
                    {/* Clear All Data */}
                    {allEntries.length > 0 && (
                        <button
                            className="clear-button"
                            onClick={handleClearAllData}
                            disabled={isImporting || isClearing}
                        >
                            {isClearing ? '⏳ Deleting...' : `🚨 Delete ALL ${allEntries.length} Entries`}
                        </button>
                    )}
                </div>

                {/* Info about what gets deleted */}
                <div style={{
                    marginTop: '15px',
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    textAlign: 'center',
                    lineHeight: '1.4'
                }}>
                    💡 <strong>Smart Delete:</strong> Demo entries are only cleared from view (not in database). 
                    Real entries are permanently deleted from the database.
                </div>
            </div>

            {(isImporting || isClearing) && (
                <div className="loading-overlay">
                    <div className="loading-modal">
                        <div className="loading-spinner"></div>
                        <h4 className="loading-title">
                            {isImporting ? '🤖 Processing Demo Data...' : '🗑️ Clearing Data...'}
                        </h4>
                        <p className="loading-text">
                            {isImporting ? 'Adding entries and calculating AI insights' : 'Removing selected entries'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataImport;