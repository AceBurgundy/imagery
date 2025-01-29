/* eslint-disable linebreak-style */
const { app, BrowserWindow, ipcMain } = require('electron');
const { join, resolve } = require('path');
const { existsSync } = require('fs');
const squirrelStartup = require('electron-squirrel-startup');
const { logError } = require('./scripts/utilities/views/helpers.js');

let icon;

// Check for Electron Squirrel Startup
if (squirrelStartup) app.quit();

switch (process.platform) {
  case 'win32':
    icon = resolve(__dirname, '../src/assets/logo', 'switch.ico');
    break;
  case 'darwin':
    icon = resolve(__dirname, '../src/assets/logo', 'switch.icns');
    break;
  case 'linux':
    icon = resolve(__dirname, '../src/assets/logo', 'switch.png');
    break;
}

const createWindow = () => {

  const window = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, 'preload.js'),
      devTools: true,
    },
    minHeight: 540,
    minWidth: 720,
    height: 720,
    width: 1080,
    enableBlinkFeatures: 'Autofill',
    autoHideMenuBar: true,
    icon,
    show: false,
  });

  window.loadFile(join(__dirname, 'index.html'));
  window.webContents.openDevTools();

  window.once('ready-to-show', () => {
    window.maximize();
    window.show();
  });

  // Prevent page refresh with Control + R and opening of console
  window.webContents.on('before-input-event', (event, input) => {
    const preventReload = input.control && input.key.toLowerCase() === 'r';
    const preventInspect = input.control && input.shift && input.key.toLowerCase() === 'i';

    if (preventReload) {
      event.preventDefault();
    }
  });

  window.on('resize', () =>
    window.webContents.send('window-resize', [window.getBounds().width, window.getBounds().height])
  );

  ipcMain.handle('window-bounds', () =>
    [window.getBounds().width, window.getBounds().height]
  )
};

app.on('ready', () => {
  // app.commandLine.appendSwitch('disable-logging');

  // Dynamically require scripts if necessary
  const directory = join(__dirname, './scripts/utilities/views/directory.js');
  const handlers = join(__dirname, './scripts/utilities/views/handlers.js');

  if (existsSync(directory) === true) {
    require(directory);
  }

  if (existsSync(handlers) === true) {
    require(handlers);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle uncaught exceptions in the main process
process.on('uncaughtException', (error) => {
  console.log(error.stack);
  logError(`Uncaught Exception: ${error}`);
  app.quit();
});

// Handle unhandled promise rejections in the main process
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Promise Rejection: ${reason}`);
  app.quit();
});