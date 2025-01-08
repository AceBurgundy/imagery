class Cache {
  #cache = new Map();

  /**
   * Retrieve a cached value.
   * @param {string} key - The cache key.
   * @returns {any|null} The cached value, or null if not found.
   */
  get(key) {
    return this.#cache.get(key) || null;
  }

  /**
   * Add or update a cache entry.
   * @param {string} key - The cache key.
   * @param {any} value - The value to cache.
   */
  set(key, value) {
    this.#cache.set(key, value);
    this.export();
  }

  /**
   * Remove a cache entry.
   * @param {string} key - The cache key.
   */
  remove(key) {
    this.#cache.delete(key);
  }

  /**
   * Export the cache to a JSON string for persistence via Node.js function.
   */
  async export() {
    const cacheData = JSON.stringify([...this.#cache.entries()]);
    window.ipcRenderer.invoke('cache-export', cacheData);
  }

  /**
   * Load cache data from a JSON string using a Node.js function.
   * @returns {Promise<void>}
   */
  async load() {
    const data = await window.ipcRenderer.invoke('cache-load');

    if (data) {
      this.#cache = new Map(JSON.parse(data));
    }
  }

  /**
   * Clears cache data.
   * @returns {Promise<void>}
   */
  async clear() {
    await window.ipcRenderer.invoke('cache-clear');
    this.#cache = new Map();
  }
}

/**
 * @type {Cache}
 */
const cache = new Cache();

// Export cache as default
export default cache;