# GitHub Copilot Instructions for Ziwei Doushu WordPress Plugin

## Project Overview

**Ziwei Doushu (紫微斗數) Calculator** - A WordPress plugin for real-time astrology chart generation. Frontend uses Vanilla JavaScript modules (no frameworks/npm), backend uses REST API with PHP. Emphasis on modularity and gradual feature expansion across 8 phases. All UI explanations in Traditional Chinese; code comments in English.

**Key constraint**: Desktop-first layout with vertical writing mode (`writing-mode: vertical-rl`) for traditional aesthetic.

## Architecture Patterns

### Frontend Module System (`assets/astrology/` & `assets/js/`)

Each calculation layer is a **separate JavaScript file** exposing functions via `window.ziweiXXX` namespace.

**Config for different schools** (future development): Located in `assets/data/` - currently supports 中州派 (Zhongzhou School)

```javascript
// Pattern: assets/astrology/{module}.js
window.ziweiBasic = { getMonthIndex(), getBasicIndices(), isClockwise() };
window.ziweiPalaces = { calculatePalacePositions() };
window.ziweiPrimary = { placePrimaryStars() };
window.ziweiSecondary = { calculateAllSecondaryStars() };
window.ziweiLifeCycle = { calculateMajorCycles(), calculateTwelveLongLifePositions() };
window.ziweiMinorStars = { calculateMinorStars() };  // 43 minor stars (雜曜)
window.ziweiAttributes = { calculateAttributes(), calculateAllAttributes() };  // 3 spiritual mood descriptors per palace (神煞)
```

**Script loading order** (registered in `ziwei-cal.php` lines 220-330):
1. Data modules first (palaces-name.js, nayin.js)
2. Core calculators (basic.js, palaces.js, primary.js, secondary.js, life-cycle.js, minor-stars.js, attributes.js)
3. Display/form modules (form.js, chart.js, calculator.js)
4. Interaction module (palace-interaction.js)
5. Cycle controls (cycles.js)

Each module **self-documents via console.log** during calculation for debugging.

### Data Structure Conventions

- **Palace indices**: 0-11 (0=子, 11=亥, mapped to grid positions)
- **Month indices**: 0-11 (0=正月, adjusted for leap months in basic.js line 25)
- **Time indices**: 0-11 (military hours 子-亥, calculated by lunar-converter.js)
- **Star positions**: `{ starName: palaceIndex }` objects (see secondary.js line 137)
- **Palace data**: `{ index, name, stem, branchZhi, stemIndex, isMing, isShen }`

### Chart Display Logic (`assets/js/chart.js`)

**Data flow**: Form input → REST API → Chart rendering via `draw()` function

```
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
```

### CSS Grid & Vertical Writing

**Layout**: 4×4 CSS Grid, center 2×2 merged into info box. Palace cells use `writing-mode: vertical-rl` for Chinese text.

```css
.ziwei-4x4-grid { grid-template-columns: repeat(4, 1fr); }
.ziwei-cell { writing-mode: vertical-rl; position: relative; }
.ziwei-stars-container { position: absolute; top: 4px; left: 50%; }
.ziwei-life-cycle-container { position: absolute; bottom: 3px; }
```

Main stars positioned at **top-center**, Other stars at **mid-left**, palace name at **bottom-right**, life cycles at **bottom-center**, palace characteristics at **bottom-left** of each cell.

## Development Workflow

### Adding New Star Types

1. **Create calculation function** in `assets/astrology/[module].js`
   - Follow pattern: `calculate[StarName](index)` returns `{ star1: palaceIndex, star2: palaceIndex }`
   - Add to star data structure in `calculateAllSecondaryStars()` (secondary.js line 137)

2. **Integrate into chart.js `draw()`** function
   - Call calculation function with extracted indices (month, time, year, body palace)
   - Pass data to `createPalaceCell()` via function parameter

3. **Display logic in `createPalaceCell()`**
   - Loop through returned star map, add `.ziwei-[type]-star` elements to `.ziwei-stars-container`
   - Apply CSS class for styling

4. **Add CSS styling** in `chart.css`
   - Use `.ziwei-[type]-star` class with `writing-mode: vertical-rl`, `text-orientation: upright`
   - Primary stars: red (#e74c3c), secondary: gray (#6b7a87), both 18px/700 weight

### Example: Adding 四化 (Four Mutations)

1. Create `assets/astrology/mutations.js` with `calculateFourMutations(lunarYear)`
2. Register script in ziwei-cal.php with dependency on `ziwei-cal-nayin` (needs five elements loci)
3. In chart.js `draw()`, call: `const mutationsData = window.ziweiMutations.calculateFourMutations(meta.lunar.lunarYear)`
4. Pass `mutationsData` to `createPalaceCell()`, display mutations in same container as stars

## PHP Backend (`ziwei-cal.php`)

**Pattern**: Single REST endpoint `/ziwei-cal/v1/calculate` (POST) handles all computation:

```php
register_rest_route('ziwei-cal/v1', '/calculate', [
    'methods' => WP_REST_Server::CREATABLE,
    'callback' => 'ziwei_cal_calculate_chart',
    'permission_callback' => fn() => true,  // Public access
    'args' => [ /* strict sanitization for each parameter */ ]
]);
```

**No database storage** - all calculations in real-time. Use `sanitize_text_field()` and `absint()` for inputs, always escape outputs with `wp_json_encode()`.

## Code Organization Standards

- **Naming**: Camel case for functions (`calculateMingPalace`), hyphen for file/directory names (`life-cycle.js`)
- **Comments**: English block comments for functions with JSDoc format `@param`, `@returns`, inline for complex logic
- **Console logging**: Extensive for debugging - never remove, helps track data flow (e.g., `console.log('Calculation result:', data)`)
- **No external dependencies**: Use vanilla JavaScript only (no jQuery, no npm packages)
- **Helper functions**: Extract shared logic (e.g., `isClockwise()` in basic.js for yin/yang direction)
- **Module structure**: 'use strict'; at top, then calculations, then `window.ziweiXXX = { ...functions };` at end
- **Object handling**: Always check for undefined/null before accessing nested properties (e.g., `lunar?.lunarMonth`)
- **Data validation**: Log warnings for invalid inputs, return safe defaults (empty array/object)
- **No fallbacks**: Assume all required data is present; log errors if not (fail fast principle)

### Code Quality Checklist

✅ **Verified in current codebase:**
- All astrology modules use `'use strict'` mode
- All functions documented with JSDoc comments including @param and @returns
- Console.log extensively used for debugging (search flow: secondary stars → chart display)
- No npm dependencies - only vanilla ES6 JavaScript
- Reduce the testing. Let users do the testing instead

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

