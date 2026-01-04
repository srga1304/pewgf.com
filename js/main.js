class PEWGFTrainer {
  constructor() {
    this.state = new AppState();
    this.ui = new UI();
    this.inputHandler = new InputHandler();
    this.inputBuffer = new InputBuffer();
    this.sequenceRecognizer = new SequenceRecognizer();
    this.timingClassifier = new TimingClassifier();
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
    // Start with calibration instead of setup modal
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
    this.ui.onSkipCalibrationClick(() => this.handleSkipCalibration());

    // Practice area buttons
    this.ui.onResetClick(() => this.handleResetStats());
    this.ui.onSettingsClick(() => this.handleSettings());

    // Gamepad connection events
    window.addEventListener('gamepadconnected', () => this.detectGamepad());
    window.addEventListener('gamepaddisconnected', () => this.detectGamepad());

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
    this.calibration.start();
  }

  /**
   * Handle calibration completion
   */
  handleCalibrationComplete(event) {
    // Auto-detect device or use keyboard as default
    const gamepads = navigator.getGamepads?.() || [];
    const hasGamepad = Array.from(gamepads).some((gp) => gp && gp.connected);
    
    const device = hasGamepad ? CONSTANTS.DEVICES.GAMEPAD : CONSTANTS.DEVICES.KEYBOARD;
    this.state.setDevice(device);
    
    // Initialize input handler with selected button 2 key
    this.inputHandler.initialize(device);
    this.inputHandler.setButton2Key(event.button2Key);
    
    this.startTraining();
  }

  /**
   * Handle calibration skip
   */
  handleCalibrationSkipped(event) {
    // Auto-detect device or use keyboard as default
    const gamepads = navigator.getGamepads?.() || [];
    const hasGamepad = Array.from(gamepads).some((gp) => gp && gp.connected);
    
    const device = hasGamepad ? CONSTANTS.DEVICES.GAMEPAD : CONSTANTS.DEVICES.KEYBOARD;
    this.state.setDevice(device);
    
    // Initialize input handler with default spacebar
    this.inputHandler.initialize(device);
    this.inputHandler.setButton2Key(event?.button2Key || ' ');
    
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

    // Update UI timeline
    const sequence = this.inputBuffer.getSequence();
    this.ui.updateTimeline(sequence);
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

    const { timestamp } = event;
    this.inputBuffer.recordButton2(timestamp);

    // Check for sequence match using buffer state
    const bufferState = this.inputBuffer.getState();
    const recognition = this.sequenceRecognizer.recognizeSequenceFromBuffer(bufferState);

    if (!recognition.detected) {
      // Wrong sequence or not ready
      this.ui.showResult(CONSTANTS.TYPES.MISS, 0);
      this.state.recordAttempt({
        type: CONSTANTS.TYPES.MISS,
        delta: 0
      });
      this.inputBuffer.clear();
      this.lastAttemptTime = now;
      return;
    }

    // Get d/f timestamp from recognition result
    const d_f_timestamp = recognition.d_f_timestamp;
    const button2_timestamp = timestamp;

    if (!d_f_timestamp) {
      this.ui.showResult(CONSTANTS.TYPES.MISS, 0);
      this.state.recordAttempt({
        type: CONSTANTS.TYPES.MISS,
        delta: 0
      });
      this.inputBuffer.clear();
      this.lastAttemptTime = now;
      return;
    }

    // Classify
    const classification = this.timingClassifier.classify(d_f_timestamp, button2_timestamp);

    // Show result
    const sequence = this.inputBuffer.getSequence();
    this.ui.showResult(classification.type, classification.delta);
    this.ui.updateTimeline(sequence, classification.delta);

    // Record attempt
    this.state.recordAttempt({
      type: classification.type,
      delta: classification.delta
    });

    // Clear for next attempt
    this.inputBuffer.clear();
    this.lastAttemptTime = now;
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
