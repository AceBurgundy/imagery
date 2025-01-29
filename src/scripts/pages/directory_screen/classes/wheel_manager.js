import { print } from '../../../utilities/frontend/handles.js';
import { MediaViewer } from '../../media_viewer_screen/media-viewer.js';
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
    if (MediaViewer.hiddenOrNone() === false) return;

    const scrollingUp = event.deltaY < 0;
    const scrollingDown = !scrollingUp;

    if (scrollingDown) {
      manager.loadThumbnailByScroll();
    }

    else if (scrollingUp) {
      // future use
    }
  }
}
