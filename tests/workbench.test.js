/**
 * @file Tests workbench interaction state and activity-bar selection behavior.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { Workbench } from '../src/workbench/workbench.js';
import { createEdy } from '../src/core/instance.js';

test('invalid logo options are rejected before mounting', () => {
  const container = { attachShadow() {} };
  for (const logo of ['', '  ', null, 123, {}]) {
    assert.throws(() => createEdy({ container, logo }), /logo must be a non-empty image URL string/);
  }
});

test('theme is applied to both the workbench and the dialog host', () => {
  const attributes = new Map();
  const workbench = Object.create(Workbench.prototype);
  workbench.instance = {
    theme: 'dark',
    container: { setAttribute: (name, value) => attributes.set(name, value) },
  };
  const layout = { dataset: {} };
  workbench.applyTheme(layout);
  assert.equal(layout.dataset.theme, 'dark');
  assert.equal(attributes.get('data-edy-theme'), 'dark');
  workbench.instance.theme = 'light';
  workbench.applyTheme(layout);
  assert.equal(layout.dataset.theme, 'light');
  assert.equal(attributes.get('data-edy-theme'), 'light');
});

test('activity buttons toggle the selected primary view without changing openView semantics', () => {
  const views = new Map([
    ['first', { location: 'primary' }],
    ['second', { location: 'primary' }],
  ]);
  const workbench = Object.create(Workbench.prototype);
  workbench.instance = { views: { entries: () => [...views], get: (id) => views.get(id) } };
  workbench.activePrimary = null;
  workbench.primaryVisible = true;
  workbench.secondaryVisible = true;
  workbench.panelVisible = true;
  const hiddenClasses = new Set();
  const buttons = ['first', 'second'].map((id) => ({
    dataset: { action: 'toggle-primary-view', id },
    setAttribute(name, value) { this[name] = value; },
    closest() { return this; },
  }));
  workbench.shadow = { contains: () => true };
  workbench.layout = {
    classList: {
      toggle(name, enabled) {
        if (enabled) hiddenClasses.add(name);
        else hiddenClasses.delete(name);
      },
    },
    style: { setProperty() {} },
    querySelectorAll: () => buttons,
  };
  workbench.render = () => workbench.updateLayout();
  const click = (button) => workbench.handleClick({ target: button });

  workbench.updateLayout();
  assert.equal(buttons[0]['aria-pressed'], 'true');
  click(buttons[0]);
  assert.equal(workbench.primaryVisible, false);
  assert.equal(hiddenClasses.has('is-primary-hidden'), true);
  assert.equal(buttons[0]['aria-pressed'], 'false');
  click(buttons[0]);
  assert.equal(workbench.primaryVisible, true);
  assert.equal(buttons[0]['aria-pressed'], 'true');
  click(buttons[1]);
  assert.equal(workbench.activePrimary, 'second');
  assert.equal(buttons[0]['aria-pressed'], 'false');
  assert.equal(buttons[1]['aria-pressed'], 'true');
  workbench.openView('second');
  assert.equal(workbench.primaryVisible, true);
  click(buttons[1]);
  assert.equal(workbench.primaryVisible, false);
  workbench.openView('second');
  assert.equal(workbench.primaryVisible, true);
  assert.equal(buttons[1]['aria-pressed'], 'true');
});
