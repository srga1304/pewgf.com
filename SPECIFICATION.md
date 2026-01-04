# PEWGF Trainer: Technical & Product Specification

## 1. Executive Summary

A vanilla JavaScript web application for training Tekken Mishima motion execution and timing precision. The tool measures input timing between directional motions and attack buttons, classifying attempts as WGF, EWGF, or PEWGF based on configurable timing windows. No combat simulation, no emulation of Tekken engine mechanics—purely a timing instrument.

---

## 2. Gameplay Mechanics & Classification

### 2.1 Input Sequence

All three techniques require the same directional input sequence:

```
f → n → d → d/f + 2
```

Where:
- `f` = forward
- `n` = neutral
- `d` = down
- `d/f` = down-forward (diagonal)
- `2` = attack button (right punch in Tekken notation)

### 2.2 Execution Classification

Classification depends on **frame timing between `d/f` and `2` button press**.

#### Wind God Fist (WGF)

- **Definition**: Motion executed with `d/f` and `2` on different frames
- **Frame window**: `d/f` pressed, then `2` pressed 1+ frames later
- **Timing threshold**: `Δt > 16.67 ms` (>1 frame gap at 60 FPS)
- **Purpose**: Serves as fallback; confirms basic motion input

#### Electric Wind God Fist (EWGF)

- **Definition**: `d/f` and `2` pressed on the same frame (just-frame)
- **Frame window**: `Δt = 0 ± 16.67 ms` (same frame, or within 1 frame window)
- **Timing threshold**: `|Δt - 16.67/2| < 16.67/2` → `5.84 ms < Δt < 27.5 ms`
- **Note**: In real Tekken, this is strictly 1 frame. The trainer allows ±1 frame tolerance for viability on web.
- **Execution rarity**: Medium difficulty; requires timing precision

#### Perfect Electric Wind God Fist (PEWGF)

- **Definition**: EWGF executed with stricter timing window
- **Frame window**: `Δt = 16.67 ± 5 ms` (tighter tolerance)
- **Timing threshold**: `11.67 ms < Δt < 21.67 ms`
- **Startup**: ~13 frames in-game (not simulated; for reference only)
- **Execution rarity**: High difficulty; demands muscle memory
- **Availability**: Kazuya, Mishima characters (reference only; not enforced by trainer)

### 2.3 Timing Measurement Protocol

1. **Capture directional sequence**: Store timestamp when `d/f` is detected
2. **Capture attack button**: Store timestamp when `2` is pressed
3. **Calculate delta**: `Δt = timestamp(2) - timestamp(d/f)`
4. **Classify**:
   - `Δt < 5.84 ms` → Miss (too early or no motion)
   - `5.84 ms ≤ Δt ≤ 27.5 ms` → EWGF
   - `11.67 ms < Δt < 21.67 ms` → PEWGF (subset of EWGF)
   - `Δt > 27.5 ms` → WGF

### 2.4 Input Reset & Sequencing

After classification:
- Clear all tracked inputs
- Require fresh motion sequence
- Do not carry over buffered inputs

