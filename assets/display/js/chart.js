'use strict';

/**
 * Chart rendering module for Ziwei Calculator
 * 
 * Corresponding CSS: assets/display/css/chart.css
 *                    assets/display/css/palace-interaction.css
 *                    assets/display/css/cycles.css
 */

// Registry objects used to coordinate cycle panel interactions
let cycleDisplayRegistry = Object.create(null);
let starMutationRegistry = Object.create(null);
let starElementIndex = new Map(); // Reverse index: starName -> HTMLElement[]
let lastPalaceDataRef = {};
let currentMajorCycleMingIndex = null;
let currentAnnualCycleMingIndex = null;

function getAdapterModule(name) {
    var adapter = window.ziweiAdapter;
    if (!adapter) {
        return null;
    }
    if (typeof adapter.getModule === 'function') {
        return adapter.getModule(name);
    }
    var modules = adapter.modules || {};
    return modules[name] || null;
}

function adapterHasModule(name) {
    var adapter = window.ziweiAdapter;
    if (!adapter) {
        return false;
    }
    if (typeof adapter.hasModule === 'function') {
        return adapter.hasModule(name);
    }
    return !!getAdapterModule(name);
}

function getAttributesForPalace(index, attributesMap) {
    if (!attributesMap || typeof attributesMap !== 'object') {
        return [];
    }
    return attributesMap[index] || attributesMap[String(index)] || [];
}

/**
 * Reset registry state before rendering a new chart
 */
function resetCycleRegistries() {
    cycleDisplayRegistry = Object.create(null);
    starMutationRegistry = Object.create(null);
    starElementIndex = new Map();
    currentMajorCycleMingIndex = null;
    currentAnnualCycleMingIndex = null;
}

/**
 * Hide all major/annual cycle star placeholders
 */
function clearMajorCycleStars() {
    Object.values(cycleDisplayRegistry).forEach((elements) => {
        if (!elements) return;
        const { major, annual, wrapper } = elements;

        if (major) {
            major.textContent = '';
            major.classList.add('hidden');
        }

        if (annual) {
            annual.textContent = '';
            annual.classList.add('hidden');
        }

        // Also remove any dynamically added major/annual cycle star nodes
        if (wrapper) {
            const dynamicNodes = wrapper.querySelectorAll('[data-role="major-cycle"], [data-role="annual-cycle"]');
            dynamicNodes.forEach((n) => n.remove());
        }
    });
}

/**
 * Remove previously applied major cycle mutation badges
 */
function clearMutationsByRole(roleName) {
    Object.values(starMutationRegistry).forEach((starMap) => {
        Object.values(starMap).forEach((groupList) => {
            groupList.forEach((groupEl) => {
                const wrapper = groupEl.querySelector('.ziwei-mutations-wrapper');
                const starMutationBox = groupEl.querySelector('.ziwei-star-mutation-box');
                if (!wrapper) {
                    if (starMutationBox) {
                        starMutationBox.classList.remove('ziwei-with-mutation');
                    }
                    groupEl.classList.toggle('ziwei-star-with-mutation', false);
                    groupEl.classList.toggle('ziwei-star-no-mutation', true);
                    return;
                }

                // Hide and clear specific role mutations (but keep elements for CSS grid)
                const targetMutations = wrapper.querySelectorAll(`[data-mutation-role="${roleName}"]`);
                targetMutations.forEach(mutationEl => {
                    mutationEl.style.visibility = 'hidden';
                        mutationEl.textContent = '';
                    mutationEl.removeAttribute('data-mutation-role');
                });

                // Check if any mutation is still visible (not hidden)
                const hasVisibleMutations = Array.from(wrapper.children).some(el => el.style.visibility !== 'hidden');

                if (!hasVisibleMutations) {
                    wrapper.remove();
                }

                // Update star mutation box class based on visibility
                if (starMutationBox) {
                    starMutationBox.classList.toggle('ziwei-with-mutation', hasVisibleMutations);
                }

                // Set final class state
                groupEl.classList.toggle('ziwei-star-with-mutation', hasVisibleMutations);
                groupEl.classList.toggle('ziwei-star-no-mutation', !hasVisibleMutations);
            });
        });
    });
}

function clearMajorCycleMutations() {
    clearMutationsByRole('major-cycle');
}

function clearAnnualCycleMutations() {
    clearMutationsByRole('annual-cycle');
}

/**
 * Display placeholder major/annual cycle stars when a major cycle is selected
 * @param {Object} options Cycle render options
 * @param {Object} options.cycle Selected major cycle data
 * @param {string} [options.stem] Heavenly stem associated with the cycle
 * @param {number} [options.branchIndex] Earthly branch index of the major cycle palace (0-11)
 * @param {number} [options.timeIndex] Birth time index (0-11)
 * @param {Object} [options.palaceData] Palace data mapping for stem/branch lookup
 */
function showMajorCycleStars({ cycle, stem, branchIndex, timeIndex, palaceData } = {}) {
    clearMajorCycleStars();

    if (!cycle) return;

    // Determine branch index from palace data if not provided
    let majorCycleBranchIndex = branchIndex;
    if (majorCycleBranchIndex === undefined && palaceData && cycle.palaceIndex !== undefined) {
        const palace = palaceData[cycle.palaceIndex];
        if (palace) {
            majorCycleBranchIndex = palace.index;
        }
    }

    // Calculate major cycle stars based on the cycle palace's heavenly stem, branch, and time
    let majorCycleStars = {};
    const majorCycleModule = getAdapterModule('majorCycleStars');
    if (majorCycleModule && stem) {
        const stemIndex = majorCycleModule.stemCharToIndex(stem);
        if (stemIndex >= 0) {
            majorCycleStars = majorCycleModule.calculateAllMajorCycleStars(
                stemIndex,
                majorCycleBranchIndex,
                timeIndex
            );
        }
    }

    // Pre-bucket stars by palace for O(1) lookup
    const palaceBuckets = new Map();
    for (const [starLabel, palaceIdx] of Object.entries(majorCycleStars)) {
        if (!palaceBuckets.has(palaceIdx)) {
            palaceBuckets.set(palaceIdx, []);
        }
        palaceBuckets.get(palaceIdx).push(starLabel);
    }

    // Display major cycle stars in appropriate palace cells
    Object.entries(cycleDisplayRegistry).forEach(([branchIndex, elements]) => {
        if (!elements) return;
        const { major, annual, wrapper } = elements;
        const branchNum = Number(branchIndex);

        // Get stars for this palace from bucket
        const starsInPalace = palaceBuckets.get(branchNum) || [];

        // Remove previously injected dynamic stars
        if (wrapper) {
            wrapper.querySelectorAll('[data-role="major-cycle"]').forEach(n => n.remove());
        }

        // Render each major cycle star using DocumentFragment
        if (wrapper && starsInPalace.length > 0) {
            const frag = document.createDocumentFragment();
            starsInPalace.forEach((label) => {
                const el = document.createElement('div');
                el.className = 'ziwei-major-cycle-star';
                el.dataset.role = 'major-cycle';
                el.textContent = label;
                frag.appendChild(el);
            });
            wrapper.appendChild(frag);
        }

        // Keep placeholders hidden (we use dynamic items)
        if (major) {
            major.textContent = '';
            major.classList.add('hidden');
            major.style.whiteSpace = '';
            major.style.lineHeight = '';
        }

        if (annual) {
            annual.textContent = '';
            annual.classList.add('hidden');
        }
    });

    if (Number.isInteger(majorCycleBranchIndex)) {
        setMajorCycleMingLabel(majorCycleBranchIndex);
    }
}

/**
 * Apply major cycle four-mutation badges based on cycle stem
 * @param {string} cycleStem Heavenly stem character of the major cycle palace
 */
