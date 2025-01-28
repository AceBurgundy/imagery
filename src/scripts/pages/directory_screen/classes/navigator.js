import { MediaViewer } from '../../media_viewer_screen/media-viewer.js';
import history from '../../../utilities/frontend/history.js';
import { DirectoryManager } from './directory_manager.js';
import { Toast } from '../components/toast.js';

export class Navigator {
  /**
   * @param {DirectoryManager} manager - The directory manager for handling directory operations.
   * @param {HTMLDivElement} box - The main screen element.
   */
  constructor(manager, box) {
    /** @private @type {number} */
    this.activeCardIndex = 0;

    /** @private @type {DirectoryManager} */
    this.manager = manager;

    /** @private @type {HTMLDivElement} */
    this.box = box;
  }

  /**
   * Resets the active card index.
   */
  reset = () => {
    this.activeCardIndex = 0;
  };

  /**
   * @private
   * @returns {HTMLElement|null} - The currently active card element, or null if none is active.
   */
  getActiveCard = () => this.box.querySelector('.active');

  /**
   * @private
   * Sets the initial active card if none is currently active.
   */
  setInitialActiveCard = () => {
    if (this.getActiveCard() === null) {
      this.box.children[0].classList.add('active');
    }
  };

  /**
   * @private
   * Moves the active card highlight based on the active card index.
   */
  moveActiveCard = () => {
    this.getActiveCard()?.classList.remove('active');
    this.box.children[this.activeCardIndex]?.classList.add('active');
  };

  /**
   * Handles navigation between directories using keyboard events.
   * @param {KeyboardEvent} event - The keyboard event triggering navigation.
   */
  navigateDirectory = (event) => {
    if (event.key === 'ArrowLeft') {
      const previousDirectory = history.previous();

      if (!previousDirectory) {
        Toast.broadcast("You're currently at the first folder");
        return;
      }

      this.reset()
      this.manager.open(previousDirectory);
      return;
    }

    if (event.key === 'ArrowRight') {
      const nextDirectory = history.next();

      if (!nextDirectory) {
        Toast.broadcast('You have no other visited folders');
        return;
      }

      this.reset()
      this.manager.open(nextDirectory);
    }
  };

  /**
   * Handles navigation between cards using keyboard events.
   * @param {KeyboardEvent} event - The keyboard event triggering navigation.
   */
  navigateCards = (event) => {
    if (event.key === 'Enter') {
      try {
        const card = this.getActiveCard();
        if (card) MediaViewer.open(card);
      } catch (error) {
        this.reset()
        this.manager.open(card.dataset.path, true);
      }
    }

    if (event.key === 'ArrowUp') {
      this.setInitialActiveCard();
      if (this.activeCardIndex < this.manager.rowCardCount) return;

      this.activeCardIndex -= this.manager.rowCardCount;
      this.moveActiveCard();
      return;
    }

    if (event.key === 'ArrowDown') {
      this.setInitialActiveCard();
      if (this.activeCardIndex + this.manager.rowCardCount >= this.box.children.length) return;

      this.activeCardIndex += this.manager.rowCardCount;
      this.moveActiveCard();
      return;
    }

    if (event.key === 'ArrowLeft') {
      this.setInitialActiveCard();
      if (this.activeCardIndex === 0) return;

      this.activeCardIndex--;
      this.moveActiveCard();
      return;
    }

    if (event.key === 'ArrowRight') {
      this.setInitialActiveCard();
      if (this.activeCardIndex === this.box.children.length - 1) return;

      this.activeCardIndex++;
      this.moveActiveCard();
    }
  };
}