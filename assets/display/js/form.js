/**
 * Form Input and Validation Module
 * 
 * Handles birth data input form: field validation, calendar type switching,
 * date/time selection, and form submission to API.
 * 
 * Dependencies:
 * - assets/data/constants.js (ziweiConstants)
 * 
 * Corresponding CSS: assets/display/css/form.css
 * 
 * Exports: window.ziweiForm
 */

(function() {
'use strict';

// Prevent multiple loads
if (window.ziweiFormLoaded) {
    return;
}
window.ziweiFormLoaded = true;

// Initialize constants early to avoid reference errors
let constants = window.ziweiConstants;
const DEBUG_FORM = constants?.DEBUG?.FORM || false;

// ============================================================================
// Module State & Constants
// ============================================================================

const state = {
    isInitialized: false,
    isSubmitting: false,
    form: null,
    inputs: [],
    inputMap: new Map(),
    submitBtn: null,
    lastValues: null,
    listeners: [],
    debounceTimers: new Map(),
    savedFormClone: null
};

// ============================================================================
// DOM Cache
// ============================================================================

let _domCache = {
    yearSelect: null,
    monthSelect: null,
    daySelect: null,
    hourSelect: null,
    minuteSelect: null,
    formContainer: null,
    genderGroup: null
};

// ============================================================================
// Logging Utilities
// ============================================================================

function log(...args) {
    if (DEBUG_FORM) {
        console.log('[ziwei-form]', ...args);
    }
}

function warn(...args) {
    if (DEBUG_FORM) {
        console.warn('[ziwei-form]', ...args);
    }
}

function err(...args) {
    console.error('[ziwei-form]', ...args);
}

// ============================================================================
// Share Link URL Parameter Handling
// ============================================================================

/**
 * Parse share link URL parameters
 * @returns {Object|null} Parsed parameters or null if invalid/missing
 */
function parseShareLinkParameters() {
    const searchParams = window.location.search;
    if (!searchParams || searchParams.length < 2) {
        return null;
    }

    try {
        const params = new URLSearchParams(searchParams);
        
        // Check for required parameters
        // Parameters use bd_ prefix to avoid WordPress reserved parameters
        // Shortened keys: bd_g=gender, bd_y=year, bd_m=month, bd_d=day, bd_h=hour, bd_i=minute
        const gender = params.get('bd_g');
        const year = params.get('bd_y');
        const month = params.get('bd_m');
        const day = params.get('bd_d');
        const hour = params.get('bd_h');
        const minute = params.get('bd_i');

        // Validate required fields exist
        if (!gender || !year || !month || !day || hour === null || minute === null) {
            log('Share link missing required parameters');
            return null;
        }

        // Parse and validate numeric values
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        const hourNum = parseInt(hour, 10);
        const minuteNum = parseInt(minute, 10);

        // Validate ranges
        if (yearNum < 800 || yearNum > 2200) {
            warn('Invalid year in share link:', yearNum);
            return null;
        }
        if (monthNum < 1 || monthNum > 12) {
            warn('Invalid month in share link:', monthNum);
            return null;
        }
        if (dayNum < 1 || dayNum > 31) {
            warn('Invalid day in share link:', dayNum);
            return null;
        }
        if (hourNum < 0 || hourNum > 23) {
            warn('Invalid hour in share link:', hourNum);
            return null;
        }
        if (minuteNum < 0 || minuteNum > 59) {
            warn('Invalid minute in share link:', minuteNum);
            return null;
        }

        // Validate gender
        const normalizedGender = gender.toUpperCase();
        if (normalizedGender !== 'M' && normalizedGender !== 'F') {
            warn('Invalid gender in share link:', gender);
            return null;
        }

        // Build result object
        const result = {
            gender: normalizedGender,
            year: yearNum,
            month: monthNum,
            day: dayNum,
            hour: hourNum,
            minute: minuteNum
        };

        // Optional parameters (bd_n=name, bd_p=place)
        const name = params.get('bd_n');
        if (name) {
            result.bd_name = decodeURIComponent(name).trim();
        }

        const birthplace = params.get('bd_p');
        if (birthplace) {
            result.bd_place = decodeURIComponent(birthplace).trim();
        }

        // Settings
        const ziHourHandling = params.get('ziHourHandling');
        if (ziHourHandling === 'ziChange' || ziHourHandling === 'midnightChange') {
            result.ziHourHandling = ziHourHandling;
        }

        const leapMonthHandling = params.get('leapMonthHandling');
        if (leapMonthHandling === 'mid' || leapMonthHandling === 'current' || leapMonthHandling === 'next') {
            result.leapMonthHandling = leapMonthHandling;
        }

        log('Parsed share link parameters:', result);
        return result;

    } catch (error) {
        err('Error parsing share link parameters:', error);
        return null;
    }
}

/**
 * Pre-fill form fields from share link parameters
 * @param {Object} params Parsed share link parameters
 */
function prefillFromShareLink(params) {
    if (!params) return;

    log('Pre-filling form from share link...');

    // Pre-fill gender
    if (params.gender) {
        const genderRadio = document.getElementById(params.gender === 'M' ? 'ziwei-male' : 'ziwei-female');
        if (genderRadio) {
            genderRadio.checked = true;
        }
    }

    // Pre-fill date/time using cached DOM elements
    if (_domCache.yearSelect && params.year) {
        _domCache.yearSelect.value = String(params.year);
    }
    if (_domCache.monthSelect && params.month) {
        _domCache.monthSelect.value = String(params.month);
    }
    if (_domCache.daySelect && params.day) {
        _domCache.daySelect.value = String(params.day);
    }
    if (_domCache.hourSelect && params.hour !== undefined) {
        _domCache.hourSelect.value = String(params.hour);
    }
    if (_domCache.minuteSelect && params.minute !== undefined) {
        // Round to nearest 5-minute interval for select compatibility
        const roundedMinute = Math.floor(params.minute / 5) * 5;
        _domCache.minuteSelect.value = String(roundedMinute);
    }

    // Pre-fill optional text fields
    if (params.bd_name) {
        const nameInput = document.getElementById('ziwei-name');
        if (nameInput) {
            nameInput.value = params.bd_name;
        }
    }
    if (params.bd_place) {
        const birthplaceInput = document.getElementById('ziwei-birthplace');
        if (birthplaceInput) {
            birthplaceInput.value = params.bd_place;
        }
    }

    // Apply settings to adapter if available
    if (window.ziweiAdapter && window.ziweiAdapter.settings) {
        if (params.ziHourHandling) {
            window.ziweiAdapter.settings.set('ziHourHandling', params.ziHourHandling);
        }
        if (params.leapMonthHandling) {
            window.ziweiAdapter.settings.set('leapMonthHandling', params.leapMonthHandling);
        }
    }

    log('Form pre-filled from share link');
}

/**
 * Check for share link parameters and auto-submit if valid
 */
function checkAndProcessShareLink() {
    const params = parseShareLinkParameters();
    if (!params) {
        return;
    }

    log('Valid share link detected, processing...');

    // Ensure form and DOM cache are ready
    if (!state.form || !_domCache.yearSelect) {
        warn('Form not ready for share link processing, retrying...');
        setTimeout(() => checkAndProcessShareLink(), 100);
        return;
    }

    // Pre-fill form fields
    prefillFromShareLink(params);

    // Show indicator that we're loading from share link
    showShareLinkIndicator();

    // Clear URL parameters to prevent re-submission on refresh
    // Use replaceState to avoid adding to browser history
    try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {
        log('Could not clear URL parameters:', e);
    }

    // Auto-submit after a short delay to ensure form is ready
    setTimeout(() => {
        log('Auto-submitting form from share link...');
        // Create a synthetic event for handleSubmit
        const syntheticEvent = {
            preventDefault: () => {},
            target: state.form
        };
        handleSubmit(syntheticEvent);
    }, 300);
}

/**
 * Show indicator that chart is being loaded from a share link
 */
function showShareLinkIndicator() {
    const formContainer = _domCache.formContainer || document.querySelector('.ziwei-cal');
    if (!formContainer) return;

    const indicator = document.createElement('div');
    indicator.className = 'ziwei-share-link-indicator';
    indicator.innerHTML = `
        <span class="ziwei-share-link-icon">🔗</span>
        <span class="ziwei-share-link-text">正在載入分享連結的命盤...</span>
    `;
    indicator.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
        animation: pulse 1.5s ease-in-out infinite;
    `;

    // Add pulse animation if not exists
    if (!document.querySelector('#ziwei-share-link-styles')) {
        const style = document.createElement('style');
        style.id = 'ziwei-share-link-styles';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    }

    const form = formContainer.querySelector('form');
    if (form) {
        form.insertAdjacentElement('beforebegin', indicator);
    } else {
        formContainer.prepend(indicator);
    }

    // Remove indicator after form submission completes
    const removeIndicator = () => {
        indicator.style.transition = 'opacity 0.3s ease';
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
        document.removeEventListener('ziwei-chart-generated', removeIndicator);
        document.removeEventListener('ziwei-chart-error', removeIndicator);
    };
    document.addEventListener('ziwei-chart-generated', removeIndicator, { once: true });
    document.addEventListener('ziwei-chart-error', removeIndicator, { once: true });
}

// ============================================================================
// Initialization & Cleanup
// ============================================================================

/**
 * Initialize form event handlers (idempotent)
 */
function initForm() {
    if (state.isInitialized) {
        if (DEBUG_FORM) console.log('[form.js] initForm already done, skip');
        return;
    }
    if (DEBUG_FORM) console.log('[form.js] initForm START');
    log('Initializing form...');
    
    const form = document.getElementById('ziwei-cal-form');
    if (!form) {
        err('Form element not found');
        return;
    }
    
    // Prevent duplicate initialization
    if (state.isInitialized) {
        log('Form already initialized, skipping');
        return;
    }
    
    // Cache form and elements
    state.form = form;
    state.inputs = Array.from(form.querySelectorAll('input, select, textarea'));
    state.submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    
    // Initialize DOM cache for frequently accessed elements
    _domCache.yearSelect = document.getElementById('ziwei-birth-year');
    _domCache.monthSelect = document.getElementById('ziwei-birth-month');
    _domCache.daySelect = document.getElementById('ziwei-birth-day');
    _domCache.hourSelect = document.getElementById('ziwei-birth-hour');
    _domCache.minuteSelect = document.getElementById('ziwei-birth-minute');
    _domCache.formContainer = document.querySelector('.ziwei-cal');
    _domCache.genderGroup = document.querySelector('.ziwei-cal-gender-group');
    
    // Build input map for fast lookup
    state.inputMap.clear();
    for (let i = 0; i < state.inputs.length; i++) {
        const el = state.inputs[i];
        if (el.name) {
            state.inputMap.set(el.name, el);
        }
    }
    
    // Add ARIA attributes to required fields
    addFormA11yAttributes();
    
    // Pre-fill current date and time
    prefillCurrentDateTime();
    
    // Add focus event to year field - clear default year on first focus
    if (_domCache.yearSelect) {
        let yearCleared = false;
        _domCache.yearSelect.addEventListener('focus', function() {
            if (!yearCleared) {
                const currentYear = new Date().getFullYear();
                // Only clear if the value is the current year (pre-filled default)
                if (this.value === String(currentYear)) {
                    this.value = '';
                    yearCleared = true;
                }
            }
        }, { once: true });
    }
    
    // Register event listeners
    const handleReset = () => {
        // Re-fill date and time after form reset
        setTimeout(prefillCurrentDateTime, 0);
    };
    
    form.addEventListener('submit', (e) => {
        if (DEBUG_FORM) console.log('[form.js] Submit event attached and fired');
        handleSubmit(e);
    });
    form.addEventListener('input', handleInput, { passive: true });
    form.addEventListener('reset', handleReset);
    state.listeners.push(['submit', handleSubmit], ['input', handleInput], ['reset', handleReset]);
    
    if (DEBUG_FORM) console.log('[form.js] Caching submitBtn:', !!state.submitBtn, state.submitBtn);
    if (state.submitBtn) {
        if (DEBUG_FORM) console.log('[form.js] Direct click listener on submitBtn');
        state.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSubmit(e);
        });
    }

    // Global fallback for submit button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'ziwei-submit-btn') {
            if (DEBUG_FORM) console.log('[form.js] GLOBAL submitBtn click');
            e.preventDefault();
            handleSubmit(e);
        }
    }, true);

    state.isInitialized = true;
    log('Form initialized with', state.inputs.length, 'fields');

    // Listen for global calculation events so UI can respond to computed result
    document.addEventListener('ziwei-chart-generated', function (e) {
        // Calculation finished, ensure busy state cleared
        state.isSubmitting = false;
        toggleBusy(false);
    });
    // When there is an adapter-level error, show adapter error and clear busy state
    document.addEventListener('ziwei-chart-error', function (e) {
        try {
            const detail = e && e.detail ? e.detail : {};
            console.error('[ziweiForm] ziwei-chart-error event:', detail);
            if (detail.error && typeof window.ziweiForm?.handleAdapterError === 'function') {
                window.ziweiForm.handleAdapterError(detail.error);
            }
        } catch (err) {
            console.error('[ziweiForm] Error handling ziwei-chart-error:', err);
        } finally {
            state.isSubmitting = false;
            toggleBusy(false);
        }
    });

    // Check for share link URL parameters and auto-submit if valid
    checkAndProcessShareLink();
}

/**
 * Pre-fill current date and time with specific rounding for time
 * Time is rounded down to nearest 5-minute interval
 */
function prefillCurrentDateTime() {
    const now = new Date();
    
    // Get current date components
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-indexed
    const day = now.getDate();
    
    // Get current time and round down to nearest 5-minute interval
    let hour = now.getHours();
    let minute = now.getMinutes();
    minute = Math.floor(minute / 5) * 5;
    
    // Pre-fill using cached DOM elements
    if (_domCache.yearSelect) {
        _domCache.yearSelect.value = String(year);
        log(`Pre-filled year: ${year}`);
    }
    
    if (_domCache.monthSelect) {
        _domCache.monthSelect.value = String(month);
        log(`Pre-filled month: ${month}`);
    }
    
    if (_domCache.daySelect) {
        _domCache.daySelect.value = String(day);
        log(`Pre-filled day: ${day}`);
    }
    
    if (_domCache.hourSelect) {
        _domCache.hourSelect.value = String(hour);
        log(`Pre-filled hour: ${hour}`);
    }
    
    if (_domCache.minuteSelect) {
        _domCache.minuteSelect.value = String(minute);
        log(`Pre-filled minute: ${minute}`);
    }
}

/**
 * Pre-fill saved form data from localStorage
 */
function prefillSavedData() {
    try {
        const savedData = localStorage.getItem('ziwei-form-data');
        if (!savedData) return;
        
        const data = JSON.parse(savedData);
        if (!data || typeof data !== 'object') return;
        
        // Pre-fill name
        const nameInput = document.getElementById('ziwei-name');
        if (nameInput && data.name) {
            nameInput.value = data.name;
            log(`Pre-filled name: ${data.name}`);
        }
        
        // Pre-fill gender
        if (data.gender) {
            const genderInput = document.getElementById(`ziwei-${data.gender.toLowerCase()}`);
            if (genderInput) {
                genderInput.checked = true;
                log(`Pre-filled gender: ${data.gender}`);
            }
        }
        
        // Pre-fill birthplace
        const birthplaceInput = document.getElementById('ziwei-birthplace');
        if (birthplaceInput && data.birthplace) {
            birthplaceInput.value = data.birthplace;
            log(`Pre-filled birthplace: ${data.birthplace}`);
        }
        
        log('Pre-filled saved form data');
    } catch (e) {
        warn('Failed to prefill saved data:', e);
    }
}

/**
 * Cleanup form event handlers
 */
function destroyForm() {
    if (!state.form) return;
    
    log('Destroying form...');
    
    // Remove all event listeners
    for (let i = 0; i < state.listeners.length; i++) {
        const [type, fn] = state.listeners[i];
        state.form.removeEventListener(type, fn);
    }
    state.listeners = [];
    
    // Clear all debounce timers
    state.debounceTimers.forEach(id => clearTimeout(id));
    state.debounceTimers.clear();
    
    // Reset state
    state.isInitialized = false;
    state.form = null;
    state.inputs = [];
    state.inputMap.clear();
    state.submitBtn = null;
    
    log('Form destroyed');
}

/**
 * Add ARIA attributes to form for accessibility
 */
function addFormA11yAttributes() {
    // Add aria-label to form if not present
    if (!state.form.getAttribute('aria-label')) {
        state.form.setAttribute('aria-label', '紫微斗數排盤表單');
    }
    
    // Add aria-required to required fields
    const requiredFieldNames = ['gender', 'year', 'month', 'day', 'hour', 'minute'];
    
    for (let i = 0; i < state.inputs.length; i++) {
        const el = state.inputs[i];
        if (!el.name) continue;
        
        if (requiredFieldNames.includes(el.name)) {
            el.setAttribute('aria-required', 'true');
            
            // Create error message ID for aria-describedby
            const errorId = `${el.id || el.name}-error`;
            el.setAttribute('aria-describedby', errorId);
        }
    }
    
    // Ensure error containers have proper ARIA roles for announcements
    const errorContainers = state.form.querySelectorAll('.ziwei-cal-error-message, .ziwei-cal-api-error');
    for (let i = 0; i < errorContainers.length; i++) {
        const container = errorContainers[i];
        if (!container.hasAttribute('role')) {
            container.setAttribute('role', 'alert');
        }
        if (!container.hasAttribute('aria-live')) {
            container.setAttribute('aria-live', 'polite');
        }
        if (!container.hasAttribute('aria-atomic')) {
            container.setAttribute('aria-atomic', 'true');
        }
    }
    
    log('Added ARIA attributes to form');
}


// ============================================================================
// Input Handling & Debounced Validation
// ============================================================================

/**
 * Handle input events with debouncing
 */
function handleInput(e) {
    const el = e.target;
    if (!el || !el.name) return;
    
    const name = el.name;
    
    // Clear previous timer
    const prev = state.debounceTimers.get(name);
    if (prev) clearTimeout(prev);
    
    // Set new timer for validation
    const id = setTimeout(() => {
        clearFieldError(el);
        state.debounceTimers.delete(name);
    }, window?.ziweiConstants?.PERF_CONFIG?.DEBOUNCE_MS ?? 250);
    
    state.debounceTimers.set(name, id);
}

/**
 * Apply accessibility attributes based on validation result
 * @param {HTMLElement} el Field element
 * @param {{valid: boolean, message?: string}} res Validation result
 */
function clearFieldError(el) {
    if (!el) return;
    if (el.getAttribute('aria-invalid') === 'true') {
        el.removeAttribute('aria-invalid');
    }
    if (el.title) {
        el.title = '';
    }
}

function applyFieldA11y(el, res) {
    if (!el) return;
    const isValid = res?.valid !== false;

    if (!isValid) {
        el.setAttribute('aria-invalid', 'true');
        if (res?.message) {
            el.title = res.message;
        }
    } else {
        clearFieldError(el);
    }
}

// ============================================================================
// Value Collection & Validation
// ============================================================================

/**
 * Collect values from form inputs
 * @returns {Object} Field values
 */
function collectValues() {
    const values = {};
    
    for (let i = 0; i < state.inputs.length; i++) {
        const el = state.inputs[i];
        if (!el.name) continue;
        
        let v = el.value;
        
        // Trim string values
        if (typeof v === 'string') {
            v = v.trim();
        }
        
        // Handle checkboxes and radios
        if (el.type === 'checkbox' || el.type === 'radio') {
            if (el.checked) {
                values[el.name] = v;
            } else if (el.type === 'radio' && !values.hasOwnProperty(el.name)) {
                // For radio buttons, if none are checked, set to empty string
                values[el.name] = '';
            }
        } else {
            values[el.name] = v;
        }
    }

    return values;
}

/**
 * Validate a single field
 * @param {string} name Field name
 * @param {*} value Field value
 * @returns {{valid: boolean, message?: string}} Validation result
 */
/**
 * Clear all errors
 */
function clearAllErrors() {
    // Clear aria-invalid from all fields
    for (let i = 0; i < state.inputs.length; i++) {
        const el = state.inputs[i];
        if (el.getAttribute('aria-invalid') === 'true') {
            el.removeAttribute('aria-invalid');
        }
        if (el.title) {
            el.title = '';
        }
    }
    
    // Remove error message elements
    const elementsToClean = [
        '.ziwei-cal-error-message',
        '.ziwei-cal-api-error',
        '.ziwei-cal-datetime-group.has-error',
        '.ziwei-cal-field-error'
    ];

    elementsToClean.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (selector === '.ziwei-cal-error-message' || selector === '.ziwei-cal-api-error') {
                el.remove();
            } else {
                el.classList.remove('ziwei-cal-field-error', 'has-error');
            }
        });
    });
    
    // Use cached gender group element
    if (_domCache.genderGroup) {
        _domCache.genderGroup.classList.remove('ziwei-cal-field-error');
    }
    
    log('Cleared all form errors');
}

// ============================================================================
// Submit Handling
// ============================================================================

/**
 * Toggle busy state
 * @param {boolean} busy Whether form is busy
 */
function toggleBusy(busy) {
    if (!state.form) return;
    
    if (busy) {
        state.form.setAttribute('aria-busy', 'true');
        if (state.submitBtn) {
            state.submitBtn.disabled = true;
            state.submitBtn.textContent = '計算中...';
        }
    } else {
        state.form.removeAttribute('aria-busy');
        if (state.submitBtn) {
            state.submitBtn.disabled = false;
            state.submitBtn.textContent = '開始排盤';
        }
    }
}

/**
 * Handle form submission
 * @param {Event} e Submit event
 */
async function handleSubmit(e) {
    e.preventDefault();
    if (!state.form) {
        err('No form in state');
        return;
    }
    if (state.isSubmitting) {
        return;
    }
    log('Starting submit process');
    state.isSubmitting = true;
    toggleBusy(true);
    try {
        clearAllErrors();
        log('Collecting rawValues');
        const rawValues = collectValues();
        log('rawPayload ready');
        
        // Frontend validation before API call
        if (!rawValues.gender) {
            showError('請選擇性別');
            state.isSubmitting = false;
            toggleBusy(false);
            return;
        }
        
        const rawPayload = {
            name: rawValues.name || '',
            gender: rawValues.gender || '',
            year: rawValues.year ?? '',
            month: rawValues.month ?? '',
            day: rawValues.day ?? '',
            hour: rawValues.hour ?? '',
            minute: rawValues.minute ?? '',
            birthplace: rawValues.birthplace || '',
            calendarType: rawValues.calendarType || rawValues.calendar_type || 'solar',
            leapMonth: rawValues.leapMonth ?? rawValues.leap_month ?? '',
            timezone: rawValues.timezone || 'UTC+8'
        };
        log('Raw form payload collected:', rawPayload);
        log('ziweiCalData:', window.ziweiCalData);
        if (!window.ziweiCalData || !window.ziweiCalData.nonce) {
            err('Missing ziweiCalData or nonce:', window.ziweiCalData);
            if (typeof showError === 'function') {
                showError('系統配置錯誤，請重新載入頁面');
            }
            state.isSubmitting = false;
            toggleBusy(false);
            return;
        }
    state.lastValues = rawPayload;
    // Call REST API
        let apiResponse = null;
        try {
            const resp = await fetch('/wp-json/ziwei-cal/v1/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.ziweiCalData.nonce
                },
                body: JSON.stringify({
                    name: rawPayload.name,
                    gender: rawPayload.gender,
                    year: Number(rawPayload.year),
                    month: Number(rawPayload.month),
                    day: Number(rawPayload.day),
                    hour: Number(rawPayload.hour),
                    minute: Number(rawPayload.minute),
                    birthplace: rawPayload.birthplace
                })
            });
            apiResponse = await resp.json();
            if (!resp.ok || !apiResponse.success) {
                throw new Error(apiResponse.message || 'API 錯誤');
            }
            log('REST API 回應:', apiResponse);
        } catch (apiErr) {
            err('REST API error:', apiErr);
            if (typeof showError === 'function') {
                showError(apiErr.message || '系統錯誤，請稍後再試', true);
            }
            state.isSubmitting = false;
            toggleBusy(false);
            return;
        }
    // Wait 500ms to show 'Calculating...'
        await new Promise(resolve => setTimeout(resolve, 500));
    // Dispatch event to calculation/display modules
        const detail = Object.freeze({
            formData: rawPayload,
            nonce: window.ziweiCalData.nonce,
            apiResponse
        });
        const event = new CustomEvent('ziwei-form-submit', {
            bubbles: true,
            cancelable: true,
            detail
        });
        const dispatched = document.dispatchEvent(event);
        log('ziwei-form-submit dispatched on document');
        if (!dispatched) {
            warn('Submit event cancelled');
        }
    } catch (ex) {
        err('Submit error:', ex);
    } finally {
        if (state.isSubmitting === true) {
            state.isSubmitting = false;
            if (state.form?.hasAttribute('aria-busy')) {
                toggleBusy(false);
            }
        }
    }
}


// ============================================================================
// Error Display
// ============================================================================

/**
 * Show an error message above the form
 * @param {string} message Error message to display
 * @param {boolean} [isApiError=false] Whether this is an API error
 */
function showError(message, isApiError = false) {
    const existingErrors = document.querySelectorAll('.ziwei-cal-api-error');
    existingErrors.forEach(error => error.remove());

    // Use cached form container
    const formContainer = _domCache.formContainer || document.querySelector('.ziwei-cal');
    if (formContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ziwei-cal-api-error';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('aria-live', 'polite');

        const iconDiv = document.createElement('div');
        iconDiv.className = 'ziwei-cal-error-icon';
        iconDiv.textContent = isApiError ? '⚠️' : 'ℹ️';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'ziwei-cal-error-content';

        const strongEl = document.createElement('strong');
        strongEl.textContent = isApiError ? '系統錯誤：' : '提示：';

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;

        contentDiv.appendChild(strongEl);
        contentDiv.appendChild(messageSpan);

        if (isApiError) {
            const helpDiv = document.createElement('div');
            helpDiv.className = 'ziwei-cal-error-help';
            helpDiv.textContent = '請稍後重試或聯絡管理員';
            contentDiv.appendChild(helpDiv);
        }

        errorDiv.appendChild(iconDiv);
        errorDiv.appendChild(contentDiv);

        const form = formContainer.querySelector('form');
        if (form) {
            form.insertAdjacentElement('beforebegin', errorDiv);
        } else {
            formContainer.prepend(errorDiv);
        }

        log('Error displayed:', { message, isApiError });

        if (!isApiError) {
            setTimeout(() => {
                errorDiv.style.opacity = '0';
                setTimeout(() => errorDiv.remove(), 500);
            }, 5000);
        }
    }
}

/**
 * Handle adapter validation errors by marking affected fields and showing messages.
 * @param {Error} error AdapterError instance
 */
function handleAdapterError(error) {
    if (!error) {
        return;
    }

    log('Adapter validation failed:', error);
    toggleBusy(false);
    state.isSubmitting = false;

    const adapterErrors = error?.context?.errors || {};
    const message = error.message || '輸入資料驗證失敗，請檢查欄位';
    showError(message);

    Object.entries(adapterErrors).forEach(([fieldName, fieldMessage]) => {
        const inputEl = state.inputMap.get(fieldName);
        if (!inputEl) return;

        applyFieldA11y(inputEl, { valid: false, message: fieldMessage });

        const fieldWrapper = inputEl.closest('.ziwei-cal-field, .ziwei-cal-datetime-group, .ziwei-cal-gender-group');
        if (fieldWrapper) {
            fieldWrapper.classList.add('ziwei-cal-field-error', 'has-error');
        }
    });

    const firstErrorField = Object.keys(adapterErrors)[0];
    if (firstErrorField) {
        const target = state.inputMap.get(firstErrorField);
        if (target && typeof target.focus === 'function') {
            setTimeout(() => target.focus(), 0);
        }
    }
}

// ============================================================================
// Form State Management
// ============================================================================

/**
 * Save current form state
 */
function saveFormState() {
    if (!state.form) return;
    
    state.savedFormClone = cloneFormWithValues(state.form);
    log('Form state saved');
}

/**
 * Clone a form element with all current values
 * @param {HTMLFormElement} formEl The form to clone
 * @returns {HTMLFormElement} Cloned form with values
 */
function cloneFormWithValues(formEl) {
    if (!formEl) return null;
    
    const clone = formEl.cloneNode(true);

    const origInputs = formEl.querySelectorAll('input,select,textarea');
    const cloneInputs = clone.querySelectorAll('input,select,textarea');
    
    for (let i = 0; i < origInputs.length; i++) {
        const orig = origInputs[i];
        const cloneInput = cloneInputs[i];
        if (!cloneInput) continue;
        
        try {
            if (orig.type === 'checkbox' || orig.type === 'radio') {
                cloneInput.checked = orig.checked;
            } else {
                cloneInput.value = orig.value;
            }
        } catch (e) {
            // Ignore errors
        }
    }

    return clone;
}

/**
 * Restore saved form state with transition
 * @param {HTMLElement} currentElement Element to replace with form
 * @returns {Promise<void>}
 */
async function restoreForm(currentElement) {
    if (!state.savedFormClone) {
        window.location.reload();
        return;
    }

    // Defensive checks
    if (!currentElement || typeof currentElement.closest !== 'function') {
        window.location.reload();
        return;
    }

    const container = currentElement.closest('.ziwei-cal');
    if (container) {
        container.setAttribute('data-ziwei-mode', 'form');
    }

    if (currentElement.style) {
        currentElement.style.transition = 'opacity 200ms ease';
        currentElement.style.opacity = '0';
    }
    
    const parent = currentElement.parentNode;
    const controls = parent?.querySelector('.ziwei-control-bar');
    if (controls && controls.style) {
        controls.style.transition = 'opacity 200ms ease';
        controls.style.opacity = '0';
    }

    const settingsPanel = parent?.querySelector('.ziwei-settings-panel');
    if (settingsPanel && settingsPanel.style) {
        settingsPanel.style.transition = 'opacity 200ms ease';
        settingsPanel.style.opacity = '0';
    }
    
    await new Promise(resolve => setTimeout(resolve, 220));

    try {
        // Use a fresh clone so the savedFormClone remains reusable for future restores
        const newForm = state.savedFormClone.cloneNode(true);

        // Ensure the form has the expected id so initForm can find it reliably
        if (!newForm.id) {
            newForm.id = 'ziwei-cal-form';
        }

        currentElement.replaceWith(newForm);
        
        if (controls) {
            controls.remove();
        }
        if (settingsPanel) {
            settingsPanel.remove();
        }
        
        // Reset submitting state before re-initializing
        state.isSubmitting = false;
        state.isInitialized = false;
        
        requestAnimationFrame(() => {
            if (newForm.style) {
                newForm.style.opacity = '0';
                newForm.style.transition = 'opacity 200ms ease';
                requestAnimationFrame(() => { newForm.style.opacity = '1'; });
            }
        });
        
        // Re-initialize form to restore event handlers and reset button state
        initForm();
        
        // Ensure button is in correct state
        toggleBusy(false);
        
        log('Form restored successfully');
    } catch (err2) {
        err('Failed to restore form:', err2);
        window.location.reload();
    }
}

// ============================================================================
// Public API
// ============================================================================

window.ziweiForm = {
    init: initForm,
    cleanup: destroyForm,
    showError,
    handleAdapterError,
    saveState: saveFormState,
    restoreForm,
    handleSubmit  // Export handleSubmit for onclick
};

// Safe single init at end
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForm);
} else {
    initForm();
}
if (DEBUG_FORM) console.log('[form.js] Single init scheduled');

// Global fallback submit listener (document level)
document.addEventListener('submit', (e) => {
    if (e.target.id === 'ziwei-cal-form') {
        if (DEBUG_FORM) console.log('[form.js] Global submit fallback fired');
        handleSubmit(e);
    }
}, true); // capture phase

// Export for onclick
window.ziweiFormSubmit = handleSubmit;
if (DEBUG_FORM) console.log('[form.js] Ready - ziweiFormSubmit exported');

})();