/**
 * Four Mutations (四化) Calculator
 * 
 * Calculates birth year mutations (生年四化) based on the heavenly stem (天干)
 * of birth year. Uses hybrid system: Zhongzhou School defaults + user-selectable
 * alternatives for controversial stems.
 * 
 * Dependencies:
 * - assets/data/mutation.js (getMutation, getAllMutations)
 * - assets/data/constants.js (STEM_NAMES, CONTROVERSIAL_STEMS)
 * 
 * Exports: registerAdapterModule('mutations', ...)
 */

'use strict';

// ============================================================================
// Module Constants
// ============================================================================

const constants = window.ziweiConstants;
const STEM_NAMES = constants.STEM_NAMES;
const CONTROVERSIAL_STEMS = constants.CONTROVERSIAL_STEMS;

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
    // Validate stem index
    if (stemIndex < 0 || stemIndex > 9) {
        return { byType: {}, byStar: {} };
    }

    // Get heavenly stem character
    const stem = STEM_NAMES[stemIndex];
    
    // Check if mutation functions are available
    if (typeof getAllMutations !== 'function') {
        console.error('getAllMutations function not loaded!');
        return { byType: {}, byStar: {} };
    }
    
    // Get current user selections from adapter settings
    let userSelections = null;
    const adapterSettings = window.ziweiAdapter?.settings;
    if (adapterSettings && typeof adapterSettings.get === 'function') {
        userSelections = {};
        for (const controversialStem of CONTROVERSIAL_STEMS) {
            const settingName = `stemInterpretation_${controversialStem}`;
            const value = adapterSettings.get(settingName);
            if (value) {
                userSelections[controversialStem] = value;
            }
        }
    }
    
    // Ensure all controversial stems have settings, use defaults for missing ones
    const defaultSelections = {};
    for (const s of CONTROVERSIAL_STEMS) {
        defaultSelections[s] = 'interpretation_1';
    }
    
    if (!userSelections) {
        userSelections = { ...defaultSelections };
    } else {
        // Fill in missing stems with defaults
        for (const s of CONTROVERSIAL_STEMS) {
            if (!userSelections[s]) {
                userSelections[s] = defaultSelections[s];
            }
        }
    }
    
    // Get mutations for this stem using the hybrid system with user selections
    const mutations = getAllMutations(stem, userSelections);
    
    if (!mutations) {
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
    const stemIndex = STEM_NAMES.indexOf(stemChar);
    if (stemIndex === -1) {
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
    const stemIndex = STEM_NAMES.indexOf(stemChar);
    if (stemIndex === -1) {
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
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

// Export functions to global namespace
registerAdapterModule('mutations', {
    calculateBirthYearMutations,
    getMutationForStar,
    getStarForMutation,
    calculateMajorCycleMutations,
    calculateAnnualCycleMutations
});

// Four Mutations module loaded (startup log removed to reduce console noise)
