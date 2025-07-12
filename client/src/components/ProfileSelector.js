import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AddProfileModal from './AddProfileModal';
import ManageProfileModals from './ManageProfileModals';
import './ProfileSelector.css';

const ProfileSelector = () => {
  const { user, selectedProfile, setSelectedProfile, authenticatedFetch, logout } = useAuth();
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showManageProfiles, setShowManageProfiles] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFamilyProfiles();
  }, []);

  // Add interactive effects after component mounts
  useEffect(() => {
    const addInteractiveEffects = () => {
      const profileCards = document.querySelectorAll('.profile-card:not(.add-profile-card)');
      
      // Add hover effects for profile cards
      profileCards.forEach(card => {
        const avatar = card.querySelector('.profile-avatar');
        
        const handleMouseEnter = () => {
          if (avatar) {
            avatar.style.transform = 'scale(1.1) rotate(5deg)';
          }
        };
        
        const handleMouseLeave = () => {
          if (avatar) {
            avatar.style.transform = 'scale(1) rotate(0deg)';
          }
        };

        card.addEventListener('mouseenter', handleMouseEnter);
        card.addEventListener('mouseleave', handleMouseLeave);

        // Store cleanup functions
        card._cleanupHover = () => {
          card.removeEventListener('mouseenter', handleMouseEnter);
          card.removeEventListener('mouseleave', handleMouseLeave);
        };
      });

      // Add click ripple effect
      const allCards = document.querySelectorAll('.profile-card');
      allCards.forEach(card => {
        const handleClick = (e) => {
          const ripple = document.createElement('div');
          ripple.style.position = 'absolute';
          ripple.style.borderRadius = '50%';
          ripple.style.background = 'rgba(255, 255, 255, 0.6)';
          ripple.style.transform = 'scale(0)';
          ripple.style.animation = 'ripple 0.6s linear';
          ripple.style.pointerEvents = 'none';
          ripple.style.zIndex = '100';
          
          const rect = card.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          ripple.style.width = size + 'px';
          ripple.style.height = size + 'px';
          ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
          ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
          
          card.style.position = 'relative';
          card.appendChild(ripple);
          
          setTimeout(() => {
            if (ripple.parentNode) {
              ripple.remove();
            }
          }, 600);
        };

        card.addEventListener('click', handleClick);
        
        // Store cleanup function
        card._cleanupRipple = () => {
          card.removeEventListener('click', handleClick);
        };
      });
    };

    // Add CSS for ripple animation if it doesn't exist
    if (!document.getElementById('ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'ripple-styles';
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    if (!loading && familyProfiles.length > 0) {
      // Add a small delay to ensure DOM is ready
      setTimeout(addInteractiveEffects, 100);
    }

    // Cleanup function
    return () => {
      const cards = document.querySelectorAll('.profile-card');
      cards.forEach(card => {
        if (card._cleanupHover) card._cleanupHover();
        if (card._cleanupRipple) card._cleanupRipple();
      });
    };
  }, [loading, familyProfiles]);

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
    // Add selection animation
    const card = document.querySelector(`[data-profile-id="${profile.id}"]`);
    if (card) {
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = 'translateY(-8px)';
        setSelectedProfile(profile);
      }, 150);
    } else {
      setSelectedProfile(profile);
    }
  };

  const handleProfileAdded = (newProfile) => {
    setFamilyProfiles([...familyProfiles, newProfile]);
    setShowAddProfile(false);
  };

  const handleAddNewProfile = () => {
    setShowAddProfile(true);
  };

  const handleManageProfiles = () => {
    setShowManageProfiles(true);
  };

  const handleProfileUpdated = (updatedProfile) => {
    setFamilyProfiles(profiles => 
      profiles.map(profile => 
        profile.id === updatedProfile.id 
          ? { ...profile, ...updatedProfile }
          : profile
      )
    );
  };

  const handleProfileDeleted = (deletedProfileId) => {
    setFamilyProfiles(profiles => 
      profiles.filter(profile => profile.id !== deletedProfileId)
    );

    if (selectedProfile && selectedProfile.id === deletedProfileId) {
        setSelectedProfile(null);
    }
    };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="profile-container">
        <div className="grid-background"></div>
        <div className="container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Loading family profiles...</h2>
            <p>Please wait while we fetch your family's health data.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="profile-container">
        <div className="grid-background"></div>
        <div className="container">
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>Unable to load profiles</h2>
            <p>{error}</p>
            <button onClick={loadFamilyProfiles} className="retry-button">
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="grid-background"></div>
      
      <div className="container">
        <div className="header">
          <div className="app-title">
            <div className="app-logo">🏠</div>
            <div className="app-name">Family Health Diary</div>
          </div>
        </div>

        <div className="welcome-message">
          <div className="welcome-text">👋 Welcome back, {user.familyName || 'the angry family'}!</div>
          <div className="welcome-subtitle">Who's tracking their health today?</div>
        </div>

        <div className="profiles-section">
          <h2 className="section-title">Family Members</h2>
          <div className="profiles-grid">
            {familyProfiles.map((profile) => (
              <div
                key={profile.id}
                data-profile-id={profile.id}
                onClick={() => selectProfile(profile)}
                className="profile-card"
              >
                <div className="profile-header">
                  <div 
                    className="profile-avatar"
                    style={{ 
                      background: profile.color 
                        ? `linear-gradient(135deg, ${profile.color}, ${adjustColor(profile.color, -20)})` 
                        : 'linear-gradient(135deg, #4facfe, #00f2fe)'
                    }}
                  >
                    {profile.avatar || '👤'}
                  </div>
                  <div className="profile-info">
                    <h3>{profile.name}</h3>
                    <span className="profile-role">
                      {profile.isAdmin ? 'Administrator' : 'Family Member'}
                    </span>
                  </div>
                </div>
                
                <div className="health-metrics">
                  <div className="metric-card">
                    <span className="metric-value">{profile.entry_count || 0}</span>
                    <div className="metric-label">Entries</div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-value">{profile.healthScore || 0}%</span>
                    <div className="metric-label">Health Score</div>
                  </div>
                </div>
                
                <div className="health-status">
                  <div className="status-indicator"></div>
                  <span className="status-text">
                    {profile.entry_count > 0 ? 'Active tracker' : 'Ready to track'}
                  </span>
                </div>
                
                <div className="last-activity">
                  {profile.lastActive 
                    ? `Last active: ${new Date(profile.lastActive).toLocaleDateString()}`
                    : 'No recent activity'
                  }
                </div>
              </div>
            ))}

            {/* Add Profile Card */}
            <div className="profile-card add-profile-card" onClick={handleAddNewProfile}>
              <div className="add-icon">➕</div>
              <div className="add-title">Add Family Member</div>
              <div className="add-description">
                Create a new profile to start tracking another family member's health journey
              </div>
            </div>
          </div>
        </div>

        <div className="action-bar">
          <div className="quick-actions">
            <button className="action-btn" onClick={handleManageProfiles}>
              ⚙️ Manage Profiles
            </button>
          </div>
          
          <div className="logout-section">
            <div className="user-info">
              <div className="user-name">{user.familyName || 'The Angry Family'}</div>
              <div className="user-role">Account Owner</div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Add Profile Modal */}
        {showAddProfile && (
          <AddProfileModal
            onClose={() => setShowAddProfile(false)}
            onProfileAdded={handleProfileAdded}
          />
        )}

        {showManageProfiles && (
            <ManageProfileModals
                onClose={() => setShowManageProfiles(false)}
                profiles={familyProfiles}
                onProfileUpdated={handleProfileUpdated}
                onProfileDeleted={handleProfileDeleted}
            />
        )}
      </div>
    </div>
  );
};

// Helper function to adjust color brightness
function adjustColor(color, percent) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

export default ProfileSelector;