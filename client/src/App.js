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
import FeatureShowcase from './components/FeatureShowcase';
import apiService from './services/apiService';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import ProfileSelector from './components/ProfileSelector';

// Main App component wrapped in AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Inner app content that uses authentication
function AppContent() {
  const { user, selectedProfile, setSelectedProfile, getAuthToken, loading } = useAuth();

  const [diaryText, setDiaryText] = useState(''); //what the user types
  const [diaryEntries, setDiaryEntries] = useState([]); //all the diary entries
  const [currentView, setCurrentView] = useState('home'); //track which view we are in: home, list, calendar, charts, analytics, dev-tools
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString()); //track which date we are looking at
  const [lastEntryTimestamp, setLastEntryTimestamp] = useState(Date.now());
  const [listViewMode, setListViewMode] = useState('grid');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'

  // Sync auth token with apiService whenever user changes
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      apiService.setAuthToken(token);
      console.log('🔑 Auth token synced with apiService');
    } else {
      apiService.setAuthToken(null);
      console.log('🔓 Auth token cleared from apiService');
    }
  }, [user, getAuthToken]);

  // Check backend connection
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        await apiService.healthCheck();
        setBackendStatus('connected');
        console.log('✅ Backend connected successfully');
      } catch (error) {
        setBackendStatus('disconnected');
        console.error('❌ Backend connection failed:', error);
        setError('Cannot connect to backend server. Please make sure Flask is running on port 5000.');
      }
    };

    checkBackendConnection();
  }, []);

  // Load existing entries when a profile is selected
  useEffect(() => {
    if (backendStatus === 'connected' && selectedProfile) {
      loadEntries();
    }
  }, [backendStatus, selectedProfile]);

  // Function to load entries from backend
  const loadEntries = async () => {
    if (!selectedProfile) {
      console.log('⏸️ No profile selected, skipping entry load');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📥 Loading entries for profile:', selectedProfile.name);
      
      const result = await apiService.getEntries(selectedProfile, { limit: 50 });
      
      // Convert backend format to your current React format
      const convertedEntries = result.entries.map(entry => apiService.convertBackendEntry(entry));
      
      setDiaryEntries(convertedEntries);
      console.log(`✅ Loaded ${convertedEntries.length} entries from backend`);
      
    } catch (error) {
      console.error('Failed to load entries:', error);
      setError('Failed to load diary entries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchProfile = () => {
    if (window.confirm('Are you sure you want to switch profiles? Any unsaved changes will be lost.')) {
      setSelectedProfile(null); // This will take user back to ProfileSelector
    }
  };

  // Creating an entry object and adding it to diaryEntries array
  const handleSaveEntry = async () => {
    if (diaryText.trim() === '') {
      alert("Please write something first!");
      return;
    }

    if (!selectedProfile) {
      alert("Please select a profile first!");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('💾 Saving entry for profile:', selectedProfile.name);

      // Send to backend (with AI processing)
      const result = await apiService.createEntry(diaryText, selectedProfile, new Date().toISOString().split('T')[0]);
      
      // Create a backend-style entry object
      const backendStyleEntry = {
        id: result.entry_id,
        text: diaryText,
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

  const handleEntryUpdated = (updatedEntry) => {
    console.log('📝 Entry updated:', updatedEntry.id);
    
    // Update the entry in our local state
    setDiaryEntries(diaryEntries.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    ));
    
    // Update timestamp to refresh any dependent components
    setLastEntryTimestamp(Date.now());
  };

  // Deleting entries
  const handleDeleteEntry = async (entryId) => {
    if (!selectedProfile) {
      alert("No profile selected!");
      return;
    }

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

  // Handle data import (for demo data, etc.)
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
      setLastEntryTimestamp(Date.now());
    }
  };

  // Get entries for a specific date (used by Calendar component)
  const getEntriesForDate = (date) => {
    console.log('🔍 getEntriesForDate called with:', date);
    console.log('📊 Current diaryEntries array:', diaryEntries);
    if (!selectedProfile) {
      console.log('⚠️ No profile selected, returning empty array');
      return [];
    }
    
    const filteredEntries = diaryEntries.filter(entry => {
      console.log(`Comparing entry.date "${entry.date}" with requested date "${date}"`);
      return entry.date === date;
    });
    
    console.log(`✅ Found ${filteredEntries.length} entries for ${date}:`, filteredEntries);
    return filteredEntries;
  };
  
  // Get unique dates that have entries (used by Calendar component)
  const getDatesWithEntries = () => {
    console.log('🔍 getDatesWithEntries called');
    console.log('📊 Current diaryEntries array:', diaryEntries);
    
    if (!selectedProfile) {
      console.log('⚠️ No profile selected, returning empty array');
      return [];
    }

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
    return null; // Connected status is shown in profile bar
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="App">
        <div className="auth-loading">
          <div className="auth-loading-icon">🏠</div>
          <div className="auth-loading-text">Loading Family Health Diary...</div>
        </div>
      </div>
    );
  }

  // Show auth form if user not logged in
  if (!user) {
    return (
      <div className="App">
        <AuthForm />
      </div>
    );
  }

  // Show profile selector if no profile selected
  if (!selectedProfile) {
    return (
      <div className="App">
        <ProfileSelector />
      </div>
    );
  }

  // Main app content for authenticated users with selected profile
  return (
    <div className="App">
      {/* Profile info bar */}
      <div className="profile-info-bar">
        <div className="profile-info-left">
          <span className="profile-avatar">{selectedProfile.avatar || '👤'}</span>
          <div className="profile-details">
            <div className="profile-name">
              {selectedProfile.name}'s Health Diary
            </div>
            <div className="profile-family">
              {user.familyName} Family • {diaryEntries.length} entries
            </div>
          </div>
        </div>
        <div className="profile-info-right">
          <button 
            className="switch-profile-btn"
            onClick={handleSwitchProfile}
            title="Switch to another family member"
          >
            Switch Profile
          </button>
          <div className={`connection-status ${backendStatus}`}>
            {backendStatus === 'connected' ? '🟢 Connected' : 
             backendStatus === 'checking' ? '🟡 Connecting...' : 
             '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* Hero/Home Section */}
      {currentView === 'home' && (
        <div className="hero-section">
          <HeroSection 
            currentView={currentView} 
            setCurrentView={setCurrentView}
            totalEntries={diaryEntries.length}
            selectedProfile={selectedProfile}
          />

          <FeatureShowcase setCurrentView={setCurrentView} />
          
          {/* Call to Action */}
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
      )}

      {/* Main content for other views */}
      {currentView !== 'home' && (
        <>
          <h1>My Health Diary App</h1>
          <p>Welcome to your personal AI-powered health tracker!</p>

          {/* Connection Status */}
          {renderConnectionStatus()}

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button onClick={() => setError(null)} className="error-close">✕</button>
            </div>
          )}

          {/* Input Section for Entries */}
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
              {diaryEntries.length > 0 && (
                <HealthCharts 
                  entries={diaryEntries}
                  selectedProfile={selectedProfile}
                />
              )}
              {diaryEntries.length === 0 && (
                <div className="no-entries-message">
                  📊 No data to visualize yet. Add some diary entries first!
                </div>
              )}
            </>
          )}

          {/* Analytics View */}
          {currentView === 'analytics' && (
            <WeeklyInsights 
              lastEntryTimestamp={lastEntryTimestamp}
              entries={diaryEntries}
              selectedProfile={selectedProfile}
            />
          )}

          {/* Show saved entries for list and calendar views */}
          {currentView !== 'analytics' && currentView !== 'charts' && currentView !== 'dev-tools' && diaryEntries.length > 0 && (
            <>
              {/* Quick Summary */}
              <Summary 
                Entries={diaryEntries}
                selectedProfile={selectedProfile}
                lastEntryTimestamp={lastEntryTimestamp}
              />

              {/* Calendar View Content */}
              {currentView === 'calendar' && (
                <Calendar 
                  key={selectedProfile?.id} //Forces re-render
                  getDatesWithEntries={getDatesWithEntries}
                  getEntriesForDate={getEntriesForDate}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  handleDeleteEntry={handleDeleteEntry}
                  selectedProfile={selectedProfile}
                  onEntryUpdated={handleEntryUpdated}
                />
              )}

              {/* List View Content */}
            {/* List View Content with list/grid toggle */}
            {currentView === 'list' && (
              <div className={`entries-section ${listViewMode === 'grid' ? 'horizontal' : ''}`}>
                
                {/* View mode toggle */}
                <div className="list-view-toggle">
                  <button
                    className={`list-toggle-btn ${listViewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setListViewMode('list')}
                  >
                    📋 List View
                  </button>
                  <button
                    className={`list-toggle-btn ${listViewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setListViewMode('grid')}
                  >
                    🔲 Grid View
                  </button>
                </div>

                <h3>Your Recent Entries ({diaryEntries.length} total)</h3>

                {/* Grid layout - COMPLETELY CLEAN */}
                {listViewMode === 'grid' && diaryEntries.length > 0 && (
                  <div className="entries-horizontal-container">
                    {diaryEntries.map((entry, index) => (
                      <DiaryEntry 
                        key={entry.id || index}
                        entry={entry}
                        deleteEntry={handleDeleteEntry}
                        viewMode="grid"
                        onEntryUpdated={handleEntryUpdated}
                      />
                    ))}
                  </div>
                )}

                {/* List layout (vertical) */}
                {listViewMode === 'list' && (
                  <div className="entries-vertical-container">
                    {diaryEntries.map((entry) => (
                      <DiaryEntry 
                        key={entry.id}
                        entry={entry}
                        deleteEntry={handleDeleteEntry}
                        viewMode="list"
                        onEntryUpdated={handleEntryUpdated}
                      />
                    ))}
                  </div>
                )}
                
              </div>
            )}
            </>
          )}

          {/* Developer Tools View */}
          {currentView === 'dev-tools' && (
            <DeveloperTools
              onImportData={handleDataImport}
              currentEntries={diaryEntries.length}
              allEntries={diaryEntries}
              onDataImported={loadEntries}
              selectedProfile={selectedProfile}
            />
          )}

          {/* Empty state when no entries and not loading and not in analytics view */}
          {diaryEntries.length === 0 && !isLoading && backendStatus === 'connected' && 
           currentView !== 'analytics' && currentView !== 'charts' && currentView !== 'dev-tools' && (
            <div className="no-entries-message">
              📝 No entries yet for {selectedProfile.name}. Start writing your first health diary entry above!
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
