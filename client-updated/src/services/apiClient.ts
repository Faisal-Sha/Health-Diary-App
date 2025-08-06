import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_URL;
console.log("REACT_APP_API_URL", REACT_APP_API_URL);

const api = axios.create({
  baseURL: BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add the JWT token to the request headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
