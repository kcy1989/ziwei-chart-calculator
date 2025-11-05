/**
 * Form handling module for Ziwei Calculator
 */

// Keep a clone of the form (with current values) for back button functionality
let _savedFormClone = null;

/**
 * Initialize form event handlers
 */
function initForm() {
    console.log('Initializing form...');
    const form = document.getElementById('ziwei-cal-form');
    if (!form) {
        console.error('Form element not found');
        return;
    }

    // Remove any existing event listeners by cloning the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add new submit event listener
    newForm.addEventListener('submit', e => {
        console.log('Form submit event triggered');
        // Prevent default form submission
        e.preventDefault();
        
        // Get and validate form data
        const formData = getFormValues();
        console.log('Collected form data:', formData);
        
        if (!validateFormValues(formData)) {
            console.log('Form validation failed');
            return;
        }

        // Dispatch form submit event
        try {
            // Check required global configuration
            if (!window.ziweiCalData || !window.ziweiCalData.nonce) {
                console.error('Missing required WordPress configuration');
                showError('系統配置錯誤，請重新載入頁面');
                return;
            }

            // Create and dispatch form submit event
            const event = new CustomEvent('ziwei-form-submit', {
                bubbles: true,
                cancelable: true,
                detail: { 
                    formData,
                    nonce: window.ziweiCalData.nonce
                }
            });
            
            // Ensure event is dispatched only once
            const dispatched = newForm.dispatchEvent(event);
            
            if (window.ziweiCalData?.env?.isDebug) {
                console.log('Form submit event dispatched:', dispatched);
                console.log('Event data:', {
                    formData,
                    hasNonce: !!window.ziweiCalData.nonce
                });
            }
            
            if (!dispatched) {
                console.log('Event was cancelled');
                showError('表單提交被取消');
            }
        } catch (err) {
            console.error('Error dispatching event:', err);
            showError('提交表單時發生錯誤');
            
            if (window.ziweiCalData?.env?.isDebug) {
                console.error('Detailed error:', err);
            }
        }
    });

    // Add debug click handler to submit button in debug mode
    if (window.ziweiCalData?.env?.isDebug) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                console.log('Submit button clicked');
            });
        }
    }

    console.log('Form initialized successfully with debug mode:', !!window.ziweiCalData?.env?.isDebug);
}

/**
 * Get values from form fields
 * @returns {Object} Collected form values
 */
function getFormValues() {
    const form = document.getElementById('ziwei-cal-form');
    if (!form) {
        console.error('Form not found when getting values');
        return null;
    }

    const getValue = selector => form.querySelector(selector)?.value ?? '';
    const getCheckedValue = name => form.querySelector(`input[name="${name}"]:checked`)?.value ?? '';

    // Get raw values (do not convert immediately)
    const rawValues = {
        name: getValue('#ziwei-name'),
        gender: getCheckedValue('gender'),
        year: getValue('#ziwei-birth-year'),
        month: getValue('#ziwei-birth-month'),
        day: getValue('#ziwei-birth-day'),
        hour: getValue('#ziwei-birth-hour'),
        minute: getValue('#ziwei-birth-minute'),
        birthplace: getValue('#ziwei-birthplace')
    };

    // Convert and validate values
    const data = {
        name: rawValues.name.trim(),
        gender: rawValues.gender,
        year: rawValues.year === '' ? '' : parseInt(rawValues.year, 10) || 0,
        month: rawValues.month === '' ? '' : parseInt(rawValues.month, 10) || 0,
        day: rawValues.day === '' ? '' : parseInt(rawValues.day, 10) || 0,
        hour: rawValues.hour === '' ? '' : parseInt(rawValues.hour, 10),
        minute: rawValues.minute === '' ? '' : parseInt(rawValues.minute, 10),
        birthplace: rawValues.birthplace.trim()
    };

    console.log('Form values collected:', data);
    return data;
}

/**
 * Validate form values
 * @param {Object} data The form values to validate
 * @returns {boolean} Whether validation passed
 */
