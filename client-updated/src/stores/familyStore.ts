import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/apiClient';

export interface FamilyMember {
  id: number;
  name: string;
  avatar: string;
  color: string;
  role: string;
  username: string;
  entry_count: number;
  healthScore: number;
  lastActive: string;
}

interface FamilyState {
  members: FamilyMember[];
  isLoading: boolean;
  fetchMembers: () => Promise<void>;
  addMember: (member: { name: string; avatar: string; color: string }) => Promise<{ success: boolean; message?: string; profile?: FamilyMember }>;
  updateMember: (id: number, member: Partial<FamilyMember>) => Promise<{ success: boolean; message?: string; profile?: FamilyMember }>;
  deleteMember: (id: number) => Promise<{ success: boolean; message: string }>;
  getMemberById: (id: number) => FamilyMember | undefined;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      members: [],
      isLoading: false,

      fetchMembers: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/family/profiles');
          set({ members: response.data, isLoading: false });
        } catch (error) {
          console.error('Error fetching members:', error);
          set({ isLoading: false });
        }
      },

      addMember: async (newMember) => {
        try {
          const response = await api.post('/family/profiles', newMember);
          const createdMember: FamilyMember = response.data.profile;
          set((state) => ({
            members: [...state.members, createdMember]
          }));
          return { success: true, profile: createdMember };
        } catch (error: any) {
          console.error('Error adding member:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to add member.' };
        }
      },

      updateMember: async (id, updatedData) => {
        try {
          const response = await api.put(`/family/profiles/${id}`, updatedData);
          const updatedMember = response.data.profile;
          set((state) => ({
            members: state.members.map((member) =>
              member.id === id ? updatedMember : member
            )
          }));
          return { success: true, profile: updatedMember };
        } catch (error: any) {
          console.error('Error updating member:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to update member.' };
        }
      },

      deleteMember: async (id) => {
        try {
          await api.delete(`/family/profiles/${id}`);
          set((state) => ({
            members: state.members.filter((member) => member.id !== id)
          }));
          return { success: true, message: 'Member deleted successfully.' };
        } catch (error: any) {
          console.error('Error deleting member:', error);
          return { success: false, message: error?.response?.data?.message || 'Failed to delete member.' };
        }
      },

      getMemberById: (id) => {
        return get().members.find((member) => member.id === id);
      }
    }),
    {
      name: 'health-diary-family'
    }
  )
);