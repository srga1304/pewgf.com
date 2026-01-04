class SequenceRecognizer {
  constructor() {
    this.targetSequence = TARGET_SEQUENCE;
    this.lastRecognizedSequenceTime = 0;
  }

  /**
   * Check if the given sequence matches target motion from buffer state
   * Returns { detected: bool, d_f_timestamp: number | null, matchIndex: number }
   */
  recognizeSequenceFromBuffer(bufferState) {
    if (!bufferState || !bufferState.directions || bufferState.directions.length === 0) {
      return { detected: false, d_f_timestamp: null, matchIndex: -1 };
    }

    const directions = bufferState.directions;
    const targetLength = this.targetSequence.length;

    if (directions.length < targetLength) {
      return { detected: false, d_f_timestamp: null, matchIndex: -1 };
    }

    // Check last N entries
    let matchIndex = -1;
    let detected = false;

    // Look for the sequence in the last positions
    for (let i = directions.length - targetLength; i >= 0; i--) {
      let matches = true;
      for (let j = 0; j < targetLength; j++) {
        if (directions[i + j].direction !== this.targetSequence[j]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        matchIndex = i;
        detected = true;
        break;
      }
    }

    // Get d/f timestamp
    let d_f_timestamp = null;
    if (detected && matchIndex >= 0) {
      // d/f should be at position matchIndex + 3 (after f, n, d)
      for (let i = matchIndex + 3; i < directions.length; i++) {
        if (directions[i].direction === CONSTANTS.DIRECTIONS.DOWN_FORWARD) {
          d_f_timestamp = directions[i].timestamp;
          break;
        }
      }
    }

    return {
      detected,
      d_f_timestamp,
      matchIndex
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  recognizeSequence(sequence) {
    if (!Array.isArray(sequence)) {
      return { detected: false, d_f_timestamp: null };
    }

    if (sequence.length < this.targetSequence.length) {
      return { detected: false, d_f_timestamp: null };
    }

    const lastN = sequence.slice(-this.targetSequence.length);
    const matches = lastN.every((dir, index) => dir === this.targetSequence[index]);

    return {
      detected: matches,
      d_f_timestamp: null // Should be filled from buffer
    };
  }

  /**
   * Reset recognizer state
   */
  reset() {
    this.lastRecognizedSequenceTime = 0;
  }

  /**
   * Get target sequence
   */
  getTargetSequence() {
    return [...this.targetSequence];
  }
}