Inputs older than 500ms are discarded automatically.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────┐
│          PEWGF Trainer                      │
├─────────────────────────────────────────────┤
│  Device Detection & Calibration             │
│  ↓                                          │
│  Input Polling (Keyboard + Gamepad API)     │
│  ↓                                          │
│  Input Buffer (rolling history)             │
│  ↓                                          │
│  Sequence Recognition (f → n → d → d/f)    │
│  ↓                                          │
│  Timing Delta Calculation (Δt = Δ(d/f,2))  │
│  ↓                                          │
│  Classification Logic (WGF/EWGF/PEWGF)     │
│  ↓                                          │
│  Statistics & Feedback Rendering            │
└─────────────────────────────────────────────┘
```

### 3.1 Module Breakdown

#### A. Input Handler (`inputHandler.js`)

Responsibility: Translate hardware input → normalized directional events

**Keyboard mapping** (WASD layout):
```
W = up
A = left
S = down
D = right
Spacebar = button 2
```

**Gamepad mapping** (XInput):
```
D-Pad Up = up
D-Pad Left = left
D-Pad Down = down
D-Pad Right = right
Button 1 (A/Cross) = button 2
```

**Output**: Normalized `{ direction: string, timestamp: DOMHighResTimeStamp }`

#### B. Input Buffer (`inputBuffer.js`)

Responsibility: Maintain rolling history of directional inputs

- Capacity: 20 inputs (sufficient for single motion sequence)
- Auto-purge: Remove entries >500ms old
- Query interface: `getSequence()` → returns last 4 directions

#### C. Sequence Recognizer (`sequenceRecognizer.js`)

Responsibility: Detect `f → n → d → d/f` pattern

- Match by exact cardinal direction sequence
- Tolerance: None required (digital buttons, not analog)
- Return: `{ detected: boolean, d_f_timestamp: number, completedAt: number }`

#### D. Timing Classifier (`timingClassifier.js`)

Responsibility: Measure Δt and emit classification

```javascript
classify(d_f_timestamp, button_2_timestamp) {
  const delta = button_2_timestamp - d_f_timestamp;
  
  if (delta < 5.84) return { type: 'Miss', delta };
  if (11.67 < delta < 21.67) return { type: 'PEWGF', delta };
  if (5.84 <= delta <= 27.5) return { type: 'EWGF', delta };
  return { type: 'WGF', delta };
}
```

#### E. Statistics Tracker (`stats.js`)

Responsibility: Aggregate attempt history

Tracked metrics:
- Total attempts
- Per-type counts (Miss, WGF, EWGF, PEWGF)
- EWGF success rate (%)
- PEWGF success rate (%)
- Average Δt (milliseconds)
- Std deviation of Δt
- Rolling 10-attempt moving average

#### F. UI Renderer (`ui.js`)

Responsibility: Visual feedback and stats display

Sub-components:
- **InputTimeline**: Animated bar showing last 4 directional inputs + timing gap
- **ResultLabel**: Animated overlay with classification result
- **StatPanel**: Numbers + minimal bar charts
- **CalibrationUI**: Device selection and latency compensation

#### G. State Manager (`state.js`)

Responsibility: Global application state

```javascript
{
  mode: 'setup' | 'practice' | 'calibration',
  device: 'keyboard' | 'gamepad',
  calibrationOffset: number (ms),
  isRunning: boolean,
  attempts: Array<Attempt>,
  currentSession: SessionStats
}
```

---

## 4. Input Timing Logic (Detailed)

### 4.1 Polling Strategy

**Event-driven + polling hybrid**:

- **KeyboardEvent**: Use `keydown` / `keyup` events (sub-millisecond precision)
- **Gamepad API**: Poll via `requestAnimationFrame` (16.67ms intervals at 60 FPS)

**Timestamp source**: `performance.now()` (microsecond precision, monotonic)

### 4.2 Frame Mapping

Internal frame calculation (60 FPS reference):

```javascript
const FPS_60_FRAME_MS = 1000 / 60; // 16.67 ms
const frameNumber = Math.round(timestamp / FPS_60_FRAME_MS);
```

**Note**: Used for display only. Classification uses raw milliseconds internally.

### 4.3 Timing Window Derivation

Assume **60 FPS frame cadence** (1 frame = 16.67 ms):

**EWGF window** (±1 frame tolerance):
- Ideal: frame N = frame N
- Tolerance: ±1 frame = ±16.67 ms
- Window: `[0 - 8.33, 16.67 + 8.33]` → `[-8.33, 25]`
- Practical (no negative time): `[0, 25]` with "tight" handling at boundaries
- Conservative (account for polling jitter): `[5.84, 27.5]` ms

**PEWGF window** (±0.3 frame tolerance):
- Ideal: frame N = frame N  
- Tolerance: ±0.3 frame = ±5 ms
- Window: `[16.67 - 5, 16.67 + 5]` → `[11.67, 21.67]` ms

### 4.4 Gamepad Polling Latency

**Problem**: Gamepad API polls at ~16.67 ms intervals. Button press may occur between polls.

**Solution**: Offer optional calibration step:

1. Display "Press button repeatedly in sync with on-screen metronome (120 BPM)"
2. Measure average delta between displayed beat and recorded input timestamp
3. Store as `calibrationOffset` (±N ms)
4. Apply offset to all subsequent button timestamp measurements

**Default offset**: 0 ms (assumes keyboard usage)

---

## 5. Device Detection & Initialization Flow

### 5.1 Page Load Sequence

```
1. Load application state from localStorage (if exists)
2. Attempt navigator.getGamepads() call
3. If gamepad(s) detected: display "Gamepad found" badge
4. Display device selection modal:
   - Radio button: Keyboard (WASD + Spacebar)
   - Radio button: Gamepad (D-Pad + Button 1)
   - Checkbox: Skip calibration
   - Button: Start Training
