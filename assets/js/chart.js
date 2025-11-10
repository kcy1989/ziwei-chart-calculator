'use strict';

/**
 * Chart rendering module for Ziwei Calculator
 */

// Registry objects used to coordinate cycle panel interactions
const cycleDisplayRegistry = {};
const starMutationRegistry = {};
let lastPalaceDataRef = {};

// Fixed branch mapping for 4x4 grid layout to avoid reallocation per cell
const GRID_BRANCH_MAP = [
    [5, 6, 7, 8],
    [4, -1, -1, 9],
    [3, -1, -1, 10],
    [2, 1, 0, 11]
];

/**
 * Reset registry state before rendering a new chart
 */
function resetCycleRegistries() {
    Object.keys(cycleDisplayRegistry).forEach((key) => {
        delete cycleDisplayRegistry[key];
    });

    Object.keys(starMutationRegistry).forEach((key) => {
        delete starMutationRegistry[key];
    });
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
            try {
                const dynamicNodes = wrapper.querySelectorAll('[data-role="major-cycle"], [data-role="annual-cycle"]');
                dynamicNodes.forEach((n) => n.remove());
            } catch (e) {
                console.warn('Failed clearing dynamic cycle stars:', e);
            }
        }
    });
}

/**
 * Remove previously applied major cycle mutation badges
 */
