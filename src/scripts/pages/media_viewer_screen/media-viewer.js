import { Component, css } from '../../../../component.js';
import { placeholderImage, print } from '../../utilities/frontend/handles.js';
import { extname } from '../../utilities/frontend/node-path.js';
import { Toast } from '../directory_screen/components/toast.js';

/**
 * Represents a media viewer component that can display images and videos.
 */
export class MediaViewer extends Component {

  /**
   * The path to the first media title and path to be shown
   * @type {{ title: String, path: String }}
   * @private
   */
  static #initialMedia = null;

  /**
   * A list of media media title and path
   * @type {{ title: String, path: String }}
   * @private
   */
  static #medias = null;

  /**
   * The index of the current media being played
   * @type {String[]}
   * @private
   */
  static #index = 0;

  /**
   * @type {boolean}
   * @private
   */
  static #isVideo = false;

  /**
   * @type {HTMLDivElement}
   * @private
   */
  static #viewer = document.getElementById("media-viewer");

  /**
   * @type {HTMLVideoElement}
   * @private
   */
  static #video = MediaViewer.#viewer.querySelector("video");

  /**
   * @type {HTMLDivElement}
   * @private
   */
  static #title = MediaViewer.#viewer.querySelector("#media-viewer-title");

  /**
   * @type {HTMLImageElement}
   * @private
   */
  static #image = MediaViewer.#viewer.querySelector("img");

  /**
   * @type {boolean}
   * @private
   */
  static #autoplay = true; // Controls whether the next video should autoplay

  /**
   * @type {boolean}
   * @private
   */
  static #paused = false;

  /**
   * Escape key constant.
   * @type {string}
   * @private
   */
  static #ESCAPE_KEY = "Escape";

  /**
   * Left arrow key constant.
   * @type {string}
   * @private
   */
  static #LEFT_KEY = "ArrowLeft";

  /**
   * Right arrow key constant.
   * @type {string}
   * @private
   */
  static #RIGHT_KEY = "ArrowRight";

  /**
   * Seek time constant.
   * @type {number}
   * @private
   */
  static #SEEK_TIME = 5;

  /**
   *
   * @param {HTMLDivElement} card
   * @param {[{ title: String, path: String }]} medias - The list of all media's titles
   */
  static async open(card, medias) {
    if (card.classList.contains("is-media") === false) throw new Error();
    window.ipcRenderer.invoke("on-fullscreen");
    MediaViewer.#video.disablePictureInPicture = false;

    MediaViewer.#medias = medias;

    MediaViewer.#initialMedia = {
      title: card.dataset.title,
      path: card.dataset.path
    };