5. If device selected without skip: run calibration routine
6. Enter practice mode
```

### 5.2 Gamepad Connection Monitoring

Use `gamepadconnected` and `gamepaddisconnected` events:

```javascript
window.addEventListener('gamepadconnected', (e) => {
  console.log(`Gamepad connected: ${e.gamepad.id}`);
  updateDeviceStatus();
});
```

If active gamepad disconnects during practice, pause training and prompt reconnection.

### 5.3 Calibration Routine

**Duration**: ~30 seconds  
**Purpose**: Measure average input latency

1. Display metronome (120 BPM, click sound + visual flash)
2. Prompt: "Press button on beat. 10 beats."
3. Record timestamp of each button press
4. Calculate delta between expected beat time and recorded timestamp
5. Average the deltas
6. Store as `calibrationOffset`
7. Return to practice mode

---

## 6. UI/UX Specification

### 6.1 Color Palette (Dark Mode)

```
Background:       #0f1419  (near-black)
Surface:          #1a1f26  (dark gray)
Text Primary:     #e8e9eb  (off-white)
Text Secondary:   #8a8d93  (medium gray)

Success (EWGF):   #4ade80  (green)
Perfect (PEWGF):  #60a5fa  (bright blue)
Neutral (WGF):    #fbbf24  (amber)
Fail (Miss):      #ef4444  (red)
```

### 6.2 Layout (Desktop-First)

**Viewport**: 1200px max width, centered

**Structure**:
```
┌─────────────────────────────────────────┐
│  Header: "PEWGF Trainer"                │
│  Device indicator (Keyboard / Gamepad)  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Main Practice Area (center) ─────┐ │
│  │                                   │ │
│  │  Input Timeline (horizontal)      │ │
│  │  [f] [n] [d] [d/f]━●━━[2]         │ │
│  │                ↑ Δt gap           │ │
│  │                                   │ │
│  │  Result Overlay (large, animated) │ │
│  │  "EWGF" or "PEWGF"                │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌─ Stats Panel (bottom) ─────────────┐│
│  │ Total: 45 | EWGF: 32 (71%)        ││
│  │ PEWGF: 18 (40%) | Avg Δt: +3.2ms ││
│  │ [████████░░] Success trend         ││
│  └────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Footer: "Press f, n, d, d/f + 2"      │
│  [Reset] [Settings] [?]                │
└─────────────────────────────────────────┘
```

### 6.3 Input Timeline Visualization

**Component**: Horizontal timeline showing last 4 directional inputs + button timing

```
Visual representation:

Circle markers (inputs):
  ⭕ = successfully registered input
  ◐ = current frame / in-progress

Timeline bar:
  [━━━] = gap between d/f and button 2
  Green underline = EWGF window
  Blue underline = PEWGF window
  Red = too late

Labels:
  Input: "f" / "n" / "d" / "d/f"
  Timing: "+2.3ms" (relative to d/f)
```

**Animation**:
- Fade in new input
- Slide timeline left as new input arrives
- Flash green/blue/amber/red on classification

### 6.4 Result Label

**Display**:
- Centered, large text (48px+)
- Animated entrance: fade-in + scale (50ms)
- Color-coded:
  - PEWGF: bright blue (#60a5fa)
  - EWGF: green (#4ade80)
  - WGF: amber (#fbbf24)
  - Miss: red (#ef4444)
- Duration: 800ms, then fade out
- Subtitle (optional): `"Δt: +2.3ms"` (timing offset)

### 6.5 Statistics Panel

**Metrics displayed**:
```
┌────────────────────────────────┐
│ Total Attempts:    45          │
│ ───────────────────────────    │
│ EWGF:    32 (71%)    [████░░] │
│ PEWGF:   18 (40%)    [███░░░░] │
│ WGF:     10 (22%)    [██░░░░░░]│
│ Miss:     3 (7%)     [░░░░░░░░]│
│ ───────────────────────────    │
│ Avg Δt:  +3.2 ms               │
│ Std Dev:  5.8 ms               │
│ ───────────────────────────    │
│ Last 10: ▓▓▓▓▓░░░░░ (5/10)    │
└────────────────────────────────┘
```

**Update**: Real-time, after each attempt

### 6.6 Typography

```
Font family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
(system stack)

Sizes:
  Header (h1):      32px, weight 600
  Section (h2):     18px, weight 500
  Body text:        14px, weight 400
  Result label:     48px, weight 700
  Stats number:     24px, weight 600
  Stats label:      12px, weight 400, opacity 0.7
