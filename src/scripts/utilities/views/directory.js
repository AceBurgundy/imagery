const { FileGroup, isMediaFile, isVideoFile, logError } = require("./helpers.js");
const { existsSync, promises } = require("fs");
const pLimit = require('./p-limit.js');
const { join } = require("path");
const path = require('path');
const { app } = require('electron');

const limit = pLimit(10);
const thumbnailSize = 512;
const defaultThumbnailPath = path.resolve(app.getAppPath(), "src/assets/images/load.webp");

/**
 * Generates an array of objects for a given directory path.
 * @param {string} directoryPath - The path to the directory to process.
 * @returns {Promise<Array<{name: string, firstMedia?: string, type: string}>>}
 */
async function getFolderContents(folderPath) {
  if (!existsSync(folderPath) === true) {
    throw new Error(`Folder path does not exist: ${folderPath}`);
  }

  async function readFolder(path) {
    try {
      return await promises.readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === "EPERM") {
        logError(`Permission denied for ${path}. Skipping this folder.`);
        return [];
      }
      throw error;
    }
  }

  // Entries is a list of folder and file data
  let entries = await readFolder(folderPath);

  /**
   *
   * @param {Dirent} folderEntry
   * @returns
   */
  async function processEntry(folderEntry) {
    const entryFullPath = join(folderPath, folderEntry.name);

    if (folderEntry.isFile() && isMediaFile(folderEntry.name) === true) {
      return {
        name: folderEntry.name,
        path: entryFullPath,
        type: isVideoFile(entryFullPath) ? FileGroup.VIDEO : FileGroup.IMAGE,
      };
    }

    if (folderEntry.isDirectory() === false) {
      return null;
    }

    // early return allow us to only process entry if it is a folder
    const queue = [entryFullPath]; // Start with the current folder
    let firstSubEntryFileName = null;
    let firstSubEntryFileFound = false;
    let foldersTraversed = 0; // Track the number of traversed folders

    // Perform a breadth-first search (BFS) with a limit of 10 traverses
    while (queue.length > 0 && foldersTraversed < 10) {
      const currentFolderPath = queue.shift();
      const subFolderEntries = await readFolder(currentFolderPath);

      // Check for media files in the current folder
      for (const subEntry of subFolderEntries) {
        if (subEntry.isFile() && isMediaFile(subEntry.name) === true) {
          firstSubEntryFileName = subEntry.name;
          firstSubEntryFileFound = true;
          break;
        }
      }

      // If media found, stop searching and return the folder with media
      if (firstSubEntryFileFound) {
        return {
          name: folderEntry.name,
          thumbnail: join(currentFolderPath, firstSubEntryFileName),
          type: FileGroup.DIRECTORY,
        };
      }

      // If no media found, add subfolders to the queue for further traversal
      for (const subEntry of subFolderEntries) {
        if (subEntry.isDirectory() === true) {
          queue.push(join(currentFolderPath, subEntry.name));
        }
      }

      foldersTraversed++;
    }

    // If we exit the loop without finding any media
    if (firstSubEntryFileFound) {
      return {
        name: folderEntry.name,
        thumbnail: join(currentFolderPath, firstSubEntryFileName),
        type: FileGroup.DIRECTORY,
      };
    }
  }

  const results = await Promise.all(
    entries.map((folderEntry) => limit((_) => processEntry(folderEntry)))
  );

  return results.filter(Boolean);
}

/**
 * Generates an array of objects for a given directory path.
 * @param {string} directoryPath - The path to the directory to process.
 * @returns {Promise<Array<{name: string, firstMedia?: string, type: string}>>}
 */
