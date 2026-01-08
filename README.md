# PEWGF Trainer

A lightweight, browser-based tool for practicing and mastering the timing of Mishima "Electric Wind God Fist" (EWGF) and "Perfect Electric Wind God Fist" (PEWGF) techniques in Tekken. This application is a pure timing trainer and does not simulate game physics or character interactions.

## Features

- **Precise Timing Measurement**: Uses high-resolution browser APIs (`performance.now()`) to measure the timing delta between `d/f` and `2` inputs with millisecond accuracy.
- **Clear Classification**: Provides instant feedback, classifying your execution as a Miss, Wind God Fist (WGF), Electric Wind God Fist (EWGF), or Perfect Electric Wind God Fist (PEWGF) based on the official frame data windows.
- **Input History**: A running log of your recent inputs, showing the frame data for each and highlighting combined `d/f+2` inputs.
- **Real-time Statistics**: Tracks your performance, including success rates for EWGF and PEWGF, total attempts, and a moving average of your last 10 attempts.
- **Device Support**: Works with both keyboard and standard gamepads. Includes a simple calibration routine to bind your preferred keys or buttons.
- **Local Persistence**: Your statistics are automatically saved in your browser's `localStorage`, so your progress is preserved between sessions.

## Technical Overview

- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, CSS3.
- **State Management**: A simple, custom state manager in `js/state.js`.
- **Input Handling**: A polling loop using `requestAnimationFrame` captures both keyboard and Gamepad API inputs.
- **Dependencies**: None. This is a self-contained, client-side application.

### A Note on Timing

This tool provides a consistent environment for practice, but be aware of the following:
- **Browser Jitter**: While `performance.now()` is highly precise, browser and operating system scheduling can introduce minor timing variations.
- **Gamepad Polling**: The Gamepad API is polled, which can introduce a small amount of latency compared to event-driven keyboard inputs.
- **Offline vs. Online**: The timing required for successful execution in an online match of Tekken will vary due to network latency (rollback netcode). This tool is best for building clean, consistent muscle memory in an offline context.
