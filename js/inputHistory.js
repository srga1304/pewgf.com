/**
 * Input History Manager
 * Tracks and stores all input events (directional + button presses) for display
 */
class InputHistory {
  constructor(maxEntries = 100) {
    this.history = [];
    this.maxEntries = maxEntries;
    this.sessionStartTime = performance.now();
    this.lastFrameNumber = 0;
  }

  /**
   * Record a directional input
   * @param {string} direction - Direction input (f, n, d, d/f, u, b, etc.)
   * @param {number} timestamp - Input timestamp from performance.now()
   */
  recordDirection(direction, timestamp) {
    const frameNumber = Math.round(Timing.deltaToFrames(timestamp - this.sessionStartTime));
    const entry = {
      type: 'direction',
      input: this.getDirectionArrow(direction),
      symbol: this.getDirectionSymbol(direction),
      direction: direction,
      timestamp: timestamp,
      frameNumber: frameNumber,
      displayFrame: `${frameNumber}f`
    };

    this.history.push(entry);
    this.lastFrameNumber = frameNumber;

    // Keep max size
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }

    return entry;
  }

  /**
   * Record a button 2 press
   * @param {number} timestamp - Button press timestamp
   * @param {number} d_f_timestamp - The d/f timestamp for delta calculation (optional)
   */
  recordButton2(timestamp, d_f_timestamp = null) {
    const frameNumber = Math.round(Timing.deltaToFrames(timestamp - this.sessionStartTime));
    let delta = null;
    let deltaDisplay = '';
    let sameFrame = false;

    if (d_f_timestamp !== null) {
      delta = timestamp - d_f_timestamp;
      deltaDisplay = Timing.formatDelta(delta);
      
      // Check if d/f and button 2 are in the same frame
      const d_f_frame = Math.round(Timing.deltaToFrames(d_f_timestamp - this.sessionStartTime));
      sameFrame = (frameNumber === d_f_frame);
    }

    const entry = {
      type: 'button2',
      input: '2',
      timestamp: timestamp,
      frameNumber: frameNumber,
      displayFrame: `${frameNumber}f`,
      delta: delta,
      deltaDisplay: deltaDisplay,
      sameFrame: sameFrame
    };

    this.history.push(entry);
    this.lastFrameNumber = frameNumber;

    // Keep max size
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }

    return entry;
  }

  /**
   * Merge consecutive d/f and button2 entries that are in the same frame
   */
  getMergedHistory() {
    const merged = [];
    
    for (let i = 0; i < this.history.length; i++) {
      const current = this.history[i];
      
      // If this is a button2 in the same frame as previous d/f, merge them
      if (current.type === 'button2' && current.sameFrame && merged.length > 0) {
        const last = merged[merged.length - 1];
        if (last.type === 'direction' && last.direction === 'd/f' && last.frameNumber === current.frameNumber) {
          // Merge: modify last entry to include button2 data
          last.isCombined = true;
          last.deltaDisplay = current.deltaDisplay;
          continue;
        }
      }
      
      merged.push(current);
    }
    
    return merged;
  }

  /**
   * Get arrow symbol for direction
   */
  getDirectionArrow(direction) {
    const arrowMap = {
      [CONSTANTS.DIRECTIONS.NEUTRAL]: '',
      [CONSTANTS.DIRECTIONS.FORWARD]: '→',
      [CONSTANTS.DIRECTIONS.BACK]: '←',
      [CONSTANTS.DIRECTIONS.UP]: '↑',
      [CONSTANTS.DIRECTIONS.DOWN]: '↓',
      [CONSTANTS.DIRECTIONS.UP_FORWARD]: '↗',
      [CONSTANTS.DIRECTIONS.UP_BACK]: '↖',
      [CONSTANTS.DIRECTIONS.DOWN_FORWARD]: '↘',
      [CONSTANTS.DIRECTIONS.DOWN_BACK]: '↙'
    };
    return arrowMap[direction] !== undefined ? arrowMap[direction] : direction;
  }

  /**
   * Get symbol for direction (as shown in Tekken notation)
   * Neutral returns empty string for visual blank space
   */
  getDirectionSymbol(direction) {
    const symbolMap = {
      [CONSTANTS.DIRECTIONS.NEUTRAL]: '',
      [CONSTANTS.DIRECTIONS.FORWARD]: 'f',
      [CONSTANTS.DIRECTIONS.BACK]: 'b',
      [CONSTANTS.DIRECTIONS.UP]: 'u',
      [CONSTANTS.DIRECTIONS.DOWN]: 'd',
      [CONSTANTS.DIRECTIONS.UP_FORWARD]: 'u/f',
      [CONSTANTS.DIRECTIONS.UP_BACK]: 'u/b',
      [CONSTANTS.DIRECTIONS.DOWN_FORWARD]: 'd/f',
      [CONSTANTS.DIRECTIONS.DOWN_BACK]: 'd/b'
    };
    return symbolMap[direction] !== undefined ? symbolMap[direction] : direction;
  }

  /**
   * Get all history entries
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get last N entries (for display in sidebar)
   */
  getLastN(n = 30) {
    return this.history.slice(-n);
  }

  /**
   * Clear history
   */
  clear() {
    this.history = [];
    this.sessionStartTime = performance.now();
    this.lastFrameNumber = 0;
  }
}
