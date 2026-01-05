class InputHandler extends EventEmitter {
  constructor() {
    super();
    this.device = CONSTANTS.DEVICES.KEYBOARD;
    this.calibrationOffset = 0;
    
    // Key bindings - only need forward, down, and button2
    this.keyBindings = {
      forward: 'd',
      down: 's',
      button2: ' '
    };
    
    this.pressedKeys = new Set();
    this.gamepadState = {};
    this.pollingHandle = null;
    this.lastGamepadState = {};
    this.lastEmittedDirection = null;
    this.keyDownTime = new Map(); // Track when each key was pressed
    this.isInitialized = false; // Track initialization state
  }

  /**
   * Initialize input handler for specific device
   */
  initialize(device = CONSTANTS.DEVICES.KEYBOARD) {
    if (this.isInitialized) return; // Prevent double initialization
    
    this.isInitialized = true;
    this.device = device;
    this.setupEventListeners();

    if (device === CONSTANTS.DEVICES.GAMEPAD) {
      this.startGamepadPolling();
    }
  }

  /**
   * Setup keyboard event listeners
   */
  setupEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Handle keyboard keydown
   */
  handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (this.pressedKeys.has(key)) return; // Prevent repeat events

    const timestamp = performance.now();

    // Check if this is the button 2 key
    if (key === this.keyBindings.button2.toLowerCase()) {
      this.emit('button2', { timestamp });
      return;
    }

    // Track which direction keys are pressed
    if (key === this.keyBindings.forward.toLowerCase()) {
      this.pressedKeys.add('forward');
    } else if (key === this.keyBindings.down.toLowerCase()) {
      this.pressedKeys.add('down');
    } else {
      return; // Unknown key
    }

    this.keyDownTime.set(key, performance.now());

    // Determine current direction from pressed keys
    const direction = this.determineDirection();
    if (direction !== this.lastEmittedDirection) {
      this.emit('direction', { direction, timestamp });
      this.lastEmittedDirection = direction;
    }
  }

  /**
   * Handle keyboard keyup
   */
  handleKeyUp(event) {
    const key = event.key.toLowerCase();
    this.keyDownTime.delete(key);

    // Update pressed keys based on bindings
    if (key === this.keyBindings.forward.toLowerCase()) {
      this.pressedKeys.delete('forward');
    } else if (key === this.keyBindings.down.toLowerCase()) {
      this.pressedKeys.delete('down');
    }

    // Re-evaluate direction when key is released
    const newDirection = this.determineDirection();
    if (newDirection !== this.lastEmittedDirection) {
      const timestamp = performance.now();
      this.emit('direction', { direction: newDirection, timestamp });
      this.lastEmittedDirection = newDirection;
    }
  }

  /**
   * Determine direction from currently pressed keys
   */
  determineDirection() {
    const hasForward = this.pressedKeys.has('forward');
    const hasDown = this.pressedKeys.has('down');

    // Combination takes priority
    if (hasDown && hasForward) return CONSTANTS.DIRECTIONS.DOWN_FORWARD;
    if (hasDown) return CONSTANTS.DIRECTIONS.DOWN;
    if (hasForward) return CONSTANTS.DIRECTIONS.FORWARD;

    // Nothing pressed = neutral
    return CONSTANTS.DIRECTIONS.NEUTRAL;
  }

  /**
   * Get current direction from pressed keys (kept for backward compatibility)
   */
  getCurrentDirection() {
    return this.determineDirection();
  }

  /**
   * Start gamepad polling loop
   */
  startGamepadPolling() {
    const poll = () => {
      this.pollGamepad();
      this.pollingHandle = requestAnimationFrame(poll);
    };
    poll();
  }

  /**
   * Stop gamepad polling
   */
  stopGamepadPolling() {
    if (this.pollingHandle) {
      cancelAnimationFrame(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  /**
   * Poll gamepad state
   */
  pollGamepad() {
    const gamepads = navigator.getGamepads?.() || [];
    let gamepad = null;

    // Find first connected gamepad
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        gamepad = gamepads[i];
        break;
      }
    }

    if (!gamepad) return;

    // Poll buttons
    this.pollGamepadButtons(gamepad);

    // Poll analog sticks (for directional input)
    this.pollGamepadAnalog(gamepad);
  }

  /**
   * Poll gamepad buttons
   */
  pollGamepadButtons(gamepad) {
    const buttons = gamepad.buttons;

    // Button 1 (A / Cross) is for attack button 2
    const button1Pressed = buttons[0]?.pressed || false;
    const wasButton1Pressed = this.lastGamepadState.button1Pressed || false;

    if (button1Pressed && !wasButton1Pressed) {
      const timestamp = performance.now() + this.calibrationOffset;
      this.emit('button2', { timestamp });
    }

    this.lastGamepadState.button1Pressed = button1Pressed;
  }

  /**
   * Poll gamepad analog sticks for directional input
   */
  pollGamepadAnalog(gamepad) {
    const axes = gamepad.axes;

    // Left stick: [0] = x, [1] = y
    const stickX = axes[0] || 0;
    const stickY = axes[1] || 0;

    // Also check D-Pad (buttons 12-15)
    const dPadUp = gamepad.buttons[12]?.pressed || false;
    const dPadDown = gamepad.buttons[13]?.pressed || false;
    const dPadLeft = gamepad.buttons[14]?.pressed || false;
    const dPadRight = gamepad.buttons[15]?.pressed || false;

    // Prefer D-Pad over analog stick
    let currentDirection = CONSTANTS.DIRECTIONS.NEUTRAL;
    let hasInput = false;

    if (dPadUp || dPadDown || dPadLeft || dPadRight) {
      hasInput = true;
      // Map D-Pad to direction
      if (dPadRight && dPadDown) {
        currentDirection = CONSTANTS.DIRECTIONS.DOWN_FORWARD;
      } else if (dPadRight) {
        currentDirection = CONSTANTS.DIRECTIONS.FORWARD;
      } else if (dPadDown) {
        currentDirection = CONSTANTS.DIRECTIONS.DOWN;
      } else if (dPadLeft) {
        currentDirection = CONSTANTS.DIRECTIONS.BACK;
      } else if (dPadUp) {
        currentDirection = CONSTANTS.DIRECTIONS.UP;
      }
    } else if (Math.abs(stickX) > CONSTANTS.GAMEPAD_ANALOG_THRESHOLD || 
               Math.abs(stickY) > CONSTANTS.GAMEPAD_ANALOG_THRESHOLD) {
      hasInput = true;
      currentDirection = getDirectionFromAnalogStick(stickX, stickY);
    }

    // Detect direction changes
    const lastDirection = this.lastGamepadState.direction;
    const lastHasInput = this.lastGamepadState.hasInput || false;

    if (currentDirection !== lastDirection) {
      const timestamp = performance.now() + this.calibrationOffset;

      // Emit neutral if no input
      if (!hasInput) {
        this.emit('direction', { direction: CONSTANTS.DIRECTIONS.NEUTRAL, timestamp });
      } else {
        this.emit('direction', { direction: currentDirection, timestamp });
      }
    }

    this.lastGamepadState.direction = currentDirection;
    this.lastGamepadState.hasInput = hasInput;
  }

  /**
   * Set key bindings from calibration
   */
  setKeyBindings(bindings) {
    if (bindings) {
      this.keyBindings = {
        forward: bindings.forward || 'd',
        down: bindings.down || 's',
        button2: bindings.button2 || ' '
      };
      // Clear pressed keys since bindings changed
      this.pressedKeys.clear();
      this.lastEmittedDirection = null;
    }
  }

  /**
   * Set button 2 key (kept for backward compatibility)
   */
  setButton2Key(key) {
    this.keyBindings.button2 = key || ' '; // Default to spacebar if not provided
  }

  /**
   * Set calibration offset (latency compensation)
   */
  setCalibrationOffset(offsetMs) {
    this.calibrationOffset = offsetMs;
  }

  /**
   * Switch device type
   */
  switchDevice(device) {
    // Only switch if device is different
    if (this.device === device) return;
    
    if (this.device === CONSTANTS.DEVICES.GAMEPAD) {
      this.stopGamepadPolling();
    }

    this.device = device;
    this.lastGamepadState = {};
    this.pressedKeys.clear();
    this.lastEmittedDirection = null;

    if (device === CONSTANTS.DEVICES.GAMEPAD) {
      this.startGamepadPolling();
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopGamepadPolling();
    window.removeEventListener('keydown', (e) => this.handleKeyDown(e));
    window.removeEventListener('keyup', (e) => this.handleKeyUp(e));
  }
}
