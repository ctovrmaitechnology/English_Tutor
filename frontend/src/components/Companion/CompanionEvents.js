// Simple Pub-Sub Event Bus for Companion
const listeners = {};

export const CompanionEvents = {
  /**
   * Subscribe to a specific event
   * @param {string} event - Name of the event
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
  },

  /**
   * Publish/trigger an event
   * @param {string} event - Name of the event
   * @param {any} data - Optional payload data
   */
  emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
};
export default CompanionEvents;
