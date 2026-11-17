/**
 * @file Provides an in-memory file provider for the sample extension.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { FileExplorerProvider } from '../ui/file-explorer.js';

/**
 * Creates a simulated project file provider without filesystem or network access.
 */
export class DemoFileExplorerProvider extends FileExplorerProvider {
  /**
   * Initializes a small in-memory project tree.
   */
  constructor() {
    super({ createFile: true, createFolder: true, rename: true, delete: true, move: true, replace: true });
    this.entries = new Map([
      ['demo-src', { id: 'demo-src', name: 'src', type: 'folder', parentId: null }],
      ['demo-assets', { id: 'demo-assets', name: 'assets', type: 'folder', parentId: null }],
      ['demo-readme', {
        id: 'demo-readme', name: 'README.md', type: 'file', parentId: null,
        size: 2048, mimeType: 'text/markdown',
      }],
      ['demo-index', {
        id: 'demo-index', name: 'index.html', type: 'file', parentId: 'demo-src',
        size: 4096, mimeType: 'text/html',
      }],
      ['demo-style', {
        id: 'demo-style', name: 'styles.css', type: 'file', parentId: 'demo-src',
        size: 1536, mimeType: 'text/css',
      }],
      ['demo-logo', {
        id: 'demo-logo', name: 'logo.png', type: 'file', parentId: 'demo-assets',
        size: 8192, mimeType: 'image/png',
      }],
    ]);
    this.nextId = 1;
  }

  /**
   * Lists entries in the root or a simulated folder.
   * @param {string|null} folderId Opaque folder identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Array<Object>>} Copies of the folder entries.
   */
  async list(folderId, { signal } = {}) {
    checkAbort(signal);
    this.requireFolder(folderId);
    return [...this.entries.values()]
      .filter((entry) => entry.parentId === folderId)
      .map((entry) => ({ ...entry }));
  }

