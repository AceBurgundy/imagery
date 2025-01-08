import { print } from '../../../utilities/frontend/handles.js';
import history from '../../../utilities/frontend/history.js';

/**
 * Directory Manager for handling directory contents and rendering.
 */
export class DirectoryManager {
  /**
   * @typedef {Object} DirectoryEntry
   * @property {string} title - The title of the directory entry.
   * @property {string} path - The path of the directory entry.
   * @property {string} destination - The path where this entry belongs (ex: parent folder path).
   * @property {string} thumbnailPath - The path of the thumbnail image.
   * @property {string} thumbnailType - The type of the thumbnail (e.g., "image", "video").
   * @property {number} index - The index of the entry.
   * @property {boolean} isMedia - Indicates if the entry is media.
   */

  /**
   * @private
   * @type {HTMLDivElement}
   */
  box;

  /**
   * @private
   * @type {CSSStyleDeclaration}
   */
  boxStyle;

  /**
   * @private
   * @type {number}
   */
  cardHeight;

  /**
   * @public
   * @type {number}
   */
  numberOfCardsToAddOnScroll;

  /**
   * @private
   * @type {number}
   */
  fixedVisibleCardCount;

  /**
   * Initializes the DirectoryManager.
   *
   * @param {HTMLDivElement} box - The main directory container.
   */
  constructor(box) {
    this.updateBox(box);
    this.numberOfCardsToAddOnScroll = 0;
    this.fixedVisibleCardCount = 0;
  }

  /**
   * Update the directory container and calculate card height.
   *
   * @param {HTMLDivElement} box - The main directory container.
   */
  updateBox(box) {
    this.box = box;
    this.boxStyle = window.getComputedStyle(box);

    const boxHeight = parseFloat(this.box.clientHeight) -
                      parseFloat(this.boxStyle.padding) -
                      parseFloat(this.boxStyle.rowGap);
    this.cardHeight = boxHeight / 3;
  }

  /**
   * Open a directory and load its contents.
   *
   * @param {string} path - The path to the directory.
   * @param {boolean} [save=false] - Whether to save the path to history.
   */
  open(path, save = false) {
    if (save) history.visit(path);

    this.box.innerHTML = '';
    this.box.dataset.path = path;

    this.numberOfCardsToAddOnScroll = this.boxStyle.gridTemplateColumns.split(' ').length;
    this.fixedVisibleCardCount = this.numberOfCardsToAddOnScroll * 3;

    this.addContent();
  }

  /**
   * @private
   * Add content to the directory container.
   */
  async addContent() {
    const nextCardIndex = Number(this.box.lastElementChild?.dataset.index ?? 0) + 1;

    const query = this.box.children.length === 0
      ? [this.box.dataset.path, 0, this.fixedVisibleCardCount]
      : [this.box.dataset.path, nextCardIndex, nextCardIndex + this.numberOfCardsToAddOnScroll];

    const entries = await window.ipcRenderer.invoke('get-directory-contents', query);

    if (!Array.isArray(entries)) {
      console.error('process-entries expected an array of entries.');
      return;
    }

    if (entries.length === 0) {
      return;
    }

    entries.forEach(async content => {
      await this.processEntry(content);
    });
  }

  /**
   * @private
   * Check if a card is should not be added.
   *
   * @param {string} cardTitle - The title of the card.
   * @param {string} cardDestination - The destination of the card.
   * @returns {boolean} true if the card should not be added else false.
   */
  notAllowed(cardTitle, cardDestination) {
    const exist = document.querySelector(`[data-title="${cardTitle}"]`);
    const notForThisFolder = cardDestination !== this.box.dataset.path;

    return exist || notForThisFolder;
  }

  /**
   * @private
   * Process a directory entry and add it to the container.
   *
   * @param {DirectoryEntry} content - The directory entry to process.
   */
  async processEntry(content) {
    const { title, destination, isMedia, index, thumbnailPath, thumbnailType, path } = content;

    if (this.notAllowed(title, destination) === true) {
      return;
    }

    let height = '';

    if (typeof this.cardHeight === 'number') {
      height = `style="height: ${Math.round(this.cardHeight)}px"`;
    }

    const isActive = index === '0' ? 'active' : '';
    const cellType = isMedia ? 'is-media' : 'is-folder';

    const card = /* html */ `
      <div
        ${height}
        class="directory-cell ${cellType} ${isActive}"
        data-title="${title}"
        data-path="${path}"
        data-index="${index}">
        <img id="directory-content-${index}-image" class="directory-cell__image" src="${await this.placeholderImage()}">
        <p>${title}</p>
      </div>
    `;

    if (this.notAllowed(title, destination) === true) {
      return;
    }

    const nextIndex = parseInt(index) + 1;
    const sibling = this.box.querySelector(`[data-index="${nextIndex}"]`);

    (sibling || this.box).insertAdjacentHTML(sibling ? 'beforebegin' : 'beforeend', card);
    this.loadThumbnail(thumbnailPath, thumbnailType, index);
  }

  /**
   * Checks if the thumbnail works properly. If not, it will use the placeholderImage;
   * @param {string} thumbnail - The thumbnail path to be checked
   * @param {number} cardIndex - The index of the image element to review
   */
  async loadThumbnail(thumbnailPath, thumbnailType, cardIndex) {
    const cardImage = document.getElementById(`directory-content-${cardIndex}-image`);

    if (!cardImage) {
      return;
    }

    const defaultImage = await this.placeholderImage();

    let thumbnail = thumbnailPath.trim() === ''
      ? defaultImage
      : thumbnailType === 'video'
        ? await window.ipcRenderer.invoke('get-thumbnail', thumbnailPath) ?? defaultImage
        : thumbnailPath;

    cardImage.src = thumbnail;
    cardImage.onerror = () => cardImage.src = defaultImage;
  }

  /**
   * @private
   * Provide a placeholder image.
   *
   * @returns {Promise<string>} A promise that resolves to the placeholder image path.
   */
  async placeholderImage() {
    return await window.ipcRenderer.invoke('default-image');
  }
}
