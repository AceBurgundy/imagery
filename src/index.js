/* eslint-disable linebreak-style */
const { app, BrowserWindow } = require('electron');
const { join, resolve, dirname } = require('path');
const { existsSync } = require('fs');
const squirrelStartup = require('electron-squirrel-startup');

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
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, 'preload.js'), // Update to .js if using CommonJS for preload too
      devTools: true,
    },
    minHeight: 480,
    minWidth: 720,
    height: 720,
    width: 1080,
    autoHideMenuBar: true,
    icon,
    show: false,
  });

  mainWindow.loadFile(join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Prevent page refresh with Control + R and opening of console
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const preventReload = input.control && input.key.toLowerCase() === 'r';
    const preventInspect = input.control && input.shift && input.key.toLowerCase() === 'i';

    if (preventReload) {
      event.preventDefault();
    }
  });
};

app.on('ready', () => {
  // Dynamically require scripts if necessary
  const viewScriptPath = join(__dirname, './scripts/view.js');
  if (existsSync(viewScriptPath)) {
    require(viewScriptPath);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
