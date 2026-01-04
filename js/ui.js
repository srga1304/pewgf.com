class UI {
  constructor() {
    this.elements = this.cacheElements();
    this.resultDisplayTimeout = null;
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    return {
      // Modals
      setupModal: DOM.query('#setupModal'),
      calibrationModal: DOM.query('#calibrationModal'),

      // Header & Practice Area
      header: DOM.query('#header'),
      practiceArea: DOM.query('#practiceArea'),

      // Device selection
      deviceRadios: DOM.queryAll('input[name="device"]'),
      skipCalibrationCheckbox: DOM.query('#skipCalibration'),
      startButton: DOM.query('#startButton'),
      deviceDetectionStatus: DOM.query('#deviceDetectionStatus'),
      deviceIndicator: DOM.query('#deviceIndicator'),

      // Calibration
      calibrationStatus: DOM.query('#calibrationStatus'),
      beatsRemaining: DOM.query('#beatsRemaining'),
      metronomeVisual: DOM.query('#metronomeVisual'),
      skipCalibrationButton: DOM.query('#skipCalibrationButton'),

      // Input Timeline
      inputTimeline: DOM.query('#inputTimeline'),
      timelineInputs: DOM.queryAll('.timeline-input'),
      gapLabel: DOM.query('#gapLabel'),
      timelineButton: DOM.query('.timeline-button'),

      // Result
      resultOverlay: DOM.query('#resultOverlay'),
      resultLabel: DOM.query('#resultLabel'),
      resultDelta: DOM.query('#resultDelta'),

      // Stats
      statTotal: DOM.query('#statTotal'),
      statEWGF: DOM.query('#statEWGF'),
      statEWGFPercent: DOM.query('#statEWGFPercent'),
      statPEWGF: DOM.query('#statPEWGF'),
      statPEWGFPercent: DOM.query('#statPEWGFPercent'),
      statAvgDelta: DOM.query('#statAvgDelta'),
      statStdDev: DOM.query('#statStdDev'),
      progressBars: DOM.query('#progressBars'),

      // Footer
      footerInstructions: DOM.query('#footerInstructions'),
      resetButton: DOM.query('#resetButton'),
      settingsButton: DOM.query('#settingsButton')
    };
  }

  /**
   * Show setup modal
   */
  showSetupModal() {
    DOM.toggleClass(this.elements.setupModal, 'modal--active', true);
  }

  /**
   * Hide setup modal
   */
  hideSetupModal() {
    DOM.toggleClass(this.elements.setupModal, 'modal--active', false);
  }

  /**
   * Show calibration modal
   */
  showCalibrationModal() {
    DOM.toggleClass(this.elements.calibrationModal, 'modal--active', true);
  }

  /**
   * Hide calibration modal
   */
  hideCalibrationModal() {
    DOM.toggleClass(this.elements.calibrationModal, 'modal--active', false);
  }

  /**
   * Show practice area
   */
  showPracticeArea() {
    DOM.show(this.elements.header);
    DOM.show(this.elements.practiceArea);
  }

  /**
   * Hide practice area
   */
  hidePracticeArea() {
    DOM.hide(this.elements.header);
    DOM.hide(this.elements.practiceArea);
  }

  /**
   * Set device detection status
   */
  setDeviceDetectionStatus(gamepadFound) {
    if (gamepadFound) {
      DOM.addClass(this.elements.deviceDetectionStatus, 'device-status--found');
      DOM.setText(
        this.elements.deviceDetectionStatus,
        'Gamepad detected'
      );
    } else {
      DOM.removeClass(this.elements.deviceDetectionStatus, 'device-status--found');
      DOM.setText(
        this.elements.deviceDetectionStatus,
        'No gamepad detected. Using keyboard.'
      );
    }
  }

  /**
   * Get selected device from setup modal
   */
  getSelectedDevice() {
    const selected = Array.from(this.elements.deviceRadios).find(
      (radio) => radio.checked
    );
    return selected ? selected.value : CONSTANTS.DEVICES.KEYBOARD;
  }

  /**
   * Get skip calibration checkbox state
   */
  shouldSkipCalibration() {
    return this.elements.skipCalibrationCheckbox.checked;
  }

  /**
   * Update device indicator in header
   */
  setDeviceIndicator(device) {
    DOM.setText(this.elements.deviceIndicator, device === CONSTANTS.DEVICES.GAMEPAD ? 'Gamepad' : 'Keyboard');
    DOM.toggleClass(this.elements.deviceIndicator, 'gamepad', device === CONSTANTS.DEVICES.GAMEPAD);
    DOM.toggleClass(this.elements.deviceIndicator, 'keyboard', device === CONSTANTS.DEVICES.KEYBOARD);
  }

  /**
   * Update calibration status text
   */
  updateCalibrationStatus(statusText) {
    DOM.setText(this.elements.calibrationStatus, statusText);
  }

  /**
   * Flash metronome visual
   */
  flashMetronome() {
    DOM.removeClass(this.elements.metronomeVisual, 'beat');
    void this.elements.metronomeVisual.offsetWidth; // Force reflow
    DOM.addClass(this.elements.metronomeVisual, 'beat');

    setTimeout(() => {
      DOM.removeClass(this.elements.metronomeVisual, 'beat');
    }, 200);
  }

  /**
   * Update input timeline with directional inputs
   */
  updateTimeline(directions, deltaMs = null) {
    // Update direction circles
    const timelineInputElements = this.elements.timelineInputs;
    const targetLength = Math.min(directions.length, timelineInputElements.length);

    for (let i = 0; i < timelineInputElements.length; i++) {
      const element = timelineInputElements[i];
      const direction = directions[i] || '';

      DOM.setText(element.querySelector('.timeline-label'), direction || '-');
      DOM.toggleClass(element, 'active', i < targetLength);
    }

    // Update gap indicator
    if (deltaMs !== null && deltaMs !== undefined) {
      const formattedDelta = Timing.formatDelta(deltaMs);
      DOM.setText(this.elements.gapLabel, formattedDelta);

      // Color code based on PEWGF window
      if (deltaMs >= CONSTANTS.PEWGF_THRESHOLD_MIN && deltaMs <= CONSTANTS.PEWGF_THRESHOLD_MAX) {
        DOM.addClass(this.elements.gapLabel, 'perfect');
        DOM.removeClass(this.elements.gapLabel, 'success');
      } else if (deltaMs >= CONSTANTS.EWGF_THRESHOLD_MIN && deltaMs <= CONSTANTS.EWGF_THRESHOLD_MAX) {
        DOM.addClass(this.elements.gapLabel, 'success');
        DOM.removeClass(this.elements.gapLabel, 'perfect');
      } else {
        DOM.removeClass(this.elements.gapLabel, 'perfect');
        DOM.removeClass(this.elements.gapLabel, 'success');
      }
    }
  }

  /**
   * Show result animation
   */
  showResult(type, deltaMs) {
    if (this.resultDisplayTimeout) {
      clearTimeout(this.resultDisplayTimeout);
    }

    const label = this.elements.resultLabel;
    const delta = this.elements.resultDelta;

    // Set result type and styling
    DOM.setText(label, type);
    DOM.setHTML(delta, Timing.formatDelta(deltaMs));

    // Remove all type classes
    DOM.removeClass(label, 'miss');
    DOM.removeClass(label, 'wgf');
    DOM.removeClass(label, 'ewgf');
    DOM.removeClass(label, 'pewgf');
    DOM.removeClass(label, 'fadeout');

    // Add correct type class
    const typeClass = type.toLowerCase();
    DOM.addClass(label, typeClass);

    // Show result
    label.style.opacity = '1';
    label.style.transform = 'scale(1)';

    // Auto-fade out after 800ms
    this.resultDisplayTimeout = setTimeout(() => {
      DOM.addClass(label, 'fadeout');
    }, 800);
  }

  /**
   * Hide result display
   */
  hideResult() {
    if (this.resultDisplayTimeout) {
      clearTimeout(this.resultDisplayTimeout);
    }

    const label = this.elements.resultLabel;
    DOM.setText(label, '');
    DOM.setText(this.elements.resultDelta, '');
    label.style.opacity = '0';
  }

  /**
   * Update statistics panel
   */
  updateStats(stats) {
    DOM.setText(this.elements.statTotal, stats.total);
    DOM.setText(this.elements.statEWGF, stats.ewgf + stats.pewgf);
    DOM.setText(this.elements.statEWGFPercent, `${round(stats.ewgfRate)}%`);
    DOM.setText(this.elements.statPEWGF, stats.pewgf);
    DOM.setText(this.elements.statPEWGFPercent, `${round(stats.pewgfRate)}%`);
    DOM.setText(this.elements.statAvgDelta, `${round(stats.avgDelta)}ms`);
    DOM.setText(this.elements.statStdDev, `${round(stats.stdDev)}ms`);

    this.updateProgressBars(stats.recent);
  }

  /**
   * Update progress bar visualization
   */
  updateProgressBars(recentAttempts) {
    const container = this.elements.progressBars;
    DOM.setHTML(container, '');

    recentAttempts.forEach((attempt) => {
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      DOM.addClass(bar, attempt.type.toLowerCase());
      container.appendChild(bar);
    });
  }

  /**
   * Add event listeners to buttons
   */
  onStartClick(handler) {
    DOM.on(this.elements.startButton, 'click', handler);
  }

  /**
   * Add event listeners to calibration skip
   */
  onSkipCalibrationClick(handler) {
    DOM.on(this.elements.skipCalibrationButton, 'click', handler);
  }

  /**
   * Add event listeners to reset button
   */
  onResetClick(handler) {
    DOM.on(this.elements.resetButton, 'click', handler);
  }

  /**
   * Add event listeners to settings button
   */
  onSettingsClick(handler) {
    DOM.on(this.elements.settingsButton, 'click', handler);
  }

  /**
   * Clear timeline
   */
  clearTimeline() {
    this.updateTimeline([], null);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.resultDisplayTimeout) {
      clearTimeout(this.resultDisplayTimeout);
    }
  }
}