function clearMajorCycleMutations() {
    Object.values(starMutationRegistry).forEach((starMap) => {
        Object.values(starMap).forEach((groupList) => {
            groupList.forEach((groupEl) => {
                const wrapper = groupEl.querySelector('.ziwei-mutations-wrapper');
                if (!wrapper) {
                    // If wrapper is missing, ensure highlight state reflects remaining mutations (none)
                    if (!groupEl.querySelector('.ziwei-mutation')) {
                        groupEl.classList.remove('ziwei-star-with-mutation');
                        if (!groupEl.classList.contains('ziwei-star-no-mutation')) {
                            groupEl.classList.add('ziwei-star-no-mutation');
                        }
                    }
                    return;
                }

                const majorMutations = wrapper.querySelectorAll('[data-mutation-role="major-cycle"]');
                majorMutations.forEach((mutationEl) => {
                    mutationEl.remove();
                });

                if (!wrapper.querySelector('.ziwei-mutation')) {
                    wrapper.remove();
                }

                const hasAnyMutations = groupEl.querySelector('.ziwei-mutation') !== null;
                if (hasAnyMutations) {
                    groupEl.classList.add('ziwei-star-with-mutation');
                    groupEl.classList.remove('ziwei-star-no-mutation');
                } else {
                    groupEl.classList.remove('ziwei-star-with-mutation');
                    if (!groupEl.classList.contains('ziwei-star-no-mutation')) {
                        groupEl.classList.add('ziwei-star-no-mutation');
                    }
                }
            });
        });
    });
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
    if (window.ziweiMajorCycleStars && stem) {
        try {
            const stemIndex = window.ziweiMajorCycleStars.stemCharToIndex(stem);
            if (stemIndex >= 0) {
                majorCycleStars = window.ziweiMajorCycleStars.calculateAllMajorCycleStars(
                    stemIndex,
                    majorCycleBranchIndex,
                    timeIndex
                );
                console.log('Major cycle stars calculated:', majorCycleStars, 'stem:', stem, 'stemIndex:', stemIndex, 'branchIndex:', majorCycleBranchIndex, 'timeIndex:', timeIndex);
            }
        } catch (e) {
            console.warn('Failed to calculate major cycle stars:', e);
        }
    }

    // Display major cycle stars in appropriate palace cells
    // Display major cycle stars in appropriate palace cells
    Object.entries(cycleDisplayRegistry).forEach(([branchIndex, elements]) => {
        if (!elements) return;
    const { major, annual, wrapper } = elements;
        const branchNum = Number(branchIndex);

        // Collect all major cycle stars located in this palace (may be multiple)
        let starsInPalace = [];
        for (const [starLabel, palaceIdx] of Object.entries(majorCycleStars)) {
            if (palaceIdx === branchNum) {
                starsInPalace.push(starLabel);
            }
        }

        // Remove previously injected dynamic stars
        if (wrapper) {
            const toRemove = wrapper.querySelectorAll('[data-role="major-cycle"]');
            toRemove.forEach((el) => el.remove());
        }

        // Render each major cycle star as its own vertical column (like minor stars)
        if (wrapper && starsInPalace.length > 0) {
            starsInPalace.forEach((label) => {
                const el = document.createElement('div');
                el.className = 'ziwei-major-cycle-star';
                el.setAttribute('data-role', 'major-cycle');
                el.textContent = label;
                wrapper.appendChild(el);
            });
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
}

/**
 * Apply major cycle four-mutation badges based on heavenly stem
 * @param {string} heavenlyStem Heavenly stem character (甲-癸)
 */
function applyMajorCycleMutations(heavenlyStem) {
    clearMajorCycleMutations();

    if (!heavenlyStem || typeof MutationZhongzhou === 'undefined') {
        return;
    }

    const mutations = MutationZhongzhou.getAllMutations(heavenlyStem);
    if (!mutations) return;

    Object.entries(mutations).forEach(([mutationType, starName]) => {
        Object.values(starMutationRegistry).forEach((starMap) => {
            const groupList = starMap[starName];
            if (!groupList) return;

            groupList.forEach((groupEl) => {
                let wrapper = groupEl.querySelector('.ziwei-mutations-wrapper');
                if (!wrapper) {
                    wrapper = document.createElement('div');
                    wrapper.className = 'ziwei-mutations-wrapper';
                    groupEl.appendChild(wrapper);
                }

                const mutationEl = document.createElement('span');
                mutationEl.className = 'ziwei-mutation ziwei-mutation-major';
                mutationEl.textContent = mutationType;
                mutationEl.setAttribute('data-mutation-role', 'major-cycle');
                wrapper.appendChild(mutationEl);

                groupEl.classList.add('ziwei-star-with-mutation');
                groupEl.classList.remove('ziwei-star-no-mutation');
            });
        });
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
}

/**
 * Create a star + mutation group element
 * @param {string} starName Star name to render
 * @param {string} starClass CSS class for the star span
 * @param {string|null} mutationType Mutation symbol if available
 * @returns {HTMLElement} DOM element containing star + mutation decor
 */
function createStarGroupElement(starName, starClass, mutationType) {
    const groupEl = document.createElement('div');
    groupEl.className = 'ziwei-star-mutation-group';

    const starEl = document.createElement('span');
    starEl.className = starClass;
    starEl.textContent = starName;
    groupEl.appendChild(starEl);

    if (mutationType) {
        const mutationsWrapper = document.createElement('div');
        mutationsWrapper.className = 'ziwei-mutations-wrapper';

        const mutationEl = document.createElement('span');
        mutationEl.className = 'ziwei-mutation ziwei-mutation-birth';
        mutationEl.textContent = mutationType;
        mutationsWrapper.appendChild(mutationEl);

        groupEl.appendChild(mutationsWrapper);
        groupEl.classList.add('ziwei-star-with-mutation');
    } else {
        groupEl.classList.add('ziwei-star-no-mutation');
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
 * Append a set of stars to the shared container
 * @param {HTMLElement} container Shared container element
 * @param {Object} starsData Mapping starName -> palace index
 * @param {number} branchIndex Current palace branch index
 * @param {string} starClass CSS class for rendered star
 * @param {Object} mutationLookup Map starName -> mutationType
 */
function appendStarsToContainer(container, starsData, branchIndex, starClass, mutationLookup) {
    if (!starsData || !container) return;

    Object.entries(starsData).forEach(([starName, starPalaceIndex]) => {
        const palaceIdx = typeof starPalaceIndex === 'number'
            ? starPalaceIndex
            : starPalaceIndex?.palaceIndex;

        if (palaceIdx !== branchIndex) {
            return;
        }

        const mutationType = mutationLookup?.[starName] || null;
        const starGroupEl = createStarGroupElement(starName, starClass, mutationType);
        container.appendChild(starGroupEl);
        registerStarGroup(branchIndex, starName, starGroupEl);
    });
}

/**
 * Convert branch index (0-11) to Chinese character
 * 0=子, 1=丑, 2=寅, 3=卯, 4=辰, 5=巳, 6=午, 7=未, 8=申, 9=酉, 10=戌, 11=亥
 * @param {number} branchIndex The branch index (0-11)
 * @returns {string} The Chinese character for this branch
 */
function branchNumToChar(branchIndex) {
    const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    return branches[branchIndex] || '';
}

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
    
    // Convert 24-hour format to 12 military hours
    // 子時: 23-1, 丑時: 1-3, 寅時: 3-5, 卯時: 5-7, 辰時: 7-9, 巳時: 9-11,
    // 午時: 11-13, 未時: 13-15, 申時: 15-17, 酉時: 17-19, 戌時: 19-21, 亥時: 21-23
    
    if (hour === 0 || hour === 23) return 0;  // 子
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

/**
 * Draw a Ziwei chart from API data
 * @param {Object} chartData The chart data from API
 * @returns {HTMLElement} The rendered chart element
 */
function draw(chartData) {
    // Create 4x4 grid where center 2x2 is merged into one large square
    const grid = document.createElement('div');
    grid.className = 'ziwei-4x4-grid';
    grid.style.opacity = '0';

    clearMajorCycleStars();
    clearMajorCycleMutations();
    resetCycleRegistries();
    lastPalaceDataRef = {};
    
    // Get metadata from API response
    const meta = chartData?.data || {};
    
    // === Pre-calculate shared indices (used by multiple calculations) ===
    let lunarYear, yearBranchIndex, yearStemIndex, monthIndex, timeIndex;
    
    if (meta.lunar && window.ziweiBasic) {
        lunarYear = meta.lunar.lunarYear;
        yearBranchIndex = window.ziweiBasic.getEarthlyBranchIndex(lunarYear);
        yearStemIndex = window.ziweiBasic.getHeavenlyStemIndex(lunarYear);
        monthIndex = window.ziweiBasic.getMonthIndex(
            meta.lunar.lunarMonth,
            meta.lunar.lunarDay,
            meta.lunar.isLeapMonth
        );
    } else {
        lunarYear = 0;
        yearBranchIndex = 0;
        yearStemIndex = 0;
        monthIndex = 0;
    }
    timeIndex = getMilitaryHourIndex(meta.birthtime);
    
    // Calculate palace positions (Ming Palace, Shen Palace, others)
    let palaceData = {};
    let palaceList = [];
    let hasPalaceData = false;
    let mingPalaceData = null;
    let shenPalaceData = null;
    let migrationPalaceData = null;
    let mingPalaceIndex = 0;
    let mingNayinLoci = null;
    let mingNayinName = null;

    if (window.ziweiPalaces && meta.lunar && meta.gender) {
        palaceData = window.ziweiPalaces.calculatePalacePositions(meta) || {};
        lastPalaceDataRef = palaceData;

        palaceList = Object.values(palaceData);
        hasPalaceData = palaceList.length > 0;

        if (hasPalaceData) {
            mingPalaceData = palaceList.find((p) => p.isMing) || null;
            shenPalaceData = palaceList.find((p) => p.isShen) || null;
            migrationPalaceData = palaceList.find((p) => p.name === '遷移') || null;
        }
    }

    // Enforce: palace data is required when the palaces module is present
    if (window.ziweiPalaces && (!hasPalaceData || palaceList.length === 0)) {
        failAndAbort('宮位計算失敗：無法取得任何宮位，請檢查出生資料是否完整');
    }

    if (mingPalaceData) {
        mingPalaceIndex = mingPalaceData.index;
        if (window.ziweiNayin) {
            try {
                mingNayinLoci = window.ziweiNayin.getNayin(mingPalaceData.stemIndex, mingPalaceIndex);
                mingNayinName = window.ziweiNayin.getNayinName(mingNayinLoci);
            } catch (e) {
                console.error('Ming Palace Nayin calculation failed:', e);
            }
        }
    }

    // Calculate primary stars placement
    let primaryStarsData = {};
    if (window.ziweiPrimary && meta.lunar && mingNayinLoci !== null) {
        try {
            const chartDataForStars = {
                lunarDay: meta.lunar.lunarDay,
                nayinLoci: mingNayinLoci
            };

            primaryStarsData = window.ziweiPrimary.placePrimaryStars(chartDataForStars);
        } catch (e) {
            console.error('Primary stars calculation failed:', e);
        }
    }

    // Fail hard if primary stars module is expected but returned no results
    if (window.ziweiPrimary) {
        if (!primaryStarsData || Object.keys(primaryStarsData).length === 0) {
            failAndAbort('主星計算失敗：無法安置主星，請檢查輸入或聯絡管理員');
        }
    }
    
    // Calculate life cycles (major cycles and twelve life stages)
    let lifeCycleData = {};
    if (
        window.ziweiLifeCycle &&
        meta.lunar &&
        mingNayinLoci !== null &&
        mingNayinLoci !== undefined
    ) {
        try {
            let majorCycles = [];
            try {
                majorCycles = window.ziweiLifeCycle.calculateMajorCycles(
                    mingNayinLoci,
                    meta.gender,
                    meta.lunar.lunarYear,
                    mingPalaceIndex
                );
            } catch (e) {
                console.error('Major cycles calculation failed:', e);
            }

            let twelveLongLifePositions = {};
            try {
                twelveLongLifePositions = window.ziweiLifeCycle.calculateTwelveLongLifePositions(
                    mingNayinLoci,
                    meta.gender,
                    meta.lunar.lunarYear
                );
            } catch (e) {
                console.error('Twelve life stages calculation failed:', e);
            }

            lifeCycleData = {
                majorCycles,
                twelveLongLifePositions,
                nayinLoci: mingNayinLoci,
                mingPalaceIndex,
                palaceData,
                timeIndex
            };

            majorCycles.forEach((cycle) => {
                lifeCycleData[cycle.palaceIndex] = cycle;
            });
        } catch (e) {
            console.error('Life cycle calculation failed:', e);
        }
    }

    // Enforce life cycle presence when module exists
    if (window.ziweiLifeCycle) {
        const hasMajor = Array.isArray(lifeCycleData.majorCycles) && lifeCycleData.majorCycles.length > 0;
        const hasTwelve = lifeCycleData.twelveLongLifePositions && Object.keys(lifeCycleData.twelveLongLifePositions).length > 0;
        if (!hasMajor && !hasTwelve) {
            failAndAbort('大運/流年計算失敗：無法產生大限或十二長生分佈');
        }
    }
    
    // Calculate secondary stars (13 auxiliary stars)
    let secondaryStarsData = {};
    if (window.ziweiSecondary && meta.lunar) {
        try {
            // Determine body palace index; if not available, fail (no silent default)
            let bodyPalaceIndex = null;
            if (shenPalaceData) {
                bodyPalaceIndex = shenPalaceData.index;
            } else if (window.ziweiBasic) {
                try {
                    const bodyPalaceInfo = window.ziweiBasic.getBodyPalace(lunarYear);
                    if (bodyPalaceInfo && typeof bodyPalaceInfo.palaceIndex === 'number') {
                        bodyPalaceIndex = bodyPalaceInfo.palaceIndex;
                    }
                } catch (e) {
                    console.error('Body palace determination failed:', e);
                }
            }

            if (bodyPalaceIndex === null || typeof bodyPalaceIndex !== 'number') {
                failAndAbort('身主宮位判定失敗：無法確定身主宮，請檢查輸入資料');
            }

            const secondaryStarsInput = {
                monthIndex,
                timeIndex,
                stemIndex: yearStemIndex,
                branchIndex: yearBranchIndex
            };

            secondaryStarsData = window.ziweiSecondary.calculateAllSecondaryStars(secondaryStarsInput);
        } catch (e) {
            console.error('Secondary stars calculation failed:', e);
        }
    }

    // Fail hard if secondary stars are required but missing
    if (window.ziweiSecondary) {
        if (!secondaryStarsData || Object.keys(secondaryStarsData).length === 0) {
            failAndAbort('輔星計算失敗：無法安置輔佐星曜');
        }
    }
    
    // Calculate birth year four mutations (生年四化 / birth-year-mutation)
    let mutationsData = null;
    if (window.ziweiMutations && lunarYear) {
        try {
            // Use pre-calculated yearStemIndex from draw() start
            mutationsData = window.ziweiMutations.calculateBirthYearMutations(yearStemIndex);
        } catch (e) {
            console.error('Mutations calculation failed:', e);
        }
    }

    // Enforce mutations presence if module is present
    if (window.ziweiMutations) {
        if (!mutationsData || Object.keys(mutationsData).length === 0) {
            failAndAbort('四化計算失敗：無法計算生年四化標記');
        }
    }

    // Calculate minor stars (雜曜)
    let minorStarsData = {};
    if (window.ziweiMinorStars && meta.lunar) {
        try {
            // Get required indices for minor stars calculation
            const lunarDay = meta.lunar.lunarDay;
            const dayBranchIndex = (lunarDay - 1) % 12;
            
            // Get Shen Palace and Migration Palace indices from cached palace data
            const shenPalaceIndex = shenPalaceData ? shenPalaceData.index : 0;
            const migrationPalaceIndex = migrationPalaceData
                ? migrationPalaceData.index
                : (mingPalaceIndex + 6) % 12;

            // Get secondary star positions (文曲, 左輔, 右弼, 文昌) from secondary stars data
            const literaryCraftIndex = secondaryStarsData['文曲'] ?? 0;
            const leftAssistantIndex = secondaryStarsData['左輔'] ?? 0;
            const rightAssistIndex = secondaryStarsData['右弼'] ?? 0;
            const literaryTalentIndex = secondaryStarsData['文昌'] ?? 0;
            
            minorStarsData = window.ziweiMinorStars.calculateMinorStars(
                monthIndex,
                timeIndex,
                yearBranchIndex,
                dayBranchIndex,
                yearStemIndex,
                mingPalaceIndex,
                shenPalaceIndex,
                meta.gender,
                lunarYear,
                migrationPalaceIndex,
                literaryCraftIndex,
                leftAssistantIndex,
                rightAssistIndex,
                literaryTalentIndex,
                lunarDay
            );
        } catch (e) {
            console.error('Minor stars calculation failed:', e);
        }
    }

    // Enforce minor stars presence when module exists
    if (window.ziweiMinorStars) {
        if (!minorStarsData || Object.keys(minorStarsData).length === 0) {
            failAndAbort('雜曜計算失敗：無法產生雜曜資料');
        }
    }
    
    // Calculate attributes (神煞 - spiritual mood descriptors & Tai Sui stars)
    let attributesData = {};
    let taiSuiStarsData = {};
    if (window.ziweiAttributes && meta.lunar && window.ziweiBasic) {
        try {
            // Use pre-calculated yearBranchIndex and monthIndex from draw() start
            attributesData = window.ziweiAttributes.calculateAllAttributes(
                yearBranchIndex,
                monthIndex
            );
            
            // Calculate Tai Sui stars if secondary stars data available
            if (secondaryStarsData) {
                const luCunPalace = secondaryStarsData['祿存'];
                if (luCunPalace !== undefined) {
                    // Determine clockwise direction based on gender and year branch
                    const isClockwise = window.ziweiBasic.isClockwise(meta.gender, yearBranchIndex);
                    
                    taiSuiStarsData = window.ziweiAttributes.calculateAllAttributes(
                        yearBranchIndex,
                        luCunPalace,
                        isClockwise
                    );
                }
            }
        } catch (e) {
            console.error('Attributes/Tai Sui calculation failed:', e);
        }
    }

    // Enforce attributes/Tai Sui presence when attributes module exists
    if (window.ziweiAttributes) {
        const hasAttributes = attributesData && Object.keys(attributesData).length > 0;
        const hasTaiSui = taiSuiStarsData && Object.keys(taiSuiStarsData).length > 0;
        if (!hasAttributes && !hasTaiSui) {
            failAndAbort('神煞計算失敗：無法取得神煞或太歲資料');
        }
    }
    
    // Add all 12 palace cells (skip center positions)
    for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 4; col++) {
            if ((row === 2 || row === 3) && (col === 2 || col === 3)) continue; // Skip center
            grid.appendChild(createPalaceCell(
                row,
                col,
                palaceData,
                primaryStarsData,
                secondaryStarsData,
                lifeCycleData,
                mutationsData,
                minorStarsData,
                taiSuiStarsData,
                hasPalaceData
            ));
        }
    }

    // Append center cell (spanning 2x2) - pass palaceData directly
    grid.appendChild(createCenterCell(meta, palaceData, lunarYear, mingPalaceData, mingNayinName));

    // Fade-in effect
    requestAnimationFrame(() => {
        grid.style.transition = 'opacity 300ms ease';
        requestAnimationFrame(() => {
            grid.style.opacity = '1';
        });
    });

    // Wrap grid in a container to isolate it from external elements
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'ziwei-chart-wrapper';
    chartWrapper.style.marginBottom = '30px';
    chartWrapper.appendChild(grid);

    // Initialize palace interaction (clicking to highlight 三方四正 and draw lines)
    let palaceInteraction = null;
    if (window.initializePalaceInteraction) {
        palaceInteraction = window.initializePalaceInteraction(grid) || null;
    }

    // Append major cycle (大限) and annual cycle (流年) panel
    const cyclePanel = window.ziweiCycles && typeof window.ziweiCycles.initializeCyclePanel === 'function'
        ? window.ziweiCycles.initializeCyclePanel(lifeCycleData, grid, palaceInteraction)
        : null;
    if (cyclePanel) {
        chartWrapper.appendChild(cyclePanel);
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
    if (meta.lunar && window.ziweiGender) {
        const classification = window.ziweiGender.getGenderClassification(
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
    } else if (meta.lunar && window.ziweiNayin && palaceData) {
        try {
            const fallbackMing = mingPalaceData || Object.values(palaceData).find((p) => p.isMing);

            if (fallbackMing) {
                const stemIndex = fallbackMing.stemIndex;
                const branchIndex = fallbackMing.index;
                const loci = window.ziweiNayin.getNayin(stemIndex, branchIndex);
                const lociName = window.ziweiNayin.getNayinName(loci);

                nayinEl = document.createElement('div');
                nayinEl.className = 'ziwei-nayin';
                nayinEl.textContent = lociName;
            } else {
                console.warn('Ming Palace not found in palaceData');
            }
        } catch (e) {
            console.warn('Nayin calculation failed:', e);
        }
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
    
    // Format Gregorian date and time display
    const whenEl = document.createElement('div');
    whenEl.className = 'ziwei-datetime';
    const gregDate = meta.birthdate || '';
    const gregTime = meta.birthtime || '';
    const [year, month, day] = gregDate.split('-').map(v => parseInt(v, 10));
    const [hour, minute] = gregTime.split(':').map(v => parseInt(v, 10));
    const gregText = (year && month && day) 
        ? `西曆：${year}年${month}月${day}日${hour || 0}時${minute || 0}分`
        : `西曆：${gregDate} ${gregTime}`;
    whenEl.textContent = gregText;

    // Get lunar date from API response (already converted by backend)
    let lunarStr = '';
    const lunarData = meta.lunar;
    
    if (lunarData) {
        try {
            lunarStr = formatLunar(lunarData);
        } catch (e) {
            console.warn('Lunar formatting failed:', e);
            lunarStr = '';
        }
    } else if (window.ziweiCalData?.isDebug) {
        console.warn('No lunar data in API response', { meta });
    }

    // Lunar display element (always show — if conversion failed show placeholder)
    const lunarEl = document.createElement('div');
    lunarEl.className = 'ziwei-datetime ziwei-lunar';
    lunarEl.textContent = lunarStr ? (`農曆：${lunarStr}`) : '農曆：查無資料';

    // Master and Body Palace information
    let masterBodyEl = null;
    if (meta.lunar && window.ziweiBasic) {
        try {
            // Use pre-calculated lunarYear from draw() start
            const masterPalace = window.ziweiBasic.getMasterPalace(lunarYear);
            const bodyPalace = window.ziweiBasic.getBodyPalace(lunarYear);
            
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
        } catch (e) {
            console.error('Master/Body palace calculation failed:', e);
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
function formatLunar(lunar) {
    if (!lunar) return '';
    
    // Check if using new format with string year and date
    if (typeof lunar.year === 'string' && typeof lunar.date === 'string') {
        // Format: { year: "癸卯年，兔", date: "二月初十", ... }
        const yearPart = lunar.year.split('，')[0]; // Extract "癸卯年" from "癸卯年，兔"
        const datePart = lunar.date;
        const hourPart = (lunar.hour !== undefined && lunar.hour !== null) ? hourToChinese(lunar.hour) : '';
        
        return `${yearPart}${datePart}${hourPart}`;
    }
    
    // Fallback for numeric format
    if (typeof lunar.year === 'number' && lunar.month && lunar.day) {
        const { year, month, day, isLeapMonth, hour } = lunar;
        const gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const stemIndex = (year - 4) % 10;
        const branchIndex = (year - 4) % 12;
        const yearName = `${gan[(stemIndex+10)%10]}${zhi[(branchIndex+12)%12]}年`;
        const monthName = (isLeapMonth ? '閏' : '') + chineseNumber(month) + '月';
        const dayName = formatLunarDay(day);
        const hourName = (hour !== undefined && hour !== null) ? hourToChinese(hour) : '';
        
        return `${yearName}${monthName}${dayName}${hourName}`;
    }
    
    return '';
}

function chineseNumber(n) {
    const nums = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二'];
    return nums[n] || String(n);
}

function formatLunarDay(d) {
    // Rules: 20 -> 二十, 21-29 -> 廿一..廿九, 30 -> 三十. No '日' suffix.
    if (d === 20) return '二十';
    if (d >= 21 && d <= 29) return '廿' + chineseNumber(d - 20);
    if (d === 30) return '三十';
    // For 1-19 use standard Chinese numerals without '日'
    if (d <= 10) return chineseNumber(d);
    return chineseNumber(d);
}

function hourToChinese(hour) {
    // Map hour (0-23) to traditional 12 double-hour names (子-亥)
    const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const index = hour >= 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
    return branches[index] + '時';
}

/**
 * Create a palace cell for the chart
 * @param {number} row Row number (1-4)
 * @param {number} col Column number (1-4)
 * @param {Object} palaceData Palace position mapping from calculatePalacePositions
 * @param {Object} primaryStarsData Primary stars positions from placePrimaryStars
 * @param {Object} secondaryStarsData Secondary stars positions from calculateAllSecondaryStars
 * @param {Object} lifeCycleData Life cycle information for all 12 palaces
 * @param {Object} mutationsData Four mutations data from calculateBirthYearMutations
 * @param {Object} minorStarsData Minor stars positions from calculateMinorStars
 * @param {Object} taiSuiStarsData Tai Sui attributes data
 * @param {boolean} hasPalaceData Whether palace data is available
 * @returns {HTMLElement} The palace cell element
 */
function createPalaceCell(row, col, palaceData = {}, primaryStarsData = {}, secondaryStarsData = {}, lifeCycleData = {}, mutationsData = null, minorStarsData = {}, taiSuiStarsData = {}, hasPalaceData = false) {
    const cell = document.createElement('div');
    cell.className = 'ziwei-cell';
    cell.style.gridColumnStart = String(col);
    cell.style.gridRowStart = String(row);

    const branchIndex = GRID_BRANCH_MAP[row - 1]?.[col - 1];
    const mutationLookup = mutationsData?.byStar || {};

    if (branchIndex >= 0) {
        cell.dataset.branchIndex = String(branchIndex);
        const palace = palaceData ? palaceData[branchIndex] : undefined;

        if (palace) {
            const starsContainer = document.createElement('div');
            starsContainer.className = 'ziwei-stars-container';

            appendStarsToContainer(starsContainer, primaryStarsData, branchIndex, 'ziwei-primary-star', mutationLookup);
            appendStarsToContainer(starsContainer, secondaryStarsData, branchIndex, 'ziwei-secondary-star', mutationLookup);

            if (starsContainer.children.length > 0) {
                cell.appendChild(starsContainer);
            }

            if (minorStarsData && typeof minorStarsData === 'object') {
                const minorStarNames = [];

                for (const [starName, starPalaceIndex] of Object.entries(minorStarsData)) {
                    const isInThisPalace = Array.isArray(starPalaceIndex)
                        ? starPalaceIndex.includes(branchIndex)
                        : starPalaceIndex === branchIndex;

                    if (isInThisPalace) {
                        minorStarNames.push(starName);
                    }
                }

                if (minorStarNames.length > 0) {
                    const minorStarsContainer = document.createElement('div');
                    minorStarsContainer.className = 'ziwei-minor-stars-container';

                    const minorStarsGroup = document.createElement('div');
                    minorStarsGroup.className = 'ziwei-minor-stars-group';

                    minorStarNames.forEach((name) => {
                        const minorStarEl = document.createElement('div');
                        minorStarEl.className = 'ziwei-minor-star';
                        minorStarEl.textContent = name;
                        minorStarsGroup.appendChild(minorStarEl);
                    });

                    minorStarsContainer.appendChild(minorStarsGroup);
                    cell.appendChild(minorStarsContainer);
                }
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
            stemBranchEl.className = 'ziwei-palace-branch';
            const stemBranchText = (palace.stem || '') + (palace.branchZhi || branchNumToChar(branchIndex));
            stemBranchEl.textContent = stemBranchText;

            const nameEl = document.createElement('div');
            nameEl.className = 'ziwei-palace-name';
            nameEl.textContent = palace.name;

            palaceContainer.appendChild(stemBranchEl);
            palaceContainer.appendChild(nameEl);
            cell.appendChild(palaceContainer);

            if (window.ziweiAttributes && taiSuiStarsData) {
                const attributes = window.ziweiAttributes.getAttributesForPalace(branchIndex, taiSuiStarsData);

                if (attributes && attributes.length > 0) {
                    const attributesContainer = document.createElement('div');
                    attributesContainer.className = 'ziwei-attributes-container';

                    attributes.forEach((attr) => {
                        const attrEl = document.createElement('div');
                        attrEl.className = 'ziwei-attribute';
                        attrEl.textContent = attr;
                        attributesContainer.appendChild(attrEl);
                    });

                    cell.appendChild(attributesContainer);
                }
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
            branchEl.className = 'ziwei-palace-branch';
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
