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
    
    // Track current personal info privacy state to persist across chart redraws
    // Initialize from sessionStorage if available, otherwise default to 'show'
    let currentPersonalInfoState = (() => {
        if (typeof sessionStorage !== 'undefined') {
            const stored = sessionStorage.getItem('ziweiSetting_personalInfo');
            if (stored) {
                console.log('[ziweiConfig] Restored personal info state from sessionStorage:', stored);
                return stored;
            }
        }
        return 'show';
    })();

    /**
     * Settings configuration data
     * Each setting defines: label, name, options, and optional computation logic
     *
     * === 設定分類說明 ===
     * 1. 星曜顯示（chart 顯示層）
     *    - starBrightness: 星曜亮度顯示（只影響 chart 顯示）
     *    - xunKong: 截空旬空顯示（只影響 chart 顯示）
     * 2. 命盤計算（adapter 層/後端 API）
     *    - leapMonthHandling: 閏月處理（影響命盤計算）
     *    - ziHourHandling: 子時處理（影響命盤計算）
     * 3. 介面語言（UI 顯示層）
     *    - language: 介面語言（只影響 UI 顯示）
     * 4. 個人資料隱私（UI 顯示層）
     *    - personalInfo: 個人資料顯示/隱藏（只影響 UI 顯示）
     */
    const SETTINGS_CONFIG = [
        // 1. 星曜顯示（chart 顯示層）
        {
            label: '星曜亮度',
            name: 'starBrightness',
            options: [
                { value: 'hidden', text: '不顯示 - 預設' },
                { value: 'shuoshu', text: '斗數全書' }
            ],
            defaultValue: 'hidden',
            affectsChart: false,  // 只影響顯示
            handler: 'applyStarBrightnessChange'
        },
        // 2. 命盤計算（adapter 層/後端 API）
        {
            label: '閏月處理',
            name: 'leapMonthHandling',
            options: [
                { value: 'monthMid', text: '月中換月 - 預設' },
                { value: 'currentMonth', text: '視為本月 (開發中)' },
                { value: 'nextMonth', text: '視為下月 (開發中)' }
            ],
            defaultValue: 'monthMid',
            affectsChart: true,  // 影響命盤計算
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
            affectsChart: true,  // 影響命盤計算
            handler: 'applyZiHourChange'
        },
        // 1. 星曜顯示（chart 顯示層）
        {
            label: '截空旬空',
            name: 'xunKong',
            options: [
                { value: 'noDistinct', text: '不論正副 - 預設' },
                { value: 'marked', text: '標明正副 (開發中)' },
                { value: 'primaryOnly', text: '只排正星 (開發中)' }
            ],
            defaultValue: 'noDistinct',
            affectsChart: false,  // 只影響顯示
            handler: 'applyXunKongChange'
        },
        // 3. 介面語言（UI 顯示層）
        {
            label: '介面語言',
            name: 'language',
            options: [
                { value: 'zh-hant', text: '繁體中文 - 預設' },
                { value: 'zh-hans', text: '簡体中文 (開發中)' }
            ],
            defaultValue: 'zh-hant',
            affectsChart: false,  // 只影響顯示
            handler: 'applyLanguageChange'
        },
        // 4. 個人資料隱私（UI 顯示層）
        {
            label: '個人資料',
            name: 'personalInfo',
            options: [
                { value: 'show', text: '顯示 - 預設' },
                { value: 'hide', text: '隱藏' }
            ],
            defaultValue: 'show',
            affectsChart: false,  // 只影響顯示
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
        
        // Store in sessionStorage for persistence within this session
        // (reloading page will clear it, but back button will preserve it)
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('ziweiStarBrightness', brightnessValue);
        }
    }

    /**
     * Apply leap month handling changes to chart
     * @param {string} handlingValue Selected leap month handling method
     */
    function applyLeapMonthChange(handlingValue) {
        console.log('[ziweiConfig] Applying leap month handling change:', handlingValue);
        // TODO: Trigger chart recalculation with new leap month logic
    }

    /**
     * Apply Zi hour handling changes to chart
     * @param {string} handlingValue Selected Zi hour handling method
     */
    function applyZiHourChange(handlingValue) {
        console.log('[ziweiConfig] Applying Zi hour handling change:', handlingValue);
        // TODO: Trigger chart recalculation with new Zi hour logic
    }

    /**
     * Apply language changes to interface
     * @param {string} languageValue Selected language code (zh-hant or zh-hans)
     */
    function applyLanguageChange(languageValue) {
        console.log('[ziweiConfig] Applying language change:', languageValue);
        document.documentElement.lang = languageValue;
        document.documentElement.setAttribute('data-language', languageValue);
        // Store in localStorage for persistence
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ziweiLanguage', languageValue);
        }
    }

    /**
     * Apply Xun Kong (截空旬空) display changes
     * @param {string} xunkongValue Selected Xun Kong display method
     */
    function applyXunKongChange(xunkongValue) {
        console.log('[ziweiConfig] Applying Xun Kong change:', xunkongValue);
        const chart = _elementCache.chartElement || document.querySelector('[data-ziwei-chart]');
        if (chart) {
            chart.setAttribute('data-xun-kong', xunkongValue);
        }
    }

    /**
     * Apply personal info visibility changes - Replace sensitive data with placeholders
     * @param {string} infoValue Selected personal info visibility ('show' or 'hide')
     */
    function applyPersonalInfoChange(infoValue) {
        console.log('[ziweiConfig] Applying personal info change:', infoValue);
        
        // Always query for latest elements (don't rely on stale cache)
        // This ensures we target the most recently rendered chart
        const nameEl = document.querySelector('.ziwei-name');
        const genderEl = document.querySelector('.ziwei-gender-classification');
        const gregDateEl = document.querySelector('.ziwei-datetime:not(.ziwei-lunar)');
        const lunarDateEl = document.querySelector('.ziwei-datetime.ziwei-lunar');
        
        if (infoValue === 'hide') {
            // Save original values ONLY when user first hides (on-demand)
            if (!originalPersonalInfo.name && nameEl) {
                originalPersonalInfo.name = nameEl.textContent;
                console.log('[ziweiConfig] Original name saved:', originalPersonalInfo.name);
            }
            if (!originalPersonalInfo.gender && genderEl) {
                originalPersonalInfo.gender = genderEl.textContent;
                console.log('[ziweiConfig] Original gender saved:', originalPersonalInfo.gender);
            }
            if (!originalPersonalInfo.gregorianDate && gregDateEl) {
                originalPersonalInfo.gregorianDate = gregDateEl.textContent;
                console.log('[ziweiConfig] Original gregorian date saved:', originalPersonalInfo.gregorianDate);
            }
            if (!originalPersonalInfo.lunarDate && lunarDateEl) {
                originalPersonalInfo.lunarDate = lunarDateEl.textContent;
                console.log('[ziweiConfig] Original lunar date saved:', originalPersonalInfo.lunarDate);
            }
            
            // Replace with placeholder values
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
            
            console.log('[ziweiConfig] Personal information hidden (replaced with placeholders)');
        } else if (infoValue === 'show') {
            // Restore all original values
            if (originalPersonalInfo.name && nameEl) {
                nameEl.textContent = originalPersonalInfo.name;
                console.log('[ziweiConfig] Name restored:', originalPersonalInfo.name);
            }
            if (originalPersonalInfo.gender && genderEl) {
                genderEl.textContent = originalPersonalInfo.gender;
                console.log('[ziweiConfig] Gender restored:', originalPersonalInfo.gender);
            }
            if (originalPersonalInfo.gregorianDate && gregDateEl) {
                gregDateEl.textContent = originalPersonalInfo.gregorianDate;
                console.log('[ziweiConfig] Gregorian date restored:', originalPersonalInfo.gregorianDate);
            }
            if (originalPersonalInfo.lunarDate && lunarDateEl) {
                lunarDateEl.textContent = originalPersonalInfo.lunarDate;
                console.log('[ziweiConfig] Lunar date restored:', originalPersonalInfo.lunarDate);
            }
            
            console.log('[ziweiConfig] Personal information visible (restored original values)');
        }
        
        // Track current state for reapplication on chart redraws
        currentPersonalInfoState = infoValue;
        console.log('[ziweiConfig] Personal info state updated:', currentPersonalInfoState);
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

        console.log('[ziweiConfig] Applying setting:', settingName, '=', value);

        // Call the handler function
        const handler = window.ziweiConfig[setting.handler];
        if (typeof handler === 'function') {
            handler(value);
        }

        // Save setting to sessionStorage for persistence within this session
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(`ziweiSetting_${settingName}`, value);
        }

        // If setting affects chart, trigger redraw
        if (setting.affectsChart) {
            console.log('[ziweiConfig] This setting affects chart display, may need redraw');
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

        // Restore value from sessionStorage (if available)
        // Map setting name to sessionStorage key
        let storedValue = null;
        if (name === 'starBrightness' && typeof sessionStorage !== 'undefined') {
            storedValue = sessionStorage.getItem('ziweiStarBrightness');
        } else if (typeof sessionStorage !== 'undefined') {
            storedValue = sessionStorage.getItem(`ziweiSetting_${name}`);
        }
        
        if (storedValue) {
            select.value = storedValue;
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
        if (currentPersonalInfoState !== 'hide') {
            return;  // Only update if we're in hide state
        }
        
        const data = chartData?.data;
        if (!data) return;
        
        console.log('[ziweiConfig] Updating stored personal info due to time/date change in hide state');
        
        // Update stored birth date (gregorian)
        const [year, month, day] = (data.birthdate || '').split('-').map(v => parseInt(v, 10));
        const [hour, minute] = (data.birthtime || '').split(':').map(v => parseInt(v, 10));
        if (year && month && day) {
            originalPersonalInfo.gregorianDate = `西曆：${year}年${month}月${day}日${hour || 0}時${minute || 0}分`;
        }
        
        // Update stored lunar date
        if (data.lunar) {
            const lunarFormatted = formatLunarForStorage(data.lunar);
            if (lunarFormatted) {
                originalPersonalInfo.lunarDate = `農曆：${lunarFormatted}`;
            }
        }
        
        // Note: name and gender don't change with time shifts, so we don't update them here
        console.log('[ziweiConfig] Stored personal info updated:', {
            gregorianDate: originalPersonalInfo.gregorianDate,
            lunarDate: originalPersonalInfo.lunarDate
        });
    }

    /**
     * Format lunar date for storage (helper function)
     * @param {Object} lunar Lunar data object
     * @returns {string} Formatted lunar string
     */
    function formatLunarForStorage(lunar) {
        if (!lunar) return '';
        const year = lunar.lunarYear || '';
        const month = lunar.lunarMonth || '';
        const day = lunar.lunarDay || '';
        const isLeap = lunar.isLeapMonth ? '(閏)' : '';
        return `${year}年${month}月${isLeap}${day}日`;
    }

    /**
     * Reapply personal info hiding state immediately after chart renders
     * Called by control.js AFTER chart replacement to avoid visual flashing
     * @param {HTMLElement} newChartElement The newly inserted chart element
     */
    function reapplyPersonalInfoStateImmediately(newChartElement) {
        if (currentPersonalInfoState === 'hide') {
            console.log('[ziweiConfig] Reapplying personal info hiding state immediately after chart render');
            
            // Get personal info elements from the NEW chart
            const nameEl = newChartElement?.querySelector('.ziwei-name');
            const genderEl = newChartElement?.querySelector('.ziwei-gender-classification');
            const gregDateEl = newChartElement?.querySelector('.ziwei-datetime:not(.ziwei-lunar)');
            const lunarDateEl = newChartElement?.querySelector('.ziwei-datetime.ziwei-lunar');
            
            // If originalPersonalInfo hasn't been saved yet, save it now from the new chart
            if (!originalPersonalInfo.name && nameEl) {
                originalPersonalInfo.name = nameEl.textContent;
            }
            if (!originalPersonalInfo.gender && genderEl) {
                originalPersonalInfo.gender = genderEl.textContent;
            }
            if (!originalPersonalInfo.gregorianDate && gregDateEl) {
                originalPersonalInfo.gregorianDate = gregDateEl.textContent;
            }
            if (!originalPersonalInfo.lunarDate && lunarDateEl) {
                originalPersonalInfo.lunarDate = lunarDateEl.textContent;
            }
            
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
            
            console.log('[ziweiConfig] Personal info hidden successfully');
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
