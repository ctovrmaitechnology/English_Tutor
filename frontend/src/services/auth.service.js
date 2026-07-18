import api from './api';

export const authService = {
  async login(username, password) {
    localStorage.removeItem('hasCompletedPlacement');
    localStorage.removeItem('placementResult');
    localStorage.removeItem('assessmentResults');
    const response = await api.post('/auth/login', { username, password });
    const { access_token } = response.data;
    localStorage.setItem('buddy_token', access_token);
    return response.data;
  },

  async register(data) {
    localStorage.removeItem('hasCompletedPlacement');
    localStorage.removeItem('placementResult');
    localStorage.removeItem('assessmentResults');
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout() {
    localStorage.removeItem('buddy_token');
    localStorage.removeItem('buddy_user');
    localStorage.removeItem('hasCompletedPlacement');
    localStorage.removeItem('placementResult');
    localStorage.removeItem('assessmentResults');
  },

  isLoggedIn() {
    return !!localStorage.getItem('buddy_token');
  },

  getToken() {
    return localStorage.getItem('buddy_token');
  },
};