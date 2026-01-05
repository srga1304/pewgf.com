/**
 * Frame-based input logger
 * 
 * Maps raw timestamps to discrete frames (16.67ms per frame at 60 FPS)
 * Records only frames that contain inputs (sparse representation)
 */
class FrameLogger {
  constructor() {
    this.FPS_60_FRAME_MS = 1000 / 60; // 16.67 ms
    this.frameMap = new Map(); // { frameNumber: { directions: [], buttons: [] } }
    this.sessionStartTime = performance.now();
  }

  /**
   * Convert timestamp to frame number
   */
  timestampToFrame(timestamp) {
    const elapsed = timestamp - this.sessionStartTime;
    return Math.floor(elapsed / this.FPS_60_FRAME_MS);
  }

  /**
   * Record directional input
   */
  recordDirection(direction, timestamp) {
    const frameNumber = this.timestampToFrame(timestamp);
    
    if (!this.frameMap.has(frameNumber)) {
      this.frameMap.set(frameNumber, { frameNumber, directions: [], buttons: [] });
    }
    
    const frame = this.frameMap.get(frameNumber);
    if (!frame.directions.includes(direction)) {
      frame.directions.push(direction);
    }
  }

  /**
   * Record button 2 press
   */
  recordButton2(timestamp) {
    const frameNumber = this.timestampToFrame(timestamp);
    
    if (!this.frameMap.has(frameNumber)) {
      this.frameMap.set(frameNumber, { frameNumber, directions: [], buttons: [] });
    }
    
    const frame = this.frameMap.get(frameNumber);
    if (!frame.buttons.includes('2')) {
      frame.buttons.push('2');
    }
  }

  /**
   * Get the timeline of frames sorted by frame number
   */
  getTimeline() {
    return Array.from(this.frameMap.values()).sort((a, b) => a.frameNumber - b.frameNumber);
  }

  /**
   * Clear all recorded frames
   */
  clear() {
   this.frameMap.clear();
   // DO NOT reset sessionStartTime - keep it for consistent frame numbering
  }
}
