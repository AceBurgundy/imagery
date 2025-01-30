import { placeholderImage, print } from '../../../utilities/frontend/handles.js';
import history from '../../../utilities/frontend/history.js';
import { basename } from '../../../utilities/frontend/node-path.js';

/**
 * Directory Manager for handling directory contents and rendering.
 */
export class DirectoryManager {
  /**
   * @typedef {Object} ImageryEntry
   * @property {number} index - The index of the entry.
   * @property {string} title - The title of the entry.
   * @property {string} destination - The destination path for the entry.
   * @property {boolean} isMedia - Indicates if the entry is media.
   * @property {string} path - The file path of the entry.
   * @property {string} thumbnailPath - The path to the thumbnail.
   * @property {string} size - The file size in bytes.
   * @property {string} dateCreated - The date when the file was created.
   * @property {string} dateModified - The date when the file was last modified.
   * @property {string} dateTaken - The date when the file was created or last modified.
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
  boxHeight;

  /**
   * @private
   * @type {number}
   */
  cardHeight;

  /**
   * @private
   * @type {string}
   */
  defaultImage;

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
   * @public
   * @type {number}
  */
  rowCardCount;

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
                        parseFloat(this.bodyStyle.paddingBottom);

    this.boxHeight = window.innerHeight - heightTaken;
    this.box.style.height = `${parseInt(this.boxHeight)}px`;

    const boxHeightWithGap = this.boxHeight - (parseInt(this.boxStyle.rowGap) * 2);
    this.cardHeight ??= Math.round(boxHeightWithGap / 3);
    this.cardHeight = isNaN(this.cardHeight) ? 198 : this.cardHeight;

    this.box.style.gridAutoRows = `${this.cardHeight}px`;

    // Math.ceil includes cards which are cut off by the overflow
    const columnCardCount = Math.ceil(this.boxHeight / this.cardHeight);
    this.rowCardCount = this.boxStyle.gridTemplateColumns.split(' ').length;

    this.initialCardCount = this.rowCardCount * columnCardCount;
  }

  /**
   * Open a directory and load its contents.
   *
   * @param {string} path - The path to the directory.
   * @param {boolean} [save=false] - Whether to save the path to history.
   */
  async open(path, save = false) {
    this.defaultImage ??= await placeholderImage();
    if (save) history.visit(path);

    this.box.innerHTML = '';
    this.box.dataset.path = path;

    basename(path)
        .then(basename => {
          const title = document.getElementById('directory-name');
          const root = basename === '' && path.slice(-1) === '\\';

          title.textContent = root ? path.replace('\\', '') : basename;
        });

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
    const entriesLength = await window.ipcRenderer.invoke(
        'prepare-directory-contents',
        this.box.dataset.path
    );

    // after all entries are prepared,
    // a loop is used to make sure cards are added one by one,
    // if and only if, the current card has been added successfully
    // despite the slowness,
    // this prevents asynchronous issues where only 20+ cards are added,
    // while 100+ cards are pending in async.
    // When this happens, changing to a new folder will causes the 70 cards
    // of the previous folder, to load on the current folder.
    // Only 1 card is being added and processed at a time.
    //
    // Speed will less likely be an issue as the backend have caching mechanisms in place
    const batchSize = 5;
    let processed = 0;

    while (processed < entriesLength) {
      const batch = [];

      for (let index = 0; index < batchSize && processed < entriesLength; index++, processed++) {
        batch.push(
            // index <= this.initialCardCount: include thumbnail for cards in initial card count
            this.#getNextContent(processed, processed <= this.initialCardCount)
        );
      }

      // Wait for all cards to show before loading next batch
      await Promise.all(batch);
    }
  }

  async #getNextContent(index, withThumbnail) {
    try {
      /** @type {ImageryEntry|null|String} */
      const content = await window.ipcRenderer.invoke('next-content', index);

      if (!content) {
        return;
      }

      this.processEntry(content, withThumbnail);
    } catch (error) {
      // print error but continue the loop
      print(error.message);
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
   * @param {bool} withThumbnail - Load thumbnail too.
   */
  async processEntry(content, withThumbnail) {
    const {
      index,
      title,
      destination,
      isMedia,
      path,
      thumbnailPath,
      size,
      dateCreated,
      dateModified,
      dateTaken
    } = content;

    const isActive = index === '0' ? 'active' : '';
    const cellType = isMedia ? 'is-media' : 'is-folder';

    const card = /* html */ `
      <div
        style="height: ${this.cardHeight}px"
        class="directory-cell ${cellType} ${isActive}"
        data-title="${title}"
        data-path="${path}"
        data-index="${index}"
        data-size="${size}"
        data-thumbnail-path="${thumbnailPath}"
        data-date-created="${dateCreated}"
        data-date-modified="${dateModified}"
        data-date-taken="${dateTaken}">
        <img
          id="directory-content-${index}-image"
          class="directory-cell__image"
          src="${this.defaultImage}">
        <p>${title}</p>
      </div>
    `;

    if (this.notAllowed(title, destination) === true) {
      return;
    }

    this.box.insertAdjacentHTML('beforeend', card);
    if (withThumbnail) this.loadThumbnail(thumbnailPath, index);
  }

  /**
   * Checks if the thumbnail works properly. If not, it will use the placeholderImage;
   * @param {string} thumbnailPath - The path to the thumbnail
   * @param {number} cardIndex - The index of the image element to review
   */
  async loadThumbnail(thumbnailPath, cardIndex) {
    const cardImage = document.getElementById(`directory-content-${cardIndex}-image`);

    if (!cardImage) {
      return;
    }

    // even if a path is an image, it is still necessary to get their thumbnail,
    // to resize them into an easier to load image,
    // as currently, using the image file itself as the thumbnail
    // takes too much time to load especially for 4k or HD images.
    cardImage.classList.add('loaded');
    const thumbnail = await window.ipcRenderer.invoke('get-thumbnail', thumbnailPath);

    cardImage.src = thumbnail ?? this.defaultImage;
    cardImage.onerror = () => cardImage.src = this.defaultImage;
  }

  /**
   * Loads a cards index by its thumbnail
   */
  loadThumbnailByScroll() {
    const boxBound = this.box.getBoundingClientRect();

    [...this.box.children].forEach(card => {
      // skips card with loaded thumbnail
      if (card.firstElementChild.classList.contains('loaded') === true) return;

      // Get card's position relative to viewport
      const cardBound = card.getBoundingClientRect();

      // Check if card is inside `.box`
      if (cardBound.top <= boxBound.bottom + 300) {
        this.loadThumbnail(card.dataset.thumbnailPath, card.dataset.index);
      }
    });
  }
  /**
   * @returns {[{ title: String, path: String }]} returns the list of all media titles
   * - Since the media titles end in a playable format, it can be used by MediaViewer
   */
  get allMedia() {
    return [...this.box.querySelectorAll('[class*="is-media"]')]
        .map(element => {
          return {
            title: element.dataset.title,
            path: element.dataset.path
          };
        });
  }
}
