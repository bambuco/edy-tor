/**
 * @file Renders workbench surfaces and coordinates their interaction and lifecycle.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createButton } from '../ui/controls.js';
import { matchesShortcut, parseShortcut } from '../core/shortcuts.js';
import { createIconElement, loadIconStylesheet } from '../ui/icons.js';
import { createPreviewViewport } from '../ui/preview-viewport.js';

/**
 * Owns an instance's shadow-DOM workbench and accessible interactions.
 */
export class Workbench {
  /**
   * @param {import('../core/instance.js').EdyInstance} instance Owning Edy instance.
   */
  constructor(instance) {
    this.instance = instance;
    this.shadow = instance.shadow;
    this.previousHostTheme = instance.container.getAttribute('data-edy-theme');
    const compactLayout = globalThis.matchMedia?.('(max-width: 760px)').matches ?? false;
    this.activePrimary = null;
    this.activeSecondary = null;
    this.activePanel = null;
    this.activePreview = null;
    this.previewVisible = false;
    this.fullWindow = false;
    this.activeEditorView = null;
    this.activeDocument = null;
    this.activeEditorContribution = null;
    this.primaryVisible = !compactLayout;
    this.secondaryVisible = !compactLayout;
    this.panelVisible = !compactLayout;
    this.primaryWidth = 240;
    this.secondaryWidth = 250;
    this.panelHeight = 210;
    this.openMenu = null;
    this.contextMenu = null;
    this.resizeState = null;
    this.contributionCache = new Map();
    this.previewStates = new WeakMap();
    this.previewViewport = null;
    this.renderedContributions = new Set();
    this.themeQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    this.handleThemeChange = () => {
      if (this.instance.theme === 'system') {
        if (this.layout) {
          this.applyTheme(this.layout);
        }
      }
    };
    this.themeQuery?.addEventListener('change', this.handleThemeChange);
    loadIconStylesheet(this.shadow);
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('./styles.css', import.meta.url).href;
    this.shadow.append(stylesheet);
    this.app = document.createElement('div');
    this.app.id = 'edy-app';
    this.shadow.append(this.app);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.shadow.addEventListener('click', this.handleClick);
    this.shadow.addEventListener('keydown', this.handleKeydown);
    this.shadow.addEventListener('pointerdown', this.handlePointerDown);
    this.shadow.addEventListener('contextmenu', this.handleContextMenu);
    this.render();
  }
  /**
   * Releases resources owned by currently rendered extension contributions.
   * @returns {void}
   */
  disposeRenderResources() {
    const errors = [];
    for (const [contribution, entry] of this.contributionCache) {
      if (this.renderedContributions.has(contribution)) {
        continue;
      }
      this.contributionCache.delete(contribution);
      try {
        entry.dispose?.();
      }
      catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      this.instance.reportError(new AggregateError(errors, 'A rendered contribution failed to dispose.'));
    }
  }

