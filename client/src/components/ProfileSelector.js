import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AddProfileModal from './AddProfileModal';
import './ProfileSelector.css';

const ProfileSelector = () => {
  const { user, selectedProfile, setSelectedProfile, authenticatedFetch, logout } = useAuth();
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFamilyProfiles();
  }, []);

  const loadFamilyProfiles = async () => {
    try {
      setError(null);
      const response = await authenticatedFetch('http://localhost:5001/api/family/profiles');
      
      if (response.ok) {
        const profiles = await response.json();
        setFamilyProfiles(profiles);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load profiles');
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
      setError('Failed to load family profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = (profile) => {
    setSelectedProfile(profile);
  };

  const handleProfileAdded = (newProfile) => {
    setFamilyProfiles([...familyProfiles, newProfile]);
    setShowAddProfile(false);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="loading-message">
            ⏳ Loading family profiles...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="error-message">
            ❌ {error}
          </div>
          <button onClick={loadFamilyProfiles} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>👋 Welcome back, {user.familyName}!</h1>
          <p>Who's tracking their health today?</p>
          <button onClick={logout} className="logout-button">
            🔓 Sign Out
          </button>
        </div>

        <div className="profiles-grid">
          {familyProfiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => selectProfile(profile)}
              className="profile-item"
              style={{ '--profile-color': profile.color }}
            >
              <div className="profile-avatar">
                {profile.avatar}
              </div>
              <h3 className="profile-name">{profile.name}</h3>
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{profile.entry_count || 0}</span>
                  <span className="stat-label">entries</span>
                </div>
                {profile.healthScore !== undefined && (
                  <div className="stat">
                    <span className="stat-number">{profile.healthScore}%</span>
                    <span className="stat-label">health</span>
                  </div>
                )}
              </div>
              {profile.lastActive && (
                <div className="last-active">
                  Last active: {new Date(profile.lastActive).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}

          {/* Add New Profile Button */}
          <div
            onClick={() => setShowAddProfile(true)}
            className="profile-item add-profile"
          >
            <div className="profile-avatar add-avatar">
              ➕
            </div>
            <h3 className="profile-name">Add Family Member</h3>
            <p className="add-description">Create a new profile</p>
          </div>
        </div>

        {/* Add Profile Modal */}
        {showAddProfile && (
          <AddProfileModal
            onClose={() => setShowAddProfile(false)}
            onProfileAdded={handleProfileAdded}
          />
        )}
      </div>
    </div>
  );
};

export default ProfileSelector;