  /**
   * Adds simulated metadata for a selected browser file without reading its contents.
   * @param {string|null} folderId Destination folder identifier.
   * @param {File} file Selected file metadata.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Object>} The simulated entry.
   */
  async createFile(folderId, file, { signal } = {}) {
    checkAbort(signal);
    this.requireFolder(folderId);
    if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size) ||
        file.size < 0 || (file.type !== undefined && typeof file.type !== 'string')) {
      throw new TypeError('Demo uploads require a file name, size, and optional MIME type.');
    }
    return this.addEntry({
      name: this.validateName(file.name),
      type: 'file',
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      parentId: folderId,
    });
  }

  /**
   * Adds a simulated folder.
   * @param {string|null} parentId Parent folder identifier.
   * @param {string} name Folder name.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Object>} The simulated folder entry.
   */
  async createFolder(parentId, name, { signal } = {}) {
    checkAbort(signal);
    this.requireFolder(parentId);
    return this.addEntry({
      name: this.validateName(name),
      type: 'folder',
      parentId,
    });
  }

  /**
   * Renames an in-memory entry without changing its stable identifier.
   * @param {string} id Opaque entry identifier.
   * @param {string} name New name.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Object>} The renamed entry.
   */
  async rename(id, name, { signal } = {}) {
    checkAbort(signal);
    const entry = this.requireEntry(id);
    const renamed = { ...entry, name: this.validateName(name) };
    this.assertUniqueName(renamed.parentId, renamed.name, id);
    this.entries.set(id, renamed);
    return { ...renamed };
  }

  /**
   * Deletes an entry and all of its descendants from the in-memory tree.
   * @param {string} id Opaque entry identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<void>} Resolves after deletion.
   */
  async delete(id, { signal } = {}) {
    checkAbort(signal);
    const entry = this.requireEntry(id);
    const pending = [entry.id];
    while (pending.length) {
      const currentId = pending.pop();
      for (const child of this.entries.values()) {
        if (child.parentId === currentId) pending.push(child.id);
      }
      this.entries.delete(currentId);
    }
  }

  /**
   * Moves an entry while preserving its identifier and descendants.
   * @param {string} id Opaque entry identifier.
   * @param {string|null} destinationFolderId Target folder identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Object>} The moved entry.
   */
  async move(id, destinationFolderId, { signal } = {}) {
    checkAbort(signal);
    const entry = this.requireEntry(id);
    this.requireFolder(destinationFolderId);
    if (entry.type === 'folder') {
      let ancestorId = destinationFolderId;
      while (ancestorId !== null) {
        if (ancestorId === id) throw new Error('A folder cannot be moved into itself or a descendant.');
        ancestorId = this.requireEntry(ancestorId).parentId;
      }
    }
    this.assertUniqueName(destinationFolderId, entry.name, id);
    const moved = { ...entry, parentId: destinationFolderId };
    this.entries.set(id, moved);
    return { ...moved };
  }

  /**
   * Replaces file metadata without reading or persisting its contents.
   * @param {string} id Opaque file identifier.
   * @param {{source: 'upload'|'edited-content', data: File|Blob|string}} replacement Replacement data.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<Object>} Updated simulated metadata.
   */
  async replace(id, replacement, { signal } = {}) {
    checkAbort(signal);
    const entry = this.requireEntry(id);
    if (entry.type !== 'file') throw new TypeError('Only simulated files can be replaced.');
    const data = replacement?.data;
    if (!replacement || !['upload', 'edited-content'].includes(replacement.source) ||
        (typeof data !== 'string' && (!data || !Number.isFinite(data.size) || data.size < 0 ||
          (data.type !== undefined && typeof data.type !== 'string')))) {
      throw new TypeError('Demo replacement requires upload or edited-content metadata.');
    }
    const updated = {
      ...entry,
      size: typeof data === 'string' ? new TextEncoder().encode(data).length : data.size,
      mimeType: typeof data === 'string' ? entry.mimeType : data.type || entry.mimeType,
    };
    this.entries.set(id, updated);
    return { ...updated };
  }

  /**
   * Returns a reserved dummy URL for a simulated file.
   * @param {string} id Opaque file identifier.
   * @param {{signal?: AbortSignal}} options Request options.
   * @returns {Promise<string>} Dummy URL.
   */
  async getUrl(id, { signal } = {}) {
    checkAbort(signal);
    const entry = this.requireEntry(id);
    if (entry.type !== 'file') throw new TypeError('Only simulated files have URLs.');
    return `https://example.invalid/demo-files/${encodeURIComponent(id)}`;
  }

  /**
   * Adds a unique simulated entry.
   * @param {Object} entry Entry metadata.
   * @returns {Object} Stored entry copy.
   */
  addEntry(entry) {
    this.assertUniqueName(entry.parentId, entry.name);
    const id = `demo-entry-${this.nextId++}`;
    const stored = { id, ...entry };
    this.entries.set(id, stored);
    return { ...stored };
  }

  /**
   * Retrieves an entry or rejects an unknown identifier.
   * @param {string} id Entry identifier.
   * @returns {Object} Stored entry.
   */
  requireEntry(id) {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Demo entry "${id}" does not exist.`);
    return entry;
  }

  /**
   * Validates a folder identifier and returns its entry when non-root.
   * @param {string|null} id Folder identifier or root.
   * @returns {Object|null} Folder entry or null for root.
   */
  requireFolder(id) {
    if (id === null) return null;
    const folder = this.requireEntry(id);
    if (folder.type !== 'folder') throw new TypeError(`Demo entry "${id}" is not a folder.`);
    return folder;
  }

  /**
   * Validates a name and prevents path-like names.
   * @param {string} name Candidate name.
   * @returns {string} Trimmed name.
   */
  validateName(name) {
    if (typeof name !== 'string' || !name.trim() || /[/\\]/u.test(name)) {
      throw new TypeError('Demo entry names must be non-empty and cannot contain slashes.');
    }
    return name.trim();
  }

  /**
   * Rejects duplicate names among siblings.
   * @param {string|null} parentId Parent folder identifier.
   * @param {string} name Candidate name.
   * @param {string} excludedId Entry identifier to exclude during rename.
   */
  assertUniqueName(parentId, name, excludedId = null) {
    const normalizedName = name.toLowerCase();
    for (const entry of this.entries.values()) {
      if (entry.id !== excludedId && entry.parentId === parentId &&
          entry.name.toLowerCase() === normalizedName) {
        throw new Error(`Demo entry "${name}" already exists in this folder.`);
      }
    }
  }
}

/**
 * Throws the abort reason before completing a simulated provider operation.
 * @param {AbortSignal|undefined} signal Request signal.
 */
function checkAbort(signal) {
  signal?.throwIfAborted();
}
