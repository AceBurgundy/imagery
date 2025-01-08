export function print(...message) {
  window.ipcRenderer.invoke('print',
    message.map(message =>
        typeof message === "object"
          ? JSON.stringify(message, null, 2)
          : Array.isArray(message)
            ? message.join(', ')
            : message.toString()
    )
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