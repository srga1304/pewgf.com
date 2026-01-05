// Constants
const CONSTANTS = {
  // Input timing windows (ms) - per specification
  PEWGF_THRESHOLD_MIN: 11.67,  // PEWGF lower bound
  PEWGF_THRESHOLD_MAX: 21.67,  // PEWGF upper bound
  EWGF_THRESHOLD_MIN: 5.84,    // EWGF lower bound
  EWGF_THRESHOLD_MAX: 27.5,    // EWGF upper bound
  WGF_THRESHOLD_MIN: 27.5,     // WGF lower bound

  // Frame reference
  FPS_60_FRAME_MS: 1000 / 60, // 16.67ms

  // Buffer settings
  INPUT_BUFFER_MAX_SIZE: 20,
  INPUT_BUFFER_TTL_MS: 500,

  // Classification types
  TYPES: {
    MISS: 'Miss',
    WGF: 'WGF',
    EWGF: 'EWGF',
    PEWGF: 'PEWGF',
    // New types for refactoring
    EWGF_MOTION: 'EWGF_MOTION',
    PEWGF_MOTION: 'PEWGF_MOTION',
    JUST_FRAME: 'JUST_FRAME',
    LATE: 'LATE',
    EARLY: 'EARLY'
  },

  // Device types
  DEVICES: {
    KEYBOARD: 'keyboard',
    GAMEPAD: 'gamepad'
  },

  // Application modes
  MODES: {
    SETUP: 'setup',
    PRACTICE: 'practice',
    CALIBRATION: 'calibration'
  },

  // Directions
  DIRECTIONS: {
    UP: 'u',
    DOWN: 'd',
    FORWARD: 'f',
    BACK: 'b',
    UP_FORWARD: 'u/f',
    UP_BACK: 'u/b',
    DOWN_FORWARD: 'd/f',
    DOWN_BACK: 'd/b',
    NEUTRAL: 'n'
  },

  // Keyboard mappings for directions only
  KEYBOARD_MAP: {
    'ArrowUp': 'u',
    'w': 'u',
    'W': 'u',
    'ArrowDown': 'd',
    's': 'd',
    'S': 'd',
    'ArrowLeft': 'b',
    'a': 'b',
    'A': 'b',
    'ArrowRight': 'f',
    'd': 'f',
    'D': 'f'
  },

  // Gamepad button indices (XInput/XBox layout)
  GAMEPAD_MAP: {
    0: 'button1', // A / Cross
    1: 'button2', // B / Circle
    2: 'button3', // X / Square
    3: 'button4'  // Y / Triangle
  },

  // Gamepad analog stick thresholds
  GAMEPAD_ANALOG_THRESHOLD: 0.5,

  // Stats
  MOVING_AVERAGE_WINDOW: 10,
  STATS_RECALC_INTERVAL: 10,

  // Calibration
  CALIBRATION_BEATS: 10,
  CALIBRATION_BPM: 120,
  CALIBRATION_BEAT_MS: (60 / 120) * 1000 // 500ms per beat

};

// Direction sequence for target motion
const EWGF_SEQUENCE = [
  CONSTANTS.DIRECTIONS.FORWARD,
  CONSTANTS.DIRECTIONS.NEUTRAL,
  CONSTANTS.DIRECTIONS.DOWN,
  CONSTANTS.DIRECTIONS.DOWN_FORWARD
];

const PEWGF_SEQUENCE = [
  CONSTANTS.DIRECTIONS.FORWARD,
  CONSTANTS.DIRECTIONS.NEUTRAL,
  CONSTANTS.DIRECTIONS.DOWN_FORWARD
];

const PEWGF_ALT_SEQUENCE = [
  CONSTANTS.DIRECTIONS.FORWARD,
  CONSTANTS.DIRECTIONS.DOWN,
  CONSTANTS.DIRECTIONS.DOWN_FORWARD
];

/**
 * Helper Functions
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function calculateMean(values) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Get digital direction from analog stick
 */
function getDirectionFromAnalogStick(x, y, threshold = CONSTANTS.GAMEPAD_ANALOG_THRESHOLD) {
  // Normalize to ±1 range
  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absX < threshold && absY < threshold) {
    return CONSTANTS.DIRECTIONS.NEUTRAL;
  }

  // Cardinal directions with priority to diagonal
  if (absY > absX) {
    // Vertical axis dominant
    return y > 0 ? CONSTANTS.DIRECTIONS.DOWN : CONSTANTS.DIRECTIONS.UP;
  } else {
    // Horizontal axis dominant
    if (x > 0 && y > 0) {
      return CONSTANTS.DIRECTIONS.DOWN_FORWARD;
    } else if (x > 0 && y < 0) {
      return CONSTANTS.DIRECTIONS.FORWARD;
    } else if (x < 0 && y > 0) {
      return CONSTANTS.DIRECTIONS.DOWN_BACK;
    } else if (x < 0 && y < 0) {
      return CONSTANTS.DIRECTIONS.BACK;
    }
  }

  return CONSTANTS.DIRECTIONS.NEUTRAL;
}

/**
 * Keyboard event to direction
 */
function keyboardEventToDirection(key) {
  return CONSTANTS.KEYBOARD_MAP[key] || null;
}

/**
 * localStorage utilities
 */
const Storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  },

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('localStorage read failed:', e);
      return defaultValue;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage remove failed:', e);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('localStorage clear failed:', e);
    }
  }
};

/**
 * DOM utilities
 */
const DOM = {
  query(selector) {
    return document.querySelector(selector);
  },

  queryAll(selector) {
    return document.querySelectorAll(selector);
  },

  on(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
    }
  },

  off(element, event, handler) {
    if (element) {
      element.removeEventListener(event, handler);
    }
  },

  addClass(element, className) {
    if (element) {
      element.classList.add(className);
    }
  },

  removeClass(element, className) {
    if (element) {
      element.classList.remove(className);
    }
  },

  toggleClass(element, className, force) {
    if (element) {
      element.classList.toggle(className, force);
    }
  },

  hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
  },

  setStyles(element, styles) {
    if (element) {
      Object.assign(element.style, styles);
    }
  },

  setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  },

  setHTML(element, html) {
    if (element) {
      element.innerHTML = html;
    }
  },

  hide(element) {
    if (element) {
      element.style.display = 'none';
    }
  },

  show(element, displayType = 'flex') {
    if (element) {
      element.style.display = displayType;
    }
  }
};

/**
 * Timing utilities
 */
const Timing = {
  deltaToFrames(deltaMs) {
    return deltaMs / CONSTANTS.FPS_60_FRAME_MS;
  },

  framesToDelta(frames) {
    return frames * CONSTANTS.FPS_60_FRAME_MS;
  },

  formatDelta(deltaMs) {
    if (deltaMs < 0) {
      return `-${Math.abs(round(deltaMs))}ms`;
    }
    return `+${round(deltaMs)}ms`;
  }
};

/**
 * Event emitter pattern (simple)
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, handler) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(handler);
  }

  off(eventName, handler) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(h => h !== handler);
  }

  emit(eventName, data) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(handler => handler(data));
  }

  once(eventName, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(eventName, wrappedHandler);
    };
    this.on(eventName, wrappedHandler);
  }
}
