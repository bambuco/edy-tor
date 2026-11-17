/**
 * @file Provides a reusable, host-backed file explorer activity.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createButton, openDialog } from './controls.js';
import { createIconElement, resolveIcon } from './icons.js';

/** @type {string[]} Provider operations that mutate entries. */
const mutationOperations = ['createFile', 'createFolder', 'rename', 'delete', 'move', 'replace'];

/** @type {Set<string>} MIME types supported by Edy's sandboxed text viewer. */
const textViewTypes = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'text/css',
  'text/html',
  'text/javascript',
  'text/markdown',
  'text/plain',
  'text/xml',
]);

/** @type {symbol} Internal key for the provider root in request state maps. */
const rootFolderKey = Symbol('file-explorer-root');

/**
 * Base class for adapters that expose files from a host application.
 */
export class FileExplorerProvider {
  /**
   * Creates a provider and declares the operations it supports.
   * @param {Object} capabilities Supported mutation operations.
   */
  constructor(capabilities = {}) {
    if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities) ||
        Object.keys(capabilities).some((key) => !mutationOperations.includes(key)) ||
        Object.values(capabilities).some((value) => typeof value !== 'boolean')) {
      throw new TypeError('File explorer capabilities must contain boolean operation flags.');
    }

    this.capabilities = Object.freeze(Object.fromEntries(
      mutationOperations.map((operation) => [operation, capabilities[operation] === true]),
    ));
  }

  /**
   * Lists the contents of a folder; use null for the provider root.
   * @param {string|null} folderId Opaque folder identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Array<Object>>} Folder entries.
   */
  async list(folderId, { signal } = {}) {
    void folderId;
    void signal;
    throw new Error('File explorer providers must implement list().');
  }

  /**
   * Creates a file from a browser File object.
   * @param {string|null} folderId Destination folder identifier.
   * @param {File} file File selected by the user.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after the file is created.
   */
  async createFile(folderId, file, { signal } = {}) {
    void folderId;
    void file;
    void signal;
    throw new Error('File creation is not supported by this provider.');
  }

  /**
   * Creates a folder.
   * @param {string|null} parentId Parent folder identifier.
   * @param {string} name Folder name.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after the folder is created.
   */
  async createFolder(parentId, name, { signal } = {}) {
    void parentId;
    void name;
    void signal;
    throw new Error('Folder creation is not supported by this provider.');
  }

  /**
   * Renames an entry.
   * @param {string} id Opaque entry identifier.
   * @param {string} name New name.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after the entry is renamed.
   */
  async rename(id, name, { signal } = {}) {
    void id;
    void name;
    void signal;
    throw new Error('Renaming is not supported by this provider.');
  }

  /**
   * Deletes an entry.
   * @param {string} id Opaque entry identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after deletion.
   */
  async delete(id, { signal } = {}) {
    void id;
    void signal;
    throw new Error('Deletion is not supported by this provider.');
  }

  /**
   * Moves an entry into a folder; use null for the root.
   * @param {string} id Opaque entry identifier.
   * @param {string|null} destinationFolderId Target folder identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after the move.
   */
  async move(id, destinationFolderId, { signal } = {}) {
    void id;
    void destinationFolderId;
    void signal;
    throw new Error('Moving is not supported by this provider.');
  }

  /**
   * Replaces a file with uploaded or editor-provided data.
   * @param {string} id Opaque file identifier.
   * @param {{source: 'upload'|'edited-content', data: File|Blob|string}} replacement Replacement data.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after replacement.
   */
  async replace(id, replacement, { signal } = {}) {
    void id;
    void replacement;
    void signal;
    throw new Error('Replacing files is not supported by this provider.');
  }

  /**
   * Resolves an entry to a URL suitable for opening in a viewer.
   * @param {string} id Opaque file identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<string|URL>} File URL.
   */
  async getUrl(id, { signal } = {}) {
    void id;
    void signal;
    throw new Error('File explorer providers must implement getUrl().');
  }
}

/**
 * Creates a default viewer for a supported safe file type.
 * @param {{item: Object, url: string, translate?: Function, onError?: Function}} options Viewer options.
 * @returns {{element: HTMLElement, dispose: Function}} Viewer and cleanup.
 */
