class Statistics {
  constructor() {
    this.attempts = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Record an attempt
   */
  recordAttempt(attemptData) {
    const record = {
      type: attemptData.type,
      delta: attemptData.delta,
      timestamp: performance.now(),
      sessionId: this.sessionId
    };

    this.attempts.push(record);
    return record;
  }

  /**
   * Get total attempts count
   */
  getTotalAttempts() {
    return this.attempts.length;
  }

  /**
   * Get count by type
   */
  getCountByType(type) {
    return this.attempts.filter((a) => a.type === type).length;
  }

  /**
   * Get success rate for EWGF (includes PEWGF)
   */
  getEWGFRate() {
    const total = this.getTotalAttempts();
    if (total === 0) return 0;

    const ewgf = this.getCountByType(CONSTANTS.TYPES.EWGF);
    const pewgf = this.getCountByType(CONSTANTS.TYPES.PEWGF);
    return ((ewgf + pewgf) / total) * 100;
  }

  /**
   * Get success rate for PEWGF
   */
  getPEWGFRate() {
    const total = this.getTotalAttempts();
    if (total === 0) return 0;

    const pewgf = this.getCountByType(CONSTANTS.TYPES.PEWGF);
    return (pewgf / total) * 100;
  }

  /**
   * Get success rate for WGF
   */
  getWGFRate() {
    const total = this.getTotalAttempts();
    if (total === 0) return 0;

    const wgf = this.getCountByType(CONSTANTS.TYPES.WGF);
    return (wgf / total) * 100;
  }

  /**
   * Get success rate for MISS
   */
  getMissRate() {
    const total = this.getTotalAttempts();
    if (total === 0) return 0;

    const miss = this.getCountByType(CONSTANTS.TYPES.MISS);
    return (miss / total) * 100;
  }

  /**
   * Get average delta (milliseconds)
   */
  getAverageDelta() {
    if (this.attempts.length === 0) return 0;

    const sum = this.attempts.reduce((acc, a) => acc + a.delta, 0);
    return sum / this.attempts.length;
  }

  /**
   * Get standard deviation of delta
   */
  getStdDev() {
    if (this.attempts.length === 0) return 0;

    const deltas = this.attempts.map((a) => a.delta);
    return calculateStdDev(deltas);
  }

  /**
   * Get moving average of last N attempts
   */
  getMovingAverage(window = CONSTANTS.MOVING_AVERAGE_WINDOW) {
    if (this.attempts.length === 0) return 0;

    const lastN = this.attempts.slice(-window);
    const sum = lastN.reduce((acc, a) => acc + a.delta, 0);
    return sum / lastN.length;
  }

  /**
   * Get last N attempts for progress visualization
   */
  getRecentAttempts(count = CONSTANTS.MOVING_AVERAGE_WINDOW) {
    return this.attempts.slice(-count);
  }

  /**
   * Get all attempts
   */
  getAllAttempts() {
    return [...this.attempts];
  }

  /**
   * Get summary stats object
   */
  getSummary() {
    return {
      total: this.getTotalAttempts(),
      miss: this.getCountByType(CONSTANTS.TYPES.MISS),
      missRate: this.getMissRate(),
      wgf: this.getCountByType(CONSTANTS.TYPES.WGF),
      wgfRate: this.getWGFRate(),
      ewgf: this.getCountByType(CONSTANTS.TYPES.EWGF),
      pewgf: this.getCountByType(CONSTANTS.TYPES.PEWGF),
      ewgfRate: this.getEWGFRate(),
      pewgfRate: this.getPEWGFRate(),
      avgDelta: this.getAverageDelta(),
      stdDev: this.getStdDev(),
      movingAvg: this.getMovingAverage(),
      recent: this.getRecentAttempts()
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.attempts = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export for localStorage
   */
  export() {
    return {
      attempts: this.attempts,
      sessionId: this.sessionId
    };
  }

  /**
   * Import from localStorage
   */
  import(data) {
    if (data && Array.isArray(data.attempts)) {
      this.attempts = data.attempts;
    }
    if (data && data.sessionId) {
      this.sessionId = data.sessionId;
    }
  }
}
