const history = {};

/**
 * Allows navigation by using browser < and > buttons by keeping track of the "/path": Component
 */
window.onpopstate = () => {
  const path = window.location.pathname;
  const page = history[path];

  if (page) {
    document.body.innerHTML = new page();
  }
}

export class Redirect {
  /**
   * Constructs a Redirect component that navigates to the specified path and component.
   * @param {Object} options - The options for constructing the Redirect component.
   * @param {String} options.id - The ID for the component.
   * @param {Component} options.destination - The component to render.
   * @param {string} options.path - The new path to set in the URL.
   * @param {object} options.attributes - Additional attributes for the anchor tag.
   * @param {string} [options.innerHTML=""] - The innerHTML to display for the anchor tag.
   */
  constructor({ id, destination, path, attributes = {}, innerHTML = "" } = {}) {
    const extendsComponent = value => Object.create(value.prototype) instanceof Component;
    const containsNoneStringData = value => value.some(type => type !== 'string');

    /**
     * @param {Function|Object} value
     * @returns {boolean}
     */
    function isFunction(value) {
      const propertyNames = Object.getOwnPropertyNames(value);
      return !propertyNames.includes('prototype') || propertyNames.includes('arguments');
    }

    const attributeValueTypes = Object.values(attributes).map(attribute => typeof attribute);
    const attributeKeyTypes = Object.keys(attributes).map(attribute => typeof attribute);

    if (!id) {
      throw new Error("Element ID cannot be null");
    }

    if (!destination) {
      throw new Error("Element destination cannot be null");
    }

    if ("id" in attributes) {
      throw new Error("Cannot add 'id' as an attribute, as a separate parameter already asked for it");
    }

    if ("href" in attributes) {
      throw new Error("Cannot add 'href' as an attribute, as the destination parameter already asked for it");
    }

    if (typeof id !== 'string') {
      throw new Error("Element ID must be of type string");
    }

    if (typeof path !== 'string') {
      throw new Error("Path must be of type string");
    }

    if (containsNoneStringData(attributeValueTypes)) {
      throw new Error("Attributes can only have non-callable data as values");
    }

    if (containsNoneStringData(attributeKeyTypes)) {
      throw new Error("Attributes can only have non-callable data as keys");
    }

    if (isFunction(destination)) {
      throw new Error("Redirect's destination parameter only accepts class references");
    }

    if (!extendsComponent(destination)) {
      throw new Error("Redirect's destination parameter only accepts class references extended from Component");
    }

    const cleanAttributes = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    /**
     * Returns an anchor tag with a click handler to simulate navigation.
     * @returns {string} The anchor tag HTML.
     */
    const render = () => {
      const uniqueAnchorId = `${id}-${uniqueId()}`;

      // Add the anchor tag with a click event to prevent default behavior
      setTimeout(() => {
        const anchor = document.getElementById(uniqueAnchorId);

        if (anchor) {
          anchor.onclick = event => {
            event.preventDefault();
            window.history.pushState({}, '', path); // Update the URL
            history[path] = destination; // add path and destination to history

            // Replace the body content with the new component
            document.body.innerHTML = new destination();
          };
        }
      }, 0);

      // Return anchor tag with unique ID
      return `<a href="${path}" id="${uniqueAnchorId}" ${cleanAttributes}>${innerHTML}</a>`;
    };

    this.toString = () => render();
  }
}

export class Root {
  /**
   * Constructs a Root component for the specified destination and path.
   * @param {Object} options - The options for constructing the Root component.
   * @param {Component} options.destination - The component to render.
   * @param {string} [options.path='/'] - The path to set in the URL.
   */
  constructor({ destination, path = '/' } = {}) {
    const extendsComponent = value => Object.create(value.prototype) instanceof Component;

    /**
     * Checks if a value is a function.
     * @param {Function|Object} value - The value to check.
     * @returns {boolean}
     */
    function isFunction(value) {
      const propertyNames = Object.getOwnPropertyNames(value);
      return !propertyNames.includes('prototype') || propertyNames.includes('arguments');
    }

    if (!destination) {
      throw new Error("Element destination cannot be null");
    }

    if (typeof path !== 'string') {
      throw new Error("Path must be of type string");
    }

    if (isFunction(destination)) {
      throw new Error("Root's destination parameter only accepts class references");
    }

    if (!extendsComponent(destination)) {
      throw new Error("Root's destination parameter only accepts class references extended from Component");
    }

    this.render = () => {
      window.history.pushState({}, '', path); // Update the URL
      history[path] = destination; // add path and destination to history
      document.body.innerHTML = new destination();
    };
  }
}

