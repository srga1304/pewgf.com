class InputHandler extends EventEmitter {
  constructor() {
    super();
    this.pollingHandle = null;
    this.isInitialized = false;

    // Rich binding object, set by calibration
    this.bindings = {};

    // State tracking
    this.keyboardPressedKeys = new Set(); // Tracks physical key presses
    this.logicalPressedKeys = new Set(); // Tracks logical inputs like 'up', 'button2'
    this.lastEmittedDirection = null;
    this.wasButton2Pressed = false;
  }

  /**
   * Initialize and start the polling loop
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      const key = e.key.toLowerCase();
      
      // Handle rising edge for keyboard button 2 press
      if (!this.keyboardPressedKeys.has(key)) {
        if (this.bindings.button2?.device === 'keyboard' && this.bindings.button2?.key === key) {
          this.emit('button2', { timestamp: performance.now() });
        }
      }
      this.keyboardPressedKeys.add(key);
    });
    window.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.keyboardPressedKeys.delete(e.key.toLowerCase());
    });

    this.startPolling();
  }

  /**
   * Set the bindings from the calibration routine
   */
  setBindings(bindings) {
    this.bindings = bindings;
    this.logicalPressedKeys.clear();
    this.lastEmittedDirection = null;
    this.wasButton2Pressed = false;
  }

  startPolling() {
    if (this.pollingHandle) return;
    const poll = () => {
      this.pollInputs();
      this.pollingHandle = requestAnimationFrame(poll);
    };
    poll();
  }

  stopPolling() {
    if (this.pollingHandle) {
      cancelAnimationFrame(this.pollingHandle);
      this.pollingHandle = null;
    }
  }

  /**
   * The main input loop. Checks all bound inputs and determines state.
   */
  pollInputs() {
    const newLogicalKeys = new Set();
    const gamepads = navigator.getGamepads?.() || [];

    for (const logicalAction in this.bindings) {
      const binding = this.bindings[logicalAction];
      if (!binding) continue;

      let isActive = false;
      if (binding.device === 'keyboard') {
        // Keyboard state is read directly for directional inputs
        if (logicalAction !== 'button2') {
          isActive = this.keyboardPressedKeys.has(binding.key);
        }
      } else if (binding.device === 'gamepad') {
        const gamepad = gamepads[binding.index];
        if (gamepad) {
          if (binding.type === 'button') {
            isActive = gamepad.buttons[binding.buttonIndex]?.pressed || false;
          } else if (binding.type === 'axis') {
            const axisValue = gamepad.axes[binding.axisIndex] || 0;
            isActive = binding.direction === '+' ? axisValue > 0.8 : axisValue < -0.8;
          }
        }
      }

      if (isActive) {
        newLogicalKeys.add(logicalAction);
      }
    }

    this.logicalPressedKeys = newLogicalKeys;

    // --- Emit events based on new state ---

    // Directional events
    const currentDirection = this.determineDirection();
    if (currentDirection !== this.lastEmittedDirection) {
      this.emit('direction', { direction: currentDirection, timestamp: performance.now() });
      this.lastEmittedDirection = currentDirection;
    }

    // Button2 event (rising edge) for GAMEPAD ONLY
    const isButton2Pressed = this.logicalPressedKeys.has('button2');
    if (isButton2Pressed && !this.wasButton2Pressed) {
      const binding = this.bindings.button2;
      if (binding && binding.device === 'gamepad') {
        this.emit('button2', { timestamp: performance.now() });
      }
    }
    this.wasButton2Pressed = isButton2Pressed;
  }

  /**
   * Determine direction from logical pressed keys, with SOCD cleaning.
   */
  determineDirection() {
    const hasUp = this.logicalPressedKeys.has('up');
    const hasDown = this.logicalPressedKeys.has('down');
    const hasLeft = this.logicalPressedKeys.has('left');
    const hasRight = this.logicalPressedKeys.has('right');

    const hasForward = hasRight; // Assuming P1 side
    const hasBack = hasLeft;

    // SOCD (Simultaneous Opposing Cardinal Directions) cleaning
    const vertical = (hasUp && hasDown) ? 'n' : hasUp ? 'u' : hasDown ? 'd' : 'n';
    const horizontal = (hasLeft && hasRight) ? 'n' : hasForward ? 'f' : hasBack ? 'b' : 'n';

    if (vertical === 'u') {
      if (horizontal === 'f') return CONSTANTS.DIRECTIONS.UP_FORWARD;
      if (horizontal === 'b') return CONSTANTS.DIRECTIONS.UP_BACK;
      return CONSTANTS.DIRECTIONS.UP;
    }
    if (vertical === 'd') {
      if (horizontal === 'f') return CONSTANTS.DIRECTIONS.DOWN_FORWARD;
      if (horizontal === 'b') return CONSTANTS.DIRECTIONS.DOWN_BACK;
      return CONSTANTS.DIRECTIONS.DOWN;
    }
    if (horizontal === 'f') return CONSTANTS.DIRECTIONS.FORWARD;
    if (horizontal === 'b') return CONSTANTS.DIRECTIONS.BACK;

    return CONSTANTS.DIRECTIONS.NEUTRAL;
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.stopPolling();
    // In this new model, we don't need to remove key listeners as they are window-wide
    // and don't hold references that would prevent garbage collection.
  }
}