function applyMajorCycleMutations(cycleStem) {
    clearMajorCycleMutations();

    if (!cycleStem) {
        return;
    }

    // Get mutations data from mutations module
    const mutationsModule = getAdapterModule('mutations');
    if (!mutationsModule || typeof mutationsModule.calculateMajorCycleMutations !== 'function') {
        console.warn('Major cycle mutations module not available');
        return;
    }

    const mutationsData = mutationsModule.calculateMajorCycleMutations(cycleStem);
    if (!mutationsData || !mutationsData.byStar) {
        return;
    }

    // Use reverse index for O(mutations) complexity instead of O(mutations × palaces × stars)
    Object.entries(mutationsData.byStar).forEach(([starName, mutationType]) => {
        const groupList = starElementIndex.get(starName);
        if (!groupList) return;

        groupList.forEach((groupEl) => {
            const wrapper = ensureMutationWrapper(groupEl);
            if (!wrapper) {
                return;
            }

            const mutationMajorEl = wrapper.querySelector('.ziwei-mutation-major');
            if (!mutationMajorEl) {
                return;
            }

            mutationMajorEl.textContent = mutationType;
            mutationMajorEl.style.visibility = 'visible';
            mutationMajorEl.dataset.mutationRole = 'major-cycle';

            const starMutationBox = groupEl.querySelector('.ziwei-star-mutation-box');
            if (starMutationBox) {
                starMutationBox.classList.add('ziwei-with-mutation');
            }

            groupEl.classList.add('ziwei-star-with-mutation');
            groupEl.classList.remove('ziwei-star-no-mutation');
        });
    });
}

function applyAnnualCycleMutations(stemChar) {
    clearAnnualCycleMutations();

    if (!stemChar) {
        return;
    }

    // Get mutations data from mutations module
    const mutationsModule = getAdapterModule('mutations');
    if (!mutationsModule || typeof mutationsModule.calculateAnnualCycleMutations !== 'function') {
        console.warn('Annual cycle mutations module not available');
        return;
    }

    const mutationsData = mutationsModule.calculateAnnualCycleMutations(stemChar);
    if (!mutationsData || !mutationsData.byStar) {
        return;
    }

    // Use reverse index for O(mutations) complexity instead of O(mutations × palaces × stars)
    Object.entries(mutationsData.byStar).forEach(([starName, mutationType]) => {
        const groupList = starElementIndex.get(starName);
        if (!groupList) return;

        groupList.forEach((groupEl) => {
            const wrapper = ensureMutationWrapper(groupEl);
            if (!wrapper) {
                return;
            }

            const mutationAnnualEl = wrapper.querySelector('.ziwei-mutation-annual');
            if (!mutationAnnualEl) {
                return;
            }

            mutationAnnualEl.textContent = mutationType;
            mutationAnnualEl.style.visibility = 'visible';
            mutationAnnualEl.dataset.mutationRole = 'annual-cycle';

            const starMutationBox = groupEl.querySelector('.ziwei-star-mutation-box');
            if (starMutationBox) {
                starMutationBox.classList.add('ziwei-with-mutation');
            }

            groupEl.classList.add('ziwei-star-with-mutation');
            groupEl.classList.remove('ziwei-star-no-mutation');
        });
    });
}

/**
 * Display annual cycle stars (流曜) in all palace cells
 * Adds "流曜" stars alongside existing major cycle stars without clearing them
 * @param {Object} options Annual cycle render options
 * @param {number} [options.age] Age during this annual cycle
 * @param {number} [options.year] Lunar year
 * @param {number} [options.branchIndex] Earthly branch index of the annual palace (0-11)
 */
function showAnnualCycleStars({ age, year, branchIndex, stemChar, timeIndex } = {}) {
    let annualCycleStars = {};
    const branchIdx = Number.isInteger(branchIndex) ? branchIndex : Number(branchIndex);
    const majorCycleModule = getAdapterModule('majorCycleStars');

    if (majorCycleModule && typeof majorCycleModule.calculateAllMajorCycleStars === 'function') {
        const stemIndex = stemChar
            ? majorCycleModule.stemCharToIndex(stemChar)
            : -1;
        if (stemIndex >= 0 && Number.isInteger(branchIdx)) {
            const effectiveTimeIndex = Number.isInteger(timeIndex)
                ? timeIndex
                : 0;
            const rawStars = majorCycleModule.calculateAllMajorCycleStars(
                stemIndex,
                branchIdx,
                effectiveTimeIndex
            );
            annualCycleStars = Object.fromEntries(
                Object.entries(rawStars).map(([starName, palace]) => {
                    const label = starName.startsWith('大')
                        ? starName.replace(/^大/, '流')
                        : `流${starName}`;
                    return [label, palace];
                })
            );
        }
    }

    // Pre-bucket stars by palace for O(1) lookup
    const palaceBuckets = new Map();
    for (const [starLabel, palaceIdx] of Object.entries(annualCycleStars)) {
        if (!palaceBuckets.has(palaceIdx)) {
            palaceBuckets.set(palaceIdx, []);
        }
        palaceBuckets.get(palaceIdx).push(starLabel);
    }

    Object.entries(cycleDisplayRegistry).forEach(([palaceBranchIndex, elements]) => {
        if (!elements) return;
        const { major, annual, wrapper } = elements;
        const branchNum = Number(palaceBranchIndex);

        if (wrapper) {
            wrapper.querySelectorAll('[data-role="annual-cycle"]').forEach(n => n.remove());
        }

        // Get stars for this palace from bucket
        const starsInPalace = palaceBuckets.get(branchNum) || [];

        if (wrapper && starsInPalace.length > 0) {
            const frag = document.createDocumentFragment();
            starsInPalace.forEach((label) => {
                const el = document.createElement('div');
                el.className = 'ziwei-annual-cycle-star';
                el.dataset.role = 'annual-cycle';
                el.textContent = label;
                frag.appendChild(el);
            });
            wrapper.appendChild(frag);
        }

        if (major) {
            major.textContent = '';
            major.classList.add('hidden');
        }

        if (annual) {
            annual.textContent = '';
            annual.classList.add('hidden');
        }
    });

    if (Number.isInteger(branchIdx) && branchIdx >= 0 && branchIdx < 12) {
        setAnnualCycleMingLabel(branchIdx);
    }
}

function clearMajorMingLabel() {
    if (!Number.isInteger(currentMajorCycleMingIndex)) {
        currentMajorCycleMingIndex = null;
        return;
    }

    const record = cycleDisplayRegistry[currentMajorCycleMingIndex];
    const container = record?.palaceContainer;
    if (container) {
        const label = container.querySelector('[data-role="major-cycle-ming"]');
        if (label) {
            label.remove();
        }
    }

    currentMajorCycleMingIndex = null;
}

function setMajorCycleMingLabel(branchIndex) {
    if (!Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex > 11) {
        return;
    }

    clearMajorMingLabel();

    const record = cycleDisplayRegistry[branchIndex];
    const container = record?.palaceContainer;
    if (!container) {
        return;
    }

    const existing = container.querySelector('[data-role="major-cycle-ming"]');
    if (existing) {
        existing.remove();
    }

    const tag = document.createElement('div');
    tag.className = 'ziwei-palace-label ziwei-palace-tag ziwei-palace-tag-major';
    tag.setAttribute('data-role', 'major-cycle-ming');
    tag.textContent = '大命';
    container.prepend(tag);

    currentMajorCycleMingIndex = branchIndex;
}

function clearAnnualMingLabel() {
    if (!Number.isInteger(currentAnnualCycleMingIndex)) {
        currentAnnualCycleMingIndex = null;
        return;
    }

    const record = cycleDisplayRegistry[currentAnnualCycleMingIndex];
    const container = record?.palaceContainer;
    if (container) {
        const label = container.querySelector('[data-role="annual-cycle-ming"]');
        if (label) {
            label.remove();
        }
    }

    currentAnnualCycleMingIndex = null;
}

function setAnnualCycleMingLabel(branchIndex) {
    if (!Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex > 11) {
        return;
    }

    clearAnnualMingLabel();

    const record = cycleDisplayRegistry[branchIndex];
    const container = record?.palaceContainer;
    if (!container) {
        return;
    }

    const existing = container.querySelector('[data-role="annual-cycle-ming"]');
    if (existing) {
        existing.remove();
    }

    const tag = document.createElement('div');
    tag.className = 'ziwei-palace-label ziwei-palace-tag ziwei-palace-tag-annual';
    tag.setAttribute('data-role', 'annual-cycle-ming');
    tag.textContent = '年命';
    container.prepend(tag);

    currentAnnualCycleMingIndex = branchIndex;
}

/**
 * Set a clockwise sequence of major-cycle labels starting from a given palace branch index.
 * Labels array should contain up to 12 strings. The first label will be placed at startBranchIndex,
 * the next at (start+1) mod 12, and so on.
 * @param {number} startBranchIndex
 * @param {Array<string>} labelsArray
 */
