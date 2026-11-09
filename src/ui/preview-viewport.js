/**
 * @file Provides configurable logical dimensions and visual scaling for preview views.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Validates and normalizes the optional viewport configuration.
 * @param {Object} options Extension configuration.
 * @returns {Object} Validated configuration.
 */
export function normalizePreviewViewport(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Preview viewport configuration must be an object.');
  }
  const config = {
    width: options.width ?? 1024,
    height: options.height ?? 768,
    minWidth: options.minWidth ?? 200,
    maxWidth: options.maxWidth ?? 4096,
    minHeight: options.minHeight ?? 100,
    maxHeight: options.maxHeight ?? 4096,
    minScale: options.minScale ?? 25,
    maxScale: options.maxScale ?? 200,
    scale: options.scale ?? 'auto',
    presets: options.presets ?? [],
    onChange: options.onChange,
  };
  for (const key of ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'minScale', 'maxScale']) {
    if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 10000) {
      throw new RangeError(`Preview viewport ${key} must be an integer between 1 and 10000.`);
    }
  }
  if (config.minWidth > config.maxWidth || config.minHeight > config.maxHeight ||
      config.minScale > config.maxScale || config.width < config.minWidth || config.width > config.maxWidth ||
      config.height < config.minHeight || config.height > config.maxHeight ||
      (config.scale !== 'auto' && (!Number.isInteger(config.scale) ||
        config.scale < config.minScale || config.scale > config.maxScale))) {
    throw new RangeError('Preview viewport defaults must fall within their configured limits.');
  }
  if (config.onChange !== undefined && typeof config.onChange !== 'function') {
    throw new TypeError('Preview viewport onChange must be a function.');
  }
  if (!Array.isArray(config.presets)) {
    throw new TypeError('Preview viewport presets must be an array.');
  }
  const ids = new Set();
  config.presets = config.presets.map((preset) => {
    if (!preset || typeof preset.id !== 'string' || !preset.id.trim() || ids.has(preset.id) ||
        typeof preset.label !== 'string' || !preset.label.trim() ||
        !Number.isInteger(preset.width) || preset.width < config.minWidth || preset.width > config.maxWidth ||
        !Number.isInteger(preset.height) || preset.height < config.minHeight || preset.height > config.maxHeight) {
      throw new TypeError('Preview presets require unique ids, labels, and dimensions within the configured limits.');
    }
    ids.add(preset.id);
    return { id: preset.id, label: preset.label, width: preset.width, height: preset.height };
  });
  return config;
}

/**
 * Computes an automatic visual scale without upscaling or altering logical dimensions.
 * @param {number} availableWidth Available width.
 * @param {number} availableHeight Available height.
 * @param {number} width Logical width.
 * @param {number} height Logical height.
 * @returns {number} Scale factor.
 */
export function fitPreviewScale(availableWidth, availableHeight, width, height) {
  return Math.min(1, Math.max(0, availableWidth) / width, Math.max(0, availableHeight) / height);
}

/**
 * Wraps preview content in an interactive, independently scaled viewport.
 * @param {{config: Object, state: Object, translate: Function, onError: Function}} options Viewport options.
 * @returns {{element: HTMLElement, target: HTMLElement, start: Function, dispose: Function}} Viewport API.
 */
