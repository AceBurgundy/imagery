const { createLogger, transports: _transports } = require('winston');
const { nativeImage, app, ipcMain, BrowserWindow } = require('electron');
const { extname, basename, join } = require('path');
const path = require('path');
const { promises, Dirent } = require('fs');

/**
 * Enum for different file group types.
 * @readonly
 * @enum {string}
 */
const FileGroup = {
  DIRECTORY: 'directory', // Represents a directory.
  MEDIA: 'media', // Represents a media file.
  VIDEO: 'video', // Represents a video file.
  IMAGE: 'image' // Represents an image file.
};

/**
 * Checks if a file is an image based on its extension.
 * @param {string} fileName - Name of the file to check.
 * @returns {boolean} - Returns true if the file is an image, otherwise false.
 */
function isImageFile(fileName) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  return imageExtensions.includes(extname(fileName).toLowerCase());
}

/**
 * Checks if a file is a video based on its extension.
 * @param {string} fileName - Name of the file to check.
 * @returns {boolean} - Returns true if the file is a video, otherwise false.
 */
function isVideoFile(fileName) {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.ts'];
  return videoExtensions.includes(extname(fileName).toLowerCase());
}

/**
 * Checks if a file is a media (image or video) based on its extension.
 * @param {string} fileName - Name of the file to check.
 * @returns {boolean} - Returns true if the file is an image or video, otherwise false.
 */
function isMediaFile(fileName) {
  return isImageFile(fileName) || isVideoFile(fileName);
}

const defaultImagePath = path.resolve(app.getAppPath(), "src/assets/images/load.webp").replace(/\\/g, '/');

/**
 * Creates a thumbnail from a given media path.
 * @param {string} filePath - Path of the file to create the thumbnail from.
 * @param {number} size - Size of the thumbnail.
 * @returns {Promise<string>} - The base64 image thumbnail.
 */
ipcMain.handle('get-thumbnail', async (_, filePath, size) =>
  await getThumbnail(filePath, size)
);

/**
 * Gets a thumbnail for a given media file.
 * @param {string} filePath - Path of the media file.
 * @param {number} size - Size of the thumbnail.
 * @returns {Promise<string>} - The base64 image thumbnail or the default thumbnail path if an error occurs.
 */
async function getThumbnail(filePath, size) {
  if (!filePath) {
    logError("Cannot pass an undefined file path to getThumbnail");
    return defaultImagePath;
  }

  try {
    const media = await nativeImage.createThumbnailFromPath(
      filePath,
      { width: size ?? 512, height: size ?? 512 }
    );

    return media.toDataURL();
  } catch (error) {
    logError(`Error in getting file thumbnail for ${basename(filePath)}, getting default thumbnail instead: ${error}`);
    return defaultImagePath;
  }
}

/**
 * Reads the contents of a folder and returns the directory entries.
 * @param {string} path - Path of the folder to read.
 * @returns {Promise<Dirent[]>} - A promise that resolves to an array of directory entries.
 * @throws {Error} Throws error if folder reading fails due to permission issues or other errors.
 */
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

const logger = createLogger({
  transports: [
    new _transports.File({ filename: 'error.log', level: 'error' })
  ]
});

/**
 * Logs and saves an error to a file.
 * @param {Error} error - An instance of Error or a string describing the error.
 */
function logError(error) {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  logger.error({
    timestamp: new Intl.DateTimeFormat('en-US', options).format(
      new Date()
    ),
    error,
    stack: error.stack,
    cause: error.cause
  });

  console.log(error);
}

/**
 * Handles the 'print' IPC message and logs the provided message to the console.
 * @param {Electron.IpcMainInvokeEvent} _ - The event object.
 * @param {string[]} message - The message to log to the console.
 */
ipcMain.handle('print', (_, message) => {
  console.log(message.join(' '));
});

/**
 * Joins the provided paths into a single path.
 * @param {string[]} paths - The array of paths to join.
 * @returns {string} - The joined path.
 */
ipcMain.handle('join-paths', (_, paths) => {
  return join(...paths);
});

/**
 * Returns the base name of the provided path.
 * @param {Electron.IpcMainInvokeEvent} event - The event object.
 * @param {string} pathArg - The path to extract the base name from.
 * @returns {string} - The base name of the file or folder.
 */
ipcMain.handle('path-basename', (event, pathArg) => {
  return basename(pathArg);
});

/**
 * Sets the current window to fullscreen mode.
 */
ipcMain.handle('on-fullscreen', () => {
  BrowserWindow.getFocusedWindow().setFullScreen(true);
});

/**
 * Sets the current window to non-fullscreen mode.
 */
ipcMain.handle('off-fullscreen', () => {
  BrowserWindow.getFocusedWindow().setFullScreen(false);
});

const defaultThumbnailPath = path.resolve(
  app.getAppPath(), "src/assets/images/load.webp"
).replace(/\\/g, '/');

// IPC handler to return the default thumbnail image path.
ipcMain.handle('default-image', _ => defaultThumbnailPath);

module.exports = {
  FileGroup,
  defaultThumbnailPath,
  getThumbnail,
  isImageFile,
  logError,
  isVideoFile,
  isMediaFile,
  readFolder
};
