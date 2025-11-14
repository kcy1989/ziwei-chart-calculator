/**
 * Four Mutations (四化) Calculator
 * 
 * Calculates birth year mutations (生年四化) based on the heavenly stem (天干) of birth year.
 * Uses Zhongzhou School (中州派) mutation table.
 * 
 * Dependencies:
 * - mutation-zhongzhou.js: Mutation table data
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
    
    // Check if mutation table is available
    if (typeof MutationZhongzhou === 'undefined') {
        console.error('MutationZhongzhou table not loaded!');
        return { byType: {}, byStar: {} };
    }
    
    // Get mutations for this stem
    const mutations = MutationZhongzhou.getAllMutations(stem);
    
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

// Export functions to global namespace
registerAdapterModule('mutations', {
    calculateBirthYearMutations,
    getMutationForStar,
    getStarForMutation
});

function registerAdapterModule(name, api) {
    var adapter = window.ziweiAdapter;
    if (adapter && typeof adapter.registerModule === 'function') {
        adapter.registerModule(name, api);
    } else {
        window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
        window.__ziweiAdapterModules[name] = api;
    }
}

// Four Mutations module loaded (startup log removed to reduce console noise)
