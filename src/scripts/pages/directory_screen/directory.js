import { DirectoryManager } from './classes/directory_manager.js';
import { KeyboardManager } from './classes/keyboard_manager.js';
import { MouseWheelManager } from './classes/wheel_manager.js';
import { TouchManager } from './classes/touch_manager.js';
import { ClickManager } from './classes/click_manager.js';
import { Navigator } from './classes/navigator.js';

import history from '../../utilities/frontend/history.js';
import { Component, css } from '../../../../component.js';
import { Toast } from './components/toast.js';
import { MediaViewer } from '../media_viewer_screen/media-viewer.js';

/**
 * DirectoryScreen Component
 * Manages the UI and functionality for displaying the contents of a directory.
 */
export class DirectoryScreen extends Component {
  constructor() {
    super();

    // Load styles
    css(import.meta, [
      './styles/directory-contents.css',
      './styles/directory-cell.css'
    ]);

    /** Initialize scripts */
    this.scripts = async () => {
      const box = document.getElementById('directory-contents');

      const manager = new DirectoryManager(box);
      const navigator = new Navigator(manager, box);

      const keyboard = new KeyboardManager();
      const click = new ClickManager();
      const wheel = new MouseWheelManager();
      const touchpad = new TouchManager();

      window.addEventListener('resize', async () =>
        manager.updateBox(box)
      );

      window.addEventListener('click', event =>
        click.control(event, navigator, manager)
      );

      window.addEventListener('wheel', event => {
        wheel.control(event, manager);
      }, { passive: true });

      window.addEventListener('keydown', event =>
        keyboard.control(event, box, navigator)
      );

      window.addEventListener('touchmove', event =>
        touchpad.control(event, manager)
      );

      manager.open(history.currentPath);
    };

    // Set HTML template
    this.template = /* html */`
      ${ new Toast() }
      <p id='directory-name'></p>
      <div id='directory-contents'></div>
      ${ new MediaViewer() }
    `;
  }
}