function setMajorCycleLabels(startBranchIndex, labelsArray) {
    if (!Number.isInteger(startBranchIndex) || startBranchIndex < 0 || startBranchIndex > 11) return;
    if (!Array.isArray(labelsArray) || labelsArray.length === 0) return;

    // Clear any previously placed major-cycle sequence labels first
    clearMajorCycleLabels();
    labelsArray.forEach((labelText, i) => {
        const targetIndex = (startBranchIndex + i) % 12;
        const record = cycleDisplayRegistry[targetIndex];
        const container = record?.palaceContainer;
        if (!container) return;

        // For the first label (index 0) prefer the existing major-cycle-ming tag
        if (i === 0) {
            // Ensure the canonical major-cycle-ming label exists and has correct text
            setMajorCycleMingLabel(targetIndex);
            // Update text if different
            const existing = container.querySelector('[data-role="major-cycle-ming"]');
            if (existing && existing.textContent !== labelText) {
                existing.textContent = labelText;
            }
            return;
        }

        // Use a predictable data-role so we can clear them later
        const roleName = `major-cycle-label-${i}`;
        const existing = container.querySelector(`[data-role="${roleName}"]`);
        if (existing) existing.remove();

        const tag = document.createElement('div');
        tag.className = 'ziwei-palace-label ziwei-palace-tag ziwei-palace-tag-major';
        tag.setAttribute('data-role', roleName);
        tag.textContent = labelText;
        container.prepend(tag);
    });

    // Keep track of the first (大命) palace index for compatibility with other helpers
    currentMajorCycleMingIndex = startBranchIndex;
}

/**
 * Clear any major-cycle sequence labels inserted by setMajorCycleLabels
 */
function clearMajorCycleLabels() {
    Object.values(cycleDisplayRegistry).forEach((record) => {
        const container = record?.palaceContainer;
        if (!container) return;
        const nodes = container.querySelectorAll('[data-role^="major-cycle-label-"]');
        nodes.forEach((n) => n.remove());
    });
}

/**
 * Set an ordered sequence of annual-cycle labels (skip the main 年命 palace).
 * labelsArray should contain labels in clockwise order excluding the main '年命'.
 * They will be placed starting at startBranchIndex+1, +2, ...
 * @param {number} startBranchIndex
 * @param {Array<string>} labelsArray
 */
function setAnnualCycleLabels(startBranchIndex, labelsArray) {
    if (!Number.isInteger(startBranchIndex) || startBranchIndex < 0 || startBranchIndex > 11) return;
    if (!Array.isArray(labelsArray) || labelsArray.length === 0) return;

    // Clear any previous annual labels
    clearAnnualCycleLabels();

    labelsArray.forEach((labelText, i) => {
        // Place labels starting at the next palace clockwise (skip the main 年命 palace)
        const targetIndex = (startBranchIndex + 1 + i) % 12;
        const record = cycleDisplayRegistry[targetIndex];
        const container = record?.palaceContainer;
        if (!container) return;

        const roleName = `annual-cycle-label-${i}`;
        const existing = container.querySelector(`[data-role="${roleName}"]`);
        if (existing) existing.remove();

        const tag = document.createElement('div');
        tag.className = 'ziwei-palace-label ziwei-palace-tag ziwei-palace-tag-annual';
        tag.setAttribute('data-role', roleName);
        tag.textContent = labelText;
        container.prepend(tag);
    });
}

/**
 * Clear any annual-cycle sequence labels inserted by setAnnualCycleLabels
 */
function clearAnnualCycleLabels() {
    Object.values(cycleDisplayRegistry).forEach((record) => {
        const container = record?.palaceContainer;
        if (!container) return;
        const nodes = container.querySelectorAll('[data-role^="annual-cycle-label-"]');
        nodes.forEach((n) => n.remove());
    });
}

/**
 * Register star group DOM element for later mutation augmentation
 * @param {number} branchIndex Palace branch index (0-11)
 * @param {string} starName Star name
 * @param {HTMLElement} groupEl DOM element containing the star block
 */
function registerStarGroup(branchIndex, starName, groupEl) {
    if (!starMutationRegistry[branchIndex]) {
        starMutationRegistry[branchIndex] = {};
    }

    if (!starMutationRegistry[branchIndex][starName]) {
        starMutationRegistry[branchIndex][starName] = [];
    }

    starMutationRegistry[branchIndex][starName].push(groupEl);
    
    // Also populate reverse index for fast mutation lookups
    if (!starElementIndex.has(starName)) {
        starElementIndex.set(starName, []);
    }
    starElementIndex.get(starName).push(groupEl);
}

/**
 * Create a star + mutation group element
 * @param {string} starName Star name to render
 * @param {string} starClass CSS class for the star span
 * @param {string|null} mutationType Mutation symbol if available
 * @returns {HTMLElement} DOM element containing star + mutation decor
 */
function createMutationSlot(className, mutationChar = '', roleName) {
    const slot = document.createElement('span');
    slot.className = className;

    if (mutationChar) {
        slot.textContent = mutationChar;
        slot.style.visibility = 'visible';
        if (roleName) {
            slot.dataset.mutationRole = roleName;
        }
    } else {
        slot.textContent = '';
        slot.style.visibility = 'hidden';
    }

    return slot;
}

function ensureMutationWrapper(groupEl) {
    let wrapper = groupEl.querySelector('.ziwei-mutations-wrapper');
    if (wrapper) {
        return wrapper;
    }

    const starMutationBox = groupEl.querySelector('.ziwei-star-mutation-box');
    if (!starMutationBox) {
        return null;
    }

    wrapper = document.createElement('div');
    wrapper.className = 'ziwei-mutations-wrapper';

    wrapper.appendChild(createMutationSlot('ziwei-mutation ziwei-mutation-birth'));
    wrapper.appendChild(createMutationSlot('ziwei-mutation ziwei-mutation-major'));
    wrapper.appendChild(createMutationSlot('ziwei-mutation ziwei-mutation-annual'));

    starMutationBox.appendChild(wrapper);
    return wrapper;
}

/**
 * Create a star group element with mutation marks and brightness indicator
 *
 * @param {string} starName The name of the star (主星 or 輔星)
 * @param {string} starClass CSS class for the star (ziwei-primary-star or ziwei-secondary-star)
 * @param {string|null} mutationBirth Birth year mutation character (生年四化) or null
 * @param {string|null} mutationMajor Major cycle mutation character (大限四化) or null
 * @param {string|null} mutationAnnual Annual cycle mutation character (流年四化) or null
 * @param {string} brightness Brightness indicator character (廟/旺/利/平/陷) or empty string
 * @returns {HTMLElement} The constructed star group element
 */
function createStarGroupElement(starName, starClass, mutationBirth, mutationMajor, mutationAnnual, brightness = '') {
    const groupEl = document.createElement('div');
    groupEl.className = 'ziwei-star-mutation-group';

    // Star + Mutation wrapper - horizontal layout
    const starMutationBox = document.createElement('div');
    starMutationBox.className = 'ziwei-star-mutation-box';
    
    // Star on the left
    const starEl = document.createElement('span');
    starEl.className = starClass;
    starEl.textContent = starName;
    starMutationBox.appendChild(starEl);

    // Only create mutations wrapper if there are any mutations
    const mutationConfig = [
        { className: 'ziwei-mutation ziwei-mutation-birth', value: mutationBirth, role: 'birth-year' },
        { className: 'ziwei-mutation ziwei-mutation-major', value: mutationMajor, role: 'major-cycle' },
        { className: 'ziwei-mutation ziwei-mutation-annual', value: mutationAnnual, role: 'annual-cycle' }
    ];

    if (mutationConfig.some(config => Boolean(config.value))) {
        const mutationsWrapper = document.createElement('div');
        mutationsWrapper.className = 'ziwei-mutations-wrapper';

        mutationConfig.forEach(({ className, value, role }) => {
            mutationsWrapper.appendChild(createMutationSlot(className, value, role));
        });

        starMutationBox.appendChild(mutationsWrapper);
        starMutationBox.classList.add('ziwei-with-mutation');
        groupEl.classList.add('ziwei-star-with-mutation');
        groupEl.classList.remove('ziwei-star-no-mutation');
    } else {
        groupEl.classList.remove('ziwei-star-with-mutation');
        groupEl.classList.add('ziwei-star-no-mutation');
    }

    groupEl.appendChild(starMutationBox);

    // Add brightness indicator below the star (left-aligned, fixed left offset)
    // Displays brightness status (e.g. 廟/旺/利/平/陷). Keep the DOM minimal so CSS can position it.
    if (brightness) {
        const brightnessEl = document.createElement('div');
        brightnessEl.className = 'ziwei-star-brightness';
        brightnessEl.textContent = brightness;
        groupEl.appendChild(brightnessEl);
    }

    return groupEl;
}