export function createFileViewer({
  item,
  url,
  translate = (key) => key,
  onError = console.error,
} = {}) {
  if (!item || item.type !== 'file' || typeof url !== 'string' || !url.trim() ||
      typeof translate !== 'function' || typeof onError !== 'function') {
    throw new TypeError('File viewers require a file item, URL, and valid callbacks.');
  }
  const resolvedUrl = new URL(url, document.baseURI);
  if (!['http:', 'https:', 'blob:'].includes(resolvedUrl.protocol) ||
      resolvedUrl.username || resolvedUrl.password) {
    throw new TypeError('File viewer URLs must use HTTP, HTTPS, or blob without credentials.');
  }
  url = resolvedUrl.href;
  const mimeType = item.mimeType?.toLowerCase() ?? '';
  let element;
  if (['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    element = document.createElement('img');
    element.alt = item.name;
    element.src = url;
  }
  else if (mimeType.startsWith('audio/')) {
    element = document.createElement('audio');
    element.controls = true;
    element.src = url;
  }
  else if (mimeType.startsWith('video/')) {
    element = document.createElement('video');
    element.controls = true;
    element.src = url;
  }
  else if (mimeType === 'application/pdf' || textViewTypes.has(mimeType)) {
    element = document.createElement('iframe');
    element.title = item.name;
    element.setAttribute('sandbox', '');
    element.referrerPolicy = 'no-referrer';
    element.src = url;
  }
  else {
    throw new Error(`${translate('fileViewerUnsupported')}: ${mimeType || translate('fileUnknownType')}`);
  }
  element.className = 'edy-file-viewer';
  const handleError = () => onError(new Error(`${translate('fileViewerFailed')}: ${item.name}`));
  element.addEventListener('error', handleError);
  return {
    element,
    dispose() {
      element.removeEventListener('error', handleError);
      if (['AUDIO', 'VIDEO'].includes(element.tagName)) {
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      else if (['IMG', 'IFRAME'].includes(element.tagName)) {
        element.removeAttribute('src');
      }
    },
  };
}

/**
 * Creates a host-backed, keyboard-operable tree explorer.
 * @param {Object} options Explorer, provider, and host callback options.
 * @returns {{element: HTMLElement, dispose: Function, replaceEdited: Function}} Explorer and cleanup.
 */
export function createFileExplorer({
  provider,
  translate = (key) => key,
  operations = {},
  readOnly = false,
  accept = [],
  maxFileSize,
  multiple = false,
  clickBehavior = 'select',
  viewDestination = 'editor',
  canView,
  onSelect,
  onOpen,
  openInEditor,
  customOperations = [],
  confirm = async () => true,
  onError = console.error,
} = {}) {
  validateExplorerOptions({
    provider, translate, operations, readOnly, accept, maxFileSize, multiple, clickBehavior,
    viewDestination, canView, onSelect, onOpen, openInEditor, customOperations, confirm, onError,
  });
  const enabledOperations = Object.fromEntries(mutationOperations.map((operation) => [
    operation,
    !readOnly && provider.capabilities?.[operation] === true && operations[operation] !== false,
  ]));
  enabledOperations.view = operations.view === true;

  const root = document.createElement('section');
  root.className = 'edy-file-explorer';
  root.setAttribute('aria-label', translate('fileExplorer'));
  const toolbar = document.createElement('div');
  toolbar.className = 'edy-file-explorer__toolbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', translate('fileActions'));
  const status = document.createElement('p');
  status.className = 'edy-file-explorer__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const tree = document.createElement('ul');
  tree.className = 'edy-file-explorer__tree';
  tree.setAttribute('role', 'tree');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.hidden = true;
  fileInput.multiple = multiple;
  if (accept.length) fileInput.accept = accept.join(',');
  const replaceInput = document.createElement('input');
  replaceInput.type = 'file';
  replaceInput.hidden = true;
  if (accept.length) replaceInput.accept = accept.join(',');

  const entriesByFolder = new Map();
  const parentById = new Map();
  const loadingFolders = new Set();
  const loadControllers = new Map();
  const operationControllers = new Set();
  const clickTimers = new Set();
  let selectedId = null;
  let movingEntry = null;
  let replacingEntry = null;
  let activeMenu = null;
  let disposed = false;

  /**
   * Reports an operation error through the host callback and visible status.
   * @param {*} error Operation failure.
   */
  function report(error) {
    if (disposed) return;
    status.textContent = error instanceof Error ? error.message : String(error);
    onError(error);
  }

  /**
   * Creates a controller tracked until its host operation settles.
   * @returns {AbortController} Request controller.
   */
  function createController() {
    if (disposed) throw new Error('File explorer is disposed.');
    const controller = new AbortController();
    operationControllers.add(controller);
    return controller;
  }

  /**
   * Gets whether a configured operation is supported for an entry.
   * @param {string} operation Operation identifier.
   * @param {Object} item File or folder metadata.
   * @returns {boolean} Whether the operation is available.
   */
  function isOperationEnabled(operation, item) {
    if (operation === 'view') {
      if (!enabledOperations.view || item?.type !== 'file') return false;
      return canView ? canView({ ...item }) === true : hasDefaultViewer(item);
    }
    return enabledOperations[operation] === true;
  }

  /**
   * Loads and validates entries for one folder, ignoring stale responses.
   * @param {string|null} folderId Folder identifier or root.
   * @returns {Promise<void>} Completes when the folder is loaded.
   */
  async function loadFolder(folderId) {
    if (disposed) return;
    const key = folderKey(folderId);
    loadControllers.get(key)?.abort();
    const controller = new AbortController();
    loadControllers.set(key, controller);
    loadingFolders.add(key);
    status.textContent = translate('fileLoading');
    render();
    try {
      const entries = await provider.list(folderId, { signal: controller.signal });
      if (!Array.isArray(entries)) throw new TypeError('Provider list() must return an array.');
      const siblings = new Set();
      const loadedElsewhere = new Set(
        [...entriesByFolder.entries()]
          .filter(([parent]) => parent !== folderId)
          .flatMap(([, children]) => children.map((item) => item.id)),
      );
      const normalized = entries.map((entry) => {
        if (!entry || typeof entry.id !== 'string' || !entry.id.trim() ||
            typeof entry.name !== 'string' || !entry.name.trim() ||
            !['file', 'folder'].includes(entry.type) || siblings.has(entry.id) ||
            loadedElsewhere.has(entry.id) ||
            (entry.size !== undefined && (!Number.isFinite(entry.size) || entry.size < 0)) ||
            (entry.mimeType !== undefined && typeof entry.mimeType !== 'string')) {
          throw new TypeError('Provider entries require unique IDs, names, file or folder types, and valid metadata.');
        }
        let ancestorId = folderId;
        while (ancestorId !== null) {
          if (ancestorId === entry.id) throw new TypeError('Provider folder entries cannot create a cycle.');
          ancestorId = parentById.get(ancestorId) ?? null;
        }
        siblings.add(entry.id);
        return { ...entry, parentId: folderId };
      });
      if (loadControllers.get(key) === controller && !disposed) {
        entriesByFolder.set(folderId, normalized);
        for (const entry of normalized) parentById.set(entry.id, folderId);
        loadingFolders.delete(key);
        status.textContent = '';
        render();
      }
    }
    catch (error) {
      if (!controller.signal.aborted && loadControllers.get(key) === controller && !disposed) {
        entriesByFolder.set(folderId, []);
        loadingFolders.delete(key);
        render();
        report(error);
      }
    }
  }

  /**
   * Loads root and every currently expanded folder.
   * @returns {Promise<void>} Completes after visible folders refresh.
   */
  async function refreshTree() {
    const folders = [null, ...getExpandedFolders()];
    await Promise.all(folders.map((folderId) => loadFolder(folderId)));
  }

  /**
   * Returns expanded folders in tree order.
   * @returns {string[]} Expanded folder IDs.
   */
  function getExpandedFolders() {
    return [...entriesByFolder.keys()].filter((id) => id !== null && expanded.has(id));
  }

  /**
   * Tracks expanded folders independently of the current render.
   * @type {Set<string>}
   */
  const expanded = new Set();

  /**
   * Creates an icon-only toolbar button with a localized accessible name and tooltip.
   * @param {string} labelKey Translation key for the button label.
   * @param {string} icon Icon alias.
   * @param {Function} onClick Button action.
   * @returns {HTMLButtonElement} Toolbar button.
   */
  function createToolbarButton(labelKey, icon, onClick) {
    const label = translate(labelKey);
    const button = createButton({ label: '', icon, onClick });
    button.classList.add('edy-file-explorer__toolbar-action');
    button.setAttribute('aria-label', label);
    button.title = label;
    return button;
  }

  function render() {
    if (disposed) return;
    toolbar.replaceChildren();
    tree.replaceChildren();
    if (enabledOperations.createFile) {
      toolbar.append(createToolbarButton('fileAdd', 'file-plus', () => fileInput.click()));
    }
    if (enabledOperations.createFolder) {
      toolbar.append(createToolbarButton('folderAdd', 'folder-plus', () =>
        showNameEditor(translate('folderName'), '', async (name) => {
          const parentId = currentTargetFolder();
          await runProviderOperation((signal) => provider.createFolder(parentId, name, { signal }));
          await refreshTree();
        })));
    }
    toolbar.append(createToolbarButton('refresh', 'refresh', refreshTree));

    if (movingEntry) {
      const moveStatus = document.createElement('span');
      moveStatus.className = 'edy-file-explorer__move-status';
      moveStatus.textContent = translate('fileMovePrompt').replace('{name}', movingEntry.name);
      toolbar.append(moveStatus);
      toolbar.append(createButton({
        label: translate('fileMoveToRoot'),
        onClick: () => performMove(movingEntry, null),
        disabled: movingEntry.parentId === null,
      }));
      toolbar.append(createButton({
        label: translate('cancel'),
        onClick: () => {
          movingEntry = null;
          render();
        },
      }));
    }

    if (entriesByFolder.has(null)) {
      const rootEntries = renderChildren(null, []);
      tree.append(...rootEntries);
      if (!rootEntries.length && !status.textContent) status.textContent = translate('fileEmpty');
    }
    else if (loadingFolders.has(folderKey(null))) tree.append(createStatusItem(translate('fileLoading')));
    else if (!status.textContent) status.textContent = translate('fileEmpty');
  }

  /**
   * Renders one folder's children recursively.
   * @param {string|null} folderId Parent folder identifier.
   * @param {string[]} ancestors Ancestor folder IDs.
   * @returns {HTMLElement[]} Rendered tree items.
   */
  function renderChildren(folderId, ancestors) {
    const children = entriesByFolder.get(folderId) ?? [];
    if (!children.length) {
      if (loadingFolders.has(folderKey(folderId))) {
        return [createStatusItem(translate('fileLoading'))];
      }
      return folderId === null ? [] : [createStatusItem(status.textContent || translate('fileEmpty'))];
    }
    return children.map((entry) => renderEntry(entry, [...ancestors, entry.id]));
  }

  /**
   * Renders one tree item and its expanded descendants.
   * @param {Object} entry Entry metadata.
   * @param {string[]} ancestors IDs from root through this entry.
   * @returns {HTMLElement} Tree item.
   */
  function renderEntry(entry, ancestors) {
    const item = document.createElement('li');
    item.className = 'edy-file-explorer__entry';
    item.setAttribute('role', 'treeitem');
    item.setAttribute('aria-selected', String(selectedId === entry.id));
    item.dataset.entryId = entry.id;
    item.draggable = isOperationEnabled('move', entry);
    item.title = entry.name;

    const row = document.createElement('div');
    row.className = 'edy-file-explorer__row';
    if (entry.type === 'folder') {
      const isExpanded = expanded.has(entry.id);
      const toggleLabel = isExpanded ? translate('fileCollapse') : translate('fileExpand');
      const toggle = createButton({
        label: '',
        icon: isExpanded ? 'chevron-down' : 'chevron-right',
        onClick: () => toggleFolder(entry),
      });
      toggle.classList.add('edy-file-explorer__folder-toggle');
      toggle.setAttribute('aria-label', toggleLabel);
      toggle.title = toggleLabel;
      toggle.setAttribute('aria-expanded', String(isExpanded));
      row.append(toggle);
    }
    const nameButton = createButton({
      label: entry.name,
      icon: entry.type === 'folder' ? 'folder' : 'file',
      onClick: () => handleEntryClick(entry),
    });
    nameButton.classList.add('edy-file-explorer__entry-name');
    nameButton.setAttribute('title', entry.name);
    nameButton.title = entry.name;
    nameButton.setAttribute('aria-selected', String(selectedId === entry.id));
    nameButton.dataset.entryId = entry.id;
    nameButton.addEventListener('dblclick', () => handleDoubleClick(entry));
    row.append(nameButton);
    if (Number.isFinite(entry.size)) {
      const size = document.createElement('span');
      size.className = 'edy-file-explorer__size';
      size.textContent = formatFileSize(entry.size);
      row.append(size);
    }
    if (movingEntry && entry.type === 'folder') {
      row.append(createButton({
        label: translate('fileMoveHere'),
        onClick: () => performMove(movingEntry, entry.id),
        disabled: !canMoveInto(movingEntry, entry.id, ancestors),
      }));
    }
    const actionMenu = createOperationMenu(entry);
    if (actionMenu) row.append(actionMenu);
    item.append(row);
    item.addEventListener('dragstart', (event) => {
      if (!isOperationEnabled('move', entry) || !event.dataTransfer) return;
      event.dataTransfer.setData('text/plain', entry.id);
      event.dataTransfer.effectAllowed = 'move';
      item.classList.add('is-dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('is-dragging'));
    if (entry.type === 'folder') {
      item.addEventListener('dragover', (event) => {
        const source = findEntry(event.dataTransfer?.getData('text/plain')) ?? movingEntry;
        if (source && canMoveInto(source, entry.id, ancestors)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          item.classList.add('is-drop-target');
        }
      });
      item.addEventListener('dragleave', () => item.classList.remove('is-drop-target'));
      item.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        item.classList.remove('is-drop-target');
        const source = findEntry(event.dataTransfer?.getData('text/plain')) ?? movingEntry;
        if (source && canMoveInto(source, entry.id, ancestors)) performMove(source, entry.id);
      });
      if (expanded.has(entry.id)) {
        const group = document.createElement('ul');
        group.className = 'edy-file-explorer__children';
        group.setAttribute('role', 'group');
        group.append(...renderChildren(entry.id, ancestors));
        item.append(group);
      }
    }
    return item;
  }

  /**
   * Creates an accessible loading or empty-state tree item.
   * @param {string} message Status message.
   * @returns {HTMLElement} Status item.
   */
  function createStatusItem(message) {
    const item = document.createElement('li');
    item.className = 'edy-file-explorer__tree-status';
    item.setAttribute('role', 'none');
    item.textContent = message;
    return item;
  }

  /**
   * Creates the per-entry overflow menu with built-in and custom actions.
   * @param {Object} entry Entry metadata.
   * @returns {HTMLElement|null} Menu wrapper when actions are available.
   */
  function createOperationMenu(entry) {
    const actions = [];
    if (entry.type === 'file' && isOperationEnabled('view', entry)) {
      actions.push({
        id: 'view',
        label: translate('fileView'),
        icon: 'eye',
        execute: () => openFile(entry, 'view'),
      });
    }
    if (isOperationEnabled('rename', entry)) {
      actions.push({
        id: 'rename',
        label: translate('fileRename'),
        icon: 'pencil',
        execute: () => showNameEditor(translate('fileRename'), entry.name, async (name) => {
          await runProviderOperation((signal) => provider.rename(entry.id, name, { signal }));
          await refreshTree();
        }),
      });
    }
    if (isOperationEnabled('delete', entry)) {
      actions.push({
        id: 'delete',
        label: translate('fileDelete'),
        icon: 'trash',
        execute: () => removeEntry(entry),
      });
    }
    if (isOperationEnabled('move', entry)) {
      actions.push({
        id: 'move',
        label: translate('fileMove'),
        icon: 'move',
        execute: () => {
          movingEntry = entry;
          render();
        },
      });
    }
    if (entry.type === 'file' && isOperationEnabled('replace', entry)) {
      actions.push({
        id: 'replace',
        label: translate('fileReplace'),
        icon: 'file-import',
        execute: () => {
          replacingEntry = entry;
          replaceInput.click();
        },
      });
    }
    for (const operation of customOperations) {
      try {
        if (operation.visible && !operation.visible({ ...entry })) continue;
        actions.push({
          id: operation.id,
          label: operation.label,
          icon: operation.icon,
          execute: () => executeCustomOperation(operation, entry),
          disabled: operation.enabled ? !operation.enabled({ ...entry }) : false,
        });
      }
      catch (error) {
        report(error);
      }
    }
    if (!actions.length) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'edy-file-explorer__operations';
    const trigger = createButton({
      label: '',
      icon: 'ellipsis',
      onClick: (event) => {
        event.stopPropagation();
        if (activeMenu?.trigger === trigger) {
          closeActiveMenu();
          return;
        }
        runAction(() => openMenu(menu, trigger));
      },
    });
    trigger.setAttribute('aria-label', translate('fileOperations'));
    trigger.title = translate('fileOperations');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div');
    menu.className = 'edy-file-explorer__menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    for (const action of actions) {
      const button = createButton({
        label: action.label,
        icon: action.icon,
        disabled: action.disabled,
        onClick: (event) => {
          event.stopPropagation();
          closeMenu(menu, trigger);
          runAction(action.execute);
        },
      });
      button.setAttribute('role', 'menuitem');
      menu.append(button);
    }
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        closeMenu(menu, trigger);
        trigger.focus();
        event.stopPropagation();
      }
    });
    wrapper.append(trigger);
    return wrapper;
  }

  /**
   * Opens a menu in the editor's floating layer so scroll containers cannot clip it.
   * @param {HTMLElement} menu Menu element.
   * @param {HTMLElement} trigger Menu activator.
   */
  function openMenu(menu, trigger) {
    closeActiveMenu();
    const rootNode = root.getRootNode();
    const menuRoot = rootNode.nodeType === 11 ? rootNode : document;
    const menuContainer = rootNode.nodeType === 11 ? rootNode : document.body;
    if (!menuContainer?.append || !menuRoot?.addEventListener) {
      throw new Error('The file operations menu requires an attached editor root.');
    }

    try {
      menu.style.position = 'fixed';
      menu.style.visibility = 'hidden';
      menu.hidden = false;
      menuContainer.append(menu);
      positionMenu(menu, trigger);
      menu.style.visibility = '';
      trigger.setAttribute('aria-expanded', 'true');

      const view = menuRoot.nodeType === 9 ? menuRoot.defaultView : menuRoot.ownerDocument?.defaultView;
      activeMenu = { menu, trigger, menuRoot, view };
      menuRoot.addEventListener('click', closeMenusOutside);
      menuRoot.addEventListener('scroll', closeActiveMenu, true);
      view?.addEventListener('resize', closeActiveMenu);
      menu.querySelector('button')?.focus();
    }
    catch (error) {
      if (activeMenu?.menu === menu) closeMenu(menu, trigger);
      else {
        menu.hidden = true;
        menu.remove();
        trigger.setAttribute('aria-expanded', 'false');
      }
      throw error;
    }
  }

  /**
   * Positions the floating menu near its trigger while keeping it in the viewport.
   * @param {HTMLElement} menu Menu element.
   * @param {HTMLElement} trigger Menu activator.
   */
  function positionMenu(menu, trigger) {
    const bounds = trigger.getBoundingClientRect();
    const menuBounds = menu.getBoundingClientRect();
    const doc = menu.getRootNode().nodeType === 9 ? menu.getRootNode() : document;
    const view = doc.defaultView;
    const viewportWidth = doc.documentElement?.clientWidth || view?.innerWidth || menuBounds.width;
    const viewportHeight = doc.documentElement?.clientHeight || view?.innerHeight || menuBounds.height;
    const left = Math.max(8, Math.min(bounds.right - menuBounds.width, viewportWidth - menuBounds.width - 8));
    const below = bounds.bottom + menuBounds.height <= viewportHeight - 8;
    const top = Math.max(8, Math.min(
      below ? bounds.bottom : bounds.top - menuBounds.height,
      viewportHeight - menuBounds.height - 8,
    ));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  /**
   * Closes the current overflow menu.
   */
  function closeActiveMenu() {
    if (!activeMenu) return;
    closeMenu(activeMenu.menu, activeMenu.trigger);
  }

  /**
   * Closes a specific overflow menu.
   * @param {HTMLElement} menu Menu element.
   * @param {HTMLElement} trigger Menu button.
   */
  function closeMenu(menu, trigger) {
    menu.hidden = true;
    menu.remove();
    trigger.setAttribute('aria-expanded', 'false');
    if (activeMenu?.menu === menu) {
      activeMenu.menuRoot.removeEventListener('click', closeMenusOutside);
      activeMenu.menuRoot.removeEventListener('scroll', closeActiveMenu, true);
      activeMenu.view?.removeEventListener('resize', closeActiveMenu);
      activeMenu = null;
    }
  }

  /**
   * Closes the active menu when a click occurs outside its wrapper.
   * @param {Event} event Click event.
   */
  function closeMenusOutside(event) {
    if (activeMenu && !activeMenu.menu.contains(event.target) &&
        !activeMenu.trigger.contains(event.target)) {
      closeActiveMenu();
    }
  }

  /**
   * Toggles a folder and loads its contents on first expansion.
   * @param {Object} folder Folder entry.
   * @returns {Promise<void>} Completes when its first listing is loaded.
   */
  async function toggleFolder(folder) {
    if (expanded.has(folder.id)) {
      expanded.delete(folder.id);
      render();
      return;
    }
    expanded.add(folder.id);
    if (!entriesByFolder.has(folder.id)) await loadFolder(folder.id);
    else render();
  }

  /**
   * Runs the configured click behavior for an entry.
   * @param {Object} entry Entry metadata.
   */
  async function handleEntryClick(entry) {
    if (entry.type === 'folder') {
      selectedId = entry.id;
      render();
      if (onSelect) await runAction(() => onSelect({ ...entry }));
      toggleFolder(entry);
      return;
    }
    if (clickBehavior === 'open') {
      const timer = setTimeout(() => {
        clickTimers.delete(timer);
        void openFile(entry, 'open');
      }, 250);
      clickTimers.add(timer);
      return;
    }
    selectEntry(entry);
  }

  /**
   * Handles tree double-click as the view operation.
   * @param {Object} entry Entry metadata.
   */
  function handleDoubleClick(entry) {
    if (entry.type !== 'file') return;
    for (const timer of clickTimers) clearTimeout(timer);
    clickTimers.clear();
    if (isOperationEnabled('view', entry)) {
      void openFile(entry, 'view');
    }
    else if (clickBehavior === 'open') {
      void openFile(entry, 'open');
    }
  }

  /**
   * Selects an entry and notifies the host.
   * @param {Object} entry Entry metadata.
   * @returns {Promise<void>} Completes after the host callback.
   */
  async function selectEntry(entry) {
    selectedId = entry.id;
    render();
    if (onSelect) await runAction(() => onSelect({ ...entry }));
  }

  /**
   * Opens a file using the host's per-open decision and selected viewer destination.
   * @param {Object} entry File entry.
   * @param {'open'|'view'} intent Open intent.
   * @returns {Promise<void>} Completes after opening or host delegation.
   */
  async function openFile(entry, intent) {
    const controller = createController();
    try {
      const result = await provider.getUrl(entry.id, { signal: controller.signal });
      controller.signal.throwIfAborted();
      const url = new URL(result instanceof URL ? result.href : result, document.baseURI);
      if (!['http:', 'https:', 'blob:'].includes(url.protocol) || url.username || url.password) {
        throw new TypeError('File URLs must use HTTP, HTTPS, or blob without credentials.');
      }
      const decision = onOpen
        ? await onOpen({ ...entry }, { url: url.href, intent, destination: viewDestination })
        : 'default';
      if (decision === 'host') return;
      if (decision !== 'default') throw new TypeError('onOpen must return "default" or "host".');
      await showDefaultViewer(entry, url.href);
    }
    catch (error) {
      if (!controller.signal.aborted) report(error);
    }
    finally {
      operationControllers.delete(controller);
    }
  }

  /**
   * Displays the default viewer in an Edy tab or a floating dialog.
   * @param {Object} entry File entry.
   * @param {string} url Validated provider URL.
   * @returns {Promise<void>} Completes after opening the viewer.
   */
  async function showDefaultViewer(entry, url) {
    const createViewer = () => createFileViewer({
      item: entry,
      url,
      translate,
      onError,
    });
    if (viewDestination === 'dialog') {
      const viewer = createViewer();
      try {
        const dialog = openDialog({
          title: entry.name,
          content: viewer.element,
          closeLabel: translate('close'),
          container: root.getRootNode(),
        });
        dialog.addEventListener('close', () => viewer.dispose(), { once: true });
      }
      catch (error) {
        viewer.dispose();
        throw error;
      }
      return;
    }
    if (!openInEditor) {
      throw new Error(translate('fileEditorUnavailable'));
    }
    await openInEditor({
      item: { ...entry },
      url,
      render: createViewer,
    });
  }

  /**
   * Confirms and deletes an entry.
   * @param {Object} entry Entry to delete.
   * @returns {Promise<void>} Completes after deletion or cancellation.
   */
  async function removeEntry(entry) {
    try {
      const message = translate('fileDeleteConfirm').replace('{name}', entry.name);
      if (!await confirm(message)) return;
      await runProviderOperation((signal) => provider.delete(entry.id, { signal }));
      const deleted = new Set([entry.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const [id, parentId] of parentById) {
          if (deleted.has(parentId) && !deleted.has(id)) {
            deleted.add(id);
            grew = true;
          }
        }
      }
      for (const id of deleted) {
        parentById.delete(id);
        entriesByFolder.delete(id);
        expanded.delete(id);
      }
      if (deleted.has(selectedId)) selectedId = null;
      await refreshTree();
    }
    catch (error) {
      report(error);
    }
  }

  /**
   * Displays an inline form for creating or renaming an entry.
   * @param {string} label Form label.
   * @param {string} value Initial name.
   * @param {Function} submit Operation to run with the validated name.
   */
  function showNameEditor(label, value, submit) {
    const editor = document.createElement('form');
    editor.className = 'edy-file-explorer__name-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.required = true;
    input.maxLength = 255;
    input.setAttribute('aria-label', label);
    input.setAttribute('title', label);
    const save = createButton({ label: translate('save'), variant: 'primary' });
    save.type = 'submit';
    const cancel = createButton({
      label: translate('cancel'),
      onClick: () => editor.remove(),
    });
    editor.append(input, save, cancel);
    editor.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name || /[/\\]/u.test(name)) {
        input.setCustomValidity(translate('fileInvalidName'));
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      editor.remove();
      await runAction(() => submit(name));
    });
    toolbar.after(editor);
    input.focus();
    input.select();
  }

  /**
   * Starts keyboard- and pointer-accessible move mode.
   * @param {Object} entry Entry being moved.
   * @param {string|null} destinationFolderId Destination folder.
   * @param {string[]} ancestors Target ancestry.
   * @returns {boolean} Whether the target is valid.
   */
  function canMoveInto(entry, destinationFolderId, ancestors = []) {
    if (!isOperationEnabled('move', entry) || destinationFolderId === entry.parentId ||
        destinationFolderId === entry.id || (entry.type === 'folder' && ancestors.includes(entry.id))) {
      return false;
    }
    let parentId = destinationFolderId;
    while (parentId !== null) {
      if (parentId === entry.id) return false;
      parentId = parentById.get(parentId) ?? null;
    }
    return true;
  }

  /**
   * Moves an entry after validating the visible destination.
   * @param {Object} entry Entry to move.
   * @param {string|null} destinationFolderId Target folder or root.
   * @returns {Promise<void>} Completes after the provider move and refresh.
   */
  async function performMove(entry, destinationFolderId) {
    if (!canMoveInto(entry, destinationFolderId)) {
      report(new Error(translate('fileMoveInvalid')));
      return;
    }
    movingEntry = null;
    try {
      await runProviderOperation((signal) => provider.move(entry.id, destinationFolderId, { signal }));
      entriesByFolder.delete(entry.parentId);
      parentById.set(entry.id, destinationFolderId);
      const folders = new Set([null, entry.parentId, destinationFolderId, ...getExpandedFolders()]);
      await Promise.all([...folders].map((folderId) => loadFolder(folderId)));
    }
    catch (error) {
      report(error);
    }
    render();
  }

  /**
   * Finds an entry in the loaded tree by opaque identifier.
   * @param {string} id Entry identifier.
   * @returns {Object|null} Loaded entry or null.
   */
  function findEntry(id) {
    if (!id) return null;
    for (const entries of entriesByFolder.values()) {
      const entry = entries.find((item) => item.id === id);
      if (entry) return entry;
    }
    return null;
  }

  /**
   * Selects the current folder as the upload/create target, falling back to root.
   * @returns {string|null} Target folder identifier.
   */
  function currentTargetFolder() {
    const selected = findEntry(selectedId);
    return selected?.type === 'folder' ? selected.id : selected?.parentId ?? null;
  }

  /**
   * Replaces a selected file using another file from the host picker.
   * @param {Event} event File input change event.
   * @returns {Promise<void>} Completes the replacement.
   */
  async function replaceFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const entry = replacingEntry;
    replacingEntry = null;
    if (!entry || !file) return;
    if (!validateSelectedFile(file)) return;
    try {
      await runProviderOperation((signal) => provider.replace(
        entry.id,
        { source: 'upload', data: file },
        { signal },
      ));
      await refreshTree();
    }
    catch (error) {
      report(error);
    }
  }

  /**
   * Replaces a file with content supplied by the active editor.
   * @param {string} id File identifier.
   * @param {File|Blob|string} data Edited file content.
   * @returns {Promise<void>} Completes after provider replacement.
   */
  async function replaceEdited(id, data) {
    if (disposed) throw new Error('File explorer is disposed.');
    if (!enabledOperations.replace) throw new Error('File replacement is not enabled.');
    const entry = findEntry(id);
    if (!entry || entry.type !== 'file') throw new Error(`File "${id}" is not loaded in this explorer.`);
    await runProviderOperation((signal) => provider.replace(
      id,
      { source: 'edited-content', data },
      { signal },
    ));
    await refreshTree();
  }

  /**
   * Validates a file against configured upload types and size.
   * @param {File} file Candidate file.
   * @returns {boolean} Whether the file is accepted.
   */
  function validateSelectedFile(file) {
    if (!matchesAccept(file, accept)) {
      report(new Error(translate('fileTypeNotAllowed').replace('{name}', file.name)));
      return false;
    }
    if (maxFileSize !== undefined && file.size > maxFileSize) {
      report(new Error(translate('fileTooLarge').replace('{name}', file.name)));
      return false;
    }
    return true;
  }

  /**
   * Uploads one or more files into the root folder.
   * @param {Event} event File input change event.
   * @returns {Promise<void>} Completes after uploads.
   */
  async function uploadFiles(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length) return;
    if (files.some((file) => !validateSelectedFile(file))) return;
    try {
      const folderId = currentTargetFolder();
      for (const file of files) {
        await runProviderOperation((signal) => provider.createFile(folderId, file, { signal }));
      }
      await refreshTree();
    }
    catch (error) {
      report(error);
    }
  }

  /**
   * Runs a provider mutation with a tracked abort signal.
   * @param {Function} operation Provider call.
   * @returns {Promise<*>} Provider result.
   */
  async function runProviderOperation(operation) {
    const controller = createController();
    try {
      const result = await operation(controller.signal);
      controller.signal.throwIfAborted();
      return result;
    }
    finally {
      operationControllers.delete(controller);
    }
  }

  /**
   * Runs an event operation and reports synchronous or asynchronous failures.
   * @param {Function} operation Operation callback.
   * @returns {Promise<void>} Operation completion.
   */
  async function runAction(operation) {
    try {
      await operation();
    }
    catch (error) {
      report(error);
    }
  }

  /**
   * Executes a custom per-entry operation with a disposable signal.
   * @param {Object} operation Custom operation definition.
   * @param {Object} entry Entry metadata.
   * @returns {Promise<void>} Custom operation completion.
   */
  async function executeCustomOperation(operation, entry) {
    const controller = createController();
    try {
      await operation.execute({ ...entry }, {
        signal: controller.signal,
        replace: (data) => replaceEdited(entry.id, data),
      });
    }
    finally {
      operationControllers.delete(controller);
    }
  }

  /**
   * Handles tree keyboard navigation and folder expansion.
   * @param {KeyboardEvent} event Keyboard event.
   */
  function handleTreeKeydown(event) {
    const current = event.target.closest?.('.edy-file-explorer__entry-name');
    if (!current) return;
    const visible = [...tree.querySelectorAll('.edy-file-explorer__entry-name')]
      .filter((button) => !button.closest('[hidden]'));
    const index = visible.indexOf(current);
    let next;
    if (event.key === 'ArrowDown') next = visible[index + 1];
    else if (event.key === 'ArrowUp') next = visible[index - 1];
    else if (event.key === 'Home') next = visible[0];
    else if (event.key === 'End') next = visible.at(-1);
    else if (event.key === 'ArrowRight') {
      const entry = findEntry(current.dataset.entryId);
      if (entry?.type === 'folder' && !expanded.has(entry.id)) toggleFolder(entry);
      else next = current.closest('[role="treeitem"]')?.querySelector('.edy-file-explorer__children .edy-file-explorer__entry-name');
    }
    else if (event.key === 'ArrowLeft') {
      const row = current.closest('[role="treeitem"]');
      const entry = findEntry(current.dataset.entryId);
      if (entry?.type === 'folder' && expanded.has(entry.id)) {
        expanded.delete(entry.id);
        render();
      }
      else next = row.parentElement.closest('[role="treeitem"]')?.querySelector('.edy-file-explorer__entry-name');
    }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      current.click();
      return;
    }
    else return;
    event.preventDefault();
    next?.focus();
  }

  /**
   * Releases pending requests, click timers, and viewer resources owned by the tree.
   */
  function dispose() {
    if (disposed) return;
    closeActiveMenu();
    disposed = true;
    for (const controller of loadControllers.values()) controller?.abort?.();
    for (const controller of operationControllers) controller.abort();
    for (const timer of clickTimers) clearTimeout(timer);
    operationControllers.clear();
    clickTimers.clear();
    tree.removeEventListener('keydown', handleTreeKeydown);
  }

  fileInput.addEventListener('change', uploadFiles);
  replaceInput.addEventListener('change', replaceFile);
  tree.addEventListener('keydown', handleTreeKeydown);
  tree.addEventListener('dragover', (event) => {
    if (!event.target.closest('.edy-file-explorer__entry')) event.preventDefault();
  });
  tree.addEventListener('drop', (event) => {
    if (event.target.closest('.edy-file-explorer__entry')) return;
    event.preventDefault();
    const source = findEntry(event.dataTransfer?.getData('text/plain')) ?? movingEntry;
    if (source) performMove(source, null);
  });
  root.append(toolbar, tree, status, fileInput, replaceInput);
  render();
  loadFolder(null);
  return { element: root, dispose, replaceEdited };
}

