const { readFile, unlink, writeFile } = require('original-fs');
const { app, ipcMain } = require('electron');
const { logError } = require('./helpers.js');
const { join } = require('path');

const temporaryDirectory = app.getPath('temp');
const cacheFilePath = join(temporaryDirectory, 'imagery-cache.json');

ipcMain.handle('cache-export', async (_, cacheData) => {
  writeFile(cacheFilePath, cacheData, 'utf-8', (error) => {
    if (error) {
      logError('Error exporting cache:', error);
      throw error;
    }
  });
});

ipcMain.handle('cache-load', async _ => {
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
  unlink(cacheFilePath, error => {
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