const { FileGroup, isMediaFile, isVideoFile, logError } = require("./helpers.js");
const { existsSync, promises } = require("fs");
const { join } = require("path");
const path = require('path');
const { app, ipcMain } = require('electron');

defaultThumbnailPath = path.resolve(app.getAppPath(), "src/assets/images/load.webp").replace(/\\/g, '/');
let activeStreamId = null; // Keeps track of the active stream

let pathBeingProcessed = '';
let pathEntries = [];
let slicedEntries = [];
let processedEntries = [];
let index = -1;

ipcMain.handle('default-image', _ => defaultThumbnailPath);

/**
 * Generates an array of objects for a given directory path.
 * @param {string} folderPath - The path to the directory to process.
 */
ipcMain.handle('get-directory-contents', async (event, data) => {
  const folderPath = data[0];
  let startIndex = Number(data[1]);
  let endIndex = Number(data[2]);

  const streamId = Date.now();
  activeStreamId = streamId;

  processedEntries = [];

  if (!existsSync(folderPath) === true) {
    throw new Error(`Folder path does not exist`);
  }

  if (typeof startIndex !== "number" || typeof endIndex !== "number") {
    throw new Error(`Start and End index is required`);
  }

  async function readFolder(path) {
    try {
      const entries = await promises.readdir(path, { withFileTypes: true });
      return entries;
    } catch (error) {
      if (error.code === "EPERM") {
        logError(`Permission denied for ${path}. Skipping this folder.`);
        return [];
      }

      throw error;
    }
  }

  // Entries is a list of folder and file data
  if (pathBeingProcessed !== folderPath) {
    index = -1;
    pathBeingProcessed = folderPath
    pathEntries = await readFolder(folderPath);
  }


  // Making sure the start and end indexes doesn't go over limit
  startIndex = startIndex < 0 ? 0 : startIndex;
  endIndex = endIndex > pathEntries.length ? pathEntries.length : endIndex;

  slicedEntries = pathEntries.slice(startIndex, endIndex);

  for (const folderEntry of slicedEntries) {
    if (streamId !== activeStreamId) {
      slicedEntries = [];
      processedEntries = [];
      return;
    }

    const entryFullPath = join(folderPath, folderEntry.name);

    if (folderEntry.isFile() && isMediaFile(folderEntry.name) === true) {
      const isVideo = isVideoFile(entryFullPath);

      // Push the entry to the array instead of sending directly
      processedEntries.push({
          index: index++,
          title: folderEntry.name,
          destination: folderPath,
          isMedia: true,
          path: entryFullPath,
          thumbnailType: isVideo ? FileGroup.VIDEO : FileGroup.IMAGE,
          thumbnailPath: entryFullPath
        });

      continue;
    }

    if (!folderEntry.isDirectory() === true) {
      continue;
    }

    const queue = [entryFullPath]; // Start with the current folder
    let firstValidParent = null;
    let foldersTraversed = 0;

    // Perform a breadth-first search (BFS) with a limit of 10 traverses
    while (queue.length > 0 && foldersTraversed < 10) {
      if (streamId !== activeStreamId) {
        slicedEntries = [];
        processedEntries = [];
        return;
      }

      const currentFolderPath = queue.shift();
      const subFolderEntries = await readFolder(currentFolderPath);

      let containsMedia = false;
      let containsSubfolders = false;

      for (const subEntry of subFolderEntries) {
        if (streamId !== activeStreamId) {
          slicedEntries = [];
          processedEntries = [];
          return;
        }

        if (subEntry.isFile() && isMediaFile(subEntry.name) === true) {
          containsMedia = true;
        }

        else if (subEntry.isDirectory() === true) {
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

        const thumbnailPath = join(
          currentFolderPath,
          subFolderEntries.find(subEntry => subEntry.isFile() && isMediaFile(subEntry.name) === true).name
        );

        // Push the entry to the array instead of sending directly
        processedEntries.push({
          index: index++,
          isMedia: false,
          destination: folderPath,
          title: folderEntry.name,
          path: firstValidParent || currentFolderPath,
          thumbnailType: isVideoFile(thumbnailPath) ? FileGroup.VIDEO : FileGroup.IMAGE,
          thumbnailPath: thumbnailPath,
        });

        break;
      }

      // If no media found, add subfolders to the queue for further traversal
      for (const subEntry of subFolderEntries) {
        if (subEntry.isDirectory() === true) {
          queue.push(join(currentFolderPath, subEntry.name));
        }
      }

      foldersTraversed++;
    }
  }

  return processedEntries;
});

/**
 * Returns a list of media file names in a given directory path.
 * @param {string} folderPath - The path to the folder to scan for media files.
 * @returns {Promise<string[]>} - List of media file names in the folder.
 */
ipcMain.handle('directory-media', async (_, path) => {
  if (!existsSync(folderPath) === true) {
    throw new Error(`Folder path does not exist: ${folderPath}`);
  }

  const folderEntries = await promises.readdir(folderPath, {
    withFileTypes: true,
  });

  return folderEntries
    .filter(entry => entry.isFile() && isMediaFile(entry.name) === true)
    .map(entry => entry.name);
});
