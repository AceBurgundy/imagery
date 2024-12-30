import { Component, css } from '../../../../component.js';
import { getFolderMedia, pathJoin } from '../../utilities/frontend/handles.js';

/**
 * Represents a media viewer component that can display images and videos.
 */
export class MediaViewer extends Component {
  /**
   * Creates an instance of MediaViewer.
   * @param {string} folderPath - The path to the folder containing media files.
   * @param {string} initialMediaName - The initial media file to display.
   */
  constructor(folderPath, initialMediaName) {
    super();

    // Import styles for the media viewer
    css(import.meta, ["./styles/media-viewer.css"]);

    const id = Math.random().toString(36).substring(2, 10);

    /**
     * Scripts to manage the media viewer's functionality.
     * @returns {Promise<void>}
     */
    this.scripts = async () => {
      const dialog = document.getElementById(id);
      const videoElement = dialog.querySelector('video');
      const imageElement = dialog.querySelector('img');
      let currentIndex = 0;
      let keydownEnabled = true;

      /**
       * Array of media file names in the specified folder.
       * @type {string[]}
       */
      const fileNames = await getFolderMedia(folderPath);

      /**
       * Updates the displayed media element based on the file name.
       * @param {string} mediaName - The name of the media file to display.
       * @returns {Promise<void>}
       */
      async function updateMediaElement(mediaName) {
        const extension = mediaName.split('.').pop().toLowerCase();
        const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm'];
        const isVideo = videoExtensions.includes(extension);

        if (isVideo) {
          dialog.dataset.type = "video";
          videoElement.src = await pathJoin(folderPath, mediaName);
          videoElement.style.display = 'block';
          imageElement.style.display = 'none';
        } else {
          dialog.dataset.type = "image";
          imageElement.src = await pathJoin(folderPath, mediaName);
          imageElement.style.display = 'block';
          videoElement.style.display = 'none';
        }
      }

      // Manage keydown handling while video is playing or paused
      videoElement.addEventListener('play', () => {
        keydownEnabled = false;
      });

      videoElement.addEventListener('pause', () => {
        keydownEnabled = true;
      });

      videoElement.addEventListener('ended', () => {
        keydownEnabled = true;
      });

      // Set the initial media and index
      await updateMediaElement(initialMediaName);
      currentIndex = fileNames.findIndex(fileName => fileName === initialMediaName);

      /**
       * Handles keyboard events for media navigation and closing the viewer.
       * @param {KeyboardEvent} event - The keyboard event.
       */
      const handleKeyDown = (event) => {
        if (!keydownEnabled) return;

        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            dialog.classList.add("close-animate");

            setTimeout(() => {
              dialog.remove();
            }, 100);
            break;

          case 'ArrowLeft':
            if (currentIndex > 0) {
              currentIndex--;
              updateMediaElement(fileNames[currentIndex]);
            }
            break;

          case 'ArrowRight':
            if (currentIndex < fileNames.length - 1) {
              currentIndex++;
              updateMediaElement(fileNames[currentIndex]);
            }
            break;
        }
      };

      dialog.addEventListener('keydown', handleKeyDown);
      dialog.showModal();
    };

    /**
     * Template for the MediaViewer dialog.
     * @type {string}
     */
    this.template = /*html*/`
      <dialog id="${id}">
        <video controls style="display: none;"></video>
        <img style="display: none;" />
      </dialog>
    `;
  }
}
