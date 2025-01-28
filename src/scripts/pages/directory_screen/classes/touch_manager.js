import { DirectoryManager } from './directory_manager.js';

/**
 * Manages touch interactions for dynamic content loading.
 */
export class TouchManager {
  /**
   * @property {function(): void} control - Manages touch events.
   */

  /**
   * Handles touch control to load content dynamically.
   * @param {TouchEvent} event - The wheel event triggering the control.
   * @param {DirectoryManager} manager - The directory manager for handling directory operations.
   */
  control(event, manager) {
    if (document.body.lastElementChild.tagName === 'DIALOG' || event.touches.length !== 2) {
      event.preventDefault();
      return;
    }

    const scrollingUp = event.touches[0].clientY < event.touches[0].previousY;
    const scrollingDown = !scrollingUp;

    if (scrollingDown) {
      // pass
    }

    if (scrollingUp) {
      // pass
    }
  }
}
