(function() {
'use strict';

let active = false;
let listenersBound = false;
let jsonTextarea = null;
let titleElement = null;
let shareLoaderPromise = null;

function ensureShareModule() {
    console.log('[ziweiAiMode] ensureShareModule called at:', new Date().toISOString());
    console.log('[ziweiAiMode] ziweiShare already available:', !!window.ziweiShare);
    console.log('[ziweiAiMode] getAIPromptText available:', !!window.ziweiShare?.getAIPromptText);
    console.log('[ziweiAiMode] shareLoaderPromise exists:', !!shareLoaderPromise);
    
    if (window.ziweiShare?.getAIPromptText) {
        console.log('[ziweiAiMode] Module already loaded, resolving immediately');
        return Promise.resolve();
    }
    if (shareLoaderPromise) {
        console.log('[ziweiAiMode] Module already loading, returning existing promise');
        return shareLoaderPromise;
    }

    console.log('[ziweiAiMode] Starting new module load...');
    shareLoaderPromise = new Promise((resolve, reject) => {
        const existing = Array.from(document.scripts).find((s) => s.src && s.src.indexOf('assets/display/js/share.js') !== -1);
        if (existing) {
            console.log('[ziweiAiMode] Found existing script element, waiting for load...');
            existing.addEventListener('load', () => {
                console.log('[ziweiAiMode] Existing script loaded successfully');
                resolve();
            });
            existing.addEventListener('error', () => {
                console.error('[ziweiAiMode] Existing script failed to load');
                reject(new Error('share.js load error'));
            });
            return;
        }

        console.log('[ziweiAiMode] Creating new script element...');
        const script = document.createElement('script');
        const base = window.ziweiCalData?.pluginUrl || '';
        const version = window.ziweiCalData?.pluginVersion || Date.now();
        script.src = `${base}assets/display/js/share.js?ver=${version}`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('[ziweiAiMode] New script loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.error('[ziweiAiMode] New script failed to load');
            reject(new Error('share.js load error'));
        };
        document.head.appendChild(script);
    });

    return shareLoaderPromise;
}

function isActive() {
    // Check internal state, DOM state, and adapter storage for robust mode detection
    // This prevents false positives during mode transitions
    const container = document.querySelector('.ziwei-cal');
    const domModeAi = container && container.getAttribute('data-ziwei-mode') === 'ai';
    const aiPanel = document.querySelector('.ziwei-ai-panel');
    const aiPanelVisible = aiPanel && aiPanel.style.display !== 'none';
    const adapterActive = window.ziweiAdapter?.storage?.get('aiModeActive') === true;

    // Simplified check: if internal state is active and DOM mode is AI, consider it active
    // This allows settings changes to trigger updates even if panel visibility check is tricky
    const trulyActive = active && domModeAi;

    console.log('[ziweiAiMode] isActive check:', {
        active, domModeAi, aiPanelVisible, adapterActive, trulyActive
    });

    return trulyActive;
}

function hideStandardViews(chartElement) {
    if (!chartElement) return;

    // Hide grid - check both direct child and descendant
    const grid = chartElement.querySelector('.ziwei-4x4-grid');
    if (grid) {
        grid.style.display = 'none';
    } else if (chartElement.classList.contains('ziwei-4x4-grid')) {
        chartElement.style.display = 'none';
    }

    // Always hide interpretation panels in AI mode
    // Search within the chart element first
    const internalPanels = chartElement.querySelectorAll('.ziwei-interpretation-panel, .ziwei-interpretation-wrapper');
    internalPanels.forEach((panel) => {
        panel.style.display = 'none';
    });

    // Also hide any global panels that might be lingering (if they are not inside chartElement)
    const globalPanels = document.querySelectorAll('.ziwei-interpretation-panel, .ziwei-interpretation-wrapper');
    globalPanels.forEach((panel) => {
        panel.style.display = 'none';
    });
}

function ensureJsonPanel(chartElement) {
    if (!chartElement) return null;

    let panel = chartElement.querySelector('.ziwei-ai-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'ziwei-ai-panel';

        const title = document.createElement('div');
        title.className = 'ziwei-ai-title';
        title.textContent = 'AI 提示詞 (含 JSON)';
        titleElement = title;

        jsonTextarea = document.createElement('textarea');
        jsonTextarea.className = 'ziwei-ai-textarea';
        jsonTextarea.readOnly = true;

        panel.appendChild(title);
        panel.appendChild(jsonTextarea);

        // Add copy button inside the panel
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'ziwei-cal-btn ziwei-cal-btn-primary ziwei-ai-copy-btn';
        copyBtn.textContent = '複製AI 提示詞';

        copyBtn.addEventListener('click', async () => {
            try {
                await copyPrompt();
            } catch (err) {
                console.error('[ziweiAiMode] Copy failed', err);
                alert('複製失敗，請稍後再試');
            }
        });

        panel.appendChild(copyBtn);

        // Find the cycle panel (大限和流年列的容器)
        const cyclePanel = chartElement.querySelector('.ziwei-cycle-panel');
        if (cyclePanel) {
            // Insert AI panel before cycle panel
            cyclePanel.insertAdjacentElement('beforebegin', panel);
        } else {
            // Fallback: find the major cycle row (大限列)
            const majorCycleRow = chartElement.querySelector('.ziwei-major-cycle-row');
            if (majorCycleRow) {
                // Insert AI panel before major cycle row
                majorCycleRow.insertAdjacentElement('beforebegin', panel);
            } else {
                // Fallback: find the container that holds both control bar and chart
                const container = chartElement.closest('.ziwei-cal') || chartElement.parentElement;
                if (container) {
                    // Find the control bar (控制列)
                    const controlBar = container.querySelector('.ziwei-control-bar');
                    // Find the chart wrapper (contains cycle panel 大限列)
                    const chartWrapper = container.querySelector('.ziwei-chart-wrapper');
                    
                    if (controlBar && chartWrapper) {
                        // Insert AI panel after control bar and before chart wrapper
                        controlBar.insertAdjacentElement('afterend', panel);
                    } else if (chartWrapper) {
                        // Fallback: insert before chart wrapper
                        chartWrapper.insertAdjacentElement('beforebegin', panel);
                    } else {
                        // Final fallback: append to container
                        container.appendChild(panel);
                    }
                } else {
                    // Fallback: append to chart element
                    chartElement.appendChild(panel);
                }
            }
        }
    } else {
        jsonTextarea = panel.querySelector('textarea');
    }

    return panel;
}

function updateTitle() {
    if (!titleElement) return;

    const activeMajorBtn = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
    const activeMinorBtn = document.querySelector('.ziwei-annual-cycle-button.ziwei-cycle-button-active');

    if (!activeMajorBtn && !activeMinorBtn) {
        titleElement.textContent = 'AI提示詞(用於推算整體性格及命運)';
    } else if (activeMajorBtn && !activeMinorBtn) {
        const ageRange = activeMajorBtn.dataset.ageRange;
        const [startAge, endAge] = ageRange.split('-').map(Number);
        titleElement.textContent = `AI提示詞(用於推算${startAge}歲至${endAge}歲的大限運程)`;
    } else if (activeMajorBtn && activeMinorBtn) {
        const year = activeMinorBtn.dataset.year;
        titleElement.textContent = `AI提示詞(用於推算${year}年的流年運程)`;
    }
}

function disableShareExports() {
    const targets = document.querySelectorAll('.ziwei-share-option[data-action="download-png"], .ziwei-share-option[data-action="download-pdf"]');
    targets.forEach((opt) => {
        opt.classList.add('disabled');
        opt.setAttribute('aria-disabled', 'true');
        opt.setAttribute('data-title', 'AI 模式停用');
    });
}

function enableShareExports() {
    const targets = document.querySelectorAll('.ziwei-share-option[data-action="download-png"], .ziwei-share-option[data-action="download-pdf"]');
    targets.forEach((opt) => {
        opt.classList.remove('disabled');
        opt.removeAttribute('aria-disabled');
        opt.removeAttribute('data-title');
    });
    // Also trigger menu re-injection to ensure fresh state
    setTimeout(() => {
        const shareBtn = document.querySelector('.ziwei-share-btn');
        if (shareBtn && window.ziweiShare?._injectMenu) {
            const existingMenu = shareBtn.querySelector('.ziwei-share-menu');
            if (existingMenu) existingMenu.remove();
            window.ziweiShare._injectMenu(shareBtn);
        }
    }, 50);
}

function updateJsonText() {
    if (!jsonTextarea) {
        console.log('[ziweiAiMode] updateJsonText called: jsonTextarea is null');
        return;
    }
    try {
        // Enhanced debug logging to track module loading state and DOM state
        console.log('[ziweiAiMode] updateJsonText called at:', new Date().toISOString());
        console.log('[ziweiAiMode] jsonTextarea exists:', !!jsonTextarea);
        console.log('[ziweiAiMode] ziweiShare available:', !!window.ziweiShare);
        console.log('[ziweiAiMode] getAIPromptText available:', !!window.ziweiShare?.getAIPromptText);

        // Check for active cycle buttons
        const activeMajorBtn = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
        const activeAnnualBtn = document.querySelector('.ziwei-annual-cycle-button.ziwei-cycle-button-active');
        console.log('[ziweiAiMode] Active major cycle button:', !!activeMajorBtn);
        console.log('[ziweiAiMode] Active annual cycle button:', !!activeAnnualBtn);

        if (!window.ziweiShare?.getAIPromptText) {
            console.log('[ziweiAiMode] Share module not loaded, setting placeholder and ensuring loading...');
            // Set placeholder text immediately to show the textarea is active
            jsonTextarea.value = '載入 AI 提示詞中...';
            ensureShareModule()
                .then(() => {
                    console.log('[ziweiAiMode] Share module loaded, scheduling DOM update...');
                    // Use requestAnimationFrame to ensure DOM state is updated before generating text
                    requestAnimationFrame(() => {
                        console.log('[ziweiAiMode] DOM updated, updating text...');
                        const text = window.ziweiShare?.getAIPromptText?.() || '';
                        console.log('[ziweiAiMode] Retrieved text after module load:', text ? text.length : 0, 'characters');
                        jsonTextarea.value = text;
                        updateTitle();
                        disableShareExports();
                    });
                })
                .catch((err) => {
                    console.error('[ziweiAiMode] share module load failed', err);
                    jsonTextarea.value = '載入失敗，請稍後再試';
                });
            return;
        }

        // Use requestAnimationFrame to ensure DOM state is updated before generating text
        requestAnimationFrame(() => {
            const text = window.ziweiShare.getAIPromptText();
            console.log('[ziweiAiMode] Retrieved prompt text length:', text ? text.length : 0);
            console.log('[ziweiAiMode] Current textarea value length:', jsonTextarea.value ? jsonTextarea.value.length : 0);

            if (text) {
                jsonTextarea.value = text;
                updateTitle();
                console.log('[ziweiAiMode] Textarea updated successfully');
            } else {
                console.log('[ziweiAiMode] No text returned from getAIPromptText');
                updateTitle();
            }
        });
    } catch (err) {
        console.error('[ziweiAiMode] JSON update failed', err);
        console.error('[ziweiAiMode] Error details:', err.message, err.stack);
    }
}

async function copyPrompt() {
    await ensureShareModule();
    const text = window.ziweiShare?.getAIPromptText?.();
    if (!text) {
        throw new Error('提示詞尚未生成');
    }
    await navigator.clipboard.writeText(text);
    // Provide lightweight feedback
    const toast = document.createElement('div');
    toast.className = 'ziwei-ai-toast';
    toast.textContent = '已複製 AI 提示詞';
    document.body.appendChild(toast);

    // Auto-remove after 1.6 seconds with fade out animation
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 1300);
}

function bindListeners() {
    console.log('[ziweiAiMode] bindListeners called, listenersBound:', listenersBound);
    if (listenersBound) {
        console.log('[ziweiAiMode] Listeners already bound, skipping');
        return;
    }
    listenersBound = true;
    console.log('[ziweiAiMode] Binding listeners now');

    document.addEventListener('click', (e) => {
        console.log('[ziweiAiMode] Document click detected at:', new Date().toISOString(), 'target:', e.target.className);
        const cycleBtn = e.target.closest('.ziwei-cycle-button');
        if (cycleBtn) {
            console.log('[ziweiAiMode] Cycle button clicked at:', new Date().toISOString());
            console.log('[ziweiAiMode] Cycle button className:', cycleBtn.className);
            console.log('[ziweiAiMode] Cycle button has active class:', cycleBtn.classList.contains('ziwei-cycle-button-active'));
            console.log('[ziweiAiMode] Cycle button dataset:', cycleBtn.dataset);

            // Check if this is a major or annual cycle button
            const isMajor = cycleBtn.classList.contains('ziwei-major-cycle-button');
            const isAnnual = cycleBtn.classList.contains('ziwei-annual-cycle-button');
            console.log('[ziweiAiMode] Button type - Major:', isMajor, 'Annual:', isAnnual);

            // Update textarea immediately - updateJsonText handles module loading and DOM timing
            console.log('[ziweiAiMode] Calling updateJsonText directly...');
            updateJsonText();
            updateTitle();
        } else {
            console.log('[ziweiAiMode] Click was not on a cycle button');
        }
    });

    document.addEventListener('ziwei-setting-changed', () => {
        console.log('[ziweiAiMode] Setting changed event received at:', new Date().toISOString());
        
        // Only respond to settings changes if we're actually in AI mode
        if (!isActive()) {
            console.log('[ziweiAiMode] Not in AI mode, ignoring settings change');
            return;
        }
        
        // Update textarea immediately - updateJsonText handles module loading and DOM timing
        console.log('[ziweiAiMode] In AI mode, calling updateJsonText for setting change...');
        updateJsonText();
        updateTitle();
    });

    // Listen for 安星規則 settings changes (星曜亮度, 截空旬空, 傷使處理)
    document.addEventListener('ziwei-starBrightness-changed', (e) => {
        console.log('[ziweiAiMode] Star brightness changed event received:', e.detail);
        if (!isActive()) return;
        updateJsonText();
        updateTitle();
    });

    document.addEventListener('ziwei-xunkong-changed', (e) => {
        console.log('[ziweiAiMode] XunKong changed event received:', e.detail);
        console.log('[ziweiAiMode] isActive() result:', isActive());
        if (!isActive()) {
            console.log('[ziweiAiMode] Not active, skipping XunKong update');
            return;
        }
        console.log('[ziweiAiMode] Updating JSON for XunKong change...');
        updateJsonText();
        updateTitle();
    });

    document.addEventListener('ziwei-wounded-servant-changed', (e) => {
        console.log('[ziweiAiMode] Wounded servant changed event received:', e.detail);
        console.log('[ziweiAiMode] isActive() result:', isActive());
        if (!isActive()) {
            console.log('[ziweiAiMode] Not active, skipping wounded servant update');
            return;
        }
        console.log('[ziweiAiMode] Updating JSON for wounded servant change...');
        updateJsonText();
        updateTitle();
    });

    // Listen for 四化選擇 settings changes
    document.addEventListener('ziwei-mutation-changed', (e) => {
        console.log('[ziweiAiMode] Mutation changed event received:', e.detail);
        if (!isActive()) return;
        updateJsonText();
        updateTitle();
    });

    // Listen for palace name changes (宮位設定)
    document.addEventListener('ziwei-palace-name-changed', (e) => {
        console.log('[ziweiAiMode] Palace name changed event received:', e.detail);
        if (!isActive()) return;
        updateJsonText();
        updateTitle();
    });

    window.addEventListener('ziwei-chart-drawn', () => {
        if (!active) return;
        const chart = document.querySelector('[data-ziwei-chart]');
        if (chart) {
            activate(chart);
        }
    });
}

function deactivate(chartElement) {
    console.log('[ziweiAiMode] deactivate called at:', new Date().toISOString());
    console.log('[ziweiAiMode] chartElement:', !!chartElement);
    
    console.log('[ziweiAiMode] Setting active = false');
    active = false;
    
    if (window.ziweiAdapter?.storage) {
        window.ziweiAdapter.storage.set('aiModeActive', false);
    }
    console.log('[ziweiAiMode] AI mode deactivated - active:', active);

    // Hide all AI panels regardless of chartElement parameter
    const allAiPanels = document.querySelectorAll('.ziwei-ai-panel');
    console.log('[ziweiAiMode] Found', allAiPanels.length, 'AI panels to hide');
    allAiPanels.forEach((panel, index) => {
        console.log('[ziweiAiMode] Hiding AI panel', index);
        panel.style.display = 'none';
    });

    if (chartElement) {
        chartElement.classList.remove('ziwei-ai-mode');

        const container = chartElement.parentElement?.closest('.ziwei-cal');
        if (container) {
            container.setAttribute('data-ziwei-mode', 'chart');
        }
    }

    enableShareExports();

    return chartElement;
}

function activate(chartElement) {
    console.log('[ziweiAiMode] activate called at:', new Date().toISOString());
    if (!chartElement) {
        console.log('[ziweiAiMode] activate: chartElement is null');
        return chartElement;
    }
    
    console.log('[ziweiAiMode] Setting active = true');
    active = true;
    
    if (window.ziweiAdapter?.storage) {
        window.ziweiAdapter.storage.set('aiModeActive', true);
    }
    console.log('[ziweiAiMode] AI mode activated - active:', active);

    chartElement.classList.add('ziwei-ai-mode');
    chartElement.setAttribute('data-ziwei-chart', '1');
    const container = chartElement.parentElement?.closest('.ziwei-cal');
    if (container) {
        container.setAttribute('data-ziwei-mode', 'ai');
    }

    hideStandardViews(chartElement);
    const aiPanel = ensureJsonPanel(chartElement);
    if (aiPanel) {
        aiPanel.style.display = '';
    }
    disableShareExports();
    ensureShareModule().then(() => {
        disableShareExports();
        updateJsonText();
    }).catch((err) => console.error('[ziweiAiMode] share module load failed', err));
    // Fix: Remove the direct updateJsonText() call since it's already handled in the promise
    // updateJsonText(); // This line removed to prevent race condition
    bindListeners();

    return chartElement;
}

window.ziweiAiMode = {
    activate,
    deactivate,
    isActive,
    updateJsonText,
    _lastCalcResult: null
};

})();
