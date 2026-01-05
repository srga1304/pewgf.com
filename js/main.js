class PEWGFTrainer {
  constructor() {
    this.state = new AppState();
    this.ui = new UI();
    this.inputHandler = new InputHandler();
    this.inputBuffer = new InputBuffer();
    this.sequenceRecognizer = new SequenceRecognizer();
    this.timingClassifier = new TimingClassifier();
    this.inputHistory = new InputHistory();
    this.calibration = new CalibrationRoutine(this.ui);

    this.isTraining = false;
    this.lastAttemptTime = 0;
    this.attemptCooldown = 200; // ms between attempts
  }

  /**
   * Initialize the application
   */
  initialize() {
    this.state.loadFromStorage();
    this.setupEventListeners();
    this.detectGamepad();
    // Start with calibration
    this.startCalibration();
  }

  /**
   * Detect if gamepad is connected
   */
  detectGamepad() {
    const gamepads = navigator.getGamepads?.() || [];
    const hasGamepad = Array.from(gamepads).some((gp) => gp && gp.connected);
    this.ui.setDeviceDetectionStatus(hasGamepad);
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Calibration modal
    this.ui.onSkipCalibrationClick(() => this.calibration.skip());

    // Practice area buttons
    this.ui.onResetClick(() => this.handleResetStats());
    this.ui.onSettingsClick(() => this.handleSettings());

    // Gamepad connection events
    window.addEventListener('gamepadconnected', () => this.detectGamepad());
    window.addEventListener('gamepaddisconnected', () => this.detectGamepad());

    // Initialize input handler immediately (before calibration)
    this.inputHandler.initialize();

    // Input handler events
    this.inputHandler.on('direction', (event) => this.handleDirectionInput(event));
    this.inputHandler.on('button2', (event) => this.handleButton2Input(event));

    // Calibration events
    this.calibration.on('complete', (event) => this.handleCalibrationComplete(event));
    this.calibration.on('skipped', () => this.handleCalibrationSkipped());

    // State events
    this.state.on('attemptRecorded', () => this.updateUI());
  }

  /**
   * Start calibration routine
   */
  startCalibration() {
    // Temporarily disable input processing during calibration
    this.isTraining = false;
    this.calibration.start();
  }

  /**
   * Handle calibration completion
   */
  handleCalibrationComplete(event) {
    // The new input handler is device-agnostic, just pass the bindings.
    const { bindings } = event;
    this.inputHandler.setBindings(bindings);
    this.ui.setDeviceIndicator('Keyboard / Gamepad'); // Generic indicator
    this.startTraining();
  }

  /**
   * Handle calibration skip
   */
  handleCalibrationSkipped(event) {
    // The new input handler is device-agnostic, just pass the bindings.
    const { bindings } = event;
    this.inputHandler.setBindings(bindings);
    this.ui.setDeviceIndicator('Keyboard / Gamepad'); // Generic indicator
    this.startTraining();
  }

  /**
   * Start training mode
   */
  startTraining() {
    this.isTraining = true;
    this.state.setMode(CONSTANTS.MODES.PRACTICE);
    this.ui.setDeviceIndicator(this.state.device);
    this.ui.showPracticeArea();
    this.updateUI();
  }

  /**
   * Handle directional input
   */
  handleDirectionInput(event) {
    if (!this.isTraining) return;

    const { direction, timestamp } = event;
    this.inputBuffer.addDirection(direction, timestamp);

    // Record in input history
    this.inputHistory.recordDirection(direction, timestamp);

    // Update UI timeline
    const sequence = this.inputBuffer.getSequence();
    this.ui.updateTimeline(sequence);
    
    // Update history display
    const merged = this.inputHistory.getMergedHistory();
    this.ui.updateHistory(merged.slice(-30));
  }

  /**
   * Handle button 2 (attack) input
   */
  handleButton2Input(event) {
    if (!this.isTraining) return;

    const now = performance.now();
    if (now - this.lastAttemptTime < this.attemptCooldown) {
      return; // Prevent spam
    }
    this.lastAttemptTime = now;

    const { timestamp: button2_timestamp } = event;
    this.inputBuffer.recordButton2(button2_timestamp);

    // Get d/f timestamp for delta display
    const d_f_ts = this.inputBuffer.getLastDownForward();
    
    // Record button 2 in input history
    this.inputHistory.recordButton2(button2_timestamp, d_f_ts);
    const merged = this.inputHistory.getMergedHistory();
    this.ui.updateHistory(merged.slice(-30));

    const bufferState = this.inputBuffer.getState();
    const recognition = this.sequenceRecognizer.recognizeSequenceFromBuffer(bufferState);

    let finalMoveType = CONSTANTS.TYPES.MISS;
    let finalDelta = 0;

    if (recognition.detected && recognition.d_f_timestamp) {
      const { type: motionType, d_f_timestamp } = recognition;
      
      const timing = this.timingClassifier.classify(d_f_timestamp, button2_timestamp, motionType);
      finalDelta = timing.delta;
      finalMoveType = timing.type;
    }

    // Show result in UI
    const sequence = this.inputBuffer.getSequence();
    this.ui.showResult(finalMoveType, finalDelta);
    this.ui.updateTimeline(sequence, finalDelta);

    // Record attempt for stats
    this.state.recordAttempt({
      type: finalMoveType,
      delta: finalDelta
    });

    // Clear for next attempt
    this.inputBuffer.clear();
  }

  /**
   * Update UI with current stats
   */
  updateUI() {
    const stats = this.state.getStatsSummary();
    this.ui.updateStats(stats);
  }

  /**
   * Handle reset stats
   */
  handleResetStats() {
    if (confirm('Reset all statistics?')) {
      this.state.resetStats();
      this.inputHistory.clear();
      this.ui.updateHistory([]);
      this.updateUI();
    }
  }

  /**
   * Handle settings button
   */
  handleSettings() {
    alert('Settings not yet implemented');
  }

  /**
   * Save state periodically
   */
  autoSave() {
    setInterval(() => {
      this.state.saveToStorage();
    }, 30000); // Save every 30 seconds
  }

  /**
   * Cleanup
   */
  destroy() {
    this.inputHandler.destroy();
    this.ui.destroy();
  }
}

/**
 * Initialize app on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = new PEWGFTrainer();
  app.initialize();
  app.autoSave();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    app.state.saveToStorage();
    app.destroy();
  });
});
