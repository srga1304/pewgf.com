class InputBuffer {
  constructor() {
    this.buffer = [];
    this.button2Buffer = [];
    this.lastSequenceIndex = -1; // Track last recognized sequence position
  }

  /**
   * Add directional input to buffer
   */
  addDirection(direction, timestamp) {
    const now = performance.now();

    // Purge old entries
    this.buffer = this.buffer.filter(
      (entry) => now - entry.timestamp < CONSTANTS.INPUT_BUFFER_TTL_MS
    );

    // Only add if different from last direction (avoid duplicates)
    if (this.buffer.length === 0 || this.buffer[this.buffer.length - 1].direction !== direction) {
      this.buffer.push({
        direction,
        timestamp
      });
    }

    // Maintain max size
    if (this.buffer.length > CONSTANTS.INPUT_BUFFER_MAX_SIZE) {
      this.buffer.shift();
    }
  }

  /**
   * Record button 2 press
   */
  recordButton2(timestamp) {
    const now = performance.now();

    // Purge old entries
    this.button2Buffer = this.button2Buffer.filter(
      (entry) => now - entry.timestamp < CONSTANTS.INPUT_BUFFER_TTL_MS
    );

    // Add new button press
    this.button2Buffer.push({
      timestamp
    });
  }

  /**
   * Get last N directional inputs
   */
  getSequence(count = 4) {
    return this.buffer.slice(-count).map((entry) => entry.direction);
  }

  /**
   * Get all buffered directions with timestamps
   */
  getAllDirections() {
    return [...this.buffer];
  }

  /**
   * Get last button 2 press timestamp
   */
  getLastButton2() {
    if (this.button2Buffer.length === 0) return null;
    return this.button2Buffer[this.button2Buffer.length - 1].timestamp;
  }

  /**
   * Get the most recent d/f direction timestamp
   */
  getLastDownForward() {
    const directions = [...this.buffer].reverse();
    for (const entry of directions) {
      if (entry.direction === CONSTANTS.DIRECTIONS.DOWN_FORWARD) {
        return entry.timestamp;
      }
    }
    return null;
  }

  /**
   * Find d/f timestamp after a specific index
   */
  getDownForwardAfterIndex(afterIndex) {
    for (let i = afterIndex + 1; i < this.buffer.length; i++) {
      if (this.buffer[i].direction === CONSTANTS.DIRECTIONS.DOWN_FORWARD) {
        return this.buffer[i].timestamp;
      }
    }
    return null;
  }

  /**
   * Get all directions as string for debugging
   */
  getSequenceString() {
    return this.buffer.map((e) => e.direction).join(' → ');
  }

  /**
   * Clear all buffers
   */
  clear() {
    this.buffer = [];
    this.button2Buffer = [];
    this.lastSequenceIndex = -1;
  }

  /**
   * Get buffer state (for debugging)
   */
  getState() {
    return {
      directions: this.getAllDirections(),
      button2Presses: this.button2Buffer,
      sequence: this.getSequence(),
      full: this.getSequenceString()
    };
  }
}
