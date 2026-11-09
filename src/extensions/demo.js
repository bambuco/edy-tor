/**
 * @file Demonstrates extension contributions, commands, editing, and live preview.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createButton, createButtonGroup, createForm, createList, openDialog } from '../ui/controls.js';
import { createPreviewFrame } from '../core/preview.js';
import { faHouse, faFolder, faFile, faStar } from '../../node_modules/@fortawesome/free-solid-svg-icons/index.mjs';

/**
 * Demonstrates a trusted extension contributing commands, views, menus, forms, and status.
 * @type {Object}
 */
export const demoExtension = {
  id: 'edy.demo',
  apiVersion: '1',
  requires: [],

  /**
   * Registers the extension's sample workbench contributions.
   * @param {Object} context Edy extension context.
   * @returns {void}
   */
  activate(context) {
    const t = context.translate;
    let previewText = t('welcomeText');
    let activePreview = null;
    const updatePreview = () => {
      activePreview?.postMessage({ operation: 'update', payload: { text: previewText } });
    };
    context.commands.register('greet', {
      label: t('sampleCommand'),
      execute: () => context.notifications.success(`${t('greeting')}, Edy!`),
    });
    context.commands.register('show-welcome', {
      label: t('openWelcome'),
      execute: () => context.views.open('welcome'),
    });
    context.commands.register('toggle-theme', {
      label: t('darkTheme'),
      execute: () => context.notifications.info(`${t('darkTheme')}: set the theme option when creating the instance.`),
    });
    context.views.register('welcome', {
      title: t('welcome'),
      location: 'editor',
      render: () => {
        const content = document.createElement('section');
        const heading = document.createElement('h1');
        heading.textContent = t('welcomeTitle');
        const description = document.createElement('p');
        description.textContent = t('welcomeText');
        const action = createButton({
          label: t('sampleCommand'),
          variant: 'primary',
          onClick: () => context.commands.execute('greet').catch(() => {}),
        });
        content.append(heading, description, action);
        return content;
      },
    });
    context.views.register('explorer', {
      title: t('explorer'),
      icon: '▤',
      location: 'primary',
      sections: [
        {
          id: 'files',
          title: t('files'),
          height: 2,
          actions: [
            { icon: '+', label: t('newFile'), onClick: () => context.notifications.info(t('sampleAction')) },
            { icon: '⋯', label: t('moreActions'), menu: [
              { label: t('showMessage'), onClick: () => context.ui.confirm(t('sampleAction')) },
            ] },
          ],
          render: () => createList([
            {
              id: 'project',
              label: t('treeGroup'),
              icon: '📁',
              children: [
                { id: 'src', label: 'src', icon: '📁', children: [{ id: 'index', label: 'index.html', icon: '📄' }] },
                { id: 'readme', label: 'README.md', icon: '📄' },
              ],
            },
          ], {
            tree: true,
            onSelect: (item) => context.notifications.info(item.label),
          }),
        },
        {
          id: 'outline',
          title: t('outline'),
          height: 1,
          actions: [{ icon: '↻', label: t('refresh'), onClick: () => context.notifications.info(t('sampleAction')) }],
          render: () => createList([{ id: 'example', label: t('sampleItem') }], {
            onSelect: () => context.views.open('form'),
          }),
        },
      ],
    });
    context.views.register('quick-access', {
      title: t('quickAccess'),
      icon: '◇',
      location: 'primary',
      render: () => createList([
        { id: 'welcome', label: t('welcome') },
        { id: 'form', label: t('sampleView') },
      ], {
        onSelect: (item) => context.views.open(item.id),
      }),
    });
    context.views.register('properties', {
      title: t('properties'),
      location: 'secondary',
      render: () => {
        const content = document.createElement('section');
        const heading = document.createElement('h2');
        heading.textContent = t('properties');
        const description = document.createElement('p');
        description.textContent = t('nameHelp');
        content.append(heading, description);
        return content;
      },
    });
    context.views.register('output', {
      title: t('output'),
      location: 'panel',
      render: () => {
        const content = document.createElement('p');
        content.textContent = t('outputReady');
        return content;
      },
    });
    context.views.register('form', {
      title: t('sampleView'),
      location: 'editor',
      render: () => {
        const content = document.createElement('section');
        const heading = document.createElement('h1');
        heading.textContent = t('formTitle');
        const form = createForm({
          translate: t,
          onError: (error) => context.notifications.error(error),
          fields: [
            {
              name: 'name',
              label: t('name'),
              required: true,
              help: t('nameHelp'),
              validate: (value) => value.trim().length >= 2 ? '' : t('invalidName'),
            },
            { name: 'count', label: t('count'), type: 'number', min: 0, value: 1 },
            {
              name: 'kind',
              label: t('type'),
              type: 'select',
              options: [
                { value: 'sample', label: t('sampleItem') },
                { value: 'document', label: t('editorTabs') },
              ],
            },
            { name: 'enabled', label: t('enabled'), type: 'checkbox', value: true },
            { name: 'preview', label: t('preview'), type: 'switch' },
            { name: 'color', label: t('color'), type: 'color', value: '#286bc1' },
            {
              name: 'icon', label: t('iconPicker'), type: 'icon', value: 'house',
              options: [
                [faHouse, t('iconHome')], [faFolder, t('iconFolder')],
                [faFile, t('iconFile')], [faStar, t('iconStar')],
              ].map(([icon, label]) => ({
                value: icon.iconName, label, width: icon.icon[0], height: icon.icon[1], path: icon.icon[4],
              })),
            },
            { name: 'html', label: t('htmlEditor'), type: 'tinymce', mode: 'simple', value: '<p>Hello, Edy!</p>' },
            { name: 'date', label: t('date'), type: 'date' },
            { name: 'range', label: t('range'), type: 'range', min: 0, max: 100, value: 50 },
            {
              name: 'layout',
              label: t('layout'),
              type: 'radio',
              value: 'editor',
              options: [
                { value: 'editor', label: t('editorLayout') },
                { value: 'preview', label: t('previewLayout') },
              ],
            },
            {
              name: 'notes',
              label: t('notes'),
              type: 'textarea',
              visibleWhen: { field: 'layout', equals: 'preview' },
            },
          ],
          onSubmit: (values) => context.notifications.success(`${t('formApplied')} ${t('iconPicker')}: ${values.icon}; ${t('htmlEditor')}: ${values.html}`),
          onCancel: () => context.notifications.info(t('cancel')),
        });
        const group = createButtonGroup({
          label: t('sampleActions'),
          buttons: [
            {
              label: t('showMessage'),
              onClick: () => {
                context.ui.confirm(t('sampleAction')).catch((error) => context.notifications.error(error));
              },
            },
            {
              label: t('settings'),
              onClick: () => {
                const settingsForm = createForm({
                  translate: t,
                  fields: [{ name: 'name', label: t('name'), required: true }],
                  onSubmit: () => {
                    dialog.close();
                    context.notifications.success(t('formApplied'));
                  },
                });
                const dialog = openDialog({
                  title: t('settings'),
                  content: settingsForm,
                  closeLabel: t('close'),
                  container: content.getRootNode(),
                });
              },
            },
          ],
        });
        content.append(heading, group, form);
        return content;
      },
    });
    context.views.register('preview', {
      title: t('preview'),
      location: 'preview',
      viewport: {
        width: 1024,
        height: 768,
        presets: [
          { id: 'desktop', label: t('desktopSize'), width: 1024, height: 768 },
          { id: 'mobile', label: t('mobileSize'), width: 375, height: 667 },
        ],
      },
      render: () => {
        const previewUrl = new URL('../../examples/preview/index.html', import.meta.url);
        previewUrl.searchParams.set('locale', context.locale);
        const preview = createPreviewFrame({
          src: previewUrl,
          title: t('preview'),
          allowedOrigin: 'null',
          operations: ['ready', 'update'],
          validateMessage: (message) => message.operation === 'ready',
          sandbox: 'allow-scripts',
        });
        activePreview = preview;
        const subscription = preview.onMessage(() => {
          context.notifications.success(t('previewReady'));
          updatePreview();
        });
        return {
          element: preview.element,
          dispose() {
            if (activePreview === preview) {
              activePreview = null;
            }
            subscription.dispose();
            preview.dispose();
          },
        };
      },
    });
    context.menus.register('file', {
      id: 'welcome',
      label: t('openWelcome'),
      commandId: 'show-welcome',
      order: 10,
    });
    context.menus.register('edit', {
      id: 'greet',
      label: t('sampleCommand'),
      commandId: 'greet',
      icon: '✦',
      shortcut: 'Ctrl+Shift+G',
      order: 10,
    });
    context.menus.register('context', {
      id: 'greet',
      label: t('sampleCommand'),
      commandId: 'greet',
      order: 10,
    });
    context.status.register('demo-status', {
      label: 'Edy API 1',
      tooltip: t('about'),
      onClick: () => context.notifications.info('Edy extension API 1'),
    });
    context.documents.open('sample-document', {
      title: t('sampleItem'),
      render: () => {
        const content = document.createElement('article');
        const heading = document.createElement('h1');
        heading.textContent = t('sampleItem');
        const paragraph = document.createElement('p');
        paragraph.textContent = t('livePreviewHelp');
        const label = document.createElement('label');
        label.textContent = t('livePreviewText');
        const input = document.createElement('textarea');
        input.value = previewText;
        input.rows = 6;
        input.maxLength = 10000;
        input.addEventListener('input', () => {
          previewText = input.value;
          updatePreview();
        });
        label.append(input);
        content.append(heading, paragraph, label);
        return content;
      },
    });
  },

  /**
   * Releases extension-owned resources.
   * @returns {void}
   */
  deactivate() {},
};
