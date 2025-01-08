import history from '../../../utilities/frontend/history.js';
import { MediaViewer } from '../../media_viewer_screen/media-viewer.js';
import { DirectoryManager } from './directory_manager.js';
import { Navigator } from './navigator.js';

/**
 * Manages mouse click interactions for dynamic content loading.
 */
export class ClickManager {
  /**
   * @property {function(): void} control - Manages click events.
   */

  /**
   * Handles mouse click control to load content dynamically.
   * @param {MouseEvent} event - The wheel event triggering the control.
   * @param {DirectoryManager} manager - The directory manager for handling directory operations.
   * @param {Navigator} navigator - An instance of Navigator.
   */
  control(event, navigator, manager) {
    try {
      // attempt to open as media
      const card = event.target.closest('.directory-cell');
      if (card) MediaViewer.open(card);
    } catch (error) {
      // open as folder
      navigator.reset();
      history.visit(card.dataset.path);
      manager.open(card.dataset.path);
    }
  }
}
