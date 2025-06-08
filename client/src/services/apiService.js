//handles all communication with flask backend

const BASE_URL = 'http://localhost:5001/api';

class ApiService {
  
  // Helper method to handle HTTP responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Test if backend is running
  async healthCheck() {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Create a new diary entry
  async createEntry(diaryText, entryDate = null) {
    try {
      const requestBody = {
        text: diaryText,
        date: entryDate || new Date().toLocaleDateString()
      };

      console.log('📤 Sending entry to backend:', requestBody);

      const response = await fetch(`${BASE_URL}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await this.handleResponse(response);
      console.log('✅ Entry saved successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to create entry:', error);
      throw error;
    }
  }

  // Get diary entries with optional filtering
  async getEntries(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.limit) params.append('limit', options.limit.toString());

      const url = `${BASE_URL}/entries${params.toString() ? '?' + params.toString() : ''}`;
      
      console.log('📥 Fetching entries from:', url);

      const response = await fetch(url);
      const result = await this.handleResponse(response);
      
      console.log(`✅ Fetched ${result.entries.length} entries`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch entries:', error);
      throw error;
    }
  }

  // Get health analytics summary
  async getHealthSummary(days = 30) {
    try {
      const response = await fetch(`${BASE_URL}/analytics/summary?days=${days}`);
      const result = await this.handleResponse(response);
      
      console.log('📊 Health summary fetched:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch health summary:', error);
      throw error;
    }
  }

  // Get entries for a specific date (for calendar)
  async getEntriesForDate(date) {
    try {
      const result = await this.getEntries({
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
    
    return {
      id: backendEntry.id,
      text: backendEntry.entry_text,
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
  }

  // Format date to match your React component expectations
  formatDateForReact(dateString) {
    // Convert "2024-06-06" to "6/6/2024" (your original format)
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString();
  }

  // Map AI mood score (1-10) to your current mood categories
  mapMoodScore(score) {
    if (!score) return 'neutral';
    if (score >= 7) return 'positive';
    if (score <= 4) return 'negative';
    return 'neutral';
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
}

// Export a singleton instance
export default new ApiService();