import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API base URL
const API_BASE = process.env.REACT_APP_API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        const response = await api.get('/auth/verify');
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('authToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
  
      localStorage.setItem('authToken', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (email, password, familyName) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', {
        email,
        password,
        familyName
      });
  
      localStorage.setItem('authToken', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setSelectedProfile(null);
    setError(null);
  };

  // Get auth token for API calls
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  // Create axios instance with default configuration
  const api = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add request interceptor for authentication
  api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Add response interceptor for handling 401
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }
      return Promise.reject(error);
    }
  );

  // Make authenticated API calls
  const authenticatedFetch = async (url, options = {}) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    try {
      const response = await api.request({
        url,
        ...options
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    selectedProfile,
    setSelectedProfile,
    loading,
    error,
    login,
    register,
    logout,
    getAuthToken,
    authenticatedFetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};