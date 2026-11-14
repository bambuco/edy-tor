/**
 * @file Creates isolated editor instances and manages extension lifecycles and services.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createTranslator } from '../i18n/messages.js';
import { confirmDialog } from '../ui/controls.js';
import { DisposableStore, Registry } from './registry.js';
import { Workbench } from '../workbench/workbench.js';
import { parseShortcut } from './shortcuts.js';
import { createAccordion } from '../ui/accordion.js';
import { normalizePreviewViewport } from '../ui/preview-viewport.js';

/** @type {WeakMap<HTMLElement, EdyInstance>} */
const instances = new WeakMap();
/** @type {WeakMap<HTMLElement, ShadowRoot>} */
const reusableRoots = new WeakMap();

/**
 * Creates an independently configured Edy workbench.
 * @param {{container: HTMLElement, locale?: string, theme?: string, logo?: string, services?: Object, extensions?: Array}} options Instance options.
 * @returns {EdyInstance} Edy instance.
 */
export function createEdy(options) {
  if (!options?.container || typeof options.container.attachShadow !== 'function') {
    throw new TypeError('createEdy requires a container element that can host a shadow root.');
  }
  const active = instances.get(options.container);
  if (active && !active.disposed) {
    throw new Error('The Edy container already has an active instance.');
  }
  const existingRoot = options.container.shadowRoot;
  if (existingRoot && existingRoot !== reusableRoots.get(options.container)) {
    throw new Error('The Edy container already has a shadow root.');
  }
  const instance = new EdyInstance(options, existingRoot);
  instances.set(options.container, instance);
  reusableRoots.set(options.container, instance.shadow);
  return instance;
}

/**
 * Manages the lifecycle, registrations, and isolated UI for one Edy instance.
 */
