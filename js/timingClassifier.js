class TimingClassifier {
  constructor() {
    this.lastClassification = null;
    
    // Timing windows per spec
    this.TIMING_WINDOWS = {
      PEWGF_MIN: 11.67,    // 11.67 ms
      PEWGF_MAX: 21.67,    // 21.67 ms
      EWGF_MIN: 5.84,      // 5.84 ms
      EWGF_MAX: 27.5,      // 27.5 ms
      WGF_THRESHOLD: 27.5  // > 27.5 ms
    };
  }

  /**
   * Classify based on delta between d/f and button 2
   * Returns { type, delta, frames }
   */
  classify(d_f_timestamp, button2_timestamp, motionType) {
    if (!d_f_timestamp || !button2_timestamp) {
      return {
        type: CONSTANTS.TYPES.MISS,
        delta: 0,
        frames: 0
      };
    }

    const delta = button2_timestamp - d_f_timestamp;
    const frames = Timing.deltaToFrames(delta);
    let type;

    // Classification logic based on timing windows
    if (delta < 0) {
      // Button pressed BEFORE d/f
      type = CONSTANTS.TYPES.MISS;
    } else if (delta < this.TIMING_WINDOWS.EWGF_MIN) {
      // Too early (before EWGF window)
      type = CONSTANTS.TYPES.MISS;
    } else if (delta >= this.TIMING_WINDOWS.PEWGF_MIN && delta <= this.TIMING_WINDOWS.PEWGF_MAX) {
      // PEWGF window (tightest, 11.67-21.67 ms)
      type = CONSTANTS.TYPES.PEWGF;
    } else if (delta >= this.TIMING_WINDOWS.EWGF_MIN && delta <= this.TIMING_WINDOWS.EWGF_MAX) {
      // EWGF window (5.84-27.5 ms, includes PEWGF)
      type = CONSTANTS.TYPES.EWGF;
    } else if (delta > this.TIMING_WINDOWS.WGF_THRESHOLD) {
      // WGF (too late, > 27.5 ms)
      type = CONSTANTS.TYPES.WGF;
    } else {
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