/**
 * Registers the explorer as a primary-sidebar activity and connects Edy's viewers.
 * @param {Object} context Edy extension context.
 * @param {Object} options Activity, provider, and explorer options.
 * @returns {{dispose: Function}} View registration.
 */
export function registerFileExplorer(context, {
  id = 'files',
  title = context.translate('files'),
  icon = 'folder',
  provider,
  ...options
} = {}) {
  if (!context?.views || typeof context.views.register !== 'function' ||
      typeof context.translate !== 'function' || !context.documents ||
      typeof context.documents.open !== 'function' ||
      typeof context.documents.activate !== 'function') {
    throw new TypeError('Registering a file explorer requires an Edy extension context.');
  }
  validateExplorerOptions({ provider, translate: context.translate, ...options });
  const documentIds = new Map();
  const viewDestination = options.viewDestination ?? 'editor';
  return context.views.register(id, {
    title,
    icon,
    location: 'primary',
    render: () => createFileExplorer({
      provider,
      translate: context.translate,
      confirm: context.ui.confirm,
      onError: (error) => context.notifications.error(error),
      ...options,
      viewDestination,
      openInEditor: ({ item, render }) => {
        const documentId = documentIds.get(item.id) ?? `file-${encodeURIComponent(item.id)}`;
        if (context.documents.activate(documentId)) return;
        context.documents.open(documentId, { title: item.name, render });
        documentIds.set(item.id, documentId);
      },
    }),
  });
}

