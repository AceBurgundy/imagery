import { Component, css } from '../../../../../component.js';
import { pathJoin } from '../../frontend/handles.js';

/**
 * Represents a media viewer component that can display images and videos.
 */
export class MediaViewer extends Component {

  /**
   *
   * @param {HTMLDivElement} card
   */
  static open(card) {
    if (card.classList.contains('is-media') === false) throw new Error()

    document.body.insertAdjacentHTML(
      'beforeend',
      new MediaViewer(box.dataset.path, card.dataset.title)
    );
  }

  /**
   * Creates an instance of MediaViewer.
   * @param {string} folderPath - The path to the folder containing media files.
   * @param {string} initialMediaName - The initial media file to display.
   */
  constructor(folderPath, initialMediaName) {
    super();

    css(import.meta, ["./styles/media-viewer.css"]);

    const id = Math.random().toString(36).substring(2, 10);

    this.scripts = async () => {
      const dialog = document.getElementById(id);
      const videoElement = dialog.querySelector('video');
      const imageElement = dialog.querySelector('img');
      let currentIndex = 0;
      let keydownEnabled = true;

      const fileNames = await window.ipcRenderer.invoke('directory-media', folderPath);

      async function updateMediaElement(mediaName) {
        const extension = mediaName.split('.').pop().toLowerCase();
        const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm', 'ts'];
        const isVideo = videoExtensions.includes(extension);

        if (isVideo) {
          dialog.dataset.type = "video";
          videoElement.src = await pathJoin(folderPath, mediaName);
          videoElement.style.display = 'block';
          imageElement.style.display = 'none';
          window.ipcRenderer.invoke('off-fullscreen');
        } else {
          dialog.dataset.type = "image";
          imageElement.src = await pathJoin(folderPath, mediaName);
          imageElement.style.display = 'block';
          videoElement.style.display = 'none';
          window.ipcRenderer.invoke('on-fullscreen');
        }
      }

      videoElement.addEventListener('play', () => {
        keydownEnabled = false;
      });

      videoElement.addEventListener('pause', () => {
        keydownEnabled = true;
      });

      videoElement.addEventListener('ended', () => {
        keydownEnabled = true;
      });

      await updateMediaElement(initialMediaName);
      currentIndex = fileNames.findIndex(fileName => fileName === initialMediaName);

      dialog.onkeydown = event => {
        if (!keydownEnabled) return;

        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            dialog.classList.add("close-animate");

            setTimeout(() => {
              dialog.remove();
              window.ipcRenderer.invoke('off-fullscreen');
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

      dialog.showModal();
    };

    this.template = /*html*/`
      <dialog id="${id}">
        <video controls style="display: none;"></video>
        <img style="display: none;" />
      </dialog>
    `;
  }
}
