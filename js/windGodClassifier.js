/**
 * Frame-based Wind God Fist classifier
 * 
 * Classifies WGF / EWGF / PEWGF based on frame-level input sequences.
 * 
 * Logic:
 * - WGF: F → (N) → D → DF, where DF and 2 are in DIFFERENT frames
 * - EWGF: F → (N) → D → DF, where DF and 2 are in the SAME frame
 * - PEWGF: EWGF completed in ≤3 frames total (F to DF+2)
 */
class WindGodClassifier {
  constructor(electricSound) {
    this.lastClassification = null;
    this.electricSound = electricSound;
  }

  /**
   * Classify based on frame timeline
   * 
   * @param {Array} timeline - Array of { frameNumber, directions[], buttons[] }
   * @returns {Object} { type, totalFrames, df2Frame, confidence }
   */
  classify(timeline) {
    if (!timeline || timeline.length === 0) {
      console.log('[WG-DEBUG] Empty timeline');
      return this._result('Miss', 0, -1, 0);
    }

    console.log('[WG-DEBUG] Timeline:', timeline);

    // Step 1: Find F start
    const fFrame = this._findDirectionFrame(timeline, 'f');
    console.log('[WG-DEBUG] F frame:', fFrame);
    if (fFrame === -1) {
      console.log('[WG-DEBUG] No F found');
      return this._result('Miss', 0, -1, 0);
    }

    // Step 2: Find DF frame
    const dfFrame = this._findDirectionFrameAfter(timeline, 'd/f', fFrame);
    console.log('[WG-DEBUG] DF frame:', dfFrame);
    if (dfFrame === -1) {
      console.log('[WG-DEBUG] No DF found');
      return this._result('Miss', 0, -1, 0);
    }

    // Step 3: Find button 2 frame
    const button2Frame = this._findButton2FrameAfter(timeline, dfFrame);
    console.log('[WG-DEBUG] Button2 frame:', button2Frame);
    if (button2Frame === -1) {
      console.log('[WG-DEBUG] No button2 found');
      return this._result('Miss', 0, -1, 0);
    }

    // Step 4: CRITICAL - DF and 2 MUST be in the same frame for EWGF/PEWGF
    console.log('[WG-DEBUG] DF===Button2?', dfFrame === button2Frame);
    if (dfFrame !== button2Frame) {
      // DF and 2 in different frames → WGF only
      const fFrameNum = timeline[fFrame].frameNumber;
      const dfFrameNum = timeline[dfFrame].frameNumber;
      const button2FrameNum = timeline[button2Frame].frameNumber;
      const inputFrames = dfFrameNum - fFrameNum + 1;
      const totalFrames = button2FrameNum - fFrameNum + 1;
      const df2Frames = button2FrameNum - dfFrameNum;
      console.log('[WG-DEBUG] Different frames - WGF');
      return this._result('WGF', totalFrames, df2Frames, 0.4, inputFrames);
    }

    // Step 5: Validate sequence structure (F → (N or D) → DF)
    const isValidSequence = this._validateSequence(timeline, fFrame, dfFrame);
    console.log('[WG-DEBUG] Valid sequence?', isValidSequence);
    if (!isValidSequence) {
      console.log('[WG-DEBUG] Invalid sequence structure');
      return this._result('Miss', 0, -1, 0);
    }

    // Step 6: Count actual frame numbers from F to DF+2
    // totalFrames = difference in frame numbers + startup (11)
    // This determines PEWGF (13 total) vs EWGF (>13 total)
    // DF and 2 are guaranteed to be in same frame (electric confirmed)
    const fFrameNum = timeline[fFrame].frameNumber;
    const dfFrameNum = timeline[dfFrame].frameNumber;
    const inputFrames = dfFrameNum - fFrameNum + 1;
    const startupFrames = 11; // Tekken standard startup after DF+2
    const totalFrames = inputFrames + startupFrames;
    
    console.log('[WG-DEBUG] Frame numbers - F:', fFrameNum, 'DF+2:', dfFrameNum);
    console.log('[WG-DEBUG] Input frames (F to DF+2):', inputFrames);
    console.log('[WG-DEBUG] Total frames (input + startup):', totalFrames);

    // PEWGF = exactly 2 input frames (F → DF+2) = 2 + 11 = 13 total
    // EWGF = more than 2 input frames = (>2) + 11 = >13 total
    // Both require DF+2 in same frame (which is already confirmed)
    
    if (inputFrames === 2) {
      console.log('[WG-DEBUG] PEWGF - 2 input frames (ideal)');
      return this._result('PEWGF', totalFrames, 0, 1.0, inputFrames);
    } else if (inputFrames > 2) {
      console.log('[WG-DEBUG] EWGF - ', inputFrames, ' input frames (', totalFrames, ' total)');
      return this._result('EWGF', totalFrames, 0, 0.9, inputFrames);
    } else {
      // Less than 2 input frames = impossible (need at least F and DF)
      console.log('[WG-DEBUG] MISS - invalid input frames (', inputFrames, ')');
      return this._result('Miss', totalFrames, -1, 0, inputFrames);
    }
  }

  /**
   * Find first frame with given direction
   */
  _findDirectionFrame(timeline, direction) {
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].directions.includes(direction)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Find first frame with given direction after startFrame
   */
  _findDirectionFrameAfter(timeline, direction, startFrame) {
    for (let i = startFrame; i < timeline.length; i++) {
      if (timeline[i].directions.includes(direction)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Find first frame with button 2 at or after given frame
   */
  _findButton2FrameAfter(timeline, startFrame) {
    for (let i = startFrame; i < timeline.length; i++) {
      if (timeline[i].buttons.includes('2')) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Validate that the sequence structure is correct.
   * 
   * Valid paths:
   * 1. F → (N*) → (D?) → DF (where N* = one or more neutral frames, D? = optional down)
   * 
   * Key rule: 
   * - Only allow: neutral (n), down (d), or forward (f) between F and DF
   * - Disallow: up (u), back (b), or back-diagonals (u/b, d/b)
   * - Frame span must be reasonable (not > 20 frames)
   */
  _validateSequence(timeline, fFrame, dfFrame) {
    if (dfFrame <= fFrame) {
      console.log('[WG-DEBUG] DF before F');
      return false;
    }

    // Allow reasonable frame span (up to 20 frames is acceptable for EWGF)
    const span = dfFrame - fFrame;
    if (span > 20) {
      console.log('[WG-DEBUG] Span too large:', span);
      return false;
    }

    // Check for invalid directions between F and DF
    for (let i = fFrame + 1; i < dfFrame; i++) {
      const dirs = timeline[i].directions;
      console.log('[WG-DEBUG] Frame', i, 'directions:', dirs);
      
      // Allow: neutral, down, or forward ONLY
      // Disallow: up, back, diagonals
      for (const dir of dirs) {
        if (['u', 'b', 'u/f', 'u/b', 'd/b'].includes(dir)) {
          console.log('[WG-DEBUG] Invalid direction found:', dir);
          return false; // Invalid direction in sequence
        }
      }
    }

    return true;
  }

  /**
   * Create result object
   */
  _result(type, totalFrames, df2Frame, confidence, inputFrames = 0) {
    const result = {
      type,
      totalFrames,
      inputFrames, // Input frames (F to DF+2)
      df2Frame, // Frames between DF and button 2 (0 if same frame)
      confidence
    };
    this.lastClassification = result;
    return result;
  }

  /**
   * Get last classification
   */
  getLast() {
    return this.lastClassification;
  }

  /**
   * Reset state
   */
  reset() {
    this.lastClassification = null;
  }
}
