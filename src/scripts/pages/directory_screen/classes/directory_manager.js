import history from '../../../utilities/frontend/history.js';

/**
 * Directory Manager for handling directory contents and rendering.
 */
export class DirectoryManager {
  /**
   * @typedef {Object} DirectoryEntry
   * @property {string} title - The title of the directory entry.
   * @property {string} path - The path of the directory entry.
   * @property {string} destination - The destination path of the entry.
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

    entries.forEach((content) => this.processEntry(content));
  }

  /**
   * @private
   * Check if a card is allowed to be added.
   *
   * @param {string} cardTitle - The title of the card.
   * @param {string} cardDestination - The destination of the card.
   * @returns {boolean} Whether the card is allowed.
   */
  allowed(cardTitle, cardDestination) {
    const exist = document.querySelector(`[data-title="${cardTitle}"]`) !== null;
    const notForThisFolder = cardDestination !== this.box.dataset.path;

    return !exist && !notForThisFolder;
  }

  /**
   * @private
   * Process a directory entry and add it to the container.
   *
   * @param {DirectoryEntry} content - The directory entry to process.
   */
  async processEntry(content) {
    if (!this.allowed(content.title, content.destination)) {
      return;
    }

    let height = '';

    if (typeof this.cardHeight === 'number') {
      height = `style="height: ${Math.round(this.cardHeight)}px"`;
    }

    const isActive = content.index === '0' ? 'active' : '';
    const cellType = content.isMedia ? 'is-media' : 'is-folder';

    let thumbnail = content.thumbnailPath.trim() === ''
      ? await this.placeholderImage()
      : content.thumbnailType === 'video'
        ? await window.ipcRenderer.invoke('get-thumbnail', content.thumbnailPath) ?? await this.placeholderImage()
        : content.thumbnailPath;

    const image = new Image();
    image.onerror = async () => {
      thumbnail = await this.placeholderImage();
    };

    image.src = thumbnail;

    const card = /* html */ `
      <div
        ${height}
        class="directory-cell ${cellType} ${isActive}"
        data-title="${content.title}"
        data-path="${content.path}"
        data-index="${content.index}">
          <img id="directory-content-${content.index}-image" class="directory-cell__image" src="${thumbnail}">
          <p>${content.title}</p>
      </div>
    `;

    const nextIndex = content.index + 1;
    const sibling = this.box.querySelector(`[data-index="${nextIndex}"]`);

    (sibling || this.box).insertAdjacentHTML(sibling ? 'beforebegin' : 'beforeend', card);
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
