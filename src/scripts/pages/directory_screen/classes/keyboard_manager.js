import { Navigator } from './navigator.js';

/**
 * Manages keyboard interactions for a directory UI.
 */
export class KeyboardManager {
  /**
   * @property {function(): void} control - Manages keydown events.
   */

  /**
   * Handles keyboard control for directory and card navigation.
   * @param {KeyboardEvent} event - The keyboard event triggering the control.
   * @param {HTMLDivElement} box - The container for card elements.
   * @param {Navigator} navigator - Handles switching of active card or directory.
   */
  control = (event, box, navigator) => {
    if (event.altKey) {
      navigator.navigateDirectory(event);
      return;
    }

    if (box.children.length === 0 || document.body.lastElementChild.tagName === 'DIALOG') {
      event.preventDefault();
      return;
    }

    navigator.navigateCards(event);
  };
}
