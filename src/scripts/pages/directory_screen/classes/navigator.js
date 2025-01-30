import { MediaViewer } from '../../media_viewer_screen/media-viewer.js';
import history from '../../../utilities/frontend/history.js';
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
   * @returns {boolean} true if card initial card was set, false if initial card already been set.
   */
  setInitialActiveCard = () => {
    if (this.getActiveCard() !== null) return false;
    this.box.children[0].classList.add('active');
    this.activeCardIndex = 0;

    return true;
  };

  /**
   * @private
   * Moves the active card highlight based on the active card index.
   */
  moveActiveCard = () => {
    this.getActiveCard()?.classList.remove('active');
    const activeCard = this.box.children[this.activeCardIndex];

    // No more active card
    if (!activeCard) return;

    activeCard.classList.add('active');

    // Get bounding rectangles
    const boxRectangle = this.box.getBoundingClientRect();
    const cardRectangle = activeCard.getBoundingClientRect();

    // Check if the card is out of view above
    if (cardRectangle.top < boxRectangle.top) {
      this.box.scrollBy({ top: cardRectangle.top - boxRectangle.top, behavior: 'smooth' });
      return;
    }

    // Check if the card is out of view below
    if (cardRectangle.bottom > boxRectangle.bottom) {
      const bodyPaddingBottom = Math.floor(
          parseFloat(this.manager.bodyStyle.paddingBottom)
      );

      const bodyGap = Math.floor(
          parseFloat(this.manager.bodyStyle.gap)
      );

      const cardTop = cardRectangle.bottom + bodyPaddingBottom + bodyGap;

      this.box.scrollBy({ top: cardTop - boxRectangle.bottom, behavior: 'smooth' });
    }
  };

  /**
   * Handles navigation between directories using keyboard events.
   * @param {KeyboardEvent} event - The keyboard event triggering navigation.
   */
  navigateDirectory = event => {
    if (event.key === 'ArrowLeft') {
      const previousDirectory = history.previous();

      if (!previousDirectory) {
        Toast.broadcast('You\'re currently at the first folder');
        return;
      }

      this.reset();
      this.manager.open(previousDirectory);
      return;
    }

    if (event.key === 'ArrowRight') {
      const nextDirectory = history.next();

      if (!nextDirectory) {
        Toast.broadcast('You have no other visited folders');
        return;
      }

      this.reset();
      this.manager.open(nextDirectory);
    }
  };

  /**
   * Handles navigation between cards using keyboard events.
   * @param {KeyboardEvent} event - The keyboard event triggering navigation.
   */
  navigateCards = async event => {
    if (event.key === 'Enter') {
      const card = this.getActiveCard();

      // card is missing
      if (!card) return;

      if (card.classList.contains('is-folder') === true) {
        this.reset();

        // Open next directory
        await this.manager.open(card.dataset.path, true);
        return;
      }

      if (card.classList.contains('is-media') === true) {
        await MediaViewer.open(card, this.manager.allMedia);
      }
    }

    if (event.key === 'ArrowUp') {
      if (this.setInitialActiveCard() === true) return;
      if (this.activeCardIndex < this.manager.rowCardCount) return;

      this.activeCardIndex -= this.manager.rowCardCount;
      this.moveActiveCard();
      return;
    }

    if (event.key === 'ArrowDown') {
      if (this.setInitialActiveCard() === true) return;
      if (this.activeCardIndex + this.manager.rowCardCount >= this.box.children.length) return;

      this.activeCardIndex += this.manager.rowCardCount;
      this.moveActiveCard();
      return;
    }

    if (event.key === 'ArrowLeft') {
      if (this.setInitialActiveCard() === true) return;
      if (this.activeCardIndex === 0) return;

      this.activeCardIndex--;
      this.moveActiveCard();
      return;
    }

    if (event.key === 'ArrowRight') {
      if (this.setInitialActiveCard() === true) return;
      if (this.activeCardIndex === this.box.children.length - 1) return;

      this.activeCardIndex++;
      this.moveActiveCard();
    }
  };
}
