/**
 * EventBus — Centralized pub/sub system.
 * All systems communicate exclusively through this.
 * Zero coupling between producers and consumers.
 */
const EventBus = (() => {
  const _listeners = new Map();

  return {
    /**
     * Subscribe to an event.
     * @param {string} event
     * @param {Function} cb
     * @returns {Function} unsubscribe function
     */
    on(event, cb) {
      if (!_listeners.has(event)) _listeners.set(event, new Set());
      _listeners.get(event).add(cb);
      return () => _listeners.get(event)?.delete(cb);
    },

    /**
     * Emit an event with optional payload.
     * @param {string} event
     * @param {*} data
     */
    emit(event, data = {}) {
      _listeners.get(event)?.forEach(cb => {
        try { cb(data); }
        catch (err) { console.error(`[EventBus] Error in "${event}" listener:`, err); }
      });
    },

    /** Remove a specific listener */
    off(event, cb) {
      _listeners.get(event)?.delete(cb);
    },

    /** Remove ALL listeners for an event */
    clear(event) {
      if (event) _listeners.delete(event);
      else _listeners.clear();
    }
  };
})();

export default EventBus;
