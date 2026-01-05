class TimingClassifier {
  constructor() {
    this.lastClassification = null;
  }

  /**
   * Classify based on delta between d/f and button 2
   * Returns { type, delta, frames }
   */
  classify(d_f_timestamp, button2_timestamp) {
    if (!d_f_timestamp || !button2_timestamp) {
      return {
        type: CONSTANTS.TYPES.MISS, // Should be handled as a motion error, but fallback
        delta: 0,
        frames: 0
      };
    }

    const delta = button2_timestamp - d_f_timestamp;
    const frames = Timing.deltaToFrames(delta);
    let type;

    if (delta < 0) {
      type = CONSTANTS.TYPES.EARLY; // Button pressed before d/f
    } else if (delta < CONSTANTS.JUST_FRAME_WINDOW_MS) {
      type = CONSTANTS.TYPES.JUST_FRAME; // Pressed within the same frame
    } else {
      type = CONSTANTS.TYPES.LATE; // Pressed after the just frame window
    }

    this.lastClassification = {
      type,
      delta,
      frames
    };

    return this.lastClassification;
  }

  /**
   * Get last classification
   */
  getLast() {
    return this.lastClassification;
  }

  /**
   * Check if classification is successful
   */
  isSuccess(type) {
    return type === CONSTANTS.TYPES.JUST_FRAME;
  }

  /**
   * Get human-readable description
   */
  getDescription(type) {
    const descriptions = {
      [CONSTANTS.TYPES.MISS]: 'Timing missed. Incorrect motion.',
      [CONSTANTS.TYPES.WGF]: 'Wind God Fist. Input was too late.',
      [CONSTANTS.TYPES.EWGF]: 'Electric Wind God Fist. Just-frame executed!',
      [CONSTANTS.TYPES.PEWGF]: 'Perfect Electric Wind God Fist. Just-frame on a shorter motion!',
      [CONSTANTS.TYPES.EARLY]: 'Timing missed. Button was pressed too early.',
      [CONSTANTS.TYPES.LATE]: 'Wind God Fist. Button was pressed too late.',
      [CONSTANTS.TYPES.JUST_FRAME]: 'Just Frame! Perfect timing.'
    };

    return descriptions[type] || 'Unknown';
  }

  /**
   * Reset state
   */
  reset() {
    this.lastClassification = null;
  }
}
