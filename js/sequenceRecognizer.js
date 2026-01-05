class SequenceRecognizer {
  constructor() {
    this.lastRecognizedSequenceTime = 0;
  }

  /**
   * Check if the given sequence matches target motion from buffer state
   * Returns { detected: bool, d_f_timestamp: number | null, matchIndex: number, type: string | null }
   */
  recognizeSequenceFromBuffer(bufferState) {
    if (!bufferState || !bufferState.directions || bufferState.directions.length === 0) {
      return { detected: false, d_f_timestamp: null, matchIndex: -1, type: null };
    }

    const directions = bufferState.directions;

    // Check for EWGF sequence first (longest)
    const ewgfMatch = this.findSequence(directions, EWGF_SEQUENCE);
    if (ewgfMatch.detected) {
      const d_f_timestamp = this.findDownForwardTimestamp(directions, ewgfMatch.matchIndex + 3);
      return { ...ewgfMatch, d_f_timestamp, type: CONSTANTS.TYPES.EWGF_MOTION };
    }

    // Check for PEWGF sequence (f, n, d/f)
    const pewgfMatch = this.findSequence(directions, PEWGF_SEQUENCE);
    if (pewgfMatch.detected) {
      const d_f_timestamp = this.findDownForwardTimestamp(directions, pewgfMatch.matchIndex + 2);
      return { ...pewgfMatch, d_f_timestamp, type: CONSTANTS.TYPES.PEWGF_MOTION };
    }

    // Check for alternate PEWGF sequence (f, d, d/f)
    const pewgfAltMatch = this.findSequence(directions, PEWGF_ALT_SEQUENCE);
    if (pewgfAltMatch.detected) {
      const d_f_timestamp = this.findDownForwardTimestamp(directions, pewgfAltMatch.matchIndex + 2);
      return { ...pewgfAltMatch, d_f_timestamp, type: CONSTANTS.TYPES.PEWGF_MOTION };
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
