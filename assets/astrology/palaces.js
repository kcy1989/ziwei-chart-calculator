/**
 * Palaces calculation module for Ziwei Doushu
 * Determines the position of Ming Palace (命宮), Shen Palace (身宮), and assigns all 12 palace names
 */

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

    // Get basic indices (handles leap month adjustment)
    if (!window.ziweiBasic) {
        console.error('Basic astrology module (ziweiBasic) not loaded');
        return {};
    }

    const { monthIndex, timeIndex } = window.ziweiBasic.getBasicIndices(lunar);

    const mingPalacePosition = calculateMingPalacePosition(monthIndex, timeIndex);
    const shenPalacePosition = calculateShenPalacePosition(monthIndex, timeIndex);
    const palaces = createPalaceMapping(mingPalacePosition, shenPalacePosition, 'standard', year);

    console.log('Palace calculation result:', { mingPalacePosition, shenPalacePosition, palaces });

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
    // Palace names data module is required
    if (!window.ziweiPalaceNames) {
        console.error('Palace names data module (ziweiPalaceNames) not loaded. Please check that palaces-name.js is properly enqueued.');
        throw new Error('Palace names data module not loaded');
    }
    
    const palaceSequence = window.ziweiPalaceNames.getPalaceNames(school);
    const combineWithShen = window.ziweiPalaceNames.getShenCombineNames(school);
    
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
        if (lunarYear && window.ziweiBasic && typeof window.ziweiBasic.getPalaceStemByIndex === 'function') {
            try {
                stemInfo = window.ziweiBasic.getPalaceStemByIndex(palaceIndex, lunarYear);
            } catch (err) {
                console.error('Error calculating stem for palace:', err);
            }
        } else if (!window.ziweiBasic) {
            console.warn('ziweiBasic module not loaded');
        } else if (typeof window.ziweiBasic.getPalaceStemByIndex !== 'function') {
            console.warn('getPalaceStemByIndex is not a function in ziweiBasic');
        }
        
        // Get earthly branch character (地支)
        const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const branchZhi = branches[palaceIndex];
        
        const palaceInfo = {
            index: palaceIndex,
            name: palaceName,
            isMing: isMing,
            isShen: isShen,
            stem: stemInfo.stem,           // Heavenly stem (天干) character
            stemIndex: stemInfo.stemIndex, // Heavenly stem index (0-9)
            branchZhi: branchZhi           // Earthly branch (地支) character
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

// Expose public API
window.ziweiPalaces = {
    calculatePalacePositions,
    formatPalacesForDisplay,
    calculateMingPalacePosition,
    calculateShenPalacePosition,
    createPalaceMapping
};
