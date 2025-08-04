import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ManageProfileModals.css';

const BASE_URL = process.env.REACT_APP_API_URL;

const ManageProfileModals = ({ onClose, profiles, onProfileUpdated, onProfileDeleted }) => {
  const { authenticatedFetch } = useAuth();
  const [editingProfile, setEditingProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Avatar and color options (same as AddProfileModal)
  const avatarOptions = [
    '👨', '👩', '👧', '👦', '👴', '👵', 
    '👨‍⚕️', '👩‍⚕️', '👨‍💼', '👩‍💼', 
    '🧑‍🎓', '👨‍🍳', '👩‍🍳', '🤱', '👶'
  ];

  const colorOptions = [
    '#e91e63', '#2196f3', '#ff9800', '#4caf50', 
    '#9c27b0', '#f44336', '#795548', '#607d8b',
    '#ff5722', '#3f51b5', '#00bcd4', '#8bc34a'
  ];

  // Start editing a profile
  const startEditing = (profile) => {
    setEditingProfile({
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      color: profile.color
    });
    setError('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingProfile(null);
    setError('');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!editingProfile.name.trim()) {
      setError('Name is required');
      return;
    }

    if (editingProfile.name.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authenticatedFetch(
        `${BASE_URL}/family/profiles/${editingProfile.id}`, 
        {
          method: 'PUT',
          data: {
            name: editingProfile.name.trim(),
            avatar: editingProfile.avatar,
            color: editingProfile.color
          }
        }
      );

      const result = response.data;
      onProfileUpdated(result.profile);
      setEditingProfile(null);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update profile. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete profile with confirmation
  const handleDeleteProfile = async (profile) => {
    // Check if this is the last admin
    const adminCount = profiles.filter(p => p.role === 'admin').length;
    if (profile.role === 'admin' && adminCount <= 1) {
      setError('Cannot delete the last admin user');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${profile.name}'s profile?\n\nThis will permanently delete:\n• All their health entries\n• All their data\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authenticatedFetch(
        `${BASE_URL}/family/profiles/${profile.id}`, 
        {
          method: 'DELETE'
        }
      );
    
      const result = response.data;
      onProfileDeleted(profile.id);
      alert(`✅ ${profile.name}'s profile has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting profile:', error);
      const errorMsg =
        error.response?.data?.error || 'Failed to delete profile. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manage-profiles-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Manage Family Profiles</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="manage-profiles-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="profiles-list">
            {profiles.map((profile) => (
              <div key={profile.id} className="profile-item">
                {editingProfile && editingProfile.id === profile.id ? (
                  // Edit mode
                  <form onSubmit={handleUpdateProfile} className="edit-profile-form">
                    <div className="profile-header-edit">
                      <div 
                        className="profile-avatar-edit"
                        style={{ backgroundColor: editingProfile.color }}
                      >
                        {editingProfile.avatar}
                      </div>
                      <div className="profile-details-edit">
                        <input
                          type="text"
                          value={editingProfile.name}
                          onChange={(e) => setEditingProfile({
                            ...editingProfile, 
                            name: e.target.value
                          })}
                          className="profile-name-input"
                          placeholder="Enter name"
                          maxLength={50}
                          disabled={isLoading}
                          autoFocus
                        />
                        <div className="profile-role">
                          {profile.role === 'admin' ? 'Admin' : 'Family Member'} • {profile.entry_count || 0} entries
                        </div>
                      </div>
                    </div>

                    {/* Avatar selector */}
                    <div className="avatar-selector">
                      <label>Avatar:</label>
                      <div className="avatar-options">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() => setEditingProfile({...editingProfile, avatar})}
                            className={`avatar-option ${editingProfile.avatar === avatar ? 'selected' : ''}`}
                            disabled={isLoading}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color selector */}
                    <div className="color-selector">
                      <label>Color:</label>
                      <div className="color-options">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingProfile({...editingProfile, color})}
                            className={`color-option ${editingProfile.color === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="edit-actions">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="cancel-edit-btn"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="save-btn"
                        disabled={isLoading || !editingProfile.name.trim()}
                      >
                        {isLoading ? '⏳ Saving...' : '✅ Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  // View mode
                  <div className="profile-view">
                    <div className="profile-header-view">
                      <div 
                        className="profile-avatar-view"
                        style={{ 
                          backgroundColor: profile.color || '#2196f3'
                        }}
                      >
                        {profile.avatar || '👤'}
                      </div>
                      <div className="profile-details-view">
                        <h3 className="profile-name">{profile.name}</h3>
                        <div className="profile-meta">
                          <span className="profile-role">
                            {profile.role === 'admin' ? '👑 Admin' : '👤 Family Member'}
                          </span>
                          <span className="profile-stats">
                            {profile.entry_count || 0} entries
                          </span>
                          {profile.lastActive && (
                            <span className="last-active">
                              Last active: {new Date(profile.lastActive).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="profile-actions">
                      <button
                        onClick={() => startEditing(profile)}
                        className="edit-btn"
                        disabled={isLoading}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile)}
                        className="delete-btn"
                        disabled={isLoading || (profile.role === 'admin' && profiles.filter(p => p.role === 'admin').length <= 1)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="manage-actions">
            <button onClick={onClose} className="close-manage-btn">
              ✅ Done Managing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageProfileModals;