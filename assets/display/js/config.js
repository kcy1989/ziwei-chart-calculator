'use strict';

/**
 * Configuration module for Ziwei chart settings
 * Handles: settings panel generation, option display logic, and chart computation effects
 * 
 * Corresponding CSS: assets/display/css/config.css
 */
(function () {
    const SETTINGS_SELECTOR = '.ziwei-settings-panel';
    
    // Heavenly stems for mutation calculations
    const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    
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
        // 宮位名稱
    {
        category: '宮位名稱',
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
        category: '宮位名稱',
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
            console.warn(`[ziweiConfig] Cannot recalculate for ${settingName}: form data unavailable`);
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
            container.dispatchEvent(new CustomEvent('ziwei-form-submit', { detail: { formData } }));
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

            if (Number.isFinite(srcYear) && Number.isFinite(srcMonth) && Number.isFinite(srcDay) && Number.isFinite(srcHour)) {
                formData.hour = srcHour;
                formData.minute = srcMinute || 0;

                // Use original base values for idempotent toggling
                const orig = formData._ziOriginal || getAdapterStorageValue('_ziOriginal') || null;
                const baseHour = orig && typeof orig.hour !== 'undefined' ? parseInt(orig.hour, 10) : srcHour;
                const baseMinute = orig && typeof orig.minute !== 'undefined' ? parseInt(orig.minute, 10) : (srcMinute || 0);

                // Condition: 23:00-23:55 (zi-hour boundary)
                if (baseHour === 23 && baseMinute >= 0 && baseMinute <= 55) {
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

                    // Mark for lunar shift (adapter handles conversion)
                    formData._ziChangeApplied = true;
                    formData._ziLunarShiftDays = 1;
                }
            }
        } else if (handlingValue === 'midnightChange') {
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
        } else if (infoValue === 'hideDates') {
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
                gregDateEl.textContent = '西曆：用戶不顯示出生日期';
            }
            if (lunarDateEl) {
                lunarDateEl.textContent = '農曆：用戶不顯示出生日期';
            }
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

    function applyStemInterpretationChange(interpretationValue, settingName) {
        // Extract stem from setting name (e.g., 'stemInterpretation_甲' -> '甲')
        const stemMatch = settingName.match(/^stemInterpretation_(.+)$/);
        if (!stemMatch) {
            console.error('[ziweiConfig] Invalid stem interpretation setting name:', settingName);
            return;
        }
        const stem = stemMatch[1];

        // Get current selections and update the specific stem
        const currentSelections = window.getCurrentStemSelections ? window.getCurrentStemSelections() : {};
        const newSelections = { ...currentSelections, [stem]: interpretationValue };

        // Update mutation system selections
        if (window.updateStemSelections) {
            window.updateStemSelections(newSelections);
        }

        // Store in adapter settings for persistence
        setAdapterSettingValue(settingName, interpretationValue);

        // Instead of recomputing the entire chart, just update the mutation marks
        // This prevents the flashing issue when switching mutation settings

        try {
            // Clear all existing mutations
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

            // Reapply birth-year mutations (always present) - recalculate with current settings
            // This ensures mutations always reflect the latest user selections
            const adapter = window.ziweiAdapter;
            if (adapter && adapter.getCurrentChart) {
                const chartData = adapter.getCurrentChart();
                if (chartData && chartData.indices && chartData.indices.yearStemIndex !== undefined) {
                    // Always recalculate birth year mutations with current settings
                    // This ensures they reflect the latest user selections
                    const mutationsModule = adapter.getModule ? adapter.getModule('mutations') : null;
                    if (mutationsModule && typeof mutationsModule.calculateBirthYearMutations === 'function') {
                        const currentBirthMutations = mutationsModule.calculateBirthYearMutations(chartData.indices.yearStemIndex);

                        if (currentBirthMutations && currentBirthMutations.byStar && Object.keys(currentBirthMutations.byStar).length > 0) {
                            // Apply the recalculated birth year mutations to existing elements
                            const starGroups = document.querySelectorAll('.ziwei-star-mutation-group');
                            let appliedCount = 0;
                            starGroups.forEach((groupEl) => {
                                const starName = groupEl.querySelector('.ziwei-primary-star, .ziwei-secondary-star')?.textContent;
                                if (starName && currentBirthMutations.byStar[starName]) {
                                    const mutationType = currentBirthMutations.byStar[starName];
                                    
                                    // Ensure mutations wrapper exists (it may have been removed by clearMutationsByRole)
                                    let wrapper = groupEl.querySelector('.ziwei-mutations-wrapper');
                                    if (!wrapper) {
                                        const starMutationBox = groupEl.querySelector('.ziwei-star-mutation-box');
                                        if (starMutationBox) {
                                            wrapper = document.createElement('div');
                                            wrapper.className = 'ziwei-mutations-wrapper';
                                            
                                            // Create all three mutation slots
                                            const birthSlot = document.createElement('span');
                                            birthSlot.className = 'ziwei-mutation ziwei-mutation-birth';
                                            wrapper.appendChild(birthSlot);
                                            
                                            const majorSlot = document.createElement('span');
                                            majorSlot.className = 'ziwei-mutation ziwei-mutation-major';
                                            majorSlot.style.visibility = 'hidden';
                                            wrapper.appendChild(majorSlot);
                                            
                                            const annualSlot = document.createElement('span');
                                            annualSlot.className = 'ziwei-mutation ziwei-mutation-annual';
                                            annualSlot.style.visibility = 'hidden';
                                            wrapper.appendChild(annualSlot);
                                            
                                            starMutationBox.appendChild(wrapper);
                                        }
                                    }
                                    
                                    if (wrapper) {
                                        let birthMutationEl = wrapper.querySelector('.ziwei-mutation-birth');
                                        if (!birthMutationEl) {
                                            birthMutationEl = document.createElement('span');
                                            birthMutationEl.className = 'ziwei-mutation ziwei-mutation-birth';
                                            wrapper.insertBefore(birthMutationEl, wrapper.firstChild);
                                        }
                                        
                                        if (birthMutationEl) {
                                            birthMutationEl.textContent = mutationType;
                                            birthMutationEl.style.visibility = 'visible';
                                            birthMutationEl.dataset.mutationRole = 'birth-year';

                                            const starMutationBox = groupEl.querySelector('.ziwei-star-mutation-box');
                                            if (starMutationBox) {
                                                starMutationBox.classList.add('ziwei-with-mutation');
                                            }
                                            groupEl.classList.add('ziwei-star-with-mutation');
                                            groupEl.classList.remove('ziwei-star-no-mutation');
                                            appliedCount++;
                                        }
                                    } else {
                                        console.warn(`[ziweiConfig] Could not create mutations wrapper for "${starName}"`);
                                    }
                                } else {
                                    // If this star doesn't have a birth mutation, hide the birth mutation element
                                    const wrapper = groupEl.querySelector('.ziwei-mutations-wrapper');
                                    if (wrapper) {
                                        const birthMutationEl = wrapper.querySelector('.ziwei-mutation-birth');
                                        if (birthMutationEl) {
                                            birthMutationEl.textContent = '';
                                            birthMutationEl.style.visibility = 'hidden';
                                        }
                                    }
                                }
                            });
                            console.log(`[ziweiConfig] Applied ${appliedCount} birth year mutations`);
                        } else {
                            console.warn('[ziweiConfig] No birth year mutations calculated or empty result');
                        }
                    } else {
                        console.warn('[ziweiConfig] Mutations module not available');
                    }
                } else {
                    console.warn('[ziweiConfig] Chart data or year stem index not available');
                }
            } else {
                console.warn('[ziweiConfig] Adapter not available');
            }

            // Reapply major-cycle mutations if a major cycle is currently selected
            const activeMajorButton = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
            if (activeMajorButton && window.ziweiChartHelpers && typeof window.ziweiChartHelpers.applyMajorCycleMutations === 'function') {
                // Get the stem from the active major cycle palace
                const palaceData = activeMajorButton.dataset.palaceIndex;
                if (palaceData) {
                    const adapter = window.ziweiAdapter;
                    if (adapter && adapter.getCurrentChart) {
                        const chartData = adapter.getCurrentChart();
                        if (chartData && chartData.derived && chartData.derived.palaces) {
                            const palaceIndex = parseInt(palaceData, 10);
                            const palace = chartData.derived.palaces[palaceIndex];
                            if (palace && palace.stem) {
                                window.ziweiChartHelpers.applyMajorCycleMutations(palace.stem);
                            }
                        }
                    }
                }
            }

            // Reapply annual-cycle mutations if an annual cycle is currently selected
            const activeAnnualButton = document.querySelector('.ziwei-annual-cycle-button.ziwei-cycle-button-active');
            if (activeAnnualButton && window.ziweiChartHelpers && typeof window.ziweiChartHelpers.applyAnnualCycleMutations === 'function') {
                // Get the stem from the active annual cycle button's stem-branch text
                const stemBranchSpan = activeAnnualButton.querySelector('.ziwei-annual-stem-branch');
                let stemChar = null;
                if (stemBranchSpan && stemBranchSpan.textContent) {
                    stemChar = stemBranchSpan.textContent.charAt(0);
                }
                if (stemChar && stemChar.match(/[\u4e00-\u9fff]/)) { // Check if it's a Chinese character
                    window.ziweiChartHelpers.applyAnnualCycleMutations(stemChar);
                }
            }

        } catch (e) {
            console.error('[ziweiConfig] Failed to update mutations:', e);
            console.error('[ziweiConfig] This is a critical error - mutations cannot be updated');
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
            console.warn('[ziweiConfig] Setting not found:', settingName);
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
                const genderText = meta?.genderClassification || meta?.gender || originalPersonalInfo.gender || '';
                genderEl.textContent = genderText || '未知';
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
            '安星規則': 3,
            '四化選擇': 3,
            '宮位名稱': 2
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

    /**
     * T045: Ensure all settings are session-only (reset on page reload).
     * Settings are stored in adapter._settings (in-memory) and NOT persisted to
     * localStorage/sessionStorage. This function ensures settings are reset when
     * the page reloads or browser closes per FR-011a (privacy-first policy).
     * 
     * This is called during initialization to set up the beforeunload handler.
     */
    function initializeSessionOnlySettings() {
        // Settings are in-memory only per adapter design (see data-adapter.js)
        // adapter._settings is NOT persisted to any browser storage
        // Adding beforeunload handler as defensive measure to explicitly clear settings
        window.addEventListener('beforeunload', function() {
            // Note: Settings will be cleared naturally when page reloads
            // This is defensive verification to ensure session-only behavior
            const adapter = window.ziweiAdapter;
            if (adapter && adapter._settings) {
                // Settings are in-memory; will be garbage collected on page reload
                // No explicit cleanup needed as adapter._settings is not persisted
                if (window.ziweiCalData && window.ziweiCalData.env && window.ziweiCalData.env.isDebug) {
                    console.log('[ziweiConfig] T045: Page unload - settings will reset on reload');
                }
            }
        });
    }

    /**
     * Initialize stem selections from adapter settings on page load
     * This ensures window.currentStemSelections is properly initialized
     */
    function initializeStemSelections() {
        try {
            const adapter = getAdapterInstance();
            if (!adapter || !adapter.settings || typeof adapter.settings.get !== 'function') {
                console.warn('[ziweiConfig] Adapter not available for stem selection initialization');
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
                console.log('[ziweiConfig] Initialized stem selections from adapter settings:', selections);
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
