/**
 * @file Provides reusable accessible DOM controls and declarative form builders.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createIconElement, resolveIcon } from './icons.js';

/** @type {number} Sequence for unique labels and descriptions. */
let controlSequence = 0;

/**
 * Creates an accessible action button.
 * @param {{label: string, onClick?: Function, disabled?: boolean, icon?: string, variant?: string}} options Button options.
 * @returns {HTMLButtonElement} Button element.
 */
export function createButton({ label, onClick, disabled = false, icon, variant = 'secondary' }) {
  if (!['primary', 'secondary', 'danger', 'ghost'].includes(variant)) {
    throw new TypeError(`Unsupported button variant "${variant}".`);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `edy-button edy-button--${variant}`;
  button.disabled = disabled;
  button.textContent = icon ? `${icon} ${label}` : label;
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  return button;
}

/**
 * Creates a labeled group of independently actionable buttons.
 * @param {{label: string, buttons: Array}} options Group configuration.
 * @returns {HTMLElement} Button group.
 */
export function createButtonGroup({ label, buttons }) {
  if (typeof label !== 'string' || !label.trim() || !Array.isArray(buttons) || !buttons.length) {
    throw new TypeError('Button groups require a label and buttons.');
  }
  const group = document.createElement('div');
  group.className = 'edy-button-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  for (const options of buttons) {
    if (!options || typeof options.label !== 'string' || typeof options.onClick !== 'function') {
      throw new TypeError('Group buttons require a label and onClick.');
    }
    group.append(createButton(options));
  }
  return group;
}

/**
 * Opens a modal containing extension-provided content and restores focus on close.
 * @param {{title: string, content: Node, closeLabel: string, container: HTMLElement|ShadowRoot}} options Dialog options.
 * @returns {HTMLDialogElement} Open dialog.
 */
export function openDialog({ title, content, closeLabel, container }) {
  if (typeof title !== 'string' || !title.trim() || !(content instanceof Node) ||
      typeof closeLabel !== 'string' || !closeLabel.trim() || !container?.append) {
    throw new TypeError('Dialogs require a title, DOM content, close label and container.');
  }
  const root = container.getRootNode();
  const previous = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'edy-dialog';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const headingId = `edy-dialog-${++controlSequence}`;
  heading.id = headingId;
  dialog.setAttribute('aria-labelledby', headingId);
  const close = createButton({ label: closeLabel, onClick: () => dialog.close() });
  const formActions = content instanceof HTMLFormElement && content.classList.contains('edy-form')
    ? content.querySelector(':scope > .edy-form__actions')
    : null;
  dialog.append(heading, content);
  if (formActions) {
    formActions.append(close);
  }
  else {
    dialog.append(close);
  }
  container.append(dialog);
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  }, { once: true });
  dialog.showModal();
  close.focus();
  return dialog;
}

/**
 * Creates a safe action link.
 * @param {{label: string, href: string, onClick?: Function}} options Link options.
 * @returns {HTMLAnchorElement} Action link.
 */
export function createLink({ label, href, onClick }) {
  const url = new URL(href, document.baseURI);
  if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
    throw new TypeError(`Links using the "${url.protocol}" protocol are not allowed.`);
  }
  const link = document.createElement('a');
  link.className = 'edy-link';
  link.href = url.href;
  link.textContent = label;
  if (onClick) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      onClick(event);
    });
  }
  return link;
}

/**
 * Creates a concise status badge.
 * @param {{label: string, tone?: string}} options Badge options.
 * @returns {HTMLElement} Badge element.
 */
export function createBadge({ label, tone = 'neutral' }) {
  if (!['neutral', 'info', 'success', 'warning', 'danger'].includes(tone)) {
    throw new TypeError(`Unsupported badge tone "${tone}".`);
  }
  const badge = document.createElement('span');
  badge.className = `edy-badge edy-badge--${tone}`;
  badge.textContent = label;
  return badge;
}

/**
 * Creates a semantic informational or error message.
 * @param {{message: string, type?: string}} options Message options.
 * @returns {HTMLElement} Message element.
 */
export function createMessage({ message, type = 'info' }) {
  if (!['info', 'success', 'warning', 'error'].includes(type)) {
    throw new TypeError(`Unsupported message type "${type}".`);
  }
  const element = document.createElement('div');
  element.className = `edy-message edy-message--${type}`;
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  element.textContent = message;
  return element;
}

/**
 * Creates a labeled progress indicator.
 * @param {{label: string, value?: number, max?: number, indeterminate?: boolean}} options Progress options.
 * @returns {HTMLElement} Progress indicator.
 */
