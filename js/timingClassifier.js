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
        type: CONSTANTS.TYPES.MISS,
        delta: 0,
        frames: 0
      };
    }

    const delta = button2_timestamp - d_f_timestamp;
    const frames = Timing.deltaToFrames(delta);

    let type = CONSTANTS.TYPES.MISS;

    // Check PEWGF first (most strict)
    if (
      delta >= CONSTANTS.PEWGF_THRESHOLD_MIN &&
      delta <= CONSTANTS.PEWGF_THRESHOLD_MAX
    ) {
      type = CONSTANTS.TYPES.PEWGF;
    }
    // Check EWGF
    else if (
      delta >= CONSTANTS.EWGF_THRESHOLD_MIN &&
      delta <= CONSTANTS.EWGF_THRESHOLD_MAX
    ) {
      type = CONSTANTS.TYPES.EWGF;
    }
    // Check WGF (late input)
    else if (delta > CONSTANTS.MISS_THRESHOLD_MAX) {
      type = CONSTANTS.TYPES.WGF;
    }
    // Miss (too early or invalid)
    else {
      type = CONSTANTS.TYPES.MISS;
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
    return type !== CONSTANTS.TYPES.MISS;
  }

  /**
   * Get human-readable description
   */
  getDescription(type) {
    const descriptions = {
      [CONSTANTS.TYPES.MISS]: 'Timing missed. Too early or too late.',
      [CONSTANTS.TYPES.WGF]: 'Wind God Fist. Input recognized but not just-frame.',
      [CONSTANTS.TYPES.EWGF]: 'Electric Wind God Fist. Just-frame executed.',
      [CONSTANTS.TYPES.PEWGF]: 'Perfect Electric Wind God Fist. Strict just-frame.'
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
