import { KeyboardEventManager } from '../../utilities/frontend/event-manager.js';
import { createFolderCells, getThumbnail, print } from '../../utilities/frontend/handles.js';
import { MediaViewer } from '../media_viewer_screen/media-viewer.js';
import cache from '../../utilities/frontend/cache.js';
import { pathJoin } from '../../utilities/frontend/handles.js';
import history from '../../utilities/frontend/history.js';
import { Component, css } from '../../../../component.js';
import { Toast } from "./components/toast.js";

/**
 * DirectoryScreen Component
 * Manages the UI and functionality for displaying the contents of a directory.
 */
export class DirectoryScreen extends Component {
  constructor() {
    super();

    // Load styles
    css(import.meta, [
      "./styles/directory-contents.css",
      "./styles/directory-cell.css"
    ]);

    /** Initialize scripts */
    this.scripts = async () => {

      let currentAbortController = null;

      const contentBox = document.getElementById("directory-contents");
      const keyboardEventManager = new KeyboardEventManager();
      await cache.load();

      // Register keyboard navigation events
      keyboardEventManager.registerEvent(window, 'keydown', async event => {
        switch (true) {
          case event.altKey && event.key === 'ArrowLeft':
            const previousDirectory = history.previous();

            if (!previousDirectory) {
              Toast.broadcast("You're currently at the first folder");
              break;
            }

            loadContents(previousDirectory);
            break;

          case event.altKey && event.key === 'ArrowRight':
            const nextDirectory = history.next();

            if (!nextDirectory) {
              Toast.broadcast("You have no other visited folders");
              break;
            }

            loadContents(nextDirectory);
            break;

          default:
            break;
        }
      });

      // Handle click events on content box
      contentBox.onclick = async event => {
        /** @type {HTMLElement|null} */
        const mediaBox = event.target.closest('.directory-cell');
        const isMedia = mediaBox?.classList.contains('is-media');

        if (isMedia) {
          const fileName = mediaBox.dataset.filename;

          if (!fileName) {
            print("Cannot open media viewer. File name or root path is missing");
            Toast.broadcast("Cannot open media viewer");
            return;
          }

          document.body.insertAdjacentHTML(
            'beforeend',
            new MediaViewer(contentBox.dataset.path, fileName)
          );
          return;
        }

        // is-folder
        if (!mediaBox.dataset.path) {
          print("Cannot open next folder. Directory or root path is missing");
          Toast.broadcast("Cannot open next folder");
          return;
        }

        loadContents(
          history.visit(mediaBox.dataset.path)
        );
      };

      /**
       * Load the contents of a directory and display them.
       *
       * @how
       * - `Step 1`: Checks if the path already has cached data in cache then loads it
       * - `Step 2`: If none, divides the directory contents array into 10 groups
       * - `Step 3`: Promise.all() are created to concurrently load thumbnails for each group
       * - `Step 4`: for each batch process that completes, will automatically be displayed on the screen
       * - `Step 5`: for each batch process that completes, the innerHTML will be cached
       *
       * @param {string} path - Path to the directory.
       */
      function loadContents(path) {
        setTimeout(async () => {
          if (currentAbortController) {
            currentAbortController.abort(); // Cancel ongoing operation
          }

          const controller = new AbortController();
          const signal = controller.signal;
          currentAbortController = controller;

          try {
            contentBox.innerHTML = '';
            contentBox.dataset.path = path;

            const cachedContent = cache.get(path);
            if (cachedContent) {
              contentBox.innerHTML = cachedContent;
              Toast.broadcast("Loading from cache");
              return;
            }

            const contents = await createFolderCells(path, true);
            if (signal.aborted) return; // Skip on this part if another loadContent has been called
            contentBox.innerHTML = contents;

            await loadThumbnails(); // Skip if aborted
            cache.set(path, contentBox.innerHTML);
            Toast.broadcast("Loading finished");
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Error loading contents:', error);
            }
          }
        }, 0);
      }

      async function loadThumbnails() {
        const videoThumbnailed = [...contentBox.querySelectorAll('.directory-cell[data-thumbnail-type="video"]')];

        const chunkSize = 15; // Adjust based on system/network capacity
        for (let index = 0; index < videoThumbnailed.length; index += chunkSize) {
          const chunk = videoThumbnailed.slice(index, index + chunkSize);

          const chunkPromises = chunk.map(async cell => {
            const isMediaCell = cell.classList.contains("is-media");
            const thumbnailPath = isMediaCell
              ? cell.getAttribute('data-path')
              : cell.getAttribute('data-video-thumbnail');

            if (thumbnailPath.trim() !== '') {
              try {
                const thumbnail = await getThumbnail(thumbnailPath);
                cell.querySelector('.directory-cell__image').src = thumbnail;
              } catch (error) {
                print('Error fetching thumbnail:', error);
              }
            }

            return Promise.resolve();
          });

          // Wait for the current chunk to complete
          await Promise.all(chunkPromises);
        }
      }

      // Load initial contents on window load
      loadContents(history.currentPath)
    };

    // Set HTML template
    this.template = /*html*/`
      ${ new Toast() }
      <div id="directory-contents"></div>
    `;
  }
}
