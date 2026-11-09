/**
 * @file Creates resizable, collapsible extension-defined sidebar sections.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Creates an accordion whose sections fill their parent and can be resized.
 * @param {{sections: Array, onError: Function, resizeLabel: string}} options Accordion configuration.
 * @returns {{element: HTMLElement, dispose: Function}} Accordion and cleanup.
 */
export function createAccordion({ sections, onError, resizeLabel }) {
  if (!Array.isArray(sections) || !sections.length || typeof onError !== 'function' ||
      typeof resizeLabel !== 'string' || !resizeLabel.trim()) {
    throw new TypeError('An accordion requires sections, an error handler and a resize label.');
  }
  const root = document.createElement('div');
  root.className = 'edy-accordion';
  const cleanups = [];
  const entries = [];
  const ids = new Set();
  let drag = null;
  const report = (operation) => {
    try {
      Promise.resolve(operation()).catch(onError);
    }
    catch (error) {
      onError(error);
    }
  };
  for (const section of sections) {
    if (!section || typeof section.id !== 'string' || !section.id.trim() || ids.has(section.id) ||
        typeof section.title !== 'string' || !section.title.trim() ||
        typeof section.render !== 'function' ||
        (section.height !== undefined && (!Number.isFinite(section.height) || section.height <= 0)) ||
        (section.actions !== undefined && !Array.isArray(section.actions))) {
      throw new TypeError('Accordion sections require unique ids, titles, renderers and positive heights.');
    }
    ids.add(section.id);
    const element = document.createElement('section');
    element.className = 'edy-accordion__section';
    const header = document.createElement('div');
    header.className = 'edy-accordion__header';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'edy-accordion__toggle';
    toggle.textContent = section.title;
    const content = document.createElement('div');
    content.className = 'edy-accordion__content';
    const result = section.render();
    if (result instanceof Node) {
      content.append(result);
    }
    else if (result && result.element instanceof Node && typeof result.dispose === 'function') {
      content.append(result.element);
      cleanups.push(result.dispose);
    }
    else {
      throw new TypeError(`Accordion section "${section.id}" must render a node or disposable element.`);
    }
    const entry = { element, content, toggle, weight: section.height ?? 1, collapsed: Boolean(section.collapsed) };
    entries.push(entry);
    toggle.addEventListener('click', () => {
      entry.collapsed = !entry.collapsed;
      update();
    });
    header.append(toggle);
    for (const action of section.actions ?? []) {
      if (!action || typeof action.icon !== 'string' || !action.icon.trim() ||
          typeof action.label !== 'string' || !action.label.trim() ||
          (typeof action.onClick !== 'function' && !Array.isArray(action.menu)) ||
          (action.onClick && action.menu)) {
        throw new TypeError('Accordion actions require an icon, label and either onClick or menu.');
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'edy-accordion__action';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'edy-button';
      button.textContent = action.icon;
      button.title = action.label;
      button.setAttribute('aria-label', action.label);
      wrapper.append(button);
      if (action.menu) {
        const menu = document.createElement('div');
        menu.className = 'edy-accordion__menu';
        menu.setAttribute('role', 'menu');
        menu.hidden = true;
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');
        for (const item of action.menu) {
          if (!item || typeof item.label !== 'string' || !item.label.trim() || typeof item.onClick !== 'function') {
            throw new TypeError('Accordion menu items require a label and onClick.');
          }
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'edy-button';
          option.setAttribute('role', 'menuitem');
          option.textContent = item.label;
          option.addEventListener('click', () => {
            menu.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            report(item.onClick);
          });
          menu.append(option);
        }
        button.addEventListener('click', () => {
          menu.hidden = !menu.hidden;
          button.setAttribute('aria-expanded', String(!menu.hidden));
          if (!menu.hidden) menu.querySelector('button')?.focus();
        });
        wrapper.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && !menu.hidden) {
            menu.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            button.focus();
            event.stopPropagation();
          }
        });
        wrapper.append(menu);
      }
      else {
        button.addEventListener('click', () => report(action.onClick));
      }
      header.append(wrapper);
    }
    element.append(header, content);
    root.append(element);
    if (entries.length > 1) {
      const separator = document.createElement('button');
      separator.type = 'button';
      separator.className = 'edy-accordion__resize';
      separator.setAttribute('aria-label', resizeLabel);
      separator.setAttribute('aria-orientation', 'horizontal');
      root.insertBefore(separator, element);
      const before = entries[entries.length - 2];
      const resize = (delta) => {
        const a = before.element.getBoundingClientRect().height;
        const b = element.getBoundingClientRect().height;
        if (before.collapsed || entry.collapsed || a + delta < 55 || b - delta < 55) return;
        before.weight = a + delta;
        entry.weight = b - delta;
        update();
      };
      separator.addEventListener('pointerdown', (event) => {
        if (before.collapsed || entry.collapsed) return;
        drag = { y: event.clientY, resize };
        separator.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      separator.addEventListener('pointermove', (event) => {
        if (!drag) return;
        drag.resize(event.clientY - drag.y);
        drag.y = event.clientY;
      });
      separator.addEventListener('pointerup', () => { drag = null; });
      separator.addEventListener('pointercancel', () => { drag = null; });
      separator.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          resize((event.key === 'ArrowDown' ? 1 : -1) * (event.shiftKey ? 30 : 10));
        }
      });
    }
  }
  function update() {
    for (const entry of entries) {
      entry.content.hidden = entry.collapsed;
      entry.toggle.setAttribute('aria-expanded', String(!entry.collapsed));
      entry.element.style.flex = entry.collapsed ? '0 0 auto' : `${entry.weight} 1 0`;
    }
  }
  update();
  return {
    element: root,
    dispose() {
      const errors = [];
      for (const cleanup of cleanups) {
        try { cleanup(); }
        catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, 'Accordion cleanup failed.');
    },
  };
}
