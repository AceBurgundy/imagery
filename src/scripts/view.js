const { ipcMain, app } = require('electron');
const { join, basename } = require('path');
const { writeFile, readFile, unlink } = require('fs');
const { getFolderContents, getFolderMedia, createFolderCells } = require('./utilities/views/directory.js');
const { getThumbnail, logError } = require('./utilities/views/helpers.js');

ipcMain.handle('directory-contents', async (_, path) => {
  return await getFolderContents(path);
});

ipcMain.handle('directory-innerHTML', async (_, arguments) => {
  return await createFolderCells(...arguments);
});

ipcMain.handle('directory-media', async (_, path) => {
  return await getFolderMedia(path);
});

ipcMain.handle('get-thumbnail', async (_, path, iconSize) => {
  return await getThumbnail(path, iconSize);
});

ipcMain.handle('print', (_, message) => {
  logError(message.join('\n'));
});

ipcMain.handle('join-paths', (_, paths) => {
  return join(...paths);
});

ipcMain.handle('path-basename', (_, _path) => {
  return basename(_path);
});

const temporaryDirectory = app.getPath('temp');
const cacheFilePath = join(temporaryDirectory, 'imagery-cache.json');

ipcMain.handle('cache-export', async (_, cacheData) => {
  try {
    writeFile(cacheFilePath, cacheData, 'utf-8', (error) => {
      if (error) {
        logError('Error exporting cache:', error);
        throw error;
      }

      console.log("exported");
    });
  } catch (error) {
    logError('Error exporting cache:', error);
    throw error;
  }
});

ipcMain.handle('cache-load', async (_) => {
  return new Promise((resolve, reject) => {
    readFile(cacheFilePath, 'utf-8', (error, data) => {
      if (error) {
        if (error.code === 'ENOENT') {
          logError('Cache file not found. Returning empty cache.');
          return resolve(null);
        }
        logError('Error loading cache:', error);
        return reject(error);
      }
      resolve(data);
    });
  });
});

ipcMain.handle('cache-clear', () => {
  unlink(cacheFilePath, (error) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.warn('Cache file not found. Nothing to clear.');
      } else {
        logError('Error clearing cache:', error);
        throw error;
      }
    }
  });
});
