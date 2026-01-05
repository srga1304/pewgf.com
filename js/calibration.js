class CalibrationRoutine extends EventEmitter {
  constructor(ui) {
    super();
    this.ui = ui;
    this.isRunning = false;
    
    // Store all key bindings
    this.keyBindings = {
      forward: null,
      down: null,
      button2: null
    };
    
    this.currentStep = 0;
    this.steps = ['forward', 'down', 'button2'];
    this.stepLabels = {
      forward: 'Press Forward',
      down: 'Press Down',
      button2: 'Press Button 2 (Attack)'
    };
    
    // Universal input handler (listening to all devices)
    this.keyboardDownHandler = null;
    this.keyboardUpHandler = null;
    this.gamepadPollingHandle = null;
    this.lastGamepadState = {};
    this.pressedKeys = new Set();
  }

  /**
   * Start calibration - ask user to select all keys
   */
  start() {
    this.isRunning = true;
    this.currentStep = 0;
    this.keyBindings = {
      forward: null,
      down: null,
      button2: null
    };
    this.pressedKeys.clear();
    this.lastGamepadState = {};
    
    this.ui.showCalibrationModal();
    this.nextStep();
  }

  /**
   * Move to next calibration step
   */
  nextStep() {
    if (this.currentStep >= this.steps.length) {
      this.finishCalibration();
      return;
    }
    
    const stepName = this.steps[this.currentStep];
    const label = this.stepLabels[stepName];
    
    this.ui.updateCalibrationStatus(label);
    this.setupKeyListener(stepName);
  }

  /**
   * Setup listener for current step
   */
  setupKeyListener(stepName) {
    // Remove old listeners
    if (this.keyboardDownHandler) {
      window.removeEventListener('keydown', this.keyboardDownHandler);
    }
    if (this.keyboardUpHandler) {
      window.removeEventListener('keyup', this.keyboardUpHandler);
    }

    this.keyboardDownHandler = (event) => {
      if (!this.isRunning) return;
      
      const key = event.key;
      if (this.pressedKeys.has(key)) return;
      
      // Record key for this step
      this.keyBindings[stepName] = key;
      this.pressedKeys.add(key);
      
      // Flash and proceed
      this.ui.flashMetronome();
      this.ui.updateCalibrationStatus(`${this.stepLabels[stepName]} - Set to: ${key}`);
      
      // Move to next step after short delay
      setTimeout(() => {
        this.currentStep++;
        this.pressedKeys.clear();
        this.nextStep();
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
      keyBindings: this.keyBindings
    });
  }

  /**
   * Skip calibration - use defaults
   */
  skip() {
    this.isRunning = false;
    this.removeInputListener();
    
    this.ui.hideCalibrationModal();
    // Default keyboard bindings
    this.emit('skipped', { 
      keyBindings: {
        forward: 'd',
        down: 's',
        button2: ' '
      }
    });
  }

  /**
   * Get calibration results
   */
  getResults() {
    return {
      keyBindings: this.keyBindings
    };
  }
}
