'use strict';

// ============================================================================
// Module State & Constants
// ============================================================================

const DEBUG_FORM = !!(window?.ziweiCalData?.env?.isDebug);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEBOUNCE_MS = 250;

const state = {
    isInitialized: false,
    isSubmitting: false,
    form: null,
    inputs: [],
    inputMap: new Map(),
    submitBtn: null,
    lastValues: null,
    lastErrors: {},
    listeners: [],
    debounceTimers: new Map(),
    savedFormClone: null // For back button functionality
};

// ============================================================================
// Logging Utilities
// ============================================================================

function log(...args) {
    if (DEBUG_FORM) console.log('[ziwei-form]', ...args);
}

function warn(...args) {
    if (DEBUG_FORM) console.warn('[ziwei-form]', ...args);
}

function err(...args) {
    console.error('[ziwei-form]', ...args);
}


// ============================================================================
// Initialization & Cleanup
// ============================================================================

/**
 * Initialize form event handlers (idempotent)
 */
function initForm() {
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
    
    // Build input map for fast lookup
    state.inputMap.clear();
    for (let i = 0; i < state.inputs.length; i++) {
        const el = state.inputs[i];
        if (el.name) {
            state.inputMap.set(el.name, el);
        }
    }
    
    // Pre-fill current date and time
    prefillCurrentDateTime();
    
    // Register event listeners
    const handleReset = () => {
        // Re-fill date and time after form reset
        setTimeout(prefillCurrentDateTime, 0);
    };
    
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('input', handleInput, { passive: true });
    form.addEventListener('reset', handleReset);
    state.listeners.push(['submit', handleSubmit], ['input', handleInput], ['reset', handleReset]);
    
    state.isInitialized = true;
    log('Form initialized with', state.inputs.length, 'fields');
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
    
    // Pre-fill year
    const yearSelect = document.getElementById('ziwei-birth-year');
    if (yearSelect) {
        yearSelect.value = String(year);
        log(`Pre-filled year: ${year}`);
    }
    
    // Pre-fill month
    const monthSelect = document.getElementById('ziwei-birth-month');
    if (monthSelect) {
        monthSelect.value = String(month);
        log(`Pre-filled month: ${month}`);
    }
    
    // Pre-fill day
    const daySelect = document.getElementById('ziwei-birth-day');
    if (daySelect) {
        daySelect.value = String(day);
        log(`Pre-filled day: ${day}`);
    }
    
    // Pre-fill hour
    const hourSelect = document.getElementById('ziwei-birth-hour');
    if (hourSelect) {
        hourSelect.value = String(hour);
        log(`Pre-filled hour: ${hour}`);
    }
    
    // Pre-fill minute
    const minuteSelect = document.getElementById('ziwei-birth-minute');
    if (minuteSelect) {
        minuteSelect.value = String(minute);
        log(`Pre-filled minute: ${minute}`);
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
        const res = validateField(name, el.value);
        applyFieldA11y(el, res);
        state.debounceTimers.delete(name);
    }, DEBOUNCE_MS);
    
    state.debounceTimers.set(name, id);
}

/**
 * Apply accessibility attributes based on validation result
 * @param {HTMLElement} el Field element
 * @param {{valid: boolean, message?: string}} res Validation result
 */
