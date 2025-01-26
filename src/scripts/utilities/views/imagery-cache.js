const { join, dirname } = require('path');
const { app } = require('electron');
const { FileGroup, isMediaFile, isVideoFile, readFolder, defaultThumbnailPath, logError } = require("./helpers.js");
const { Dirent, promises, exists, existsSync, readFileSync, readdirSync, readdir } = require("fs");
const { join } = require("path");
const zlib = require("zlib");

const temporaryDirectory = app.getPath('temp');

const cachedFileDestination = name => join(
  temporaryDirectory,
  `imagery-${name.replace(' ', '_')}.json.gz`
);

const { readFolder, isMediaFile, isVideoFile } = require('./helpers.js');
const { Dirent } = require('fs');

const { ImageryEntriesCache, ImageryDirent, ImageryEntry } = require("./type_definitions.js");

/**
 * Class representing a cache system for imagery.
 */
class ImageryCache {
  /** @type {Map<string, ImageryEntriesCache>} */
  entriesManager;

  /** @type {string} */
  #activePath;

  /** @type {bool} */
  #cacheActivePath;

  constructor() {
    this.entriesManager = new Map();
    this.#activePath = "";
    this.#cacheActivePath = false;
  }

  /**
   * Creates a new cache entry for a given path.
   * @param {string} folderPath - The folder path for caching.
   * @param {bool} cache - True if entries of folderPath argument must be cached.
   */
  async prepareEntries(folderPath, cache = false) {
    // Check if the new folder is not the same as the current folder
    // meaning the user opened a new folder
    if (this.#activePath !== "" && this.#activePath !== folderPath) {
      if (this.#cacheActivePath) {
        // save previous path if user wants it cached.
        this.#save(this.#activePath);
      } else {
        // remove the path from the cache to save memory
        this.entriesManager.delete(this.#activePath);

        // remove the saved cache file of it too.
        if (this.#pathInCache(this.#activePath) === true) {
          this.#deleteCachedEntry(this.#activePath);
        }
      }
    }

    // If path still in memory use it
    if (this.entriesManager.has(folderPath) === true) {
      // If path already exist, cache the path
      this.#getCache(folderPath).currentIndex = 0;
      this.#activePath = folderPath;
      this.#cacheActivePath = cache;

      return;
    }

    if (this.#pathInCache(folderPath) === true) {
      const pathEntriesCache = this.#loadCachedEntry(folderPath);
      pathEntriesCache.currentIndex = 0;
      this.entriesManager.set(folderPath, pathEntriesCache);

      this.#activePath = folderPath;
      this.#cacheActivePath = cache;

      return;
    }

    /** @type {ImageryEntriesCache} */
    const imageryData = {
      currentIndex: 0,
      processedEntries: [],
      unprocessedEntries: []
    };

    this.#activePath = folderPath;
    this.#cacheActivePath = cache;

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

    this.entriesManager.set(folderPath, imageryData)
  }

  /**
   * Save a paths entries.
   *
   * @param {string} path - The directory path of the entry.
   * @param {ImageryEntriesCache} entries - The entries to be saved.
   * @returns {Promise<bool>} If the entry has been succesfully saved.
  */
  async #save(path, entries) {
    try {
      await promises.writeFile(
        cachedFileDestination(path),
        zlib.gzipSync(
          JSON.stringify(entries)
        )
      );

      return true;
    } catch (error) {
      logError(error);
      return false;
    }
  }

  /**
   * Checks whether a path is currently cached or not.
   *
   * @param {string} path - The directory path of the entry.
   * @returns {Promise<bool>}.
  */
  #pathInCache = path =>
    existsSync(
      cachedFileDestination(path)
    );

  /**
   * Retrieves a paths' entries.
   *
   * @param {string} path - The directory path of the entry.
   *
   * @throws {Exception} - If cache file does not exist. Use #pathInCache first.
   * @returns {ImageryEntriesCache} If the entry has been succesfully saved.
  */
  #loadCachedEntry(path) {
    const savedPath = cachedFileDestination(path);

    return JSON.parse(
      zlib.gunzipSync(
        readFileSync(savedPath)
      )
    );
  }

  /**
   * Deletes a cached entry file.
   *
   * @param {string} path - The directory path of the entry.
   *
   * @throws {Exception} - If cache file does not exist. Use #pathInCache first.
   * @throws {Exception} - If error in deletion occurs.
  */
  async #deleteCachedEntry(path) {
    const savedPath = cachedFileDestination(path);
    await promises.unlink(savedPath);
  }

  /**
   * Retrieves a cache entry by path.
   * @param {string} folderPath - The path of the cache to retrieve.
   * @returns {ImageryEntriesCache|null} The cached entry, or null if not found.
   */
  #getCache(folderPath) {
    return this.entriesManager.get(folderPath) || null;
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
   * Calculates the total size of all saved cache files
   *
   * @returns {number} -1 if an error had occured else the total size
   */
  static async totalCacheSize() {
    let totalSize = 0;

    try {
      const files = await promises.readdir(temporaryDirectory);

      // Filter files matching the cache file pattern
      const cacheFiles = files.filter(file =>
        file.startsWith('imagery-') && file.endsWith('.json.gz')
      );

      // Calculate total size
      for (const file of cacheFiles) {
        const filePath = join(temporaryDirectory, file);
        const status = await promises.stat(filePath);
        totalSize += status.size;
      }

      return totalSize;
    } catch (error) {
      logError(error);
      return -1;
    }
  }

  /**
  * Clears old cache by the day it was last opened
  *
  * @param {number} [maxAgeInDays=30] - Total days to check before deleting an entry
  */
  async clearOldCache(maxAgeInDays = 30) {
    const files = await promises.readdir(temporaryDirectory);

    for (const file of files) {
      if (file.startsWith('imagery-') && file.endsWith('.json.gz') === true) {
          const filePath = join(temporaryDirectory, file);

          promises.stat(filePath)
            .then(status => {
              const reachedMaxAge = (Date.now() - status.mtimeMs) > maxAgeInDays * 86400000;

              if (reachedMaxAge) {
                promises.unlink(filePath);
              }
            });
      }
    }
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

    if (pathCache.processedEntries.length >= pathCache.unprocessedEntries.length) {
      const activePathEntries = this.entriesManager.get(this.#activePath);

      this.#save(this.#activePath, activePathEntries);
      return null;
    }

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
