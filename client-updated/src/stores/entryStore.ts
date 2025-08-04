import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/apiClient';

export interface DiaryEntry {
  id: number;
  text: string;
  date: string;
  user_id: number;
  ai_confidence: number;
  text_preview?: string;
}

interface EntryState {
  entries: DiaryEntry[];
  isLoading: boolean;
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  } | null;
  fetchAllEntries: (page?: number, pageSize?: number) => Promise<void>;
  fetchMemberEntries: (userId: number, limit?: number) => Promise<void>;
  addEntry: (entry: { text: string; user_id: number; date: string }) => Promise<{ success: boolean; message?: string; entry_id?: number }>;
  updateEntry: (id: number, entry: { text: string }) => Promise<{ success: boolean; message?: string }>;
  deleteEntry: (id: number) => Promise<{ success: boolean; message?: string }>;
  bulkImport: (text: string, userId: number) => Promise<{ success: boolean; processed?: number; message?: string }>;
  getEntriesByDate: (date: string) => DiaryEntry[];
}

export const useEntryStore = create<EntryState>()(
  persist(
    (set, get) => ({
      entries: [],
      isLoading: false,
      pagination: null,

      fetchAllEntries: async (page=1, pageSize=20) => {
        set({ isLoading: true });
        try {
          const response = await api.get(`/entries/all?page=${page}&page_size=${pageSize}`);
          set({ entries: response.data.entries, isLoading: false, pagination: response.data.pagination });
        } catch (error) {
          console.error('Error fetching entries:', error);
          set({ isLoading: false });
        }
      },

      fetchMemberEntries: async (userId, limit = 50) => {
        set({ isLoading: true });
        try {
          const response = await api.get(`/entries?user_id=${userId}&limit=${limit}`);
          set({ entries: response.data.entries, isLoading: false });
        } catch (error) {
          console.error('Error fetching entries:', error);
          set({ isLoading: false });
        }
      },

      addEntry: async (entry) => {
        try {
          const response = await api.post('/entries', entry);
          if (response.data.success) {
            // Re-fetch entries to get updated list
            const entriesResponse = await api.get(`/entries?user_id=${entry.user_id}&limit=50`);
            set({ entries: entriesResponse.data.entries });
            return { success: true, entry_id: response.data.entry_id };
          }
          return { success: false, message: 'Failed to add entry.' };
        } catch (error: any) {
          console.error('Error adding entry:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to add entry.' };
        }
      },

      updateEntry: async (id, updatedData) => {
        try {
          const response = await api.put(`/entries/${id}`, updatedData);
          if (response.data.success) {
            // Update the entry in the local state
            set((state) => ({
              entries: state.entries.map((entry) =>
                entry.id === id ? { ...entry, text: updatedData.text } : entry
              )
            }));
            return { success: true };
          }
          return { success: false, message: 'Failed to update entry.' };
        } catch (error: any) {
          console.error('Error updating entry:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to update entry.' };
        }
      },

      deleteEntry: async (id) => {
        try {
          const response = await api.delete(`/entries/${id}`);
          if (response.data.success) {
            set((state) => ({
              entries: state.entries.filter((entry) => entry.id !== id)
            }));
            return { success: true, message: response.data.message };
          }
          return { success: false, message: 'Failed to delete entry.' };
        } catch (error: any) {
          console.error('Error deleting entry:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to delete entry.' };
        }
      },

      bulkImport: async (text, userId) => {
        try {
          const response = await api.post('/entries/bulk-import', { text, user_id: userId });
          if (response.data.success) {
            // Re-fetch entries to get updated list
            const entriesResponse = await api.get(`/entries?user_id=${userId}&limit=50`);
            set({ entries: entriesResponse.data.entries });
            return { success: true, processed: response.data.processed };
          }
          return { success: false, message: 'Failed to import entries.' };
        } catch (error: any) {
          console.error('Error importing entries:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to import entries.' };
        }
      },

      getEntriesByDate: (date) => {
        return get().entries.filter((entry) => entry.date === date);
      }
    }),
    {
      name: 'health-diary-entries'
    }
  )
);