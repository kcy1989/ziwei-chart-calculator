# Ziwei Chart Config Settings Design Standards

## Purpose
This document defines the standards for designing, adding, and maintaining settings in the Ziwei chart plugin's configuration panel (`config.js` and `config.css`). Follow these rules to ensure maintainability, clarity, and correct data flow for all future settings.

---

## 1. Settings Structure & Categorization
- All settings must be defined in a single `SETTINGS_CONFIG` array in `config.js`.
- Each setting object must include:
  - `label`: Display name (Chinese, user-facing)
  - `name`: Unique key (used for select name/id and sessionStorage)
  - `options`: Array of `{ value, text }` for dropdowns only (no toggles/radios/checkboxes)
  - `defaultValue`: Default value (must match one of the options)
  - `affectsChart`: Boolean, true if setting triggers chart recalculation
  - `handler`: Name of handler function (string, must be implemented in config.js)
- Settings must be grouped and commented by functional area:
  1. 星曜顯示（chart 顯示層）
  2. 命盤計算（adapter 層/後端 API）
  3. 介面語言（UI 顯示層）
  4. 個人資料隱私（UI 顯示層）

---

## 2. UI Design Rules
- Only dropdown (`<select>`) controls are allowed for settings selection.
- No toggles, radios, checkboxes, tooltips, advanced settings, loading, or disabled states in config panel.
- All settings must be rendered using `createSettingsGroup(label, name, options)`.
- Each setting group must have a label and a select element, styled with `.ziwei-settings-label` and `.ziwei-settings-select`.
- CSS (`config.css`) must only include styles for dropdowns, groups, panel, and responsive layout. Remove unused classes for toggles, radios, checkboxes, tooltips, loading, disabled, etc.

---

## 3. Data Flow & Persistence
- All settings changes must be handled by their respective handler function (named in `handler` property).
- Handler functions must:
  - Apply the setting to the UI/chart as needed
  - Store the value in sessionStorage (or localStorage for language)
  - Log the change with `console.log` for traceability
- Never use fallback logic or local calculation in config.js. Always use constants or adapter modules for any derived data.
- On chart redraw, settings must be reapplied from sessionStorage.

---

## 4. Privacy & Personal Info
- Personal info hiding must replace chart values with placeholders, and restore originals when toggled back.
- Store original values in a dedicated object, never in DOM or global variables.
- Always reapply privacy state after chart redraw using `reapplyPersonalInfoStateImmediately`.

---

## 5. Documentation & Comments
- All functions must use JSDoc format (`@param`, `@returns`).
- All settings must be grouped and commented by functional area.
- No commented-out code; delete unused code immediately.
- Use clear, concise comments for complex logic only.

---

## 6. Error Handling & Validation
- Always check for undefined/null before accessing nested properties.
- Log warnings for invalid inputs, return safe defaults.
- Fail fast: throw or log error if required data is missing.

---

## 7. Naming Conventions
- Functions: camelCase
- Files: hyphen-case
- CSS classes: dot-notation (e.g., `.ziwei-settings-panel`)
- Window exports: prefix with `ziwei` (e.g., `window.ziweiConfig`)

---

## 8. Change Management
- When adding a new setting:
  1. Add to `SETTINGS_CONFIG` with all required fields
  2. Implement handler function
  3. Add CSS only if new visual element is needed (dropdown/group/panel)
  4. Update comments and documentation
  5. Test persistence and chart redraw behavior
- When removing a setting:
  1. Remove from `SETTINGS_CONFIG`
  2. Remove handler function
  3. Remove related CSS
  4. Clean up comments/documentation

---

## 9. Example Setting Object
```js
{
  label: '星曜亮度',
  name: 'starBrightness',
  options: [
    { value: 'hidden', text: '不顯示 - 預設' },
    { value: 'shuoshu', text: '斗數全書' }
  ],
  defaultValue: 'hidden',
  affectsChart: false,
  handler: 'applyStarBrightnessChange'
}
```

---

## 10. Do Not
- Do not add fallback logic or local calculation in config.js
- Do not use toggles, radios, checkboxes, tooltips, advanced settings, loading, or disabled states in config panel
- Do not leave commented-out code
- Do not duplicate constants; always use window.ziweiConstants or adapter modules

---

**Follow these standards for all future config settings development.**