    /** @type {string[]} */
    MediaViewer.#index = MediaViewer.#medias.findIndex(
      (media) => media.title === MediaViewer.#initialMedia.title
    );

    MediaViewer.#show();
    await MediaViewer.#updateViewer(MediaViewer.#initialMedia);
  }

  /**
   * Show the viewer.
   * @private
   */
  static #show() {
    document.getElementById("media-viewer").classList.remove("close-animate");
  }

  /**
   * Check if the viewer is hidden.
   * @returns {boolean} True if the viewer is hidden.
   */
  static hidden() {
    return document.getElementById("media-viewer").classList.contains("close-animate");
  }

  /**
   * Hide the viewer.
   * @private
   */
  static #hide() {
    document.getElementById("media-viewer").classList.add("close-animate");
  }

  /**
   * Evaluate video errors and return an appropriate message.
   * @param {OnErrorEventHandler} event - The video element error handler.
   * @returns {String|null} An appropriate error message.
   * @private
   */
  static #evaluateVideoError(event) {
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
   * @private
   */
  static async #updateViewer(media) {
    if (MediaViewer.hidden() === true) return;

    const extension = await extname(media.title);
    MediaViewer.#isVideo = MediaViewer.#isVideoFile(extension);

    MediaViewer.#updateTitle(media.title);
    MediaViewer.#updateViewerType(MediaViewer.#isVideo);

    if (MediaViewer.#isVideo) {
      MediaViewer.#setupVideo(media.path);
    } else {
      MediaViewer.#setupImage(media.path);
    }
  }

  /**
   * Check if the file is a video based on its extension.
   * @param {string} extension - File extension.
   * @returns {boolean} True if the file is a video.
   * @private
   */
  static #isVideoFile(extension) {
    return [
      ".mp4",
      ".mkv",
      ".avi",
      ".mov",
      ".flv",
      ".wmv",
      ".webm",
      ".ts",
    ].includes(extension);
  }

  /**
   * Show and hide the media title temporarily.
   * @param {string} titleText - The media title.
   * @private
   */
  static #updateTitle(titleText) {
    MediaViewer.#title.textContent = titleText;
    MediaViewer.#title.classList.remove("hide");
    setTimeout(() => MediaViewer.#title.classList.add("hide"), 2000);
  }

  /**
   * Update viewer dataset and toggle visibility of video/image elements.
   * @param {boolean} isVideo - Whether the media is a video.
   * @private
   */
  static #updateViewerType(isVideo) {
    MediaViewer.#viewer.dataset.type = isVideo ? "video" : "image";
    MediaViewer.#video.style.display = isVideo ? "block" : "none";
    MediaViewer.#image.style.display = isVideo ? "none" : "block";
  }

  /**
   * Configure video player settings.
   * @param {string} path - Video file path.
   * @private
   */
  static #setupVideo(path) {
    MediaViewer.#video.src = path;
    MediaViewer.#image.src = "";

    MediaViewer.#video.focus();
    MediaViewer.#video.onerror = (error) => MediaViewer.#handleVideoError(error);

    // Autoplay the video if the autoplay variable is true
    if (MediaViewer.#autoplay) {
      MediaViewer.#paused = false;

      MediaViewer.#video.play().catch((error) => {
        console.error("Autoplay failed:", error);
      });
    }
  }

  /**
   * Handle video loading errors.
   * @param {Event} error - Error event from the video element.
   * @private
   */
  static #handleVideoError(error) {
    const message = MediaViewer.#evaluateVideoError(error);
    if (message) Toast.broadcast(message);
  }

  /**
   * Configure image settings.
   * @param {string} path - Image file path.
   * @private
   */
  static #setupImage(path) {
    MediaViewer.#image.src = path;
    MediaViewer.#video.src = "";

    MediaViewer.#image.onerror = async () => {
      MediaViewer.#image.src = await placeholderImage();
    };
  }

  constructor() {
    super();

    css(import.meta, ["./styles/media-viewer.css"]);

    this.scripts = async () => {

      MediaViewer.#video.onenterpictureinpicture = (_) => {
        MediaViewer.#hide();
      };

      MediaViewer.#video.onleavepictureinpicture = (_) => {
        MediaViewer.#show();
      };

      document.onfullscreenchange = (event) => {
        if (document.fullscreenElement == null) {
          window.ipcRenderer.invoke("off-fullscreen");
        }
      };

      let timeout;

      window.addEventListener("mousemove", (event) => {
        if (MediaViewer.hidden() === true) return;

        clearTimeout(timeout);
        MediaViewer.#title.classList.remove("hide");

        timeout = setTimeout(() => MediaViewer.#title.classList.add("hide"), 2000);
      });

      let fired = false;

      window.addEventListener("keyup", (_) => (fired = false));

      MediaViewer.#video.addEventListener("keydown", (event) => {
        if (event.key === " ") {
          // No need to call video.play() or video.pause()
          // as video already handles it for us.
          // We only need to manage the next autoplay
          //
          // video.paused means that "if video was previously paused"
          MediaViewer.#paused = MediaViewer.#video.paused ? false : true;
          MediaViewer.#autoplay = MediaViewer.#video.paused ? true : false;
        }

        const eitherNavigation = event.key === MediaViewer.#LEFT_KEY || event.key === MediaViewer.#RIGHT_KEY;

        // Other events below must require the control key being held
        if (event.ctrlKey && eitherNavigation === true) {
          // Pause the current video
          MediaViewer.#video.pause();

          // Reset autoplay to true when navigating to the next/previous video
          if (!MediaViewer.#paused) MediaViewer.#autoplay = true;

          const index = MediaViewer.#index;
          const medias = MediaViewer.#medias;

          // Previous video
          if (event.key === MediaViewer.#LEFT_KEY) {
            index = (index - 1 + medias.length) % medias.length;
            MediaViewer.#updateViewer(medias[index]);
          }

          // Next video
          else if (event.key === MediaViewer.#RIGHT_KEY) {
            index = (index + 1) % medias.length;
            MediaViewer.#updateViewer(medias[index]);
          }
        }
      });

      window.addEventListener("keydown", (event) => {
        if (event.repeat) return;

        if (!fired) {
          fired = true;

          // Since there is now multiple keydown events delegation,
          // we have to make sure all code here will not work if viewer
          // does is hidden
          if (MediaViewer.hidden() === true) return;

          if (event.key === MediaViewer.#ESCAPE_KEY) {
            window.ipcRenderer.invoke("off-fullscreen");

            setTimeout(() => MediaViewer.#hide(), 200);
            return;
          }

          const index = MediaViewer.#index;
          const medias = MediaViewer.#medias;

          if (!MediaViewer.#isVideo) {
            // For image navigation
            if (event.key === MediaViewer.#LEFT_KEY) {
              index = (index - 1 + medias.length) % medias.length;
              MediaViewer.#updateViewer(medias[index]);
            }

            else if (event.key === MediaViewer.#RIGHT_KEY) {
              index = (index + 1) % medias.length;
              MediaViewer.#updateViewer(medias[index]);
            }

            return;
          }
        }
      });
    };

    this.template = /*html*/ `
      <div id="media-viewer" open>
        <video controls class="close-animate" style="display: none;"></video>
        <img style="display: none;" />
        <p id="media-viewer-title" class="hide"></p>
      </div>
    `;
  }
}