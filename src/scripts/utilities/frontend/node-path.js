/**
 * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
 * If there is no '.' in the last portion of the path or the first character of it is '.', then it returns an empty string.
 *
 * @param path the path to evaluate.
 * @throws {TypeError} if `path` is not a string.
 */
export const extname = async path => await window
    .ipcRenderer
    .invoke('path-extname', path);

/**
 * Join all arguments together and normalize the resulting path.
 *
 * @param paths paths to join.
 * @throws {TypeError} if any of the path segments is not a string.
 */
export const join = async (...paths) => await window
    .ipcRenderer
    .invoke('join-paths', paths);

/**
 * Return the last portion of a path. Similar to the Unix basename command.
 * Often used to extract the file name from a fully qualified path.
 *
 * @param path the path to evaluate.
 * @param suffix optionally, an extension to remove from the result.
 * @throws {TypeError} if `path` is not a string or if `ext` is given and is not a string.
 */
export const basename = async path => await window
    .ipcRenderer
    .invoke('path-basename', path);

/**
 * Return the directory name of a path. Similar to the Unix dirname command.
 *
 * @param path the path to evaluate.
 * @throws {TypeError} if `path` is not a string.
 */
export const dirname = async path => await window
    .ipcRenderer
    .invoke('path-dirname', path);

/**
 * The right-most parameter is considered {to}. Other parameters are considered an array of {from}.
 *
 * Starting from leftmost {from} parameter, resolves {to} to an absolute path.
 *
 * If {to} isn't already absolute, {from} arguments are prepended in right to left order,
 * until an absolute path is found. If after using all {from} paths still no absolute path is found,
 * the current working directory is used as well. The resulting path is normalized,
 * and trailing slashes are removed unless the path gets resolved to the root directory.
 *
 * @param paths A sequence of paths or path segments.
 * @throws {TypeError} if any of the arguments is not a string.
 */
export const resolve = async (...paths) => await window
    .ipcRenderer
    .invoke('path-resolve', paths);

/**
 * Normalize a string path, reducing '..' and '.' parts.
 * When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
 *
 * @param path string path to normalize.
 * @throws {TypeError} if `path` is not a string.
 */
export const normalize = async path => await window
    .ipcRenderer
    .invoke('path-normalize', path);
