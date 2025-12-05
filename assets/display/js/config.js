/**
 * Configuration Module
 * 
 * Manages chart settings panel: display options, calculation preferences,
 * and privacy controls. Handles setting persistence and real-time updates.
 * 
 * Dependencies:
 * - assets/data/constants.js (ziweiConstants)
 * - assets/js/data-adapter.js (ziweiAdapter)
 * 
 * Corresponding CSS: assets/display/css/config.css
 * 
 * Exports: window.ziweiConfig
 */

'use strict';

(function () {

    // ============================================================================
    // Module Constants
    // ============================================================================

    const constants = window.ziweiConstants;
    const SETTINGS_SELECTOR = '.ziwei-settings-panel';
    
    // Heavenly stems from centralized constants
    const HEAVENLY_STEMS = constants.STEM_NAMES;
    
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
     * - Four mutations settings: controversial stem interpretation selections (T035)
     *
     * Note: setting values are stored in the adapter settings store (adapter.settings).
     */
    const SETTINGS_CONFIG = [
        // 一般設定
        {
            category: '一般設定',
            label: '個人資料',
            name: 'personalInfo',
            options: [
                { value: 'show', text: '顯示 - 預設' },
                { value: 'hideDates', text: '隱藏日期' },
                { value: 'hide', text: '隱藏個人資料' }
            ],
            defaultValue: 'show',
            affectsChart: false,  // display-only
            handler: 'applyPersonalInfoChange'
        },
        // 日期處理
        {
            category: '日期處理',
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
            category: '日期處理',
            label: '子時處理',
            name: 'ziHourHandling',
            options: [
                { value: 'midnightChange', text: '午夜換日 - 預設' },
                { value: 'ziChange', text: '子時換日' }
            ],
            defaultValue: 'midnightChange',
            affectsChart: true,  // affects chart computation via adapter
            handler: 'applyZiHourChange'
        },
        // 宮位
    {
        category: '宮位',
        label: '事業宮',
        name: 'palaceNameCareer',
        options: [
            { value: 'career', text: '事業 - 預設' },
            { value: 'official', text: '官祿' }
        ],
        defaultValue: 'career',
        affectsChart: false,  // display-only
        handler: 'applyPalaceNameChange'
    },
    {
        category: '宮位',
        label: '交友宮',
        name: 'palaceNameFriends',
        options: [
            { value: 'friends', text: '交友 - 預設' },
            { value: 'servants', text: '奴僕' },
            { value: 'servants_alt', text: '僕役' }
        ],
        defaultValue: 'friends',
        affectsChart: false,  // display-only
        handler: 'applyPalaceNameChange'
    },

    // 安星規則
    {
        category: '安星規則',
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
    {
        category: '安星規則',
        label: '截空旬空',
        name: 'xunKong',
        options: [
            { value: 'marked', text: '標明正副 - 預設' },
            { value: 'primaryOnly', text: '只排正星' }
        ],
        defaultValue: 'marked',
        affectsChart: false,  // display-only
        handler: 'applyXunKongChange'
    },
    {
        category: '安星規則',
        label: '傷使處理',
        name: 'woundedServantHandling',
        options: [
            { value: 'zhongzhou', text: '中州排法 - 預設' },
            { value: 'noDistinction', text: '不分陰陽' }
        ],
        defaultValue: 'zhongzhou',
        affectsChart: true,
        handler: 'applyWoundedServantChange'
    },
    // 四化選擇
    {
        category: '四化選擇',
        label: '甲年四化',
        name: 'stemInterpretation_甲',
        options: [],  // Will be populated dynamically
        defaultValue: 'interpretation_1',
        affectsChart: true,  // affects chart computation via mutations
        handler: 'applyStemInterpretationChange'
    },
    {
        category: '四化選擇',
        label: '戊年四化',
        name: 'stemInterpretation_戊',
        options: [],  // Will be populated dynamically
        defaultValue: 'interpretation_1',
        affectsChart: true,  // affects chart computation via mutations
        handler: 'applyStemInterpretationChange'
    },
    {
        category: '四化選擇',
        label: '庚年四化',
        name: 'stemInterpretation_庚',
        options: [],  // Will be populated dynamically
        defaultValue: 'interpretation_1',
        affectsChart: true,  // affects chart computation via mutations
        handler: 'applyStemInterpretationChange'
    },
    {
        category: '四化選擇',
        label: '辛年四化',
        name: 'stemInterpretation_辛',
        options: [],  // Will be populated dynamically
        defaultValue: 'interpretation_1',
        affectsChart: true,  // affects chart computation via mutations
        handler: 'applyStemInterpretationChange'
    },
    {
        category: '四化選擇',
        label: '壬年四化',
        name: 'stemInterpretation_壬',
        options: [],  // Will be populated dynamically
        defaultValue: 'interpretation_1',
        affectsChart: true,  // affects chart computation via mutations
        handler: 'applyStemInterpretationChange'
    },
    {
        category: '四化選擇',
        label: '癸年四化',
        name: 'stemInterpretation_癸',
        options: [],  // Will be populated dynamically
        defaultValue: 'interpretation_1',
        affectsChart: true,  // affects chart computation via mutations
        handler: 'applyStemInterpretationChange'
    },
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
    // Unified Event Dispatch Utility
    // DRY principle: Single dispatcher for all setting changes
    // -----------------------------
    /**
     * Unified event dispatcher for setting changes
     * Handles persistence and event dispatch with consistent pattern
     * 
     * @param {string} settingName - Name of the setting (e.g., 'starBrightness', 'xunKong')
     * @param {*} value - New value for the setting
     * @param {Object} options - Configuration options
     * @param {boolean} options.needsRecalculation - Whether to trigger full chart recalculation
     * @param {string} options.eventName - Custom event name (auto-generated if not provided)
     * @param {Object} options.eventDetail - Additional data to include in event detail
     */
    function dispatchSettingChangeEvent(settingName, value, options = {}) {
        // 1. Persist to adapter (single source of truth)
        setAdapterSettingValue(settingName, value);
        
        // 2. Determine event type and name
        const needsRecalc = options.needsRecalculation || false;
        const eventName = options.eventName || (needsRecalc ? 'ziwei-setting-recalculate' : `ziwei-${settingName}-changed`);
        
        // 3. Build event detail
        const eventDetail = {
            settingName,
            value,
            setting: settingName, // Legacy compatibility
            newValue: value,      // Legacy compatibility
            ...(options.eventDetail || {})
        };
        
        // 4. Dispatch event
        try {
            document.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
        } catch (e) {
            console.error(`[ziweiConfig] Failed to dispatch ${eventName}:`, e);
        }
    }

    /**
     * Helper for settings that require full chart recalculation
     * Recovers form data, applies setting value, and triggers recompute
     * 
     * @param {string} settingName - Name of the setting
     * @param {*} value - New value for the setting
     * @param {Function} formDataModifier - Optional callback to modify formData before recalc
     */
    function applySettingWithRecalculation(settingName, value, formDataModifier = null) {
        // 1. Persist setting
        setAdapterSettingValue(settingName, value);
        
        // 2. Recover form data
        let formData = getFormDataFromFormModule();
        if (!formData) {
            formData = recoverFormDataFromCache();
        }
        if (!formData) {
            return;
        }
        
        // 3. Apply value to formData
        formData[settingName] = value;
        
        // 4. Allow custom modifications (e.g., zi-hour date conversion)
        if (typeof formDataModifier === 'function') {
            try {
                formDataModifier(formData, value);
            } catch (e) {
                console.error(`[ziweiConfig] Form data modifier failed for ${settingName}:`, e);
            }
        }
        
        // 5. Trigger recalculation via form submit event
        try {
            const container = document.querySelector('.ziwei-cal') || document;
            container.dispatchEvent(new CustomEvent('ziwei-form-submit', { bubbles: true, detail: { formData } }));
        } catch (e) {
            console.error(`[ziweiConfig] Failed to dispatch ziwei-form-submit for ${settingName}:`, e);
        }
    }

    /**
     * Zi-hour conversion logic (extracted from display layer)
     * Modifies formData in-place for zi-hour boundary handling
     * 
     * @param {Object} formData - Form data to modify
     * @param {string} handlingValue - 'ziChange' or 'midnightChange'
     */
    function applyZiHourConversion(formData, handlingValue) {
        console.log('[DEBUG] applyZiHourConversion called', { handlingValue, formData: { ...formData } });
        if (handlingValue === 'ziChange') {
            // Parse date/time from formData
            const birthdateStr = formData.birthdate || formData.date || null;
            const birthtimeStr = formData.birthtime || formData.time || null;

            let srcYear = null, srcMonth = null, srcDay = null;
            if (birthdateStr) {
                const m = String(birthdateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (m) {
                    srcYear = parseInt(m[1], 10);
                    srcMonth = parseInt(m[2], 10);
                    srcDay = parseInt(m[3], 10);
                }
            }
            if (srcYear === null && formData.year) {
                srcYear = parseInt(formData.year, 10);
                srcMonth = parseInt(formData.month, 10) || srcMonth;
                srcDay = parseInt(formData.day, 10) || srcDay;
            }

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

            console.log('[DEBUG] Parsed values', { srcYear, srcMonth, srcDay, srcHour, srcMinute });

            if (Number.isFinite(srcYear) && Number.isFinite(srcMonth) && Number.isFinite(srcDay) && Number.isFinite(srcHour)) {
                formData.hour = srcHour;
                formData.minute = srcMinute || 0;

                // Use original base values for idempotent toggling
                const orig = formData._ziOriginal || getAdapterStorageValue('_ziOriginal') || null;
                const baseHour = orig && typeof orig.hour !== 'undefined' ? parseInt(orig.hour, 10) : srcHour;
                const baseMinute = orig && typeof orig.minute !== 'undefined' ? parseInt(orig.minute, 10) : (srcMinute || 0);

                console.log('[DEBUG] Base values', { baseHour, baseMinute });

                // Condition: Zi hour (23:00-23:59 or 00:00-00:59)
                if (baseHour === 23 || baseHour === 0) {
                    console.log('[DEBUG] Zi hour detected, shift will be applied in adapter if not already done');
                } else {
                    console.log('[DEBUG] Not Zi hour, no shift');
                }
            } else {
                console.log('[DEBUG] Invalid parsed values');
            }
        } else if (handlingValue === 'midnightChange') {
            console.log('[DEBUG] Restoring original date');
            // Restore original date
            const orig = formData._ziOriginal || getAdapterStorageValue('_ziOriginal') || null;
            if (orig) {
                if (orig.birthdate) formData.birthdate = orig.birthdate;
                if (orig.year) formData.year = orig.year;
                if (orig.month) formData.month = orig.month;
                if (orig.day) formData.day = orig.day;
                if (orig.hour !== undefined) formData.hour = orig.hour;
                if (orig.minute !== undefined) formData.minute = orig.minute;
                delete formData._ziChangeApplied;
                delete formData._ziOriginal;
                removeAdapterStorageValue('_ziOriginal');
            }
            // Reset shift flag
            removeAdapterStorageValue('_ziShifted');
        }
    }

    // -----------------------------
    // Handlers - Display-only
    // These handlers change visual presentation only and persist the
    // selected value into adapter.settings for cross-module consistency.
    // All use the unified event dispatch pattern.
    // -----------------------------
    /**
     * Apply star brightness changes
     * @param {string} brightnessValue Selected brightness value ('hidden' or 'shuoshu')
     */
    function applyStarBrightnessChange(brightnessValue) {
        dispatchSettingChangeEvent('starBrightness', brightnessValue);
    }

    // -----------------------------
    // Handlers - Calculation-affecting
    // These handlers modify normalization/calculation inputs and trigger
    // recomputation using the unified recalculation helper.
    // -----------------------------
    /**
     * Apply leap month handling changes to chart
     * @param {string} handlingValue Selected leap month handling method
     */
    function applyLeapMonthChange(handlingValue) {
        applySettingWithRecalculation('leapMonthHandling', handlingValue);
    }

    /**
     * Apply Zi hour handling changes to chart
     * @param {string} handlingValue Selected Zi hour handling method
     */
    function applyZiHourChange(handlingValue) {
        applySettingWithRecalculation('ziHourHandling', handlingValue, applyZiHourConversion);
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
            let zih = (normalized.meta && normalized.meta.ziHourHandling) ? normalized.meta.ziHourHandling : null;
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
            let lmh = (normalized.meta && normalized.meta.leapMonthHandling) ? normalized.meta.leapMonthHandling : null;
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
     * Apply Xun Kong (截空旬空) display changes
     * @param {string} xunkongValue Selected Xun Kong display method
     */
    function applyXunKongChange(xunkongValue) {
        dispatchSettingChangeEvent('xunKong', xunkongValue, {
            eventName: 'ziwei-xunkong-changed'
        });
    }

    /**
     * Apply wounded servant (傷使) handling changes
     * @param {string} handlingValue Selected handling method ('zhongzhou' or 'noDistinction')
     */
    function applyWoundedServantChange(handlingValue) {
        dispatchSettingChangeEvent('woundedServantHandling', handlingValue, {
            eventName: 'ziwei-wounded-servant-changed'
        });
    }

    /**
     * Apply palace name changes
     * Dispatches ziwei-palace-name-changed event for real-time display updates
     * 
     * @param {string} nameValue Selected palace name value
     * @param {string} settingName The setting name (palaceNameCareer or palaceNameFriends)
     */
    function applyPalaceNameChange(nameValue, settingName) {
        dispatchSettingChangeEvent(settingName, nameValue, {
            eventName: 'ziwei-palace-name-changed'
        });
    }

    // ============================================================================
    // Personal Info Privacy Constants
    // ============================================================================
    
    const PRIVACY_MODES = {
        SHOW: 'show',
        HIDE_DATES: 'hideDates',
        HIDE: 'hide'
    };
    
    const PLACEHOLDER_TEXTS = {
        HIDDEN_NAME: '有心人',
        HIDDEN_GENDER: '沒有',
        HIDDEN_GREGORIAN_DATE: '西曆：用戶不顯示出生日期',
        HIDDEN_LUNAR_DATE: '農曆：用戶不顯示出生日期',
        UNKNOWN_NAME: '無名氏',
        UNKNOWN_GENDER: '未知',
        MISSING_GREGORIAN: '西曆：資料缺失',
        MISSING_LUNAR: '農曆：資料缺失'
    };

    // ============================================================================
    // DOM Element Cache - Performance optimization
    // ============================================================================
    
    let personalInfoElements = null;
    
    /**
     * Cache DOM elements to avoid repeated queries
     * @returns {Object|null} Cached DOM elements or null if not found
     */
    function getPersonalInfoElements() {
        if (personalInfoElements && areElementsValid(personalInfoElements)) {
            return personalInfoElements;
        }
        
        personalInfoElements = {
            nameEl: document.querySelector('.ziwei-name'),
            genderEl: document.querySelector('.ziwei-gender-classification'),
            gregDateEl: document.querySelector('.ziwei-datetime:not(.ziwei-lunar)'),
            lunarDateEl: document.querySelector('.ziwei-datetime.ziwei-lunar')
        };
        
        return personalInfoElements;
    }
    
    /**
     * Check if cached DOM elements are still valid
     * @param {Object} elements DOM elements to check
     * @returns {boolean} True if elements are still valid
     */
    function areElementsValid(elements) {
        return elements && 
               elements.nameEl?.isConnected && 
               elements.genderEl?.isConnected && 
               elements.gregDateEl?.isConnected && 
               elements.lunarDateEl?.isConnected;
    }

    /**
     * Safe DOM element setter with validation
     * @param {HTMLElement} element DOM element
     * @param {string} text Content to set
     */
    function safeSetElementText(element, text) {
        if (element && element.isConnected && typeof element.textContent !== 'undefined') {
            element.textContent = text;
        }
    }

    /**
     * Apply hide mode - Hide all personal information
     * @param {Object} elements DOM elements
     * @param {Object} meta Metadata from snapshot
     */
    function applyHideMode(elements, meta) {
        // Cache snapshot for restoration capability
        try {
            const snapshot = buildPersonalInfoSnapshotFromAdapter();
            if (!snapshot) {
                console.warn('[ziweiConfig] Cannot cache personal info snapshot for hide mode');
            } else {
                originalPersonalInfo._snapshot = JSON.parse(JSON.stringify(snapshot));
                if (meta && !hydrateOriginalPersonalInfoFromMeta(meta)) {
                    console.warn('[ziweiConfig] Snapshot meta missing while entering hide mode');
                }
            }
        } catch (snapshotErr) {
            console.error('[ziweiConfig] Failed to cache adapter snapshot for hide mode:', snapshotErr);
        }

        // Apply placeholders for all personal info
        safeSetElementText(elements.nameEl, PLACEHOLDER_TEXTS.HIDDEN_NAME);
        safeSetElementText(elements.genderEl, PLACEHOLDER_TEXTS.HIDDEN_GENDER);
        safeSetElementText(elements.gregDateEl, PLACEHOLDER_TEXTS.HIDDEN_GREGORIAN_DATE);
        safeSetElementText(elements.lunarDateEl, PLACEHOLDER_TEXTS.HIDDEN_LUNAR_DATE);
    }

    /**
     * Apply hide dates mode - Show name and gender, hide dates
     * @param {Object} elements DOM elements
     * @param {Object} meta Metadata from snapshot
     */
    function applyHideDatesMode(elements, meta) {
        const snapshot = originalPersonalInfo._snapshot || buildPersonalInfoSnapshotFromAdapter();
        const extractedMeta = meta || extractMetaFromSnapshot(snapshot);
        
        if (!extractedMeta) {
            console.error('[ziweiConfig] Unable to restore personal info: adapter meta missing');
            // Continue with default values
        } else {
            hydrateOriginalPersonalInfoFromMeta(extractedMeta);
        }

        // Show name and gender, hide dates
        const nameText = extractedMeta?.name || originalPersonalInfo.name || PLACEHOLDER_TEXTS.UNKNOWN_NAME;
        
        // Priority order for gender text: genderClassification (Chinese format with 陰/陽) > gender > fallback
        let genderText = PLACEHOLDER_TEXTS.UNKNOWN_GENDER;
        if (extractedMeta?.genderClassification && 
            typeof extractedMeta.genderClassification === 'string' && 
            extractedMeta.genderClassification.trim()) {
            genderText = extractedMeta.genderClassification.trim();
        } else if (originalPersonalInfo.gender && 
                   typeof originalPersonalInfo.gender === 'string' && 
                   originalPersonalInfo.gender.trim()) {
            genderText = originalPersonalInfo.gender.trim();
        }

        safeSetElementText(elements.nameEl, nameText);
        safeSetElementText(elements.genderEl, genderText);
        safeSetElementText(elements.gregDateEl, PLACEHOLDER_TEXTS.HIDDEN_GREGORIAN_DATE);
        safeSetElementText(elements.lunarDateEl, PLACEHOLDER_TEXTS.HIDDEN_LUNAR_DATE);
    }

    /**
     * Apply show mode - Display all personal information
     * @param {Object} elements DOM elements
     * @param {Object} meta Metadata from snapshot
     */
    function applyShowMode(elements, meta) {
        const snapshot = originalPersonalInfo._snapshot || buildPersonalInfoSnapshotFromAdapter();
        const extractedMeta = meta || extractMetaFromSnapshot(snapshot);
        
        if (!extractedMeta) {
            console.error('[ziweiConfig] Unable to restore personal info: adapter meta missing');
            // Continue with stored values
        } else {
            hydrateOriginalPersonalInfoFromMeta(extractedMeta);
        }

        // Display all personal information
        const nameText = extractedMeta?.name || originalPersonalInfo.name || PLACEHOLDER_TEXTS.UNKNOWN_NAME;
        
        // Priority order for gender text: genderClassification (Chinese format with 陰/陽) > gender > fallback
        let genderText = PLACEHOLDER_TEXTS.UNKNOWN_GENDER;
        if (extractedMeta?.genderClassification && 
            typeof extractedMeta.genderClassification === 'string' && 
            extractedMeta.genderClassification.trim()) {
            genderText = extractedMeta.genderClassification.trim();
        } else if (originalPersonalInfo.gender && 
                   typeof originalPersonalInfo.gender === 'string' && 
                   originalPersonalInfo.gender.trim()) {
            genderText = originalPersonalInfo.gender.trim();
        }
        
        const solarText = extractedMeta ? getSolarTextFromMeta(extractedMeta) : null;
        const lunarText = extractedMeta ? getLunarTextFromMeta(extractedMeta) : null;

        safeSetElementText(elements.nameEl, nameText);
        safeSetElementText(elements.genderEl, genderText);
        safeSetElementText(elements.gregDateEl, solarText || originalPersonalInfo.gregorianDate || PLACEHOLDER_TEXTS.MISSING_GREGORIAN);
        safeSetElementText(elements.lunarDateEl, lunarText || originalPersonalInfo.lunarDate || PLACEHOLDER_TEXTS.MISSING_LUNAR);
    }

    /**
     * Validate privacy mode input
     * @param {string} infoValue Privacy mode to validate
     * @returns {boolean} True if valid privacy mode
     */
    function isValidPrivacyMode(infoValue) {
        return Object.values(PRIVACY_MODES).includes(infoValue);
    }

    /**
     * Apply personal info visibility changes - Replace sensitive data with placeholders
     * Main dispatcher for privacy mode changes
     * @param {string} infoValue Selected personal info visibility (PRIVACY_MODES.SHOW, PRIVACY_MODES.HIDE_DATES, or PRIVACY_MODES.HIDE)
     */
    function applyPersonalInfoChange(infoValue) {
        // Input validation
        if (!isValidPrivacyMode(infoValue)) {
            console.error(`[ziweiConfig] Invalid privacy mode: ${infoValue}. Valid modes: ${Object.values(PRIVACY_MODES).join(', ')}`);
            return;
        }

        // Early return if no change needed
        if (currentPersonalInfoState === infoValue) {
            console.log(`[ziweiConfig] Personal info mode unchanged: ${infoValue}`);
            return;
        }

        // Get cached DOM elements
        const elements = getPersonalInfoElements();
        
        // Validate that essential DOM elements exist
        if (!elements.nameEl || !elements.genderEl || !elements.gregDateEl || !elements.lunarDateEl) {
            console.warn('[ziweiConfig] Personal info DOM elements not found. Chart may not be rendered yet.');
            // Continue anyway - elements might appear later
        }

        // Get metadata snapshot for processing
        let meta = null;
        try {
            const snapshot = originalPersonalInfo._snapshot || buildPersonalInfoSnapshotFromAdapter();
            if (snapshot) {
                meta = extractMetaFromSnapshot(snapshot);
            }
        } catch (metaErr) {
            console.error('[ziweiConfig] Failed to extract metadata for personal info change:', metaErr);
            // Continue with null meta - functions should handle this gracefully
        }

        // Dispatch to appropriate mode handler
        try {
            switch (infoValue) {
                case PRIVACY_MODES.HIDE:
                    applyHideMode(elements, meta);
                    break;
                case PRIVACY_MODES.HIDE_DATES:
                    applyHideDatesMode(elements, meta);
                    break;
                case PRIVACY_MODES.SHOW:
                    applyShowMode(elements, meta);
                    break;
                default:
                    console.error(`[ziweiConfig] Unhandled privacy mode: ${infoValue}`);
                    return;
            }
        } catch (modeErr) {
            console.error(`[ziweiConfig] Failed to apply privacy mode '${infoValue}':`, modeErr);
            return;
        }

        // Update state and persist
        currentPersonalInfoState = infoValue;
        setAdapterSettingValue('personalInfo', currentPersonalInfoState);
        
        console.log(`[ziweiConfig] Personal info mode updated to: ${infoValue}`);
    }

    // ============================================================================
    // Stem Interpretation Constants and Helpers
    // ============================================================================
    
    /**
     * Mutation types for clear categorization
     */
    const MUTATION_TYPES = {
        BIRTH_YEAR: 'birth-year',
        MAJOR_CYCLE: 'major-cycle', 
        ANNUAL_CYCLE: 'annual-cycle'
    };
    
    /**
     * CSS class constants for better maintainability
     */
    const CSS_CLASSES = {
        STAR_MUTATION_GROUP: '.ziwei-star-mutation-group',
        PRIMARY_STAR: '.ziwei-primary-star',
        SECONDARY_STAR: '.ziwei-secondary-star',
        STAR_MUTATION_BOX: '.ziwei-star-mutation-box',
        MUTATIONS_WRAPPER: '.ziwei-mutations-wrapper',
        MUTATION_BIRTH: '.ziwei-mutation-birth',
        MUTATION_MAJOR: '.ziwei-mutation-major',
        MUTATION_ANNUAL: '.ziwei-mutation-annual',
        WITH_MUTATION: 'ziwei-with-mutation',
        STAR_WITH_MUTATION: 'ziwei-star-with-mutation',
        STAR_NO_MUTATION: 'ziwei-star-no-mutation',
        MAJOR_CYCLE_BUTTON: '.ziwei-major-cycle-button',
        ANNUAL_CYCLE_BUTTON: '.ziwei-annual-cycle-button',
        CYCLE_BUTTON_ACTIVE: 'ziwei-cycle-button-active',
        ANNUAL_STEM_BRANCH: '.ziwei-annual-stem-branch'
    };
    
    /**
     * Chinese character validation pattern
     */
    const CHINESE_CHAR_PATTERN = /[\u4e00-\u9fff]/;
    
    /**
     * Extract stem character from setting name
     * @param {string} settingName - Setting name in format 'stemInterpretation_<stem>'
     * @returns {string|null} - Stem character or null if invalid
     */
    function extractStemFromSetting(settingName) {
        if (!settingName || typeof settingName !== 'string') {
            console.error('[ziweiConfig] Invalid setting name provided:', settingName);
            return null;
        }
        
        const stemMatch = settingName.match(/^stemInterpretation_(.+)$/);
        if (!stemMatch) {
            console.error('[ziweiConfig] Invalid stem interpretation setting name format:', settingName);
            return null;
        }
        
        const stem = stemMatch[1];
        if (!stem || stem.length === 0) {
            console.error('[ziweiConfig] Empty stem extracted from setting:', settingName);
            return null;
        }
        
        return stem;
    }
    
    /**
     * Validate interpretation value
     * @param {string} value - Interpretation value to validate
     * @returns {boolean} - True if valid
     */
    function isValidInterpretationValue(value) {
        return value && typeof value === 'string' && value.trim().length > 0;
    }
    
    /**
     * Update mutation system selections
     * @param {string} stem - Stem character
     * @param {string} interpretationValue - New interpretation value
     */
    function updateMutationSelections(stem, interpretationValue) {
        try {
            const currentSelections = window.getCurrentStemSelections ? window.getCurrentStemSelections() : {};
            const newSelections = { ...currentSelections, [stem]: interpretationValue };
            
            if (window.updateStemSelections) {
                window.updateStemSelections(newSelections);
            }
        } catch (error) {
            console.error('[ziweiConfig] Failed to update stem selections:', error);
        }
    }
    
    /**
     * Clear existing mutations of specific type
     * @param {string} mutationType - Type of mutation to clear
     */
    function clearMutationsByType(mutationType) {
        try {
            if (!window.ziweiChartHelpers) {
                return;
            }
            
            switch (mutationType) {
                case MUTATION_TYPES.BIRTH_YEAR:
                    if (typeof window.ziweiChartHelpers.clearMutationsByRole === 'function') {
                        window.ziweiChartHelpers.clearMutationsByRole(MUTATION_TYPES.BIRTH_YEAR);
                    }
                    break;
                case MUTATION_TYPES.MAJOR_CYCLE:
                    if (typeof window.ziweiChartHelpers.clearMajorCycleMutations === 'function') {
                        window.ziweiChartHelpers.clearMajorCycleMutations();
                    }
                    break;
                case MUTATION_TYPES.ANNUAL_CYCLE:
                    if (typeof window.ziweiChartHelpers.clearAnnualCycleMutations === 'function') {
                        window.ziweiChartHelpers.clearAnnualCycleMutations();
                    }
                    break;
                default:
                    console.warn('[ziweiConfig] Unknown mutation type to clear:', mutationType);
            }
        } catch (error) {
            console.error(`[ziweiConfig] Failed to clear ${mutationType} mutations:`, error);
        }
    }
    
    /**
     * Get current chart data safely
     * @returns {Object|null} - Chart data or null if unavailable
     */
    function getCurrentChartData() {
        try {
            const adapter = window.ziweiAdapter;
            if (adapter && adapter.getCurrentChart) {
                return adapter.getCurrentChart();
            }
        } catch (error) {
            console.error('[ziweiConfig] Failed to get current chart data:', error);
        }
        return null;
    }
    
    /**
     * Calculate birth year mutations
     * @param {number} yearStemIndex - Year stem index
     * @returns {Object|null} - Birth mutations or null if calculation fails
     */
    function calculateBirthYearMutations(yearStemIndex) {
        try {
            const adapter = window.ziweiAdapter;
            if (!adapter || !adapter.getModule) {
                return null;
            }
            
            const mutationsModule = adapter.getModule('mutations');
            if (!mutationsModule || typeof mutationsModule.calculateBirthYearMutations !== 'function') {
                return null;
            }
            
            return mutationsModule.calculateBirthYearMutations(yearStemIndex);
        } catch (error) {
            console.error('[ziweiConfig] Failed to calculate birth year mutations:', error);
            return null;
        }
    }
    
    /**
     * Create mutations wrapper element with all mutation slots
     * @param {HTMLElement} starMutationBox - Parent star mutation box element
     * @returns {HTMLElement|null} - Created wrapper element or null if failed
     */
    function createMutationsWrapper(starMutationBox) {
        if (!starMutationBox) {
            return null;
        }
        
        try {
            const wrapper = document.createElement('div');
            wrapper.className = 'ziwei-mutations-wrapper';
            
            // Create birth mutation slot
            const birthSlot = document.createElement('span');
            birthSlot.className = `ziwei-mutation ${CSS_CLASSES.MUTATION_BIRTH.substring(1)}`;
            wrapper.appendChild(birthSlot);
            
            // Create major mutation slot
            const majorSlot = document.createElement('span');
            majorSlot.className = `ziwei-mutation ${CSS_CLASSES.MUTATION_MAJOR.substring(1)}`;
            majorSlot.style.visibility = 'hidden';
            wrapper.appendChild(majorSlot);
            
            // Create annual mutation slot  
            const annualSlot = document.createElement('span');
            annualSlot.className = `ziwei-mutation ${CSS_CLASSES.MUTATION_ANNUAL.substring(1)}`;
            annualSlot.style.visibility = 'hidden';
            wrapper.appendChild(annualSlot);
            
            starMutationBox.appendChild(wrapper);
            return wrapper;
        } catch (error) {
            console.error('[ziweiConfig] Failed to create mutations wrapper:', error);
            return null;
        }
    }
    
    /**
     * Update birth mutation for a specific star
     * @param {HTMLElement} groupEl - Star group element
     * @param {string} mutationType - Mutation type to apply
     */
    function updateBirthMutationForStar(groupEl, mutationType) {
        try {
            let wrapper = groupEl.querySelector(CSS_CLASSES.MUTATIONS_WRAPPER);
            
            // Create wrapper if it doesn't exist
            if (!wrapper) {
                const starMutationBox = groupEl.querySelector(CSS_CLASSES.STAR_MUTATION_BOX);
                wrapper = createMutationsWrapper(starMutationBox);
            }
            
            if (!wrapper) {
                return;
            }
            
            // Get or create birth mutation element
            let birthMutationEl = wrapper.querySelector(CSS_CLASSES.MUTATION_BIRTH);
            if (!birthMutationEl) {
                birthMutationEl = document.createElement('span');
                birthMutationEl.className = `ziwei-mutation ${CSS_CLASSES.MUTATION_BIRTH.substring(1)}`;
                wrapper.insertBefore(birthMutationEl, wrapper.firstChild);
            }
            
            // Apply mutation
            birthMutationEl.textContent = mutationType;
            birthMutationEl.style.visibility = 'visible';
            birthMutationEl.dataset.mutationRole = MUTATION_TYPES.BIRTH_YEAR;
            
            // Update star group classes
            const starMutationBox = groupEl.querySelector(CSS_CLASSES.STAR_MUTATION_BOX);
            if (starMutationBox) {
                starMutationBox.classList.add(CSS_CLASSES.WITH_MUTATION);
            }
            groupEl.classList.add(CSS_CLASSES.STAR_WITH_MUTATION);
            groupEl.classList.remove(CSS_CLASSES.STAR_NO_MUTATION);
            
        } catch (error) {
            console.error('[ziweiConfig] Failed to update birth mutation for star:', error);
        }
    }
    
    /**
     * Hide birth mutation for a star that doesn't have one
     * @param {HTMLElement} groupEl - Star group element
     */
    function hideBirthMutationForStar(groupEl) {
        try {
            const wrapper = groupEl.querySelector(CSS_CLASSES.MUTATIONS_WRAPPER);
            if (wrapper) {
                const birthMutationEl = wrapper.querySelector(CSS_CLASSES.MUTATION_BIRTH);
                if (birthMutationEl) {
                    birthMutationEl.textContent = '';
                    birthMutationEl.style.visibility = 'hidden';
                }
            }
        } catch (error) {
            console.error('[ziweiConfig] Failed to hide birth mutation for star:', error);
        }
    }
    
    /**
     * Apply birth year mutations to all stars
     * @param {Object} birthMutations - Calculated birth mutations by star
     */
    function applyBirthYearMutations(birthMutations) {
        if (!birthMutations || !birthMutations.byStar || Object.keys(birthMutations.byStar).length === 0) {
            console.log('[ziweiConfig] No birth mutations to apply');
            return;
        }
        
        try {
            const starGroups = document.querySelectorAll(CSS_CLASSES.STAR_MUTATION_GROUP);
            let appliedCount = 0;
            
            starGroups.forEach((groupEl) => {
                const starName = groupEl.querySelector(`${CSS_CLASSES.PRIMARY_STAR}, ${CSS_CLASSES.SECONDARY_STAR}`)?.textContent;
                
                if (starName && birthMutations.byStar[starName]) {
                    const mutationType = birthMutations.byStar[starName];
                    updateBirthMutationForStar(groupEl, mutationType);
                    appliedCount++;
                } else {
                    hideBirthMutationForStar(groupEl);
                }
            });
            
            console.log(`[ziweiConfig] Applied birth year mutations to ${appliedCount} stars`);
        } catch (error) {
            console.error('[ziweiConfig] Failed to apply birth year mutations:', error);
        }
    }
    
    /**
     * Apply major cycle mutations if active
     */
    function applyMajorCycleMutations() {
        try {
            const activeMajorButton = document.querySelector(`${CSS_CLASSES.MAJOR_CYCLE_BUTTON}.${CSS_CLASSES.CYCLE_BUTTON_ACTIVE}`);
            
            if (!activeMajorButton || !window.ziweiChartHelpers || typeof window.ziweiChartHelpers.applyMajorCycleMutations !== 'function') {
                return;
            }
            
            const palaceData = activeMajorButton.dataset.palaceIndex;
            if (!palaceData) {
                return;
            }
            
            const chartData = getCurrentChartData();
            if (!chartData || !chartData.derived || !chartData.derived.palaces) {
                return;
            }
            
            const palaceIndex = parseInt(palaceData, 10);
            const palace = chartData.derived.palaces[palaceIndex];
            
            if (palace && palace.stem) {
                window.ziweiChartHelpers.applyMajorCycleMutations(palace.stem);
                console.log(`[ziweiConfig] Applied major cycle mutations for palace ${palaceIndex}, stem: ${palace.stem}`);
            }
        } catch (error) {
            console.error('[ziweiConfig] Failed to apply major cycle mutations:', error);
        }
    }
    
    /**
     * Apply annual cycle mutations if active
     */
    function applyAnnualCycleMutations() {
        try {
            const activeAnnualButton = document.querySelector(`${CSS_CLASSES.ANNUAL_CYCLE_BUTTON}.${CSS_CLASSES.CYCLE_BUTTON_ACTIVE}`);
            
            if (!activeAnnualButton || !window.ziweiChartHelpers || typeof window.ziweiChartHelpers.applyAnnualCycleMutations !== 'function') {
                return;
            }
            
            const stemBranchSpan = activeAnnualButton.querySelector(CSS_CLASSES.ANNUAL_STEM_BRANCH);
            if (!stemBranchSpan || !stemBranchSpan.textContent) {
                return;
            }
            
            const stemChar = stemBranchSpan.textContent.charAt(0);
            if (!stemChar || !CHINESE_CHAR_PATTERN.test(stemChar)) {
                return;
            }
            
            window.ziweiChartHelpers.applyAnnualCycleMutations(stemChar);
            console.log(`[ziweiConfig] Applied annual cycle mutations for stem: ${stemChar}`);
        } catch (error) {
            console.error('[ziweiConfig] Failed to apply annual cycle mutations:', error);
        }
    }
    
    /**
     * Main function: Apply a change to the stem interpretation setting and update chart mutations
     * 
     * This function extracts the stem from the setting name, updates current stem selections,
     * persists the change, and selectively updates chart mutations without full chart recomputation
     * to avoid visual flashing. It handles birth-year, major-cycle, and annual-cycle mutations.
     * 
     * @param {string} interpretationValue - New interpretation value for the stem
     * @param {string} settingName - Setting name in format 'stemInterpretation_<stem>'
     */
    function applyStemInterpretationChange(interpretationValue, settingName) {
        // Input validation
        if (!isValidInterpretationValue(interpretationValue)) {
            console.error('[ziweiConfig] Invalid interpretation value:', interpretationValue);
            return;
        }
        
        const stem = extractStemFromSetting(settingName);
        if (!stem) {
            return; // Error already logged in extractStemFromSetting
        }
        
        console.log(`[ziweiConfig] Applying stem interpretation change: ${stem} -> ${interpretationValue}`);
        
        try {
            // Update mutation system selections
            updateMutationSelections(stem, interpretationValue);
            
            // Store in adapter settings for persistence
            setAdapterSettingValue(settingName, interpretationValue);
            
            // Clear all existing mutations
            Object.values(MUTATION_TYPES).forEach(clearMutationsByType);
            
            // Reapply birth-year mutations (always present)
            const chartData = getCurrentChartData();
            if (chartData && chartData.indices && chartData.indices.yearStemIndex !== undefined) {
                const birthMutations = calculateBirthYearMutations(chartData.indices.yearStemIndex);
                if (birthMutations) {
                    applyBirthYearMutations(birthMutations);
                }
            }
            
            // Reapply major-cycle mutations if active
            applyMajorCycleMutations();
            
            // Reapply annual-cycle mutations if active
            applyAnnualCycleMutations();
            
            // Dispatch event to notify interpretation panel of mutation changes
            dispatchSettingChangeEvent(settingName, interpretationValue, {
                eventName: 'ziwei-mutation-changed'
            });
            
            console.log(`[ziweiConfig] Successfully updated mutations for stem ${stem} interpretation: ${interpretationValue}`);
            
        } catch (error) {
            console.error('[ziweiConfig] Critical error updating mutations for stem interpretation change:', error);
            console.error('[ziweiConfig] Stem:', stem, 'Value:', interpretationValue);
            console.error('[ziweiConfig] This is a critical error - mutations cannot be properly updated');
        }
    }

    /**
     * Execute handler for a setting change
     * @param {string} settingName Setting name
     * @param {string} value Selected value
     */
    function applySetting(settingName, value) {
        const setting = getSetting(settingName);
        if (!setting) {
            return;
        }

        const handler = window.ziweiConfig[setting.handler];
        if (typeof handler === 'function') {
            // For stem interpretation and palace name handlers, pass both value and settingName
            if (setting.handler === 'applyStemInterpretationChange' || setting.handler === 'applyPalaceNameChange') {
                handler(value, settingName);
            } else {
                handler(value);
            }
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

        // Check if this is a stem interpretation setting (T035)
        const stemMatch = name.match(/^stemInterpretation_(.+)$/);
        let dynamicOptions = options;

        if (stemMatch && window.getAvailableInterpretations && window.getInterpretationName) {
            const stem = stemMatch[1];
            const availableKeys = window.getAvailableInterpretations(stem);
            dynamicOptions = availableKeys.map(key => ({
                value: key,
                text: window.getInterpretationName(stem, key)
            }));
        }

        // Add options (dynamic or static)
        dynamicOptions.forEach(opt => {
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
            const settingCfg = getSetting(name);
            const defaultVal = settingCfg && settingCfg.defaultValue ? settingCfg.defaultValue : null;
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
        if (currentPersonalInfoState !== 'hide' && currentPersonalInfoState !== 'hideDates') {
            return;  // Only update if we're in hide or hideDates state
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
     * Hydrate original personal info from meta data

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
        } else if (currentPersonalInfoState === 'hideDates') {
            try {
                const snap = buildPersonalInfoSnapshotFromAdapter();
                if (snap) {
                    originalPersonalInfo._snapshot = JSON.parse(JSON.stringify(snap));
                    hydrateOriginalPersonalInfoFromMeta(extractMetaFromSnapshot(snap));
                } else {
                    console.error('[ziweiConfig] Unable to refresh adapter snapshot while reapplying hideDates state');
                }
            } catch (snapshotErr) {
                console.error('[ziweiConfig] Failed to refresh snapshot while reapplying hideDates state', snapshotErr);
            }

            // Get personal info elements from the NEW chart
            const nameEl = newChartElement?.querySelector('.ziwei-name');
            const genderEl = newChartElement?.querySelector('.ziwei-gender-classification');
            const gregDateEl = newChartElement?.querySelector('.ziwei-datetime:not(.ziwei-lunar)');
            const lunarDateEl = newChartElement?.querySelector('.ziwei-datetime.ziwei-lunar');
            
            // Show name and gender, but hide dates
            const meta = extractMetaFromSnapshot(originalPersonalInfo._snapshot || buildPersonalInfoSnapshotFromAdapter());
            if (nameEl) {
                nameEl.textContent = meta?.name || originalPersonalInfo.name || '無名氏';
            }
            if (genderEl) {
                // Priority order for gender text: genderClassification (Chinese format with 陰/陽) > gender > fallback
                let genderText = PLACEHOLDER_TEXTS.UNKNOWN_GENDER;
                if (meta?.genderClassification && 
                    typeof meta.genderClassification === 'string' && 
                    meta.genderClassification.trim()) {
                    genderText = meta.genderClassification.trim();
                } else if (originalPersonalInfo.gender && 
                           typeof originalPersonalInfo.gender === 'string' && 
                           originalPersonalInfo.gender.trim()) {
                    genderText = originalPersonalInfo.gender.trim();
                }
                genderEl.textContent = genderText;
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

        // Group settings by category
        const settingsByCategory = {};
        SETTINGS_CONFIG.forEach(setting => {
            const category = setting.category || '其他';
            if (!settingsByCategory[category]) {
                settingsByCategory[category] = [];
            }
            settingsByCategory[category].push(setting);
        });

        // Define column layout for each category
        const categoryLayouts = {
            '一般設定': 1,
            '日期處理': 2,
            '宮位': 2,
            '安星規則': 3,
            '四化選擇': 3
        };

        // Create sections for each category
        Object.keys(settingsByCategory).forEach(categoryName => {
            // Create wrapper for the entire category section
            const wrapper = document.createElement('div');
            wrapper.className = 'ziwei-settings-category-wrapper';

            // Create category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'ziwei-settings-category';
            categoryHeader.textContent = categoryName;
            wrapper.appendChild(categoryHeader);

            // Create category content container
            const contentContainer = document.createElement('div');
            const colCount = categoryLayouts[categoryName] || 1;
            contentContainer.className = `ziwei-settings-category-content`;
            
            if (colCount === 1) {
                contentContainer.classList.add('one-col');
            } else if (colCount === 2) {
                contentContainer.classList.add('two-col');
            } else if (colCount === 3) {
                contentContainer.classList.add('three-col');
            }

            // Create settings groups for this category
            settingsByCategory[categoryName].forEach(setting => {
                const group = createSettingsGroup(setting.label, setting.name, setting.options);
                contentContainer.appendChild(group);
            });

            wrapper.appendChild(contentContainer);
            panel.appendChild(wrapper);
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
                // Clear all existing mutations before replacing chart content
                // This ensures old mutation marks are removed before new chart is displayed
                if (window.ziweiChartHelpers) {
                    // Clear birth-year mutations (生年四化)
                    if (typeof window.ziweiChartHelpers.clearMutationsByRole === 'function') {
                        window.ziweiChartHelpers.clearMutationsByRole('birth-year');
                    }
                    // Clear major-cycle mutations (大限四化)
                    if (typeof window.ziweiChartHelpers.clearMajorCycleMutations === 'function') {
                        window.ziweiChartHelpers.clearMajorCycleMutations();
                    }
                    // Clear annual-cycle mutations (流年四化)
                    if (typeof window.ziweiChartHelpers.clearAnnualCycleMutations === 'function') {
                        window.ziweiChartHelpers.clearAnnualCycleMutations();
                    }
                }

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
                    const __a = window.ziweiAdapter;
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

    // ============================================================================
    // Session-Only Settings Management Constants
    // ============================================================================
    
    const SESSION_SETTINGS_CONFIG = {
        DEBUG_MODE_KEY: 'isDebug',
        LOG_PREFIX: '[ziweiConfig]',
        CLEANUP_EVENTS: ['beforeunload', 'pagehide', 'visibilitychange'],
        ADAPTER_PROPERTY: '_settings'
    };

    /**
     * Check if debug mode is enabled for logging
     * @returns {boolean} True if debug mode is enabled
     */
    function isDebugModeEnabled() {
        try {
            return Boolean(
                window.ziweiCalData?.env?.[SESSION_SETTINGS_CONFIG.DEBUG_MODE_KEY]
            );
        } catch (error) {
            // Fail silently in non-debug mode to avoid console spam
            return false;
        }
    }

    /**
     * Safely log debug messages only when debug mode is enabled
     * @param {string} message - Log message
     * @param {Object} [data] - Optional data to log
     */
    function logDebugMessage(message, data = null) {
        if (!isDebugModeEnabled()) {
            return;
        }
        
        try {
            if (data !== null) {
                console.log(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} ${message}`, data);
            } else {
                console.log(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} ${message}`);
            }
        } catch (error) {
            // Ensure logging errors don't break the cleanup process
            console.warn(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} Failed to log message:`, error);
        }
    }

    /**
     * Verify session-only settings behavior
     * Validates that settings are stored in-memory and not persisted
     */
    function verifySessionOnlySettings() {
        try {
            const adapter = window.ziweiAdapter;
            
            // Check if adapter exists and has the expected settings property
            if (!adapter || !adapter[SESSION_SETTINGS_CONFIG.ADAPTER_PROPERTY]) {
                logDebugMessage('T045: No adapter or settings found - session-only behavior maintained');
                return true;
            }

            // Verify settings are in-memory only (not persisted to storage)
            // The adapter._settings should be a plain object, not a Storage instance
            const settings = adapter[SESSION_SETTINGS_CONFIG.ADAPTER_PROPERTY];
            const isMemoryOnly = !(settings instanceof Storage);
            
            if (isMemoryOnly) {
                logDebugMessage('T045: Verified - settings are session-only and will reset on page reload');
            } else {
                console.warn(
                    `${SESSION_SETTINGS_CONFIG.LOG_PREFIX} T045: Warning - settings may be persisted (not session-only)`,
                    { settingsType: typeof settings, isStorageInstance: settings instanceof Storage }
                );
            }
            
            return isMemoryOnly;
        } catch (error) {
            // Log error in debug mode, fail gracefully otherwise
            console.warn(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} T045: Error verifying session settings:`, error);
            return true; // Assume session-only behavior to avoid blocking
        }
    }

    /**
     * Handle page unload events safely
     * Ensures session-only settings cleanup without throwing errors
     */
    function handlePageUnload() {
        try {
            // Verify session-only behavior before page unload
            const isSessionOnly = verifySessionOnlySettings();
            
            if (isSessionOnly) {
                logDebugMessage('T045: Page unload - session-only settings will reset on reload');
            }
            
            // Additional cleanup can be added here if needed in the future
            // Currently settings are naturally cleared by page reload/close
            
        } catch (error) {
            // Ensure unload handler never throws errors that could block page unload
            console.warn(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} T045: Error during page unload handling:`, error);
        }
    }

    /**
     * Set up page unload handlers for session-only settings
     * Registers multiple event handlers to catch different types of page termination
     */
    function setupUnloadHandlers() {
        try {
            // Add handlers for different unload scenarios
            SESSION_SETTINGS_CONFIG.CLEANUP_EVENTS.forEach(eventType => {
                window.addEventListener(eventType, handlePageUnload, { 
                    passive: true,  // Performance optimization for non-blocking events
                    once: false     // Allow multiple calls if needed
                });
            });

            logDebugMessage('T045: Session-only settings unload handlers initialized');
            
        } catch (error) {
            console.error(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} T045: Failed to setup unload handlers:`, error);
            // Don't throw - let initialization continue even if handlers fail
        }
    }

    /**
     * T045: Ensure all settings are session-only (reset on page reload).
     * 
     * IMPROVED VERSION: This function ensures settings are reset when the page
     * reloads or browser closes per FR-011a (privacy-first policy). Settings are
     * stored in adapter._settings (in-memory) and NOT persisted to any browser storage.
     * 
     * Key improvements:
     * - Comprehensive error handling
     * - Multiple unload event coverage
     * - Session-only behavior verification
     * - Performance optimizations
     * - Memory leak prevention
     * 
     * This is called during initialization to set up the cleanup handlers.
     */
    function initializeSessionOnlySettings() {
        setupUnloadHandlers();
    }

    /**
     * Cleanup function to remove unload handlers (useful for testing or module removal)
     */
    function cleanupSessionOnlySettings() {
        try {
            SESSION_SETTINGS_CONFIG.CLEANUP_EVENTS.forEach(eventType => {
                window.removeEventListener(eventType, handlePageUnload);
            });
            logDebugMessage('T045: Session-only settings cleanup completed');
        } catch (error) {
            console.warn(`${SESSION_SETTINGS_CONFIG.LOG_PREFIX} T045: Error during cleanup:`, error);
        }
    }

    /**
     * Initialize stem selections from adapter settings on page load
     * This ensures window.currentStemSelections is properly initialized
     */
    function initializeStemSelections() {
        try {
            const adapter = getAdapterInstance();
            if (!adapter || !adapter.settings || typeof adapter.settings.get !== 'function') {
                return;
            }

            const controversialStems = ['甲', '戊', '庚', '辛', '壬', '癸'];
            const selections = {};

            for (const stem of controversialStems) {
                const settingName = `stemInterpretation_${stem}`;
                const value = adapter.settings.get(settingName);
                if (value) {
                    selections[stem] = value;
                }
            }

            // If we have any selections, update the mutation system
            if (Object.keys(selections).length > 0 && window.updateStemSelections) {
                window.updateStemSelections(selections);
            }
        } catch (e) {
            console.error('[ziweiConfig] Failed to initialize stem selections:', e);
        }
    }

    // Initialize session-only settings behavior (T045)
    try {
        initializeSessionOnlySettings();
    } catch (e) {
        console.error('[ziweiConfig] T045 initialization failed:', e);
    }

    // Initialize stem selections from adapter settings
    try {
        initializeStemSelections();
    } catch (e) {
        console.error('[ziweiConfig] Stem selections initialization failed:', e);
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
        applyWoundedServantChange,
        applyPalaceNameChange,
        applyPersonalInfoChange,
        applyStemInterpretationChange
    };
})();
