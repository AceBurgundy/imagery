const { createLogger, transports: _transports } = require('winston');
const { nativeImage, app } = require('electron');
const { extname, basename } = require('path');

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
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm'];
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

/**
 * Creates a thumbnail from a given media path.
 * @param {string} filePath - Path of the file to check.
 * @param {number} size - Size of the thumbnail.
 * @returns {Promise<String>} The base64 image thumbnail
 */
async function getThumbnail(filePath, size) {
  if (!filePath) {
    logError("Cannot pass an undefined file path to getThumbnail");
    return;
  }

  try {
    const media = await nativeImage.createThumbnailFromPath(
      filePath,
      { width: size ?? 512, height: size ?? 512 }
    );

    return media.toDataURL();
  } catch (error) {
    logError(`Error in getting file thumbnail for ${basename(filePath)}, getting default thumbnail instead: ${error}`);

    const thumbnail = await app.getFileIcon(filePath);
    return thumbnail.toDataURL();
  }
}

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
  console.log(error);
  logger.error(`${new Date().toISOString()} : ${error}`);
}

module.exports = {
  FileGroup,
  isImageFile,
  logError,
  isVideoFile,
  isMediaFile,
  getThumbnail
};
