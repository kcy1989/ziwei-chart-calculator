/**
 * Main calculator module for Ziwei Chart
 */

// ============================================================================
// Cache Layer & Performance Utilities
// ============================================================================

/**
 * LRU Cache for chart calculations
 * Stores complete calculation results to speed up repeated submissions
 */
const computeCache = new Map();
const CACHE_CONFIG = {
    maxSize: window?.ziweiConstants?.PERF_CONFIG?.CACHE_MAX_SIZE ?? 50,
    debug: window?.ziweiConstants?.DEBUG?.CALCULATOR ?? false
};

const ADAPTER_CONTEXT_KEYS = Object.freeze([
    'adapterOutput',
    'calcResult',
    'normalizedInput',
    'meta',
    'raw'
]);

function clearAdapterChartContext(options = {}) {
    const { preserveFormInput = false } = options || {};
    const adapter = window.ziweiAdapter;
    const storage = adapter?.storage;
    if (!storage || typeof storage.remove !== 'function') {
        return;
    }
    ADAPTER_CONTEXT_KEYS.forEach((key) => {
        try {
            storage.remove(key);
        } catch (err) {
            if (CACHE_CONFIG.debug) {
                console.warn('[ziweiCalculator] Failed to clear adapter context key', key, err);
            }
        }
    });
    if (!preserveFormInput) {
        try {
            storage.remove('formInput');
        } catch (err2) {
            if (CACHE_CONFIG.debug) {
                console.warn('[ziweiCalculator] Failed to clear adapter formInput', err2);
            }
        }
    }
}

function primeAdapterFormInput(formData) {
    const adapter = window.ziweiAdapter;
    const storage = adapter?.storage;
    if (!storage || typeof storage.set !== 'function') {
        return;
    }
    try {
        if (formData) {
            storage.set('formInput', Object.assign({}, formData));
        }
    } catch (err) {
        if (CACHE_CONFIG.debug) {
            console.warn('[ziweiCalculator] Failed to prime adapter formInput snapshot', err);
        }
    }
}

/**
 * Generate cache key from form input
 * Uses only critical fields: birthDate, birthTime, gender, calendarType, leapMonth
 * @param {Object} formData The form data object
 * @returns {string} Cache key for lookup
 */
function getCacheKey(formData) {
    if (!formData) return '';

    const solar = formData.solar || formData;
    const meta = formData.meta || {};

    const key = [
        solar.year,
        solar.month,
        solar.day,
        solar.hour,
        solar.minute,
        meta.gender || formData.gender || 'unknown',
        meta.calendarType || formData.calendarType || 'solar',
        // Include leapMonthHandling in cache key so different handling modes produce distinct keys
        (meta.leapMonthHandling !== undefined && meta.leapMonthHandling !== null)
            ? String(meta.leapMonthHandling)
            : (formData.leapMonthHandling !== undefined && formData.leapMonthHandling !== null)
                ? String(formData.leapMonthHandling)
                : (meta.leapMonth || formData.leapMonth ? 'leap' : 'noleap')
    ].join('|');
    // Also include ziHourHandling (子時處理) so choosing ziChange vs midnightChange
    // produces different cache keys and forces recompute when the mode changes.
    var ziHandling = (meta.ziHourHandling !== undefined && meta.ziHourHandling !== null)
        ? String(meta.ziHourHandling)
        : (formData.ziHourHandling !== undefined && formData.ziHourHandling !== null)
            ? String(formData.ziHourHandling)
            : 'midnightChange';
    return key + '|' + ziHandling;
}

/**
 * Prune cache if size exceeds limit
 * Removes oldest entry (FIFO via Map iteration)
 */
function pruneCacheIfNeeded() {
    if (computeCache.size >= CACHE_CONFIG.maxSize) {
        const firstKey = computeCache.keys().next().value;
        computeCache.delete(firstKey);
        if (CACHE_CONFIG.debug) {
            console.log('[ziweiCalculator] Cache pruned, removed oldest entry');
        }
    }
}

/**
 * Clear all cached computation results
 * @returns {void}
 */
function clearCalculationCache() {
    computeCache.clear();
    if (CACHE_CONFIG.debug) {
        console.log('[ziweiCalculator] Cache cleared');
    }
}

/**
 * Get cached computation result if available
 * @param {string} cacheKey The cache key
 * @returns {Object|null} Cached result or null if not found
 */
function getCachedResult(cacheKey) {
    if (!cacheKey || !computeCache.has(cacheKey)) {
        return null;
    }
    const cached = computeCache.get(cacheKey);
    if (CACHE_CONFIG.debug) {
        console.log('[ziweiCalculator] Cache HIT for key:', cacheKey);
    }
    return cached;
}