function applyFieldA11y(el, res) {
    const isValid = res?.valid !== false;
    
    if (!isValid) {
        el.setAttribute('aria-invalid', 'true');
        if (res?.message) {
            el.title = res.message;
        }
    } else {
        if (el.getAttribute('aria-invalid') === 'true') {
            el.removeAttribute('aria-invalid');
        }
        if (el.title) {
            el.title = '';
        }
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
function validateField(name, value) {
    switch (name) {
        case 'name':
            // Name is optional, so always valid
            return { valid: true };
            
        case 'gender':
            return value ? { valid: true } : { valid: false, message: '請選擇性別' };
            
        case 'year':
        case 'month':
        case 'day':
            if (!value || value === '0' || value === 0) {
                return { valid: false, message: '請選擇完整的日期' };
            }
            return { valid: true };
            
        case 'hour':
        case 'minute':
            if (value === '' || value === undefined || value === null) {
                return { valid: false, message: '請選擇完整的時間' };
            }
            return { valid: true };
            
        default:
            return { valid: true };
    }
}

/**
 * Validate all collected values
 * @param {Object} values Field values
 * @returns {{ok: boolean, errors: Object}} Validation result
 */
function validateValues(values) {
    const errors = {};
    
    // Validate gender
    if (!values.gender) {
        errors.gender = '請選擇性別';
    }
    
    // Validate date fields
    const year = values.year ? parseInt(values.year, 10) : 0;
    const month = values.month ? parseInt(values.month, 10) : 0;
    const day = values.day ? parseInt(values.day, 10) : 0;
    
    if (!year || !month || !day) {
        errors.birthdate = '請選擇完整的出生日期';
    } else {
        // Validate date is real
        const date = new Date(year, month - 1, day);
        if (date.getMonth() !== month - 1 || date.getDate() !== day) {
            errors.birthdate = '請輸入有效的日期';
        }
    }
    
    // Validate time fields
    const hour = values.hour;
    const minute = values.minute;
    
    if (hour === '' || hour === undefined || hour === null ||
        minute === '' || minute === undefined || minute === null) {
        errors.birthtime = '請選擇完整的出生時間';
    }
    
    return {
        ok: Object.keys(errors).length === 0,
        errors
    };
}


// ============================================================================
// Error Rendering
// ============================================================================

/**
 * Render validation errors (batch update)
 * @param {Object} errors Error messages by field name
 */
function renderErrors(errors) {
    const msgs = [];
    
    for (const k in errors) {
        msgs.push(errors[k]);
        const el = state.inputMap.get(k);
        if (el) {
            applyFieldA11y(el, { valid: false, message: errors[k] });
        }
    }
    
    // Only call showError once with all messages
    if (msgs.length > 0) {
        const combinedMsg = msgs.join('；');
        
        // Avoid redundant error display
        const lastMsg = state.lastErrors.combined;
        if (lastMsg !== combinedMsg) {
            if (typeof showError === 'function') {
                showError(combinedMsg);
            } else {
                warn('Errors:', combinedMsg);
            }
            state.lastErrors.combined = combinedMsg;
        }
    }
}

/**
 * Focus first invalid field
 * @param {Object} errors Error messages by field name
 */
function focusFirstInvalid(errors) {
    for (const k in errors) {
        const el = state.inputMap.get(k);
        if (el && typeof el.focus === 'function') {
            el.focus();
            break;
        }
    }
}

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
    
    const genderGroup = document.querySelector('.ziwei-cal-gender-group');
    if (genderGroup) {
        genderGroup.classList.remove('ziwei-cal-field-error');
    }
    
    state.lastErrors = {};
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
    
    if (!state.form) return;
    
    // Prevent reentry
    if (state.isSubmitting) {
        warn('Form already submitting, ignoring');
        return;
    }
    
    state.isSubmitting = true;
    toggleBusy(true);
    
    try {
        // Clear previous errors
        clearAllErrors();
        
        // Collect values
        const rawValues = collectValues();
        
        // Prepare form data with proper types
        const formData = {
            name: rawValues.name || '無名氏',
            gender: rawValues.gender,
            year: rawValues.year ? parseInt(rawValues.year, 10) : 0,
            month: rawValues.month ? parseInt(rawValues.month, 10) : 0,
            day: rawValues.day ? parseInt(rawValues.day, 10) : 0,
            hour: rawValues.hour ? parseInt(rawValues.hour, 10) : '',
            minute: rawValues.minute ? parseInt(rawValues.minute, 10) : '',
            birthplace: rawValues.birthplace || ''
        };
        
        log('Form data collected:', formData);
        
        // Validate
        const result = validateValues(rawValues);
        
        if (!result.ok) {
            log('Validation failed:', result.errors);
            renderErrors(result.errors);
            focusFirstInvalid(result.errors);
            state.isSubmitting = false;
            toggleBusy(false);
            return;
        }
        
        // Check nonce
        if (!window.ziweiCalData || !window.ziweiCalData.nonce) {
            err('Missing required WordPress configuration');
            if (typeof showError === 'function') {
                showError('系統配置錯誤，請重新載入頁面');
            }
            state.isSubmitting = false;
            toggleBusy(false);
            return;
        }
        
        // Save values snapshot
        state.lastValues = formData;
        
        // Wait 500ms with "計算中..." showing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Dispatch event
        const detail = Object.freeze({
            formData,
            nonce: window.ziweiCalData.nonce
        });
        
        const event = new CustomEvent('ziwei-form-submit', {
            bubbles: true,
            cancelable: true,
            detail
        });
        
        const dispatched = state.form.dispatchEvent(event);
        
        log('Form submit event dispatched:', dispatched);
        
        if (!dispatched) {
            if (typeof showError === 'function') {
                showError('表單提交被取消');
            }
            state.isSubmitting = false;
            toggleBusy(false);
        }
        
        // Note: toggleBusy(false) is called by calculator.js after chart display
        
    } catch (ex) {
        err('Error in form submission:', ex);
        if (typeof showError === 'function') {
            showError('提交時發生錯誤，請稍後再試');
        }
        state.isSubmitting = false;
        toggleBusy(false);
    }
}


// ============================================================================
// Legacy Support Functions
// ============================================================================

/**
 * Show field error message (legacy compatibility)
 * @param {string} fieldId Field ID or field group ID
 * @param {string} message Error message
 */
function showFieldError(fieldId, message) {
    let targetElement;
    let errorContainer;

    switch (fieldId) {
        case 'ziwei-name':
            const nameInput = document.getElementById(fieldId);
            errorContainer = nameInput ? nameInput.closest('.ziwei-cal-name-group') : null;
            targetElement = errorContainer;
            break;

        case 'ziwei-gender-group':
            targetElement = document.querySelector('.ziwei-cal-gender-group');
            errorContainer = targetElement;
            break;

        case 'ziwei-birth-date':
        case 'ziwei-birth-time':
            targetElement = document.querySelector('.ziwei-cal-datetime-group');
            errorContainer = targetElement;
            break;

        default:
            targetElement = document.getElementById(fieldId);
            errorContainer = targetElement ? targetElement.parentNode : null;
            break;
    }

    if (!targetElement || !errorContainer) {
        err('Target element not found:', fieldId);
        return;
    }

    const existingError = errorContainer.querySelector('.ziwei-cal-error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'ziwei-cal-error-message';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');

    targetElement.classList.add('ziwei-cal-field-error');
    
    if (fieldId === 'ziwei-birth-date' || fieldId === 'ziwei-birth-time') {
        targetElement.classList.add('has-error');
    }

    errorContainer.appendChild(errorDiv);
    
    log('Field error shown:', { field: fieldId, message });
}

/**
 * Show loading state on the submit button (legacy compatibility)
 * @param {boolean} isLoading Whether to show loading state
 */
function setSubmitLoading(isLoading) {
    toggleBusy(isLoading);
}

/**
 * Show an error message above the form
 * @param {string} message Error message to display
 * @param {boolean} [isApiError=false] Whether this is an API error
 */
function showError(message, isApiError = false) {
    const existingErrors = document.querySelectorAll('.ziwei-cal-api-error');
    existingErrors.forEach(error => error.remove());

    const formContainer = document.querySelector('.ziwei-cal');
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

    const container = currentElement.closest('.ziwei-cal');
    if (container) {
        container.setAttribute('data-ziwei-mode', 'form');
    }

    currentElement.style.transition = 'opacity 200ms ease';
    currentElement.style.opacity = '0';
    
    const controls = currentElement.parentNode?.querySelector('.ziwei-control-bar');
    if (controls) {
        controls.style.transition = 'opacity 200ms ease';
        controls.style.opacity = '0';
    }

    const settingsPanel = currentElement.parentNode?.querySelector('.ziwei-settings-panel');
    if (settingsPanel) {
        settingsPanel.style.transition = 'opacity 200ms ease';
        settingsPanel.style.opacity = '0';
    }
    
    await new Promise(resolve => setTimeout(resolve, 220));

    try {
        const newForm = state.savedFormClone;
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
            newForm.style.opacity = '0';
            newForm.style.transition = 'opacity 200ms ease';
            requestAnimationFrame(() => { newForm.style.opacity = '1'; });
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
    setLoading: setSubmitLoading,
    showError,
    saveState: saveFormState,
    restore: restoreForm
};