# GitHub Copilot Instructions for Ziwei Doushu WordPress Plugin

## Project Overview

**Ziwei Doushu (紫微斗數) Calculator** - A WordPress plugin for real-time astrology chart generation.

**Architecture**: Three-tier system separating **calculation logic** (pure, reusable) from **UI layer** (display, interaction) via **Adapter pattern**.

**Key constraints**: 
- Desktop-first, vertical writing mode (`writing-mode: vertical-rl`)
- No external dependencies (vanilla JS only)
- No database storage (REST API only)
- All calculations in real-time

---

## Three-Tier Architecture

### 🔢 Layer 1: Calculation Layer (`assets/calculate/astrology/`)

**Purpose**: Pure mathematical computation, no dependencies, no side effects.

**Modules** (11 files, all under `assets/calculate/astrology/`):
```javascript
// All modules export functions via getModule('name')
// Examples via getAdapterModule():

const basic = getAdapterModule('basic');
const palaces = getAdapterModule('palaces');
const primary = getAdapterModule('primary');
const secondary = getAdapterModule('secondary');
const minorStars = getAdapterModule('minorStars');
const attributes = getAdapterModule('attributes');
const lifeCycle = getAdapterModule('lifeCycle');
const majorCycle = getAdapterModule('majorCycle');
const mutations = getAdapterModule('mutations');
const brightness = getAdapterModule('brightness');
const genderCalc = getAdapterModule('genderCalculator');
```

**Key characteristics**:
- ✅ Pure functions only
- ✅ No window object access
- ✅ No display logic
- ✅ No form dependencies
- ✅ Self-contained parameters
- ✅ Fail-fast principle (log errors, return safe defaults)

**Data structures** (conventions used across all modules):
- **Palace indices**: 0-11 (0=子, 11=亥)
- **Month indices**: 0-11 (0=正月)
- **Time indices**: 0-11 (military hours)
- **Star positions**: `{ starName: palaceIndex }` objects
- **Palace data**: `{ index, name, stem, branchZhi, isMing, isShen }`

---

### 🔗 Layer 2: Adapter Layer (`assets/js/data-adapter.js`)

**Purpose**: Bridge between calculation and display layers, normalize inputs/outputs, handle errors.

**Key responsibilities**:
1. **Input Normalization** (`adapter.input.normalize(formData)`)
   - Validates form data
   - Converts to lunar calendar
   - Standardizes indices
   - Returns `{ meta, lunar, indices, normalized }`

2. **Output Processing** (`adapter.output.process(calcResult, normalizedInput)`)
   - Structures calculation results
   - Coordinates all modules
   - Returns complete `{ meta, lunar, indices, sections, derived, constants, errors }`

3. **Module Registration** (`adapter.getModule(name)`)
   - Loads calculation modules on demand
   - Provides unified access point

4. **Error Handling** (`adapter.errors.isAdapterError`, `AdapterError`)
   - Custom error class with context
   - Field-level error tracking

**Usage pattern**:
```javascript
// In calculator.js (coordination layer)
const normalizedInput = adapter.input.normalize(formData);
const calcResult = await window.submitToApi(apiPayload);
const adapterOutput = adapter.output.process(calcResult, normalizedInput);

// Return all layers to display
return {
    calcResult,           // Raw API response
    normalizedInput,      // Standardized input
    adapterOutput        // Processed output (main data for display)
};
```

---

### 🎨 Layer 3: Display Layer (`assets/display/js/`)

**Purpose**: UI logic, event handling, DOM rendering. **Must not call calculation functions directly.**

**Modules** (6 files, all under `assets/display/js/`):

| Module | Purpose | CSS File | Data Source |
|--------|---------|----------|-------------|
| **chart.js** | Render 4x4 chart grid, palace cells | chart.css | adapterOutput |
| **form.js** | Collect input, show errors | form.css | Form fields only |
| **control.js** | Manage control bar | control.css | UI state |
| **config.js** | Settings panel | config.css | UI state |
| **palace-interaction.js** | Click handling, highlighting, lines | palace-interaction.css | Grid element |
| **cycles.js** | Display cycle panels | cycles.css | lifeCycleData |

**Strict rules**:
- ✅ Use `getAdapterModule()` only for helper data (e.g., `cycles.js` uses `basic.getHeavenlyStemIndex()`)
- ❌ **Never** call `window.ziweiBasic.getBasicIndices()` directly
- ❌ **Never** perform calculations in display modules
- ❌ **Never** access form values in chart.js
- ✅ Always receive data via function parameters (e.g., `draw(adapterOutput)`)
- ✅ Handle adapter errors via `adapter.errors.isAdapterError()`

---

### 🗂️ Layer 4: Data Layer (`assets/data/`)

**Purpose**: Store constants, configuration tables, and reference data used across calculation and display layers.

**Files**:
- **constants.js**: Global constants (palace names, heavenly stems, earthly branches, color codes)
- **palaces-name.js**: Palace names and metadata
- **nayin.js**: Five-element nayin (納音) configurations
- **brightness.js**: Star brightness/status table (star positions, palace strength status - 廟旺利陷)
- **mutation.js**: Four mutations/transformations table (四化 - 祿權科忌)

**Key characteristics**:
- ✅ Pure data, no logic
- ✅ No dependencies
- ✅ Accessed via `adapter.getModule('name')` or direct import
- ✅ Immutable (never modified at runtime)
- ✅ Used by calculation layer for lookups, by display layer via Adapter

