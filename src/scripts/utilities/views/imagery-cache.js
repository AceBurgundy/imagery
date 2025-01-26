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
const Entries = require('../../../../models/Entries.js');
const Location = require('../../../../models/Location.js');
const ProcessedEntries = require('../../../../models/Entries.js');
const UnprocessedEntries = require('../../../../models/UnprocessedEntries.js');

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
      if (this.#cacheActivePath === false) {
        // remove the path from the cache to save memory
        this.entriesManager.delete(this.#activePath);

        // remove the saved cache in the database too of it too.
        this.#deleteDatabaseRecord(this.#activePath);
      }
    }

    // If path still in memory use it
    if (this.entriesManager.has(folderPath) === true) {
      // If path already exist, just set the index back to 0 to start displaying from start again
      this.#getCache(folderPath).currentIndex = 0;
      this.#activePath = folderPath;
      this.#cacheActivePath = cache;

      return;
    }

    // If path not in memory but in database
    if (this.#pathInDatabase(folderPath) === true) {
      const pathEntriesCache = this.#loadCachedEntry(folderPath);
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
      };
    });

    // Set imagery data in memory
    this.entriesManager.set(folderPath, imageryData);

    // Create a new Location based on the folderPath argument
    const location = await Location.create({
      path: folderPath,
      lastVisited: new Date().toISOString(),
    });

    // Prepare unprocessedEntries for bulk saving in UnprocessedEntries
    const unprocessedEntriesData = imageryData.unprocessedEntries.map(entry => ({
      name: entry.name,
      isFile: entry.isFile,
      isCompatibleFile: entry.isCompatibleFile,
      isDirectory: entry.isDirectory,
      locationID: location.id
    }));

    UnprocessedEntries.bulkCreate(unprocessedEntriesData);
  }

  /**
   * Checks whether a path is currently cached or not.
   *
   * @param {string} path - The directory path of the entry.
   * @returns {Promise<bool>}.
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
   * @returns {ImageryEntriesCache} If the entry has been succesfully saved.
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
      where: { locationID: location.id }
    });

    const unprocessedEntries = await UnprocessedEntries.findAll({
      where: { locationID: location.id }
    });

    return {
      currentIndex: 0,
      unprocessedEntries: unprocessedEntries.map(entry =>
        entry.get({ plain: true })
      ),
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

    // Delete all unprocessed entries related to the location
    await UnprocessedEntries.destroy({
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

    // Save entry in both database and entry manager
    Entries.create(entry);
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
