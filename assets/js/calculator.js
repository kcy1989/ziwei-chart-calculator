/**
 * Main calculator module for Ziwei Chart
 */
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

        // Convert solar date to lunar date using local library
        console.log('Converting to lunar date...');
        const lunarData = solarToLunar(
            parseInt(formData.year, 10),
            parseInt(formData.month, 10),
            parseInt(formData.day, 10),
            parseInt(formData.hour, 10),
            parseInt(formData.minute, 10)
        );
        
        if (!lunarData) {
            window.ziweiForm.showError('農曆轉換失敗，請檢查輸入的日期是否正確（支援 1900-2100 年）');
            return;
        }
        
        console.log('Lunar conversion result:', lunarData);
        
        // Add lunar data to form data
        formData.lunar = lunarData;

        // Save form state for back button
        const form = document.getElementById('ziwei-cal-form');
        if (!form) {
            console.error('Form not found: #ziwei-cal-form');
            return;
        }
        window.ziweiForm.saveState(form);

        try {
            // Make API request
            window.ziweiForm.setLoading(true);
            console.log('Submitting to API with data:', formData);
            const chartData = await submitToApi(formData);
            console.log('API response:', chartData);
            if (!chartData) throw new Error('無效的伺服器回應');

            // Update chart display
            console.log('Drawing chart...');
            const chartHtml = await showChart(chartData);
            console.log('Chart element created:', chartHtml);
            await updateDisplay(chartHtml);

        } catch (err) {
            console.error('API Error:', err);
            window.ziweiForm.showError(err.message || '排盤時發生錯誤');
            window.ziweiForm.setLoading(false);
        }
    });

    // Handle control bar button clicks via event delegation
    // (Settings button is handled internally by control.js)
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('.ziwei-back-btn');
        if (backBtn) {
            const chartContainer = document.querySelector('[data-ziwei-chart]');
            if (chartContainer) {
                window.ziweiForm.restore(chartContainer);
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
async function updateDisplay(chartElement) {
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

