const { join, dirname } = require('path');
const { app } = require('electron');
const { FileGroup, isMediaFile, isVideoFile, readFolder, defaultThumbnailPath, logError } = require("./helpers.js");
const { Dirent } = require("fs");
const { join } = require("path");

const temporaryDirectory = app.getPath('temp');
const cacheFilePath = join(temporaryDirectory, 'imagery-cache.json');

const { readFolder, isMediaFile, isVideoFile } = require('./helpers.js');
const { Dirent } = require('fs');

const { ImageryEntriesCache, ImageryDirent, ImageryEntry } = require("./type_definitions.js");

/**
 * Class representing a cache system for imagery.
 */
class ImageryCache {
  /** @type {Map<string, ImageryEntriesCache>} */
  #cache;
  /** @type {string} */
  #activePath;

  constructor() {
    this.#cache = new Map();
    this.#activePath = "";
  }

  /**
   * Creates a new cache entry for a given path.
   * @param {string} folderPath - The folder path for caching.
   */
  async prepareEntries(folderPath) {
    if (this.#cache.has(folderPath) === true) {
      // If path already exist, cache the path
      this.#getCache(folderPath).currentIndex = 0;
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

    imageryData.unprocessedEntries = entries.map(entry => {
      return {
        "name": entry.name,
        "isFile": entry.isFile(),
        "isCompatibleFile": entry.isFile() && isMediaFile(entry.name),
        "isDirectory": entry.isDirectory()
      }
    });

    this.#cache.set(folderPath, imageryData)
  }

  /**
   * Retrieves a cache entry by path.
   * @param {string} folderPath - The path of the cache to retrieve.
   * @returns {ImageryEntriesCache|null} The cached entry, or null if not found.
   */
  #getCache(folderPath) {
    return this.#cache.get(folderPath) || null;
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
    }

    entry.cachedThumbnail = this.#loadThumbnail(thumbnailType, thumbnailPath);

    pathCache.processedEntries.push(entry);
    pathCache.currentIndex++;

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
   * @returns {Promise<ImageryEntry|null>} The processed entry or null if no valid entry is processed.
   */
  async next() {
    if (!this.#activePath) return null;

    /** @type {ImageryEntriesCache} */
    const pathCache = this.#getCache(this.#activePath);

    if (!pathCache) return null;

    // if entry for this index has already been processed
    if (pathCache.processedEntries.length >= pathCache.currentIndex) {
      pathCache.currentIndex++;
      return pathCache.processedEntries[pathCache.currentIndex];
    }

    /** @type {ImageryDirent} */
    const currentEntry = pathCache.unprocessedEntries[pathCache.currentIndex];
    if (!currentEntry) return null;

    const entryPath = join(this.#activePath, currentEntry.name);

    if (currentEntry.isFile) {
      if (!currentEntry.isCompatibleFile) return null;

      return this.#pushNewEntry(
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
