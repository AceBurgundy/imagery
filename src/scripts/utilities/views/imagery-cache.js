const { join, dirname } = require('path');
const { isMediaFile, readFolder, logError } = require("./helpers.js");
const { Dirent, promises } = require("fs");

const Location = require('../../../../models/location.js');

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
 * @typedef {Object} ImageryDirent
 * @property {string} name - The name of the directory entry.
 * @property {boolean} isFile - Whether the entry is a file.
 * @property {boolean} isCompatibleFile - Whether the entry is a compatible file.
 * @property {boolean} isDirectory - Whether the entry is a directory.
 */

/**
 * @typedef {Object} ImageryEntriesCache
 * @property {ImageryEntry[]} okEntries - List of processed entries.
 * @property {ImageryDirent[]} allEntries - List of unprocessed directory entries.
 */

/**
 * Class representing a cache system for imagery.
 */
class ImageryCache {
  /** @type {Map<string, ImageryEntriesCache>} */
  memory;

  /** @type {ImageryEntriesCache} */
  #activePathCache;

  /** @type {string} */
  #activePath;

  constructor() {
    this.memory = new Map();
    this.#activePath = "";
    this.#activePathCache = {};
  }

  /**
   * Creates a new cache entry for a given path.
   * @param {string} folderPath - The folder path for caching.
   */
  async prepareEntries(folderPath) {

    /** @type {ImageryEntriesCache} */
    const imageryData = {
      okEntries: [],
      allEntries: []
    };

    // If path still in memory use it
    if (this.memory.has(folderPath) === true) {
      // If path also in database
      if (await this.#pathInDatabase(folderPath) === true) {
        // update path last visited date
        this.#updatePathLastVisited();
      }

      // If path already exist, just set the index back to 0 to start displaying from start again
      this.#activePath = folderPath;

      // When the folder asks for the same entries again,
      // only ask for the length of ok entries
      // since it had already been processed
      this.#activePathCache = this.memory.get(this.#activePath);
      return this.#activePathCache.okEntries.length;
    }

    this.#activePath = folderPath;

    /** @type {Dirent[]} */
    const entries = await readFolder(folderPath);

    imageryData.allEntries = entries.map((entry, index) => {
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
    this.#activePathCache = imageryData;

    return imageryData.allEntries.length;
  }

  /**
   * Checks whether a path is currently in the database.
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
   * Update the active paths last visited date.
   *
   * @throws {Exception} - If cache file does not exist. Use #pathInDatabase first.
  */
  async #updatePathLastVisited() {
    // get location first
    const location = await Location.findOne({
      where: { path: this.#activePath }
    });

    if (!location) return

    location.lastVisited = new Date().toISOString()
    location.save();
  }

  /**
   * Adds a new processed entry to the list.
   *
   * @param {number} index - The index of the entry.
   * @param {string} title - The title of the entry.
   * @param {string} destination - The destination path for the entry.
   * @param {boolean} isMedia - Indicates if the entry is media.
   * @param {string} path - The file path of the entry.
   * @param {string} thumbnailPath - The path to the thumbnail.
   *
   * @returns {ImageryEntry} The completed card data for render
   * @throws {Error} If the entry is null or not an object.
   */
  async #pushNewEntry(index, title, destination, isMedia, path, thumbnailPath) {
    const entry = {
      "index": index,
      "title": title,
      "destination": destination,
      "isMedia": isMedia,
      "path": path,
      "thumbnailPath": thumbnailPath,
      ...await this.#populateMetadata(path)
    };

    const indexToReplace = this.#activePathCache.okEntries.findIndex(
      item => item.name === title
    );

    if (indexToReplace > -1) {
      // replace the entry with the new entry
      // great for updating old entries
      this.#activePathCache.okEntries[indexToReplace] = entry;
    } else {
      // Prepend the new entry to the okEntries array
      this.#activePathCache.okEntries.push(entry);
    }

    // Return the entry for rendering
    return entry;
  }

  /**
   * Populates metadata for the entry based on its file path.
   */
  async #populateMetadata(path) {
    const metadata = {};

    try {
      const stats = await promises.stat(path);
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
  async next(index) {
    if (!this.#activePath) throw Error("Cannot find active path");
    let { okEntries, allEntries } = this.#activePathCache;
    const entryExist = okEntries[index];

    // return if entry for this index has already been processed
    if (entryExist) return entryExist;

    /** @type {ImageryDirent} */
    const currentEntry = allEntries[index];
    if (!currentEntry) throw Error(`Cannot find entry to process`);

    const entryPath = join(this.#activePath, currentEntry.name);

    if (currentEntry.isFile) {
      if (!currentEntry.isCompatibleFile) return null;

      return this.#pushNewEntry(
        index, // index
        currentEntry.name, // title
        this.#activePath, // destination
        true, // isMedia
        entryPath, // path
        entryPath, // thumbnailPath
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
            index, // index
            currentEntry.name, // title
            this.#activePath, // destination
            false, // isMedia
            firstValidParent || currentFolderPath, // path
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