/**
 * Returns the full path from the template file to where a function was called;
 * @param {'import.meta'} importMeta - the import.meta of a function. Simply pass `import.meta`
 * @throws {Error} if importMeta is null
 * @return {string} the full path
 */
export const getFullPath = (importMeta) => {
  if (!importMeta) {
    throw new Error(
      "Missing import.meta. Simply pass `import.meta` as the argument"
    );
  }

  const scriptSrc = new URL(importMeta.url).pathname;
  return scriptSrc.startsWith("/") ? scriptSrc.slice(1) : scriptSrc;
};

const uniqueId = () => Math.random().toString(36).substring(2, 10);

/**
 * Load CSS files based on the provided paths.
 * @param {string[]} cssPaths - List of CSS paths to be loaded.
 **/
export const css = (importMeta, cssPaths) =>
  cssPaths.forEach(cssPath => {
    let pathToScript = getFullPath(importMeta);
    const scriptFileName = pathToScript.split("/").pop();
    pathToScript = pathToScript.replace(scriptFileName, "");

    cssPath = cssPath.startsWith("/")
      ? pathToScript + cssPath
      : pathToScript + "/" + cssPath.replace(/^\.\/?/, "");

    const cssAlreadyLinked = document.querySelector(`link[href='${cssPath}']`);

    if (cssAlreadyLinked) {
      console.warn(`CSS file already exists for path: ${cssPath}`);
      return;
    }

    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = cssPath;

    document.head.appendChild(styleLink);
});

// Using ES2022 features for private fields
export class Component {
  #states = {};
  #stateElements = {};

  constructor() {
    this.template = ""; // Public field (set only)
    this.scripts = null; // Public field (set only)

    /**
     * Helper function to validate the template and scripts.
     */
    const validate = () => {
      if (typeof this.template !== "string") {
        throw new Error("Template must be a string");
      }

      if (!this.template) {
        throw new Error("Template is required for a component");
      }

      if (this.scripts && typeof this.scripts !== "function") {
        throw new Error("Scripts must be a function");
      }
    };

    /**
     * Function to manage state and return a state value with a setter.
     * @param {any} initialValue - Initial state value.
     * @param {string} elementId - The unique element ID for the element tied to this state.
     * @returns {[any, function]} Current state and a setter function to update the state.
     */
    this.state = (initialValue, elementId) => {
      let uniqueElementId = `${elementId}-${uniqueId()}`;

      // Ensure unique element ID for states
      while (Object.hasOwn(this.#states, uniqueElementId)) {
        uniqueElementId = `${elementId}-${uniqueId()}`;
      }

      let value = initialValue;

      // Setter function to update the value and DOM
      const setValue = newValue => {
        value = newValue;

        /**
         * @type {HTMLElement}
         */
        const element = this.#stateElements[uniqueElementId];

        if (!element) {
          return;
        }

        element.textContent = value;
      };

      // Save the initial value and element uniqueElementId in the private states
      this.#states[uniqueElementId] = value;

      // To be used later to track elements associated with the state
      return [uniqueElementId, value, setValue];
    };

    /**
     * Called after rendering to bind elements to states.
     */
    const bindStateElements = () => {
      Object.keys(this.#states).forEach(uniqueElementId => {
        this.#stateElements[uniqueElementId] = document.getElementById(uniqueElementId);

        if (!this.#stateElements[uniqueElementId]) {
          console.warn(`No element found with unique element id: ${uniqueElementId}`);
        }
      });
    };

    /**
     * Render the template and bind event listeners.
     */
    const render = () => {
      validate();

      // Append the root element to the DOM
      setTimeout(() => {
        bindStateElements(); // Bind state elements after rendering
        if (this.scripts) this.scripts(); // Execute scripts (event listeners etc.)
      }, 0);

      return this.template; // Return the rendered template
    };

    this.toString = () => render();
  }
}