  /**
   * Renders all registered contributions and workbench surfaces.
   * @returns {void}
   */
  render() {
    this.previewViewport?.dispose();
    this.previewViewport = null;
    const focused = this.shadow.activeElement;
    const selection = focused instanceof HTMLInputElement &&
      ['text', 'search', 'url', 'tel', 'password'].includes(focused.type)
      ? [focused.selectionStart, focused.selectionEnd]
      : null;
    this.renderedContributions = new Set();
    const instance = this.instance;
    const translate = instance.translate;
    const main = document.createElement('div');
    main.className = 'edy-layout';
    main.lang = instance.locale;
    this.applyTheme(main);
    main.style.setProperty('--edy-primary-width', `${this.primaryWidth}px`);
    main.style.setProperty('--edy-secondary-width', `${this.secondaryWidth}px`);
    main.style.setProperty('--edy-panel-height', `${this.panelHeight}px`);
    main.classList.toggle('is-primary-hidden', !this.primaryVisible);
    main.classList.toggle('is-secondary-hidden', !this.secondaryVisible);
    main.classList.toggle('is-panel-hidden', !this.panelVisible);

    const header = document.createElement('header');
    header.className = 'edy-header';
    header.innerHTML = `<strong class="edy-brand">${instance.title}</strong><nav class="edy-menubar" aria-label="${translate('menusLabel')}"></nav><div class="edy-header__spacer"></div>`;
    const logo = document.createElement('img');
    logo.className = 'edy-brand__logo';
    logo.alt = '';
    logo.src = instance.logo;
    header.querySelector('.edy-brand').prepend(logo);
    this.renderMenus(header.querySelector('.edy-menubar'));
    const previewViews = instance.views.entries().filter(([, view]) => view.location === 'preview');
    if (!previewViews.length) {
      this.previewVisible = false;
      this.activePreview = null;
    }
    if (previewViews.length) {
      const previewButton = this.actionButton({
        label: '◫',
        action: 'toggle-preview',
        title: translate('togglePreview'),
        pressed: this.previewVisible,
      });
      previewButton.setAttribute('aria-label', translate('togglePreview'));
      header.append(previewButton);
    }
    const fullWindowLabel = translate(this.fullWindow ? 'exitFullWindow' : 'fullWindow');
    const fullWindowButton = this.actionButton({
      label: '⛶',
      action: 'toggle-full-window',
      title: fullWindowLabel,
      pressed: this.fullWindow,
    });
    fullWindowButton.setAttribute('aria-label', fullWindowLabel);
    header.append(fullWindowButton);
    main.append(header);

    const activity = document.createElement('nav');
    activity.className = 'edy-activity';
    activity.setAttribute('aria-label', translate('activityBar'));
    const activePrimary = this.selectedPrimaryView();
    for (const [id, view] of instance.views.entries().filter(([, item]) => item.location === 'primary')) {
      const icon = createIconElement(view.icon);
      const button = this.actionButton({
        label: icon ? '' : Array.from(view.title.trim())[0].toLocaleUpperCase(instance.locale),
        action: 'toggle-primary-view',
        id,
        title: view.title,
        pressed: this.primaryVisible && activePrimary === id,
      });
      if (icon) {
        button.textContent = '';
        button.append(icon);
      }
      button.setAttribute('aria-label', view.title);
      activity.append(button);
    }
    main.append(activity);

    main.append(this.renderPane('primary', translate('primarySidebar'), this.activePrimary));
    main.append(this.resizeHandle('horizontal', 'primary'));
    main.append(this.renderEditor());
    main.append(this.resizeHandle('horizontal', 'secondary'));
    main.append(this.renderPane('secondary', translate('secondarySidebar'), this.activeSecondary));
    main.append(this.resizeHandle('vertical', 'panel'));
    main.append(this.renderPane('panel', translate('bottomPanel'), this.activePanel));
    main.append(this.renderStatus());
    this.app.replaceChildren(main);
    this.layout = main;
    this.previewViewport?.start();
    this.disposeRenderResources();
    if (focused?.isConnected && this.shadow.contains(focused)) {
      focused.focus();
      if (selection && selection[0] !== null && selection[1] !== null) {
        focused.setSelectionRange(...selection);
      }
    }
    this.renderContextMenu(main);
    this.renderNotifications();
  }

