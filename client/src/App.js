import './App.css';
import { useState } from 'react';

function App() {

  const [diaryText, setDiaryText] = useState(''); //what the user types
  const [diaryEntries, setDiaryEntries] = useState([]); //all the diary entries


  const handleRecordClick = () => {
    alert("Recording will start here!");
  }

  const extractBasicInfo = (text) => {
    const lowerText = text.toLowerCase();

    const moodWords = {
      positive: ['good', 'great', 'happy', 'excited', 'amazing', 'wonderful', 'fantastic'],
      negative: ['bad', 'sad', 'angry', 'frustrated', 'terrible', 'awful', 'depressed'],
      neutral: ['okay', 'fine', 'alright', 'normal', 'average']
    }

    const symptoms = ['headache', 'pain', 'tired', 'fatigue', 'nausea', 'dizzy', 'sore'];
    
    //find mood 
    let detectedMood = 'nuetral';
    for (let mood in moodWords) {
      if (moodWords[mood].some(word => lowerText.includes(word))) {
        detectedMood = mood;
        break;
      }
    }

    //find symptoms
    const detectedSymptoms = symptoms.filter(symptom => lowerText.includes(symptom));
    
    return {
      mood: detectedMood,
      symptoms: detectedSymptoms
    };
  }

  const handleSaveEntry = () => {
    if (diaryText.trim() === '') {
      alert("Please write something first!");
      return;
    }

    const basicInfo = extractBasicInfo(diaryText);

    const newEntry = {
      id: Date.now(), //simple for now
      text: diaryText, 
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      mood: basicInfo.mood,
      symptoms: basicInfo.symptoms
    };
  
    //Add it to list of entries
    setDiaryEntries([newEntry, ...diaryEntries]);
    setDiaryText('');
    alert("Entry Saved!")

  }

  const handleDeleteEntry = (entryId) => {
    setDiaryEntries(diaryEntries.filter(entry => entry.id !== entryId));
    alert("Entry Deleted!");
  }

  

  

  return (
    <div className="App">
      <h1>My Health Diary App</h1>
      <p>Welcome to your personal health tracker!</p>

      <div className = "input-section">
        <h3>How are you feeling today?</h3>
        <textarea
          className="diary-input"
          value={diaryText}
          onChange={(e) => setDiaryText(e.target.value)}
          placeholder="Tell me about your day... How's your mood? Any pain? What did you eat?"
          rows={4}
        />
      </div>

      <button className="record-button" onClick={handleRecordClick}>
        🎤 Start Recording
      </button>

      <button className="save-button" onClick={handleSaveEntry}>
        💾 Save Entry
      </button>

      {/* Show saved entries */}
      {diaryEntries.length > 0 && (
        <div>

          {/*Quick Summary */}
        <div className="summary-section">
          <h3>Quick Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-number">{diaryEntries.length}</span>
              <span className="stat-label">Total Entries</span>
            </div>
            <div className="stat">
              <span className="stat-number">
                  {diaryEntries.filter(e => e.mood === 'positive').length}
              </span>
              <span className="stat-label">Good Days</span>
            </div>
            <div className="stat">
              <span className="stat-number">
                {diaryEntries.filter(e => e.symptoms.length > 0).length}
              </span>
              <span className="stat-label">Days with Symptoms</span>
            </div>
          </div>
        </div>
        
        {/*Entries*/}
        <div className="entries-section">
          <h3>Your Recent Entries</h3>
          {diaryEntries.map((entry) => (
            <div key={entry.id} className="diary-entry">
              <div className="entry-header">
                <div className="entry-date-time">
                  <span className="entry-date">{entry.date} </span>
                  <span className="entry-time"> {entry.time}</span>
                </div>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteEntry(entry.id)}
                >
                  🗑️
                </button>
              </div>

              {/*Show extracted Info*/} 
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
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

export default App;
