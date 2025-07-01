import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AddProfileModal.css';

const AddProfileModal = ({ onClose, onProfileAdded }) => {
  const { authenticatedFetch } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    avatar: '👤',
    color: '#2196f3'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (formData.name.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authenticatedFetch('http://localhost:5001/api/family/profiles', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        onProfileAdded(result.profile);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const selectAvatar = (avatar) => {
    setFormData({ ...formData, avatar });
  };

  const selectColor = (color) => {
    setFormData({ ...formData, color });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Family Member</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter family member's name"
              disabled={isLoading}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label>Choose Avatar</label>
            <div className="avatar-grid">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => selectAvatar(avatar)}
                  className={`avatar-option ${formData.avatar === avatar ? 'selected' : ''}`}
                  disabled={isLoading}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Choose Color</label>
            <div className="color-grid">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => selectColor(color)}
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  disabled={isLoading}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="profile-preview">
            <div className="preview-label">Preview:</div>
            <div className="preview-profile">
              <div 
                className="preview-avatar"
                style={{ backgroundColor: formData.color }}
              >
                {formData.avatar}
              </div>
              <div className="preview-name">
                {formData.name || 'Family Member'}
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-button"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? '⏳ Creating...' : '✅ Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProfileModal;