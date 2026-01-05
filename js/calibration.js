class CalibrationRoutine extends EventEmitter {
  constructor(ui) {
    super();
    this.ui = ui;
    this.isRunning = false;
    
    this.bindings = {
      up: null,
      down: null,
      left: null,
      right: null,
      button2: null
    };
    
    this.currentStep = 0;
    this.steps = ['up', 'down', 'left', 'right', 'button2'];
    this.stepLabels = {
      up: 'Press Up',
      down: 'Press Down',
      left: 'Press Left',
      right: 'Press Right',
      button2: 'Press Button 2 (Attack)'
    };
    
    this.keyboardDownHandler = null;
    this.pollingHandle = null;
    this.lastGamepadStates = {};
  }

  /**
   * Start calibration - listen for any input device
   */
  start() {
    this.isRunning = true;
    this.currentStep = 0;
    this.bindings = { up: null, down: null, left: null, right: null, button2: null };
    this.lastGamepadStates = {};
    
    this.ui.showCalibrationModal();
    this.nextStep();
  }

  nextStep() {
    if (this.currentStep >= this.steps.length) {
      this.finishCalibration();
      return;
    }
    
    const stepName = this.steps[this.currentStep];
    const label = this.stepLabels[stepName];
    
    this.ui.updateCalibrationStatus(label);
    this.listenForAnyInput(stepName);
  }

  listenForAnyInput(stepName) {
    // Listen for keyboard
    this.keyboardDownHandler = (event) => {
      event.preventDefault();
      const binding = {
        device: 'keyboard',
        type: 'key',
        key: event.key.toLowerCase()
      };
      this.recordBinding(stepName, binding, event.key);
    };
    window.addEventListener('keydown', this.keyboardDownHandler);

    // Poll for gamepad
    const poll = () => {
      if (!this.isRunning) return;
      const gamepads = navigator.getGamepads?.() || [];
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) continue;

        // Init state if not seen before
        if (!this.lastGamepadStates[i]) {
          this.lastGamepadStates[i] = { buttons: gamepad.buttons.map(b => b.pressed), axes: [...gamepad.axes] };
        }

        // Check buttons
        for (let j = 0; j < gamepad.buttons.length; j++) {
          if (gamepad.buttons[j].pressed && !this.lastGamepadStates[i].buttons[j]) {
            const binding = { device: 'gamepad', id: gamepad.id, index: i, type: 'button', buttonIndex: j };
            this.recordBinding(stepName, binding, `GP${i}-B${j}`);
            return;
          }
        }

        // Check axes
        for (let j = 0; j < gamepad.axes.length; j++) {
          const axisValue = gamepad.axes[j];
          if (Math.abs(axisValue) > 0.8 && Math.abs(this.lastGamepadStates[i].axes[j]) < 0.5) {
            const direction = axisValue > 0 ? '+' : '-';
            const binding = { device: 'gamepad', id: gamepad.id, index: i, type: 'axis', axisIndex: j, direction };
            this.recordBinding(stepName, binding, `GP${i}-A${j}${direction}`);
            return;
          }
        }
        
        // Update last state
        this.lastGamepadStates[i] = { buttons: gamepad.buttons.map(b => b.pressed), axes: [...gamepad.axes] };
      }
      this.pollingHandle = requestAnimationFrame(poll);
    };
    this.pollingHandle = requestAnimationFrame(poll);
  }

  recordBinding(stepName, binding, bindingLabel) {
    this.stopListeners();
    this.bindings[stepName] = binding;
    
    this.ui.flashMetronome();
    this.ui.updateCalibrationStatus(`${this.stepLabels[stepName]} - Set to: ${bindingLabel}`);
      
    setTimeout(() => {
      this.currentStep++;
      this.nextStep();
    }, 500);
  }

  stopListeners() {
    if (this.keyboardDownHandler) {
      window.removeEventListener('keydown', this.keyboardDownHandler);
      this.keyboardDownHandler = null;
    }
    if (this.pollingHandle) {
      cancelAnimationFrame(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  finishCalibration() {
    this.isRunning = false;
    this.stopListeners();
    this.ui.hideCalibrationModal();
    this.emit('complete', { bindings: this.bindings });
  }

  skip() {
    this.isRunning = false;
    this.stopListeners();
    this.ui.hideCalibrationModal();
    
    // Default to WASD + Space
    this.emit('skipped', { 
      bindings: {
        up: { device: 'keyboard', type: 'key', key: 'w' },
        down: { device: 'keyboard', type: 'key', key: 's' },
        left: { device: 'keyboard', type: 'key', key: 'a' },
        right: { device: 'keyboard', type: 'key', key: 'd' },
        button2: { device: 'keyboard', type: 'key', key: ' ' },
      }
    });
  }

  getResults() {
    return { bindings: this.bindings };
  }
}
