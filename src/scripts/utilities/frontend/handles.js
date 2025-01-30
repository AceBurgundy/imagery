/**
 * Prints messages from frontend to the console
 * @param  {...any} message - An array of any type of argument
 * - If an element is of type "object", it will be stringified and beautified
 * - If an element is an array, it will be joined by ', '
 * - Else all other types are simply logged by their toString() value
 */
export const print = (...message) => window.ipcRenderer.invoke('print',
    message.map(message => typeof message === 'object' ?
    JSON.stringify(message, null, 2) :
    Array.isArray(message) ?
      message.join(', ') :
      message.toString()
    )
);

/**
 * Provides the default placeholder image.
 * @returns {Promise<string>} A promise that resolves to the placeholder image path.
 */
export const placeholderImage = async () => await window
    .ipcRenderer
    .invoke('default-image');

