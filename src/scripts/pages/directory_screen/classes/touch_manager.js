import { MediaViewer } from '../../media_viewer_screen/media-viewer.js';
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
    if (MediaViewer.hiddenOrNone() === false) return;

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