function validateFormValues(data) {
    let isValid = true;
    
    // Clear all existing error messages
    clearAllErrors();
    
    // Check basic fields
    if (!data.name || data.name.trim() === '') {
        showFieldError('ziwei-name', '請輸入姓名');
        isValid = false;
    }
    
    if (!data.gender) {
        showFieldError('ziwei-gender-group', '請選擇性別');
        isValid = false;
    }
    
    // Check date and time
    const isDateMissing = !data.year || !data.month || !data.day || 
                         data.year === 0 || data.month === 0 || data.day === 0;
    const isHourMissing = data.hour === '' || data.hour === undefined;
    const isMinuteMissing = data.minute === '' || data.minute === undefined;

    if (isDateMissing || isHourMissing || isMinuteMissing) {
        showFieldError('ziwei-birth-time', '請選擇完整的出生訊息');
        isValid = false;
    } else {
        // If date is filled, validate it
        const date = new Date(data.year, data.month - 1, data.day);
        if (date.getMonth() !== data.month - 1 || date.getDate() !== data.day) {
            showFieldError('ziwei-birth-date', '請輸入有效的日期');
            isValid = false;
        }
    }

    // Log validation result in debug mode
    if (window.ziweiCalData?.env?.isDebug) {
        console.log('Form validation result:', {
            isValid,
            data
        });
    }
    
    return isValid;
}

/**
 * Clear all error messages
 */
function clearAllErrors() {
    const elementsToClean = [
        // General error messages
        '.ziwei-cal-error-message',
        // API error messages
        '.ziwei-cal-api-error',
        // Date-time group errors
        '.ziwei-cal-datetime-group.has-error',
        // All elements with error state
        '.ziwei-cal-field-error'
    ];

    // Clean all error-related elements and styles
    elementsToClean.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (selector === '.ziwei-cal-error-message' || selector === '.ziwei-cal-api-error') {
                // Remove error message elements
                el.remove();
            } else {
                // Remove error state classes
                el.classList.remove('ziwei-cal-field-error', 'has-error');
            }
        });
    });

    // Ensure gender group error state is cleared
    const genderGroup = document.querySelector('.ziwei-cal-gender-group');
    if (genderGroup) {
        genderGroup.classList.remove('ziwei-cal-field-error');
    }

    // Log clearing operation in debug mode
    if (window.ziweiCalData?.env?.isDebug) {
        console.log('Cleared all form errors');
    }
}

/**
 * Show field error message
 * @param {string} fieldId - Field ID or field group ID
 * @param {string} message - Error message
 */
function showFieldError(fieldId, message) {
    // Use different selectors for different field types
    let targetElement;
    let errorContainer;

    switch (fieldId) {
        case 'ziwei-gender-group':
            // Gender selection group
            targetElement = document.querySelector('.ziwei-cal-gender-group');
            errorContainer = targetElement;
            break;

        case 'ziwei-birth-date':
        case 'ziwei-birth-time':
            // Date-time group
            targetElement = document.querySelector('.ziwei-cal-datetime-group');
            errorContainer = targetElement;
            break;

        default:
            // General fields (e.g., name)
            targetElement = document.getElementById(fieldId);
            errorContainer = targetElement ? targetElement.parentNode : null;
            break;
    }

    if (!targetElement || !errorContainer) {
        console.error('Target element not found:', fieldId);
        return;
    }

    // Remove existing error message
    const existingError = errorContainer.querySelector('.ziwei-cal-error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'ziwei-cal-error-message';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');

    // Add error state styles
    targetElement.classList.add('ziwei-cal-field-error');
    
    // For date-time group, add special error state
    if (fieldId === 'ziwei-birth-date' || fieldId === 'ziwei-birth-time') {
        targetElement.classList.add('has-error');
    }

    // Insert error message
    errorContainer.appendChild(errorDiv);

    // If in debug mode, log the error
    if (window.ziweiCalData?.env?.isDebug) {
        console.log('Field error shown:', {
            field: fieldId,
            message: message,
            element: targetElement
        });
    }
}

/**
 * Show loading state on the submit button
 * @param {boolean} isLoading Whether to show loading state
 */
function setSubmitLoading(isLoading) {
    const submitButton = document.querySelector('.ziwei-cal-btn-primary');
    if (submitButton) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? '計算中...' : '開始排盤';
    }
}