/**
 * Store computation result in cache
 * @param {string} cacheKey The cache key
 * @param {Object} result The computation result to cache
 * @returns {void}
 */
function setCachedResult(cacheKey, result) {
    if (!cacheKey) return;
    pruneCacheIfNeeded();
    computeCache.set(cacheKey, result);
    if (CACHE_CONFIG.debug) {
        console.log('[ziweiCalculator] Cache MISS, storing result for key:', cacheKey, 'Cache size:', computeCache.size);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Calculator initializing...');
    
    // Initialize form handling
    window.ziweiForm.init();
    console.log('Form initialized');

    // Get container element
    const container = document.querySelector('.ziwei-cal');
    if (!container) {
        console.error('Container not found: .ziwei-cal');
        return;
    }

    // Add form submission event listener
    container.addEventListener('ziwei-form-submit', async (e) => {
        console.log('Form submission event received:', e.detail);
        const { formData } = e.detail;

        // Save form state for back button
        if (window.ziweiForm && typeof window.ziweiForm.saveState === 'function') {
            window.ziweiForm.saveState();
        }

        // Adapter should forget previous chart context and accept the new form payload immediately
        clearAdapterChartContext({ preserveFormInput: true });
        primeAdapterFormInput(formData);

        try {
            // Make API request with cache support
            const calculationResult = await computeChartWithCache(formData);

            // Update chart display
            console.log('Drawing chart...');
            const chartHtml = await showChart(calculationResult);
            console.log('Chart element created:', chartHtml);
            await updateDisplay(chartHtml, calculationResult);

        } catch (err) {
            console.error('排盤錯誤:', err);
            const adapterErrors = window.ziweiAdapter?.errors;
            if (adapterErrors?.isAdapterError && adapterErrors.isAdapterError(err) && window.ziweiForm?.handleAdapterError) {
                window.ziweiForm.handleAdapterError(err);
            } else {
                window.ziweiForm.showError(err.message || '排盤時發生錯誤');
            }
        }
    });

    // Handle control bar button clicks via event delegation
    // (Settings button is handled internally by control.js)
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('.ziwei-back-btn');
        if (backBtn) {
            clearAdapterChartContext();
            const chartContainer = document.querySelector('[data-ziwei-chart]');
            if (chartContainer) {
                window.ziweiForm.restoreForm(chartContainer);
            }
            return;
        }

        const prevBtn = e.target.closest('.ziwei-control-prev-hour');
        if (prevBtn) {
            document.dispatchEvent(new CustomEvent('ziwei-control-prev-hour'));
            console.log('Control bar: previous hour requested');
            return;
        }

        const nextBtn = e.target.closest('.ziwei-control-next-hour');
        if (nextBtn) {
            document.dispatchEvent(new CustomEvent('ziwei-control-next-hour'));
            console.log('Control bar: next hour requested');
            return;
        }
    });
});

// ============================================================================
// Computation Functions with Cache Support
// ============================================================================

/**
 * Internal computation logic (original DOMContentLoaded handler extracted)
 * Performs lunar conversion and API submission
 * @param {Object} formData The form data to compute
 * @returns {Promise<Object>} The chart data from API
 */
