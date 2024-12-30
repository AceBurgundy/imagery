import { Component } from '../../../../../component.js';

export class Toast extends Component {

  constructor() {
    super();

    this.template = /*html*/`
      <div id="${"toasts"}"></div>
    `;
  }

  /**
   * Shows a toast message on the screen
   * @param {string} message - A string message
   * @return {void}
  */
  static broadcast(message, duration) {
    const toasts = document.getElementById("toasts");

    if (!toasts) {
      throw new Error(`Missing toast container element`)
    }

    if (!message) {
      throw new Error(`Cannot call toast without a message`);
    }

    if (duration && typeof duration !== number) {
      throw new Error("Duration for a toast must be a number");
    }

    if (typeof message !== 'string') {
      throw new Error(`Cannot call toast on non-string message`);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    toasts.appendChild(toast);
    setTimeout(() => toast.remove(), duration ?? 4000);
  }
}