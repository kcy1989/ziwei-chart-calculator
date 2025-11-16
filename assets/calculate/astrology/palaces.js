/**
 * Palaces calculation module for Ziwei Doushu
 * Determines the position of Ming Palace (命宮), Shen Palace (身宮), and assigns all 12 palace names
 */

/**
 * Helper to get adapter module
 */
function getAdapterModule(name) {
    var adapter = window.ziweiAdapter;
    return adapter && adapter.getModule ? adapter.getModule(name) : null;
}

/**
 * Calculate all 12 palace positions based on birth data
 * 
 * @param {Object} meta Birth metadata
 * @param {Object} meta.lunar Lunar date object { lunarMonth, lunarDay, hour, isLeapMonth, lunarYear, ... }
 * @param {string} meta.gender Birth gender ('male' or 'female')
 * @returns {Object} Palace positions mapping { 0-11 -> palace info }
 */
function calculatePalacePositions(meta) {
    if (!meta || !meta.lunar) {
        console.warn('Invalid metadata for palace calculation:', meta);
        return {};
    }

    const { lunar, gender } = meta;

    // Validate lunar date
    const month = lunar.lunarMonth || lunar.month;
    const day = lunar.lunarDay || lunar.day;
    const hour = lunar.hour;
    const year = lunar.lunarYear || lunar.year;
    
    if (!month || !day || hour === undefined) {
        console.warn('Invalid lunar date for palace calculation. Data:', { month, day, hour, year }, 'Full lunar:', lunar);
        return {};
    }

    // Get basic module via adapter
    var basicModule = getAdapterModule('basic');
    if (!basicModule || typeof basicModule.getBasicIndices !== 'function') {
        console.error('Basic astrology module not available via adapter');
        return {};
    }

    const { monthIndex, timeIndex } = basicModule.getBasicIndices(lunar);

    const mingPalacePosition = calculateMingPalacePosition(monthIndex, timeIndex);
    const shenPalacePosition = calculateShenPalacePosition(monthIndex, timeIndex);
    const palaces = createPalaceMapping(mingPalacePosition, shenPalacePosition, 'standard', year);

    return palaces;
}

/**
 * Calculate Ming Palace (命宮) position
 * Returns index 0-11 (0=子, 1=丑, ..., 11=亥)
 * 
 * @param {number} monthIndex Month index (0-11, after leap month adjustment)
 * @param {number} timeIndex Time index (0-11)
 * @returns {number} Palace index (0-11)
 */
function calculateMingPalacePosition(monthIndex, timeIndex) {
    return ((14 + monthIndex - timeIndex) % 12);
}

/**
 * Calculate Shen Palace (身宮) position
 * Returns index 0-11 (0=子, 1=丑, ..., 11=亥)
 * 
 * @param {number} monthIndex Month index (0-11, after leap month adjustment)
 * @param {number} timeIndex Time index (0-11)
 * @returns {number} Palace index (0-11)
 */
function calculateShenPalacePosition(monthIndex, timeIndex) {
    return ((14 + monthIndex + timeIndex) % 12);
}

/**
 * Create a mapping of all 12 palaces with their names and types
 * 
 * @param {number} mingPalacePosition Ming Palace index (0-11)
 * @param {number} shenPalacePosition Shen Palace index (0-11)
 * @param {string} school Palace naming school (default: 'standard')
 * @param {number} lunarYear Lunar year for stem calculation
 * @returns {Object} Palace mapping { index (0-11) -> { name, isMing, isShen, stem, branchZhi } }
 */
function createPalaceMapping(mingPalacePosition, shenPalacePosition, school = 'standard', lunarYear) {
    // Get palace names module via adapter
    var palaceNamesModule = getAdapterModule('palaceNames');
    if (!palaceNamesModule || typeof palaceNamesModule.getPalaceNames !== 'function') {
        console.error('Palace names module not available via adapter');
        throw new Error('Palace names module not loaded');
    }
    
    const palaceSequence = palaceNamesModule.getPalaceNames(school);
    const combineWithShen = palaceNamesModule.getShenCombineNames(school);
    
    // Get basic module for stem calculation
    var basicModule = getAdapterModule('basic');
    
    const palaces = {};
    
    // Assign each palace name starting from Ming Palace and going clockwise
    for (let i = 0; i < 12; i++) {
        // Calculate the index for this palace (going forward for clockwise order)
        // Starting from Ming Palace index, increment by 1 each position
        const palaceIndex = (mingPalacePosition + i) % 12;
        
        let palaceName = palaceSequence[i];
        const isMing = (palaceIndex === mingPalacePosition);
        const isShen = (palaceIndex === shenPalacePosition);
        
        // If Shen Palace coincides with this palace, use combined name
        if (isShen && combineWithShen[palaceName]) {
            palaceName = combineWithShen[palaceName];
        }
        
        // Calculate heavenly stem for this palace
        let stemInfo = { stem: '', stemIndex: -1 };
        if (lunarYear && basicModule && typeof basicModule.getPalaceStemByIndex === 'function') {
            try {
                stemInfo = basicModule.getPalaceStemByIndex(palaceIndex, lunarYear);
            } catch (err) {
                console.error('Error calculating stem for palace:', err);
            }
        } else if (!basicModule) {
            console.warn('Basic module not available for stem calculation');
        } else if (typeof basicModule.getPalaceStemByIndex !== 'function') {
            console.warn('getPalaceStemByIndex is not a function in basic module');
        }
        
    // Get earthly branch character (地支) from constants
    const branchZhi = window.ziweiConstants.BRANCH_NAMES[palaceIndex];
        
        const palaceInfo = {
            index: palaceIndex,
            name: palaceName,
            isMing: isMing,
            isShen: isShen,
            stem: stemInfo.stem,           // Heavenly stem (天干) character
            stemIndex: stemInfo.stemIndex, // Heavenly stem index (0-9)
            branchZhi: branchZhi,          // Earthly branch (地支) character
            branchIndex: palaceIndex       // Earthly branch index (0-11), same as palace index
        };
        
        palaces[palaceIndex] = palaceInfo;
    }
    
    return palaces;
}

/**
 * Format palace data for display
 * 
 * @param {Object} palaces Palace mapping from calculatePalacePositions (0-11 indices)
 * @returns {Array} Array of palace objects sorted by index
 */
function formatPalacesForDisplay(palaces) {
    const result = [];
    for (let i = 0; i < 12; i++) {
        if (palaces[i]) {
            result.push(palaces[i]);
        }
    }
    return result;
}

/**
 * Helper to register module with adapter
 */
function registerAdapterModule(name, api) {
    // Try to register with window adapter
    if (window.ziweiAdapter && typeof window.ziweiAdapter.registerModule === 'function') {
        window.ziweiAdapter.registerModule(name, api);
        return;
    }
    
    // Store in pending queue for later registration
    window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
    window.__ziweiAdapterModules[name] = api;
}

// Expose public API through adapter (T076: No global backward compat references)
registerAdapterModule('palaces', {
    calculatePalacePositions,
    formatPalacesForDisplay,
    calculateMingPalacePosition,
    calculateShenPalacePosition,
    createPalaceMapping
});