export class EdyInstance {
  /**
   * @param {{container: HTMLElement, locale?: string, theme?: string, logo?: string, services?: Object, extensions?: Array}} options Instance options.
   * @param {ShadowRoot} [existingRoot] Previously disposed Edy root.
   */
  constructor({ container, locale = 'en', theme = 'system', logo = new URL('../assets/edy-logo.svg', import.meta.url).href, services = {}, extensions = [] }, existingRoot) {
    if (!Array.isArray(extensions)) {
      throw new TypeError('Extensions must be provided as an array.');
    }
    if (!['en', 'es'].includes(locale)) {
      throw new TypeError(`Unsupported locale "${locale}".`);
    }
    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new TypeError(`Unsupported theme "${theme}".`);
    }
    if (typeof logo !== 'string' || !logo.trim()) {
      throw new TypeError('The logo must be a non-empty image URL string.');
    }
    if (!services || typeof services !== 'object' || Array.isArray(services)) {
      throw new TypeError('Host services must be provided as an object.');
    }
    const extensionIds = new Set();
    for (const extension of extensions) {
      if (!extension || typeof extension.id !== 'string' || extension.id.trim() === '') {
        throw new TypeError('Every extension must have a non-empty id.');
      }
      if (extensionIds.has(extension.id)) {
        throw new Error(`Extension "${extension.id}" is configured more than once.`);
      }
      extensionIds.add(extension.id);
    }
    this.container = container;
    this.locale = locale === 'es' ? 'es' : 'en';
    this.translate = createTranslator(this.locale);
    this.theme = theme;
    this.logo = logo;
    this.services = Object.freeze({ ...services });
    this.extensions = [...extensions];
    this.extensionStates = new Map();
    this.started = false;
    this.disposed = false;
    this.disposing = false;
    this.disposePromise = null;
    this.notices = [];
    this.noticeSequence = 0;
    this.timers = new Set();
    if (existingRoot && existingRoot.childNodes.length > 0) {
      throw new Error('A reusable Edy shadow root must be empty.');
    }
    this.shadow = existingRoot ?? container.attachShadow({ mode: 'open' });
    this.views = new Registry(() => this.workbench?.render());
    this.documents = new Registry(() => {
      if (!this.workbench) {
        return;
      }
      this.workbench.refreshDocumentTabs();
      if (this.workbench.activeDocument && !this.documents.get(this.workbench.activeDocument)) {
        this.workbench.activeDocument = null;
        this.workbench.refreshEditorContent();
      }
    });
    this.commands = new Registry(() => this.workbench?.refreshCommandUi());
    this.menus = new Registry(() => this.workbench?.refreshMenuSurfaces());
    this.status = new Registry(() => this.workbench?.refreshStatus());
    this.workbench = new Workbench(this);
  }

  /**
   * Starts the workbench and activates configured extensions.
   * @returns {Promise<EdyInstance>} Started instance.
   */
  async start() {
    if (this.disposed || this.disposing) {
      throw new Error('A disposed Edy instance cannot be started.');
    }
    if (this.started) {
      return this;
    }
    this.started = true;
    try {
      for (const extension of this.extensions) {
        await this.activateExtension(extension.id);
      }
    }
    catch (error) {
      try {
        await this.deactivateAllExtensions();
      }
      catch (cleanupError) {
        this.reportError(cleanupError, 'Startup cleanup failed.');
      }
      throw error;
    }
    this.workbench.render();
    return this;
  }

  /**
   * Activates one configured extension after validating its contract.
   * @param {string} extensionId Extension identifier.
   * @returns {Promise<void>} Activation completion.
   */
  async activateExtension(extensionId) {
    if (this.disposed || this.disposing) {
      throw new Error('Extensions cannot be activated on a disposed Edy instance.');
    }
    const extension = this.extensions.find((item) => item?.id === extensionId);
    if (!extension) {
      throw new Error(`Extension "${extensionId}" is not configured.`);
    }
    if (this.extensionStates.get(extensionId)?.active) {
      return;
    }
    if (extension.apiVersion !== '1') {
      const error = new Error(`Extension "${extensionId}" requires unsupported API version "${extension.apiVersion}".`);
      this.reportError(error, this.translate('extensionFailed'));
      throw error;
    }
    if (typeof extension.activate !== 'function') {
      const error = new TypeError(`Extension "${extensionId}" must implement activate(context).`);
      this.reportError(error, this.translate('extensionFailed'));
      throw error;
    }
    if (extension.requires !== undefined &&
        (!Array.isArray(extension.requires) || extension.requires.some((name) => typeof name !== 'string'))) {
      const error = new TypeError(`Extension "${extensionId}" requires must be an array of service names.`);
      this.reportError(error, this.translate('extensionFailed'));
      throw error;
    }
    const missing = (extension.requires ?? []).filter((name) => !(name in this.services));
    if (missing.length) {
      const error = new Error(`${this.translate('failedServices')}: ${missing.join(', ')}.`);
      this.reportError(error, this.translate('extensionFailed'));
      throw error;
    }
    const store = new DisposableStore();
    const subscriptions = [];
    const nativePush = Array.prototype.push;
    subscriptions.push = (...resources) => {
      for (const resource of resources) {
        store.add(resource);
      }
      return nativePush.apply(subscriptions, resources);
    };
    const context = this.createExtensionContext(extension, store, subscriptions);
    const state = { extension, store, context, active: false };
    this.extensionStates.set(extensionId, state);
    try {
      await extension.activate(context);
      state.active = true;
      this.workbench.render();
    }
    catch (error) {
      this.reportError(error, `${this.translate('extensionFailed')}: ${extensionId}`);
      try {
        await store.dispose();
      }
      catch (cleanupError) {
        this.reportError(cleanupError, `Cleanup failed for extension "${extensionId}".`);
      }
      this.extensionStates.delete(extensionId);
      throw error;
    }
  }

  /**
   * Deactivates an extension and releases all of its registered resources.
   * @param {string} extensionId Extension identifier.
   * @returns {Promise<void>} Deactivation completion.
   */
  async deactivateExtension(extensionId) {
    const state = this.extensionStates.get(extensionId);
    if (!state) {
      return;
    }
    this.extensionStates.delete(extensionId);
    const errors = [];
    if (state.active && typeof state.extension.deactivate === 'function') {
      try {
        await state.extension.deactivate();
      }
      catch (error) {
        errors.push(error);
      }
    }
    try {
      await state.store.dispose();
    }
    catch (error) {
      errors.push(error);
    }
    this.workbench.render();
    if (errors.length) {
      const error = new AggregateError(errors, `Extension "${extensionId}" failed to deactivate cleanly.`);
      this.reportError(error);
      throw error;
    }
  }

  /**
   * Disposes all active extensions, continuing after individual failures.
   * @returns {Promise<void>} Cleanup completion.
   */
  async deactivateAllExtensions() {
    const errors = [];
    for (const id of [...this.extensionStates.keys()].reverse()) {
      try {
        await this.deactivateExtension(id);
      }
      catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      throw new AggregateError(errors, 'One or more extensions failed to deactivate.');
    }
  }

  /**
   * Runs a registered command and reports failures before rethrowing them.
   * @param {string} id Command identifier.
   * @param {...*} args Command arguments.
   * @returns {Promise<*>} Command result.
   */
  async executeCommand(id, ...args) {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command "${id}" is not registered.`);
    }
    try {
      if (!this.isCommandEnabled(id)) {
        throw new Error(`Command "${id}" is unavailable.`);
      }
      return await command.execute(...args);
    }
    catch (error) {
      this.reportError(error, `${this.translate('commandFailed')}: ${command.label ?? id}`);
      throw error;
    }
  }

  /**
   * Checks whether a registered command is currently available.
   * @param {string} id Command identifier.
   * @returns {boolean} Whether the command can execute.
   */
  isCommandEnabled(id) {
    const command = this.commands.get(id);
    return Boolean(command) && command.enabled !== false;
  }

  /**
   * Creates the capability-limited API passed to an extension.
   * @param {Object} extension Extension definition.
   * @param {DisposableStore} store Extension resource store.
   * @param {Array} subscriptions Extension subscription list.
   * @returns {Object} Extension context.
   */
  createExtensionContext(extension, store, subscriptions) {
    const register = (registry, id, value) => store.add(registry.register(`${extension.id}:${id}`, value));
    const publicId = (id) => `${extension.id}:${id}`;
    const validIdentifier = (id, label) => {
      if (typeof id !== 'string' || id.trim() === '') {
        throw new TypeError(`${label} must have a non-empty identifier.`);
      }
    };
    return Object.freeze({
      extensionId: extension.id,
      apiVersion: '1',
      locale: this.locale,
      translate: this.translate,
      services: this.services,
      subscriptions,
      commands: Object.freeze({
        register: (id, command) => {
          validIdentifier(id, 'Commands');
          if (!command || typeof command.execute !== 'function' ||
              typeof command.label !== 'string' || command.label.trim() === '' ||
              (command.enabled !== undefined && typeof command.enabled !== 'boolean')) {
            throw new TypeError('Commands require a label, execute function, and optional boolean enabled state.');
          }
          return register(this.commands, id, command);
        },
        execute: (id, ...args) => this.executeCommand(publicId(id), ...args),
        refresh: () => this.workbench.refreshCommandUi(),
      }),
      views: Object.freeze({
        register: (id, view) => {
          validIdentifier(id, 'Views');
          if (!view || typeof view.title !== 'string' || view.title.trim() === '' ||
              !['primary', 'secondary', 'panel', 'editor', 'preview'].includes(view.location) ||
              (view.render !== undefined && typeof view.render !== 'function') ||
              (view.viewport !== undefined && view.location !== 'preview') ||
              (view.sections !== undefined && (!Array.isArray(view.sections) ||
                !view.sections.length || view.location !== 'primary' || view.render !== undefined))) {
            throw new TypeError('Views require a title, valid location, and optional render function.');
          }
          let contribution = view.sections ? {
            ...view,
            render: () => createAccordion({
              sections: view.sections,
              resizeLabel: this.translate('resizeSections'),
              onError: (error) => this.reportError(error),
            }),
          } : view;
          if (view.viewport !== undefined) {
            contribution = { ...contribution, viewport: normalizePreviewViewport(view.viewport) };
          }
          return register(this.views, id, contribution);
        },
        open: (id) => this.workbench.openView(publicId(id)),
      }),
      documents: Object.freeze({
        open: (id, document) => {
          validIdentifier(id, 'Documents');
          if (!document || typeof document.title !== 'string' || document.title.trim() === '' ||
              (document.render !== undefined && typeof document.render !== 'function')) {
            throw new TypeError('Documents require a title and optional render function.');
          }
          const resource = register(this.documents, id, document);
          this.workbench.openDocument(publicId(id));
          return resource;
        },
        close: (id) => this.documents.remove(publicId(id)),
      }),
      menus: Object.freeze({
        register: (menuId, item) => {
          validIdentifier(menuId, 'Menus');
          validIdentifier(item?.id, 'Menu items');

          // Validate basic properties
          if (typeof item.label !== 'string' || item.label.trim() === '') {
            throw new TypeError('Menu items require a non-empty label.');
          }
          if (item.icon !== undefined && typeof item.icon !== 'string') {
            throw new TypeError('Menu item icon must be a string.');
          }

          // Check if item has submenu or commandId
          const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
          const hasCommandId = typeof item.commandId === 'string' && item.commandId.trim() !== '';

          // An item cannot have both submenu and commandId
          if (hasSubmenu && hasCommandId) {
            throw new TypeError('Menu items cannot have both submenu and commandId.');
          }

          // Context menu items must have a commandId (and cannot have submenu)
          if (menuId === 'context' && !hasCommandId) {
            throw new TypeError('Context menu items require a command identifier.');
          }

          // Validate submenu items if present
          const processedSubmenu = hasSubmenu ? item.submenu.map((subitem) => {
            validIdentifier(subitem?.id, 'Submenu items');
            if (typeof subitem.label !== 'string' || subitem.label.trim() === '') {
              throw new TypeError('Submenu items require a non-empty label.');
            }
            if (subitem.icon !== undefined && typeof subitem.icon !== 'string') {
              throw new TypeError('Submenu item icon must be a string.');
            }
            const subCommandId = typeof subitem.commandId === 'string' && subitem.commandId.trim() !== '';
            if (!subCommandId) {
              throw new TypeError('Submenu items require a command identifier.');
            }
            return {
              ...subitem,
              commandId: publicId(subitem.commandId),
            };
          }) : undefined;

          // Process shortcut for main item (only if no submenu)
          const shortcut = !hasSubmenu && item.shortcut !== undefined ? parseShortcut(item.shortcut) : undefined;
          if (shortcut && !hasCommandId) {
            throw new TypeError('A menu shortcut requires a command identifier.');
          }
          if (shortcut && this.menus.entries().some(([, registered]) => registered.shortcutKey === shortcut.canonical)) {
            throw new Error(`Shortcut "${item.shortcut}" is already registered.`);
          }

          return register(this.menus, `${menuId}:${item.id}`, {
            ...item,
            menuId,
            shortcutKey: shortcut?.canonical,
            commandId: hasCommandId ? publicId(item.commandId) : undefined,
            submenu: processedSubmenu,
          });
        },
      }),
      status: Object.freeze({
        register: (id, item) => {
          validIdentifier(id, 'Status items');
          if (!item || typeof item.label !== 'string' || item.label.trim() === '' ||
              (item.onClick !== undefined && typeof item.onClick !== 'function') ||
              (item.commandId !== undefined && typeof item.commandId !== 'string')) {
            throw new TypeError('Status items require a label and optional action or command identifier.');
          }
          return register(this.status, id, {
            ...item,
            id,
            commandId: item.commandId ? publicId(item.commandId) : undefined,
          });
        },
      }),
      notifications: Object.freeze({
        info: (message) => this.notify(message, 'info'),
        success: (message) => this.notify(message, 'success'),
        error: (error, message) => this.reportError(error, message),
      }),
      ui: Object.freeze({
        confirm: (message) => confirmDialog({
          title: this.translate('dialogTitle'),
          message,
          confirmLabel: this.translate('confirm'),
          cancelLabel: this.translate('cancel'),
          container: this.shadow,
        }),
      }),
    });
  }

  /**
   * Adds a temporary notification to this instance's workbench.
   * @param {string} message Notification text.
   * @param {string} type Notification type.
   * @returns {void}
   */
  notify(message, type = 'info') {
    const notice = { id: ++this.noticeSequence, message: String(message), type };
    this.notices.push(notice);
    this.workbench.renderNotifications();
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.notices = this.notices.filter((item) => item !== notice);
      this.workbench.renderNotifications();
    }, 5000);
    this.timers.add(timer);
  }

  /**
   * Logs an error and exposes its message in the current workbench.
   * @param {*} error Reported error.
   * @param {string} [message] Optional user-facing context.
   * @returns {void}
   */
  reportError(error, message = '') {
    console.error(message || 'Edy error', error);
    const detail = error instanceof Error ? error.message : String(error);
    this.notify(message ? `${message}: ${detail}` : detail, 'error');
  }

  /**
   * Disposes extensions, timers, and the mounted workbench.
   * @returns {Promise<void>} Cleanup completion.
   */
  dispose() {
    if (this.disposed) {
      return Promise.resolve();
    }
    if (this.disposePromise) {
      return this.disposePromise;
    }
    this.disposing = true;
    this.disposePromise = this.performDispose();
    return this.disposePromise;
  }

  /**
   * Completes instance teardown and leaves its host root reusable.
   * @returns {Promise<void>} Cleanup completion.
   */
  async performDispose() {
    const errors = [];
    try {
      await this.deactivateAllExtensions();
    }
    catch (error) {
      errors.push(error);
    }
    try {
      this.workbench.dispose();
    }
    catch (error) {
      errors.push(error);
    }
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.notices = [];
    this.disposed = true;
    this.disposing = false;
    if (errors.length) {
      throw new AggregateError(errors, 'Edy instance failed to dispose cleanly.');
    }
  }
}
