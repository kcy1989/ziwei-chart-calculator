'use strict';

/**
 * Control bar module manages navigation and settings buttons for the Ziwei chart view.
 * Settings UI and logic are delegated to config.js
 * 
 * Corresponding CSS: assets/display/css/control.css
 *                    assets/display/css/config.css (for settings panel)
 */
(function () {
    const CONTROL_SELECTOR = '.ziwei-control-bar';
    const SETTINGS_SELECTOR = '.ziwei-settings-panel';

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
        // Special case: 00:00-00:55 → 02:XX (normal +2)
        // All other cases: normal +2 hours

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
        // Special case: 23:00-23:55 → 21:XX (normal -2)
        // All other cases: normal -2 hours

        // Handle day underflow
        if (newHour < 0) {
            newHour += 24;
            dateOffset = -1;
        }

        return { hour: newHour, minute, dateOffset };
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
        const chartData = window.ziweiChartData;
        if (!chartData || !chartData.meta) {
            console.warn('[ziweiControl] No chart data available');
            return;
        }

        // Extract metadata from cached chart data
        const meta = chartData.meta;

        // Parse current birthtime (format: "HH:MM")
        const birthtimeStr = meta.birthtime || '';
        const [hourStr, minuteStr] = birthtimeStr.split(':');
        const hour = parseInt(hourStr, 10) || 0;
        const minute = parseInt(minuteStr, 10) || 0;

        // Parse birth date from birthdate field (format: "YYYY-MM-DD")
        const birthdateStr = meta.birthdate || '';
        const [yearStr, monthStr, dayStr] = birthdateStr.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);

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

        const adapter = window.ziweiAdapter;
        if (!adapter || !adapter.input || !adapter.output) {
            console.error('[ziweiControl] Data adapter not available');
            return;
        }

        const rawInput = {
            name: meta.name || '',
            gender: meta.gender || '',
            year: String(newDate.year),
            month: String(newDate.month),
            day: String(newDate.day),
            hour: String(newHour),
            minute: String(newMinute),
            birthplace: meta.birthplace || '',
            calendarType: meta.calendarType || 'solar',
            leapMonth: '',
            timezone: meta.timezone || 'UTC+8'
        };

        let normalized;
        try {
            normalized = adapter.input.normalize(rawInput);
        } catch (adapterError) {
            console.error('[ziweiControl] Adapter normalization failed:', adapterError);
            if (adapter.errors?.isAdapterError?.(adapterError) && window.ziweiForm?.handleAdapterError) {
                window.ziweiForm.handleAdapterError(adapterError);
            } else {
                window.ziweiForm?.showError(adapterError.message || '資料轉換失敗，請稍後再試');
            }
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

        let adapterOutput;
        try {
            adapterOutput = adapter.output.process(calcResult, normalized);
        } catch (processError) {
            console.error('[ziweiControl] Adapter output processing failed:', processError);
            window.ziweiForm?.showError('命盤資料處理失敗，請稍後再試');
            return;
        }

        console.log('[ziweiControl] Local chart context prepared via adapter:', adapterOutput);

        const newChartElement = window.ziweiChart.draw({
            calcResult,
            normalizedInput: normalized,
            adapterOutput
        });
        updateChartDisplay(newChartElement, calcResult);

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
                console.warn('[ziweiControl] Background API validation failed (non-critical):', error);
            });
        }, 0);
    }

    /**
     * Update chart display without form replacement
     * @param {HTMLElement} newChartElement New chart element
     * @param {Object} [chartData] Optional chart data (used to update stored personal info in hide state)
     */
    function updateChartDisplay(newChartElement, chartData) {
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
        if (window.ziweiConfig && typeof window.ziweiConfig.updateStoredPersonalInfoIfHidden === 'function' && chartData) {
            window.ziweiConfig.updateStoredPersonalInfoIfHidden(chartData);
        }
        
        currentChart.replaceWith(newChartElement);
        
        // Reapply personal info privacy state if it was previously set to hide
        // This ensures privacy persists and prevents visual flashing
        if (window.ziweiConfig && typeof window.ziweiConfig.reapplyPersonalInfoStateImmediately === 'function') {
            window.ziweiConfig.reapplyPersonalInfoStateImmediately(newChartElement);
        }
        
        // Reapply brightness setting to new chart element
        // This ensures brightness state is consistent after chart replacement
        if (typeof sessionStorage !== 'undefined') {
            const brightnessSetting = sessionStorage.getItem('ziweiStarBrightness');
            if (brightnessSetting && window.ziweiConfig && typeof window.ziweiConfig.applyStarBrightnessChange === 'function') {
                window.ziweiConfig.applyStarBrightnessChange(brightnessSetting);
            }
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
        console.warn('[ziweiControl] config.js not loaded, cannot create settings panel');
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

        const backBtn = createButton('上一頁', 'ziwei-back-btn');
        leftGroup.appendChild(backBtn);

        const prevBtn = createButton('上一個時辰', 'ziwei-control-prev-hour');
        prevBtn.setAttribute('data-control', 'prev-hour');
        centerGroup.appendChild(prevBtn);

        const nextBtn = createButton('下一個時辰', 'ziwei-control-next-hour');
        nextBtn.setAttribute('data-control', 'next-hour');
        centerGroup.appendChild(nextBtn);

        const settingsBtn = createButton('開啟設定', 'ziwei-control-settings-btn');
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

        // Add event listener for settings button toggle
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const panel = mountNode.querySelector(SETTINGS_SELECTOR);
            const isActive = settingsBtn.classList.contains('active');

            if (isActive) {
                // Close settings panel
                settingsBtn.classList.remove('active');
                settingsBtn.textContent = '開啟設定';
                if (panel) {
                    panel.classList.remove('active');
                }
                console.log('ziweiControl: settings panel closed');
            } else {
                // Open settings panel
                settingsBtn.classList.add('active');
                settingsBtn.textContent = '關閉設定';
                if (panel) {
                    panel.classList.add('active');
                }
                console.log('ziweiControl: settings panel opened');
            }
        });

        console.log('ziweiControl: control bar rendered', { mountNode, beforeNode: referenceNode });
        return bar;
    }

    // Expose public API
    window.ziweiControl = {
        createBar
    };
})();
