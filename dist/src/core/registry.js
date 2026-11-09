/**
 * @file Stores contributions and manages deterministic disposal of registered resources.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Creates a disposable resource.
 * @param {Function} cleanup Cleanup callback.
 * @returns {{dispose: Function}} Disposable resource.
 */
export function disposable(cleanup) {
  let disposed = false;
  return {
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      cleanup();
    },
  };
}

/**
 * Stores uniquely identified contributions and notifies the workbench on changes.
 */
export class Registry {
  /**
   * @param {Function} onChange Callback invoked after a change.
   */
  constructor(onChange = () => {}) {
    this.items = new Map();
    this.onChange = onChange;
  }

  /**
   * Registers a contribution.
   * @param {string} id Stable unique identifier.
   * @param {*} value Contribution value.
   * @returns {{dispose: Function}} Disposable registration.
   */
  register(id, value) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('Contribution identifiers must be non-empty strings.');
    }
    if (this.items.has(id)) {
      throw new Error(`Contribution "${id}" is already registered.`);
    }
    this.items.set(id, value);
    this.onChange();
    return disposable(() => {
      if (this.items.get(id) === value) {
        this.remove(id);
      }
    });
  }

  /**
   * Removes a contribution by identifier.
   * @param {string} id Contribution identifier.
   * @returns {boolean} Whether a contribution was removed.
   */
  remove(id) {
    if (!this.items.has(id)) {
      return false;
    }
    this.items.delete(id);
    this.onChange();
    return true;
  }

  /**
   * Retrieves a contribution by identifier.
   * @param {string} id Contribution identifier.
   * @returns {*} Contribution or undefined.
   */
  get(id) {
    return this.items.get(id);
  }

  /**
   * Returns registered contributions in insertion order.
   * @returns {Array<[string, *]>} Contribution entries.
   */
  entries() {
    return [...this.items.entries()];
  }
}

/**
 * Tracks resources and disposes them in reverse registration order.
 */
export class DisposableStore {
  /**
   * Creates an empty resource store.
   */
  constructor() {
    this.resources = [];
    this.disposed = false;
  }

  /**
   * Adds a disposable resource to the store.
   * @param {{dispose: Function}} resource Disposable resource.
   * @returns {*} The same resource.
   */
  add(resource) {
    if (!resource || typeof resource.dispose !== 'function') {
      throw new TypeError('Resources must implement dispose().');
    }
    if (this.disposed) {
      resource.dispose();
    }
    else {
      this.resources.push(resource);
    }
    return resource;
  }

  /**
   * Disposes every resource while preserving all cleanup errors.
   * @returns {Promise<void>} Resolves when cleanup completes.
   */
  async dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    const errors = [];
    for (const resource of this.resources.reverse()) {
      try {
        await resource.dispose();
      }
      catch (error) {
        errors.push(error);
      }
    }
    this.resources = [];
    if (errors.length > 0) {
      throw new AggregateError(errors, 'One or more resources failed to dispose.');
    }
  }
}
