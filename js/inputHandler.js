class InputHandler extends EventEmitter {
  constructor() {
    super();
    this.device = CONSTANTS.DEVICES.KEYBOARD;
    this.calibrationOffset = 0;
    this.button2Key = ' '; // Default to spacebar
    this.pressedKeys = new Set();
    this.gamepadState = {};
    this.pollingHandle = null;
    this.lastGamepadState = {};
    this.lastEmittedDirection = null;
    this.keyDownTime = new Map(); // Track when each key was pressed
  }

  /**
   * Initialize input handler for specific device
   */
  initialize(device = CONSTANTS.DEVICES.KEYBOARD) {
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
    const key = event.key;
    if (this.pressedKeys.has(key)) return; // Prevent repeat events

    const timestamp = performance.now();

    // Check if this is the button 2 key
    if (key === this.button2Key) {
      this.emit('button2', { timestamp });
      return;
    }

    // Check if it's a direction key
    const input = keyboardEventToDirection(key);
    if (!input) return;

    this.pressedKeys.add(key);
    this.keyDownTime.set(key, performance.now());

    // Check for diagonal direction (d/f = down + forward)
    const direction = this.getCurrentDirection();
    if (direction && direction !== this.lastEmittedDirection) {
      this.emit('direction', { direction, timestamp });
      this.lastEmittedDirection = direction;
    }
  }

  /**
   * Handle keyboard keyup
   */
  handleKeyUp(event) {
    const key = event.key;
    this.pressedKeys.delete(key);
    this.keyDownTime.delete(key);

    // Re-evaluate direction when key is released
    const newDirection = this.getCurrentDirection();
    if (newDirection !== this.lastEmittedDirection) {
      const timestamp = performance.now();
      if (newDirection) {
        this.emit('direction', { direction: newDirection, timestamp });
      } else {
        this.emit('direction', { direction: CONSTANTS.DIRECTIONS.NEUTRAL, timestamp });
      }
      this.lastEmittedDirection = newDirection;
    }
  }

  /**
   * Get current direction from pressed keys
   */
  getCurrentDirection() {
    let hasForward = false;
    let hasBack = false;
    let hasDown = false;
    let hasUp = false;

    // Check for f/b/d/u in pressed keys
    for (const key of this.pressedKeys) {
      const dir = keyboardEventToDirection(key);
      if (dir === CONSTANTS.DIRECTIONS.FORWARD) hasForward = true;
      if (dir === CONSTANTS.DIRECTIONS.BACK) hasBack = true;
      if (dir === CONSTANTS.DIRECTIONS.DOWN) hasDown = true;
      if (dir === CONSTANTS.DIRECTIONS.UP) hasUp = true;
    }

    // Priority: diagonal > cardinal
    if (hasDown && hasForward) return CONSTANTS.DIRECTIONS.DOWN_FORWARD;
    if (hasDown && hasBack) return CONSTANTS.DIRECTIONS.DOWN_BACK;
    if (hasDown) return CONSTANTS.DIRECTIONS.DOWN;
    if (hasForward) return CONSTANTS.DIRECTIONS.FORWARD;
    if (hasBack) return CONSTANTS.DIRECTIONS.BACK;
    if (hasUp) return CONSTANTS.DIRECTIONS.UP;

    return CONSTANTS.DIRECTIONS.NEUTRAL;
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
   * Set button 2 key
   */
  setButton2Key(key) {
    this.button2Key = key || ' '; // Default to spacebar if not provided
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
    if (this.device === CONSTANTS.DEVICES.GAMEPAD) {
      this.stopGamepadPolling();
    }

    this.device = device;
    this.lastGamepadState = {};
    this.pressedKeys.clear();

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
