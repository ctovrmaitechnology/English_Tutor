import api from './api';

export const chatService = {
  sendMessage: (message) =>
    api.post('/chat/message', { message }),

  sendVoice: (formData) =>
    api.post('/chat/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getHistory: () =>
    api.get('/chat/history'),

  clearHistory: () =>
    api.delete('/chat/history'),
};