function buildApiPayload(normalizedInput) {
    if (!normalizedInput || !normalizedInput.meta || !normalizedInput.solar) {
        throw new Error('資料轉換錯誤，缺少必要欄位');
    }

    const solar = normalizedInput.solar;
    const meta = normalizedInput.meta;

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

async function computeChartInternal(normalizedInput) {
    const apiPayload = buildApiPayload(normalizedInput);
    console.log('Submitting to API with data:', apiPayload);
    const chartData = await window.submitToApi(apiPayload);
    console.log('API response:', chartData);

    if (!chartData) {
        throw new Error('無效的伺服器回應');
    }

    return chartData;
}

/**
 * Computation with caching support
 * Checks cache first, then performs computation if needed
 * @param {Object} formData The form data to compute
 * @returns {Promise<Object>} The chart data from API or cache
 */
async function computeChartWithCache(formData) {
    const startTime = performance.now();
    
    try {
        // Short debug to trace calls coming from settings changes (ziChange)
        if (CACHE_CONFIG.debug) {
            try {
                console.log('[ziweiCalculator] computeChartWithCache called with formData (short):', {
                    birthdate: formData && (formData.birthdate || formData.date) || null,
                    birthtime: formData && (formData.birthtime || formData.time) || null,
                    year: formData && formData.year,
                    month: formData && formData.month,
                    day: formData && formData.day,
                    hour: formData && formData.hour,
                    minute: formData && formData.minute,
                    ziHourHandling: formData && formData.ziHourHandling
                });
            } catch (dbg) {}
        }
        const adapter = window.ziweiAdapter;
        if (!adapter || !adapter.input || !adapter.output) {
            throw new Error('資料轉換模組尚未載入');
        }
            // Ensure ziHourHandling is preserved across flows (settings live outside the form)
            // ziHourHandling resolution is handled by adapter.input.normalize which
            // already consults adapter.settings; no need to read legacy sessionStorage here.

            const normalizedInput = adapter.input.normalize(formData);
        // Keep a copy of the latest normalized raw form data in adapter storage
        try {
            if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
                adapter.storage.set('formInput', normalizedInput.raw ? Object.assign({}, normalizedInput.raw) : Object.assign({}, formData));
            }
        } catch (e) {}
        const cacheKey = getCacheKey(normalizedInput);

        const cachedResult = getCachedResult(cacheKey);
        if (cachedResult) {
            const duration = (performance.now() - startTime).toFixed(2);
            if (CACHE_CONFIG.debug) {
                console.log(`[ziweiCalculator] Cache hit, returned in ${duration}ms`);
            }
                // Persist the cached context into adapter storage so other UI flows
                // (settings, hide/show) can rely on consistent adapter-provided fields.
                try {
                    if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
                        adapter.storage.set('normalizedInput', normalizedInput);
                        adapter.storage.set('adapterOutput', cachedResult.adapterOutput);
                        adapter.storage.set('calcResult', cachedResult.calcResult);
                        if (cachedResult.adapterOutput && cachedResult.adapterOutput.meta) adapter.storage.set('meta', cachedResult.adapterOutput.meta);
                    }
                } catch (e) {}

                return {
                    calcResult: cachedResult.calcResult,
                    normalizedInput: normalizedInput,
                    adapterOutput: cachedResult.adapterOutput
                };
        }

        if (CACHE_CONFIG.debug) {
            console.log('[ziweiCalculator] Cache miss, computing...');
        }

        const calcResult = await computeChartInternal(normalizedInput);
        const adapterOutput = adapter.output.process(calcResult, normalizedInput);
        const duration = performance.now() - startTime;

            // Persist computed context into adapter storage for UI flows and snapshotting
            try {
                if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
                    adapter.storage.set('normalizedInput', normalizedInput);
                    adapter.storage.set('adapterOutput', adapterOutput);
                    adapter.storage.set('calcResult', calcResult);
                    if (adapterOutput && adapterOutput.meta) adapter.storage.set('meta', adapterOutput.meta);
                }
            } catch (e) {}

            setCachedResult(cacheKey, {
                calcResult,
                adapterOutput
            });

        if (CACHE_CONFIG.debug) {
            console.log(`[ziweiCalculator] Computation completed in ${duration.toFixed(2)}ms`);
        }

        return {
            calcResult,
            normalizedInput,
            adapterOutput
        };
    } catch (error) {
        if (CACHE_CONFIG.debug) {
            console.log('[ziweiCalculator] Computation failed:', error);
        }
        throw error;
    }
}

/**
 * Submit form data to WordPress API
 * @param {Object} formData The form values to submit
 * @returns {Promise<Object>} API response data
 */
