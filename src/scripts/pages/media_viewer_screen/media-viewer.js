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
       * Update and display the media player.
       * @param {{ title: string, path: string }} media - The media to be displayed.
       */
      async function updateViewer(media) {
        if (!exist()) return;

        const extension = await extname(media.title);
        isVideo = isVideoFile(extension);

        updateTitle(media.title);
        updateViewerType(isVideo);

        if (isVideo) {
            setupVideo(media.path);
        } else {
            setupImage(media.path);
        }
      }

      /**
      * Check if the file is a video based on its extension.
      * @param {string} extension - File extension.
      * @returns {boolean} - True if the file is a video.
      */
      function isVideoFile(extension) {
        return ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.ts'].includes(extension);
      }

      /**
      * Show and hide the media title temporarily.
      * @param {string} titleText - The media title.
      */
      function updateTitle(titleText) {
        title.textContent = titleText;
        title.classList.remove("hide");
        setTimeout(() => title.classList.add("hide"), 2000);
      }

      /**
      * Update viewer dataset and toggle visibility of video/image elements.
      * @param {boolean} isVideo - Whether the media is a video.
      */
      function updateViewerType(isVideo) {
        viewer.dataset.type = isVideo ? "video" : "image";
        video.style.display = isVideo ? "block" : "none";
        image.style.display = isVideo ? "none" : "block";
      }

      /**
      * Configure video player settings.
      * @param {string} path - Video file path.
      */
      function setupVideo(path) {
        video.src = path;
        image.src = "";

        video.focus();
        video.onerror = error => handleVideoError(error);
      }

      /**
      * Handle video loading errors.
      * @param {Event} error - Error event from the video element.
      */
      function handleVideoError(error) {
        const message = evaluateVideoError(error);
        if (message) Toast.broadcast(message);
      }

      /**
      * Configure image settings.
      * @param {string} path - Image file path.
      */
      function setupImage(path) {
        image.src = path;
        video.src = "";

        image.onerror = async () => {
          image.src = await placeholderImage();
        };
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

      video.onpause = () => video.autoplay = false;

      window.addEventListener("mousemove", event => {
        if (exist() === false) return;

        clearTimeout(timeout);
        title.classList.remove('hide');

        timeout = setTimeout(() =>
          title.classList.add('hide')
        , 2000);
      });

      let fired = false;

      window.addEventListener("keyup", _ => fired = false);

      window.addEventListener("keydown", event => {
        if (event.repeat) return;

        if (!fired) {
          fired = true;

          // Since there is now multiple keydown events delegation,
          // we have to make sure all code here will not work if viewer
          // does not exist
          if (exist() === false) return;

          if (event.key === ESCAPE_KEY) {
            window.ipcRenderer.invoke('off-fullscreen');

            setTimeout(() => hide(), 200);
            setTimeout(() => viewer.remove(), 300);
            return;
          }

          if (!isVideo) {
            // For image navigation
            if (event.key === LEFT_KEY) {
              index = (index - 1 + medias.length) % medias.length;
              updateViewer(medias[index]);
            }

            else if (event.key === RIGHT_KEY) {
              index = (index + 1) % medias.length;
              updateViewer(medias[index]);
            }

            return;
          }

          // Other events below must require the control key being held
          if (event.ctrlKey && (event.key === LEFT_KEY || event.key === RIGHT_KEY) === true) {
            print("down")
            // Previous video
            if (event.key === LEFT_KEY) {
              // pause current video
              video.pause();

              // will autoplay next video
              video.autoplay = true;
              index = (index - 1 + medias.length) % medias.length;
              updateViewer(medias[index]);
            }

            // Next video
            else if (event.key === RIGHT_KEY) {
              print("right")
              video.pause();
              video.autoplay = true;

              index = (index + 1) % medias.length;
              updateViewer(medias[index]);
            }
          }
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
        <video autoplay controls style="display: none;"></video>
        <img style="display: none;" />
        <p id="media-viewer-title" class="hide"></p>
      </div>
    `;
  }
}
