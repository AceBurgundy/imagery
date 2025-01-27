const { join, dirname } = require('path');
const { FileGroup, isMediaFile, isVideoFile, readFolder, defaultThumbnailPath, logError } = require("./helpers.js");
const { Dirent } = require("fs");

const Location = require('../../../../models/location.js');
const ProcessedEntries = require('../../../../models/processed_entries.js');
const { BrowserWindow } = require('electron');

/**
 * @typedef {Object} ImageryEntry
 * @property {number} index - The index of the entry.
 * @property {string} title - The title of the entry.
 * @property {string} destination - The destination path for the entry.
 * @property {boolean} isMedia - Indicates if the entry is media.
 * @property {string} path - The file path of the entry.
 * @property {string} thumbnailType - The type of thumbnail (e.g., 'image', 'video').
 * @property {string} thumbnailPath - The path to the thumbnail.
 * @property {string} cachedThumbnail - The processed thumbnail.
 * @property {string} size - The file size in bytes.
 * @property {string} dateCreated - The date when the file was created.
 * @property {string} dateModified - The date when the file was last modified.
 * @property {string} dateTaken - The date when the file was created or last modified.
 */

/**
 * @typedef {Object} ImageryDirent
 * @property {string} name - The name of the directory entry.
 * @property {boolean} isFile - Whether the entry is a file.
 * @property {boolean} isCompatibleFile - Whether the entry is a compatible file.
 * @property {boolean} isDirectory - Whether the entry is a directory.
 */

/**
 * @typedef {Object} ImageryEntriesCache
 * @property {number} currentIndex - The current index of processing.
 * @property {ImageryEntry[]} processedEntries - List of processed entries.
 * @property {ImageryDirent[]} unprocessedEntries - List of unprocessed directory entries.
 */

/**
 * Class representing a cache system for imagery.
 */
class ImageryCache {
  /** @type {Map<string, ImageryEntriesCache>} */
  memory;

  /** @type {string} */
  #activePath;

  constructor() {
    this.memory = new Map();
    this.#activePath = "";
  }

  /**
   * Creates a new cache entry for a given path.
   * @param {string} folderPath - The folder path for caching.
   */
  async prepareEntries(folderPath) {
    // Check if the new folder is not the same as the current folder
    // meaning the user opened a new folder
    if (this.#activePath !== "" && this.#activePath !== folderPath) {
      if (this.memory.get(this.#activePath).persistData === false) {
        // remove the path from the cache to save memory
        this.memory.delete(this.#activePath);

        // remove the saved cache in the database too of it too.
        this.#deleteDatabaseRecord(this.#activePath);
      }
    }

    // If path still in memory use it
    if (this.memory.has(folderPath) === true) {
      // If path already exist, just set the index back to 0 to start displaying from start again
      this.#getCache(folderPath).currentIndex = 0;
      this.#activePath = folderPath;

      return;
    }

    // If path not in memory but in database
    if (await this.#pathInDatabase(folderPath) === true) {
      const pathEntriesCache = await this.#loadCachedEntry(folderPath);
      this.memory.set(folderPath, pathEntriesCache);

      this.#activePath = folderPath;
      return;
    }

    /** @type {ImageryEntriesCache} */
    const imageryData = {
      currentIndex: 0,
      processedEntries: [],
      unprocessedEntries: []
    };

    this.#activePath = folderPath;

    /** @type {Dirent[]} */
    const entries = await readFolder(folderPath);

    imageryData.unprocessedEntries = entries.map((entry, index) => {
      return {
        index,
        name: entry.name,
        isFile: entry.isFile(),
        isCompatibleFile: entry.isFile() && isMediaFile(entry.name),
        isDirectory: entry.isDirectory()
      };
    });

    // Set imagery data in memory
    this.memory.set(folderPath, imageryData);
  }

  /**
   * Checks whether a path is currently cached or not.
   *
   * @param {string} path - The directory path of the entry.
   * @returns {Promise<Location|null>}.
  */
  async #pathInDatabase(path) {
    const location = await Location.findOne({
      where: { path }
    });

    return location !== null;
  }

  /**
   * Retrieves a paths' entries.
   *
   * @param {string} path - The directory path of the entry.
   *
   * @throws {Exception} - If cache file does not exist. Use #pathInDatabase first.
   * @returns {Promise<ImageryEntriesCache>} If the entry has been succesfully saved.
  */
  async #loadCachedEntry(path) {
    // get location first
    const location = await Location.findOne({
      where: { path }
    });

    if (!location) return {
      currentIndex: 0,
      unprocessedEntries: [],
      processedEntries: []
    };

    location.lastVisited = new Date().toISOString()
    location.save();

    const processedEntries = await ProcessedEntries.findAll({
      where: { locationID: location.id },
      order: ["title", "DESC"]
    });

    return {
      currentIndex: 0,
      unprocessedEntries: [],
      processedEntries: processedEntries.map(entry =>
        entry.get({ plain: true })
      )
    }
  }