async function createFolderCells(folderPath, singles) {
  if (!existsSync(folderPath) === true) {
    throw new Error(`Folder path does not exist: ${folderPath}`);
  }

  async function readFolder(path) {
    try {
      return await promises.readdir(path, { withFileTypes: true });
    } catch (error) {
      if (error.code === "EPERM") {
        logError(`Permission denied for ${path}. Skipping this folder.`);
        return [];
      }
      throw error;
    }
  }

  // Entries is a list of folder and file data
  let entries = await readFolder(folderPath);

  /**
   *
   * @param {Dirent} folderEntry
   * @returns
   */
  async function processEntry(folderEntry) {
    const entryFullPath = join(folderPath, folderEntry.name);

    if (folderEntry.isFile() && isMediaFile(folderEntry.name) === true) {
      const thumbnailType = isVideoFile(entryFullPath) ? FileGroup.VIDEO : FileGroup.IMAGE;
      const imageThumbnail = thumbnailType === FileGroup.IMAGE ? entryFullPath : defaultThumbnailPath;

      return /*html*/`
        <div class="directory-cell is-media" data-filename="${folderEntry.name}" data-path="${entryFullPath}" data-thumbnail-type="${thumbnailType}">
          <img class="directory-cell__image" src="${imageThumbnail}" height="${thumbnailSize / 2}" width="${thumbnailSize}">
          <p>${folderEntry.name}</p>
        </div>
      `;
    }

    if (!folderEntry.isDirectory() === true) {
      return '';
    }

    const queue = [entryFullPath]; // Start with the current folder
    let firstValidParent = null;
    let foldersTraversed = 0;

    // Perform a breadth-first search (BFS) with a limit of 10 traverses
    while (queue.length > 0 && foldersTraversed < 10) {
      const currentFolderPath = queue.shift();
      const subFolderEntries = await readFolder(currentFolderPath);

      let containsMedia = false;
      let containsSubfolders = false;

      for (const subEntry of subFolderEntries) {
        if (subEntry.isFile() && isMediaFile(subEntry.name)) {
          containsMedia = true;
        } else if (subEntry.isDirectory()) {
          containsSubfolders = true;
        }

        // Stop checking further if both media and subfolders are found
        if (containsMedia && containsSubfolders) break;
      }

      if (containsMedia) {
        // Save the first valid parent folder if traversed > 0
        if (foldersTraversed > 0 && !firstValidParent) {
          firstValidParent = path.dirname(currentFolderPath);
        }

        const thumbnailType = containsMedia ? FileGroup.VIDEO : FileGroup.IMAGE;
        const thumbnailPath = join(currentFolderPath, subFolderEntries.find(subEntry => subEntry.isFile() && isMediaFile(subEntry.name)).name);
        const imageThumbnail = thumbnailType === FileGroup.IMAGE ? thumbnailPath : defaultThumbnailPath;
        const videoThumbnail = thumbnailType === FileGroup.VIDEO ? thumbnailPath : defaultThumbnailPath;

        return /*html*/`
          <div class="directory-cell is-folder" data-path="${firstValidParent || currentFolderPath}" data-thumbnail-type="${thumbnailType}" data-video-thumbnail="${videoThumbnail}">
            <img class="directory-cell__image" src="${imageThumbnail}" height="${thumbnailSize / 2}" width="${thumbnailSize}">
            <p>${folderEntry.name}</p>
          </div>
        `;
      }

      // If no media found, add subfolders to the queue for further traversal
      for (const subEntry of subFolderEntries) {
        if (subEntry.isDirectory()) {
          queue.push(join(currentFolderPath, subEntry.name));
        }
      }

      foldersTraversed++;
    }

    // If no valid folder with media is found
    return '';
  }

  const htmlContent = await Promise.all(
    entries.map(folderEntry =>
      limit(_ =>
        processEntry(folderEntry)
      )
    )
  );

  return singles ? htmlContent.join('') : htmlContent;
}

/**
 * Returns a list of media file names in a given directory path.
 * @param {string} folderPath - The path to the folder to scan for media files.
 * @returns {Promise<string[]>} - List of media file names in the folder.
 */
async function getFolderMedia(folderPath) {
  if (!existsSync(folderPath)) {
    throw new Error(`Folder path does not exist: ${folderPath}`);
  }

  const folderEntries = await promises.readdir(folderPath, {
    withFileTypes: true,
  });

  return folderEntries
    .filter((entry) => entry.isFile() && isMediaFile(entry.name))
    .map((entry) => entry.name);
}

module.exports = { getFolderContents, getFolderMedia, createFolderCells };