/**
 * Fail hard: show a user-facing error and abort rendering by throwing.
 * This enforces the "no fallback" policy for core calculation failures.
 * @param {string} message Human-friendly error message (Chinese)
 */
function failAndAbort(message) {
    const userMessage = typeof message === 'string' ? message : '排盤時發生錯誤，請檢查輸入或聯絡管理員';
    try {
        if (window.ziweiForm && typeof window.ziweiForm.showError === 'function') {
            window.ziweiForm.showError(userMessage, true);
        } else {
            // Fallback to alert when form error UI is unavailable
            alert(userMessage);
        }
    } catch (e) {
        // Ensure we still abort even if showing the UI fails
        try { console.error('Failed showing error UI:', e); } catch (_) {}
    }
    // Throw to abort the draw() call and bubble to caller which will handle UI state
    throw new Error(userMessage);
}

/**
 * Append a set of stars to the shared container (batch operation with DocumentFragment)
 * 
 * This function filters stars to only those matching the current branchIndex and appends
 * them to the container using DocumentFragment for batch DOM operations. This is called
 * twice per palace: once for primary stars, once for secondary stars.
 * 
 * Performance: O(n) where n = total star entries, but only matching stars are appended.
 * All DOM writes batched into single appendChild(fragment) operation.
 * 
 * @param {HTMLElement} container Shared container element for all palace's stars
 * @param {Object} starsData Mapping: {starName -> palaceIndex} from calculation modules
 * @param {number} branchIndex Current palace branch index (0-11) to filter stars
 * @param {string} starClass CSS class for rendered star: "ziwei-primary-star" or "ziwei-secondary-star"
 * @param {Object} mutationBirthLookup Map: {starName -> birthMutationType} for 生年四化
 * @param {Object} mutationMajorLookup Map: {starName -> majorMutationType} for 大限四化
 * @param {Object} mutationAnnualLookup Map: {starName -> annualMutationType} for 流年四化
 * @param {Object} brightnessData Mapping for brightness display
 */
function appendStarsToContainer(container, starsData, branchIndex, starClass, mutationBirthLookup, mutationMajorLookup, mutationAnnualLookup, brightnessData = {}) {
    if (!starsData || !container) return;

    // Use DocumentFragment to batch DOM operations: build tree, then single appendChild()
    // This avoids reflow/repaint for each individual star element
    const frag = document.createDocumentFragment();
    
    Object.entries(starsData).forEach(([starName, starPalaceIndex]) => {
        const palaceIdx = typeof starPalaceIndex === 'number'
            ? starPalaceIndex
            : starPalaceIndex?.palaceIndex;

        if (palaceIdx !== branchIndex) {
            return;
        }

        const mutationBirth = mutationBirthLookup?.[starName] || null;
        const mutationMajor = mutationMajorLookup?.[starName] || null;
        const mutationAnnual = mutationAnnualLookup?.[starName] || null;
        const brightness = brightnessData[starName]?.brightness || '';
        const starGroupEl = createStarGroupElement(starName, starClass, mutationBirth, mutationMajor, mutationAnnual, brightness);
        frag.appendChild(starGroupEl);
        registerStarGroup(branchIndex, starName, starGroupEl);
    });
    
    if (frag.childNodes.length > 0) {
        container.appendChild(frag);
    }
}

/**
 * Convert branch index (0-11) to Chinese character
 * 0=子, 1=丑, 2=寅, 3=卯, 4=辰, 5=巳, 6=午, 7=未, 8=申, 9=酉, 10=戌, 11=亥
 * @param {number} branchIndex The branch index (0-11)
 * @returns {string} The Chinese character for this branch
 */
function branchNumToChar(branchIndex) {
    const branches = window.ziweiConstants && window.ziweiConstants.BRANCH_NAMES;
    if (!Array.isArray(branches) || branches.length !== 12) {
        throw new Error('[chart.js] BRANCH_NAMES not available from constants');
    }
    return branches[branchIndex] || '';
}

/**
 * Render Ziwei chart from API/adapter data.
 * Minimal orchestrator: validate adapter then proceed.
 * @param {Object} context API/adapter output
 * @returns {HTMLElement}
 */
