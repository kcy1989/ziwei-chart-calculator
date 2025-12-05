/**
 * Palace Names Database
 * 
 * Stores palace names for different Ziwei Doushu schools and traditions.
 * Supports multiple schools/派別 for future expansion.
 * 
 * Dependencies: None
 * 
 * Exports: window.getPalaceNames, window.getShenPalaceCombined
 */

'use strict';

// ============================================================================
// Standard Palace Names (紫微斗數十二宮 - 標準派)
// ============================================================================
const PALACE_NAMES_STANDARD = [
    '命宮',
    '父母',
    '福德',
    '田宅',
    '事業',
    '交友',
    '遷移',
    '疾厄',
    '財帛',
    '子女',
    '夫妻',
    '兄弟'
];

/**
 * Shen Palace Combined Names
 * When Shen Palace (身宮) overlaps with other palaces,
 * use these combined names to indicate both locations
 * 
 * Note: Shen Palace cannot be Friends Palace (交友) per Ziwei system rules,
 * so only Career/Official (事業/官祿) combinations are needed.
 */
const SHEN_PALACE_COMBINE = {
    // Default/Standard combinations
    '命宮': '身命',     // Shen + Ming
    '福德': '身福', // Shen + Fortune
    '事業': '身事', // Shen + Career (default)
    '官祿': '身官',   // Shen + Official
    '夫妻': '身夫', // Shen + Spouse
    '財帛': '身財', // Shen + Wealth
    '遷移': '身遷', // Shen + Travel
};

/**
 * Palace names collection with metadata
 * Structure allows for easy addition of new schools in the future
 */
const PALACE_NAMES = {
    // Standard school (default)
    'standard': {
        name: '標準派',
        description: '紫微斗數標準十二宮命名',
        palaces: PALACE_NAMES_STANDARD,
        shenCombine: SHEN_PALACE_COMBINE
    }
    // Future schools can be added here:
    // 'zongheipai': { ... },
    // 'taipei': { ... },
    // etc.
};

/**
 * Get palace names for a specific school
 * @param {string} school School name (default: 'standard')
 * @returns {Array} Array of palace names
 */
function getPalaceNames(school = 'standard') {
    const schoolData = PALACE_NAMES[school] || PALACE_NAMES['standard'];
    return schoolData.palaces;
}

/**
 * Get Shen Palace combined name mapping for a specific school
 * @param {string} school School name (default: 'standard')
 * @returns {Object} Mapping of combined names
 */
function getShenCombineNames(school = 'standard') {
    const schoolData = PALACE_NAMES[school] || PALACE_NAMES['standard'];
    return schoolData.shenCombine;
}

/**
 * Get all available schools
 * @returns {Array} List of available school keys
 */
function getAvailableSchools() {
    return Object.keys(PALACE_NAMES);
}

// Expose public API
registerAdapterModule('palaceNames', {
    PALACE_NAMES,
    getPalaceNames,
    getShenCombineNames,
    getAvailableSchools
});

window.ziweiPalaceNames = {
    PALACE_NAMES,
    getPalaceNames,
    getShenCombineNames,
    getAvailableSchools
};

function registerAdapterModule(name, api) {
    var adapter = window.ziweiAdapter;
    if (adapter && typeof adapter.registerModule === 'function') {
        adapter.registerModule(name, api);
    } else {
        window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
        window.__ziweiAdapterModules[name] = api;
    }
}

