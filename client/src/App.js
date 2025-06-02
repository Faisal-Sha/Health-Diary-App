import './App.css';
import { useState } from 'react';
import InputSection from './components/InputSection'; 
import Summary from './components/Summary';
import Calendar from './components/Calendar';
import DiaryEntry from './components/DiaryEntry';

function App() {

  const [diaryText, setDiaryText] = useState(''); //what the user types
  const [diaryEntries, setDiaryEntries] = useState([]); //all the diary entries
  const [currentView, setCurrentView] = useState('list'); //track which view we are in: list or calendar
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString()); //track which date we are looking at


//will set later - for recording
  const handleRecordClick = () => {
    alert("Recording will start here!");
  }

//extracting basics from text to create a noting diary
//returns mood and symptoms
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

//Get entries for a specific date
  const getEntriesForDate = (date) => {
    return diaryEntries.filter(entry => entry.date === date)
  }

//get unique dates that have entries 
  const getDatesWithEntries = () => {
    const dates = diaryEntries.map(entry => entry.date)
    return [...new Set(dates)];//removes duplicates
  }

//creating an entry object and adding it to diaryEntries array
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

//deleting entries
  const handleDeleteEntry = (entryId) => {
    setDiaryEntries(diaryEntries.filter(entry => entry.id !== entryId));
    alert("Entry Deleted!");
  }

  

  

  return (
    <div className="App">
      <h1>My Health Diary App</h1>
      <p>Welcome to your personal health tracker!</p>

      {/* Input Section for Entries*/}
      <InputSection
        diaryText = {diaryText}
        onTextChange={setDiaryText}
        onStartRecording={handleRecordClick}
        onSaveEntry={handleSaveEntry}
      />

      {/* View toggle buttons */}
      <div className="view-toggle">
        <button 
          className={currentView === 'list' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('list')}
        >📋 List View</button>
        <button
          className={currentView === 'calendar' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('calendar')}
        >📅 Calendar View</button>
      </div>

      {/* Show saved entries */}
      {diaryEntries.length > 0 && (
        <>

        {/*Quick Summary */}
          <Summary 
            Entries = {diaryEntries}
          />

        {/* Calendar View Content*/}
        {currentView === 'calendar' && (
            <Calendar 
              getDatesWithEntries = {getDatesWithEntries}
              getEntriesForDate = {getEntriesForDate}
              selectedDate = {selectedDate}
              setSelectedDate = {setSelectedDate}
              handleDeleteEntry = {handleDeleteEntry}
            />
          )}


        {/*Entries*/}
        {currentView === 'list' && (
          <div className="entries-section">
            <h3>Your Recent Entries</h3>
            {diaryEntries.map((entry) => (
              <DiaryEntry 
                entry = {entry}
                deleteEntry={handleDeleteEntry}
              />
            ))}
          </div>
        )}
        
        </>
      )}
    </div>
  );
}

export default App;
