import { pathBasename, print } from '../../../utilities/frontend/handles.js';
import { ImageryEntry } from '../../../utilities/frontend/type_definitions.js';
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
   * Initializes the DirectoryManager.
   *
   * @param {HTMLDivElement} box - The main directory container.
   */
  constructor(box) {
    this.updateBox(box);
    this.currentPath = null;
  }

  /**
   * Update the directory container and calculate card height.
   *
   * @param {HTMLDivElement} box - The main directory container.
   */
  updateBox(box) {
    const title = document.getElementById('directory-name');

    this.box = box;
    this.boxStyle = window.getComputedStyle(box);
    this.bodyStyle = window.getComputedStyle(document.body);

    const heightTaken = parseFloat(this.bodyStyle.paddingTop) +
                        parseFloat(title.clientHeight) +
                        parseFloat(this.bodyStyle.gap) +
                        parseFloat(this.bodyStyle.paddingBottom)

    const boxHeight = window.innerHeight - heightTaken;
    this.box.style.height = `${parseInt(boxHeight)}px`;

    const boxHeightWithGap = boxHeight - (parseInt(this.boxStyle.rowGap) * 2);
    this.cardHeight = Math.round(boxHeightWithGap / 3);
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

    pathBasename(path)
      .then(basename => {
        const title = document.getElementById("directory-name");
        const root = basename === '' && path.slice(-1) === '\\';

        title.textContent = root ? path.replace('\\', '') : basename
      })

    this.addContent();
  }


  /**
   * @private
   * Add content to the directory container.
   */
  async addContent() {
    if (!this.currentPath) this.currentPath = this.box.dataset.path;

    // If the path changed, stop adding more cards for the current path
    if (this.currentPath !== this.box.dataset.path) {
      this.currentPath = this.box.dataset.path;
    }

    // prepares the entries for the directory
    await window.ipcRenderer.invoke('prepare-directory-contents', this.box.dataset.path);

    // after all entries are prepared,
    // a loop is used to make sure cards are added one by one,
    // if and only if, the current card has been added successfully
    // despite the slowness,
    // this prevents asynchronous issues where only 20+ cards are added,
    // while 100+ cards are pending in async.
    // When this happens, changing to a new folder will causes the 70 cards
    // of the previous folder, to load on the current folder.
    // Only 1 card is being added and processed at a time.
    while (true) {

      /** @type {ImageryEntry} */
      const content = await window.ipcRenderer.invoke('next-content');

      if (!content) {
        return;
      }

      await this.processEntry(content);
    }
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
   * @param {ImageryEntry} content - The directory entry to process.
   */
  async processEntry(content) {
    const {
      index,
      title,
      destination,
      isMedia,
      path,
      thumbnailType,
      thumbnailPath,
      cachedThumbnail,
      size,
      dateCreated,
      dateModified,
      dateTaken
    } = content;

    let height = '';

    if (typeof this.cardHeight === 'number') {
      height = `style="height: ${this.cardHeight}px"`;
    }

    const isActive = index === '0' ? 'active' : '';
    const cellType = isMedia ? 'is-media' : 'is-folder';

    const card = /* html */ `
      <div
        ${height}
        class="directory-cell ${cellType} ${isActive}"
        data-title="${title}"
        data-path="${path}"
        data-index="${index}"
        data-size="${size}"
        data-date-created="${dateCreated}"
        data-date-modified="${dateModified}"
        data-date-taken="${dateTaken}">
        <img id="directory-content-${index}-image" class="directory-cell__image" src="${cachedThumbnail ?? await this.placeholderImage()}">
        <p>${title}</p>
      </div>
    `;

    if (this.notAllowed(title, destination) === true) {
      return;
    }

    const sibling = this.box.querySelector(`[data-index="${nextIndex}"]`);
    (sibling || this.box).insertAdjacentHTML(sibling ? 'beforebegin' : 'beforeend', card);

    if (!cachedThumbnail) {
      // Loads the thumbnail using the frontend if cache is not yet available.
      // cache will usually be available on the next load of this same directory
      this.loadThumbnail(thumbnailPath, thumbnailType, index);
    }
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