function draw(context) {
    const adapter = window.ziweiAdapter;
    if (!adapter || !adapter.input || !adapter.output) {
        throw new Error('資料轉換模組尚未載入，無法繪製命盤');
    }

    const isAdapterError = adapter.errors?.isAdapterError;

    let adapterOutput = null;
    let calcResult = null;

    if (context && context.adapterOutput) {
        adapterOutput = context.adapterOutput;
        calcResult = context.calcResult || null;
    } else if (context && context.meta && context.sections) {
        adapterOutput = context;
    }

    if (!adapterOutput) {
        console.error('[ziweiChart] No adapter output supplied to renderer');
        failAndAbort('命盤資料不足，顯示層僅接受轉接層資料');
        return document.createElement('div');
    }

    const grid = document.createElement('div');
    grid.className = 'ziwei-4x4-grid';
    grid.style.opacity = '0';

    clearMajorCycleStars();
    clearMajorCycleMutations();
    resetCycleRegistries();

    const meta = adapterOutput.meta || {};
    const sections = adapterOutput.sections || {};
    const derived = adapterOutput.derived || {};
    const palaces = sections.palaces || derived.palaces || {};
    const primaryStars = sections.primaryStars || {};
    const secondaryStars = sections.secondaryStars || {};
    const minorStars = sections.minorStars || {};
    const mutations = sections.mutations || null;
    const attributes = sections.attributes || null;
    const brightness = sections.brightness || {};
    if (window.ziweiCalData && window.ziweiCalData.env && window.ziweiCalData.env.isDebug) {
        console.log('[ziweiChart.draw] brightness:', brightness);
    }
    const lifeCycles = sections.lifeCycles || {};
    const nayinInfo = derived.nayin || { loci: null, name: '' };
    const lunarYear = adapterOutput.lunar?.lunarYear || 0;
    const timeIndex = adapterOutput.indices?.timeIndex ?? adapterOutput.lunar?.timeIndex ?? 0;

    const expectPrimary = adapterHasModule('primary');
    const expectSecondary = adapterHasModule('secondary');
    const expectMinor = adapterHasModule('minorStars');
    const expectMutations = adapterHasModule('mutations');
    const expectAttributes = adapterHasModule('attributes');

    if (!palaces || Object.keys(palaces).length === 0) {
        console.error('[ziweiChart] Palace data missing', adapterOutput.errors?.palaces);
        failAndAbort('宮位計算失敗：無法取得任何宮位，請檢查出生資料是否完整');
    }
    if (expectPrimary && (!primaryStars || Object.keys(primaryStars).length === 0)) {
        console.error('[ziweiChart] Primary stars missing', adapterOutput.errors?.primaryStars);
        failAndAbort('主星計算失敗：無法安置主星，請檢查輸入或聯絡管理員');
    }
    if (expectSecondary && (!secondaryStars || Object.keys(secondaryStars).length === 0)) {
        console.error('[ziweiChart] Secondary stars missing', adapterOutput.errors?.secondaryStars);
        failAndAbort('輔星計算失敗：無法安置輔佐星曜');
    }
    if (expectMinor && (!minorStars || Object.keys(minorStars).length === 0)) {
        console.error('[ziweiChart] Minor stars missing', adapterOutput.errors?.minorStars);
        failAndAbort('雜曜計算失敗：無法產生雜曜資料');
    }
    if (expectMutations && (!mutations || Object.keys(mutations).length === 0)) {
        console.error('[ziweiChart] Mutation data missing', adapterOutput.errors?.mutations);
        failAndAbort('四化計算失敗：無法計算生年四化標記');
    }
    if (expectAttributes && (!attributes || Object.keys(attributes).length === 0)) {
        console.error('[ziweiChart] Attribute data missing', adapterOutput.errors?.attributes);
        failAndAbort('神煞計算失敗：無法取得神煞或太歲資料');
    }

    lastPalaceDataRef = palaces;

    const minorStarsBuckets = Array.from({ length: 12 }, () => []);
    if (minorStars && typeof minorStars === 'object') {
        Object.entries(minorStars).forEach(([starName, placement]) => {
            if (Array.isArray(placement)) {
                placement.forEach((idx) => {
                    if (idx >= 0 && idx < 12) {
                        minorStarsBuckets[idx].push(starName);
                    }
                });
            } else if (typeof placement === 'number' && placement >= 0 && placement < 12) {
                minorStarsBuckets[placement].push(starName);
            }
        });
    }

    const majorCycles = Array.isArray(lifeCycles.major) ? lifeCycles.major : [];
    const twelveLongLifePositions = lifeCycles.twelve || {};

    const lifeCyclePayload = {
        majorCycles,
        twelveLongLifePositions,
        nayinLoci: nayinInfo.loci,
        mingPalaceIndex: derived.mingPalace ? derived.mingPalace.index : null,
        palaceData: palaces,
        timeIndex
    };
    majorCycles.forEach((cycle) => {
        if (cycle && Number.isInteger(cycle.palaceIndex)) {
            lifeCyclePayload[cycle.palaceIndex] = cycle;
        }
    });

    const hasPalaceData = Object.keys(palaces).length > 0;
    grid.dataset.lunarYear = String(lunarYear);

    for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 4; col++) {
            if ((row === 2 || row === 3) && (col === 2 || col === 3)) {
                continue;
            }
            grid.appendChild(createPalaceCell(
                row,
                col,
                palaces,
                primaryStars,
                secondaryStars,
                lifeCyclePayload,
                mutations,
                minorStarsBuckets,
                attributes,
                hasPalaceData,
                brightness.primary || {},
                brightness.secondary || {}
            ));
        }
    }

    grid.appendChild(createCenterCell(meta, palaces, lunarYear, derived.mingPalace, nayinInfo.name));

    requestAnimationFrame(() => {
        grid.style.transition = 'opacity 300ms ease';
        requestAnimationFrame(() => {
            grid.style.opacity = '1';
        });
    });

    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'ziwei-chart-wrapper';
    chartWrapper.setAttribute('data-ziwei-chart', '1');
    
    const adapterSettings = window.ziweiAdapter && window.ziweiAdapter.settings;
    const brightnessSetting = adapterSettings && typeof adapterSettings.get === 'function'
        ? adapterSettings.get('starBrightness') || 'hidden'
        : 'hidden';
    chartWrapper.setAttribute('data-star-brightness', brightnessSetting);
    
    chartWrapper.style.marginBottom = '30px';
    chartWrapper.appendChild(grid);

    try {
        const adapter = window.ziweiAdapter;
        if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
            adapter.storage.set('adapterOutput', adapterOutput);
            if (calcResult) {
                adapter.storage.set('calcResult', calcResult);
            }
            adapter.storage.set('meta', Object.assign({}, meta, { lunar: adapterOutput.lunar }));
            adapter.storage.set('normalizedInput', adapterOutput.normalized || {});
        }
    } catch (e) {}

    const palaceInteraction = window.initializePalaceInteraction
        ? window.initializePalaceInteraction(grid) || null
        : null;

    const cyclePanel = window.ziweiCycles && typeof window.ziweiCycles.initializeCyclePanel === 'function'
        ? window.ziweiCycles.initializeCyclePanel(lifeCyclePayload, grid, palaceInteraction)
        : null;
    if (cyclePanel) {
        chartWrapper.appendChild(cyclePanel);
    }
    // Reapply personal info visibility state from sessionStorage immediately
    if (window.ziweiConfig?.reapplyPersonalInfoStateImmediately) {
        window.ziweiConfig.reapplyPersonalInfoStateImmediately(chartWrapper);
    }

    // Unified event listeners for setting changes
    // All settings now use consistent event-driven pattern
    
    // Star brightness setting
    document.addEventListener('ziwei-starBrightness-changed', function handleStarBrightnessChange(e) {
        const detail = e && e.detail ? e.detail : {};
        const brightnessValue = detail.value || 'hidden';
        
        // Update chart wrapper's data attribute for CSS-driven visibility
        let chart = document.querySelector('[data-ziwei-chart]') || 
                   document.querySelector('.ziwei-chart-wrapper');
        
        if (chart) {
            chart.setAttribute('data-star-brightness', brightnessValue);
        }
        
        if (window.ziweiCalData && window.ziweiCalData.env && window.ziweiCalData.env.isDebug) {
            console.log('[ziweiChart] Star brightness changed to:', brightnessValue);
        }
    });

    // XunKong (截空旬空) setting
    document.addEventListener('ziwei-xunkong-changed', function handleXunKongChange(e) {
        const detail = e && e.detail ? e.detail : {};
        const xunKongValue = detail.value || 'marked';
        
        // Update chart wrapper's data attribute to control xunKong display mode
        chartWrapper.setAttribute('data-xunkong-mode', xunKongValue);
        
        // Find and update xunKong/jieKong minor star visibility
        const allMinorStarElements = document.querySelectorAll('.ziwei-minor-star');
        allMinorStarElements.forEach((element) => {
            const starName = element.textContent.trim();
            // Secondary stars to hide when primaryOnly: 副旬、副截
            if (starName === '副旬' || starName === '副截') {
                if (xunKongValue === 'primaryOnly') {
                    element.style.display = 'none';
                } else {
                    element.style.display = '';
                }
            }
        });
        
        if (window.ziweiCalData && window.ziweiCalData.env && window.ziweiCalData.env.isDebug) {
            console.log('[ziweiChart] T086: xunKong setting changed to:', xunKongValue);
        }
    });

    document.addEventListener('ziwei-palace-name-changed', function handlePalaceNameChange(e) {
        const detail = e && e.detail ? e.detail : {};
        const settingName = detail.settingName;
        const newValue = detail.newValue;
        
        if (!settingName || !newValue) {
            console.warn('[ziweiChart] Invalid palace name change event detail');
            return;
        }
        
        // Define palace name mappings
        const palaceNameMappings = {
            palaceNameCareer: {
                career: '事業',
                official: '官祿'
            },
            palaceNameFriends: {
                friends: '交友',
                servants: '奴僕',
                servants_alt: '僕役'
            }
        };
        
        // Get the display name for the selected value
        const mapping = palaceNameMappings[settingName];
        if (!mapping || !mapping[newValue]) {
            console.warn('[ziweiChart] Unknown palace name value:', newValue, 'for setting:', settingName);
            return;
        }
        
        const displayName = mapping[newValue];
        
        // Find palace by name (宮位名稱) instead of index
        // Event handler needs to find the palace that matches the setting
        let targetPalaceName = null;
        if (settingName === 'palaceNameCareer') {
            // Find which palace name this is - could be 事業 or 官祿
            targetPalaceName = displayName;  // The new display name
        } else if (settingName === 'palaceNameFriends') {
            targetPalaceName = displayName;
        }
        
        if (!targetPalaceName) {
            console.warn('[ziweiChart] Could not determine target palace name');
            return;
        }
        
        // Find all palace name elements and update those that match
        const palaceNameElements = document.querySelectorAll('.ziwei-palace-name');
        let updated = false;
        
        palaceNameElements.forEach((el) => {
            const currentText = el.textContent.trim();
            // Check if this palace matches one of the old names for this setting
            let isTargetPalace = false;
            
            if (settingName === 'palaceNameCareer') {
                // This palace should be 事業宮 or 官祿宮 (relative position 4 from Ming)
                // We identify it by checking if the current name is either 事業 or 官祿 or their Shen combinations
                if (currentText === '事業' || currentText === '官祿' || 
                    currentText === '身事' || currentText === '身官') {
                    isTargetPalace = true;
                }
            } else if (settingName === 'palaceNameFriends') {
                // This palace should be 交友宮 or 奴僕宮 or 僕役 (relative position 5 from Ming)
                // Note: Friends Palace cannot be Shen Palace, so no Shen combinations here
                if (currentText === '交友' || currentText === '奴僕' || currentText === '僕役') {
                    isTargetPalace = true;
                }
            }
            
            if (isTargetPalace) {
                // Check if this is Shen Palace (身宮)
                const cell = el.closest('.ziwei-cell');
                const isShenPalace = cell && cell.classList.contains('ziwei-palace-shen');
                
                let finalName = displayName;
                
                // If this is Shen Palace and this is the Career palace, apply combined name
                if (isShenPalace && settingName === 'palaceNameCareer') {
                    const shenCombineMap = {
                        '事業': '身事',
                        '官祿': '身官'
                    };
                    finalName = shenCombineMap[displayName] || displayName;
                }
                // Friends Palace cannot be Shen Palace, so no Shen combination logic needed here
                
                el.textContent = finalName;
                updated = true;
            }
        });
        
        if (!updated) {
            console.warn('[ziweiChart] No palace name element found to update for setting:', settingName);
        }
    });

    document.addEventListener('ziwei-wounded-servant-changed', function handleWoundedServantChange(e) {
        const detail = e && e.detail ? e.detail : {};
        const woundedServantValue = detail.value || 'zhongzhou';
        
        console.log('[ziweiChart] Wounded servant handling changed to:', woundedServantValue);
        
        // Get the last calculated adapter output to access palace and minor stars data
        if (!window.ziweiAdapter || typeof window.ziweiAdapter.output?.getLastOutput !== 'function') {
            console.warn('[ziweiChart] Adapter not available to recalculate wounded servant positions');
            return;
        }
        
        const adapterOutput = window.ziweiAdapter.output.getLastOutput();
        if (!adapterOutput || !adapterOutput.derived || !adapterOutput.derived.palaceList) {
            console.warn('[ziweiChart] No palace data available for wounded servant recalculation');
            return;
        }
        
        // Find migration palace (遷移 or any palace containing '遷')
        const palaceList = adapterOutput.derived.palaceList;
        let migrationPalaceIndex = null;
        for (let i = 0; i < palaceList.length; i++) {
            const palace = palaceList[i];
            if (palace && (palace.name === '遷移' || (palace.name && palace.name.indexOf('遷') !== -1))) {
                migrationPalaceIndex = palace.index;
                break;
            }
        }
        
        if (migrationPalaceIndex === null) {
            console.warn('[ziweiChart] Could not find migration palace for wounded servant recalculation');
            return;
        }
        
        // Calculate new positions based on woundedServantHandling setting
        let tianShangIndex, tianShiIndex;
        
        if (woundedServantValue === 'noDistinction') {
            // Fixed positions: 天傷 at 交友 (遷移-1), 天使 at 疾厄 (遷移+1)
            tianShangIndex = (migrationPalaceIndex - 1 + 12) % 12;
            tianShiIndex = (migrationPalaceIndex + 1) % 12;
        } else {
            // 'zhongzhou' (default): Calculate based on gender and year
            const basicModule = window.ziweiAdapter.getModule('basic');
            if (!basicModule || !adapterOutput.meta || !adapterOutput.lunar) {
                console.warn('[ziweiChart] Missing data for zhongzhou calculation');
                return;
            }
            
            const gender = adapterOutput.meta.gender;
            const lunarYear = adapterOutput.lunar.lunarYear;
            const clockwise = basicModule.isClockwise(gender, lunarYear);
            const offset = clockwise ? -1 : 1;
            
            tianShangIndex = (migrationPalaceIndex + offset + 12) % 12;
            tianShiIndex = (migrationPalaceIndex - offset + 12) % 12;
        }
        
        console.log('[ziweiChart] Recalculated wounded servant positions: 天傷=%d, 天使=%d', tianShangIndex, tianShiIndex);
        
        // Update DOM: Remove old 天傷 and 天使 elements and place them at new positions
        const allMinorStarElements = document.querySelectorAll('.ziwei-minor-star');
        console.log('[ziweiChart] Found %d minor star elements', allMinorStarElements.length);
        const starElementsToMove = { '天傷': null, '天使': null };
        
        // Find and remove existing 天傷 and 天使 stars
        allMinorStarElements.forEach((element) => {
            const starName = element.textContent.trim();
            if (starName === '天傷' || starName === '天使') {
                starElementsToMove[starName] = element.cloneNode(true);
                element.remove();
                console.log('[ziweiChart] Removed %s from DOM', starName);
            }
        });
        
        // Place the stars at their new palace positions
        // Note: Palace cells use data-branch-index, not data-palace-index
        // branchIndex corresponds to the palace index (0-11)
        if (starElementsToMove['天傷']) {
            const selector = `[data-branch-index="${tianShangIndex}"]`;
            const tianShangPalaceCell = document.querySelector(selector);
            console.log('[ziweiChart] Looking for palace at selector: %s, found: %s', selector, tianShangPalaceCell ? 'yes' : 'no');
            if (tianShangPalaceCell) {
                const minorStarsContainer = tianShangPalaceCell.querySelector('.ziwei-minor-stars-container');
                if (minorStarsContainer) {
                    const group = minorStarsContainer.querySelector('.ziwei-minor-stars-group') || minorStarsContainer;
                    group.appendChild(starElementsToMove['天傷']);
                    console.log('[ziweiChart] Moved 天傷 to palace index %d', tianShangIndex);
                } else {
                    console.warn('[ziweiChart] No minor stars container found, appending to cell');
                    tianShangPalaceCell.appendChild(starElementsToMove['天傷']);
                    console.log('[ziweiChart] Appended 天傷 directly to palace cell at index %d', tianShangIndex);
                }
            }
        }
        
        if (starElementsToMove['天使']) {
            const selector = `[data-branch-index="${tianShiIndex}"]`;
            const tianShiPalaceCell = document.querySelector(selector);
            console.log('[ziweiChart] Looking for palace at selector: %s, found: %s', selector, tianShiPalaceCell ? 'yes' : 'no');
            if (tianShiPalaceCell) {
                const minorStarsContainer = tianShiPalaceCell.querySelector('.ziwei-minor-stars-container');
                if (minorStarsContainer) {
                    const group = minorStarsContainer.querySelector('.ziwei-minor-stars-group') || minorStarsContainer;
                    group.appendChild(starElementsToMove['天使']);
                    console.log('[ziweiChart] Moved 天使 to palace index %d', tianShiIndex);
                } else {
                    console.warn('[ziweiChart] No minor stars container found, appending to cell');
                    tianShiPalaceCell.appendChild(starElementsToMove['天使']);
                    console.log('[ziweiChart] Appended 天使 directly to palace cell at index %d', tianShiIndex);
                }
            }
        }
    });

    // 🎨 發出事件，通知其他模塊圖表已繪製完成
    // 這允許 share.js 等動態加載的模塊在圖表準備好後進行初始化
    if (window.dispatchEvent) {
        const chartDrawnEvent = new CustomEvent("ziwei-chart-drawn", {
            detail: {
                chartWrapper: chartWrapper,
                meta: meta,
                timestamp: Date.now(),
                palaceCount: Object.keys(palaces).length
            }
        });
        window.dispatchEvent(chartDrawnEvent);
        console.log('[ziweiChart] 發出 ziwei-chart-drawn 事件');
    }

        return chartWrapper;
}

