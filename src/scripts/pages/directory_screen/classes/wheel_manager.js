import { DirectoryManager } from './directory_manager.js';

/**
 * Manages mouse wheel interactions for dynamic content loading.
 */
export class MouseWheelManager {
  /**
   * @property {function(): void} control - Manages wheel events.
   */

  /**
   * Handles mouse wheel control to load content dynamically.
   * @param {WheelEvent} event - The wheel event triggering the control.
   * @param {DirectoryManager} manager - The directory manager for handling directory operations.
   */
  control(event, manager) {
    const scrollingUp = event.deltaY < 0;
    const scrollingDown = !scrollingUp;

    if (document.body.lastElementChild.tagName === 'DIALOG') {
      event.preventDefault();
      return;
    }

    if (scrollingDown) manager.addContent();
  }
}
