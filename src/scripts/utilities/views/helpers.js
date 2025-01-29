const { createLogger, transports: _transports } = require('winston');
const { nativeImage, app } = require('electron');
const { extname, basename } = require('path');
const { promises, Dirent } = require('fs');
const path = require('path');

/**
 * Enum for different file group types.
 * @readonly
 * @enum {string}
 */
const FileGroup = {
  DIRECTORY: 'directory',
  MEDIA: 'media',
  VIDEO: 'video',
  IMAGE: 'image'
};

/**
 * Checks if a file is an image based on its extension.
 * @param {string} filename - Name of the file to check.
 * @returns {boolean} - Returns true if the file is an image, otherwise false.
 */
const isImageFile = filename => [
    '.jpg', '.jpeg', '.png',
    '.gif', '.webp', '.bmp'
  ].includes(
    extname(filename).toLowerCase()
  );

/**
 * Checks if a file is a video based on its extension.
 * @param {string} filename - Name of the file to check.
 * @returns {boolean} - Returns true if the file is a video, otherwise false.
 */
const isVideoFile = filename => [
    '.mp4', '.mkv', '.avi', '.mov',
    '.flv', '.wmv', '.webm', '.ts'
  ].includes(
    extname(filename).toLowerCase()
  );

/**
 * Checks if a file is a media (image or video) based on its extension.
 * @param {string} filename - Name of the file to check.
 * @returns {boolean} - Returns true if the file is an image or video, otherwise false.
 */
const isMediaFile = filename => isImageFile(filename) || isVideoFile(filename);

/**
 * Returns the path to the defualt template image
 */
const defaultThumbnailPath = path
  .resolve(
    app.getAppPath(), "src/assets/images/load.webp"
  ).replace(/\\/g, '/');

/**
 * Gets a thumbnail for a given media file.
 * @param {string} filePath - Path of the media file.
 * @param {number} size - Size of the thumbnail.
 * @returns {Promise<string>} - The base64 image thumbnail or the default thumbnail path if an error occurs.
 */
async function getThumbnail(filePath, size) {
  if (!filePath) {
    logError("Cannot pass an undefined file path to getThumbnail");
    return defaultThumbnailPath;
  }

  try {
    const thumbnail = await nativeImage.createThumbnailFromPath(
      filePath,
      { width: size ?? 300, height: size ?? 150 }
    );

    return thumbnail.toDataURL();
  } catch (error) {
    logError(`Error in getting file thumbnail for ${basename(filePath)},\ngetting default thumbnail instead.\n${error}`);
    return defaultThumbnailPath;
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

  console.log(`\n${error}`);
}

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