/**
 * Validates explorer configuration and required provider methods.
 * @param {Object} options Explorer options.
 */
function validateExplorerOptions({
  provider,
  translate,
  operations = {},
  readOnly = false,
  accept = [],
  maxFileSize,
  multiple = false,
  clickBehavior = 'select',
  viewDestination = 'editor',
  canView,
  onSelect,
  onOpen,
  openInEditor,
  customOperations = [],
  confirm = async () => true,
  onError = console.error,
}) {
  const operationKeys = [...mutationOperations, 'view'];
  if (!provider || typeof provider.list !== 'function' || typeof provider.getUrl !== 'function' ||
      (provider instanceof FileExplorerProvider &&
       (provider.list === FileExplorerProvider.prototype.list ||
        provider.getUrl === FileExplorerProvider.prototype.getUrl))) {
    throw new TypeError('File explorer providers must implement list() and getUrl().');
  }
  if (provider.capabilities !== undefined &&
      (!provider.capabilities || typeof provider.capabilities !== 'object' ||
       Object.keys(provider.capabilities).some((key) => !mutationOperations.includes(key)) ||
       mutationOperations.some((operation) => provider.capabilities[operation] !== undefined &&
         typeof provider.capabilities[operation] !== 'boolean'))) {
    throw new TypeError('Provider capabilities must use boolean operation flags.');
  }
  if (mutationOperations.some((operation) =>
    provider.capabilities?.[operation] === true &&
    (typeof provider[operation] !== 'function' ||
     (provider instanceof FileExplorerProvider &&
      provider[operation] === FileExplorerProvider.prototype[operation])))) {
    throw new TypeError('Enabled provider capabilities must implement their operation methods.');
  }
  if (typeof translate !== 'function' || !operations || typeof operations !== 'object' ||
      Array.isArray(operations) ||
      Object.keys(operations).some((operation) => !operationKeys.includes(operation)) ||
      Object.values(operations).some((enabled) => typeof enabled !== 'boolean') ||
      typeof readOnly !== 'boolean' || !Array.isArray(accept) ||
      accept.some((type) => typeof type !== 'string' || !type.trim()) ||
      (maxFileSize !== undefined && (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0)) ||
      typeof multiple !== 'boolean' || !['select', 'open'].includes(clickBehavior) ||
      !['editor', 'dialog'].includes(viewDestination) ||
      (canView !== undefined && typeof canView !== 'function') ||
      (onSelect !== undefined && typeof onSelect !== 'function') ||
      (onOpen !== undefined && typeof onOpen !== 'function') ||
      (openInEditor !== undefined && typeof openInEditor !== 'function') ||
      !Array.isArray(customOperations) || customOperations.some((operation) =>
        !operation || typeof operation.id !== 'string' || !operation.id.trim() ||
        typeof operation.label !== 'string' || !operation.label.trim() ||
        typeof operation.execute !== 'function' ||
        (operation.icon !== undefined && !resolveIcon(operation.icon)) ||
        (operation.visible !== undefined && typeof operation.visible !== 'function') ||
        (operation.enabled !== undefined && typeof operation.enabled !== 'function')) ||
      new Set(customOperations.map((operation) => operation.id)).size !== customOperations.length ||
      typeof confirm !== 'function' || typeof onError !== 'function') {
    throw new TypeError('Invalid file explorer options.');
  }
}