export function createProgress({ label, value = 0, max = 100, indeterminate = false }) {
  if (!Number.isFinite(max) || max <= 0 ||
      (!indeterminate && (!Number.isFinite(value) || value < 0 || value > max))) {
    throw new RangeError('Progress value must be within its positive maximum.');
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'edy-progress';
  const text = document.createElement('span');
  text.textContent = label;
  const progress = document.createElement('progress');
  progress.max = max;
  if (!indeterminate) {
    progress.value = value;
  }
  progress.setAttribute('aria-label', label);
  wrapper.append(text, progress);
  return wrapper;
}

/**
 * Creates a semantic separator.
 * @param {'horizontal'|'vertical'} orientation Separator orientation.
 * @returns {HTMLElement} Separator element.
 */
export function createSeparator(orientation = 'horizontal') {
  if (!['horizontal', 'vertical'].includes(orientation)) {
    throw new TypeError(`Unsupported separator orientation "${orientation}".`);
  }
  const separator = document.createElement('hr');
  separator.className = `edy-separator edy-separator--${orientation}`;
  separator.setAttribute('aria-orientation', orientation);
  return separator;
}

function createIconButton(label, pathData, onClick, disabled = false) {
  const button = createButton({ label, onClick, disabled });
  button.textContent = '';
  button.classList.add('edy-form__icon-button');
  button.setAttribute('aria-label', label);
  button.title = label;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.append(path);
  button.append(svg);
  return button;
}

const formIcons = {
  add: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  up: 'M12 5l7 7-1.4 1.4-4.6-4.6V19h-2V8.8l-4.6 4.6L5 12z',
  down: 'M11 5h2v10.2l4.6-4.6L19 12l-7 7-7-7 1.4-1.4 4.6 4.6z',
  remove: 'M6 7h12l-1 13H7L6 7zm2-3h8l1 2H7l1-2z',
};

/**
 * Builds a validated form from a declarative field schema.
 * @param {{fields: Array, onSubmit: Function, onCancel?: Function, translate: Function, onError?: Function}} options Form options.
 * @returns {HTMLFormElement & {dispose: Function}} Accessible form with disposal.
 */
export function createForm({ fields, onSubmit, onCancel, translate, onError = console.error }) {
  const form = document.createElement('form');
  form.className = 'edy-form';
  form.noValidate = true;
  const formId = `edy-form-${++controlSequence}`;
  const controls = new Map();
  const supportedTypes = new Set([
    'text', 'search', 'email', 'url', 'tel', 'password', 'number', 'range',
    'date', 'time', 'datetime-local', 'month', 'week', 'color',
    'textarea', 'select', 'checkbox', 'radio', 'switch', 'tinymce', 'codemirror', 'icon', 'sortable', 'table', 'asset',
  ]);
  let disposed = false;
  const definitions = [];
  for (const field of fields) {
    if (field?.type !== 'group') {
      definitions.push({ field, container: form, group: null });
      continue;
    }
    if (typeof field.label !== 'string' || !field.label.trim() || !Array.isArray(field.fields)) {
      throw new TypeError('Form groups require a label and an array of fields.');
    }
    const group = document.createElement('details');
    group.className = 'edy-form__group';
    group.open = !field.collapsed;
    const summary = document.createElement('summary');
    summary.textContent = field.label;
    const container = document.createElement('div');
    container.className = 'edy-form__group-fields';
    group.append(summary, container);
    definitions.push({ groupElement: group });
    for (const child of field.fields) {
      definitions.push({ field: child, container, group });
    }
  }
  for (const { field, container, group, groupElement } of definitions) {
    if (groupElement) {
      form.append(groupElement);
      continue;
    }
    if (!field || typeof field.name !== 'string' || field.name.trim() === '' ||
        controls.has(field.name) || !supportedTypes.has(field.type ?? 'text')) {
      throw new TypeError('Form fields require unique names and supported input types.');
    }
    let wrapper = document.createElement('div');
    wrapper.className = 'edy-form__field';
    const inputId = `${formId}-${field.name}`;

    let input;
    let inputs = [];
    let editorState;
    if (field.type === 'asset') {
      const multiple = field.multiple ?? false;
      const accept = field.accept ?? [];
      const initial = field.value ?? [];
      if (typeof field.pick !== 'function' || typeof multiple !== 'boolean' ||
          !Array.isArray(accept) || accept.some((type) => typeof type !== 'string' || !type.trim()) ||
          !Array.isArray(initial) || initial.some((id) => typeof id !== 'string' || !id.trim()) ||
          new Set(initial).size !== initial.length || (!multiple && initial.length > 1) ||
          (field.resolvePreview !== undefined && typeof field.resolvePreview !== 'function') ||
          (field.allowClear !== undefined && typeof field.allowClear !== 'boolean')) {
        throw new TypeError(`Asset field "${field.name}" requires a picker, valid options, and an array of unique IDs.`);
      }
      wrapper = document.createElement('fieldset');
      wrapper.className = 'edy-form__field edy-form__field--asset';
      wrapper.tabIndex = -1;
      const legend = document.createElement('legend');
      legend.textContent = field.label ?? translate(field.name);
      const selected = document.createElement('ul');
      selected.className = 'edy-form__assets';
      selected.setAttribute('aria-live', 'polite');
      const preview = document.createElement('div');
      preview.className = 'edy-form__asset-preview';
      preview.setAttribute('aria-live', 'polite');
      const actions = document.createElement('div');
      actions.className = 'edy-form__asset-actions';
      const choose = createButton({ label: translate('assetChoose'), disabled: Boolean(field.disabled) });
      const clear = createButton({ label: translate('assetClear'), disabled: Boolean(field.disabled) });
      clear.hidden = field.allowClear === false;
      const error = document.createElement('span');
      error.className = 'edy-form__error';
      error.id = `${inputId}-error`;
      error.setAttribute('aria-live', 'polite');
      choose.setAttribute('aria-errormessage', error.id);
      const state = { ids: [...initial], names: new Map(), pending: false, controller: null,
        previewController: null, previewDispose: null };
      wrapper.append(legend, selected, preview);
      if (field.help) {
        const help = document.createElement('span');
        help.className = 'edy-form__help';
        help.id = `${inputId}-help`;
        help.textContent = field.help;
        wrapper.setAttribute('aria-describedby', help.id);
        wrapper.append(help);
      }
      actions.append(choose, clear);
      wrapper.append(actions, error);
      container.append(wrapper);
      controls.set(field.name, { field, input: choose, inputs: [choose], error, wrapper, group, assetState: state,
        focusTarget: () => field.disabled || state.pending ? wrapper : choose });
      function releasePreview() {
        state.previewController?.abort();
        state.previewController = null;
        const release = state.previewDispose;
        state.previewDispose = null;
        preview.replaceChildren();
        if (release) {
          try { release(); }
          catch (failure) { onError(failure); }
        }
      }
      state.closePreview = releasePreview;
      async function showPreview(id) {
        releasePreview();
        const controller = new AbortController();
        state.previewController = controller;
        const status = document.createElement('span');
        status.textContent = translate('assetPreviewLoading');
        const close = createButton({ label: translate('assetPreviewClose'), onClick: releasePreview });
        preview.append(status, close);
        let result;
        let installed = false;
        try {
          result = await field.resolvePreview({ id, signal: controller.signal });
          if (controller.signal.aborted || disposed || !form.isConnected) return;
          if (result === null) {
            status.textContent = translate('assetPreviewUnsupported');
            return;
          }
          if (!result || typeof result.url !== 'string' || typeof result.mimeType !== 'string' ||
              (result.dispose !== undefined && typeof result.dispose !== 'function')) {
            throw new TypeError('Asset preview must return null or an object with url, mimeType and optional dispose.');
          }
          const url = new URL(result.url, document.baseURI);
          if (!['http:', 'https:', 'blob:'].includes(url.protocol) || url.username || url.password) {
            throw new TypeError('Asset preview URL must use HTTP, HTTPS or blob without credentials.');
          }
          const mime = result.mimeType.toLowerCase();
          let media;
          if (['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'].includes(mime)) {
            media = document.createElement('img');
            media.alt = state.names.get(id) ?? id;
          }
          else if (['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'].includes(mime)) {
            media = document.createElement('audio');
            media.controls = true;
          }
          else if (['video/mp4', 'video/webm', 'video/ogg'].includes(mime)) {
            media = document.createElement('video');
            media.controls = true;
          }
          else if (mime === 'application/pdf') {
            media = document.createElement('iframe');
            media.title = `${translate('assetPreview')}: ${state.names.get(id) ?? id}`;
            media.setAttribute('sandbox', '');
          }
          else {
            status.textContent = translate('assetPreviewUnsupported');
            return;
          }
          media.setAttribute('referrerpolicy', 'no-referrer');
          media.addEventListener('error', () => {
            if (state.previewController !== controller || controller.signal.aborted) return;
            status.textContent = translate('assetPreviewFailed');
            onError(new Error(`Unable to load preview for asset "${id}".`));
          });
          media.src = url.href;
          preview.replaceChildren(media, close, status);
          status.textContent = '';
          state.previewDispose = result.dispose;
          installed = true;
        }
        catch (failure) {
          if (!controller.signal.aborted && !disposed && form.isConnected) {
            status.textContent = translate('assetPreviewFailed');
            onError(failure);
          }
        }
        finally {
          if (!installed && typeof result?.dispose === 'function') {
            try { result.dispose(); }
            catch (failure) { onError(failure); }
          }
        }
      }
      function renderAssets() {
        selected.replaceChildren();
        if (!state.ids.length) {
          const item = document.createElement('li');
          item.textContent = translate('assetNone');
          selected.append(item);
        }
        for (const id of state.ids) {
          const item = document.createElement('li');
          item.textContent = state.names.get(id) ?? id;
          if (field.resolvePreview) {
            const button = createButton({ label: translate('assetPreview'), onClick: () => showPreview(id) });
            button.setAttribute('aria-label', `${translate('assetPreview')}: ${state.names.get(id) ?? id}`);
            item.append(button);
          }
          selected.append(item);
        }
        choose.disabled = Boolean(field.disabled) || state.pending;
        clear.disabled = Boolean(field.disabled) || state.pending || !state.ids.length;
      }
      state.cancel = () => {
        state.controller?.abort();
        state.controller = null;
        state.pending = false;
        releasePreview();
        renderAssets();
      };
      choose.addEventListener('click', async () => {
        if (state.pending || disposed || field.disabled || wrapper.hidden) return;
        const controller = new AbortController();
        state.controller = controller;
        state.pending = true;
        state.failure = false;
        renderAssets();
        validateField(field.name);
        try {
          const result = await field.pick({ accept: [...accept], multiple, currentValue: [...state.ids], signal: controller.signal });
          if (controller.signal.aborted || disposed || !form.isConnected) return;
          if (result !== null) {
            if (!Array.isArray(result) || (!multiple && result.length > 1) ||
                result.some((asset) => !asset || typeof asset.id !== 'string' || !asset.id.trim() ||
                  typeof asset.name !== 'string' || !asset.name.trim() ||
                  typeof asset.mimeType !== 'string' || !asset.mimeType.trim()) ||
                new Set(result.map((asset) => asset.id)).size !== result.length) {
              throw new TypeError('Asset picker must return null or unique records with id, name and mimeType.');
            }
            state.ids = result.map((asset) => asset.id);
            state.names = new Map(result.map((asset) => [asset.id, asset.name]));
            releasePreview();
          }
        }
        catch (failure) {
          if (!controller.signal.aborted) {
            state.failure = true;
            onError(failure);
          }
        }
        finally {
          if (state.controller === controller) {
            state.controller = null;
            state.pending = false;
            renderAssets();
            if (!disposed && form.isConnected) {
              validateField(field.name);
              updateVisibility();
            }
          }
        }
      });
      clear.addEventListener('click', () => {
        releasePreview();
        state.ids = [];
        state.names.clear();
        state.failure = false;
        renderAssets();
        validateField(field.name);
        updateVisibility();
      });
      renderAssets();
      continue;
    }
    if (field.type === 'sortable') {
      if (field.value !== undefined && (!Array.isArray(field.value) ||
          field.value.some((value) => typeof value !== 'string'))) {
        throw new TypeError(`Sortable field "${field.name}" requires an array of strings.`);
      }
      if ((field.editText !== undefined && typeof field.editText !== 'boolean') ||
          (field.allowAdd !== undefined && typeof field.allowAdd !== 'boolean') ||
          (field.newItem !== undefined && typeof field.newItem !== 'string')) {
        throw new TypeError('Sortable editText and allowAdd must be booleans and newItem must be a string.');
      }
      wrapper = document.createElement('fieldset');
      wrapper.className = 'edy-form__field edy-form__field--sortable';
      const legend = document.createElement('legend');
      legend.textContent = field.label ?? translate(field.name);
      const list = document.createElement('ol');
      list.className = 'edy-form__sortable';
      const add = createIconButton(translate('listAdd'), formIcons.add, undefined, Boolean(field.disabled));
      add.hidden = field.allowAdd === false;
      const error = document.createElement('span');
      error.className = 'edy-form__error';
      error.id = `${inputId}-error`;
      error.setAttribute('aria-live', 'polite');
      add.setAttribute('aria-errormessage', error.id);
      wrapper.setAttribute('aria-errormessage', error.id);
      const state = { values: [...(field.value ?? [])] };
      wrapper.tabIndex = -1;
      wrapper.append(legend, list);
      if (field.help) {
        const help = document.createElement('span');
        help.className = 'edy-form__help';
        help.id = `${inputId}-help`;
        help.textContent = field.help;
        wrapper.setAttribute('aria-describedby', help.id);
        wrapper.append(help);
      }
      wrapper.append(add, error);
      container.append(wrapper);
      controls.set(field.name, { field, input: add, inputs: [add], error, wrapper, group, sortableState: state,
        focusTarget: () => field.disabled ? wrapper : (list.querySelector('input') ?? (add.hidden ? wrapper : add)) });
      function renderList(focusIndex) {
        list.replaceChildren();
        state.values.forEach((value, index) => {
          const row = document.createElement('li');
          const item = document.createElement('input');
          item.type = 'text';
          item.value = value;
          item.disabled = Boolean(field.disabled);
          item.readOnly = field.editText === false;
          item.setAttribute('aria-label', `${legend.textContent} ${index + 1}`);
          item.setAttribute('aria-errormessage', error.id);
          item.addEventListener('input', () => {
            state.values[index] = item.value;
            validateField(field.name);
            updateVisibility();
          });
          const action = (key, icon, disabled, callback) => createIconButton(
            `${translate(key)}: ${legend.textContent} ${index + 1}`, icon, callback, Boolean(field.disabled) || disabled);
          const move = (offset) => {
            const target = index + offset;
            [state.values[index], state.values[target]] = [state.values[target], state.values[index]];
            renderList(target);
            validateField(field.name);
            updateVisibility();
          };
          row.append(item,
            action('listMoveUp', formIcons.up, index === 0, () => move(-1)),
            action('listMoveDown', formIcons.down, index === state.values.length - 1, () => move(1)),
            action('listRemove', formIcons.remove, false, () => {
              state.values.splice(index, 1);
              renderList(Math.min(index, state.values.length - 1));
              if (!state.values.length) (add.hidden ? wrapper : add).focus();
              validateField(field.name);
              updateVisibility();
            }));
          list.append(row);
          if (index === focusIndex) item.focus();
        });
      }
      add.addEventListener('click', () => {
        state.values.push(field.newItem ?? '');
        renderList(state.values.length - 1);
        validateField(field.name);
        updateVisibility();
      });
      renderList();
      continue;
    }
    if (field.type === 'table') {
      if (!Array.isArray(field.columns) || !field.columns.length ||
          field.columns.some((column) => !column || typeof column.name !== 'string' || !column.name ||
            typeof column.label !== 'string' || !column.label) ||
          new Set(field.columns.map((column) => column.name)).size !== field.columns.length ||
          (field.editable !== undefined && typeof field.editable !== 'boolean') ||
          (field.value !== undefined && (!Array.isArray(field.value) || field.value.some((row) =>
            !row || typeof row !== 'object' || Array.isArray(row) ||
            Object.keys(row).length !== field.columns.length ||
            field.columns.some((column) => !Object.hasOwn(row, column.name) || typeof row[column.name] !== 'string'))))) {
        throw new TypeError(`Table field "${field.name}" requires unique columns and rows of string values.`);
      }
      wrapper = document.createElement('fieldset');
      wrapper.className = 'edy-form__field edy-form__field--table';
      wrapper.tabIndex = -1;
      const legend = document.createElement('legend');
      legend.textContent = field.label ?? translate(field.name);
      const scroll = document.createElement('div');
      scroll.className = 'edy-form__table-scroll';
      const table = document.createElement('table');
      const head = document.createElement('thead');
      const headings = document.createElement('tr');
      for (const column of field.columns) {
        const heading = document.createElement('th');
        heading.scope = 'col';
        heading.textContent = column.label;
        headings.append(heading);
      }
      const editable = field.editable !== false;
      if (editable) {
        const heading = document.createElement('th');
        heading.scope = 'col';
        heading.textContent = translate('tableActions');
        headings.append(heading);
      }
      head.append(headings);
      const body = document.createElement('tbody');
      table.append(head, body);
      scroll.append(table);
      const add = createIconButton(translate('tableAdd'), formIcons.add, undefined, Boolean(field.disabled));
      add.hidden = !editable;
      const error = document.createElement('span');
      error.className = 'edy-form__error';
      error.id = `${inputId}-error`;
      error.setAttribute('aria-live', 'polite');
      add.setAttribute('aria-errormessage', error.id);
      wrapper.setAttribute('aria-errormessage', error.id);
      const state = { rows: (field.value ?? []).map((row) => ({ ...row })) };
      wrapper.append(legend, scroll);
      if (field.help) {
        const help = document.createElement('span');
        help.className = 'edy-form__help';
        help.id = `${inputId}-help`;
        help.textContent = field.help;
        wrapper.setAttribute('aria-describedby', help.id);
        wrapper.append(help);
      }
      wrapper.append(add, error);
      container.append(wrapper);
      controls.set(field.name, { field, input: add, inputs: [add], error, wrapper, group, tableState: state,
        focusTarget: () => field.disabled ? wrapper : (body.querySelector('input') ?? (add.hidden ? wrapper : add)) });
      function renderRows(focusIndex) {
        body.replaceChildren();
        state.rows.forEach((value, index) => {
          const row = document.createElement('tr');
          let focusItem;
          for (const [columnIndex, column] of field.columns.entries()) {
            const cell = document.createElement('td');
            if (editable) {
              const item = document.createElement('input');
              item.type = 'text';
              item.value = value[column.name];
              item.disabled = Boolean(field.disabled);
              item.setAttribute('aria-label', `${column.label}: ${legend.textContent} ${index + 1}`);
              item.setAttribute('aria-errormessage', error.id);
              item.addEventListener('input', () => {
                state.rows[index][column.name] = item.value;
                validateField(field.name);
                updateVisibility();
              });
              cell.append(item);
              if (index === focusIndex && columnIndex === 0) focusItem = item;
            }
            else {
              cell.textContent = value[column.name];
            }
            row.append(cell);
          }
          if (editable) {
            const actions = document.createElement('td');
            const remove = createIconButton(`${translate('tableRemove')}: ${legend.textContent} ${index + 1}`,
              formIcons.remove, () => {
                state.rows.splice(index, 1);
                renderRows(Math.min(index, state.rows.length - 1));
                if (!state.rows.length) add.focus();
                validateField(field.name);
                updateVisibility();
              }, Boolean(field.disabled));
            actions.append(remove);
            row.append(actions);
          }
          body.append(row);
          focusItem?.focus();
        });
      }
      add.addEventListener('click', () => {
        state.rows.push(Object.fromEntries(field.columns.map((column) => [column.name, ''])));
        renderRows(state.rows.length - 1);
        validateField(field.name);
        updateVisibility();
      });
      renderRows();
      continue;
    }
    if (field.type === 'textarea' || field.type === 'tinymce' || field.type === 'codemirror') {
      input = document.createElement('textarea');
    }
    else if (field.type === 'select') {
      input = document.createElement('select');
      for (const option of field.options ?? []) {
        const element = document.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        input.append(element);
      }
    }
    else if (field.type === 'radio' || field.type === 'icon') {
      wrapper = document.createElement('fieldset');
      wrapper.className = `edy-form__field edy-form__field--${field.type}`;
      const legend = document.createElement('legend');
      legend.textContent = field.label ?? translate(field.name);
      wrapper.append(legend);
      for (const [index, option] of (field.options ?? []).entries()) {
        if (field.type === 'icon' && (typeof option.value !== 'string' ||
            typeof option.label !== 'string' || typeof option.path !== 'string' ||
            !Number.isFinite(option.width) || !Number.isFinite(option.height) ||
            option.width <= 0 || option.height <= 0)) {
          throw new TypeError('Icon options require value, label, SVG path, width and height.');
        }
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = field.name;
        radio.id = `${inputId}-${index}`;
        radio.value = option.value;
        radio.checked = option.value === field.value;
        radio.disabled = Boolean(field.disabled);
        radio.required = Boolean(field.required);
        label.htmlFor = radio.id;
        label.append(radio);
        if (field.type === 'icon') {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', `0 0 ${option.width} ${option.height}`);
          svg.setAttribute('aria-hidden', 'true');
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', option.path);
          svg.append(path);
          label.append(svg);
        }
        label.append(document.createTextNode(option.label));
        wrapper.append(label);
        inputs.push(radio);
      }
      input = inputs[0];
      if (!input) {
        throw new TypeError(`Radio field "${field.name}" requires at least one option.`);
      }
      const error = document.createElement('span');
      error.className = 'edy-form__error';
      error.id = `${inputId}-error`;
      error.setAttribute('aria-live', 'polite');
      wrapper.setAttribute('aria-errormessage', error.id);
      if (field.help) {
        const help = document.createElement('span');
        help.className = 'edy-form__help';
        help.id = `${inputId}-help`;
        help.textContent = field.help;
        wrapper.setAttribute('aria-describedby', help.id);
        wrapper.append(help);
      }
      wrapper.append(error);
      container.append(wrapper);
      controls.set(field.name, { field, input, inputs, error, wrapper, group });
      continue;
    }
    else {
      input = document.createElement('input');
      input.type = field.type === 'switch' ? 'checkbox' : (field.type ?? 'text');
      if (field.type === 'switch') {
        input.setAttribute('role', 'switch');
      }
    }
    input.id = inputId;
    input.name = field.name;
    input.disabled = Boolean(field.disabled);
    input.required = Boolean(field.required);
    if (field.type === 'checkbox' || field.type === 'switch') {
      input.checked = Boolean(field.value);
    }
    else if (field.value !== undefined) {
      input.value = field.value;
    }
    if (field.min !== undefined) {
      input.min = String(field.min);
    }
    if (field.max !== undefined) {
      input.max = String(field.max);
    }
    if (field.minLength !== undefined) {
      input.minLength = field.minLength;
    }
    if (field.maxLength !== undefined) {
      input.maxLength = field.maxLength;
    }
    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.textContent = field.label ?? translate(field.name);
    wrapper.append(label);
    if (field.help) {
      const help = document.createElement('span');
      help.className = 'edy-form__help';
      help.id = `${inputId}-help`;
      help.textContent = field.help;
      input.setAttribute('aria-describedby', help.id);
      wrapper.append(input, help);
    }
    else {
      wrapper.append(input);
    }
    const error = document.createElement('span');
    error.className = 'edy-form__error';
    error.id = `${inputId}-error`;
    error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-errormessage', error.id);
    wrapper.append(error);
    if (field.type === 'tinymce') {
      const modes = {
        simple: { menubar: false, plugins: 'link lists', toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist | link | removeformat' },
        full: { menubar: true, plugins: 'advlist anchor autolink charmap code fullscreen help image insertdatetime link lists media preview searchreplace table visualblocks', toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image media table | code fullscreen' },
        custom: {},
      };
      const mode = field.mode ?? 'simple';
      if (!Object.hasOwn(modes, mode) || (field.options !== undefined &&
          (!field.options || typeof field.options !== 'object' || Array.isArray(field.options))) ||
          (field.options?.setup !== undefined && typeof field.options.setup !== 'function')) {
        throw new TypeError('TinyMCE requires a valid mode and options object.');
      }
      const frame = document.createElement('iframe');
      editorState = { ready: false, frame, editor: null, document: null };
      frame.className = 'edy-form__editor-frame';
      frame.title = field.label ?? translate(field.name);
      frame.src = new URL('./tinymce-frame.html', import.meta.url).href;
      input.hidden = true;
      wrapper.insertBefore(frame, error);
      let generation = 0;
      frame.addEventListener('load', () => {
        const current = ++generation;
        editorState.ready = false;
        editorState.editor = null;
        editorState.document = null;
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        const target = frameDocument?.querySelector('textarea');
        if (!frameWindow?.tinymce || !target) {
          error.textContent = translate('editorLoadFailed');
          onError(new Error('Unable to load the local TinyMCE editor.'));
          return;
        }
        target.value = input.value;
        Promise.resolve().then(() => frameWindow.tinymce.init({
          ...modes[mode],
          ...field.options,
          target,
          selector: undefined,
          license_key: field.options?.license_key ?? 'gpl',
          readonly: input.disabled,
          setup(editor) {
            field.options?.setup?.(editor);
            editor.on('input change undo redo', () => {
              input.value = editor.getContent();
              input.dispatchEvent(new Event('input', { bubbles: true }));
            });
          },
        })).then((editors) => {
          if (current === generation && frame.isConnected && frame.contentDocument === frameDocument) {
            if (!editors[0]) throw new Error('TinyMCE did not create an editor.');
            editorState.editor = editors[0];
            editorState.document = frameDocument;
            editorState.ready = true;
            const editorElement = editors[0].getContainer();
            const observer = new frameWindow.ResizeObserver(() => {
              if (!frame.isConnected || frame.contentDocument !== frameDocument) return;
              const border = frame.offsetHeight - frame.clientHeight;
              const boxSizing = getComputedStyle(frame).boxSizing;
              frame.style.height = `${editorElement.offsetHeight + (boxSizing === 'border-box' ? border : 0)}px`;
            });
            observer.observe(editorElement);
            frameWindow.addEventListener('unload', () => observer.disconnect(), { once: true });
            error.textContent = '';
          }
        }).catch((failure) => {
          if (current === generation && frame.isConnected && frame.contentDocument === frameDocument) {
            error.textContent = translate('editorLoadFailed');
            onError(failure);
          }
        });
      });
    }
    if (field.type === 'codemirror') {
      const language = field.language ?? 'html';
      if (!['html', 'css', 'javascript'].includes(language)) {
        throw new TypeError('CodeMirror language must be html, css, or javascript.');
      }
      const frame = document.createElement('iframe');
      const codeState = { ready: false, frame, document: null, editor: null };
      frame.className = 'edy-form__code-frame';
      frame.title = field.label ?? translate(field.name);
      frame.setAttribute('aria-errormessage', error.id);
      frame.src = new URL('./codemirror-frame.html', import.meta.url).href;
      input.hidden = true;
      wrapper.insertBefore(frame, error);
      frame.addEventListener('load', () => {
        codeState.ready = false;
        const frameWindow = frame.contentWindow;
        const frameDocument = frame.contentDocument;
        if (typeof frameWindow?.createEdyCodeEditor !== 'function') {
          error.textContent = translate('codeEditorLoadFailed');
          onError(new Error('Unable to load the local CodeMirror editor.'));
          return;
        }
        try {
          codeState.editor = frameWindow.createEdyCodeEditor({
            value: input.value, language, disabled: input.disabled, label: frame.title,
            onChange: (value) => {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            },
          });
          codeState.document = frameDocument;
          codeState.ready = true;
          error.textContent = '';
        }
        catch (failure) {
          error.textContent = translate('codeEditorLoadFailed');
          onError(failure);
        }
      });
      editorState = null;
      container.append(wrapper);
      controls.set(field.name, { field, input, inputs: [input], error, wrapper, group, codeState });
      continue;
    }
    container.append(wrapper);
    controls.set(field.name, { field, input, inputs: [input], error, wrapper, editorState, group });

  }

  for (const [name, entry] of controls) {
    for (const input of entry.inputs) {
      input.addEventListener('input', () => {
        validateField(name);
        updateVisibility();
      });
      input.addEventListener('change', () => {
        validateField(name);
        updateVisibility();
      });
    }
    const condition = entry.field.visibleWhen;
    if (condition !== undefined && typeof condition !== 'function') {
      if (!condition || typeof condition !== 'object' || Array.isArray(condition) ||
          typeof condition.field !== 'string' || !Object.hasOwn(condition, 'equals')) {
        throw new TypeError(`Visibility condition for "${name}" requires a field and equals value.`);
      }
      if (!controls.has(condition.field)) {
        throw new Error(`Visibility condition for "${name}" references an unknown field.`);
      }
    }
  }
  updateVisibility();

  const actions = document.createElement('div');
  actions.className = 'edy-form__actions';
  const cancel = createButton({
    label: translate('cancel'),
    onClick: () => onCancel?.(),
  });
  cancel.hidden = !onCancel;
  const submit = createButton({ label: translate('save'), variant: 'primary' });
  submit.type = 'submit';
  actions.append(cancel, submit);
  form.append(actions);

  /**
   * Validates one field and updates its accessible error message.
   * @param {string} name Field name.
   * @returns {boolean} Whether the field is valid.
   */
  function validateField(name) {
    const entry = controls.get(name);
    const { field, input, inputs, error, wrapper } = entry;
    if (wrapper.hidden) {
      error.textContent = '';
      for (const control of inputs) control.setAttribute('aria-invalid', 'false');
      if (entry.sortableState || entry.tableState) {
        wrapper.setAttribute('aria-invalid', 'false');
        for (const control of wrapper.querySelectorAll('input')) control.setAttribute('aria-invalid', 'false');
      }
      entry.codeState?.frame.setAttribute('aria-invalid', 'false');
      return true;
    }
    const value = readValue(entry);
    let message = '';
    if (entry.editorState && (!entry.editorState.ready ||
        entry.editorState.frame.contentDocument !== entry.editorState.document)) {
      message = translate('editorLoadFailed');
    }
    else if (entry.assetState?.pending) {
      message = translate('assetPending');
    }
    else if (entry.assetState?.failure) {
      message = translate('assetFailed');
    }
    else if (entry.codeState && (!entry.codeState.ready ||
        entry.codeState.frame.contentDocument !== entry.codeState.document)) {
      message = translate('codeEditorLoadFailed');
    }
    else if (field.required && (value === '' || value === false ||
        (entry.sortableState && !value.some((item) => item.trim())) ||
        (entry.tableState && !value.length) ||
        (entry.assetState && !value.length) ||
        (entry.editorState && entry.editorState.editor.dom.isEmpty(entry.editorState.editor.getBody())))) {
      message = field.requiredMessage ?? translate('requiredField');
    }
    else if (typeof field.validate === 'function') {
      message = field.validate(value) ?? '';
    }
    if (!message && inputs.some((control) => !control.checkValidity())) {
      message = field.validationMessage ?? translate('invalidValue') ?? input.validationMessage;
    }
    error.textContent = message;
    for (const control of inputs) {
      control.setAttribute('aria-invalid', String(Boolean(message)));
    }
    if (entry.sortableState || entry.tableState) {
      wrapper.setAttribute('aria-invalid', String(Boolean(message)));
      for (const control of wrapper.querySelectorAll('input')) {
        control.setAttribute('aria-invalid', String(Boolean(message)));
      }
    }
    entry.codeState?.frame.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }

  /**
   * Reads a form control or group value.
   * @param {Object} entry Field controls.
   * @returns {*} Field value.
   */
  function readValue(entry) {
    if (entry.sortableState) return [...entry.sortableState.values];
    if (entry.tableState) return entry.tableState.rows.map((row) => ({ ...row }));
    if (entry.assetState) return [...entry.assetState.ids];
    if (entry.field.type === 'radio' || entry.field.type === 'icon') {
      return entry.inputs.find((control) => control.checked)?.value ?? '';
    }
    return entry.input.type === 'checkbox' ? entry.input.checked : entry.input.value;
  }

  /**
   * Updates declarative conditional visibility from current form values.
   * @returns {void}
   */
  function updateVisibility() {
    const values = Object.fromEntries([...controls].map(([name, entry]) => [name, readValue(entry)]));
    for (const entry of controls.values()) {
      const condition = entry.field.visibleWhen;
      const dependency = condition && typeof condition !== 'function' ? controls.get(condition.field) : null;
      const value = dependency ? values[condition.field] : undefined;
      const numericMatch = dependency && ['number', 'range'].includes(dependency.field.type) &&
        typeof condition.equals === 'number' && value !== '' && Number.isFinite(Number(value)) &&
        Number(value) === condition.equals;
      const visible = !entry.field.hidden && (!condition || (typeof condition === 'function'
        ? condition(values)
        : value === condition.equals || numericMatch));
      entry.wrapper.hidden = !visible;
      if (!visible) {
        if (entry.assetState?.pending) entry.assetState.cancel();
        else entry.assetState?.closePreview();
        validateField(entry.field.name);
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    for (const entry of controls.values()) {
      if (entry.editorState?.ready &&
          entry.editorState.frame.contentDocument === entry.editorState.document) {
        entry.input.value = entry.editorState.editor.getContent();
      }
    }
    const invalid = [...controls.values()].filter((entry) => !validateField(entry.field.name));
    if (invalid.length) {
      const entry = invalid[0];
      if (entry.group) entry.group.open = true;
      if (entry.codeState?.ready) entry.codeState.editor.focus();
      else (entry.editorState?.frame ?? entry.codeState?.frame ?? entry.focusTarget?.() ?? entry.input).focus();
      return;
    }
    const values = Object.fromEntries([...controls]
      .filter(([, entry]) => !entry.wrapper.hidden)
      .map(([name, entry]) => [name, readValue(entry)]));
    onSubmit(values);
  });
  form.dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const entry of controls.values()) entry.assetState?.cancel();
  };
  return form;
}

/**
 * Creates an accessible list or tree from plain item data.
 * @param {Array<{id: string, label: string, icon?: string, children?: Array}>} items List items.
 * @param {{tree?: boolean, onSelect?: Function}} options Presentation options.
 * @returns {HTMLElement} List or tree element.
 */
export function createList(items, { tree = false, onSelect, nested = false } = {}) {
  const list = document.createElement('ul');
  list.className = 'edy-list';
  list.setAttribute('role', tree ? (nested ? 'group' : 'tree') : 'list');
  for (const item of items) {
    if (item.icon !== undefined && !resolveIcon(item.icon)) {
      throw new TypeError('List item icons must be a character or Bootstrap icon name.');
    }
    const row = document.createElement('li');
    row.setAttribute('role', tree ? 'none' : 'listitem');
    const button = createButton({
      label: item.label,
      onClick: () => {
        const group = row.querySelector(':scope > [role="group"]');
        if (tree && group) {
          group.hidden = !group.hidden;
          button.setAttribute('aria-expanded', String(!group.hidden));
        }
        onSelect?.(item);
      },
    });
    button.classList.add('edy-list__item');
    const icon = createIconElement(item.icon);
    if (icon) {
      icon.classList.add('edy-list__icon');
      button.prepend(icon);
    }
    if (tree) {
      button.setAttribute('role', 'treeitem');
      if (item.children?.length) {
        button.setAttribute('aria-expanded', 'true');
      }
      button.tabIndex = nested || list.querySelector('[role="treeitem"]') ? -1 : 0;
    }
    row.append(button);
    if (tree && item.children?.length) {
      row.append(createList(item.children, { tree, onSelect, nested: true }));
    }
    list.append(row);
  }
  if (tree && !nested) {
    list.addEventListener('keydown', (event) => {
      const current = event.target.closest?.('.edy-list__item');
      if (!current) {
        return;
      }
      const visible = [...list.querySelectorAll('.edy-list__item')]
        .filter((button) => !button.closest('[hidden]'));
      const index = visible.indexOf(current);
      let next;
      if (event.key === 'ArrowDown') {
        next = visible[index + 1];
      }
      else if (event.key === 'ArrowUp') {
        next = visible[index - 1];
      }
      else if (event.key === 'Home') {
        next = visible[0];
      }
      else if (event.key === 'End') {
        next = visible.at(-1);
      }
      else if (event.key === 'ArrowRight') {
        const row = current.closest('li');
        const group = row.querySelector(':scope > [role="group"]');
        if (group && current.getAttribute('aria-expanded') === 'false') {
          group.hidden = false;
          current.setAttribute('aria-expanded', 'true');
        }
        else if (group) {
          next = group.querySelector('.edy-list__item');
        }
      }
      else if (event.key === 'ArrowLeft') {
        const row = current.closest('li');
        const group = row.querySelector(':scope > [role="group"]');
        if (group && current.getAttribute('aria-expanded') === 'true') {
          group.hidden = true;
          current.setAttribute('aria-expanded', 'false');
        }
        else {
          next = row.parentElement.closest('li')?.querySelector('.edy-list__item');
        }
      }
      else {
        return;
      }
      event.preventDefault();
      if (next) {
        visible.forEach((button) => {
          button.tabIndex = button === next ? 0 : -1;
        });
        next.focus();
      }
    });
  }
  return list;
}

/**
 * Creates a tab strip that notifies consumers when selection changes.
 * @param {Array<{id: string, label: string}>} tabs Tab definitions.
 * @param {string} selectedId Initially selected tab.
 * @param {Function} onSelect Selection callback.
 * @returns {HTMLElement} Accessible tab list.
 */
export function createTabs(tabs, selectedId, onSelect) {
  const list = document.createElement('div');
  list.className = 'edy-tabs';
  list.setAttribute('role', 'tablist');
  for (const tab of tabs) {
    const button = createButton({
      label: tab.label,
      onClick: (event) => {
        for (const candidate of list.querySelectorAll('[role="tab"]')) {
          candidate.setAttribute('aria-selected', String(candidate === event.currentTarget));
          candidate.tabIndex = candidate === event.currentTarget ? 0 : -1;
        }
        onSelect(tab.id);
      },
    });
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(tab.id === selectedId));
    button.tabIndex = tab.id === selectedId ? 0 : -1;
    list.append(button);
  }
  return list;
}

/**
 * Opens an accessible native confirmation dialog and restores focus on close.
 * @param {{title: string, message: string, confirmLabel: string}} options Dialog options.
 * @returns {Promise<boolean>} Whether the user confirmed.
 */
export function confirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  container,
}) {
  if (!container || typeof container.append !== 'function') {
    throw new TypeError('confirmDialog requires a host-provided container.');
  }
  const priorFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'edy-dialog';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const body = document.createElement('p');
  body.textContent = message;
  const actions = document.createElement('div');
  actions.className = 'edy-form__actions';
  const cancel = createButton({ label: cancelLabel, onClick: () => dialog.close('cancel') });
  const confirm = createButton({ label: confirmLabel, variant: 'primary', onClick: () => dialog.close('confirm') });
  actions.append(cancel, confirm);
  dialog.append(heading, body, actions);
  container.append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'confirm';
      dialog.remove();
      if (priorFocus instanceof HTMLElement) {
        priorFocus.focus();
      }
      resolve(accepted);
    }, { once: true });
    dialog.showModal();
    confirm.focus();
  });
}