  /**
   * Resolves the selected or system color theme.
   * @returns {string} Theme name.
   */
  resolveTheme() {
    if (this.instance.theme === 'light' || this.instance.theme === 'dark') {
      return this.instance.theme;
    }
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Applies the current theme to both the layout and shadow-root dialogs.
   * @param {HTMLElement} layout Workbench layout.
   * @returns {void}
   */
  applyTheme(layout) {
    const theme = this.resolveTheme();
    layout.dataset.theme = theme;
    this.instance.container.setAttribute('data-edy-theme', theme);
  }

  /**
   * Renders only menus that contain actual actions.
   * @param {HTMLElement} target Menu bar.
   * @returns {void}
   */
  renderMenus(target) {
    target.replaceChildren();
    const translate = this.instance.translate;
    const groups = new Map([
      ['file', []],
      ['edit', []],
      ['view', [
        { id: 'toggle-primary', label: translate('togglePrimary') },
        { id: 'toggle-secondary', label: translate('toggleSecondary') },
        { id: 'toggle-panel', label: translate('togglePanel') },
      ]],
      ['help', [{ id: 'about', label: translate('about') }]],
    ]);
    for (const [, item] of this.instance.menus.entries()) {
      if (item.menuId === 'context') {
        continue;
      }
      if (!groups.has(item.menuId)) {
        groups.set(item.menuId, []);
      }
      groups.get(item.menuId).push(item);
    }
    const names = { file: 'file', edit: 'edit', view: 'view', help: 'help' };
    for (const [menuId, items] of groups) {
      if (!items.length) {
        continue;
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'edy-menu';
      const menuButton = this.actionButton({
        label: translate(names[menuId] ?? menuId),
        action: 'toggle-menu',
        id: menuId,
        expanded: this.openMenu === menuId,
      });
      menuButton.setAttribute('aria-haspopup', 'menu');
      wrapper.append(menuButton);
      if (this.openMenu === menuId) {
        const menu = document.createElement('div');
        menu.className = 'edy-menu__popup';
        menu.setAttribute('role', 'menu');
        for (const item of items.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
          if (item.submenu && item.submenu.length > 0) {
            menu.append(this.renderSubmenu(item));
          } else {
            menu.append(this.menuItemButton(item));
          }
        }
        wrapper.append(menu);
      }
      target.append(wrapper);
    }
  }

  /**
   * Renders a submenu with nested items.
   * @param {Object} parentItem Menu item with submenu.
   * @returns {HTMLElement} Submenu wrapper element.
   */
  renderSubmenu(parentItem) {
    const wrapper = document.createElement('div');
    wrapper.className = 'edy-menu__submenu-wrapper';

    // Button for the submenu parent
    const button = this.actionButton({
      label: parentItem.label,
      action: 'toggle-submenu',
      id: parentItem.id,
    });
    button.classList.add('edy-menu__submenu-button');
    const parentIcon = createIconElement(parentItem.icon);
    if (parentIcon) {
      button.prepend(parentIcon);
    }
    button.setAttribute('role', 'menuitem');
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');

    // Container for submenu items
    const submenu = document.createElement('div');
    submenu.className = 'edy-menu__submenu-popup';
    submenu.setAttribute('role', 'menu');
    submenu.hidden = true;

    // Render submenu items
    for (const subitem of parentItem.submenu) {
      const subitemButton = this.menuItemButton(subitem);
      // Add click listener to close submenu and parent menu when item is executed
      subitemButton.addEventListener('click', () => {
        submenu.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        // Close parent menu after a short delay to allow command execution
        setTimeout(() => {
          this.openMenu = null;
          this.refreshMenuSurfaces();
        }, 0);
      });
      submenu.append(subitemButton);
    }

    // Handle submenu toggle
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = submenu.hidden;
      submenu.hidden = !isHidden;
      button.setAttribute('aria-expanded', !isHidden);
    });

    // Close submenu on Escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        submenu.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        e.stopPropagation();
      }
    };
    wrapper.addEventListener('keydown', handleKeydown);

    wrapper.append(button, submenu);
    return wrapper;
  }

  /**
   * Renders context actions at the position of the opening pointer.
   * @param {HTMLElement} layout Workbench layout.
   * @returns {void}
   */
  renderContextMenu(layout) {
    layout.querySelector('.edy-context-menu')?.remove();
    if (!this.contextMenu) {
      return;
    }
    const items = this.instance.menus.entries()
      .filter(([, item]) => item.menuId === 'context')
      .map(([, item]) => item);
    if (!items.length) {
      this.contextMenu = null;
      return;
    }
    const menu = document.createElement('div');
    menu.className = 'edy-context-menu';
    menu.setAttribute('role', 'menu');
    for (const item of items.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      menu.append(this.menuItemButton(item));
    }
    layout.append(menu);
    const bounds = layout.getBoundingClientRect();
    menu.style.left = `${Math.max(0, Math.min(this.contextMenu.x - bounds.left, bounds.width - menu.offsetWidth))}px`;
    menu.style.top = `${Math.max(0, Math.min(this.contextMenu.y - bounds.top, bounds.height - menu.offsetHeight))}px`;
  }

  /**
   * Renders a menu action and its optional icon and keyboard shortcut.
   * @param {Object} item Menu contribution.
   * @returns {HTMLButtonElement} Accessible menu item.
   */
  menuItemButton(item) {
    const button = this.actionButton({
      label: item.label,
      action: item.commandId ? 'execute-command' : item.id,
      id: item.commandId ?? item.id,
      disabled: item.commandId && !this.instance.isCommandEnabled(item.commandId),
    });
    button.setAttribute('role', 'menuitem');
    button.classList.add('edy-menu__item');
    button.textContent = '';
    const icon = createIconElement(item.icon);
    if (icon) {
      icon.classList.add('edy-menu__icon');
      button.append(icon);
    }
    const label = document.createElement('span');
    label.className = 'edy-menu__label';
    label.textContent = item.label;
    button.append(label);
    if (item.shortcut) {
      const shortcut = document.createElement('kbd');
      shortcut.textContent = item.shortcut;
      shortcut.setAttribute('aria-hidden', 'true');
      button.setAttribute('aria-keyshortcuts', item.shortcut.replace(/\bctrl\b/i, 'Control'));
      button.append(shortcut);
    }
    return button;
  }

  /**
   * Refreshes menu surfaces without rebuilding active editor contributions.
   * @param {string} [focusMenuId] Menu identifier to refocus after rendering.
   * @returns {void}
   */
  refreshMenuSurfaces(focusMenuId) {
    const menuBar = this.layout?.querySelector('.edy-menubar');
    if (menuBar) {
      this.renderMenus(menuBar);
      if (focusMenuId) {
        [...menuBar.querySelectorAll('[data-action="toggle-menu"]')]
          .find((button) => button.dataset.id === focusMenuId)?.focus();
      }
    }
    if (this.layout) {
      this.renderContextMenu(this.layout);
    }
  }

  /**
   * Applies current sidebar, panel, and size settings to the existing layout.
   * @returns {void}
   */
  updateLayout() {
    if (!this.layout) {
      return;
    }
    this.layout.classList.toggle('is-primary-hidden', !this.primaryVisible);
    this.layout.classList.toggle('is-secondary-hidden', !this.secondaryVisible);
    this.layout.classList.toggle('is-panel-hidden', !this.panelVisible);
    this.layout.style.setProperty('--edy-primary-width', `${this.primaryWidth}px`);
    this.layout.style.setProperty('--edy-secondary-width', `${this.secondaryWidth}px`);
    this.layout.style.setProperty('--edy-panel-height', `${this.panelHeight}px`);
    const activePrimary = this.selectedPrimaryView();
    for (const button of this.layout.querySelectorAll('.edy-activity [data-action="toggle-primary-view"]')) {
      button.setAttribute('aria-pressed', String(this.primaryVisible && button.dataset.id === activePrimary));
    }
  }

  /**
   * Resolves the selected primary view, including the default first view.
   * @returns {string|null} Selected view identifier.
   */
  selectedPrimaryView() {
    const views = this.instance.views.entries().filter(([, view]) => view.location === 'primary');
    return views.find(([id]) => id === this.activePrimary)?.[0] ?? views[0]?.[0] ?? null;
  }

  /**
   * Builds a pane with navigation and the currently selected contribution.
   * @param {'primary'|'secondary'|'panel'} location Pane location.
   * @param {string} title Accessible pane title.
   * @param {string|null} selectedId Active view identifier.
   * @returns {HTMLElement} Pane element.
   */
  renderPane(location, title, selectedId) {
    const section = document.createElement('section');
    section.className = `edy-pane edy-pane--${location}`;
    section.setAttribute('aria-label', title);
    const views = this.instance.views.entries().filter(([, item]) => item.location === location);
    const selected = views.find(([id]) => id === selectedId) ?? views[0];
    const header = document.createElement('div');
    header.className = 'edy-pane__header';
    const heading = document.createElement('h2');
    heading.textContent = selected?.[1].title ?? title;
    header.append(heading);
    if (location === 'panel' || location === 'secondary') {
      const closeLabel = this.instance.translate(location === 'panel' ? 'closePanel' : 'closeSecondary');
      const closeButton = this.actionButton({
        label: '×',
        action: location === 'panel' ? 'close-panel' : 'close-secondary',
        title: closeLabel,
      });
      closeButton.setAttribute('aria-label', closeLabel);
      header.append(closeButton);
    }
    section.append(header);
    if (views.length > 1 && location !== 'primary') {
      const tabs = document.createElement('div');
      tabs.className = 'edy-pane__tabs';
      for (const [id, view] of views) {
        tabs.append(this.actionButton({
          label: view.title,
          action: 'open-view',
          id,
          pressed: selected?.[0] === id,
        }));
      }
      section.append(tabs);
    }
    const content = document.createElement('div');
    content.className = 'edy-pane__content';
    const view = selected?.[1];
    if (view) {
      this.renderContribution(content, view);
    }
    else {
      content.textContent = this.instance.translate('emptyView');
      content.classList.add('edy-empty');
    }
    section.append(content);
    return section;
  }

  /**
   * Renders current documents and views into the editor tab strip.
   * @returns {HTMLElement} Editor tab list.
   */
  renderEditorTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'edy-editor__tabs';
    tabs.setAttribute('role', 'tablist');
    const editorViews = this.instance.views.entries().filter(([, view]) => view.location === 'editor');
    const documents = this.instance.documents.entries();
    for (const [id, view] of editorViews) {
      tabs.append(this.tabButton(id, view.title, this.activeEditorView === id, 'open-editor-view'));
    }
    for (const [id, documentItem] of documents) {
      const wrapper = document.createElement('div');
      wrapper.className = 'edy-editor__tab';
      wrapper.setAttribute('role', 'presentation');
      wrapper.append(this.tabButton(id, documentItem.title, this.activeDocument === id, 'open-document'));
      const close = this.actionButton({
        label: this.instance.translate('close'),
        action: 'close-document',
        id,
        title: `${this.instance.translate('close')} ${documentItem.title}`,
      });
      close.setAttribute('aria-label', `${this.instance.translate('close')} ${documentItem.title}`);
      wrapper.append(close);
      tabs.append(wrapper);
    }
    return tabs;
  }

  /**
   * Builds the editor region and its document tabs.
   * @returns {HTMLElement} Editor region.
   */
  renderEditor() {
    const editor = document.createElement('main');
    editor.className = 'edy-editor';
    editor.setAttribute('aria-label', this.instance.translate('editorArea'));
    const tabs = this.renderEditorTabs();
    if (tabs.childElementCount) {
      editor.append(tabs);
    }
    const surfaces = document.createElement('div');
    surfaces.className = 'edy-editor__surfaces';
    surfaces.classList.toggle('is-split', this.previewVisible);
    const content = document.createElement('div');
    content.className = 'edy-editor__content';
    this.renderEditorContent(content);
    surfaces.append(content);
    if (this.previewVisible) {
      const previews = this.instance.views.entries().filter(([, view]) => view.location === 'preview');
      const selected = previews.find(([id]) => id === this.activePreview) ?? previews[0];
      if (selected) {
        this.activePreview = selected[0];
        const preview = document.createElement('section');
        preview.className = 'edy-editor__preview';
        preview.setAttribute('aria-label', selected[1].title);
        const header = document.createElement('div');
        header.className = 'edy-pane__header';
        const heading = document.createElement('h2');
        heading.textContent = selected[1].title;
        const closeButton = this.actionButton({
          label: '×',
          action: 'close-preview',
          title: this.instance.translate('closePreview'),
        });
        closeButton.setAttribute('aria-label', this.instance.translate('closePreview'));
        header.append(heading, closeButton);
        preview.append(header);
        if (previews.length > 1) {
          const tabs = document.createElement('div');
          tabs.className = 'edy-pane__tabs';
          for (const [id, view] of previews) {
            tabs.append(this.actionButton({ label: view.title, action: 'open-view', id, pressed: id === selected[0] }));
          }
          preview.append(tabs);
        }
        const previewContent = document.createElement('div');
        previewContent.className = 'edy-editor__preview-content';
        if (selected[1].viewport) {
          const config = selected[1].viewport;
          let state = this.previewStates.get(selected[1]);
          if (!state) {
            state = { width: config.width, height: config.height, scale: config.scale };
            this.previewStates.set(selected[1], state);
          }
          const viewport = createPreviewViewport({
            config,
            state,
            translate: this.instance.translate,
            onError: (error) => this.instance.reportError(error),
          });
          this.previewViewport = viewport;
          editor.classList.add('has-viewport');
          preview.classList.add('has-viewport');
          this.renderContribution(viewport.target, selected[1]);
          previewContent.append(viewport.element);
        }
        else {
          this.renderContribution(previewContent, selected[1]);
        }
        preview.append(previewContent);
        surfaces.append(preview);
      }
    }
    editor.append(surfaces);
    return editor;
  }

  /**
   * Renders the active document or editor view without replacing the workbench.
   * @returns {void}
   */
  refreshEditorContent() {
    const content = this.layout?.querySelector('.edy-editor__content');
    if (content) {
      const previous = this.activeEditorContribution;
      this.renderEditorContent(content);
      if (previous && previous !== this.activeEditorContribution) {
        this.renderedContributions.delete(previous);
        this.disposeRenderResources();
      }
    }
  }

  /**
   * Updates the active editor surface.
   * @param {HTMLElement} content Editor content container.
   * @returns {void}
   */
  renderEditorContent(content) {
    content.replaceChildren();
    const editorViews = this.instance.views.entries().filter(([, view]) => view.location === 'editor');
    const activeView = this.instance.views.get(this.activeEditorView);
    const activeDocument = this.instance.documents.get(this.activeDocument);
    if (activeView) {
      this.activeEditorContribution = activeView;
      this.renderContribution(content, activeView);
    }
    else if (activeDocument) {
      this.activeEditorContribution = activeDocument;
      this.renderContribution(content, activeDocument);
    }
    else if (editorViews.length) {
      this.activeEditorView = editorViews[0][0];
      this.activeEditorContribution = editorViews[0][1];
      this.renderContribution(content, editorViews[0][1]);
    }
    else {
      this.activeEditorContribution = null;
      this.renderWelcome(content);
    }
  }

  /**
   * Updates the editor tab strip without replacing its active document.
   * @returns {void}
   */
  refreshDocumentTabs() {
    const editor = this.layout?.querySelector('.edy-editor');
    if (!editor) {
      return;
    }
    const existing = editor.querySelector('.edy-editor__tabs');
    const content = editor.querySelector('.edy-editor__surfaces');
    const tabs = this.renderEditorTabs();
    if (tabs.childElementCount) {
      if (existing) {
        existing.replaceWith(tabs);
      }
      else {
        editor.insertBefore(tabs, content);
      }
    }
    else {
      existing?.remove();
    }
  }

  /**
   * Refreshes commands and status actions without rebuilding editor content.
   * @returns {void}
   */
  refreshCommandUi() {
    this.refreshMenuSurfaces();
    this.refreshStatus();
  }

  /**
   * Replaces the status bar with current status contributions.
   * @returns {void}
   */
  refreshStatus() {
    const status = this.layout?.querySelector('.edy-status');
    if (status) {
      status.replaceWith(this.renderStatus());
    }
  }

  /**
   * Renders the default empty-workbench welcome content.
   * @param {HTMLElement} target Content element.
   * @returns {void}
   */
  renderWelcome(target) {
    const heading = document.createElement('h1');
    heading.textContent = this.instance.translate('welcomeTitle');
    const text = document.createElement('p');
    text.textContent = this.instance.translate('welcomeText');
    const extensionCount = this.instance.extensionStates.size;
    if (extensionCount === 0) {
      const status = document.createElement('p');
      status.className = 'edy-muted';
      status.textContent = this.instance.translate('noExtensions');
      target.append(heading, text, status);
    }
    else {
      target.append(heading, text);
    }
  }

  /**
   * Renders one extension-provided contribution without accepting HTML strings.
   * @param {HTMLElement} target Contribution container.
   * @param {Object} contribution View or document definition.
   * @returns {void}
   */
  renderContribution(target, contribution) {
    let entry = this.contributionCache.get(contribution);
    if (!entry) {
      try {
        const result = typeof contribution.render === 'function'
          ? contribution.render({
            translate: this.instance.translate,
          })
          : undefined;
        if (result instanceof Node) {
          entry = { element: result };
        }
        else if (result && typeof result === 'object' && result.element instanceof Node &&
            typeof result.dispose === 'function') {
          entry = { element: result.element, dispose: result.dispose };
        }
        else if (result === undefined || result === null) {
          const element = document.createElement('div');
          element.textContent = this.instance.translate('emptyView');
          element.className = 'edy-empty';
          entry = { element };
        }
        else {
          throw new TypeError('Contribution render() must return a DOM node.');
        }
      }
      catch (error) {
        this.instance.reportError(error, `Unable to render "${contribution.title}".`);
        const element = document.createElement('div');
        element.textContent = this.instance.translate('emptyView');
        element.className = 'edy-empty';
        entry = { element };
      }
      this.contributionCache.set(contribution, entry);
    }
    this.renderedContributions.add(contribution);
    target.append(entry.element);
  }

  /**
   * Renders registered status items.
   * @returns {HTMLElement} Status bar.
   */
  renderStatus() {
    const bar = document.createElement('footer');
    bar.className = 'edy-status';
    bar.setAttribute('aria-label', this.instance.translate('statusBar'));
    const left = document.createElement('span');
    left.textContent = this.instance.translate('ready');
    bar.append(left);
    const spacer = document.createElement('span');
    spacer.className = 'edy-header__spacer';
    bar.append(spacer);
    for (const [, item] of this.instance.status.entries()) {
      const status = this.actionButton({
        label: item.label,
        action: item.commandId ? 'execute-command' : 'status-action',
        id: item.commandId ?? item.id,
        title: item.tooltip,
        disabled: item.commandId && !this.instance.isCommandEnabled(item.commandId),
      });
      bar.append(status);
    }
    return bar;
  }

  /**
   * Renders or clears live notifications.
   * @returns {void}
   */
  renderNotifications() {
    let region = this.shadow.querySelector('.edy-notifications');
    if (!region) {
      region = document.createElement('div');
      region.className = 'edy-notifications';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-relevant', 'additions');
    }
    this.layout?.append(region);
    region.replaceChildren();
    for (const notice of this.instance.notices) {
      const message = document.createElement('div');
      message.className = `edy-notice edy-notice--${notice.type}`;
      message.setAttribute('role', notice.type === 'error' ? 'alert' : 'status');
      message.textContent = notice.message;
      region.append(message);
    }
  }

  /**
   * Creates a button with safe data attributes for delegated event handling.
   * @param {{label: string, action: string, id?: string, title?: string, pressed?: boolean, expanded?: boolean}} options Button data.
   * @returns {HTMLButtonElement} Button element.
   */
  actionButton({ label, action, id, title, pressed, expanded, disabled = false }) {
    const button = createButton({ label, disabled });
    button.dataset.action = action;
    if (id !== undefined) {
      button.dataset.id = id;
    }
    if (title) {
      button.title = title;
    }
    if (pressed !== undefined) {
      button.setAttribute('aria-pressed', String(pressed));
    }
    if (expanded !== undefined) {
      button.setAttribute('aria-expanded', String(expanded));
    }
    return button;
  }

  /**
   * Creates one editor tab button.
   * @param {string} id Tab identifier.
   * @param {string} label Tab label.
   * @param {boolean} selected Whether the tab is selected.
   * @param {string} action Event action.
   * @returns {HTMLButtonElement} Tab button.
   */
  tabButton(id, label, selected, action) {
    const button = this.actionButton({ label, action, id });
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    return button;
  }

  /**
   * Creates a keyboard- and pointer-accessible resize handle.
   * @param {'horizontal'|'vertical'} axis Resize axis.
   * @param {'primary'|'secondary'|'panel'} target Resized surface.
   * @returns {HTMLButtonElement} Resize handle.
   */
  resizeHandle(axis, target) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = `edy-resize edy-resize--${axis}`;
    handle.dataset.resize = target;
    handle.setAttribute('aria-label', this.instance.translate(
      target === 'panel' ? 'resizePanel' : target === 'primary' ? 'resizePrimary' : 'resizeSecondary',
    ));
    handle.setAttribute('aria-orientation', axis);
    return handle;
  }

  /**
   * Opens a registered view in its target surface.
   * @param {string} id View identifier.
   * @returns {void}
   */
  openView(id) {
    const view = this.instance.views.get(id);
    if (!view) {
      throw new Error(`View "${id}" is not registered.`);
    }
    if (view.location === 'secondary') {
      if (this.activeSecondary === id && this.secondaryVisible) {
        return;
      }
      this.activeSecondary = id;
      this.secondaryVisible = true;
    }
    else if (view.location === 'panel') {
      if (this.activePanel === id && this.panelVisible) {
        return;
      }
      this.activePanel = id;
      this.panelVisible = true;
    }
    else if (view.location === 'editor') {
      if (this.activeEditorView === id && !this.activeDocument) {
        return;
      }
      this.activeEditorView = id;
      this.activeDocument = null;
    }
    else if (view.location === 'preview') {
      if (this.activePreview === id && this.previewVisible) {
        return;
      }
      this.activePreview = id;
      this.previewVisible = true;
    }
    else {
      if (this.activePrimary === id && this.primaryVisible) {
        return;
      }
      this.activePrimary = id;
      this.primaryVisible = true;
    }
    this.render();
  }

  /**
   * Selects an open document tab.
   * @param {string} id Document identifier.
   * @returns {void}
   */
  openDocument(id) {
    if (!this.instance.documents.get(id)) {
      throw new Error(`Document "${id}" is not registered.`);
    }
    if (this.activeDocument === id) {
      return;
    }
    this.activeDocument = id;
    this.activeEditorView = null;
    this.render();
  }

  /**
   * Routes workbench action button clicks.
   * @param {MouseEvent} event Click event.
   * @returns {void}
   */
  handleClick(event) {
    const button = event.target.closest?.('button[data-action], button[data-resize]');
    if (!button || !this.shadow.contains(button)) {
      const hadContextMenu = Boolean(this.contextMenu);
      if (this.contextMenu) {
        this.contextMenu = null;
      }
      if (this.openMenu) {
        this.openMenu = null;
        this.refreshMenuSurfaces();
      }
      else if (hadContextMenu) {
        this.renderContextMenu(this.layout);
      }
      return;
    }
    const { action, id } = button.dataset;
    if (button.dataset.resize) {
      return;
    }
    if (action === 'toggle-menu') {
      this.contextMenu = null;
      this.openMenu = this.openMenu === id ? null : id;
      this.refreshMenuSurfaces(id);
    }
    else if (action === 'toggle-primary-view') {
      if (this.primaryVisible && this.selectedPrimaryView() === id) {
        this.primaryVisible = false;
        this.updateLayout();
      }
      else {
        this.openView(id);
      }
    }
    else if (action === 'toggle-preview') {
      this.previewVisible = !this.previewVisible;
      this.render();
    }
    else if (action === 'close-preview') {
      this.previewVisible = false;
      this.render();
    }
    else if (action === 'toggle-full-window') {
      this.fullWindow = !this.fullWindow;
      this.instance.container.classList.toggle('edy-full-window', this.fullWindow);
      const label = this.instance.translate(this.fullWindow ? 'exitFullWindow' : 'fullWindow');
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(this.fullWindow));
    }
    else if (action === 'open-view') {
      this.openView(id);
    }
    else if (action === 'open-editor-view') {
      if (this.activeEditorView === id && !this.activeDocument) {
        return;
      }
      this.activeEditorView = id;
      this.activeDocument = null;
      this.render();
    }
    else if (action === 'open-document') {
      this.openDocument(id);
    }
    else if (action === 'close-document') {
      this.instance.documents.remove(id);
    }
    else if (action === 'execute-command') {
      this.openMenu = null;
      this.contextMenu = null;
      this.refreshMenuSurfaces();
      this.instance.executeCommand(id).catch(() => {});
    }
    else if (action === 'toggle-primary') {
      this.primaryVisible = !this.primaryVisible;
      this.openMenu = null;
      this.updateLayout();
      this.refreshMenuSurfaces();
    }
    else if (action === 'toggle-secondary') {
      this.secondaryVisible = !this.secondaryVisible;
      this.openMenu = null;
      this.updateLayout();
      this.refreshMenuSurfaces();
    }
    else if (action === 'toggle-panel') {
      this.panelVisible = !this.panelVisible;
      this.openMenu = null;
      this.updateLayout();
      this.refreshMenuSurfaces();
    }
    else if (action === 'close-panel') {
      this.panelVisible = false;
      this.updateLayout();
    }
    else if (action === 'close-secondary') {
      this.secondaryVisible = false;
      this.updateLayout();
    }
    else if (action === 'about') {
      this.instance.notify('Edy 0.1.0', 'info');
      this.openMenu = null;
      this.refreshMenuSurfaces();
    }
    else if (action === 'status-action') {
      this.instance.status.get(id)?.onClick?.();
    }
  }

  /**
   * Opens extension context actions when a context menu is registered.
   * @param {MouseEvent} event Context-menu event.
   * @returns {void}
   */
  handleContextMenu(event) {
    const available = this.instance.menus.entries().some(([, item]) => item.menuId === 'context');
    if (!available) {
      return;
    }
    event.preventDefault();
    const bounds = this.shadow.querySelector('.edy-layout').getBoundingClientRect();
    const targetBounds = event.target.getBoundingClientRect?.();
    this.contextMenu = {
      x: event.clientX || targetBounds?.left || bounds.left,
      y: event.clientY || targetBounds?.top || bounds.top,
      returnFocus: this.shadow.activeElement,
    };
    this.openMenu = null;
    this.refreshMenuSurfaces();
    this.shadow.querySelector('.edy-context-menu [role="menuitem"]')?.focus();
  }

  /**
   * Starts pointer resizing for a pane or bottom panel.
   * @param {PointerEvent} event Pointer event.
   * @returns {void}
   */
  handlePointerDown(event) {
    const handle = event.target.closest?.('button[data-resize]');
    if (!handle) {
      return;
    }
    event.preventDefault();
    this.resizeState = {
      target: handle.dataset.resize,
      startX: event.clientX,
      startY: event.clientY,
      primaryWidth: this.primaryWidth,
      secondaryWidth: this.secondaryWidth,
      panelHeight: this.panelHeight,
    };
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp, { once: true });
    window.addEventListener('pointercancel', this.handlePointerUp, { once: true });
  }

  /**
   * Applies pointer movement to the currently resized surface.
   * @param {PointerEvent} event Pointer movement.
   * @returns {void}
   */
  handlePointerMove(event) {
    if (!this.resizeState) {
      return;
    }
    if (this.resizeState.target === 'primary') {
      this.primaryWidth = Math.max(150, Math.min(500, this.resizeState.primaryWidth + event.clientX - this.resizeState.startX));
    }
    else if (this.resizeState.target === 'secondary') {
      this.secondaryWidth = Math.max(150, Math.min(500, this.resizeState.secondaryWidth - event.clientX + this.resizeState.startX));
    }
    else {
      this.panelHeight = Math.max(100, Math.min(500, this.resizeState.panelHeight - event.clientY + this.resizeState.startY));
    }
    this.updateLayout();
  }

  /**
   * Completes pointer resizing and removes temporary global listeners.
   * @returns {void}
   */
  handlePointerUp() {
    this.resizeState = null;
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  }

  /**
   * Supports keyboard adjustments on resize handles and Escape for menus.
   * @param {KeyboardEvent} event Keyboard event.
   * @returns {void}
   */
  handleKeydown(event) {
    if (event.key === 'Escape' && (this.openMenu || this.contextMenu)) {
      const menuId = this.openMenu;
      const returnFocus = this.contextMenu?.returnFocus;
      this.openMenu = null;
      this.contextMenu = null;
      this.refreshMenuSurfaces(menuId);
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      }
      return;
    }
    if (event.key === 'Escape' && this.fullWindow) {
      this.fullWindow = false;
      this.instance.container.classList.remove('edy-full-window');
      const button = this.layout.querySelector('[data-action="toggle-full-window"]');
      button.title = this.instance.translate('fullWindow');
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', 'false');
      return;
    }
    if (!event.repeat && !event.isComposing && !event.defaultPrevented) {
      const shortcut = this.instance.menus.entries().find(([, item]) =>
        item.shortcut && matchesShortcut(event, parseShortcut(item.shortcut)));
      if (shortcut && this.instance.isCommandEnabled(shortcut[1].commandId)) {
        event.preventDefault();
        this.instance.executeCommand(shortcut[1].commandId).catch(() => {});
        return;
      }
    }
    if (event.target.matches?.('[role="menuitem"]') &&
        ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const items = [...event.target.closest('[role="menu"]').querySelectorAll('[role="menuitem"]:not(:disabled)')];
      const index = items.indexOf(event.target);
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? items.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      event.preventDefault();
      items[next]?.focus();
      return;
    }
    if (event.target.matches?.('[role="tab"]') &&
        ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      const tabs = [...event.target.parentElement.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(event.target);
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[next]?.focus();
      tabs[next]?.click();
      return;
    }
    const handle = event.target.closest?.('button[data-resize]');
    if (!handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey ? 30 : 10;
    if (handle.dataset.resize === 'primary') {
      this.primaryWidth = Math.max(150, Math.min(500, this.primaryWidth + (event.key === 'ArrowRight' ? step : -step)));
    }
    else if (handle.dataset.resize === 'secondary') {
      this.secondaryWidth = Math.max(150, Math.min(500, this.secondaryWidth + (event.key === 'ArrowLeft' ? step : -step)));
    }
    else {
      this.panelHeight = Math.max(100, Math.min(500, this.panelHeight + (event.key === 'ArrowUp' ? step : -step)));
    }
    this.updateLayout();
    this.shadow.querySelector(`[data-resize="${handle.dataset.resize}"]`)?.focus();
  }

  /**
   * Removes listeners and workbench content.
   * @returns {void}
   */
  dispose() {
    this.previewViewport?.dispose();
    this.previewViewport = null;
    this.instance.container.classList.remove('edy-full-window');
    if (this.previousHostTheme === null) {
      this.instance.container.removeAttribute('data-edy-theme');
    }
    else {
      this.instance.container.setAttribute('data-edy-theme', this.previousHostTheme);
    }
    this.renderedContributions.clear();
    this.disposeRenderResources();
    this.shadow.removeEventListener('click', this.handleClick);
    this.shadow.removeEventListener('keydown', this.handleKeydown);
    this.shadow.removeEventListener('pointerdown', this.handlePointerDown);
    this.shadow.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    this.themeQuery?.removeEventListener('change', this.handleThemeChange);
    this.shadow.replaceChildren();
  }
}