/**
 * Create the large center cell
 * @param {Object} meta Metadata about the person
 * @param {Object} palaceData Palace position mapping from calculatePalacePositions
 * @param {number} lunarYear Lunar year for master/body palace lookup
 * @param {Object|null} mingPalaceData Cached Ming palace data
 * @param {string|null} mingNayinName Cached Nayin name for Ming palace
 * @returns {HTMLElement} The center cell element
 */
function createCenterCell(meta, palaceData = {}, lunarYear = 0, mingPalaceData = null, mingNayinName = null) {
    const cell = document.createElement('div');
    cell.className = 'ziwei-center-big';
    // Apply inline styles to ensure theme CSS cannot override these critical visual properties
    cell.style.background = '#f6f8fb';
    cell.style.display = 'flex';
    cell.style.flexDirection = 'column';
    cell.style.justifyContent = 'center';
    cell.style.alignItems = 'flex-start';

    // left-aligned container inside center cell
    const left = document.createElement('div');
    left.className = 'ziwei-center-left';

    // Name and Gender Classification row
    const nameGenderRow = document.createElement('div');
    nameGenderRow.className = 'ziwei-name-gender-row';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'ziwei-name';
    nameEl.textContent = meta.name || '';

    // Calculate gender classification (陽男/陰男/陽女/陰女)
    let genderClassEl = null;
    const genderModule = getAdapterModule('gender');
    if (meta.lunar && genderModule && typeof genderModule.getGenderClassification === 'function') {
        const classification = genderModule.getGenderClassification(
            meta.gender,
            meta.lunar.lunarYear
        );
        genderClassEl = document.createElement('div');
        genderClassEl.className = 'ziwei-gender-classification';
        genderClassEl.textContent = classification;
    }

    // Nayin (納音) Five Elements Loci
    let nayinEl = null;
    if (mingNayinName) {
        nayinEl = document.createElement('div');
        nayinEl.className = 'ziwei-nayin';
        nayinEl.textContent = mingNayinName;
    } else {
        console.error('[ziweiChart] Missing nayin data from adapter output for Ming palace');
        failAndAbort('命盤資料缺少納音資訊，顯示層不進行計算，請確認計算模組已提供納音結果');
    }

    // Add all elements to the same row
    nameGenderRow.appendChild(nameEl);
    if (genderClassEl) {
        nameGenderRow.appendChild(genderClassEl);
    }
    if (nayinEl) {
        nameGenderRow.appendChild(nayinEl);
    }
    
    left.appendChild(nameGenderRow);
    
    // Format Gregorian date and time display from adapter meta
    const whenEl = document.createElement('div');
    whenEl.className = 'ziwei-datetime';
    if (meta.birthdateSolarText) {
        whenEl.textContent = meta.birthdateSolarText;
    } else {
        console.error('[ziweiChart] Adapter meta missing birthdateSolarText');
        whenEl.textContent = '西曆：資料缺失';
    }

    // Lunar display element (adapter supplies fully formatted text)
    const lunarEl = document.createElement('div');
    lunarEl.className = 'ziwei-datetime ziwei-lunar';
    if (meta.birthdateLunarText) {
        lunarEl.textContent = meta.birthdateLunarText;
    } else {
        console.error('[ziweiChart] Adapter meta missing birthdateLunarText');
        lunarEl.textContent = '農曆：資料缺失';
    }

    // Master and Body Palace information
    let masterBodyEl = null;
    if (meta.lunar) {
        const basicModule = getAdapterModule('basic');
        if (basicModule) {
            // Use pre-calculated lunarYear from draw() start
            const masterPalace = basicModule.getMasterPalace(lunarYear);
            const bodyPalace = basicModule.getBodyPalace(lunarYear);
            masterBodyEl = document.createElement('div');
            masterBodyEl.className = 'ziwei-master-body-row';
            const masterInfo = document.createElement('span');
            masterInfo.className = 'ziwei-master-info';
            masterInfo.textContent = `命主：${masterPalace.starName}`;
            const bodyInfo = document.createElement('span');
            bodyInfo.className = 'ziwei-body-info';
            bodyInfo.textContent = `身主：${bodyPalace.starName}`;
            masterBodyEl.appendChild(masterInfo);
            masterBodyEl.appendChild(bodyInfo);
        }
    }

    // Append elements into left container in order (name + gender on top-left)
    left.appendChild(whenEl);
    left.appendChild(lunarEl);
    if (masterBodyEl) {
        left.appendChild(masterBodyEl);
    }

    cell.appendChild(left);

    return cell;
}

