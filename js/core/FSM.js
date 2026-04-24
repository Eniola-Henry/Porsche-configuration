import EventBus from './EventBus.js';

/**
 * FSM — Finite State Machine engine.
 * Each entity gets its own FSM instance.
 * Transitions are deterministic. Guards prevent invalid transitions.
 */
export class FSM {
  /**
   * @param {string} id - Unique identifier (used in events)
   * @param {{ initial: string, states: Object }} definition
   *
   * State definition format:
   * {
   *   stateName: {
   *     transitions: { action: 'nextState' },
   *     onEnter: () => {},   // optional
   *     onExit:  () => {},   // optional
   *     lockMs:  300,        // optional: lock after entering to prevent spam
   *   }
   * }
   */
  constructor(id, definition) {
    this.id       = id;
    this._states  = definition.states;
    this.current  = definition.initial;
    this._locked  = false;
    this._lockTimer = null;

    // Fire onEnter for initial state
    this._states[this.current]?.onEnter?.();
  }

  /** Return current state name */
  getState() { return this.current; }

  /** Check if currently in a specific state */
  is(state) { return this.current === state; }

  /** Check if a transition action is valid right now */
  can(action) {
    if (this._locked) return false;
    return action in (this._states[this.current]?.transitions ?? {});
  }

  /**
   * Attempt a state transition.
   * @param {string} action
   * @param {*} payload  - passed to guards and events
   * @returns {boolean}  - whether transition occurred
   */
  transition(action, payload = {}) {
    if (!this.can(action)) return false;

    const prevState = this.current;
    const nextStateName = this._states[prevState].transitions[action];
    const nextState = this._states[nextStateName];

    // Run exit callback
    this._states[prevState]?.onExit?.();

    this.current = nextStateName;

    // Apply lock if configured
    if (nextState?.lockMs) {
      this._locked = true;
      clearTimeout(this._lockTimer);
      this._lockTimer = setTimeout(() => { this._locked = false; }, nextState.lockMs);
    }

    // Run enter callback
    nextState?.onEnter?.();

    // Broadcast transition
    EventBus.emit('FSM_TRANSITION', {
      id: this.id, from: prevState, to: nextStateName, action, payload
    });

    return true;
  }

  /** Destroy: clear timers */
  dispose() {
    clearTimeout(this._lockTimer);
  }
}
