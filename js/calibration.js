class CalibrationRoutine extends EventEmitter {
  constructor(ui) {
    super();
    this.ui = ui;
    this.isRunning = false;
    this.button2Key = null; // Store selected button 2 key
    
    // Universal input handler (listening to all devices)
    this.keyboardDownHandler = null;
    this.keyboardUpHandler = null;
    this.gamepadPollingHandle = null;
    this.lastGamepadState = {};
    this.pressedKeys = new Set();
  }

  /**
   * Start calibration - ask user to select button 2 key
   */
  start() {
    this.isRunning = true;
    this.button2Key = null;
    this.pressedKeys.clear();
    this.lastGamepadState = {};
    
    this.ui.showCalibrationModal();
    this.setupButtonSelectListener();
  }

  /**
   * Setup listener for button 2 key selection
   */
  setupButtonSelectListener() {
    this.keyboardDownHandler = (event) => {
      if (!this.isRunning) return;
      
      const key = event.key;
      if (this.pressedKeys.has(key)) return;
      
      // Skip directions, only capture button presses
      const input = keyboardEventToDirection(key);
      if (input && input !== 'button2') return;
      
      // Record this key as button 2
      this.button2Key = key;
      this.pressedKeys.add(key);
      
      // Flash and proceed
      this.ui.flashMetronome();
      this.ui.updateCalibrationStatus(`Button 2 set to: ${key}`);
      
      // Start training after short delay
      setTimeout(() => {
        this.finishCalibration();
      }, 500);
    };

    this.keyboardUpHandler = (event) => {
      this.pressedKeys.delete(event.key);
    };

    window.addEventListener('keydown', this.keyboardDownHandler);
    window.addEventListener('keyup', this.keyboardUpHandler);
  }

  /**
   * Remove input listeners
   */
  removeInputListener() {
    if (this.keyboardDownHandler) {
      window.removeEventListener('keydown', this.keyboardDownHandler);
    }
    if (this.keyboardUpHandler) {
      window.removeEventListener('keyup', this.keyboardUpHandler);
    }
    if (this.gamepadPollingHandle) {
      cancelAnimationFrame(this.gamepadPollingHandle);
    }
  }

  /**
   * Finish calibration
   */
  finishCalibration() {
    this.isRunning = false;
    this.removeInputListener();
    
    this.ui.hideCalibrationModal();
    this.emit('complete', { 
      button2Key: this.button2Key,
      offset: 0 // No timing offset needed for simple key selection
    });
  }

  /**
   * Skip calibration
   */
  skip() {
    this.isRunning = false;
    this.removeInputListener();
    
    this.ui.hideCalibrationModal();
    this.emit('skipped', { button2Key: ' ' }); // Default to spacebar
  }

  /**
   * Get calibration results
   */
  getResults() {
    return {
      button2Key: this.button2Key,
      offset: 0
    };
  }
}