/**
 * Format lunar object into Chinese string
 * Frontend uses local LunarSolarConverter (1900-2100)
 * Returns format: { year: "癸卯年，兔", date: "二月初十", lunarYear, lunarMonth, lunarDay, ... }
 * Example output: 癸卯年二月初十午時
 */
// Adapter provides fully formatted lunar strings; legacy formatters removed.

/**
 * Create a palace cell for the chart (represents one of 12 palaces)
 * 
 * Structure (reading top-to-bottom, left-to-right):
 * ├─ .ziwei-stars-container (primary + secondary stars, top-center)
 * ├─ .ziwei-minor-stars-container (43 minor stars, mid-left) 
 * ├─ .ziwei-palace-container (name + stem-branch, vertical text, bottom-right)
 * ├─ .ziwei-attributes-container (3 Tai Sui attributes, bottom-left)
 * ├─ .ziwei-cycle-stars-wrapper (major/annual cycle placeholders)
 * └─ .ziwei-life-cycle-container (age ranges, bottom-center)
 * 
 * Performance optimizations:
 * - minorStarsBuckets pre-indexes all minor stars by palace for O(1) lookup
 * - DocumentFragment used for batch appending (no individual DOM writes)
 * - starElementIndex registered for cycles.js to update dynamically
 * 
 * @param {number} row Row number (1-4) in 4×4 grid
 * @param {number} col Column number (1-4) in 4×4 grid
 * @param {Object} palaceData Palace position mapping from calculatePalacePositions: {0-11 -> {name, stem, branch...}}
 * @param {Object} primaryStarsData Primary stars from placePrimaryStars: {starName -> palaceIndex}
 * @param {Object} secondaryStarsData Secondary stars from calculateAllSecondaryStars: {starName -> palaceIndex}
 * @param {Object} lifeCycleData Life cycle info: {0-11 -> {majorCycles, twelveLongLifePositions, ...}}
 * @param {Object|null} mutationsData Four mutations (祿權科忌): {byStar -> {starName -> mutationType}}
 * @param {Array<Array<string>>} minorStarsBuckets Pre-bucketed array[12] of minor star names by palace
 * @param {Object} taiSuiStarsData Tai Sui attributes from calculateAllAttributes
 * @param {boolean} hasPalaceData Fallback flag: log if false
 * @returns {HTMLElement} The complete palace cell div.ziwei-cell with data-branchIndex
 */
