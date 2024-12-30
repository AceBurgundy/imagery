export async function getFolderContents(path) {
  return await window.ipcRenderer.invoke('directory-contents', path);
}

export async function createFolderCells(path, singles) {
  return await window.ipcRenderer.invoke('directory-innerHTML', [path, singles]);
}

export async function getFolderMedia(path) {
  return await window.ipcRenderer.invoke('directory-media', path);
}

export async function getThumbnail(path, iconSize) {
  return await window.ipcRenderer.invoke('get-thumbnail', path, iconSize);
}

export function print(...message) {
  window.ipcRenderer.invoke('print',
    message.map(message => {
      if (typeof message === "object") {
        return JSON.stringify(message, null, 2)
      }

      return message.toString();
    })
  );
}

/**
 * Joins strings with '\'
 * @param {string[]} paths - Array of strings to be joined
 * @returns {Promise<string>}
 */
export async function pathJoin(...paths) {
  return await window.ipcRenderer.invoke('join-paths', paths)
}

/**
 * @param {string} path - The path whose basename to be extracted from
 * @returns {Promise<string>}
 */
export async function pathBasename(path) {
  return await window.ipcRenderer.invoke('path-basename', path)
}
