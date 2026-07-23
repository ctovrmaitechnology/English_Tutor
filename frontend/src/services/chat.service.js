/**
 * chat.service.js — Frontend chat service
 * Updated to support remarkContext injection for AI personalization.
 * The remarkContext is loaded once at login from /remarks/me/context
 * and passed with every message — zero extra latency.
 */
import api from './api';

export const chatService = {
  /**
   * Send a text message to the AI companion / tutor.
   * @param {string} message — user's message
   * @param {string} remarkContext — optional candidate profile context
   * @param {'buddy' | 'tutor'} mode — mode selection ('buddy' vs 'tutor')
   */
  async sendMessage(message, remarkContext = '', mode = 'buddy') {
    return api.post('/chat/message', {
      message,
      mode,
      ...(remarkContext ? { remarkContext } : {}),
    });
  },

  /**
   * Send a voice recording to the AI companion / tutor.
   * @param {FormData} formData — audio blob as FormData
   * @param {'buddy' | 'tutor'} mode — mode selection ('buddy' vs 'tutor')
   */
  async sendVoice(formData, mode = 'buddy') {
    return api.post(`/chat/voice?mode=${mode}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Get conversation history.
   * @param {'buddy' | 'tutor'} mode
   */
  async getHistory(mode = 'buddy') {
    return api.get(`/chat/history?mode=${mode}`);
  },

  /**
   * Clear conversation history.
   * @param {'buddy' | 'tutor'} mode
   */
  async clearHistory(mode) {
    const url = mode ? `/chat/history?mode=${mode}` : '/chat/history';
    return api.delete(url);
  },
};

export default chatService;