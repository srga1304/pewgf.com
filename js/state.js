class AppState extends EventEmitter {
  constructor() {
    super();
    this.mode = CONSTANTS.MODES.SETUP;
    this.device = CONSTANTS.DEVICES.KEYBOARD;
    this.calibrationOffset = 0;
    this.isRunning = false;
    this.stats = new Statistics();
    this.preferences = {
      soundEnabled: false,
      theme: 'dark'
    };
  }

  /**
   * Set application mode
   */
  setMode(mode) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.emit('modeChange', { mode });
    }
  }

  /**
   * Set device type
   */
  setDevice(device) {
    if (this.device !== device) {
      this.device = device;
      this.emit('deviceChange', { device });
    }
  }

  /**
   * Set calibration offset
   */
  setCalibrationOffset(offset) {
    this.calibrationOffset = offset;
    this.emit('calibrationChange', { offset });
  }

  /**
   * Record attempt in stats
   */
  recordAttempt(attemptData) {
    const record = this.stats.recordAttempt(attemptData);
    this.emit('attemptRecorded', record);
    return record;
  }

  /**
   * Get current stats summary
   */
  getStatsSummary() {
    return this.stats.getSummary();
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats.reset();
    this.emit('statsReset');
  }

  /**
   * Get full state
   */
  getState() {
    return {
      mode: this.mode,
      device: this.device,
      calibrationOffset: this.calibrationOffset,
      isRunning: this.isRunning,
      stats: this.stats.export(),
      preferences: this.preferences
    };
  }

  /**
   * Save state to localStorage
   */
  saveToStorage() {
    const stateData = {
      device: this.device,
      calibrationOffset: this.calibrationOffset,
      stats: this.stats.export(),
      preferences: this.preferences
    };

    Storage.set('pewgf_state', stateData);
    this.emit('stateSaved');
  }

  /**
   * Load state from localStorage
   */
  loadFromStorage() {
    const stateData = Storage.get('pewgf_state');

    if (stateData) {
      if (stateData.device) {
        this.device = stateData.device;
      }
      if (stateData.calibrationOffset !== undefined) {
        this.calibrationOffset = stateData.calibrationOffset;
      }
      if (stateData.stats) {
        this.stats.import(stateData.stats);
      }
      if (stateData.preferences) {
        this.preferences = { ...this.preferences, ...stateData.preferences };
      }
    }

    this.emit('stateLoaded');
  }

  /**
   * Clear all data
   */
  clearStorage() {
    Storage.remove('pewgf_state');
    this.stats.reset();
    this.device = CONSTANTS.DEVICES.KEYBOARD;
    this.calibrationOffset = 0;
    this.emit('storageCleared');
  }

  /**
   * Export full state as JSON
   */
  exportJSON() {
    return JSON.stringify(this.getState(), null, 2);
  }
}
