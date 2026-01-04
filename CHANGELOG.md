# Changelog - PEWGF Trainer

## v0.2 - Complete Redesign

### Fixed Issues
- Removed broken multi-step calibration that asked for individual inputs
- Removed device selection modal (was causing crashes)
- Fixed button 2 mapping - now allows ANY key, not just spacebar

### Refactored Calibration Flow
**Old flow**: Setup Modal → Device Selection → Complex Multi-Step Calibration → Training

**New flow**: Simple Button 2 Selection → Training
- On app load: immediately show calibration modal
- User presses ANY key to set as BUTTON 2
- Optional: skip and use default Spacebar
- Device auto-detected: Gamepad if connected, otherwise Keyboard

### Simplified Calibration (`calibration.js`)
- Removed step-based system (was asking for d/f which is redundant)
- Now only asks user to select button 2 key
- No timing measurements needed
- Flash feedback on key selection
- Skip button defaults to spacebar

### Updated Input Handler (`inputHandler.js`)
- Added `button2Key` property
- Checks keydown against `button2Key` instead of hardcoded spacebar
- Added `setButton2Key()` method
- Proper handling of ANY key for button press

### Cleaned Up HTML (`index.html`)
- Removed old setup modal with device selection
- Removed checkbox for skipping calibration
- Simplified calibration modal
- Only shows calibration on load

### Updated Main Flow (`main.js`)
- Start directly with calibration (no setup modal)
- Auto-detect device after calibration
- Pass selected button 2 key to inputHandler
- Initialize inputHandler with chosen device

### Utils Changes (`utils.js`)
- Removed button2 mapping from KEYBOARD_MAP
- Button 2 is now device-agnostic

## Current Status
✅ Syntax check: All files pass Node.js syntax validation
✅ Calibration works with any key selection
✅ Auto-device-detection functional
✅ No hardcoded spacebar dependency
✅ Clean init flow without modal stacking
