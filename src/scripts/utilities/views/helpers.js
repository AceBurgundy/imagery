const { createLogger, transports: _transports } = require('winston');
const { nativeImage, app, ipcMain, BrowserWindow } = require('electron');
const { extname, basename, join } = require('path');
const path = require('path');

// Enum for object types
const FileGroup = {
  DIRECTORY: 'directory',
  MEDIA: 'media',
  VIDEO: 'video',
  IMAGE: 'image'
};

/**
 * Checks if a file is an image based on its extension.
 * @param {string} fileName - Name of the file to check.
 * @returns {boolean}
 */
function isImageFile(fileName) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  return imageExtensions.includes(extname(fileName).toLowerCase());
}

/**
 * Checks if a file is a video based on its extension.
 * @param {string} fileName - Name of the file to check.
 * @returns {boolean}
 */
function isVideoFile(fileName) {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.ts'];
  return videoExtensions.includes(extname(fileName).toLowerCase());
}

/**
 * Checks if a file is a video or image based on its extension.
 * @param {string} fileName - Name of the file to check.
 * @returns {boolean}
 */
function isMediaFile(fileName) {
  return isImageFile(fileName) || isVideoFile(fileName);
}

const defaultImagePath = path.resolve(app.getAppPath(), "src/assets/images/load.webp").replace(/\\/g, '/');

/**
 * Creates a thumbnail from a given media path.
 * @param {string} filePath - Path of the file to check.
 * @param {number} size - Size of the thumbnail.
 * @returns {Promise<String>} The base64 image thumbnail
 */
ipcMain.handle('get-thumbnail', async (_, filePath, size) => {
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
});

const logger = createLogger({
  transports: [
    new _transports.File({ filename: 'error.log', level: 'error' })
  ]
});

/**
 * Logs and saves error to file
 * @param {Error | string} error - an instance of Error or a string
 */
function logError(error) {
  // console.log(error);
  logger.error(`${new Date().toISOString()} : ${error}`);
}

ipcMain.handle('print', (_, message) => {
  console.log(message.join(' '));
});

ipcMain.handle('join-paths', (_, paths) => {
  return join(...paths);
});

ipcMain.handle('path-basename', (_, _path) => {
  return basename(_path);
});

ipcMain.handle('on-fullscreen', () => {
  BrowserWindow.getFocusedWindow().setFullScreen(true);
})

ipcMain.handle('off-fullscreen', () => {
  BrowserWindow.getFocusedWindow().setFullScreen(false);
})

module.exports = {
  FileGroup,
  isImageFile,
  logError,
  isVideoFile,
  isMediaFile,
};