```

### 6.7 Responsive Design

**Mobile (< 768px)**:
- Single column layout
- Timeline: vertical stack instead of horizontal
- Stats panel: smaller text (12px base)
- Result label: 32px

**Tablet (768px - 1024px)**:
- 80% viewport width
- Adjust spacing proportionally

**Desktop (> 1024px)**:
- Full specification above

---

## 7. Technical Implementation Details

### 7.1 File Structure

```
project/
├── index.html
├── css/
│   ├── reset.css          (normalize defaults)
│   ├── theme.css          (colors, typography)
│   ├── layout.css         (grid, positioning)
│   └── components.css     (buttons, panels, timeline)
├── js/
│   ├── main.js            (entry point, initialization)
│   ├── state.js           (state management)
│   ├── inputHandler.js    (keyboard + gamepad polling)
│   ├── inputBuffer.js     (rolling input history)
│   ├── sequenceRecognizer.js
│   ├── timingClassifier.js
│   ├── stats.js           (aggregation & calculations)
│   ├── ui.js              (rendering & animations)
│   ├── calibration.js     (latency measurement)
│   └── utils.js           (helpers, constants)
├── data/
│   └── sounds.json        (optional: metronome audio)
└── SPECIFICATION.md
```

### 7.2 Performance Constraints

**Target performance**:
- Input latency: < 5ms (keyboard)
- Gamepad polling: 16.67ms (locked to rAF)
- Frame rate: 60 FPS (stable)
- Total bundle: < 150 KB (minified + gzipped)

**Optimizations**:
- Debounce stats recalculation (every 10 attempts)
- Use `requestAnimationFrame` for animations (not `setInterval`)
- Batch DOM updates
- Minimal reflows (use CSS transforms for animations)

### 7.3 Browser API Usage

**Required**:
```javascript
performance.now()           // High-res timing
requestAnimationFrame()     // Frame-sync rendering
KeyboardEvent              // Keyboard input
Gamepad API                // navigator.getGamepads()
localStorage               // Persist stats & settings
Web Audio API (optional)   // Metronome sound
```

**Not required**:
```
WebGL, WebAssembly, Canvas 2D (animations via CSS)
Web Workers (single-threaded execution)
Server sync (local-only)
```

### 7.4 Data Persistence

Use `localStorage` to save:
```javascript
{
  device: 'keyboard' | 'gamepad',
  calibrationOffset: number,
  allAttempts: Array<{
    type: 'Miss' | 'WGF' | 'EWGF' | 'PEWGF',
    delta: number (ms),
    timestamp: number,
    sessionId: string
  }>,
  preferences: {
    enableCalibration: boolean,
    soundEnabled: boolean,
    theme: 'dark' | 'light'
  }
}
```

**Retention**: No TTL; user can clear manually via settings or browser tools.

---

## 8. Limitations & Assumptions

### 8.1 Timing Precision

**Limitation**: Browser JavaScript cannot guarantee sub-frame precision.

**Assumption**: Polling intervals (Gamepad API ~16.67ms) introduce ±8.33ms uncertainty.

**Mitigation**:
- Keyboard input uses `keydown` event (sub-1ms precision available)
- Gamepad users offered calibration step to measure average offset
- EWGF window is deliberately loose (±1 frame = ±8.33ms) to account for jitter
- PEWGF window is tighter but still accounts for polling variance

**Note to user**: "This trainer uses browser APIs which introduce ~8ms latency on Gamepad input. Expect timing windows ±1-2ms wider than console Tekken."

### 8.2 Frame Rate Assumption

**Assumption**: 60 FPS standard (16.67 ms per frame)

**Rationale**: Tekken runs at 60 FPS on arcade/console. Web polling cadence aligns naturally.

**Fallback**: If user's display is 120 FPS, timestamps remain accurate; visual feedback may appear "doubled" but classification is unaffected.

### 8.3 Input Lag Not Replicated

**Assumption**: No attempt to simulate console input lag (2-4 frames typical on TV)

**Rationale**: Trainer is a pure timing tool, not a game. Over-complicating lag models reduces clarity.

**Note to user**: "Muscle memory built here will transfer to console, but timing windows on console will feel slightly tighter due to TV lag. Practice accordingly."

### 8.4 Gamepad API Limitations

**Constraint**: Gamepad API does not expose raw input timestamps; polling is periodic.

**Limitation**: Cannot detect button press *between* polls.

**Mitigation**: Calibration step infers average offset; user can adjust manually if needed.

### 8.5 No Character-Specific Rules

**Assumption**: Trainer does not enforce character availability (e.g., PEWGF only for Kazuya)

**Rationale**: Simplifies UI; trainer is motion-focused, not character-focused.

**Note**: Classification labels include reference information only.

---

## 9. Statistics & Progress Tracking

### 9.1 Metrics Calculation

**EWGF success rate**:
```javascript
ewgfRate = (ewgfCount + pewgfCount) / totalAttempts * 100
```

**PEWGF success rate**:
```javascript
pewgfRate = pewgfCount / totalAttempts * 100
```

**Average timing delta**:
```javascript
avgDelta = sum(allDeltas) / deltas.length
```

**Standard deviation**:
```javascript
stdDev = sqrt(sum((delta - mean)^2) / n)
```

**Moving average (last 10 attempts)**:
```javascript
recentAvg = sum(last10Deltas) / 10
```

### 9.2 Progress Visualization

**Visual representation** (in stats panel):

```
Last 10 Attempts:
  ▓▓▓▓▓░░░░░  (5 perfect PEWGF)
  Color-coded: blue = PEWGF, green = EWGF, amber = WGF, red = Miss
