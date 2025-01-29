import { Component, css } from '../../../../component.js';
import { placeholderImage, print } from '../../utilities/frontend/handles.js';
import { extname } from '../../utilities/frontend/node-path.js';
import { Toast } from '../directory_screen/components/toast.js';

/**
 * Represents a media viewer component that can display images and videos.
 */
export class MediaViewer extends Component {

  /**
   *
   * @param {HTMLDivElement} card
   * @param {[{ title: String, path: String }]} medias - The list of all media's titles
   */
  static async open(card, medias) {
    if (card.classList.contains('is-media') === false) throw new Error();

    document.body.insertAdjacentHTML(
      'beforeend',
      new MediaViewer({
        title: card.dataset.title,
        path: card.dataset.path
      }, medias)
    );
  }

  static hiddenOrNone() {
    const viewer = document.getElementById("media-viewer");

    if (viewer === null) return true;
    return viewer.classList.contains("close-animate") === true;
  }

  /**
   * Creates an instance of MediaViewer.
   * @param {{ title: String, path: String }} firstMedia - The initial media file to display.
   * @param {[{ title: String, path: String }]} medias - The list of all availble media titles to show.
   */
  constructor(firstMedia, medias) {
    super();

    css(import.meta, ["./styles/media-viewer.css"]);

    this.scripts = async () => {

      /**
       * @type {boolean}
       */
      let isPlaying = false;

      /**
       * @type {boolean}
       */
      let isVideo = false;

      /**
       * @type {HTMLDivElement}
       */
      const viewer = document.getElementById("media-viewer");

      /**
       * @type {HTMLVideoElement}
       */
      const video = viewer.querySelector('video');

      /**
       * @type {HTMLDivElement}
       */
      const title = viewer.querySelector('#media-viewer-title');

      /**
       * @type {HTMLImageElement}
       */
      const image = viewer.querySelector('img');

      const ESCAPE_KEY = 'Escape';
      const LEFT_KEY = 'ArrowLeft';
      const RIGHT_KEY = 'ArrowRight';
      const SEEK_TIME = 5;

      // If this is the first time the modal has opened
      let startup = true;

      viewer.focus();
      window.ipcRenderer.invoke("on-fullscreen");
      video.disablePictureInPicture = false;

      /**
       * Since there is now multiple keydown events delegation,
       * we have to make sure all code here will not work
       * if viewer does not exist
       *
       * @returns {boolean} if viewer exist and is shown
       */
      const exist = () => document.getElementById("media-viewer") !== null

      /**
       * @param {OnErrorEventHandler} event - The video element error handler
       * @returns {String|null} an appropriate message depending for an error
       */
      function evaluateVideoError(event) {
        const error = event.target.error;

        if (event.target.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          return "Video not found, unsupported or cannot be read";
        }

        if (!error) {
          return;
        }

        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            break;

          case MediaError.MEDIA_ERR_NETWORK:
            return "A network error occurred while fetching the media.";

          case MediaError.MEDIA_ERR_DECODE:
            return "An error occurred while decoding the media.";

          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            return "The media format is not supported.";

          default:
            return "An unknown media error occurred.";
        }
      }

      /**
       * Update and show the player for the media to be displayed
       * @param {{ title: String, path: String }} media - The media to be shown
       */
      async function updateViewer(media) {
        if (exist() === false) return;

        // checks if the file to open is a video
        isVideo = [
          '.mp4', '.mkv', '.avi',
          '.mov', '.flv', '.wmv',
          '.webm', '.ts'
        ].includes(
          await extname(media.title)
        );

        // Show and hide title for a brief moment
        title.textContent = media.title;
        title.classList.remove("hide");

        setTimeout(() => {
          title.classList.add("hide");
        }, 2000);

        viewer.dataset.type = isVideo ? "video" : "image";

        if (isVideo) {
          video.src = media.path;
          image.src = '';

          // Auto play video that was clicked
          if (startup) {
            video.play();
            startup = false;
          }

          print(`is playing: ${isPlaying}`)
          if (isPlaying) video.play();

          video.onerror = error => {
            const message = evaluateVideoError(error);
            if (message) Toast.broadcast(message);
          };

        } else {
          image.src = media.path;
          video.src = '';

          image.onerror = async () => image.src = await placeholderImage();
        }

        video.style.display = isVideo ? 'block' : 'none';
        image.style.display = isVideo ? 'none' : 'block';
        return;
      }

      video.onenterpictureinpicture = _ => {
        hide();
      }

      video.onleavepictureinpicture = _ => {
        show();
      }

      document.onfullscreenchange = event => {
        if (document.fullscreenElement == null) {
          window.ipcRenderer.invoke('off-fullscreen');
        }
      }

      /** @type {string[]} */
      let index = medias.findIndex(media => media.title === firstMedia.title);

      await updateViewer(firstMedia);
      let timeout;

      video.onpause = () => isPlaying = false;

      window.addEventListener("mousemove", event => {
        if (exist() === false) return;

        clearTimeout(timeout);
        title.classList.remove('hide');

        timeout = setTimeout(() =>
          title.classList.add('hide')
        , 2000);
      });

      window.addEventListener("keydown", event => {
        if (event.repeat) return;

        // Since there is now multiple keydown events delegation,
        // we have to make sure all code here will not work if viewer
        // does not exist
        if (exist() === false) return;

        if (event.key === ESCAPE_KEY) {
          window.ipcRenderer.invoke('off-fullscreen');

          setTimeout(() => hide(), 100);
          setTimeout(() => viewer.remove(), 200);
          return;
        }

        if (isVideo && !isPlaying && event.key === ' ') {
          video.play();
          isPlaying = true;
          return;
        }

        // Change video seeking to shift, then arrow keys
        if (isVideo && isPlaying) {

          if (event.key === ' ') {
            isPlaying = false;
            video.pause();
            return;
          }

          if (event.shiftKey) {
            if (event.key === LEFT_KEY) {
              video.currentTime = Math.max(0, video.currentTime - SEEK_TIME);
              return;
            }

            if (event.key === RIGHT_KEY) {
              video.currentTime = Math.min(video.duration, video.currentTime + SEEK_TIME);
              return;
            }
          }
        }

        if (event.key === LEFT_KEY) {
          if (isVideo) {
            // pause current video
            video.pause();

            // will autoplay next video
            isPlaying = true;
          }

          index = (index - 1 + medias.length) % medias.length;
          updateViewer(medias[index]);
        }

        else if (event.key === RIGHT_KEY) {
          if (isVideo) {
            video.pause();

            isPlaying = true;
          }

          index = (index + 1) % medias.length;
          updateViewer(medias[index]);
        }

      });

      /**
       * show viewer
       */
      function show() {
        viewer.classList.remove("close-animate");
      }

      /**
       * hide viewer
       */
      function hide() {
        viewer.classList.add("close-animate");
      }
    };

    this.template = /*html*/`
      <div id="media-viewer" open>
        <video controls style="display: none;"></video>
        <img style="display: none;" />
        <p id="media-viewer-title" class="hide"></p>
      </div>
    `;
  }
}
