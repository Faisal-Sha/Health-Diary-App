import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/apiClient';

interface User {
  id: number;
  email: string;
  familyName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { token, user } = response.data;
      
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
      
          localStorage.setItem('token', token);
      
        } catch (error: any) {
          set({ isLoading: false });
          const message =
            error.response?.data?.error || 'Login failed. Please try again.';
          throw new Error(message);
        }
      },

      register: async (email: string, password: string, familyName: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', {
            email,
            password,
            familyName,
          });
      
          const { token, user } = response.data;
      
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
      
          // Optionally persist token manually if needed
          localStorage.setItem('token', token);
      
        } catch (error: any) {
          set({ isLoading: false });
          const message =
            error.response?.data?.error || 'Registration failed. Please try again.';
          throw new Error(message);
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
      }
    }),
    {
      name: 'health-diary-auth'
    }
  )
);