```

**Trend indicator** (optional):
```
Trend: ↑ Improving  (std dev decreased week-over-week)
       → Stable
       ↓ Declining
```

---

## 10. Non-Goals & Out of Scope

**Explicitly NOT included**:

1. **Character models or animations**: No sprites, 3D models, or visual fighting game elements
2. **Combo sequences**: Single motion only; no juggle combos or chain inputs
3. **Hit confirmation**: No simulation of opponent interaction
4. **Online leaderboard**: No server, no competitive ranking, local-only stats
5. **Mobile touch input**: Gamepad + Keyboard only; no touch-sensitive controls
6. **Complex calibration**: Basic latency compensation only; no per-button tuning
7. **Audio production**: Optional metronome (sine wave, no voice lines)
8. **Accessibility features**: WCAG beyond baseline (high contrast mode, keyboard nav)
9. **Internationalization**: English only

---

## 11. Success Criteria

The trainer is deemed successful if:

1. ✓ Correctly classifies EWGF vs PEWGF with < 2% false-positive rate (internal testing)
2. ✓ Keyboard input precision within 1ms of actual press
3. ✓ Gamepad input precision within 10ms after calibration
4. ✓ Stats persist across sessions (localStorage)
5. ✓ UI renders at 60 FPS with < 5ms input-to-feedback latency
6. ✓ Explanation of timing mechanics is clear to new players (Tekken knowledge not required)
7. ✓ Bundle size < 200 KB (uncompressed), < 50 KB gzipped
8. ✓ Works on Chrome, Firefox, Safari, Edge (last 2 versions)

---

## 12. Future Enhancements (Out of Scope for MVP)

- [ ] Additional motion types (other Mishima techniques)
- [ ] Session replay (video-style review of recorded inputs)
- [ ] Custom timing windows (user-adjustable thresholds)
- [ ] Multiplayer challenge (local, shared leaderboard)
- [ ] Mobile-responsive touch input (experimental)
- [ ] Export stats as CSV
- [ ] Dark/light theme toggle
- [ ] Haptic feedback (Gamepad vibration on PEWGF)

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Just-frame** | Input executed on a single game frame; in Tekken, EWGF requires this precision |
| **Frame window** | Range of milliseconds during which an input is valid for a given classification |
| **Δt** | Delta time; timing difference between two input events (milliseconds) |
| **Polling** | Periodic check for device state; Gamepad API polls ~every 16.67ms |
| **Calibration** | One-time measurement of input device latency to improve timing accuracy |
| **rAF** | requestAnimationFrame; browser API for frame-synced rendering |

---

## Appendix B: Timing Window Reference Table

| Technique | Delta Range (ms) | Frame Range @ 60fps | Difficulty |
|-----------|------------------|-------------------|-----------|
| Miss | < 5.84 or > 27.5 | < 0.35 or > 1.65 | - |
| WGF | > 27.5 | > 1.65 | Easy |
| EWGF | 5.84 – 27.5 | 0.35 – 1.65 | Medium |
| PEWGF | 11.67 – 21.67 | 0.70 – 1.30 | Hard |

---

End of Specification
