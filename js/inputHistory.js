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
   * CRITICAL: DF and 2 must be in the same frame to be merged
   */
  getMergedHistory() {
    const merged = [];
    const skipped = new Set();
    
    for (let i = 0; i < this.history.length; i++) {
      if (skipped.has(i)) continue;
      
      const current = this.history[i];
      
      // Check if next entry is button2 in same frame as current d/f
      if (current.type === 'direction' && current.direction === 'd/f' && i + 1 < this.history.length) {
        const next = this.history[i + 1];
        
        if (next.type === 'button2' && next.frameNumber === current.frameNumber) {
          // MERGE: Create combined entry
          const combined = {
            type: 'direction',
            input: current.input + '+2',  // ↘+2
            symbol: 'd/f+2',
            direction: 'd/f',
            frameNumber: current.frameNumber,
            displayFrame: current.displayFrame,
            isCombined: true,
            deltaDisplay: next.deltaDisplay || '',
            delta: next.delta
          };
          merged.push(combined);
          skipped.add(i + 1);
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
