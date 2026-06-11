import api from './api';

export const authService = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    const { access_token } = response.data;
    localStorage.setItem('buddy_token', access_token);
    return response.data;
  },

  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout() {
    localStorage.removeItem('buddy_token');
    localStorage.removeItem('buddy_user');
  },

  isLoggedIn() {
    return !!localStorage.getItem('buddy_token');
  },

  getToken() {
    return localStorage.getItem('buddy_token');
  },
};