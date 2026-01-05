class SequenceRecognizer {
  constructor() {
    this.lastRecognizedSequenceTime = 0;
  }

  /**
   * Check if the given sequence matches target motion from buffer state
   * Returns { detected: bool, d_f_timestamp: number | null, matchIndex: number, type: string | null }
   * 
   * PEWGF and EWGF share the same motion sequence (f → n → d → d/f).
   * They differ only by timing delta between d/f and button 2.
   */
  recognizeSequenceFromBuffer(bufferState) {
    if (!bufferState || !bufferState.directions || bufferState.directions.length === 0) {
      return { detected: false, d_f_timestamp: null, matchIndex: -1, type: null };
    }

    const directions = bufferState.directions;

    // Check for main sequence (f → n → d → d/f)
    const mainMatch = this.findSequence(directions, EWGF_SEQUENCE);
    if (mainMatch.detected) {
      const d_f_timestamp = this.findDownForwardTimestamp(directions, mainMatch.matchIndex + 3);
      // Type will be determined by timing classifier, not here
      return { ...mainMatch, d_f_timestamp, type: CONSTANTS.TYPES.EWGF_MOTION };
    }
    
    return { detected: false, d_f_timestamp: null, matchIndex: -1, type: null };
  }

  /**
   * Find a sequence within the buffer
   */
  findSequence(directions, targetSequence) {
    const targetLength = targetSequence.length;
    if (directions.length < targetLength) {
      return { detected: false, matchIndex: -1 };
    }

    for (let i = directions.length - targetLength; i >= 0; i--) {
      let matches = true;
      for (let j = 0; j < targetLength; j++) {
        if (directions[i + j].direction !== targetSequence[j]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return { detected: true, matchIndex: i };
      }
    }
    return { detected: false, matchIndex: -1 };
  }
  
  /**
   * Find the timestamp of the d/f input after a given index
   */
  findDownForwardTimestamp(directions, startIndex) {
    for (let i = startIndex; i < directions.length; i++) {
      if (directions[i].direction === CONSTANTS.DIRECTIONS.DOWN_FORWARD) {
        return directions[i].timestamp;
      }
    }
    return null;
  }

  /**
   * Reset recognizer state
   */
  reset() {
    this.lastRecognizedSequenceTime = 0;
  }
}
