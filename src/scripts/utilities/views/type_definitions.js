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
 * @property {bool} persistData - True if user wants to cache contents of a path.
 * @property {bool} savingPreviousData - True if persistData function currently saving the previous in memory data
 * @property {number} locationID - The database id of the location to save entries at if persist data is true
 * @property {ImageryEntry[]} processedEntries - List of processed entries.
 * @property {ImageryDirent[]} unprocessedEntries - List of unprocessed directory entries.
 */

module.exports = { ImageryDirent, ImageryEntriesCache, ImageryEntry }