const { isMediaFile } = require("./helpers.js");
const { existsSync, promises } = require("fs");
const { ipcMain } = require('electron');
const { imageryCache } = require('./imagery-cache.js');

/**
 * Generates an array of objects for a given directory path and creates a cache of the directory contents.
 * @param {string} path - The path to the directory to process.
 * @throws {Error} - Throws an error if the folder path does not exist.
 */
ipcMain.handle('prepare-directory-contents', async (event, path) => {
  if (!existsSync(path) === true) {
    throw new Error(`Folder path does not exist`);
  }

  await imageryCache.prepareEntries(path);
});

const { ImageryEntry } = require('./type_definitions.js');

/**
 * Retrieves the next content from the imagery cache.
 * @returns {Promise<ImageryEntry|null>} - The next content in the imagery cache.
 */
ipcMain.handle('next-content', async _ =>
  imageryCache.next()
);

/**
 * Cache a folders entries.
 * @param {string} path - The path to the directory to process.
 * @throws {Error} - Throws an error if the folder path does not exist.
 */
ipcMain.handle('cache-directory-contents', async (event, path) =>
  imageryCache.save(path)
);

/**
 * Returns a list of media file names (images or videos) in a given directory path.
 * @param {string} folderPath - The path to the folder to scan for media files.
 * @returns {Promise<string[]>} - A promise that resolves to an array of media file names in the folder.
 * @throws {Error} - Throws an error if the folder path does not exist.
 */
ipcMain.handle('directory-media', async (_, folderPath) => {
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
