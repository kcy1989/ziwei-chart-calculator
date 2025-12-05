/**
 * Main Calculator Module for Ziwei Chart
 * 
 * Orchestrates the complete chart calculation process including:
 * - Input normalization and validation
 * - Lunar/Solar date conversion
 * - Chart data computation via adapter modules
 * - Result caching and optimization
 * 
 * Dependencies:
 * - assets/data/constants.js
 * - assets/js/adapter-utils.js
 * - assets/js/data-adapter.js
 * 
 * Exports: window.ziweiCalculator
 */

'use strict';

(function(window) {
    // ============================================================================
    // Constants & Configuration
    // ============================================================================
    const constants = window.ziweiConstants;
    const ADAPTER_KEYS = constants.ADAPTER_KEYS;
    const PERF_CONFIG = constants.PERF_CONFIG;
    const DEBUG = constants.DEBUG.CALCULATOR;
    const DEFAULTS = constants.DEFAULTS;
    const CALCULATION_SETTINGS = constants.CALCULATION_SETTINGS;

    const CACHE_MAX_SIZE = PERF_CONFIG.CACHE_MAX_SIZE;

    const ADAPTER_CONTEXT_KEYS = Object.freeze([
        ADAPTER_KEYS.ADAPTER_OUTPUT,
        ADAPTER_KEYS.CALC_RESULT,
        ADAPTER_KEYS.NORMALIZED_INPUT,
        ADAPTER_KEYS.META,
        ADAPTER_KEYS.RAW
    ]);

    // ============================================================================
    // Cache Implementation
    // ============================================================================
    const computeCache = new Map();

    /**
     * Prune cache if size exceeds limit (FIFO)
     */
    function pruneCacheIfNeeded() {
        if (computeCache.size >= CACHE_MAX_SIZE) {
            const firstKey = computeCache.keys().next().value;
            computeCache.delete(firstKey);
        }
    }

    /**
     * Clear all cached computation results
     */
    function clearCalculationCache() {
        computeCache.clear();
    }

    /**
     * Get cached computation result
     * @param {string} cacheKey
     * @returns {Object|null}
     */
    function getCachedResult(cacheKey) {
        if (!cacheKey || !computeCache.has(cacheKey)) {
            return null;
        }
        return computeCache.get(cacheKey);
    }

    /**
     * Store computation result in cache
     * @param {string} cacheKey
     * @param {Object} result
     */
    function setCachedResult(cacheKey, result) {
        if (!cacheKey) return;
        pruneCacheIfNeeded();
        computeCache.set(cacheKey, result);
    }

    // ============================================================================
    // Adapter Context Management
    // ============================================================================
    
    /**
     * Clear adapter chart context
     * @param {Object} options
     */
    function clearAdapterChartContext(options = {}) {
        const { preserveFormInput = false } = options;
        const utils = window.ziweiAdapterUtils;
        const storage = utils?.getStorage();
        
        if (!storage || typeof storage.remove !== 'function') {
            return;
        }

        ADAPTER_CONTEXT_KEYS.forEach((key) => {
            storage.remove(key);
        });

        if (!preserveFormInput) {
            storage.remove(ADAPTER_KEYS.FORM_INPUT);
        }
    }

    /**
     * Prime adapter with form input data
     * @param {Object} formData
     */
    function primeAdapterFormInput(formData) {
        const utils = window.ziweiAdapterUtils;
        if (!formData || !utils) return;
        
        const sanitized = sanitizeFormForStorage(formData);
        utils.setStorageValue(ADAPTER_KEYS.FORM_INPUT, sanitized);
    }

    // ============================================================================
    // Data Sanitization
    // ============================================================================

    /**
     * Remove personal fields from form data before storage
     * @param {Object} formData
     * @returns {Object}
     */
    function sanitizeFormForStorage(formData) {
        if (!formData || typeof formData !== 'object') {
            return formData;
        }

        const copy = Object.assign({}, formData);
        
        // Remove top-level personal fields
        delete copy.name;
        delete copy.birthplace;
        delete copy.gender;

        // Remove solar date fields
        if (copy.solar && typeof copy.solar === 'object') {
            const solarCopy = Object.assign({}, copy.solar);
            delete solarCopy.year;
            delete solarCopy.month;
            delete solarCopy.day;
            delete solarCopy.hour;
            delete solarCopy.minute;
            copy.solar = solarCopy;
        }

        // Remove meta personal fields
        if (copy.meta && typeof copy.meta === 'object') {
            const metaCopy = Object.assign({}, copy.meta);
            delete metaCopy.name;
            delete metaCopy.gender;
            delete metaCopy.birthplace;
            copy.meta = metaCopy;
        }

        return copy;
    }

    // ============================================================================
    // Cache Key Generation
    // ============================================================================

    /**
     * Generate cache key from form input
     * @param {Object} formData
     * @returns {string}
     */
    function getCacheKey(formData) {
        if (!formData) return '';

        const solar = formData.solar || formData;
        const meta = formData.meta || {};

        const keyParts = [
            solar.year,
            solar.month,
            solar.day,
            solar.hour,
            solar.minute,
            meta.gender || formData.gender || 'unknown',
            meta.calendarType || formData.calendarType || DEFAULTS.CALENDAR_TYPE,
            resolveLeapMonthHandling(meta, formData),
            resolveZiHourHandling(meta, formData)
        ];

        let key = keyParts.join('|');

        // Include stem interpretations for cache differentiation
        const stemInterpretations = extractStemInterpretations(formData);
        if (stemInterpretations) {
            key += '|' + stemInterpretations;
        }

        return key;
    }

    /**
     * Resolve leap month handling value
     */
    function resolveLeapMonthHandling(meta, formData) {
        if (meta.leapMonthHandling !== undefined && meta.leapMonthHandling !== null) {
            return String(meta.leapMonthHandling);
        }
        if (formData.leapMonthHandling !== undefined && formData.leapMonthHandling !== null) {
            return String(formData.leapMonthHandling);
        }
        return '';
    }

    /**
     * Resolve zi hour handling value
     */
    function resolveZiHourHandling(meta, formData) {
        if (meta.ziHourHandling !== undefined) {
            return String(meta.ziHourHandling);
        }
        if (formData.ziHourHandling !== undefined) {
            return String(formData.ziHourHandling);
        }
        return DEFAULTS.ZI_HOUR_HANDLING;
    }

    /**
     * Extract stem interpretations for cache key
     */
    function extractStemInterpretations(formData) {
        const rawData = formData.raw || formData;
        if (!rawData.stemInterpretations || typeof rawData.stemInterpretations !== 'object') {
            return '';
        }
        const sortedKeys = Object.keys(rawData.stemInterpretations).sort();
        return sortedKeys.map(key => `${key}:${rawData.stemInterpretations[key]}`).join(',');
    }

    // ============================================================================
    // Time Index Calculation
    // ============================================================================

    /**
     * Convert time string to military hour index (0-11)
     * @param {string} timeStr Time in HH:MM format
     * @returns {number} Index 0-11
     */
    function getMilitaryHourIndex(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') {
            return 0;
        }

        const parts = timeStr.split(':');
        const hour = parseInt(parts[0], 10);
        
        if (isNaN(hour)) {
            return 0;
        }

        // Use constants for time ranges
        if (hour >= 23 || hour < 1) return 0;   // 子
        if (hour >= 1 && hour < 3) return 1;    // 丑
        if (hour >= 3 && hour < 5) return 2;    // 寅
        if (hour >= 5 && hour < 7) return 3;    // 卯
        if (hour >= 7 && hour < 9) return 4;    // 辰
        if (hour >= 9 && hour < 11) return 5;   // 巳
        if (hour >= 11 && hour < 13) return 6;  // 午
        if (hour >= 13 && hour < 15) return 7;  // 未
        if (hour >= 15 && hour < 17) return 8;  // 申
        if (hour >= 17 && hour < 19) return 9;  // 酉
        if (hour >= 19 && hour < 21) return 10; // 戌
        if (hour >= 21 && hour < 23) return 11; // 亥
        
        return 0;
    }

    // ============================================================================
    // API Payload Building
    // ============================================================================

    /**
     * Build API payload from normalized input
     * @param {Object} normalizedInput
     * @returns {Object}
     */
    function buildApiPayload(normalizedInput) {
        if (!normalizedInput?.meta || !normalizedInput?.solar) {
            throw new Error('資料轉換錯誤，缺少必要欄位');
        }

        const { solar, meta } = normalizedInput;

        return {
            name: meta.name,
            gender: meta.gender,
            year: solar.year,
            month: solar.month,
            day: solar.day,
            hour: solar.hour,
            minute: solar.minute,
            birthplace: meta.birthplace || '',
            calendarType: meta.calendarType,
            leapMonth: meta.leapMonth,
            lunar: normalizedInput.lunar
        };
    }

    // ============================================================================
    // Chart Computation
    // ============================================================================

    /**
     * Submit form data to WordPress API
     * @param {Object} formData
     * @returns {Promise<Object>}
     */
    async function submitToApi(formData) {
        if (!window.ziweiCalData?.restUrl) {
            throw new Error('REST API 設定缺失，請重新載入頁面');
        }

        const response = await fetch(window.ziweiCalData.restUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': window.ziweiCalData.nonce
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`API 請求失敗: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Internal computation logic using client-side adapter
     * @param {Object} formData
     * @returns {Promise<Object>}
     */
    async function computeChartInternal(formData) {
        const adapter = window.ziweiAdapter;
        if (!adapter?.calculate) {
            throw new Error('計算模組尚未載入，無法進行排盤計算');
        }
    
        try {
            return adapter.calculate(formData);
        } catch (error) {
            console.error('[ziweiCalculator] Client-side calculation failed:', error);
            throw error;
        }
    }

    /**
     * Main computation with caching
     * @param {Object} formData
     * @returns {Promise<Object>}
     */
    async function computeChartWithCache(formData) {
        const startTime = performance.now();
    
        const adapter = window.ziweiAdapter;
        if (!adapter?.normalizeInput || !adapter?.calculate) {
            throw new Error('資料轉換模組尚未載入');
        }
    
        const cacheKey = getCacheKey(formData);
        const cachedResult = getCachedResult(cacheKey);
    
        if (cachedResult) {
            return handleCacheHit(cachedResult, formData, startTime);
        }
    
        return handleCacheMiss(formData, cacheKey, adapter, startTime);
    }

    /**
     * Handle cache hit scenario
     */
    function handleCacheHit(cachedResult, formData, startTime) {
        // Build display output with current user data from formData (not cached normalizedInput)
        // This ensures name/gender/birthplace are always fresh from the current form submission
        const displayOutput = buildDisplayOutputWithFormData(
            cachedResult.adapterOutput,
            cachedResult.normalizedInput,
            formData
        );
    
        emitChartEvent('ziwei-chart-generated', {
            adapterOutput: displayOutput,
            calcResult: cachedResult.calcResult
        });
    
        return {
            calcResult: cachedResult.calcResult,
            normalizedInput: cachedResult.normalizedInput,
            adapterOutput: displayOutput
        };
    }

    /**
     * Handle cache miss scenario
     */
    async function handleCacheMiss(formData, cacheKey, adapter, startTime) {
        const normalizedInput = adapter.normalizeInput(formData);
    
        // Store form input reference
        const utils = window.ziweiAdapterUtils;
        if (utils) {
            utils.setStorageValue(ADAPTER_KEYS.FORM_INPUT, normalizedInput.raw || formData);
        }
    
        const calcResult = await computeChartInternal(formData);
    
        // Handle API error responses
        if (calcResult && calcResult.success === false) {
            const adapterOutput = { errors: { api: calcResult.message || 'API error' } };
            return { calcResult, normalizedInput, adapterOutput };
        }
    
        // Use the calculation result directly
        const adapterOutput = calcResult;
    
        // Build display output
        const displayOutput = buildDisplayOutput(adapterOutput, normalizedInput);
    
        // Store sanitized data
        persistComputationResult(adapter, normalizedInput, adapterOutput, calcResult);
    
        // Cache the result
        setCachedResult(cacheKey, { calcResult, adapterOutput, normalizedInput });
    
        // Persist current chart
        if (typeof adapter.setCurrentChart === 'function') {
            adapter.setCurrentChart(adapterOutput);
        }
    
        // Emit events
        if (adapterOutput?.errors && Object.keys(adapterOutput.errors).length) {
            emitChartEvent('ziwei-chart-error', {
                adapterOutput: displayOutput,
                calcResult,
                errors: adapterOutput.errors
            });
        }
    
        emitChartEvent('ziwei-chart-generated', {
            adapterOutput: displayOutput,
            calcResult
        });
    
        return { calcResult, normalizedInput, adapterOutput: displayOutput };
    }

    /**
     * Build display output with user data overlaid
     */
    function buildDisplayOutput(adapterOutput, normalizedInput) {
        if (!adapterOutput) return null;

        const displayOutput = Object.assign({}, adapterOutput);
        if (displayOutput.meta && normalizedInput?.meta) {
            displayOutput.meta = Object.assign({}, displayOutput.meta, {
                name: normalizedInput.meta.name,
                birthplace: normalizedInput.meta.birthplace,
                gender: normalizedInput.meta.gender
            });
        }
        
        return displayOutput;
    }

    /**
     * Build display output with user data from current formData (for cache hit scenarios)
     * This ensures personal info (name, gender, birthplace) is always fresh from the current submission
     * @param {Object} adapterOutput - Cached adapter output
     * @param {Object} normalizedInput - Cached normalized input (may have stale personal info)
     * @param {Object} formData - Current form submission data with fresh personal info
     * @returns {Object} Display output with fresh personal info
     */
    function buildDisplayOutputWithFormData(adapterOutput, normalizedInput, formData) {
        if (!adapterOutput) return null;

        const displayOutput = Object.assign({}, adapterOutput);
        
        // Use formData for personal info (name, gender, birthplace) - always fresh from current submission
        // Use normalizedInput/adapterOutput for calculated data (dates, lunar info, etc.)
        if (displayOutput.meta) {
            displayOutput.meta = Object.assign({}, displayOutput.meta, {
                name: formData?.name || normalizedInput?.meta?.name || displayOutput.meta.name,
                birthplace: formData?.birthplace || normalizedInput?.meta?.birthplace || displayOutput.meta.birthplace,
                gender: formData?.gender || normalizedInput?.meta?.gender || displayOutput.meta.gender
            });
        }
        
        return displayOutput;
    }

    /**
     * Persist computation result to adapter storage (sanitized)
     */
    function persistComputationResult(adapter, normalizedInput, adapterOutput, calcResult) {
        const storage = adapter?.storage;
        if (!storage || typeof storage.set !== 'function') return;

        const sanitizedNormalized = sanitizeFormForStorage(normalizedInput);
        const sanitizedOutput = sanitizeAdapterOutput(adapterOutput);

        storage.set(ADAPTER_KEYS.NORMALIZED_INPUT, sanitizedNormalized);
        storage.set(ADAPTER_KEYS.ADAPTER_OUTPUT, sanitizedOutput);
        storage.set(ADAPTER_KEYS.CALC_RESULT, calcResult);
        
        if (sanitizedOutput?.meta) {
            storage.set(ADAPTER_KEYS.META, sanitizedOutput.meta);
        }
    }

    /**
     * Sanitize adapter output for storage
     */
    function sanitizeAdapterOutput(output) {
        if (!output) return null;

        const sanitized = Object.assign({}, output);
        if (sanitized.meta) {
            const metaCopy = Object.assign({}, sanitized.meta);
            delete metaCopy.name;
            delete metaCopy.birthplace;
            delete metaCopy.gender;
            sanitized.meta = metaCopy;
        }
        return sanitized;
    }

    /**
     * Emit chart event
     */
    function emitChartEvent(eventName, detail) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    // ============================================================================
    // Display Functions
    // ============================================================================

    /**
     * Show chart from calculation result
     * @param {Object} chartData
     * @returns {HTMLElement}
     */
    function showChart(chartData) {
        if (!window.ziweiChart?.draw) {
            throw new Error('Chart renderer not loaded');
        }
        return window.ziweiChart.draw(chartData);
    }

    /**
     * Update display with new chart element
     * @param {HTMLElement} chartElement
     * @returns {Promise<void>}
     */
    async function updateDisplay(chartElement) {
        const form = document.getElementById('ziwei-cal-form');

        if (!form) {
            // Already in chart mode - replace in place
            const existingChart = document.querySelector('[data-ziwei-chart="1"]');
            if (existingChart?.parentNode) {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                chartElement.setAttribute('data-ziwei-chart', '1');
                existingChart.parentNode.replaceChild(chartElement, existingChart);

                window.scrollTo(scrollLeft, scrollTop);
            }
            return;
        }

        // Transition from form to chart
        chartElement.setAttribute('data-ziwei-chart', '1');
        const container = form.parentNode;
        
        // Update container mode to 'chart' for CSS styling
        if (container && container.hasAttribute('data-ziwei-mode')) {
            container.setAttribute('data-ziwei-mode', 'chart');
        }
        
        // 建立控制列
        if (window.ziweiControl && typeof window.ziweiControl.createBar === 'function') {
            window.ziweiControl.createBar({
                mountNode: container,
                beforeNode: form
            });
        }
        
        form.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 200));
        
        container.replaceChild(chartElement, form);
        chartElement.style.opacity = '0';
        
        requestAnimationFrame(() => {
            chartElement.style.transition = 'opacity 0.2s ease-out';
            chartElement.style.opacity = '1';
        });
    }

    // ============================================================================
    // Cycle State Management
    // ============================================================================

    /**
     * Capture current cycle view state
     * @returns {Object|null}
     */
    function captureCurrentCycleState() {
        const activeMajor = document.querySelector('.ziwei-major-cycle-button.active');
        const activeAnnual = document.querySelector('.ziwei-annual-cycle-button.active');

        if (!activeMajor && !activeAnnual) {
            return null;
        }

        return {
            majorCycleIndex: activeMajor?.dataset?.cycleIndex 
                ? parseInt(activeMajor.dataset.cycleIndex, 10) 
                : null,
            annualCycleAge: activeAnnual?.dataset?.age 
                ? parseInt(activeAnnual.dataset.age, 10) 
                : null,
            annualCycleYear: activeAnnual?.dataset?.year 
                ? parseInt(activeAnnual.dataset.year, 10) 
                : null
        };
    }

    /**
     * Restore cycle view state
     * @param {Object} cycleState
     */
    function restoreCycleState(cycleState) {
        if (!cycleState) return;

        if (cycleState.majorCycleIndex !== null) {
            const majorButton = document.querySelector(
                `.ziwei-major-cycle-button[data-cycle-index="${cycleState.majorCycleIndex}"]`
            );
            majorButton?.click();
        }

        if (cycleState.annualCycleAge !== null || cycleState.annualCycleYear !== null) {
            setTimeout(() => {
                let annualButton;
                if (cycleState.annualCycleAge !== null) {
                    annualButton = document.querySelector(
                        `.ziwei-annual-cycle-button[data-age="${cycleState.annualCycleAge}"]`
                    );
                } else if (cycleState.annualCycleYear !== null) {
                    annualButton = document.querySelector(
                        `.ziwei-annual-cycle-button[data-year="${cycleState.annualCycleYear}"]`
                    );
                }
                annualButton?.click();
            }, 50);
        }
    }

    // ============================================================================
    // Settings Change Handler
    // ============================================================================

    /**
     * Handle settings that affect calculation
     */
    function setupSettingsListener() {
        document.addEventListener('ziwei-setting-changed', async (e) => {
            const { setting } = e.detail || {};
            if (!CALCULATION_SETTINGS.includes(setting)) return;

            const utils = window.ziweiAdapterUtils;
            let formData = utils?.getStorageValue(ADAPTER_KEYS.FORM_INPUT);
            
            if (!formData) {
                const normalized = utils?.getStorageValue(ADAPTER_KEYS.NORMALIZED_INPUT);
                if (normalized?.raw) {
                    formData = normalized.raw;
                }
            }

            if (!formData) return;

            const cycleState = captureCurrentCycleState();
            if (cycleState) {
                formData._cycleStateToRestore = cycleState;
            }

            try {
                const result = await computeChartWithCache(formData);
                const chartElement = await showChart(result);
                await updateDisplay(chartElement);
            } catch (err) {
                console.error('[ziweiCalculator] Recomputation failed:', err);
            }
        });
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    function initialize() {
        setupSettingsListener();

        document.addEventListener('ziwei-form-submit', async (e) => {
            const { formData } = e.detail;
            console.log('[DEBUG] ziwei-form-submit received', { formData });

            if (window.ziweiForm?.saveState) {
                window.ziweiForm.saveState();
            }

            clearAdapterChartContext({ preserveFormInput: true });
            primeAdapterFormInput(formData);

            try {
                const result = await computeChartWithCache(formData);
                const chartElement = await showChart(result);
                await updateDisplay(chartElement);
            } catch (error) {
                console.error('[ziweiCalculator] Computation failed:', error);
                if (window.ziweiForm?.handleAdapterError) {
                    window.ziweiForm.handleAdapterError(error);
                }
            }
        });
    }

    // ============================================================================
    // Public API
    // ============================================================================

    window.ziweiCalculator = {
        compute: computeChartWithCache,
        clearCache: clearCalculationCache,
        getMilitaryHourIndex,
        showChart,
        updateDisplay,
        captureCurrentCycleState,
        restoreCycleState
    };

    window.submitToApi = submitToApi;

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})(window);
