/**
 * Four Mutations (四化) Calculator
 * 
 * Calculates birth year mutations (生年四化) based on the heavenly stem (天干) of birth year.
 * Uses hybrid system: Zhongzhou School defaults + user-selectable alternatives for controversial stems.
 * 
 * Dependencies:
 * - mutation.js: getMutation() and getAllMutations() functions
 * - basic.js: getHeavenlyStemIndex() function
 */

'use strict';

/**
 * Array of heavenly stems (天干)
 */
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/**
 * Array of mutation types (四化類型)
 */
const MUTATION_TYPES = ['祿', '權', '科', '忌'];

/**
 * Calculate birth year four mutations (生年四化)
 * 
 * @param {number} stemIndex - Heavenly stem index (0-9) from getHeavenlyStemIndex()
 * @returns {Object} Object mapping mutation types to star names, and star names to mutation types
 *                   Format: { 
 *                     byType: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
 *                     byStar: { '廉貞': '祿', '破軍': '權', '武曲': '科', '太陽': '忌' }
 *                   }
 */
function calculateBirthYearMutations(stemIndex) {
    // Calculation of birth year mutations started (logging removed to reduce noise)
    
    // Validate stem index
    if (stemIndex < 0 || stemIndex > 9) {
        console.warn('Invalid stem index:', stemIndex);
        return { byType: {}, byStar: {} };
    }

    // Get heavenly stem character
    const stem = HEAVENLY_STEMS[stemIndex];
    
    // Check if mutation functions are available
    if (typeof getAllMutations !== 'function') {
        console.error('getAllMutations function not loaded!');
        return { byType: {}, byStar: {} };
    }
    
    // Get current user selections from adapter settings, use defaults if not available
    let userSelections = null;
    try {
        // Get from adapter settings (persistent)
        if (window.ziweiAdapter && window.ziweiAdapter.settings && typeof window.ziweiAdapter.settings.get === 'function') {
            const controversialStems = ['甲', '戊', '庚', '辛', '壬', '癸'];
            userSelections = {};
            for (const stem of controversialStems) {
                const settingName = `stemInterpretation_${stem}`;
                const value = window.ziweiAdapter.settings.get(settingName);
                if (value) {
                    userSelections[stem] = value;
                }
            }
        }
    } catch (e) {
        console.warn('[mutations.js] Failed to get user selections from adapter:', e);
    }
    
    // Ensure all controversial stems have settings, use defaults for missing ones
    const defaultSelections = {
        '甲': 'interpretation_1',
        '戊': 'interpretation_1',
        '庚': 'interpretation_1',
        '辛': 'interpretation_1',
        '壬': 'interpretation_1',
        '癸': 'interpretation_1'
    };
    
    if (!userSelections) {
        userSelections = { ...defaultSelections };
    } else {
        // Fill in missing stems with defaults
        const controversialStems = ['甲', '戊', '庚', '辛', '壬', '癸'];
        for (const stem of controversialStems) {
            if (!userSelections[stem]) {
                userSelections[stem] = defaultSelections[stem];
            }
        }
    }
    
    // Get mutations for this stem using the hybrid system with user selections
    const mutations = getAllMutations(stem, userSelections);
    
    if (!mutations) {
        console.warn('No mutations found for stem:', stem);
        return { byType: {}, byStar: {} };
    }
    
    // Mutations by type computed
    
    // Create reverse mapping: star name -> mutation type
    const byStar = {};
    for (const [type, star] of Object.entries(mutations)) {
        byStar[star] = type;
    }
    
    // Mutations by star computed
    
    const result = {
        byType: mutations,  // { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' }
        byStar: byStar      // { '廉貞': '祿', '破軍': '權', '武曲': '科', '太陽': '忌' }
    };
    
    // Calculation complete
    
    return result;
}

/**
 * Get mutation type for a specific star (if any)
 * 
 * @param {string} starName - Name of the star to check
 * @param {Object} mutationsData - Result from calculateBirthYearMutations()
 * @returns {string|null} Mutation type ('祿', '權', '科', '忌') or null if no mutation
 */
function getMutationForStar(starName, mutationsData) {
    if (!mutationsData || !mutationsData.byStar) {
        return null;
    }
    
    return mutationsData.byStar[starName] || null;
}

/**
 * Get star name for a specific mutation type
 * 
 * @param {string} mutationType - Type of mutation ('祿', '權', '科', '忌')
 * @param {Object} mutationsData - Result from calculateBirthYearMutations()
 * @returns {string|null} Star name or null if not found
 */
function getStarForMutation(mutationType, mutationsData) {
    if (!mutationsData || !mutationsData.byType) {
        return null;
    }
    
    return mutationsData.byType[mutationType] || null;
}

/**
 * Calculate major cycle four mutations (大限四化)
 * Uses the same logic as birth year mutations but based on major cycle palace stem
 * 
 * @param {string} stemChar - Heavenly stem character of the major cycle palace (甲-癸)
 * @param {Object} [userSelections=null] - User selections for controversial stems
 * @returns {Object} Object mapping mutation types to star names, and star names to mutation types
 *                   Format: { 
 *                     byType: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
 *                     byStar: { '廉貞': '祿', '破軍': '權', '武曲': '科', '太陽': '忌' }
 *                   }
 */
function calculateMajorCycleMutations(stemChar, userSelections = null) {
    // Use the same logic as birth year mutations
    const stemIndex = HEAVENLY_STEMS.indexOf(stemChar);
    if (stemIndex === -1) {
        console.warn('Invalid stem character for major cycle mutations:', stemChar);
        return { byType: {}, byStar: {} };
    }
    
    // Get current user selections from adapter settings, use defaults if not available
    let selections = userSelections;
    if (!selections) {
        selections = null; // Will use adapter settings in calculateBirthYearMutations
    }
    
    // Reuse the birth year mutations logic
    const mutations = calculateBirthYearMutations(stemIndex, selections);
    
    return mutations;
}

/**
 * Calculate annual cycle four mutations (流年四化)
 * Uses the same logic as birth year mutations but based on annual cycle palace stem
 * 
 * @param {string} stemChar - Heavenly stem character of the annual cycle palace (甲-癸)
 * @param {Object} [userSelections=null] - User selections for controversial stems
 * @returns {Object} Object mapping mutation types to star names, and star names to mutation types
 *                   Format: { 
 *                     byType: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
 *                     byStar: { '廉貞': '祿', '破軍': '權', '武曲': '科', '太陽': '忌' }
 *                   }
 */
function calculateAnnualCycleMutations(stemChar, userSelections = null) {
    // Use the same logic as birth year mutations
    const stemIndex = HEAVENLY_STEMS.indexOf(stemChar);
    if (stemIndex === -1) {
        console.warn('Invalid stem character for annual cycle mutations:', stemChar);
        return { byType: {}, byStar: {} };
    }
    
    // Get current user selections from adapter settings, use defaults if not available
    let selections = userSelections;
    if (!selections) {
        selections = null; // Will use adapter settings in calculateBirthYearMutations
    }
    
    // Reuse the birth year mutations logic
    const mutations = calculateBirthYearMutations(stemIndex, selections);
    
    return mutations;
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

// Export functions to global namespace
registerAdapterModule('mutations', {
    calculateBirthYearMutations,
    getMutationForStar,
    getStarForMutation,
    calculateMajorCycleMutations,
    calculateAnnualCycleMutations
});

// Four Mutations module loaded (startup log removed to reduce console noise)
