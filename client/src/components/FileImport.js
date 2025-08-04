// FileImport.tsx
import React, { useState } from 'react';
import './FileImport.css';
import apiService from '../services/apiService';

function FileImport({ onImportComplete, selectedProfile }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const supportedFormats = ['csv', 'json', 'txt'];

    const templates = {
        csv: {
            filename: 'health_diary_template.csv',
            content: `date,entry_text\n2024-01-01,"Felt great today, very productive and happy."`
        },
        json: {
            filename: 'health_diary_template.json',
            content: JSON.stringify({
                entries: [
                    { date: '2024-01-01', text: 'Felt great today, very productive and happy.' }
                ]
            }, null, 2)
        },
        txt: {
            filename: 'health_diary_template.txt',
            content: `2024-01-01\nFelt great today, very productive and happy.`
        }
    };

    const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    previewFile(file);
};

    const previewFile = async (file) => {
    if (!file || !file.name) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!supportedFormats.includes(ext)) {
        setError('Unsupported file format');
        return;
    }

    const text = await readFileAsText(file);
    setPreviewData({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        snippet: text.slice(0, 300)
    });
};

    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const handleFileImport = async () => {
        if (!selectedFile || !selectedProfile) return;
    
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        setIsProcessing(true);
        setUploadProgress(0);
    
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }, 200);
    
        try {
            const rawText = await readFileAsText(selectedFile);
            let textPayload = '';
    
            if (ext === 'txt') {
                textPayload = rawText;
            } else if (ext === 'csv') {
                const entries = parseCSV(rawText);
                textPayload = entriesToBulkText(entries);
            } else if (ext === 'json') {
                const entries = parseJSON(rawText);
                textPayload = entriesToBulkText(entries);
            } else {
                throw new Error('Unsupported format');
            }
    
            await apiService.bulkImportEntries({ text: textPayload, user_id: selectedProfile.id });
    
            setUploadProgress(100);
            alert(`✅ Successfully imported entries from ${selectedFile.name}`);
            if (onImportComplete) onImportComplete();
        } catch (err) {
            console.error('Import failed:', err);
            alert(`❌ Import failed: ${err.message}`);
        } finally {
            clearInterval(progressInterval);
            setIsProcessing(false);
        }
    };    

    const parseCSV = (text) => {
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const entries = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const entry = {};
            headers.forEach((h, idx) => entry[h] = values[idx]?.trim());
            if (entry.date && entry.entry_text) {
                entries.push({ date: entry.date, text: entry.entry_text });
            }
        }
        return entries;
    };

    const parseJSON = (text) => {
        const json = JSON.parse(text);
        if (!Array.isArray(json.entries)) throw new Error('Invalid JSON structure');
        return json.entries.map(e => ({ date: e.date, text: e.text || e.entry_text }));
    };

    const entriesToBulkText = (entries) => {
        return entries.map(e => `${e.date}\n${e.text}\n`).join('\n');
    };

    const downloadTemplate = (format) => {
        const { filename, content } = templates[format];
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => setDragActive(false);

    return (
        <div className={`file-import-container ${dragActive ? 'drag-active' : ''}`}
             onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
            <h3>📁 File Import</h3>

            <div className="drag-drop-box" onClick={() => document.getElementById('file-input').click()}>
                {selectedFile ? `📄 ${selectedFile.name}` : '📂 Drag & Drop or Click to Select a File'}
                <input id="file-input" type="file" accept=".csv,.json,.txt" style={{ display: 'none' }}
                       onChange={(e) => handleFileSelect(e.target.files[0])} />
            </div>

            {previewData && (
                <div className="preview-box">
                    <p><strong>File:</strong> {previewData.name}</p>
                    <p><strong>Size:</strong> {previewData.size}</p>
                    <pre>{previewData.snippet}</pre>
                </div>
            )}

            {selectedFile && !isProcessing && (
                <button onClick={handleFileImport}>🚀 Import</button>
            )}

            {isProcessing && (
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    <span>{uploadProgress}%</span>
                </div>
            )}

            <div className="template-section">
                <h4>📥 Download Templates</h4>
                <div className="template-buttons">
                    <button onClick={() => downloadTemplate('csv')}>📊 CSV</button>
                    <button onClick={() => downloadTemplate('json')}>📋 JSON</button>
                    <button onClick={() => downloadTemplate('txt')}>📝 TXT</button>
                </div>
            </div>
        </div>
    );
}

export default FileImport;