/**
 * Show an error message above the form
 * @param {string} message Error message to display
 * @param {boolean} [isApiError=false] Whether this is an API error
 */
function showError(message, isApiError = false) {
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.ziwei-cal-api-error');
    existingErrors.forEach(error => error.remove());

    const formContainer = document.querySelector('.ziwei-cal');
    if (formContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ziwei-cal-api-error';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('aria-live', 'polite');
        
        if (isApiError) {
            errorDiv.innerHTML = `
                <div class="ziwei-cal-error-icon">⚠️</div>
                <div class="ziwei-cal-error-content">
                    <strong>系統錯誤：</strong>${message}
                    <div class="ziwei-cal-error-help">請稍後重試或聯絡管理員</div>
                </div>`;
        } else {
            errorDiv.innerHTML = `
                <div class="ziwei-cal-error-icon">ℹ️</div>
                <div class="ziwei-cal-error-content">
                    <strong>提示：</strong>${message}
                </div>`;
        }

        // Insert error message at top of the form
        const form = formContainer.querySelector('form');
        if (form) {
            form.insertAdjacentElement('beforebegin', errorDiv);
        } else {
            formContainer.prepend(errorDiv);
        }

        // Debug logging
        if (window.ziweiCalData?.env?.isDebug) {
            console.log('Error displayed:', {
                message,
                isApiError,
                timestamp: new Date().toISOString()
            });
        }

        // Auto-hide non-API errors after 5 seconds
        if (!isApiError) {
            setTimeout(() => {
                errorDiv.style.opacity = '0';
                setTimeout(() => errorDiv.remove(), 500);
            }, 5000);
        }
    }
}

/**
 * Save current form state
 * @param {HTMLFormElement} form The form element to save
 */
function saveFormState(form) {
    _savedFormClone = cloneFormWithValues(form);
}

/**
 * Clone a form element with all current values
 * @param {HTMLFormElement} formEl The form to clone
 * @returns {HTMLFormElement} Cloned form with values
 */
function cloneFormWithValues(formEl) {
    if (!formEl) return null;
    const clone = formEl.cloneNode(true);

    // Copy values for inputs/selects/textareas
    const origInputs = formEl.querySelectorAll('input,select,textarea');
    const cloneInputs = clone.querySelectorAll('input,select,textarea');
    origInputs.forEach((orig, idx) => {
        const cloneInput = cloneInputs[idx];
        if (!cloneInput) return;
        try {
            if (orig.type === 'checkbox' || orig.type === 'radio') {
                cloneInput.checked = orig.checked;
            } else {
                cloneInput.value = orig.value;
            }
        } catch (e) {
            // ignore
        }
    });

    return clone;
}

/**
 * Restore saved form state with transition
 * @param {HTMLElement} currentElement Element to replace with form
 * @returns {Promise<void>}
 */
async function restoreForm(currentElement) {
    if (!_savedFormClone) {
        window.location.reload();
        return;
    }

    currentElement.style.transition = 'opacity 200ms ease';
    currentElement.style.opacity = '0';
    
    // Also fade out the controls if they exist
    const controls = currentElement.parentNode?.querySelector('.ziwei-chart-controls');
    if (controls) {
        controls.style.transition = 'opacity 200ms ease';
        controls.style.opacity = '0';
    }
    
    await new Promise(resolve => setTimeout(resolve, 220));

    try {
        const newForm = _savedFormClone;
        currentElement.replaceWith(newForm);
        
        // Remove the controls bar as well
        if (controls) {
            controls.remove();
        }
        
        requestAnimationFrame(() => {
            newForm.style.opacity = '0';
            newForm.style.transition = 'opacity 200ms ease';
            requestAnimationFrame(() => { newForm.style.opacity = '1'; });
        });
        initForm();
    } catch (err) {
        console.error('Failed to restore form:', err);
        window.location.reload();
    }
}

// Expose public API
window.ziweiForm = {
    init: initForm,
    setLoading: setSubmitLoading,
    showError,
    saveState: saveFormState,
    restore: restoreForm
};