window.submitToApi = async function submitToApi(formData) {
    try {
        if (!window.ziweiCalData?.restUrl) {
            throw new Error('REST API 設定缺失，請重新載入頁面');
        }

    // Submission debug logs removed to reduce console noise
        
        const response = await fetch(window.ziweiCalData.restUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': window.ziweiCalData.nonce
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success && result.data) {
            throw new Error(result.data);
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        let message = '無法連接到伺服器，請稍後再試';

        if (error instanceof Error && error.message) {
            if (error.message.includes('Failed to fetch')) {
                message = '無法連線到伺服器，請確認網路或稍後再試';
            } else {
                message = error.message;
            }
        }

        throw new Error(message);
    }
}


/**
 * Call the chart renderer module to generate chart HTML
 * @param {Object} chartData The data returned from API
 * @returns {Promise<HTMLElement>} The chart element
 */
window.showChart = async function showChart(chartData) {
    try {
        // If the caller passed the full computation wrapper { calcResult, adapterOutput }
        // prefer adapterOutput so the renderer uses the client-side normalized data
        // (which may include ziHour or leap-month adjustments). Fall back to the
        // provided chartData if adapterOutput isn't present.
        if (chartData && chartData.adapterOutput) {
            if (CACHE_CONFIG.debug) console.log('[ziweiCalculator] showChart forwarding adapterOutput + calcResult wrapper to renderer');
            return window.ziweiChart.draw(chartData);
        }
        if (CACHE_CONFIG.debug) console.log('[ziweiCalculator] showChart forwarding provided chartData to renderer');
        return window.ziweiChart.draw(chartData);
    } catch (err) {
        console.error('[ziweiCalculator] showChart wrapper failed:', err);
        throw err;
    }
}

/**
 * Update the display with new chart HTML with transition
 * @param {HTMLElement} chartElement The chart element to display
 * @returns {Promise<void>}
 */
async function updateDisplay(chartElement, _calculationResult) {
    const form = document.getElementById('ziwei-cal-form');
    if (!form) {
        // No form present (chart-only view or settings-triggered compute).
        // Calculator should not assume a form exists; adapter storage is the
        // canonical source of truth and has already been populated by the
        // compute pipeline. Prefer letting the display layer update itself.
        // Try control.updateChartDisplay first (display helper). If not
        // available, emit an event so display modules can react and read from
        // adapter.storage. Do NOT perform display formatting here.
        try {
            if (window.ziweiControl && typeof window.ziweiControl.updateChartDisplay === 'function') {
                try {
                    window.ziweiControl.updateChartDisplay(chartElement, _calculationResult);
                    return;
                } catch (err) {
                    console.warn('[ziweiCalculator] ziweiControl.updateChartDisplay failed:', err);
                }
            }
        } catch (e) {
            // ignore
        }

        try {
            document.dispatchEvent(new CustomEvent('ziwei-chart-ready', { detail: { chartElement, calculationResult: _calculationResult } }));
        } catch (e) {
            // ignore dispatch errors
        }

        // Nothing more to do in calculator when no form is present.
        return;
    }
    const container = form.closest('.ziwei-cal');
    
    // Set chart mode BEFORE replacing the form, so CSS selectors work immediately
    if (container) {
        container.setAttribute('data-ziwei-mode', 'chart');
    }
    
    // Fade out form
    form.style.transition = 'opacity 200ms ease';
    form.style.opacity = '0';
    
    // Wait a total of 500ms (includes fade-out) before showing the chart
    // — keeps calculations running while providing a short display pause.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark the chart element so the back button handler can find it
    chartElement.setAttribute('data-ziwei-chart', '1');

    if (window.ziweiControl && typeof window.ziweiControl.createBar === 'function') {
        window.ziweiControl.createBar({
            mountNode: form.parentNode,
            beforeNode: form
        });
    } else {
        console.warn('ziweiControl module not available; control bar not rendered.');
    }
    
    // Replace the form with the chart element directly (after controls)
    form.replaceWith(chartElement);

    // Fade-in effect for the chart element
    requestAnimationFrame(() => {
        chartElement.style.transition = 'opacity 200ms ease';
        requestAnimationFrame(() => {
            chartElement.style.opacity = '1';
        });
    });
}

// ============================================================================
// Public API Export
// ============================================================================

/**
 * Public calculator API
 */
window.ziweiCalculator = {
    compute: computeChartWithCache,
    clearCache: clearCalculationCache
};

/**
 * Convert birth time (HH:MM) to military hour index (0-11)
 * Military hours (十二時辰): 子(23-1), 丑(1-3), 寅(3-5), ... 亥(21-23)
 * Index 0=子, 1=丑, 2=寅, ... 11=亥
 * @param {string} timeStr Birth time in format "HH:MM"
 * @returns {number} Military hour index (0-11), defaults to 0 if invalid
 */
function getMilitaryHourIndex(timeStr) {
    if (!timeStr) return 0;  // Default to 子 (midnight)
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    if (isNaN(hour)) return 0;
    if (hour === 0 || hour === 23) return 0; // 子
    if (hour >= 1 && hour < 3) return 1;      // 丑
    if (hour >= 3 && hour < 5) return 2;      // 寅
    if (hour >= 5 && hour < 7) return 3;      // 卯
    if (hour >= 7 && hour < 9) return 4;      // 辰
    if (hour >= 9 && hour < 11) return 5;     // 巳
    if (hour >= 11 && hour < 13) return 6;    // 午
    if (hour >= 13 && hour < 15) return 7;    // 未
    if (hour >= 15 && hour < 17) return 8;    // 申
    if (hour >= 17 && hour < 19) return 9;    // 酉
    if (hour >= 19 && hour < 21) return 10;   // 戌
    if (hour >= 21 && hour < 23) return 11;   // 亥
    return 0;  // Default fallback
}


if (typeof window !== 'undefined') {
    window.ziweiCalculator = window.ziweiCalculator || {};
    window.ziweiCalculator.compute = computeChartWithCache;
    window.ziweiCalculator.clearCache = clearCalculationCache;
    window.ziweiCalculator.getMilitaryHourIndex = getMilitaryHourIndex;
    if (CACHE_CONFIG.debug) {
        console.log('[ziweiCalculator] Window export complete');
    }
}
