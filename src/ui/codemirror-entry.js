/**
 * @file Initializes a local CodeMirror editor in its isolated document.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { basicSetup, EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

const languages = { html, css, javascript };

window.createEdyCodeEditor = ({ value, language, disabled, label, onChange }) => {
  const view = new EditorView({
    doc: value,
    parent: document.body,
    extensions: [
      basicSetup,
      languages[language](),
      EditorView.editable.of(!disabled),
      EditorState.readOnly.of(disabled),
      EditorView.contentAttributes.of({ 'aria-label': label }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
  window.addEventListener('unload', () => view.destroy(), { once: true });
  return view;
};
