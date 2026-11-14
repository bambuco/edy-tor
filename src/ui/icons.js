/**
 * @file Resolves decorative glyphs and Font Awesome classes for workbench surfaces.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const iconAliases = new Map([
  ['activity', 'fa-solid fa-chart-line'],
  ['address-book', 'fa-regular fa-address-book'],
  ['align-center', 'fa-solid fa-align-center'],
  ['align-justify', 'fa-solid fa-align-justify'],
  ['align-left', 'fa-solid fa-align-left'],
  ['align-right', 'fa-solid fa-align-right'],
  ['angle-down', 'fa-solid fa-angle-down'],
  ['angle-left', 'fa-solid fa-angle-left'],
  ['angle-right', 'fa-solid fa-angle-right'],
  ['angle-up', 'fa-solid fa-angle-up'],
  ['archive', 'fa-solid fa-box-archive'],
  ['arrow-down', 'fa-solid fa-arrow-down'],
  ['arrow-left', 'fa-solid fa-arrow-left'],
  ['arrow-right', 'fa-solid fa-arrow-right'],
  ['arrow-up', 'fa-solid fa-arrow-up'],
  ['arrows', 'fa-solid fa-arrows-left-right'],
  ['asterisk', 'fa-solid fa-asterisk'],
  ['audio', 'fa-solid fa-file-audio'],
  ['back', 'fa-solid fa-arrow-left'],
  ['bars', 'fa-solid fa-bars'],
  ['bell', 'fa-regular fa-bell'],
  ['bold', 'fa-solid fa-bold'],
  ['book', 'fa-solid fa-book'],
  ['bookmark', 'fa-regular fa-bookmark'],
  ['bug', 'fa-solid fa-bug'],
  ['calendar', 'fa-regular fa-calendar'],
  ['calendar-days', 'fa-regular fa-calendar-days'],
  ['camera', 'fa-solid fa-camera'],
  ['cancel', 'fa-solid fa-xmark'],
  ['caret-down', 'fa-solid fa-caret-down'],
  ['chart', 'fa-solid fa-chart-column'],
  ['check', 'fa-solid fa-check'],
  ['check-circle', 'fa-regular fa-circle-check'],
  ['chevron-down', 'fa-solid fa-chevron-down'],
  ['chevron-left', 'fa-solid fa-chevron-left'],
  ['chevron-right', 'fa-solid fa-chevron-right'],
  ['chevron-up', 'fa-solid fa-chevron-up'],
  ['circle-info', 'fa-solid fa-circle-info'],
  ['circle-question', 'fa-regular fa-circle-question'],
  ['clipboard', 'fa-regular fa-clipboard'],
  ['clock', 'fa-regular fa-clock'],
  ['close', 'fa-solid fa-xmark'],
  ['cloud', 'fa-solid fa-cloud'],
  ['code', 'fa-solid fa-code'],
  ['code-branch', 'fa-solid fa-code-branch'],
  ['code-commit', 'fa-solid fa-code-commit'],
  ['code-compare', 'fa-solid fa-code-compare'],
  ['code-fork', 'fa-solid fa-code-fork'],
  ['code-merge', 'fa-solid fa-code-merge'],
  ['code-pull-request', 'fa-solid fa-code-pull-request'],
  ['comment', 'fa-regular fa-comment'],
  ['comments', 'fa-regular fa-comments'],
  ['compass', 'fa-regular fa-compass'],
  ['copy', 'fa-regular fa-copy'],
  ['cut', 'fa-solid fa-scissors'],
  ['database', 'fa-solid fa-database'],
  ['delete', 'fa-solid fa-trash'],
  ['download', 'fa-solid fa-download'],
  ['edit', 'fa-regular fa-pen-to-square'],
  ['ellipsis-vertical', 'fa-solid fa-ellipsis-vertical'],
  ['email', 'fa-regular fa-envelope'],
  ['envelope', 'fa-regular fa-envelope'],
  ['error', 'fa-solid fa-circle-exclamation'],
  ['eye', 'fa-regular fa-eye'],
  ['eye-slash', 'fa-regular fa-eye-slash'],
  ['file-audio', 'fa-regular fa-file-audio'],
  ['file-code', 'fa-regular fa-file-code'],
  ['file-excel', 'fa-regular fa-file-excel'],
  ['file-export', 'fa-solid fa-file-export'],
  ['file-import', 'fa-solid fa-file-import'],
  ['file-image', 'fa-regular fa-file-image'],
  ['file-pdf', 'fa-regular fa-file-pdf'],
  ['file-plus', 'fa-solid fa-file-circle-plus'],
  ['file-video', 'fa-regular fa-file-video'],
  ['file-word', 'fa-regular fa-file-word'],
  ['filter', 'fa-solid fa-filter'],
  ['flag', 'fa-regular fa-flag'],
  ['font', 'fa-solid fa-font'],
  ['forward', 'fa-solid fa-arrow-right'],
  ['github', 'fa-brands fa-github'],
  ['git', 'fa-brands fa-git-alt'],
  ['globe', 'fa-solid fa-globe'],
  ['grip', 'fa-solid fa-grip'],
  ['heading', 'fa-solid fa-heading'],
  ['help', 'fa-regular fa-circle-question'],
  ['history', 'fa-solid fa-clock-rotate-left'],
  ['home', 'fa-solid fa-house'],
  ['html', 'fa-brands fa-html5'],
  ['image', 'fa-regular fa-image'],
  ['images', 'fa-regular fa-images'],
  ['inbox', 'fa-solid fa-inbox'],
  ['indent', 'fa-solid fa-indent'],
  ['info', 'fa-solid fa-circle-info'],
  ['italic', 'fa-solid fa-italic'],
  ['javascript', 'fa-brands fa-js'],
  ['keyboard', 'fa-regular fa-keyboard'],
  ['link', 'fa-solid fa-link'],
  ['list', 'fa-solid fa-list'],
  ['list-check', 'fa-solid fa-list-check'],
  ['lock', 'fa-solid fa-lock'],
  ['markdown', 'fa-brands fa-markdown'],
  ['maximize', 'fa-solid fa-up-right-and-down-left-from-center'],
  ['menu', 'fa-solid fa-bars'],
  ['minimize', 'fa-solid fa-down-left-and-up-right-to-center'],
  ['minus', 'fa-solid fa-minus'],
  ['moon', 'fa-regular fa-moon'],
  ['more', 'fa-solid fa-ellipsis'],
  ['move', 'fa-solid fa-up-down-left-right'],
  ['npm', 'fa-brands fa-npm'],
  ['outdent', 'fa-solid fa-outdent'],
  ['paintbrush', 'fa-solid fa-paintbrush'],
  ['paperclip', 'fa-solid fa-paperclip'],
  ['paste', 'fa-solid fa-paste'],
  ['pause', 'fa-solid fa-pause'],
  ['pdf', 'fa-regular fa-file-pdf'],
  ['pen', 'fa-solid fa-pen'],
  ['pencil', 'fa-solid fa-pencil'],
  ['play', 'fa-solid fa-play'],
  ['plus-circle', 'fa-solid fa-circle-plus'],
  ['print', 'fa-solid fa-print'],
  ['project', 'fa-solid fa-diagram-project'],
  ['puzzle', 'fa-solid fa-puzzle-piece'],
  ['redo', 'fa-solid fa-arrow-rotate-right'],
  ['refresh', 'fa-solid fa-arrows-rotate'],
  ['remove', 'fa-solid fa-trash'],
  ['robot', 'fa-solid fa-robot'],
  ['save', 'fa-regular fa-floppy-disk'],
  ['search', 'fa-solid fa-magnifying-glass'],
  ['settings', 'fa-solid fa-gear'],
  ['share', 'fa-solid fa-share-nodes'],
  ['shield', 'fa-solid fa-shield-halved'],
  ['sort', 'fa-solid fa-sort'],
  ['spinner', 'fa-solid fa-spinner'],
  ['stop', 'fa-solid fa-stop'],
  ['sun', 'fa-regular fa-sun'],
  ['table', 'fa-solid fa-table'],
  ['tag', 'fa-solid fa-tag'],
  ['terminal', 'fa-solid fa-terminal'],
  ['text', 'fa-solid fa-font'],
  ['thumbs-up', 'fa-regular fa-thumbs-up'],
  ['trash', 'fa-solid fa-trash'],
  ['undo', 'fa-solid fa-arrow-rotate-left'],
  ['unlock', 'fa-solid fa-lock-open'],
  ['upload', 'fa-solid fa-upload'],
  ['user', 'fa-solid fa-user'],
  ['users', 'fa-solid fa-users'],
  ['video', 'fa-solid fa-video'],
  ['warning', 'fa-solid fa-triangle-exclamation'],
  ['wrench', 'fa-solid fa-wrench'],
  ['xmark', 'fa-solid fa-xmark'],
  ['zip', 'fa-solid fa-file-zipper'],
  ['card', 'fa-regular fa-credit-card'],
  ['folder', 'fa-solid fa-folder'],
  ['folder-open', 'fa-solid fa-folder-open'],
  ['folder-plus', 'fa-solid fa-folder-plus'],
  ['file', 'fa-solid fa-file'],
  ['file-lines', 'fa-regular fa-file-lines'],
  ['star', 'fa-solid fa-star'],
  ['plus', 'fa-solid fa-plus'],
  ['ellipsis', 'fa-solid fa-ellipsis'],
  ['diagram', 'fa-solid fa-chart-diagram'],
  ['folder-tree', 'fa-solid fa-folder-tree'],
  ['cubes', 'fa-solid fa-cubes'],
]);

/**
 * Resolves a glyph, standard alias, or Font Awesome class list.
 * @param {string|undefined|null} icon Icon contribution.
 * @returns {{type: 'text', value: string}|{type: 'fontawesome', classes: string[]}|null} Resolved icon.
 */
export function resolveIcon(icon) {
  if (icon === undefined || icon === null || icon === '') {
    return null;
  }
  if (typeof icon === 'string') {
    const value = icon.trim();
    if (!value) {
      throw new TypeError('Icons must be a non-empty character or Font Awesome class name.');
    }
    if (Array.from(value).length === 1) {
      return { type: 'text', value };
    }
    const alias = iconAliases.get(value.toLowerCase());
    if (!alias && !/^[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*$/.test(value)) {
      return { type: 'text', value };
    }
    const classes = alias ?? value;
    return { type: 'fontawesome', classes: classes.split(/\s+/) };
  }
  throw new TypeError('Icons must be a character string.');
}

/**
 * Creates a decorative icon element.
 * @param {string|undefined|null} icon Icon contribution.
 * @returns {HTMLElement|null} Icon element, or null when omitted.
 */
export function createIconElement(icon) {
  const resolved = resolveIcon(icon);
  if (!resolved) {
    return null;
  }
  const element = document.createElement('span');
  element.className = 'edy-icon';
  element.setAttribute('aria-hidden', 'true');
  if (resolved.type === 'text') {
    element.textContent = resolved.value;
    return element;
  }
  element.classList.add(...resolved.classes);
  return element;
}
