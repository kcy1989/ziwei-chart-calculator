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
    return key;
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
        const adapter = window.ziweiAdapter;
        if (!adapter || !adapter.input || !adapter.output) {
            throw new Error('資料轉換模組尚未載入');
        }

        const normalizedInput = adapter.input.normalize(formData);
        const cacheKey = getCacheKey(normalizedInput);

        const cachedResult = getCachedResult(cacheKey);
        if (cachedResult) {
            const duration = (performance.now() - startTime).toFixed(2);
            if (CACHE_CONFIG.debug) {
                console.log(`[ziweiCalculator] Cache hit, returned in ${duration}ms`);
            }
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

        console.log('Submitting to:', window.ziweiCalData.restUrl);
        console.log('Form data:', formData);
        
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
    return window.ziweiChart.draw(chartData);
}

/**
 * Update the display with new chart HTML with transition
 * @param {HTMLElement} chartElement The chart element to display
 * @returns {Promise<void>}
 */
async function updateDisplay(chartElement, _calculationResult) {
    const form = document.getElementById('ziwei-cal-form');
    if (!form) {
        throw new Error('Form element not found');
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