  /**
   * Deletes a cached entry file.
   *
   * @param {string} path - The directory path of the entry.
   * @throws {Exception} - If error in any sequelize process occurs
  */
  async #deleteDatabaseRecord(path) {
    // Find the location based on the path
    const location = await Location.findOne({
      where: { path }
    });

    // If the location is found
    if (!location) return;

    // Delete all processed entries related to the location
    await Entries.destroy({
      where: { locationID: location.id }
    });

    location.destroy();
  }

  /**
   * Retrieves a cache entry by path.
   * @param {string} folderPath - The path of the cache to retrieve.
   * @returns {ImageryEntriesCache|null} The cached entry, or null if not found.
   */
  #getCache(folderPath) {
    return this.memory.get(folderPath) || null;
  }

  // Saves the current path to the database
  async save() {
    const location = await Location.create({
      path: this.#activePath,
    });

    /**
     * Send an asynchronous message to the renderer process via `channel`, along with
     * arguments. Arguments will be serialized with the Structured Clone Algorithm,
     * just like `postMessage`, so prototype chains will not be included. Sending
     * Functions, Promises, Symbols, WeakMaps, or WeakSets will throw an exception.
     *
     * :::warning
     *
     * Sending non-standard JavaScript types such as DOM objects or special Electron
     * objects will throw an exception.
     *
     * :::
     *
     * For additional reading, refer to Electron's IPC guide.
     */
    const send = (channel, ...args) => BrowserWindow
      .getFocusedWindow()
      .webContents
      .send(channel, ...args);

    send("start-save-process");

    const entries = this.#getCache(this.#activePath).processedEntries;
    const total = entries.length;

    for (let index = 0; index < total; index++) {
      const entry = entries[index];
      const percentage = (index / (total - 1)) * 100;

      await ProcessedEntries.create({
        locationID: location.id,
        index: entry.index,
        title: entry.title,
        destination: entry.destination,
        isMedia: entry.isMedia,
        path: entry.path,
        thumbnailType: entry.thumbnailType,
        thumbnailPath: entry.thumbnailPath,
        cachedThumbnail: entry.cachedThumbnail,
        size: entry.size,
        dateCreated: entry.dateCreated,
        dateModified: entry.dateModified,
        dateTaken: entry.dateTaken
      });

      send("update-save-process", percentage);
    }

    send("end-save-process");
  }

  /**
   * Adds a new processed entry to the list.
   *
   * @param {ImageryEntriesCache} pathCache - The cache value for this current path.
   * @param {number} index - The index of the entry.
   * @param {string} title - The title of the entry.
   * @param {string} destination - The destination path for the entry.
   * @param {boolean} isMedia - Indicates if the entry is media.
   * @param {string} path - The file path of the entry.
   * @param {string} thumbnailType - The type of thumbnail (e.g., 'image', 'video').
   * @param {string} thumbnailPath - The path to the thumbnail.
   *
   * @returns {ImageryEntry} The completed card data for render
   * @throws {Error} If the entry is null or not an object.
   */
  async #pushNewEntry(pathCache, index, title, destination, isMedia, path, thumbnailType, thumbnailPath) {
    const entry = {
      "index": index,
      "title": title,
      "destination": destination,
      "isMedia": isMedia,
      "path": path,
      "thumbnailType": thumbnailType,
      "thumbnailPath": thumbnailPath,
      "cachedThumbnail": null,
      ...await this.#populateMetadata(path)
    };

    entry.cachedThumbnail = this.#loadThumbnail(thumbnailType, thumbnailPath);

    const indexToReplace = pathCache.processedEntries.findIndex(
      item => item.name === title
    );

    if (indexToReplace) {
      // replace the entry with the new entry
      // great for updating old entries
      pathCache.processedEntries[indexToReplace] = entry;
    } else {
      // Prepend the new entry to the processedEntries array
      pathCache.processedEntries.push(entry);
    }

    pathCache.currentIndex++;

    // Update record in the database if present
    Location.findOne({
      where: { path: this.#activePath }
    })
    .then(location => {
      if (!location) return;

      ProcessedEntries.update(
        { locationID: location.id, ...entry },
        {
          where: {
            title,
            locationID: location.id
          }
        }
      );
    });

    // Return the entry for rendering
    return entry;
  }

  /**
   * Loads the thumbnail for the entry.
   *
   * @param {string} type - The type of thumbnail (e.g., 'image', 'video').
   * @param {string} path - The path to the thumbnail.
   *
   * @returns {string} The processed thumbnail.
  */
  #loadThumbnail = async (type, path) =>
    path.trim() === ''
      ? defaultThumbnailPath
      : type === 'video'
        ? await getThumbnail(path)
        : path;

  /**
   * Populates metadata for the entry based on its file path.
   */
  async #populateMetadata(path) {
    const metadata = {};

    try {
      const stats = await fs.stat(path);
      metadata["size"] = stats.size; // File size in bytes
      metadata["dateCreated"] = stats.birthtime; // Date file was created
      metadata["dateModified"] = stats.mtime; // Date file was last modified

      // Optionally set "dateTaken" to the creation date.
      metadata["dateTaken"] = stats.birthtime;
    } catch (error) {
      logError(error)

      metadata["size"] = '';
      metadata["dateCreated"] = '';
      metadata["dateModified"] = '';
      metadata["dateTaken"] = '';
    }

    return metadata;
  }

  /**
   * Processes the next unprocessed entry.
   * @param {string} folderPath - The parent folder path.
   * @returns {Promise<ImageryEntry|null|String>}
   * - The processed entry
   * - or null if no valid entry is processed
   * - or the string message indicating the there is no more folder next.
   */
  async next() {
    if (!this.#activePath) return null;

    /** @type {ImageryEntriesCache} */
    const pathCache = this.#getCache(this.#activePath);
    if (!pathCache) return null;

    if (pathCache.currentIndex >= pathCache.unprocessedEntries) {
      return "Nothing more to process";
    }

    // if entry for this index has already been processed
    if (pathCache.processedEntries.length >= pathCache.currentIndex) {
      const entry = pathCache.processedEntries[pathCache.currentIndex];
      pathCache.currentIndex++;

      return entry;
    }

    /** @type {ImageryDirent} */
    const currentEntry = pathCache.unprocessedEntries[pathCache.currentIndex];
    if (!currentEntry) return null;

    const entryPath = join(this.#activePath, currentEntry.name);

    if (currentEntry.isFile) {
      if (!currentEntry.isCompatibleFile) return null;

      this.#pushNewEntry(
        pathCache = pathCache,
        index = pathCache.currentIndex,
        title = currentEntry.name,
        destination = this.#activePath,
        isMedia = true,
        path = entryPath,
        thumbnailType = isVideoFile(entryPath) ? FileGroup.VIDEO : FileGroup.IMAGE,
        thumbnailPath = entryPath,
      );
    }

    if (currentEntry.isDirectory) {
      const queue = [entryPath];
      let firstValidParent = null;
      let foldersTraversed = 0;

      while (queue.length > 0 && foldersTraversed < 10) {
        const currentFolderPath = queue.shift();

        /** @type {Dirent[]} */
        const subEntries = await readFolder(currentFolderPath);

        let hasMedia = false;
        let subFoldersPresent = false;

        for (const subEntry of subEntries) {
          if (subEntry.isFile() && isMediaFile(subEntry.name) === true) {
            hasMedia = true;
          }

          else if (subEntry.isDirectory() === true) {
            subFoldersPresent = true;
          }

          if (hasMedia && subFoldersPresent) break;
        }

        if (hasMedia) {
          if (foldersTraversed > 0 && !firstValidParent) {
            firstValidParent = dirname(currentFolderPath);
          }

          const thumbnailPath = join(
            currentFolderPath,
            subEntries.find(
              (subEntry) => subEntry.isFile() && isMediaFile(subEntry.name)
            ).name
          );

          return this.#pushNewEntry(
            pathCache = pathCache,
            index = pathCache.currentIndex,
            isMedia = false,
            destination = this.#activePath,
            title = currentEntry.name,
            path = firstValidParent || currentFolderPath,
            thumbnailType = isVideoFile(thumbnailPath) ? FileGroup.VIDEO : FileGroup.IMAGE,
            thumbnailPath
          );
        }

        for (const subEntry of subEntries) {
          if (subEntry.isDirectory() === true) {
            queue.push(join(currentFolderPath, subEntry.name));
          }
        }

        foldersTraversed++;
      }
    }

    return null;
  }
}

const imageryCache = new ImageryCache();

module.exports = { imageryCache };
