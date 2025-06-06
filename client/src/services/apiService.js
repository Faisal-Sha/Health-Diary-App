//handles all communication with flask backend

const BASE_URL = 'http://localhost:5000/api';

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
        } catch(error) {
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
        return {
        id: backendEntry.id,
        text: backendEntry.entry_text,
        date: backendEntry.entry_date,
        time: new Date(backendEntry.created_at).toLocaleTimeString(),
        mood: this.mapMoodScore(backendEntry.mood_score),
        symptoms: this.extractSymptoms(backendEntry), // We'll implement this
        aiConfidence: backendEntry.ai_confidence
        };
    }

    // Map AI mood score (1-10) to your current mood categories
    mapMoodScore(score) {
        if (!score) return 'neutral';
        if (score >= 7) return 'positive';
        if (score <= 4) return 'negative';
        return 'neutral';
    }

    // Extract symptoms from backend data (placeholder for now)
    extractSymptoms(backendEntry) {
        // TODO: When you implement symptoms table relationships,
        // this will fetch the actual symptoms
        return []; // Placeholder
    }


}

export default new ApiService();