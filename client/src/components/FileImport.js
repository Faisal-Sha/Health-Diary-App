import React, { useState } from 'react';
import './FileImport.css';
const BASE_URL = process.env.REACT_APP_API_URL;

function FileImport({ onImportComplete }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [showTemplates, setShowTemplates] = useState(false);

    const supportedFormats = {
        csv: { 
            ext: '.csv', 
            mime: 'text/csv', 
            icon: '📊', 
            name: 'CSV Spreadsheet',
            description: 'Comma-separated values with structured health data'
        },
        json: { 
            ext: '.json', 
            mime: 'application/json', 
            icon: '📋', 
            name: 'JSON Data',
            description: 'Structured JSON format with diary entries'
        },
        txt: { 
            ext: '.txt', 
            mime: 'text/plain', 
            icon: '📝', 
            name: 'Plain Text',
            description: 'Raw diary text with dates'
        },
        docx: { 
            ext: '.docx', 
            mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
            icon: '📄', 
            name: 'Word Document',
            description: 'Microsoft Word diary entries'
        },
        xlsx: { 
            ext: '.xlsx', 
            mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            icon: '📈', 
            name: 'Excel Spreadsheet',
            description: 'Excel workbook with health tracking data'
        }
    };

    // Template data for different formats
    const templates = {
        csv: {
            filename: 'health_diary_template.csv',
            content: `date,entry_text,mood_score,energy_level,pain_level,sleep_hours,stress_level
2024-01-15,"Woke up feeling great today! Had 8 hours of solid sleep and feeling very energetic. No pain and mood is excellent.",8,9,0,8,2
2024-01-16,"Rough night last night. Only got 5 hours of sleep and feeling tired. Headache is bothering me and stress levels are high.",4,3,7,5,8
2024-01-17,"Much better day. Good sleep helped a lot. Feeling balanced and productive.",7,7,2,7.5,4
2024-01-18,"Amazing day! Exercise really helped boost my mood and energy. Sleeping well consistently now.",9,8,1,8,3`
        },
        json: {
            filename: 'health_diary_template.json',
            content: JSON.stringify({
                "entries": [
                    {
                        "date": "2024-01-15",
                        "text": "Woke up feeling great today! Had 8 hours of solid sleep and feeling very energetic. No pain and mood is excellent.",
                        "mood_score": 8,
                        "energy_level": 9,
                        "pain_level": 0,
                        "sleep_hours": 8,
                        "stress_level": 2
                    },
                    {
                        "date": "2024-01-16", 
                        "text": "Rough night last night. Only got 5 hours of sleep and feeling tired. Headache is bothering me and stress levels are high.",
                        "mood_score": 4,
                        "energy_level": 3,
                        "pain_level": 7,
                        "sleep_hours": 5,
                        "stress_level": 8
                    },
                    {
                        "date": "2024-01-17",
                        "text": "Much better day. Good sleep helped a lot. Feeling balanced and productive.",
                        "mood_score": 7,
                        "energy_level": 7,
                        "pain_level": 2,
                        "sleep_hours": 7.5,
                        "stress_level": 4
                    }
                ]
            }, null, 2)
        },
        txt: {
            filename: 'health_diary_template.txt',
            content: `January 15, 2024
Woke up feeling great today! Had 8 hours of solid sleep and feeling very energetic. No pain and mood is excellent.

January 16, 2024
Rough night last night. Only got 5 hours of sleep and feeling tired. Headache is bothering me and stress levels are high.

1/17/2024
Much better day. Good sleep helped a lot. Feeling balanced and productive.

Jan 18th, 2024
Amazing day! Exercise really helped boost my mood and energy. Sleeping well consistently now.`
        }
    };

    // Handle file selection
    const handleFileSelect = (file) => {
        setSelectedFile(file);
        previewFile(file);
    };

    // Preview file contents
    const previewFile = async (file) => {
        if (!file) return;

        try {
            const extension = file.name.toLowerCase().split('.').pop();
            let preview = null;

            if (extension === 'csv' || extension === 'txt') {
                const text = await readFileAsText(file);
                preview = {
                    type: extension,
                    content: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    lines: text.split('\n').length
                };
            } else if (extension === 'json') {
                const text = await readFileAsText(file);
                try {
                    const json = JSON.parse(text);
                    preview = {
                        type: 'json',
                        content: JSON.stringify(json, null, 2).substring(0, 500) + '...',
                        size: `${(file.size / 1024).toFixed(1)} KB`,
                        entries: json.entries ? json.entries.length : 'Unknown structure'
                    };
                } catch (e) {
                    preview = {
                        type: 'json',
                        content: 'Invalid JSON format',
                        error: true
                    };
                }
            } else {
                preview = {
                    type: extension,
                    content: `${extension.toUpperCase()} file ready for processing`,
                    size: `${(file.size / 1024).toFixed(1)} KB`,
                    needsProcessing: true
                };
            }

            setPreviewData(preview);
        } catch (error) {
            console.error('Error previewing file:', error);
        }
    };

    // Read file as text
    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    // Handle file processing and upload
    const handleFileImport = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setUploadProgress(0);

        try {
            const extension = selectedFile.name.toLowerCase().split('.').pop();
            
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            let processedData = null;

            // Process different file types
            switch (extension) {
                case 'csv':
                    processedData = await processCSVFile(selectedFile);
                    break;
                case 'json':
                    processedData = await processJSONFile(selectedFile);
                    break;
                case 'txt':
                    processedData = await processTextFile(selectedFile);
                    break;
                case 'xlsx':
                    processedData = await processExcelFile(selectedFile);
                    break;
                case 'docx':
                    processedData = await processWordFile(selectedFile);
                    break;
                default:
                    throw new Error(`Unsupported file format: ${extension}`);
            }

            clearInterval(progressInterval);
            setUploadProgress(100);

            // Send to backend for AI processing
            if (processedData && processedData.length > 0) {
                await sendToBackend(processedData);
                
                setTimeout(() => {
                    alert(`✅ Successfully imported ${processedData.length} diary entries from ${selectedFile.name}!`);
                    resetComponent();
                    if (onImportComplete) onImportComplete();
                }, 1000);
            } else {
                throw new Error('No valid diary entries found in file');
            }

        } catch (error) {
            console.error('File import error:', error);
            alert(`❌ Import failed: ${error.message}`);
            setUploadProgress(0);
        } finally {
            setIsProcessing(false);
        }
    };

    // Process CSV file
    const processCSVFile = async (file) => {
        const text = await readFileAsText(file);
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) throw new Error('CSV must have header row and data rows');
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const entries = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length !== headers.length) continue;

            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = values[index]?.trim().replace(/"/g, '');
            });

            // Validate required fields
            if (entry.date && entry.entry_text) {
                entries.push({
                    date: entry.date,
                    text: entry.entry_text,
                    mood_score: parseFloat(entry.mood_score) || null,
                    energy_level: parseFloat(entry.energy_level) || null,
                    pain_level: parseFloat(entry.pain_level) || null,
                    sleep_hours: parseFloat(entry.sleep_hours) || null,
                    stress_level: parseFloat(entry.stress_level) || null
                });
            }
        }

        return entries;
    };

    // Process JSON file
    const processJSONFile = async (file) => {
        const text = await readFileAsText(file);
        const data = JSON.parse(text);
        
        if (!data.entries || !Array.isArray(data.entries)) {
            throw new Error('JSON must have an "entries" array');
        }

        return data.entries.map(entry => ({
            date: entry.date,
            text: entry.text || entry.entry_text,
            mood_score: entry.mood_score || null,
            energy_level: entry.energy_level || null,
            pain_level: entry.pain_level || null,
            sleep_hours: entry.sleep_hours || null,
            stress_level: entry.stress_level || null
        }));
    };

    // Process plain text file
    const processTextFile = async (file) => {
        const text = await readFileAsText(file);
        
        // Send entire text to backend bulk import endpoint
        const response = await fetch(`${BASE_URL}/entries/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to process text file');
        }

        return result.processed_entries || [];
    };

    // Process Excel file (placeholder - would need SheetJS library)
    const processExcelFile = async (file) => {
        // This would require the SheetJS library for full implementation
        throw new Error('Excel import coming soon! Please use CSV format for now.');
    };

    // Process Word document (placeholder - would need mammoth library)
    const processWordFile = async (file) => {
        // This would require the mammoth library for full implementation
        throw new Error('Word document import coming soon! Please use plain text format for now.');
    };

    // Send processed data to backend
    const sendToBackend = async (entries) => {
        // Send entries one by one to the regular create endpoint
        for (const entry of entries) {
            try {
                const response = await fetch(`${BASE_URL}/entries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: entry.text,
                        date: entry.date
                    })
                });

                if (!response.ok) {
                    console.error(`Failed to import entry for ${entry.date}`);
                }
            } catch (error) {
                console.error(`Error importing entry for ${entry.date}:`, error);
            }
        }
    };

    // Download template file
    const downloadTemplate = (format) => {
        const template = templates[format];
        if (!template) return;

        const blob = new Blob([template.content], { 
            type: format === 'json' ? 'application/json' : 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = template.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Reset component
    const resetComponent = () => {
        setSelectedFile(null);
        setPreviewData(null);
        setUploadProgress(0);
    };

    // Drag and drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    return (
        <div className="file-import-container">
            {/* Header */}
            <div className="file-import-header">
                <h3 className="file-import-title">📁 File Import System</h3>
                <p className="file-import-subtitle">
                    Import diary entries from CSV, JSON, text files, and more
                </p>
            </div>

            {/* Supported Formats */}
            <div className="supported-formats">
                <h4>📋 Supported Formats</h4>
                <div className="formats-grid">
                    {Object.entries(supportedFormats).map(([key, format]) => (
                        <div key={key} className="format-card">
                            <span className="format-icon">{format.icon}</span>
                            <div className="format-info">
                                <div className="format-name">{format.name}</div>
                                <div className="format-description">{format.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        {/* Template Downloads */}
        <div className="template-section">
                <button 
                    className="toggle-templates-btn"
                    onClick={() => setShowTemplates(!showTemplates)}
                >
                    📥 {showTemplates ? 'Hide' : 'Download'} Templates
                </button>

                {showTemplates && (
                    <div className="templates-grid">
                        {Object.entries(templates).map(([format, template]) => (
                            <div key={format} className="template-card">
                                <div className="template-info">
                                    <span className="template-icon">{supportedFormats[format].icon}</span>
                                    <div className="template-details">
                                        <div className="template-name">{template.filename}</div>
                                        <div className="template-description">
                                            Sample {format.toUpperCase()} with proper structure
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className="download-template-btn"
                                    onClick={() => downloadTemplate(format)}
                                >
                                    💾 Download
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* File Upload Area */}
            <div 
                className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {!selectedFile ? (
                    <>
                        <div className="upload-icon">📁</div>
                        <div className="upload-text">
                            <h4>Drag & Drop your file here</h4>
                            <p>or click to browse files</p>
                        </div>
                        <input
                            type="file"
                            accept=".csv,.json,.txt,.xlsx,.docx"
                            onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                            className="hidden-file-input"
                        />
                    </>
                ) : (
                    <div className="selected-file-info">
                        <div className="file-details">
                            <span className="file-icon">📄</span>
                            <div className="file-info">
                                <div className="file-name">{selectedFile.name}</div>
                                <div className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                            </div>
                        </div>
                        <button 
                            className="change-file-btn"
                            onClick={resetComponent}
                            disabled={isProcessing}
                        >
                            🔄 Change File
                        </button>
                    </div>
                )}
            </div>

            {/* File Preview */}
            {previewData && (
                <div className="file-preview">
                    <h4>📋 File Preview</h4>
                    <div className="preview-info">
                        <div className="preview-stats">
                            <span>📊 Size: {previewData.size}</span>
                            {previewData.lines && <span>📝 Lines: {previewData.lines}</span>}
                            {previewData.entries && <span>📋 Entries: {previewData.entries}</span>}
                        </div>
                    </div>
                    <pre className={`preview-content ${previewData.error ? 'error' : ''}`}>
                        {previewData.content}
                    </pre>
                </div>
            )}

            {/* Import Progress */}
            {isProcessing && (
                <div className="import-progress">
                    <div className="progress-info">
                        <span>🔄 Processing {selectedFile?.name}...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Import Button */}
            {selectedFile && !isProcessing && (
                <div className="import-actions">
                    <button 
                        className="import-file-btn"
                        onClick={handleFileImport}
                        disabled={previewData?.error}
                    >
                        🚀 Import {selectedFile.name}
                    </button>
                </div>
            )}
        </div>
    );
}

export default FileImport;