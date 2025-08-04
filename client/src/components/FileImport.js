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

    const supportedFormats = ['csv', 'json', 'txt'];

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        previewFile(file);
    };

    const previewFile = async (file) => {
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

    return (
        <div className="file-import-container">
            <h3>📁 File Import</h3>
            <input type="file" accept=".csv,.json,.txt" onChange={(e) => handleFileSelect(e.target.files[0])} />

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
        </div>
    );
}

export default FileImport;