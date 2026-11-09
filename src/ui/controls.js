/**
 * @file Provides reusable accessible DOM controls and declarative form builders.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

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

/**
 * Builds a validated form from a declarative field schema.
 * @param {{fields: Array, onSubmit: Function, onCancel?: Function, translate: Function, onError?: Function}} options Form options.
 * @returns {HTMLFormElement} Accessible form.
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
    'textarea', 'select', 'checkbox', 'radio', 'switch', 'tinymce', 'icon',
  ]);
  for (const field of fields) {
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
    if (field.type === 'textarea' || field.type === 'tinymce') {
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
      form.append(wrapper);
      controls.set(field.name, { field, input, inputs, error, wrapper });
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
        simple: { menubar: false, plugins: '', toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | removeformat' },
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
    form.append(wrapper);
    controls.set(field.name, { field, input, inputs: [input], error, wrapper, editorState });

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
    if (condition && typeof condition !== 'function' && !controls.has(condition.field)) {
      throw new Error(`Visibility condition for "${name}" references an unknown field.`);
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
      return true;
    }
    const value = readValue(entry);
    let message = '';
    if (entry.editorState && (!entry.editorState.ready ||
        entry.editorState.frame.contentDocument !== entry.editorState.document)) {
      message = translate('editorLoadFailed');
    }
    else if (field.required && (value === '' || value === false ||
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
    return !message;
  }

  /**
   * Reads a form control or group value.
   * @param {Object} entry Field controls.
   * @returns {*} Field value.
   */
  function readValue(entry) {
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
      const visible = !entry.field.hidden && (!condition || (typeof condition === 'function'
        ? condition(values)
        : values[condition.field] === condition.equals));
      entry.wrapper.hidden = !visible;
      if (!visible) {
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
    const valid = [...controls.keys()].map(validateField).every(Boolean);
    if (!valid) {
      const invalid = form.querySelector('[aria-invalid="true"]');
      const entry = [...controls.values()].find((item) => item.inputs.includes(invalid));
      (entry?.editorState?.frame ?? invalid)?.focus();
      return;
    }
    const values = Object.fromEntries([...controls]
      .filter(([, entry]) => !entry.wrapper.hidden)
      .map(([name, entry]) => [name, readValue(entry)]));
    onSubmit(values);
  });
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
    if (item.icon !== undefined && typeof item.icon !== 'string') {
      throw new TypeError('List item icons must be strings.');
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
    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'edy-list__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = item.icon;
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
