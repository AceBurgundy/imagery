import { print } from './handles.js';

class History {
  #currentIndex;

  constructor(initialPath) {
    this.currentPath = initialPath;
    this.#currentIndex = 0;
    this.visited = [this.currentPath];
  }

  hasPrevious = () => this.#currentIndex > 0;
  hasNext = () => this.visited[this.#currentIndex + 1] !== undefined;

  previous() {
    if (this.hasPrevious() === false) {
      return null;
    }

    this.#currentIndex -= 1;
    this.currentPath = this.visited[this.#currentIndex];
    return this.currentPath;
  }

  next() {
    if (this.hasNext() === false) {
      return null;
    }

    this.#currentIndex += 1;
    this.currentPath = this.visited[this.#currentIndex];
    return this.currentPath;
  }

  /**
   * Returns the full path to the next folder to be visited
   *
   * @param {string} path - The path to the next folder
   * @returns {string} the full path to the next folder
   */
  visit(path) {
    if (this.hasNext() === true) {
      if (path !== this.currentPath) {
        this.visited = this.visited.slice(0, this.#currentIndex + 1);
        this.visited.push(path);
        return this.next();
      }

      return this.next();
    }

    this.visited.push(path);
    return this.next();
  }
}

const history = new History('D:\\');

export default history;