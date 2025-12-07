/**
 * Control Bar Module
 * 
 * Manages navigation and control buttons for the Ziwei chart view:
 * back button, hour navigation, settings toggle, and share button.
 * Settings UI and logic are delegated to config.js.
 * 
 * Dependencies:
 * - assets/data/constants.js (ziweiConstants)
 * - assets/js/data-adapter.js (ziweiAdapter)
 * - assets/display/js/config.js (ziweiConfig)
 * 
 * Corresponding CSS:
 * - assets/display/css/control.css
 * - assets/display/css/config.css (for settings panel)
 * 
 * Exports: window.ziweiControl
 */

'use strict';

(function () {

    // ============================================================================
    // Module Constants
    // ============================================================================

    const CONTROL_SELECTOR = '.ziwei-control-bar';
    const SETTINGS_SELECTOR = '.ziwei-settings-panel';

    function getAdapterInstance() {
        return window.ziweiAdapter || null;
    }

    function getAdapterStorageValue(key) {
        const adapter = getAdapterInstance();
        if (!adapter || !adapter.storage || typeof adapter.storage.get !== 'function') {
            return null;
        }
        try {
            return adapter.storage.get(key);
        } catch (e) {
            return null;
        }
    }

    function getAdapterSettingValue(name) {
        if (!name) {
            return null;
        }
        const adapter = getAdapterInstance();
        if (!adapter || !adapter.settings || typeof adapter.settings.get !== 'function') {
            return null;
        }
        try {
            return adapter.settings.get(name);
        } catch (e) {
            return null;
        }
    }

    function getLatestMetaFromAdapter() {
        const adapterOutput = getAdapterStorageValue('adapterOutput');
        if (adapterOutput && adapterOutput.meta) {
            return adapterOutput.meta;
        }
        const storedMeta = getAdapterStorageValue('meta');
        if (storedMeta) {
            return storedMeta;
        }
        console.error('[ziweiControl] Adapter meta not found in storage');
        return null;
    }

    /**
     * Calculate next 2-hour interval with special handling for transitions
     * @param {number} hour Current hour (0-23)
     * @param {number} minute Current minute (0-59)
     * @returns {Object} {hour, minute, dateOffset} dateOffset: 0 (same day), 1 (next day), -1 (prev day)
     */
    function getNextHourInterval(hour, minute) {
        let newHour = hour + 2;
        let dateOffset = 0;

        // Special case: 21:00-22:55 → 23:XX (next hour transition at midnight)
        if (hour >= 21 && hour < 23) {
            newHour = 23;
        }
        // Special case: 23:00-23:55 → 00:XX (next day)
        else if (hour === 23) {
            newHour = 0;
            dateOffset = 1;
        }
        // Handle day overflow
        if (newHour >= 24) {
            newHour -= 24;
            dateOffset = 1;
        }

        return { hour: newHour, minute, dateOffset };
    }

    /**
     * Calculate previous 2-hour interval with special handling for transitions
     * @param {number} hour Current hour (0-23)
     * @param {number} minute Current minute (0-59)
     * @returns {Object} {hour, minute, dateOffset} dateOffset: 0 (same day), 1 (next day), -1 (prev day)
     */
    function getPrevHourInterval(hour, minute) {
        let newHour = hour - 2;
        let dateOffset = 0;

        // Special case: 01:00-01:55 → 00:XX (same day, early morning transition)
        if (hour === 1) {
            newHour = 0;
        }
        // Special case: 00:00-00:55 → 23:XX (previous day)
        else if (hour === 0) {
            newHour = 23;
            dateOffset = -1;
        }
        // Handle day underflow
        if (newHour < 0) {
            newHour += 24;
            dateOffset = -1;
        }

        return { hour: newHour, minute, dateOffset };
    }
    /**
     * Handle time change request (prev/next hour)
     * @param {string} direction 'prev' or 'next'
     */
    function handleTimeChange(direction) {
        const adapter = getAdapterInstance();
        if (!adapter) return;

        const currentInput = getAdapterStorageValue('input');
        if (!currentInput) return;

        const currentDate = new Date(currentInput.solarDate);
        const { hour, minute, dateOffset } = direction === 'next' 
            ? getNextHourInterval(currentDate.getHours(), currentDate.getMinutes())
            : getPrevHourInterval(currentDate.getHours(), currentDate.getMinutes());

        // Apply new time
        currentDate.setHours(hour);
        currentDate.setMinutes(minute);
        if (dateOffset !== 0) {
            currentDate.setDate(currentDate.getDate() + dateOffset);
        }

        // Update input and recalculate
        const newInput = { ...currentInput, solarDate: currentDate.toISOString() };
        
        // Save new input immediately
        if (adapter.storage && typeof adapter.storage.set === 'function') {
            adapter.storage.set('input', newInput);
        }

        // Trigger calculation
        if (window.ziweiCalculator && typeof window.ziweiCalculator.calculateAndRender === 'function') {
            window.ziweiCalculator.calculateAndRender(newInput, { renderMode: 'element' })
                .then((result) => {
                    if (result && result.element) {
                        updateChartDisplay(result.element, result.context);
                    }
                })
                .catch(console.error);
        }
    }


    /**
     * Add or subtract days from a date
     * @param {number} year Current year
     * @param {number} month Current month (1-12)
     * @param {number} day Current day
     * @param {number} offset Number of days to add (positive) or subtract (negative)
     * @returns {Object} {year, month, day}
     */
    function adjustDate(year, month, day, offset) {
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() + offset);
        return {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate()
        };
    }

    /**
     * Handle hour interval change (previous or next)
     * @param {string} direction 'prev' or 'next'
     */
    function handleHourChange(direction) {
        const adapter = getAdapterInstance();
        if (!adapter || !adapter.normalizeInput) {
            console.error('[ziweiControl] Data adapter not available');
            return;
        }

        // Get the stored form input to modify
        const storedFormInput = getAdapterStorageValue('formInput');
        if (!storedFormInput) {
            console.error('[ziweiControl] No stored form input found');
            return;
        }

        const meta = getLatestMetaFromAdapter();
        if (!meta) {
            return;
        }

        const solarNumeric = meta.birthdateSolarNumeric || null;
        if (!solarNumeric) {
            console.error('[ziweiControl] Missing birthdateSolarNumeric in adapter meta');
            return;
        }

        const hour = Number.isFinite(solarNumeric.hour) ? solarNumeric.hour : 0;
        const minute = Number.isFinite(solarNumeric.minute) ? solarNumeric.minute : 0;
        const year = Number.isFinite(solarNumeric.year) ? solarNumeric.year : null;
        const month = Number.isFinite(solarNumeric.month) ? solarNumeric.month : null;
        const day = Number.isFinite(solarNumeric.day) ? solarNumeric.day : null;
        if (!year || !month || !day) {
            console.error('[ziweiControl] Incomplete solar snapshot in adapter meta', solarNumeric);
            return;
        }

        let newHour, newMinute, dateOffset;

        if (direction === 'next') {
            const result = getNextHourInterval(hour, minute);
            newHour = result.hour;
            newMinute = result.minute;
            dateOffset = result.dateOffset;
        } else {
            const result = getPrevHourInterval(hour, minute);
            newHour = result.hour;
            newMinute = result.minute;
            dateOffset = result.dateOffset;
        }

        // Adjust date if needed
        const newDate = dateOffset !== 0
            ? adjustDate(year, month, day, dateOffset)
            : { year, month, day };

        // Modify the stored form input with new time
        const rawInput = { ...storedFormInput };
        rawInput.year = String(newDate.year);
        rawInput.month = String(newDate.month);
        rawInput.day = String(newDate.day);
        rawInput.hour = String(newHour);
        rawInput.minute = String(newMinute);

        // Include ziHourHandling from adapter settings when available so normalization
        // computes lunar with the correct 子時換日 mode.
        let ziHandling = null;
        let leapHandling = null;
        try {
            ziHandling = getAdapterSettingValue('ziHourHandling');
        } catch (e) {
            ziHandling = null;
        }
        try {
            leapHandling = getAdapterSettingValue('leapMonthHandling');
        } catch (e) {
            leapHandling = null;
        }
        if (!leapHandling && meta.leapMonthHandling) {
            leapHandling = meta.leapMonthHandling;
        }
        if (!leapHandling) {
            leapHandling = 'mid';
        }

        rawInput.leapMonthHandling = leapHandling;
        rawInput.ziHourHandling = ziHandling || undefined;

        // Ensure no null or empty values in rawInput to prevent validation failures
        if (rawInput.name == null || rawInput.name === '') rawInput.name = '';
        if (rawInput.gender == null || rawInput.gender === '') rawInput.gender = 'M';
        if (rawInput.year == null || rawInput.year === '') rawInput.year = String(new Date().getFullYear());
        if (rawInput.month == null || rawInput.month === '') rawInput.month = '1';
        if (rawInput.day == null || rawInput.day === '') rawInput.day = '1';
        if (rawInput.hour == null || rawInput.hour === '') rawInput.hour = '0';
        if (rawInput.minute == null || rawInput.minute === '') rawInput.minute = '0';
        if (rawInput.birthplace == null || rawInput.birthplace === '') rawInput.birthplace = '';
        if (rawInput.calendarType == null || rawInput.calendarType === '') rawInput.calendarType = 'solar';
        if (rawInput.leapMonth == null || rawInput.leapMonth === '') rawInput.leapMonth = '';
        if (rawInput.leapMonthHandling == null || rawInput.leapMonthHandling === '') rawInput.leapMonthHandling = 'mid';
        if (rawInput.ziHourHandling == null || rawInput.ziHourHandling === '') rawInput.ziHourHandling = '';




        let normalized;
        try {
            normalized = adapter.normalizeInput(rawInput);
        } catch (adapterError) {
            console.error('[ziweiControl] Adapter normalization failed:', adapterError);
            if (adapter.errors?.isAdapterError?.(adapterError) && window.ziweiForm?.handleAdapterError) {
                window.ziweiForm.handleAdapterError(adapterError);
            } else {
                window.ziweiForm?.showError(adapterError.message || '資料轉換失敗，請稍後再試');
            }
            return;
        }

        // Perform full calculation to get proper adapterOutput with sections
        // NOTE: adapter.calculate() expects raw input data, not normalized data
        let adapterOutput;
        try {
            adapterOutput = adapter.calculate(rawInput);
        } catch (calcError) {
            console.error('[ziweiControl] Calculation failed:', calcError);
            window.ziweiForm?.showError(calcError.message || '計算失敗，請稍後再試');
            return;
        }

        const calcResult = {
            success: true,
            message: '命盤生成成功。',
            data: {
                name: normalized.meta.name,
                gender: normalized.meta.gender,
                birthdate: normalized.strings?.birthdate || '',
                birthtime: normalized.strings?.birthtime || '',
                birthplace: normalized.meta.birthplace || '',
                lunar: normalized.lunar
            }
        };

    // adapterOutput prepared and persisted to adapter.storage

        // Persist the adjusted normalized / adapterOutput into adapter storage
        try {
            if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
                adapter.storage.set('normalizedInput', normalized);
                adapter.storage.set('adapterOutput', adapterOutput);
                adapter.storage.set('calcResult', calcResult);
                adapter.storage.set('formInput', normalized.raw ? normalized.raw : rawInput);
                if (adapterOutput && adapterOutput.meta) {
                    adapter.storage.set('meta', adapterOutput.meta);
                }
            }
        } catch (e) {}

        // Dispatch setting changed event
        document.dispatchEvent(new CustomEvent('ziwei-setting-changed', {
            detail: { setting: 'hour-change' }
        }));

        // Reapply settings
        const brightnessSetting = getAdapterSettingValue('starBrightness');
        if (brightnessSetting) {
            document.dispatchEvent(new CustomEvent('ziwei-starBrightness-changed', {
                detail: { value: brightnessSetting }
            }));
        }

        // Optionally validate with API in background (fire and forget)
        setTimeout(() => {
            const payload = {
                name: normalized.meta.name,
                gender: normalized.meta.gender,
                year: normalized.solar.year,
                month: normalized.solar.month,
                day: normalized.solar.day,
                hour: normalized.solar.hour,
                minute: normalized.solar.minute,
                birthplace: normalized.meta.birthplace || '',
                calendarType: normalized.meta.calendarType,
                leapMonth: normalized.meta.leapMonth,
                lunar: normalized.lunar
            };

            window.submitToApi(payload).catch(error => {
                // Non-critical - background validation failed silently
            });
        }, 0);
    }

    /**
     * Update chart display without form replacement
     * @param {HTMLElement} newChartElement New chart element
     * @param {Object} [adapterContext] Optional adapter context (expects { adapterOutput })
     */
    function updateChartDisplay(newChartElement, adapterContext) {
        const currentChart = document.querySelector('[data-ziwei-chart]');
        if (!currentChart) {
            console.error('[ziweiControl] Current chart not found');
            return;
        }

        // Replace with new chart immediately
        newChartElement.setAttribute('data-ziwei-chart', '1');
        
        // Remove fade-in animation from chart for instant display
        const grid = newChartElement.querySelector('.ziwei-4x4-grid');
        if (grid) {
            grid.style.transition = 'none';
            grid.style.opacity = '1';
        }
        
        // If personal info is in hide state, update stored values BEFORE replacing chart
        // This prevents stored data from being out of sync with displayed data
        if (window.ziweiConfig && typeof window.ziweiConfig.updateStoredPersonalInfoIfHidden === 'function') {
            window.ziweiConfig.updateStoredPersonalInfoIfHidden(adapterContext);
        }
        
        currentChart.replaceWith(newChartElement);
        
        // Reapply personal info privacy state if it was previously set to hide
        // This ensures privacy persists and prevents visual flashing
        if (window.ziweiConfig && typeof window.ziweiConfig.reapplyPersonalInfoStateImmediately === 'function') {
            window.ziweiConfig.reapplyPersonalInfoStateImmediately(newChartElement);
        }
        
        // Reapply all display-only settings via events (unified event-driven pattern)
        // This ensures all settings persist across chart replacements
        
        // Brightness setting
        const brightnessSetting = getAdapterSettingValue('starBrightness');
        if (brightnessSetting) {
            document.dispatchEvent(new CustomEvent('ziwei-starBrightness-changed', {
                detail: { value: brightnessSetting, settingName: 'starBrightness' }
            }));
        }
        
        // Palace name settings
        const careerSetting = getAdapterSettingValue('palaceNameCareer');
        if (careerSetting && careerSetting !== 'career') {
            document.dispatchEvent(new CustomEvent('ziwei-palace-name-changed', {
                detail: { settingName: 'palaceNameCareer', newValue: careerSetting }
            }));
        }
        
        const friendsSetting = getAdapterSettingValue('palaceNameFriends');
        if (friendsSetting && friendsSetting !== 'friends') {
            document.dispatchEvent(new CustomEvent('ziwei-palace-name-changed', {
                detail: { settingName: 'palaceNameFriends', newValue: friendsSetting }
            }));
        }
        
        // XunKong setting
        const xunKongSetting = getAdapterSettingValue('xunKong');
        if (xunKongSetting) {
            document.dispatchEvent(new CustomEvent('ziwei-xunkong-changed', {
                detail: { value: xunKongSetting, settingName: 'xunKong' }
            }));
        }
    }

    /**
     * Create a button element with shared styling classes.
     * @param {string} label Visible button text
     * @param {string} className Additional class names applied to the button
     * @returns {HTMLButtonElement}
     */
    function createButton(label, className) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = ['ziwei-control-button', className].filter(Boolean).join(' ');
        btn.textContent = label;
        return btn;
    }

    /**
     * Delegate settings panel creation to config.js
     * config.js handles all settings UI generation and application logic
     * @param {HTMLElement} containerNode Parent element for the settings panel
     * @param {HTMLElement} afterNode Element after which to insert the panel
     * @returns {HTMLElement|null}
     */
    function createSettingsPanel(containerNode, afterNode) {
        // Delegate to config.js for settings panel rendering
        if (window.ziweiConfig && typeof window.ziweiConfig.createSettingsPanel === 'function') {
            return window.ziweiConfig.createSettingsPanel(containerNode, afterNode);
        }

        // Fallback if config.js not loaded
        return null;
    }

    /**
     * Render the control bar before the provided node.
     * Creates 4 buttons: back, prev-hour, next-hour, settings
     * Settings panel UI is delegated to config.js module
     * @param {Object} options Options for rendering the control bar
     * @param {HTMLElement} options.mountNode Parent element that will receive the control bar
     * @param {HTMLElement} [options.beforeNode] Node before which the bar should be inserted
     * @returns {HTMLElement|null}
     */
    function createBar({ mountNode, beforeNode } = {}) {
        if (!mountNode) {
            console.error('ziweiControl.createBar: mountNode is required');
            return null;
        }

        // Remove any existing control bars inside the mount node to avoid duplicates.
        mountNode.querySelectorAll(CONTROL_SELECTOR).forEach((existing) => existing.remove());

        const bar = document.createElement('div');
        bar.className = 'ziwei-control-bar';
        bar.setAttribute('data-role', 'ziwei-control-bar');

        const leftGroup = document.createElement('div');
        leftGroup.className = 'ziwei-control-group ziwei-control-group-left';

        const centerGroup = document.createElement('div');
        centerGroup.className = 'ziwei-control-group ziwei-control-group-center';

        const rightGroup = document.createElement('div');
        rightGroup.className = 'ziwei-control-group ziwei-control-group-right';

        const backBtn = createButton('◀', 'ziwei-back-btn');
        leftGroup.appendChild(backBtn);

        // Add event listener for back button
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const chartElement = mountNode.querySelector('[data-ziwei-chart]');
            if (chartElement && window.ziweiForm && typeof window.ziweiForm.restoreForm === 'function') {
                // Deactivate AI mode before restoring form to prevent interference
                if (window.ziweiAiMode && typeof window.ziweiAiMode.deactivate === 'function') {
                    window.ziweiAiMode.deactivate(chartElement);
                }
                window.ziweiForm.restoreForm(chartElement);
            }
        });

        const prevBtn = createButton('← 時辰', 'ziwei-control-prev-hour');
        prevBtn.setAttribute('data-control', 'prev-hour');
        centerGroup.appendChild(prevBtn);

        const modeBtn = createButton('看命盤', 'ziwei-control-mode-toggle');
        centerGroup.appendChild(modeBtn);

        const nextBtn = createButton('時辰 →', 'ziwei-control-next-hour');
        nextBtn.setAttribute('data-control', 'next-hour');
        centerGroup.appendChild(nextBtn);

        // Create a lightweight Share button (visible immediately).
        // The heavy share module will be loaded lazily when the user clicks it.
        const shareBtn = createButton('📤', 'ziwei-control-share-btn');
        shareBtn.type = 'button';
        // Use aria-label instead of title to avoid browser-native tooltip
        shareBtn.setAttribute('aria-label', '分享與匯出');
        shareBtn.classList.add('ziwei-share-btn');
        // Make share button compatible with share.js event delegation
        shareBtn.setAttribute('data-action', 'toggle-menu');

        // Make sure the button and its container are above other elements so clicks reach it.
        try {
            rightGroup.style.position = rightGroup.style.position || 'relative';
            rightGroup.style.zIndex = rightGroup.style.zIndex || '9999';
            shareBtn.style.position = 'relative';
            shareBtn.style.zIndex = '10000';
            shareBtn.style.pointerEvents = 'auto';
        } catch (e) {}

        // Append the share button (no spinner or loading text)
        rightGroup.appendChild(shareBtn);

        // Add click handler to load share module and toggle menu
        shareBtn.addEventListener('click', async function(e) {
            // FIX: If module is already loaded, do NOTHING here.
            // Let the event bubble up to share.js's document listener.
            if (window.ziweiShare) {
                return;
            }

            // If not loaded, we handle the load process.
            // Prevent default to avoid weird browser behaviors, 
            // and STOP propagation so we don't trigger share.js immediately if it loads super fast (race condition).
            e.preventDefault();
            e.stopPropagation();

            try {
                await lazyLoadShareModule();
                // After loading, we must manually trigger the menu ONCE
                // because we stopped propagation of the original click.
                if (window.ziweiShare && typeof window.ziweiShare._toggleMenu === 'function') {
                    window.ziweiShare._toggleMenu();
                }
            } catch (err) {
                console.error('[ziweiControl] Failed to load share module:', err);
            }
        });

        const settingsBtn = createButton('⚙', 'ziwei-control-settings-btn');
        settingsBtn.setAttribute('data-control', 'open-settings');
        rightGroup.appendChild(settingsBtn);

        bar.appendChild(leftGroup);
        bar.appendChild(centerGroup);
        bar.appendChild(rightGroup);

        const referenceNode = beforeNode && mountNode.contains(beforeNode) ? beforeNode : null;
        if (referenceNode) {
            mountNode.insertBefore(bar, referenceNode);
        } else {
            mountNode.appendChild(bar);
        }

        // Create settings panel (initially hidden) - delegates to config.js
        createSettingsPanel(mountNode, bar);

        // Add event listener for previous hour button
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleHourChange('prev');
        });

        // Add event listener for next hour button
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleHourChange('next');
        });

        // Add event listener for mode toggle button
        modeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = mountNode.closest('.ziwei-cal');
            if (!container) return;
            const chartElement = container.querySelector('[data-ziwei-chart]');
            if (!chartElement) return;
            const currentMode = container.getAttribute('data-ziwei-mode') || 'chart';
            if (currentMode === 'ai') {
                // Switch to chart mode
                container.setAttribute('data-ziwei-mode', 'chart');
                if (window.ziweiAiMode && typeof window.ziweiAiMode.deactivate === 'function') {
                    window.ziweiAiMode.deactivate(chartElement);
                }
                const grid = chartElement.querySelector('.ziwei-4x4-grid');
                if (grid) grid.style.display = '';
                const interpPanels = document.querySelectorAll('.ziwei-interpretation-panel, .ziwei-interpretation-wrapper');
                interpPanels.forEach((panel) => panel.style.display = '');
                
                // Force re-inject share menu and enable PNG/PDF
                const shareBtn = document.querySelector('.ziwei-share-btn');
                if (shareBtn) {
                    const existingMenu = shareBtn.querySelector('.ziwei-share-menu');
                    if (existingMenu) {
                        existingMenu.remove();
                    }
                    if (window.ziweiShare && typeof window.ziweiShare._injectMenu === 'function') {
                        window.ziweiShare._injectMenu(shareBtn);
                    }
                    // Force enable PNG/PDF options with delay
                    setTimeout(() => {
                        const targets = document.querySelectorAll('.ziwei-share-option[data-action="download-png"], .ziwei-share-option[data-action="download-pdf"]');
                        targets.forEach((opt) => {
                            opt.classList.remove('disabled');
                            opt.removeAttribute('aria-disabled');
                            opt.removeAttribute('data-title');
                        });
                    }, 200);
                }
                modeBtn.textContent = '看AI提示詞';
            } else {
                // Switch to ai mode
                container.setAttribute('data-ziwei-mode', 'ai');
                if (window.ziweiAiMode && typeof window.ziweiAiMode.activate === 'function') {
                    window.ziweiAiMode.activate(chartElement);
                }
                // Force re-inject share menu for AI mode
                const shareBtn = document.querySelector('.ziwei-share-btn');
                if (shareBtn) {
                    const existingMenu = shareBtn.querySelector('.ziwei-share-menu');
                    if (existingMenu) {
                        existingMenu.remove();
                    }
                    if (window.ziweiShare && typeof window.ziweiShare._injectMenu === 'function') {
                        window.ziweiShare._injectMenu(shareBtn);
                    }
                }
                modeBtn.textContent = '看命盤';
            }
        });

        // Add event listener for settings button toggle
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const panel = mountNode.querySelector(SETTINGS_SELECTOR);
            const isActive = settingsBtn.classList.contains('active');

            if (isActive) {
                // Close settings panel
                settingsBtn.classList.remove('active');
                settingsBtn.textContent = '⚙';
                if (panel) {
                    panel.classList.remove('active');
                }
            } else {
                // Open settings panel
                settingsBtn.classList.add('active');
                settingsBtn.textContent = '✕';
                if (panel) {
                    panel.classList.add('active');
                }
            }
        });

        return bar;
    }

    // Expose public API
    window.ziweiControl = {
        createBar,
        // Expose updateChartDisplay so other modules (config.js) can replace the
        // existing chart when the form is not present (chart-only view).
        updateChartDisplay
    };
    
    /**
     * Lazy-load external scripts required by share module.
     * Returns a promise that resolves when the share script is loaded.
     */
    function ensureScript(src, globalCheckNames) {
        return new Promise((resolve, reject) => {
            try {
                // If any of the global names already exist, consider it loaded
                if (Array.isArray(globalCheckNames)) {
                    for (let i = 0; i < globalCheckNames.length; i++) {
                        if (window[globalCheckNames[i]]) {
                            resolve();
                            return;
                        }
                    }
                } else if (typeof globalCheckNames === 'string' && window[globalCheckNames]) {
                    resolve();
                    return;
                }

                // Avoid adding duplicate script tags
                const existing = Array.from(document.scripts).find(s => s.src && s.src.indexOf(src) !== -1);
                if (existing) {
                    if (existing.hasAttribute('data-loaded')) {
                        resolve();
                    } else {
                        existing.addEventListener('load', () => resolve());
                        existing.addEventListener('error', (e) => reject(e));
                    }
                    return;
                }

                const s = document.createElement('script');
                s.src = src;
                s.async = true;
                s.defer = true;
                s.addEventListener('load', () => {
                    s.setAttribute('data-loaded', '1');
                    resolve();
                });
                s.addEventListener('error', (e) => reject(new Error('Failed to load ' + src)));
                document.head.appendChild(s);
            } catch (e) {
                reject(e);
            }
        });
    }

    function lazyLoadShareModule() {
        if (window.ziweiShare && typeof window.ziweiShare._toggleMenu === 'function') {
            // If share.js is already loaded but dependencies are missing, load them.
            const pluginBase = (window.ziweiCalData && window.ziweiCalData.pluginUrl) ? window.ziweiCalData.pluginUrl : '';
            const pluginVersion = (window.ziweiCalData && window.ziweiCalData.pluginVersion) ? window.ziweiCalData.pluginVersion : Date.now();
            const urls = {
                domToImage: 'https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js',
                upng: 'https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.min.js',
                jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
                share: pluginBase + 'assets/display/js/share.js?ver=' + pluginVersion
            };

            const needsDom = !window.domtoimage;
            const needsUpng = !window.UPNG;
            const needsJsPdf = !(window.jspdf?.jsPDF || window.jsPDF);

            return Promise.resolve()
                .then(() => needsDom ? ensureScript(urls.domToImage, ['domtoimage']) : null)
                .then(() => needsUpng ? ensureScript(urls.upng, ['UPNG']) : null)
                .then(() => needsJsPdf ? ensureScript(urls.jspdf, ['jspdf']) : null)
                .then(() => {
                    try {
                        window.ziweiShare._toggleMenu();
                    } catch (e) {
                        // ignore if menu not ready
                    }
                });
        }
        const pluginBase = (window.ziweiCalData && window.ziweiCalData.pluginUrl) ? window.ziweiCalData.pluginUrl : '';
        const pluginVersion = (window.ziweiCalData && window.ziweiCalData.pluginVersion) ? window.ziweiCalData.pluginVersion : Date.now();
        const urls = {
            pako: 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js',
            domToImage: 'https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js',
            upng: 'https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.min.js',
            jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
            share: pluginBase + 'assets/display/js/share.js?ver=' + pluginVersion
        };

        // Load lightweight libs first (in sequence to ensure globals are available)
        return ensureScript(urls.pako, ['pako'])
            .then(() => ensureScript(urls.domToImage, ['domtoimage']))
            .then(() => ensureScript(urls.upng, ['UPNG']))
            .then(() => ensureScript(urls.jspdf, ['jspdf']))
            .then(() => ensureScript(urls.share, ['ziweiShare']))
            .catch(err => {
                return Promise.reject(err);
            });
    }
})();
