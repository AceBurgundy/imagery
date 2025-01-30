/* eslint-disable no-undef */
const { extname, join, basename, dirname, resolve, normalize } = require('path');
const { ipcMain, BrowserWindow } = require('electron');
const { defaultThumbnailPath, getThumbnail } = require('./helpers.js');

ipcMain.handle('path-extname', (_, path) =>
  extname(path)
);

ipcMain.handle('join-paths', (_, paths) =>
  join(...paths)
);

// Get basename
ipcMain.handle('path-basename', (_, path) =>
  basename(path)
);

// Get dirname
ipcMain.handle('path-dirname', (_, path) =>
  dirname(path)
);

// Resolve paths
ipcMain.handle('path-resolve', (_, paths) =>
  resolve(...paths)
);

// Normalize path
ipcMain.handle('path-normalize', (_, path) =>
  normalize(path)
);

// Prints message to console
ipcMain.handle('print', (_, message) =>
  console.log(message.join(' '))
);

// Sets the current window to fullscreen mode.
ipcMain.handle('on-fullscreen', () =>
  BrowserWindow.getFocusedWindow().setFullScreen(true)
);

// Sets the current window to non-fullscreen mode.
ipcMain.handle('off-fullscreen', () =>
  BrowserWindow.getFocusedWindow().setFullScreen(false)
);

// Returns the default thumbnail image
ipcMain.handle('default-image', _ => defaultThumbnailPath);

// Creates a thumbnail from a given media
ipcMain.handle('get-thumbnail', async (_, path, size) =>
  await getThumbnail(path, size)
);
