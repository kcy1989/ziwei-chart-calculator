'use strict';

/**
 * Configuration module for Ziwei chart settings
 * Handles: settings panel generation, option display logic, and chart computation effects
 * 
 * Corresponding CSS: assets/display/css/config.css
 */
(function () {
    const SETTINGS_SELECTOR = '.ziwei-settings-panel';
    
    // Cache for mutable elements (not frozen, allows updates)
    const _elementCache = {
        chartElement: null,
        personalInfoElements: {
            name: null,
            gender: null,
            gregorianDate: null,
            lunarDate: null
        }
    };
    
    // Store original personal information for privacy mode toggle
    let originalPersonalInfo = {
        name: '',
        gender: '',
        gregorianDate: '',
        lunarDate: ''
    };
    
    // -----------------------------
    // Adapter helpers
    // Functions that access the centralized adapter instance, its settings
    // store and storage API. The adapter is the canonical persistence layer.
    // -----------------------------
    function getAdapterInstance() {
        return window.ziweiAdapter || null;
    }

    function getAdapterSettings() {
        const adapter = getAdapterInstance();
        if (!adapter || !adapter.settings) {
            return null;
        }
        return adapter.settings;
    }

    function getAdapterSettingValue(name) {
        if (!name) {
            return null;
        }
        try {
            const settings = getAdapterSettings();
            if (settings && typeof settings.get === 'function') {
                return settings.get(name);
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function setAdapterSettingValue(name, value) {
        if (!name) {
            return;
        }
        try {
            const settings = getAdapterSettings();
            if (settings && typeof settings.set === 'function') {
                settings.set(name, value);
            }
        } catch (e) {}
    }

    function getAdapterStorageValue(key) {
        if (!key) {
            return null;
        }
        try {
            const adapter = getAdapterInstance();
            if (adapter && adapter.storage && typeof adapter.storage.get === 'function') {
                return adapter.storage.get(key);
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function setAdapterStorageValue(key, value) {
        if (!key) {
            return;
        }
        try {
            const adapter = getAdapterInstance();
            if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
                adapter.storage.set(key, value);
            }
        } catch (e) {}
    }

    function removeAdapterStorageValue(key) {
        if (!key) {
            return;
        }
        try {
            const adapter = getAdapterInstance();
            if (adapter && adapter.storage && typeof adapter.storage.remove === 'function') {
                adapter.storage.remove(key);
            }
        } catch (e) {}
    }

    function getFormDataFromFormModule() {
        // Prefer canonical stored form snapshot in adapter storage
        try {
            const stored = getAdapterStorageValue('formInput');
            if (stored) return Object.assign({}, stored);
        } catch (e) {}

        try {
            const normalized = getAdapterStorageValue('normalizedInput') || getAdapterStorageValue('normalized');
            if (normalized && normalized.raw) return Object.assign({}, normalized.raw);
        } catch (e) {}

        // Last-resort: ask form module directly (not preferred)
        if (window.ziweiForm && typeof window.ziweiForm.getLastFormData === 'function') {
            return window.ziweiForm.getLastFormData();
        }
        if (window.ziweiForm && window.ziweiForm.formData) {
            return window.ziweiForm.formData;
        }
        return null;
    }

    // -----------------------------
    // Persistence helpers
    // Save computation outputs and normalized inputs into adapter.storage so
    // display modules and subsequent operations can read canonical data.
    // -----------------------------
    function persistComputationResult(result) {
        if (!result || typeof result !== 'object') {
            return;
        }
        const normalizedInput = result.normalizedInput || null;
        const adapterOutput = result.adapterOutput || null;
        const calcResult = result.calcResult || null;

        if (normalizedInput) {
            setAdapterStorageValue('normalizedInput', normalizedInput);
            const rawForm = normalizedInput.raw ? Object.assign({}, normalizedInput.raw) : null;
            if (rawForm) {
                setAdapterStorageValue('formInput', rawForm);
            }
        }
        if (adapterOutput) {
            setAdapterStorageValue('adapterOutput', adapterOutput);
            if (adapterOutput.meta) {
                setAdapterStorageValue('meta', adapterOutput.meta);
            }
            if (adapterOutput.raw) {
                setAdapterStorageValue('raw', adapterOutput.raw);
            }
        } else if (normalizedInput) {
            setAdapterStorageValue('raw', { normalizedInput });
        }
        if (calcResult) {
            setAdapterStorageValue('calcResult', calcResult);
        }
    }

    // Track current personal info privacy state to persist across chart redraws
    // Initialize from adapter settings if available, otherwise default to 'show'
    let currentPersonalInfoState = (() => {
        const stored = getAdapterSettingValue('personalInfo');
        return stored || 'show';
    })();

    /**
     * Settings configuration data
     * Each setting object contains: label (UI string), name (key), options (dropdown items),
     * defaultValue, whether it affects chart computation/display, and handler name.
     *
     * Sections (for maintainers):
     * - Display-only settings: visual presentation only, do not affect calculation (e.g. starBrightness, xunKong)
     * - Calculation settings: affect adapter normalization / calculation (e.g. leapMonthHandling, ziHourHandling)
     * - UI settings: interface choices such as language
     * - Privacy settings: local UI masking (personalInfo)
     *
     * Note: setting values are stored in the adapter settings store (adapter.settings).
     */
    const SETTINGS_CONFIG = [
        // Display-only: star visibility / presentation (chart layer)
        {
            label: '星曜亮度',
            name: 'starBrightness',
            options: [
                { value: 'hidden', text: '不顯示 - 預設' },
                { value: 'shuoshu', text: '斗數全書' }
            ],
            defaultValue: 'hidden',
            affectsChart: false,  // display-only
            handler: 'applyStarBrightnessChange'
        },
        // Calculation: adapter/normalization affecting settings (these change computed lunar/indices)
        {
            label: '閏月處理',
            name: 'leapMonthHandling',
            options: [
                { value: 'mid', text: '月中換月 - 預設' },
                { value: 'current', text: '視為本月' },
                { value: 'next', text: '視為下月' }
            ],
            defaultValue: 'mid',
            affectsChart: true,  // affects chart computation via adapter
            handler: 'applyLeapMonthChange'
        },
        {
            label: '子時處理',
            name: 'ziHourHandling',
            options: [
                { value: 'midnightChange', text: '午夜換日 - 預設' },
                { value: 'ziChange', text: '子時換日 (開發中)' }
            ],
            defaultValue: 'midnightChange',
            affectsChart: true,  // affects chart computation via adapter
            handler: 'applyZiHourChange'
        },
    // Display-only: XunKong / 正副 (primary/secondary) marking (visual)
        {
            label: '截空旬空',
            name: 'xunKong',
            options: [
                { value: 'noDistinct', text: '不論正副 - 預設' },
                { value: 'marked', text: '標明正副 (開發中)' },
                { value: 'primaryOnly', text: '只排正星 (開發中)' }
            ],
            defaultValue: 'noDistinct',
            affectsChart: false,  // display-only
            handler: 'applyXunKongChange'
        },
        // UI: interface language
        {
            label: '介面語言',
            name: 'language',
            options: [
                { value: 'zh-hant', text: '繁體中文 - 預設' },
                { value: 'zh-hans', text: '簡体中文 (開發中)' }
            ],
            defaultValue: 'zh-hant',
            affectsChart: false,  // display-only
            handler: 'applyLanguageChange'
        },
        // Privacy: personal information masking (UI only)
        {
            label: '個人資料',
            name: 'personalInfo',
            options: [
                { value: 'show', text: '顯示 - 預設' },
                { value: 'hide', text: '隱藏' }
            ],
            defaultValue: 'show',
            affectsChart: false,  // display-only
            handler: 'applyPersonalInfoChange'
        }
    ];

    /**
     * Get all settings configuration
     * @returns {Array} Settings configuration array
     */
    function getSettingsConfig() {
        return SETTINGS_CONFIG;
    }

    /**
     * Get specific setting by name
     * @param {string} name Setting name
     * @returns {Object|null} Setting configuration or null if not found
     */
    function getSetting(name) {
        return SETTINGS_CONFIG.find(s => s.name === name) || null;
    }

    // -----------------------------
    // Handlers - Display-only
    // These handlers change visual presentation only and persist the
    // selected value into adapter.settings for cross-module consistency.
    // -----------------------------
    /**
     * Apply star brightness changes
     * @param {string} brightnessValue Selected brightness value ('hidden' or 'shuoshu')
     */
    function applyStarBrightnessChange(brightnessValue) {
        // Always query for the latest chart element (don't rely on cache)
        let chart = document.querySelector('[data-ziwei-chart]') || 
                   document.querySelector('.ziwei-chart-wrapper');
        
        if (chart) {
            chart.setAttribute('data-star-brightness', brightnessValue);
        } else {
            console.warn('[ziweiConfig] Chart element not found for brightness change');
        }

        setAdapterSettingValue('starBrightness', brightnessValue);
    }

    // -----------------------------
    // Handlers - Calculation-affecting
    // These handlers modify normalization/calculation inputs and trigger
    // recomputation via the adapter/calculator so results reflect user choices.
    // -----------------------------
    /**
     * Apply leap month handling changes to chart
     * @param {string} handlingValue Selected leap month handling method
     */
    function applyLeapMonthChange(handlingValue) {
        setAdapterSettingValue('leapMonthHandling', handlingValue);

        // Prefer adapter-stored form data; fall back to cache
        let formData = getFormDataFromFormModule();
        if (!formData) {
            formData = recoverFormDataFromCache();
        }
        if (!formData) return;

        // Update formData and dispatch a centralized submit event so calculator
        // clears/primes adapter and runs the canonical compute pipeline.
        formData.leapMonthHandling = handlingValue;
        const container = document.querySelector('.ziwei-cal') || document;
        try {
            container.dispatchEvent(new CustomEvent('ziwei-form-submit', { detail: { formData } }));
        } catch (e) {
            console.error('[ziweiConfig] Failed to dispatch ziwei-form-submit for leapMonthChange', e);
        }
    }

    /**
     * Apply Zi hour handling changes to chart
     * @param {string} handlingValue Selected Zi hour handling method
     */
    function applyZiHourChange(handlingValue) {
        // Apply zi-hour handling change (adapter.settings is the canonical store)
        // 1. Persist setting
        // Persist effective setting into adapter-level storage (adapter is canonical)
        setAdapterSettingValue('ziHourHandling', handlingValue);

        // 2. Recover last used form data (form module or chart cache)
        let formData = null;
        if (!formData) {
            formData = recoverFormDataFromCache();
        }

        if (!formData) {
            return;
        }

        // Diagnostic: show a short summary of recovered formData
        // recovered formData summary omitted (debug)

        // 3. Apply Zi-hour conversion if required
        // "midnightChange" = default: do nothing
        if (handlingValue === 'ziChange') {
            // Accept either a string birthdate or numeric year/month/day fields
            const birthdateStr = formData.birthdate || formData.date || null; // support common field names
            const birthtimeStr = formData.birthtime || formData.time || null;

            // Determine numeric date/time source
            let srcYear = null, srcMonth = null, srcDay = null;
            if (birthdateStr) {
                const m = String(birthdateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (m) {
                    srcYear = parseInt(m[1], 10);
                    srcMonth = parseInt(m[2], 10);
                    srcDay = parseInt(m[3], 10);
                }
            }
            // Fallback to numeric fields if no birthdate string
            if (srcYear === null && formData.year) {
                srcYear = parseInt(formData.year, 10);
                srcMonth = parseInt(formData.month, 10) || srcMonth;
                srcDay = parseInt(formData.day, 10) || srcDay;
            }

            // Determine time
            let srcHour = null, srcMinute = null;
            if (birthtimeStr) {
                const t = String(birthtimeStr).split(':').map(p => parseInt(p, 10));
                if (Number.isFinite(t[0])) srcHour = t[0];
                if (Number.isFinite(t[1])) srcMinute = t[1];
            }
            if (srcHour === null && (formData.hour !== undefined && formData.hour !== null)) {
                srcHour = parseInt(formData.hour, 10);
                srcMinute = parseInt(formData.minute, 10) || 0;
            }

            // If we have valid numeric date/time values, proceed to apply ziChange
            if (Number.isFinite(srcYear) && Number.isFinite(srcMonth) && Number.isFinite(srcDay) && Number.isFinite(srcHour)) {
                // Ensure numeric hour/minute fields are present for adapter.normalize
                formData.hour = srcHour;
                formData.minute = srcMinute || 0;

                // Use original base values if present so repeated toggles are idempotent
                const orig = formData._ziOriginal || getAdapterStorageValue('_ziOriginal') || null;
                const baseYear = orig && orig.year ? parseInt(orig.year, 10) : srcYear;
                const baseMonth = orig && orig.month ? parseInt(orig.month, 10) : srcMonth;
                const baseDay = orig && orig.day ? parseInt(orig.day, 10) : srcDay;
                const baseHour = orig && typeof orig.hour !== 'undefined' ? parseInt(orig.hour, 10) : srcHour;
                const baseMinute = orig && typeof orig.minute !== 'undefined' ? parseInt(orig.minute, 10) : (srcMinute || 0);

                // Condition: between 23:00 and 23:55 inclusive (based on baseHour/baseMinute)
                if (baseHour === 23 && (baseMinute || 0) >= 0 && (baseMinute || 0) <= 55) {
                    try {
                        // Save original values if not already saved so we can revert later
                        if (!formData._ziOriginal) {
                            formData._ziOriginal = {
                                birthdate: birthdateStr || null,
                                year: formData.year || srcYear,
                                month: formData.month || srcMonth,
                                day: formData.day || srcDay,
                                hour: formData.hour || srcHour,
                                minute: formData.minute || srcMinute || 0
                            };
                            setAdapterStorageValue('_ziOriginal', Object.assign({}, formData._ziOriginal));
                        }

                        // Do NOT mutate the Gregorian (solar) birthdate. Only mark that
                        // ziChange should be applied for lunar conversion. The adapter
                        // will perform lunar conversion using solar+1 day internally.
                        formData._ziChangeApplied = true;
                        // Optional explicit marker for lunar-only shift (1 day)
                        formData._ziLunarShiftDays = 1;
                        // Zi-hour conversion marker applied (lunar shift only)
                    } catch (e) {
                        console.warn('[ziweiConfig] Failed to adjust birthdate for ziChange:', e);
                    }
                }
            }
        }

        // 4. Set the handling into formData so adapter/calculator see it
        formData.ziHourHandling = handlingValue;

        // If switching BACK to midnightChange, attempt to restore original date
        if (handlingValue === 'midnightChange') {
            // Prefer the original saved in formData, otherwise global cache
            const orig = formData._ziOriginal || getAdapterStorageValue('_ziOriginal') || null;
            if (orig) {
                try {
                    // Restore original fields
                    if (orig.birthdate) formData.birthdate = orig.birthdate;
                    if (orig.year) formData.year = orig.year;
                    if (orig.month) formData.month = orig.month;
                    if (orig.day) formData.day = orig.day;
                    if (orig.hour !== undefined) formData.hour = orig.hour;
                    if (orig.minute !== undefined) formData.minute = orig.minute;
                    // Remove markers so toggling doesn't repeatedly add
                    delete formData._ziChangeApplied;
                    delete formData._ziOriginal;
                    removeAdapterStorageValue('_ziOriginal');
                    // Reverted to midnightChange; original birthdate restored
                } catch (e) {
                    console.warn('[ziweiConfig] Failed to restore original date on midnightChange:', e);
                }
            }
        }

        // 5. Trigger recompute via centralized submit event so calculator handles
        // clearing/priming adapter and running the canonical compute pipeline.
        try {
            const container = document.querySelector('.ziwei-cal') || document;
            container.dispatchEvent(new CustomEvent('ziwei-form-submit', { detail: { formData } }));
        } catch (e) {
            console.error('[ziweiConfig] Failed to dispatch ziwei-form-submit for ziHourChange', e);
        }
    }

    function buildFormDataFromNormalized(normalized) {
        if (!normalized) return null;
        const solar = normalized.solar || {};
        const raw = normalized.raw || {};
        const strings = normalized.strings || {};
        const pick = (key) => {
            if (solar[key] !== undefined && solar[key] !== null) return solar[key];
            if (raw[key] !== undefined && raw[key] !== null) return raw[key];
            if (normalized[key] !== undefined && normalized[key] !== null) return normalized[key];
            return null;
        };
        const form = {
            year: pick('year'),
            month: pick('month'),
            day: pick('day'),
            hour: pick('hour'),
            minute: pick('minute')
        };
        const birthdate = strings.birthdate || raw.birthdate || normalized.birthdate;
        const birthtime = strings.birthtime || raw.birthtime || normalized.birthtime;
        if (birthdate) form.birthdate = birthdate;
        if (birthtime) form.birthtime = birthtime;
        if (raw.birthplace) form.birthplace = raw.birthplace;
        if (raw.name) form.name = raw.name;
        // Preserve ziHourHandling from normalized.meta when available so recovered
        // form data will continue to respect the user's zi-hour setting.
        try {
            var zih = (normalized.meta && normalized.meta.ziHourHandling) ? normalized.meta.ziHourHandling : null;
            if (!zih) {
                try {
                    if (window.ziweiAdapter && window.ziweiAdapter.settings && typeof window.ziweiAdapter.settings.get === 'function') {
                        zih = window.ziweiAdapter.settings.get('ziHourHandling');
                    }
                } catch (e) {
                    zih = null;
                }
            }
            if (zih) form.ziHourHandling = zih;
            // Also preserve leapMonthHandling when present
            var lmh = (normalized.meta && normalized.meta.leapMonthHandling) ? normalized.meta.leapMonthHandling : null;
            if (lmh) form.leapMonthHandling = lmh;
        } catch (e) {
            // ignore storage errors
        }
        return form;
    }

    function recoverFormDataFromCache() {
        const storedForm = getAdapterStorageValue('formInput');
        if (storedForm) {
            return Object.assign({}, storedForm);
        }
        const normalizedKeys = ['normalizedInput', 'normalized'];
        for (let i = 0; i < normalizedKeys.length; i++) {
            const normalized = getAdapterStorageValue(normalizedKeys[i]);
            if (normalized) {
                return buildFormDataFromNormalized(normalized);
            }
        }
        return null;
    }

    /**
     * Apply language changes to interface
     * @param {string} languageValue Selected language code (zh-hant or zh-hans)
     */
    function applyLanguageChange(languageValue) {
        document.documentElement.lang = languageValue;
        document.documentElement.setAttribute('data-language', languageValue);
        setAdapterSettingValue('language', languageValue);
    }

    /**
     * Apply Xun Kong (截空旬空) display changes
     * @param {string} xunkongValue Selected Xun Kong display method
     */
    function applyXunKongChange(xunkongValue) {
        const chart = _elementCache.chartElement || document.querySelector('[data-ziwei-chart]');
        if (chart) {
            chart.setAttribute('data-xun-kong', xunkongValue);
        }
        setAdapterSettingValue('xunKong', xunkongValue);
    }

    /**
     * Apply personal info visibility changes - Replace sensitive data with placeholders
     * @param {string} infoValue Selected personal info visibility ('show' or 'hide')
     */
    function applyPersonalInfoChange(infoValue) {
        const nameEl = document.querySelector('.ziwei-name');
        const genderEl = document.querySelector('.ziwei-gender-classification');
        const gregDateEl = document.querySelector('.ziwei-datetime:not(.ziwei-lunar)');
        const lunarDateEl = document.querySelector('.ziwei-datetime.ziwei-lunar');

        if (infoValue === 'hide') {
            try {
                const snap = buildPersonalInfoSnapshotFromAdapter();
                if (!snap) {
                    console.error('[ziweiConfig] Cannot mask personal info without adapter snapshot');
                } else {
                    originalPersonalInfo._snapshot = JSON.parse(JSON.stringify(snap));
                    const meta = extractMetaFromSnapshot(snap);
                    if (!hydrateOriginalPersonalInfoFromMeta(meta)) {
                        console.error('[ziweiConfig] Snapshot meta missing while entering hide mode');
                    }
                }
            } catch (snapshotErr) {
                console.error('[ziweiConfig] Failed to cache adapter snapshot for hide mode', snapshotErr);
            }

            if (nameEl) nameEl.textContent = '有心人';
            if (genderEl) genderEl.textContent = '沒有';
            if (gregDateEl) gregDateEl.textContent = '西曆：用戶不顯示出生日期';
            if (lunarDateEl) lunarDateEl.textContent = '農曆：用戶不顯示出生日期';
        } else if (infoValue === 'show') {
            const snapshot = originalPersonalInfo._snapshot || buildPersonalInfoSnapshotFromAdapter();
            const meta = extractMetaFromSnapshot(snapshot);
            if (!meta) {
                console.error('[ziweiConfig] Unable to restore personal info: adapter meta missing');
            }
            hydrateOriginalPersonalInfoFromMeta(meta);

            if (nameEl) {
                nameEl.textContent = meta?.name || originalPersonalInfo.name || '無名氏';
            }
            if (genderEl) {
                const genderText = meta?.genderClassification || meta?.gender || originalPersonalInfo.gender || '';
                genderEl.textContent = genderText || '未知';
            }
            if (gregDateEl) {
                const solarText = meta ? getSolarTextFromMeta(meta) : null;
                gregDateEl.textContent = solarText || originalPersonalInfo.gregorianDate || '西曆：資料缺失';
            }
            if (lunarDateEl) {
                const lunarText = meta ? getLunarTextFromMeta(meta) : null;
                lunarDateEl.textContent = lunarText || originalPersonalInfo.lunarDate || '農曆：資料缺失';
            }
        }

        currentPersonalInfoState = infoValue;
        setAdapterSettingValue('personalInfo', currentPersonalInfoState);
    }

    /**
     * Execute handler for a setting change
     * @param {string} settingName Setting name
     * @param {string} value Selected value
     */
    function applySetting(settingName, value) {
        const setting = getSetting(settingName);
        if (!setting) {
            console.warn('[ziweiConfig] Setting not found:', settingName);
            return;
        }

        const handler = window.ziweiConfig[setting.handler];
        if (typeof handler === 'function') {
            handler(value);
        }
    }

    /**
     * Create settings group element
     * @param {string} label Display label
     * @param {string} name Select name/id
     * @param {Array} options Options for dropdown
     * @returns {HTMLElement}
     */
    function createSettingsGroup(label, name, options = []) {
        // -----------------------------
        // UI helpers - settings panel rendering
        // Functions that build DOM controls for the settings panel and
        // restore values from adapter settings.
        // -----------------------------
        const group = document.createElement('div');
        group.className = 'ziwei-settings-group';

        const labelEl = document.createElement('label');
        labelEl.className = 'ziwei-settings-label';
        labelEl.setAttribute('for', `settings-${name}`);
        labelEl.textContent = label;
        group.appendChild(labelEl);

        const select = document.createElement('select');
        select.id = `settings-${name}`;
        select.name = name;
        select.className = 'ziwei-settings-select';

        // Add options
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.title) {
                option.title = opt.title;  // Tooltip
            }
            select.appendChild(option);
        });

        // Restore value from adapter settings if available
    let storedValue = getAdapterSettingValue(name);

        // Always set defaultValue if no stored value
        if (storedValue) {
            select.value = storedValue;
        } else {
            // Use setting defaultValue as fallback to ensure proper visible text
            var settingCfg = getSetting(name);
            var defaultVal = settingCfg && settingCfg.defaultValue ? settingCfg.defaultValue : null;
            if (defaultVal) {
                select.value = defaultVal;
            }
        }

        // Add change listener to apply settings
        select.addEventListener('change', (e) => {
            applySetting(name, e.target.value);
        });

        group.appendChild(select);
        return group;
    }

    /**
     * Update stored personal info values when chart redraws in hide state
     * Prevents stored data from being out of sync with new chart values
     * @param {Object} chartData New chart data from handleHourChange
     */
    function updateStoredPersonalInfoIfHidden(chartData) {
        // -----------------------------
        // Personal info/persistence helpers
        // Helpers to keep masked personal info consistent across redraws. When
        // personal info is hidden we store a sanitized snapshot in adapter.storage
        // and refresh it when the base chart data changes.
        // -----------------------------
        if (currentPersonalInfoState !== 'hide') {
            return;  // Only update if we're in hide state
        }

        const metaFromData = extractMetaFromChartData(chartData) || getAdapterStorageValue('meta') || null;
        if (metaFromData) {
            hydrateOriginalPersonalInfoFromMeta(metaFromData);
        } else {
            console.error('[ziweiConfig] Unable to refresh hidden personal info snapshot: adapter meta missing');
        }

        try {
            const snap = buildPersonalInfoSnapshotFromAdapter();
            if (snap) {
                originalPersonalInfo._snapshot = JSON.parse(JSON.stringify(snap));
            }
        } catch (e) {
            // ignore
        }
    }

    function extractMetaFromSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') {
            return null;
        }
        if (snapshot.adapterOutput && snapshot.adapterOutput.meta) {
            return snapshot.adapterOutput.meta;
        }
        return snapshot.meta || null;
    }

    function extractMetaFromChartData(chartData) {
        if (!chartData || typeof chartData !== 'object') {
            return null;
        }
        if (chartData.adapterOutput && chartData.adapterOutput.meta) {
            return chartData.adapterOutput.meta;
        }
        if (chartData.meta) {
            return chartData.meta;
        }
        return null;
    }

    function formatGregorianFromNumericSnapshot(numeric) {
        // Removed: display should not format canonical date strings from numeric
        // snapshots. The adapter must provide `birthdateSolarText` when a
        // formatted string is required. Return null to avoid fallback formatting
        // in the display layer.
        return null;
    }

    function getSolarTextFromMeta(meta) {
        // Only return adapter-provided formatted solar string.
        if (!meta) return null;
        return meta.birthdateSolarText || null;
    }

    function getLunarTextFromMeta(meta) {
        // Only return adapter-provided formatted lunar string.
        if (!meta) return null;
        return meta.birthdateLunarText || null;
    }

    /**
     * Format lunar date for storage (legacy helper for fallback)
     * @param {Object} lunar Lunar data object
     * @returns {string} Formatted lunar string
     */
    function hydrateOriginalPersonalInfoFromMeta(meta) {
        if (!meta || typeof meta !== 'object') {
            return false;
        }
        if (meta.name) {
            originalPersonalInfo.name = meta.name;
        }
        if (meta.genderClassification || meta.gender) {
            originalPersonalInfo.gender = meta.genderClassification || meta.gender;
        }
        const solarText = getSolarTextFromMeta(meta);
        if (solarText) {
            originalPersonalInfo.gregorianDate = solarText;
        }
        const lunarText = getLunarTextFromMeta(meta);
        if (lunarText) {
            originalPersonalInfo.lunarDate = lunarText;
        }
        return true;
    }

    /**
     * Build a compact snapshot object from adapter storage (centralized)
     * Ensures adapter-provided formatted lunar string and genderClassification are present when available.
     * @returns {Object|null}
     */
    function buildPersonalInfoSnapshotFromAdapter() {
        // -----------------------------
        // Snapshot helpers
        // Build a compact snapshot from adapter storage to allow restoring
        // visible personal info after masking/unmasking.
        // -----------------------------
        const normalized = getAdapterStorageValue('normalizedInput') || null;
        const adapterOutput = getAdapterStorageValue('adapterOutput') || null;
        const calcResult = getAdapterStorageValue('calcResult') || null;
        const meta = getAdapterStorageValue('meta') || (adapterOutput && adapterOutput.meta) || null;
        const formInput = getAdapterStorageValue('formInput') || null;

        if (!normalized && !adapterOutput && !calcResult && !meta && !formInput) {
            return null;
        }

        const snap = {
            normalized,
            adapterOutput,
            calcResult,
            meta,
            formInput
        };

        if (adapterOutput) {
            try {
                snap.adapterOutput = adapterOutput;
                if (!snap.meta && adapterOutput.meta) {
                    snap.meta = adapterOutput.meta;
                }
                if (adapterOutput.lunar && adapterOutput.lunar.formatted && adapterOutput.lunar.formatted.full) {
                    snap.meta = snap.meta || {};
                    snap.meta._adapterLunarFull = adapterOutput.lunar.formatted.full;
                }
                if (adapterOutput.meta && adapterOutput.meta.genderClassification) {
                    snap.meta = snap.meta || {};
                    snap.meta._adapterGenderClassification = adapterOutput.meta.genderClassification;
                }
            } catch (e) {}
        }

        return snap;
    }

    /**
     * Reapply personal info hiding state immediately after chart renders
     * Called by control.js AFTER chart replacement to avoid visual flashing
     * @param {HTMLElement} newChartElement The newly inserted chart element
     */
    function reapplyPersonalInfoStateImmediately(newChartElement) {
        if (currentPersonalInfoState === 'hide') {
            try {
                const snap = buildPersonalInfoSnapshotFromAdapter();
                if (snap) {
                    originalPersonalInfo._snapshot = JSON.parse(JSON.stringify(snap));
                    hydrateOriginalPersonalInfoFromMeta(extractMetaFromSnapshot(snap));
                } else {
                    console.error('[ziweiConfig] Unable to refresh adapter snapshot while reapplying hide state');
                }
            } catch (snapshotErr) {
                console.error('[ziweiConfig] Failed to refresh snapshot while reapplying hide state', snapshotErr);
            }

            // Get personal info elements from the NEW chart
            const nameEl = newChartElement?.querySelector('.ziwei-name');
            const genderEl = newChartElement?.querySelector('.ziwei-gender-classification');
            const gregDateEl = newChartElement?.querySelector('.ziwei-datetime:not(.ziwei-lunar)');
            const lunarDateEl = newChartElement?.querySelector('.ziwei-datetime.ziwei-lunar');
            
            // Replace with placeholder values (always apply hiding when state is 'hide')
            if (nameEl) {
                nameEl.textContent = '有心人';
            }
            if (genderEl) {
                genderEl.textContent = '沒有';
            }
            if (gregDateEl) {
                gregDateEl.textContent = '西曆：用戶不顯示出生日期';
            }
            if (lunarDateEl) {
                lunarDateEl.textContent = '農曆：用戶不顯示出生日期';
            }
        }
    }

    /**
     * Create and render the settings panel
     * @param {HTMLElement} containerNode Parent element for the settings panel
     * @param {HTMLElement} afterNode Element after which to insert the panel
     * @returns {HTMLElement}
     */
    function createSettingsPanel(containerNode, afterNode) {
        // Remove any existing panels to avoid duplicates
        containerNode.querySelectorAll(SETTINGS_SELECTOR).forEach((existing) => existing.remove());

        const panel = document.createElement('div');
        panel.className = 'ziwei-settings-panel';
        panel.setAttribute('data-role', 'ziwei-settings-panel');

        // Generate settings groups from config
        SETTINGS_CONFIG.forEach(setting => {
            const group = createSettingsGroup(setting.label, setting.name, setting.options);
            panel.appendChild(group);
        });

        // Insert after control bar or at end
        if (afterNode && containerNode.contains(afterNode)) {
            afterNode.insertAdjacentElement('afterend', panel);
        } else {
            containerNode.appendChild(panel);
        }

        return panel;
    }

    /**
     * Replace only the inner chart content (grid and cycle panel) to preserve wrapper/frame size.
     * Falls back to full chart replace when no existing chart wrapper found.
     * @param {HTMLElement} newChartElement Chart wrapper generated by window.ziweiChart.draw()
     * @param {Object} result Calculation result (used to update stored personal info)
     */
    function replaceChartInner(newChartElement, result) {
        try {
            const currentChart = document.querySelector('.ziwei-chart-wrapper');
            if (currentChart) {
                const newGrid = newChartElement.querySelector('.ziwei-4x4-grid');
                const newCycle = newChartElement.querySelector('.ziwei-cycle-panel');
                // Disable fade animation on the new grid for instant swap
                try {
                    if (newGrid) {
                        newGrid.style.transition = 'none';
                        newGrid.style.opacity = '1';
                    }
                } catch (e) {
                    // ignore style setting errors
                }
                const currentGrid = currentChart.querySelector('.ziwei-4x4-grid');
                const currentCycle = currentChart.querySelector('.ziwei-cycle-panel');

                if (newGrid && currentGrid) {
                    currentGrid.replaceWith(newGrid);
                } else if (newGrid && !currentGrid) {
                    currentChart.insertBefore(newGrid, currentChart.firstChild);
                }

                // Ensure the inserted grid shows instantly (no fade)
                try {
                    const insertedGrid = currentChart.querySelector('.ziwei-4x4-grid');
                    if (insertedGrid) {
                        insertedGrid.style.transition = 'none';
                        insertedGrid.style.opacity = '1';
                    }
                } catch (e) {}

                if (newCycle && currentCycle) {
                    currentCycle.replaceWith(newCycle);
                } else if (newCycle && !currentCycle) {
                    currentChart.appendChild(newCycle);
                }

                // Persist chart context into adapter storage (adapter is canonical store)
                try {
                    var __a = window.ziweiAdapter;
                    if (__a && __a.storage && typeof __a.storage.set === 'function') {
                        if (result.normalizedInput) __a.storage.set('normalizedInput', result.normalizedInput);
                        if (result.adapterOutput && result.adapterOutput.raw) __a.storage.set('raw', result.adapterOutput.raw);
                        if (result.adapterOutput && result.adapterOutput.meta) __a.storage.set('meta', result.adapterOutput.meta);
                        if (result.calcResult && result.calcResult.data) __a.storage.set('calcResult', result.calcResult);
                    }
                } catch (e) {}

                // Reapply personal info hiding state and brightness
                if (window.ziweiConfig && typeof window.ziweiConfig.reapplyPersonalInfoStateImmediately === 'function') {
                    window.ziweiConfig.reapplyPersonalInfoStateImmediately(currentChart);
                }
                const brightnessSetting = getAdapterSettingValue('starBrightness');
                if (brightnessSetting && window.ziweiConfig && typeof window.ziweiConfig.applyStarBrightnessChange === 'function') {
                    window.ziweiConfig.applyStarBrightnessChange(brightnessSetting);
                }
                return;
            }

            // Fallback: replace whole chart wrapper or append
            const currentChartEl = document.querySelector('[data-ziwei-chart]');
            if (currentChartEl) {
                currentChartEl.replaceWith(newChartElement);
            } else {
                const container = document.querySelector('.ziwei-cal');
                if (container) container.appendChild(newChartElement);
            }
        } catch (e) {
            console.error('[ziweiConfig] replaceChartInner failed, falling back to full replace', e);
            const currentChartEl = document.querySelector('[data-ziwei-chart]');
            if (currentChartEl) {
                currentChartEl.replaceWith(newChartElement);
            }
        }
    }

    // Expose API
    window.ziweiConfig = {
        getSettingsConfig,
        getSetting,
        applySetting,
        createSettingsGroup,
        createSettingsPanel,
        updateStoredPersonalInfoIfHidden,  // Called BEFORE chart replacement
        reapplyPersonalInfoStateImmediately,  // Called AFTER chart replacement
        // Handlers
        applyStarBrightnessChange,
        applyLeapMonthChange,
        applyZiHourChange,
        applyXunKongChange,
        applyLanguageChange,
        applyPersonalInfoChange
    };
})();