export function createPreviewViewport({ config, state, translate, onError }) {
  const root = document.createElement('div');
  root.className = 'edy-viewport';
  const toolbar = document.createElement('div');
  toolbar.className = 'edy-viewport__toolbar';
  const stage = document.createElement('div');
  stage.className = 'edy-viewport__stage';
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', translate('previewViewport'));
  const footprint = document.createElement('div');
  footprint.className = 'edy-viewport__footprint';
  const target = document.createElement('div');
  target.className = 'edy-viewport__target';
  footprint.append(target);
  stage.append(footprint);
  root.append(toolbar, stage);

  const numberControl = (key, label, min, max) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = translate(label);
    const input = document.createElement('input');
    input.type = 'number';
    input.required = true;
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.value = String(state[key]);
    wrapper.append(input);
    toolbar.append(wrapper);
    input.addEventListener('change', () => {
      if (!input.checkValidity() || !Number.isInteger(input.valueAsNumber)) {
        input.reportValidity();
        input.value = String(state[key]);
        return;
      }
      state[key] = input.valueAsNumber;
      update();
      notify();
    });
    return input;
  };
  const widthInput = numberControl('width', 'previewWidth', config.minWidth, config.maxWidth);
  const heightInput = numberControl('height', 'previewHeight', config.minHeight, config.maxHeight);
  let presets;
  if (config.presets.length) {
    const wrapper = document.createElement('label');
    wrapper.textContent = translate('previewPreset');
    presets = document.createElement('select');
    const custom = document.createElement('option');
    custom.value = '';
    custom.textContent = translate('previewCustom');
    presets.append(custom);
    for (const preset of config.presets) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      presets.append(option);
    }
    presets.addEventListener('change', () => {
      const preset = config.presets.find((item) => item.id === presets.value);
      if (preset) {
        state.width = preset.width;
        state.height = preset.height;
        widthInput.value = String(state.width);
        heightInput.value = String(state.height);
        update();
        notify();
      }
    });
    wrapper.append(presets);
    toolbar.append(wrapper);
  }
  const scaleLabel = document.createElement('label');
  scaleLabel.textContent = translate('previewScale');
  const mode = document.createElement('select');
  for (const [value, text] of [['auto', 'previewScaleAuto'], ['manual', 'previewScaleManual']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = translate(text);
    mode.append(option);
  }
  mode.value = state.scale === 'auto' ? 'auto' : 'manual';
  scaleLabel.append(mode);
  toolbar.append(scaleLabel);
  const scaleState = { scalePercent: state.scale === 'auto'
    ? Math.max(config.minScale, Math.min(config.maxScale, 100)) : state.scale };
  const percentLabel = document.createElement('label');
  percentLabel.textContent = translate('previewScalePercent');
  const percent = document.createElement('input');
  percent.type = 'number';
  percent.required = true;
  percent.min = String(config.minScale);
  percent.max = String(config.maxScale);
  percent.step = '1';
  percent.value = String(scaleState.scalePercent);
  percentLabel.append(percent);
  toolbar.append(percentLabel);
  const actual = document.createElement('output');
  actual.setAttribute('aria-live', 'polite');
  toolbar.append(actual);
  mode.addEventListener('change', () => {
    state.scale = mode.value === 'auto' ? 'auto' : scaleState.scalePercent;
    update();
    notify();
  });
  percent.addEventListener('change', () => {
    if (!percent.checkValidity() || !Number.isInteger(percent.valueAsNumber)) {
      percent.reportValidity();
      percent.value = String(scaleState.scalePercent);
      return;
    }
    scaleState.scalePercent = percent.valueAsNumber;
    state.scale = scaleState.scalePercent;
    update();
    notify();
  });
  function update() {
    const scale = state.scale === 'auto'
      ? fitPreviewScale(stage.clientWidth, stage.clientHeight, state.width, state.height)
      : state.scale / 100;
    target.style.width = `${state.width}px`;
    target.style.height = `${state.height}px`;
    target.style.transform = `scale(${scale})`;
    footprint.style.width = `${state.width * scale}px`;
    footprint.style.height = `${state.height * scale}px`;
    percent.disabled = state.scale === 'auto';
    actual.value = `${Math.round(scale * 100)}%`;
    if (presets) {
      presets.value = config.presets.find((item) => item.width === state.width && item.height === state.height)?.id ?? '';
    }
  }
  function notify() {
    if (!config.onChange) return;
    try {
      Promise.resolve(config.onChange({ ...state })).catch(onError);
    }
    catch (error) {
      onError(error);
    }
  }
  const observer = new ResizeObserver(update);
  return {
    element: root,
    target,
    start() {
      observer.observe(stage);
      update();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