/**
 * Determines whether the default viewer supports an entry's declared MIME type.
 * @param {Object} item File entry.
 * @returns {boolean} Whether Edy has a safe built-in viewer.
 */
function hasDefaultViewer(item) {
  const mimeType = item.mimeType?.toLowerCase() ?? '';
  return ['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType) ||
    mimeType.startsWith('audio/') || mimeType.startsWith('video/') ||
    mimeType === 'application/pdf' || textViewTypes.has(mimeType);
}

/**
 * Checks a selected file against configured MIME patterns and extensions.
 * @param {File} file Candidate file.
 * @param {string[]} accept Accepted MIME patterns or extensions.
 * @returns {boolean} Whether the file is accepted.
 */
function matchesAccept(file, accept) {
  if (!accept.length) return true;
  const name = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  return accept.some((pattern) => {
    const accepted = pattern.toLowerCase();
    if (accepted.startsWith('.')) return name.endsWith(accepted);
    if (accepted.endsWith('/*')) return mimeType.startsWith(accepted.slice(0, -1));
    return mimeType === accepted;
  });
}

/**
 * Creates a stable key for folder request state.
 * @param {string|null} folderId Folder identifier.
 * @returns {string} Map key.
 */
function folderKey(folderId) {
  return folderId === null ? rootFolderKey : folderId;
}

/**
 * Formats a byte count for display.
 * @param {number} size File size in bytes.
 * @returns {string} Human-readable size.
 */
function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
