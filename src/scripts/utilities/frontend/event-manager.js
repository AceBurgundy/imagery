import { print } from './handles.js';

export class KeyboardEventManager {
  constructor() {
    this.events = new Map();
  }

  /**
   * Registers a keyboard event on a target element.
   * @param {Element|Window|Document} target - The element to bind the event to.
   * @param {string} eventType - The type of the keyboard event (e.g., 'keydown', 'keyup').
   * @param {Function} handler - The callback function for the event.
   */
  registerEvent(target, eventType, handler) {
    if (!this.events.has(target)) {
      this.events.set(target, {});
    }

    const targetEvents = this.events.get(target);

    if (targetEvents[eventType]) {
      print(`Event of type '${eventType}' is already registered on the target.`);
      return;
    }

    target.addEventListener(eventType, handler);
    targetEvents[eventType] = handler;
    console.log(`Registered '${eventType}' on`, target);
  }

  /**
   * Removes a registered keyboard event from a target element.
   * @param {Element|Window|Document} target - The element to unbind the event from.
   * @param {string} eventType - The type of the keyboard event.
   */
  removeEvent(target, eventType) {
    if (!this.events.has(target)) {
      print("No events registered for the given target.");
      return;
    }

    const targetEvents = this.events.get(target);

    if (!targetEvents[eventType]) {
      print(`No event of type '${eventType}' found for the target.`);
      return;
    }

    target.removeEventListener(eventType, targetEvents[eventType]);
    delete targetEvents[eventType];
    console.log(`Removed '${eventType}' from`, target);

    // Clean up if no more events are registered for the target
    if (Object.keys(targetEvents).length === 0) {
      this.events.delete(target);
    }
  }

  /**
   * Checks if a specific keyboard event is registered on a target element.
   * @param {Element|Window|Document} target - The element to check for the event.
   * @param {string} eventType - The type of the keyboard event.
   * @returns {boolean} - True if the event is registered, false otherwise.
   */
  hasEvent(target, eventType) {
    return this.events.has(target) && !!this.events.get(target)[eventType];
  }
}