**Usage pattern**:
```javascript
// In calculation modules (e.g., brightness.js calculation)
const brightnessData = require('../data/brightness.js');
const starStatus = brightnessData.getStarBrightness(starName, palaceIndex);

// In display modules (via Adapter only)
const brightnessModule = getAdapterModule('brightness');
```

---

## CSS Organization

**Principle**: Organize by **visual location and responsibility**, not functional grouping.

| CSS File | Manages | Location |
|----------|---------|----------|
| **chart.css** | 4x4 grid, palace cells, all interior content | Inside chart area |
| **palace-interaction.css** | High-light states, connection lines, overlays | Above chart (z-index layer) |
| **cycles.css** | Control panels below chart | Below 4x4 grid |
| **form.css** | Form inputs and validation states | Outside chart |
| **control.css** | Control bar (time switching, settings) | Above form |
| **config.css** | Settings panel | Right side or overlay |

**CSS responsibility boundaries**:
- `chart.css` = 宮位樣式 + 宮位內容（星曜、屬性、大限流年）
- `palace-interaction.css` = 互動層（高亮、連線）
- `cycles.css` = 排盤下方的控制面板
- No transitions on high-light for instant feedback (removed `transition: all 0.2s`)
- Synchronous canvas drawing for immediate response

---

draw(chartData)
├─ calculatePalacePositions() → palaceData
├─ placePrimaryStars() → primaryStarsData  
├─ calculateAllSecondaryStars() → secondaryStarsData
├─ calculateMinorStars() → minorStarsData (43 stars)
├─ calculateAllAttributes() → attributesData (3 spiritual mood descriptors per palace)
├─ calculateMajorCycles() → lifeCycleData
└─ createPalaceCell() for each of 12 positions
   ├─ .ziwei-stars-container (primary + secondary stars together)
   ├─ .ziwei-minor-stars-container (43 minor stars, mid-left)
   ├─ .ziwei-attributes-container (3 attributes/mood descriptors, bottom-left)
   ├─ .ziwei-palace-container (name + stem-branch, vertical)
   └─ .ziwei-life-cycle-container (cycles, bottom)
.ziwei-4x4-grid { grid-template-columns: repeat(4, 1fr); }
.ziwei-cell { writing-mode: vertical-rl; position: relative; }
.ziwei-stars-container { position: absolute; top: 4px; left: 50%; }
.ziwei-life-cycle-container { position: absolute; bottom: 3px; }

## Config Settings Standards (for config.js & config.css)

- All settings must be defined in a single SETTINGS_CONFIG array, grouped and commented by functional area.
- Only dropdowns (<select>) allowed; no toggles, radios, checkboxes, tooltips, loading, or disabled states.
- Each setting object: label, name, options, defaultValue, affectsChart, handler (function name).
- Render settings with createSettingsGroup; style only dropdowns/groups/panel in config.css.
- Handler must apply setting, persist to sessionStorage/localStorage, and log changes.
- No fallback logic or local calculation; always use constants or adapter modules.
- Privacy: hide personal info with placeholders, restore originals, always reapply after redraw.
- All functions use JSDoc; delete unused/commented code immediately.
- Always check for undefined/null, log warnings, fail fast if data missing.
- Naming: camelCase (functions), hyphen-case (files), dot-notation (CSS), window.ziwei prefix (exports).
- When adding/removing settings: update SETTINGS_CONFIG, handler, CSS, docs, and test persistence/redraw.

**Do not:**
- Add fallback logic or local calculation in config.js
- Use toggles, radios, checkboxes, tooltips, advanced settings, loading, or disabled states in config panel
- Duplicate constants; always use window.ziweiConstants or adapter modules
- Leave commented-out code

## Progressive Development Strategy
 Current phase: **Phase 10 (Major Cycles & Annual Cycles)** - 大限流年 (🚧 in progress - v0.5.0)
 
 - Phase 1-3: Form + palaces + basic information display (✅ complete)
 - Phase 4: Primary stars (✅ complete)
 - Phase 5: Secondary stars (✅ complete)
 - Phase 6: Four mutations (✅ complete)
 - Phase 7: Minor stars/雜曜 (✅ complete) - 43 stars fully implemented
 - Phase 8: 神煞 (✅ complete) - Tai Sui stars (太歲、將前、博士) fully implemented
 - Phase 9: Three-direction Four-square interaction & UI refinement (✅ complete)
 - Phase 10: Major cycles (大運) and annual cycles (流年) (✅ complete)
 - Phase 11: School/Config systems (🚧 ongoing)
      - Phase 11a: Star status (廟旺利陷) configurations (⏳ not started)
      - Phase 11b: Different school rules (⏳ not started)
      - Phase 11c: Month, Day and time handling differences (⏳ not started)
 - Phase 12: Export as PNG and PDF (⏳ not started)
 - Phase 13: True Sun time & location adjustments (⏳ not started)
 - Phase 14: Star explanations & tooltips (⏳ may not be included)
 - Phase 15: Star combination explanations (⏳ may not be included)

Generate code in **focused chunks** - one calculation function + one display integration per request. Test with console.log output before moving to next phase.

---

**Key principle**: Keep frontend stateless (all data via API), prefer modular functions over classes, maintain data flow transparency via console logging.

