import './App.css';
import { useState, useEffect } from 'react';
import InputSection from './components/InputSection'; 
import Summary from './components/Summary';
import Calendar from './components/Calendar';
import DiaryEntry from './components/DiaryEntry';
import WeeklyInsights from './components/WeeklyInsights';
import HeroSection from './components/HeroSection';
import HealthCharts from './components/HealthCharts';
import DeveloperTools from './components/DeveloperTools';
import apiService from './services/apiService';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import ProfileSelector from './components/ProfileSelector';

function App() {

  const { user, selectedProfile, authenticatedFetch } = useAuth();

  const [diaryText, setDiaryText] = useState(''); //what the user types
  const [diaryEntries, setDiaryEntries] = useState([]); //all the diary entries
  const [currentView, setCurrentView] = useState('list'); //track which view we are in: list or calendar
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString()); //track which date we are looking at
  const [lastEntryTimestamp, setLastEntryTimestamp] = useState(Date.now());

  
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
      const response = await authenticatedFetch(`http://localhost:5001/api/entries?user_id=${selectedProfile.id}`);
      
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
      
      // Create a backend-style entry object
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
      
      
      setLastEntryTimestamp(Date.now());
      
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
  const handleDeleteEntry = async (entryId) => {
    try {
      setIsLoading(true);
      
      // Check if it's a demo entry
      if (apiService.isDemoEntry(entryId)) {
        // Demo entries: just remove from frontend state
        setDiaryEntries(diaryEntries.filter(entry => entry.id !== entryId));
        alert("✅ Demo entry removed!");
      } else {
        // Real entries: delete from database
        await apiService.deleteEntry(entryId);
        setDiaryEntries(diaryEntries.filter(entry => entry.id !== entryId));
        alert("✅ Entry deleted from database!");
      }
      
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('❌ Failed to delete entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDataImport = (newEntries, action = 'add') => {
    if (action === 'replace') {
      // Replace all entries (used by clear functions)
      setDiaryEntries(newEntries);
      if (newEntries.length === 0) {
        console.log('🗑️ All data cleared!');
      } else {
        console.log(`📊 Imported ${newEntries.length} entries`);
        setLastEntryTimestamp(Date.now());
      }
    } else {
      // Add new entries
      setDiaryEntries([...diaryEntries, ...newEntries]);
      console.log(`📊 Added ${newEntries.length} new entries`);
      // 🔥 NEW: Update timestamp when adding entries
      setLastEntryTimestamp(Date.now());
    }
  };

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
        <div className="home-page">
          {/* Your existing Hero Section */}
          <HeroSection setCurrentView={setCurrentView} />
          
          {/* NEW: Feature Showcase Section */}
          <div className="feature-showcase-section">
            <div className="feature-showcase-container">
              <h2 className="feature-showcase-title">🎯 Powerful Health Intelligence Features</h2>
              
              <p className="feature-showcase-subtitle">
                Experience the future of personal health tracking with AI-powered insights
              </p>

              {/* Feature cards */}
              <div className="feature-cards-grid">
                {[
                  {
                    icon: '🤖',
                    title: 'AI Health Analysis',
                    description: 'GPT-4 powered extraction of health metrics from natural language diary entries',
                    action: 'list'
                  },
                  {
                    icon: '📊',
                    title: 'Data Visualization',
                    description: 'Interactive charts showing trends, correlations, and patterns in your health data',
                    action: 'charts'
                  },
                  {
                    icon: '🧬',
                    title: 'Pattern Detection',
                    description: 'Statistical analysis reveals hidden connections between sleep, pain, mood, and stress',
                    action: 'analytics'
                  },
                  {
                    icon: '🎤',
                    title: 'Voice Interface',
                    description: 'Speak naturally about your day - AI converts speech to structured health insights',
                    action: 'list'
                  },
                  {
                    icon: '📅',
                    title: 'Smart Calendar',
                    description: 'Visual calendar view with color-coded health indicators and pattern recognition',
                    action: 'calendar'
                  },
                  {
                    icon: '💡',
                    title: 'Personalized Insights',
                    description: 'Weekly AI-generated recommendations based on your unique health patterns',
                    action: 'analytics'
                  }
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="feature-card"
                    onClick={() => setCurrentView(feature.action)}
                  >
                    <div className="feature-card-icon">{feature.icon}</div>
                    <h3 className="feature-card-title">{feature.title}</h3>
                    <p className="feature-card-description">{feature.description}</p>
                    <div className="feature-card-cta">Click to explore →</div>
                  </div>
                ))}
              </div>

              {/* Call to action */}
              <div className="feature-showcase-cta">
                <h3 className="cta-title">Ready to Transform Your Health Journey?</h3>
                <p className="cta-subtitle">Start tracking your health with AI-powered insights today</p>
                <button 
                  className="cta-button"
                  onClick={() => setCurrentView('list')}
                >
                  🚀 Get Started Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView !== 'home' && (
        <>
          <h1>My Health Diary App</h1>
          <p>Welcome to your personal AI-powered health tracker!</p>
        

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
      {currentView !== 'analytics' && currentView !== 'home' && currentView !== 'dev-tools' && (
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
          className={currentView === 'charts' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('charts')}
        >📊 Data Visualization</button>
        <button
          className={currentView === 'analytics' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('analytics')}
        >🧠 AI Insights</button>
        <button
        className={currentView === 'dev-tools' ? 'view-btn active' : 'view-btn'}
        onClick={() => setCurrentView('dev-tools')}
        >🛠️ Dev Tools</button>
      </div>

      {/* Charts View */}
      {currentView === 'charts' && (
        <>
          

          {/* NEW: Health Charts */}
          {diaryEntries.length > 0 && (
            <HealthCharts entries={diaryEntries} />
          )}
        </>
        
      )}

      {/* Analytics View */}
      {currentView === 'analytics' && (
        <WeeklyInsights lastEntryTimestamp={lastEntryTimestamp} />
      )}

      {/* Show saved entries for list and calendar views */}
      {currentView !== 'analytics' && currentView !== 'charts' && currentView !== 'dev-tools' && diaryEntries.length > 0 && (
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
            <>
            
            

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
            </>
          )}
        </>
      )}

      {currentView === 'dev-tools' && (
        <DeveloperTools
          onImportData={handleDataImport}
          currentEntries={diaryEntries.length}
          allEntries={diaryEntries}
          onDataImported={loadEntries}
        />
      )}

      {/* Empty state when no entries and not loading and not in analytics view */}
      {diaryEntries.length === 0 && !isLoading && backendStatus === 'connected' && currentView !== 'analytics' && currentView !== 'charts' && currentView !== 'dev-tools' && (
          <div className="empty-state">
            <h3>No diary entries yet</h3>
            <p>Start by writing your first entry above!</p>
          </div>
        )}
      </>
      )}
      </div>
  );
}

export default App;
