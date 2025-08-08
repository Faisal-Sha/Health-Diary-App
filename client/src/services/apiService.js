//handles all communication with flask backend

import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_URL;

class ApiService {
  constructor() {
    this.authToken = null;

    this.api = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.api.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.authToken = null;
          window.dispatchEvent(new CustomEvent('auth-expired'));
          throw new Error('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );
    
    // Listen for auth events from AuthContext
    window.addEventListener('auth-expired', () => {
      this.authToken = null;
    });
  }

  // Set the auth token (called by AuthContext when user logs in)
  setAuthToken(token) {
    this.authToken = token;
  }

  // Get headers for authenticated requests
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  // Helper method to handle HTTP responses
  async handleResponse(response) {
    return response.data;
  }

  // Test if backend is running
  async healthCheck() {
    try {
      const response = await this.api.get('/health');
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Create a new diary entry
  async createEntry(diaryText, selectedProfile, entryDate = null) {
    try {
      if (!selectedProfile) {
        throw new Error('No profile selected');
      }
      
      const requestBody = {
        text: diaryText,
        user_id: selectedProfile.id,
        date: entryDate || new Date().toISOString().split('T')[0] // Use ISO date format
      };

      const response = await this.api.post('/entries', requestBody);

      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to create entry:', error);
      throw error;
    }
  }

  // Get diary entries with optional filtering
  async getEntries(selectedProfile, options = {}) {
    try {
      if (!selectedProfile) {
        throw new Error('No profile selected');
      }

      const params = new URLSearchParams();
      params.append('user_id', selectedProfile.id);
      
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.limit) params.append('limit', options.limit.toString());

      const url = `${BASE_URL}/entries${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await this.api.get(url);
      
      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch entries:', error);
      throw error;
    }
  }

  // Bulk import diary entries
  async bulkImportEntries(entries) {
    try {
      const response = await this.api.post('/entries/bulk-import', entries);
      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('❌ Failed to bulk import entries:', error);
      throw error;
    }
  }

  // Get health analytics summary
  async getHealthSummary(selectedProfile, days = 30) {
    try {
      if (!selectedProfile) {
        throw new Error('No profile selected');
      }

      const params = new URLSearchParams();
      params.append('user_id', selectedProfile.id);
      params.append('days', days.toString());

      const response = await this.api.get(`/analytics/weekly-summary?${params.toString()}`);
      
      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  // Get entries for a specific date (for calendar)
  async getEntriesForDate(selectedProfile, date) {
    try {
      if (!selectedProfile) {
        throw new Error('No profile selected');
      }

      const result = await this.getEntries(selectedProfile, {
        startDate: date,
        endDate: date
      });
      return result.entries;
    } catch (error) {
      console.error(`❌ Failed to fetch entries for ${date}:`, error);
      throw error;
    }
  }

  // Convert backend entry format to your current React format
  convertBackendEntry(backendEntry) {
    
    // Create a proper Date object and format time
    const createdDate = new Date(backendEntry.created_at);
    const entryDate = backendEntry.entry_date;
    
    const convertedEntry = {
      id: backendEntry.id,
      text: backendEntry.text,
      date: this.formatDateForReact(entryDate), // Convert to your expected format
      time: createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      
      // Convert AI scores to your original format
      mood: this.mapMoodScore(backendEntry.mood_score),
      energy: backendEntry.energy_level,
      painLevel: backendEntry.pain_level,
      sleepQuality: backendEntry.sleep_quality,
      sleepHours: backendEntry.sleep_hours,
      stressLevel: backendEntry.stress_level,
      
      // Symptoms (placeholder for now, will implement properly later)
      symptoms: this.extractSymptomsFromAI(backendEntry),
      
      // AI metadata
      aiConfidence: backendEntry.ai_confidence || 0,
      
      // Additional AI data for debugging
      aiData: {
        moodScore: backendEntry.mood_score,
        energyLevel: backendEntry.energy_level,
        painLevel: backendEntry.pain_level,
        sleepQuality: backendEntry.sleep_quality,
        sleepHours: backendEntry.sleep_hours,
        stressLevel: backendEntry.stress_level
      }
    };
    
    return convertedEntry;
  }

  // Format date to match your React component expectations
  formatDateForReact(dateString) {
    
    // Handle null/undefined dates
    if (!dateString) {
      return new Date().toLocaleDateString();
    }
    
    // Create date object - handle different formats from backend
    let date;
    
    if (dateString.includes('GMT') || dateString.includes('T')) {
      // Backend sends full date strings like "Sun, 08 Jun 2025 00:00:00 GMT"
      date = new Date(dateString);
    } else {
      // Simple format like "2024-06-06"
      date = new Date(dateString + 'T12:00:00');
    }
    
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString();
    }
    
    const formatted = date.toLocaleDateString();
    return formatted;
  }

  // Map AI mood score (1-10) to your current mood categories
  mapMoodScore(score) {  // ✅ FIXED: was "mapMoodSc"
    if (!score) return 'neutral';
    if (score >= 7) return 'positive';
    if (score <= 4) return 'negative';
    return 'neutral';
  }
  
  // ADD this missing method that DiaryEntry is trying to call:
  mapMoodFromScore(score) {  
    // This is the same as mapMoodScore but with the name DiaryEntry expects
    return this.mapMoodScore(score);
  }
  
  // Update a specific entry - ADD this missing method
  async updateEntry(entryId, newText) {
    try {
      
      const response = await fetch(`${BASE_URL}/entries/${entryId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ text: newText })
      });
  
      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  // Extract symptoms from AI data (enhanced)
  extractSymptomsFromAI(backendEntry) {
    const symptoms = [];
    
    // Add pain-related symptoms
    if (backendEntry.pain_level && backendEntry.pain_level > 3) {
      symptoms.push('pain');
    }
    
    // Add fatigue if low energy
    if (backendEntry.energy_level && backendEntry.energy_level < 4) {
      symptoms.push('fatigue');
    }
    
    // Add sleep issues
    if (backendEntry.sleep_quality && backendEntry.sleep_quality < 4) {
      symptoms.push('sleep issues');
    }
    
    // Add stress if high
    if (backendEntry.stress_level && backendEntry.stress_level > 6) {
      symptoms.push('stress');
    }
    
    // TODO: Later we'll get actual symptoms from the database relationships
    return symptoms;
  }


  async updateEntry(entryId, newText) {
    try {
      
      const response = await this.api.put(`/entries/${entryId}`, {
        text: newText
      });
  
      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  // Delete a specific entry
  async deleteEntry(entryId) {
    try {
      
      const response = await this.api.delete(`/entries/${entryId}`);

      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to delete entry:', error);
      throw error;
    }
  }

  // Clear ALL entries (use with extreme caution!)
  async clearAllEntries(selectedProfile) {
    try {
      if (!selectedProfile) {
        throw new Error('No profile selected');
      }
      
      const response = await this.api.delete(`/entries/clear-all`, {
        data: { user_id: selectedProfile.id }
      });

      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  // Delete multiple entries at once
  async bulkDeleteEntries(entryIds) {
    try {
      
      const response = await this.api.delete(`/entries/bulk-delete`, {
        data: { entry_ids: entryIds }
      });

      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  // Check if an entry is a demo entry (starts with 'demo_')
  isDemoEntry(entryId) {
    return String(entryId).startsWith('demo_');
  }
}

// Export a singleton instance
export default new ApiService();