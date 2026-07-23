import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('buddy_token') || localStorage.getItem('vrm_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-handle 401 → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRequest = error.config?.url?.includes('/auth/');
      if (!isAuthRequest) {
        localStorage.removeItem('buddy_token');
        localStorage.removeItem('buddy_user');
        localStorage.removeItem('vrm_remember_me');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export default api;