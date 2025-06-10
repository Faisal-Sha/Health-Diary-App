import './App.css';
import { useState, useEffect } from 'react';
import InputSection from './components/InputSection'; 
import Summary from './components/Summary';
import Calendar from './components/Calendar';
import DiaryEntry from './components/DiaryEntry';
import WeeklyInsights from './components/WeeklyInsights';
import HeroSection from './components/HeroSection';
import apiService from './services/apiService';

function App() {

  const [diaryText, setDiaryText] = useState(''); //what the user types
  const [diaryEntries, setDiaryEntries] = useState([]); //all the diary entries
  const [currentView, setCurrentView] = useState('list'); //track which view we are in: list or calendar
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString()); //track which date we are looking at

  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'


  
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck();
        setBackendStatus('connected');
        console.log('✅ Backend connected successfully');
      } catch (error) {
        setBackendStatus('disconnected');
        console.error('❌ Backend connection failed:', error);
        setError('Cannot connect to backend server. Please make sure Flask is running on port 5001.');
      }
    };

    checkBackendConnection();
  }, []);

  // Load existing entries when app starts
  useEffect(() => {
    if (backendStatus === 'connected') {
      loadEntries();
    }
  }, [backendStatus]);

  // Function to load entries from backend
  const loadEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiService.getEntries({ limit: 50 });
      
      // Convert backend format to your current React format
      const convertedEntries = result.entries.map(entry => apiService.convertBackendEntry(entry));
      
      setDiaryEntries(convertedEntries);
      console.log(`📥 Loaded ${convertedEntries.length} entries from backend`);
      
    } catch (error) {
      console.error('Failed to load entries:', error);
      setError('Failed to load diary entries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };




//creating an entry object and adding it to diaryEntries array
  
  const handleSaveEntry = async () => {
    if (diaryText.trim() === '') {
      alert("Please write something first!");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Send to backend (with AI processing)
      const result = await apiService.createEntry(diaryText, new Date().toISOString().split('T')[0]);
      
      // Create a backend-style entry object, then convert it properly
      const backendStyleEntry = {
        id: result.entry_id,
        entry_text: diaryText,
        entry_date: new Date().toISOString().split('T')[0], // "2024-06-06" format
        created_at: new Date().toISOString(),
        mood_score: result.ai_extracted_data?.mood_score,
        energy_level: result.ai_extracted_data?.energy_level,
        pain_level: result.ai_extracted_data?.pain_level,
        sleep_quality: result.ai_extracted_data?.sleep_quality,
        sleep_hours: result.ai_extracted_data?.sleep_hours,
        stress_level: result.ai_extracted_data?.stress_level,
        ai_confidence: result.ai_extracted_data?.confidence || 0
      };

      // Convert using the same function as loaded entries
      const newEntry = apiService.convertBackendEntry(backendStyleEntry);

      // Add to the top of the list (newest first)
      setDiaryEntries([newEntry, ...diaryEntries]);
      setDiaryText('');
      
      alert(`Entry Saved! AI Confidence: ${Math.round((newEntry.aiConfidence || 0) * 100)}%`);
      
    } catch (error) {
      console.error('Failed to save entry:', error);
      setError('Failed to save entry. Please try again.');
      alert('Failed to save entry. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

//deleting entries
  const handleDeleteEntry = async(entryId) => {
    try {
      // For now, just remove from local state
      // TODO: Add DELETE endpoint to backend
      setDiaryEntries(diaryEntries.filter(entry => entry.id !== entryId));
      alert("Entry Deleted!");
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
  }

  const getEntriesForDate = (date) => {
    console.log('🔍 getEntriesForDate called with:', date);
    console.log('📊 Current diaryEntries array:', diaryEntries);
    
    const filteredEntries = diaryEntries.filter(entry => {
      console.log(`Comparing entry.date "${entry.date}" with requested date "${date}"`);
      return entry.date === date;
    });
    
    console.log(`✅ Found ${filteredEntries.length} entries for ${date}:`, filteredEntries);
    return filteredEntries;
  };
  
  // Get unique dates that have entries
  const getDatesWithEntries = () => {
    console.log('🔍 getDatesWithEntries called');
    console.log('📊 Current diaryEntries array:', diaryEntries);
    
    const dates = diaryEntries.map(entry => {
      console.log(`Entry date: "${entry.date}"`);
      return entry.date;
    });
    
    const uniqueDates = [...new Set(dates)];
    console.log('📅 Unique dates found:', uniqueDates);
    return uniqueDates;
  };

  // Show connection status
  const renderConnectionStatus = () => {
    if (backendStatus === 'checking') {
      return <div className="status-message checking">🔄 Connecting to backend...</div>;
    }
    if (backendStatus === 'disconnected') {
      return (
        <div className="status-message error">
          ⚠️ Backend disconnected. Please start your Flask server.
        </div>
      );
    }
    return <div className="status-message connected">✅ Connected to backend</div>;
  };

  

  

  return (
    <div className="App">

      {currentView === 'home' && (
        <>
          <HeroSection />
        </>
      )}

      {currentView !== 'home' && (
        <>
          <h1>My Health Diary App</h1>
          <p>Welcome to your personal AI-powered health tracker!</p>
        </>
      )}

      {/* Connection Status */}
      {renderConnectionStatus()}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Input Section for Entries*/}
      {currentView !== 'analytics' && (
        <InputSection
          diaryText={diaryText}
          onTextChange={setDiaryText}
          onSaveEntry={handleSaveEntry}
          isLoading={isLoading}
          disabled={backendStatus !== 'connected'}
        />
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-message">
          🔄 Processing your entry with AI...
        </div>
      )}

      {/* View toggle buttons */}
      <div className="view-toggle">
        <button 
          className={currentView === 'home' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('home')}
        >🏠 Home</button>
        <button 
          className={currentView === 'list' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('list')}
        >📋 List View</button>
        <button
          className={currentView === 'calendar' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('calendar')}
        >📅 Calendar View</button>
        <button
          className={currentView === 'analytics' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('analytics')}
        >🧠 AI Insights</button>
      </div>

      {/* NEW: Analytics View */}
      {currentView === 'analytics' && (
        <WeeklyInsights />
      )}

      {/* Show saved entries for list and calendar views */}
      {currentView !== 'analytics' && diaryEntries.length > 0 && (
        <>
          {/*Quick Summary */}
          <Summary 
            Entries={diaryEntries}
          />

          {/* Calendar View Content*/}
          {currentView === 'calendar' && (
            <Calendar 
              getDatesWithEntries={getDatesWithEntries}
              getEntriesForDate={getEntriesForDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              handleDeleteEntry={handleDeleteEntry}
            />
          )}

          {/*List View Content*/}
          {currentView === 'list' && (
            <div className="entries-section">
              <h3>Your Recent Entries ({diaryEntries.length} total)</h3>
              {diaryEntries.map((entry) => (
                <DiaryEntry 
                  key={entry.id}
                  entry={entry}
                  deleteEntry={handleDeleteEntry}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state when no entries and not loading and not in analytics view */}
      {diaryEntries.length === 0 && !isLoading && backendStatus === 'connected' && currentView !== 'analytics' && (
          <div className="empty-state">
            <h3>No diary entries yet</h3>
            <p>Start by writing your first entry above!</p>
          </div>
        )}
      </div>
  );
}

export default App;