function createPalaceCell(row, col, palaceData = {}, primaryStarsData = {}, secondaryStarsData = {}, lifeCycleData = {}, mutationsData = null, minorStarsBuckets = [], taiSuiStarsData = {}, hasPalaceData = false, primaryBrightnessData = {}, secondaryBrightnessData = {}) {
    const cell = document.createElement('div');
    cell.className = 'ziwei-cell';
    cell.style.gridColumnStart = String(col);
    cell.style.gridRowStart = String(row);

    const GRID_BRANCH_MAP = window.ziweiConstants.GRID_BRANCH_MAP;
    const branchIndex = GRID_BRANCH_MAP[row - 1]?.[col - 1];
    
    // Prepare three separate mutation lookups for birth/major/annual cycles
    const mutationBirthLookup = mutationsData?.byStar || {};
    const mutationMajorLookup = {};  // TODO: Will be populated when 大限四化 calculation is implemented
    const mutationAnnualLookup = {};  // TODO: Will be populated when 流年四化 calculation is implemented

    if (branchIndex >= 0) {
        cell.dataset.branchIndex = String(branchIndex);
        const palace = palaceData ? palaceData[branchIndex] : undefined;

        if (palace) {
            const starsContainer = document.createElement('div');
            starsContainer.className = 'ziwei-stars-container';

            appendStarsToContainer(starsContainer, primaryStarsData, branchIndex, 'ziwei-primary-star', mutationBirthLookup, mutationMajorLookup, mutationAnnualLookup, primaryBrightnessData);
            appendStarsToContainer(starsContainer, secondaryStarsData, branchIndex, 'ziwei-secondary-star', mutationBirthLookup, mutationMajorLookup, mutationAnnualLookup, secondaryBrightnessData);

            if (starsContainer.children.length > 0) {
                cell.appendChild(starsContainer);
            }

            // Use pre-bucketed minor stars for O(1) access
            const minorStarNames = minorStarsBuckets[branchIndex] || [];
            if (minorStarNames.length > 0) {
                const minorStarsContainer = document.createElement('div');
                minorStarsContainer.className = 'ziwei-minor-stars-container';

                const minorStarsGroup = document.createElement('div');
                minorStarsGroup.className = 'ziwei-minor-stars-group';

                // Get current xunKong setting to determine visibility
                const adapter = window.ziweiAdapter;
                const xunKongSetting = adapter && adapter.settings && typeof adapter.settings.get === 'function'
                    ? adapter.settings.get('xunKong') || 'marked'
                    : 'marked';

                // Batch minor stars into DocumentFragment to minimize reflow for 43+ elements
                const frag = document.createDocumentFragment();
                minorStarNames.forEach((name) => {
                    const minorStarEl = document.createElement('div');
                    minorStarEl.className = 'ziwei-minor-star';
                    minorStarEl.textContent = name;
                    
                    // Apply xunKong visibility rules during initial rendering
                    // Hide secondary void stars (副旬、副截) when primaryOnly mode
                    if (xunKongSetting === 'primaryOnly' && (name === '副旬' || name === '副截')) {
                        minorStarEl.style.display = 'none';
                    }
                    
                    frag.appendChild(minorStarEl);
                });

                minorStarsGroup.appendChild(frag);
                minorStarsContainer.appendChild(minorStarsGroup);
                cell.appendChild(minorStarsContainer);
            }

            const cycleStarsWrapper = document.createElement('div');
            cycleStarsWrapper.className = 'ziwei-cycle-stars-wrapper';
            cycleStarsWrapper.style.maxWidth = 'calc(100% - 6px)';
            cycleStarsWrapper.style.overflow = 'hidden';

            const majorCycleStarEl = document.createElement('div');
            majorCycleStarEl.className = 'ziwei-major-cycle-star hidden';
            cycleStarsWrapper.appendChild(majorCycleStarEl);

            const annualCycleStarEl = document.createElement('div');
            annualCycleStarEl.className = 'ziwei-annual-cycle-star hidden';
            cycleStarsWrapper.appendChild(annualCycleStarEl);

            cell.appendChild(cycleStarsWrapper);
            cycleDisplayRegistry[branchIndex] = {
                major: majorCycleStarEl,
                annual: annualCycleStarEl,
                wrapper: cycleStarsWrapper
            };

            const palaceContainer = document.createElement('div');
            palaceContainer.className = 'ziwei-palace-container';

            const stemBranchEl = document.createElement('div');
            stemBranchEl.className = 'ziwei-palace-label ziwei-palace-branch';
            const stemBranchText = (palace.stem || '') + (palace.branchZhi || branchNumToChar(branchIndex));
            stemBranchEl.textContent = stemBranchText;

            const nameEl = document.createElement('div');
            nameEl.className = 'ziwei-palace-label ziwei-palace-name';
            
            // Apply user-selected palace name override if applicable
            // Check by palace name (宮位名稱), not by index
            let displayName = palace.name;
            
            // Check for palace name settings (palaceNameCareer, palaceNameFriends)
            const adapter = window.ziweiAdapter;
            if (adapter && adapter.settings && typeof adapter.settings.get === 'function') {
                // For 事業宮 (position 4 relative to Ming Palace)
                if (palace.name === '事業') {
                    const careerSetting = adapter.settings.get('palaceNameCareer') || 'career';
                    const careerMapping = { career: '事業', official: '官祿' };
                    const selectedCareerName = careerMapping[careerSetting] || '事業';
                    // Check if this is also Shen Palace, apply combined name if needed
                    if (palace.isShen) {
                        const shenCombine = { '事業': '身事', '官祿': '身官' };
                        displayName = shenCombine[selectedCareerName] || selectedCareerName;
                    } else {
                        displayName = selectedCareerName;
                    }
                }
                // For 交友宮 (position 5 relative to Ming Palace)
                // Note: Friends Palace cannot be Shen Palace per Ziwei system rules, so no Shen combination logic
                else if (palace.name === '交友') {
                    const friendsSetting = adapter.settings.get('palaceNameFriends') || 'friends';
                    const friendsMapping = { friends: '交友', servants: '奴僕', servants_alt: '僕役' };
                    displayName = friendsMapping[friendsSetting] || '交友';
                }
            }
            
            nameEl.textContent = displayName;

            // Swap order: palace name (left/first) then stem-branch (right/last)
            palaceContainer.appendChild(nameEl);
            palaceContainer.appendChild(stemBranchEl);
            cell.appendChild(palaceContainer);

            if (cycleDisplayRegistry[branchIndex]) {
                cycleDisplayRegistry[branchIndex].palaceContainer = palaceContainer;
            }

            const attributesForPalace = getAttributesForPalace(branchIndex, taiSuiStarsData);
            if (attributesForPalace.length > 0) {
                const attributesContainer = document.createElement('div');
                attributesContainer.className = 'ziwei-attributes-container';

                attributesForPalace.forEach((attr) => {
                    const attrEl = document.createElement('div');
                    attrEl.className = 'ziwei-attribute';
                    attrEl.textContent = attr;
                    attributesContainer.appendChild(attrEl);
                });

                cell.appendChild(attributesContainer);
            }

            const majorCycleInfo = lifeCycleData ? lifeCycleData[branchIndex] : null;
            const lifeStageInfo = lifeCycleData?.twelveLongLifePositions
                ? lifeCycleData.twelveLongLifePositions[branchIndex]
                : null;

            if (majorCycleInfo || lifeStageInfo) {
                const lifeCycleContainer = document.createElement('div');
                lifeCycleContainer.className = 'ziwei-life-cycle-container';

                if (majorCycleInfo) {
                    const majorCycleEl = document.createElement('div');
                    majorCycleEl.className = 'ziwei-major-cycle';
                    majorCycleEl.textContent = majorCycleInfo.ageRange;
                    lifeCycleContainer.appendChild(majorCycleEl);
                }

                if (lifeStageInfo) {
                    const lifeStageEl = document.createElement('div');
                    lifeStageEl.className = 'ziwei-life-stage';
                    lifeStageEl.textContent = lifeStageInfo;
                    lifeCycleContainer.appendChild(lifeStageEl);
                }

                cell.appendChild(lifeCycleContainer);
            }

            if (palace.isMing) {
                cell.classList.add('ziwei-palace-ming');
            }

            if (palace.isShen) {
                cell.classList.add('ziwei-palace-shen');
            }
        } else {
            if (!hasPalaceData) {
                console.warn('palaceData is empty');
            } else {
                console.warn(`Branch ${branchIndex} - No palace data found`);
            }

            const branchEl = document.createElement('div');
            branchEl.className = 'ziwei-palace-label ziwei-palace-branch';
            branchEl.textContent = branchNumToChar(branchIndex);
            cell.appendChild(branchEl);
        }
    }

    return cell;
}

// Expose public API
window.ziweiChart = window.ziweiChart || {};
window.ziweiChart.draw = draw;

// Helper functions consumed by cycles.js for interactive updates
window.ziweiChartHelpers = window.ziweiChartHelpers || {};
window.ziweiChartHelpers.showMajorCycleStars = showMajorCycleStars;
window.ziweiChartHelpers.clearMajorCycleStars = clearMajorCycleStars;
window.ziweiChartHelpers.applyMajorCycleMutations = applyMajorCycleMutations;
window.ziweiChartHelpers.clearMajorCycleMutations = clearMajorCycleMutations;
window.ziweiChartHelpers.clearMutationsByRole = clearMutationsByRole;
window.ziweiChartHelpers.showAnnualCycleStars = showAnnualCycleStars;
window.ziweiChartHelpers.applyAnnualCycleMutations = applyAnnualCycleMutations;
window.ziweiChartHelpers.clearAnnualCycleMutations = clearAnnualCycleMutations;
window.ziweiChartHelpers.clearMajorMingLabel = clearMajorMingLabel;
window.ziweiChartHelpers.setMajorCycleMingLabel = setMajorCycleMingLabel;
window.ziweiChartHelpers.clearAnnualMingLabel = clearAnnualMingLabel;
window.ziweiChartHelpers.setAnnualCycleMingLabel = setAnnualCycleMingLabel;
window.ziweiChartHelpers.setMajorCycleLabels = setMajorCycleLabels;
window.ziweiChartHelpers.clearMajorCycleLabels = clearMajorCycleLabels;
window.ziweiChartHelpers.setAnnualCycleLabels = setAnnualCycleLabels;
window.ziweiChartHelpers.clearAnnualCycleLabels = clearAnnualCycleLabels;

// -------------------------------------------------------------------------
// Global event handlers (listening for calculation events)
// -------------------------------------------------------------------------
document.addEventListener('ziwei-chart-error', function (e) {
    try {
        var detail = e && e.detail ? e.detail : {};
        console.error('[ziweiChart] Calculation produced errors:', detail.errors || detail.error || {});

        // If adapterOutput exists, display the partial chart produced
        if (detail.adapterOutput) {
            var chartWrapper = window.ziweiChart.draw({ adapterOutput: detail.adapterOutput, calcResult: detail.calcResult });
            if (window.ziweiConfig && typeof window.ziweiConfig.replaceChartInner === 'function') {
                window.ziweiConfig.replaceChartInner(chartWrapper, { adapterOutput: detail.adapterOutput, calcResult: detail.calcResult });
            }
        }
    } catch (err) {
        console.error('[ziweiChart] Error handler failed:', err);
    }
});
