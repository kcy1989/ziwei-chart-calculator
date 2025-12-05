/**
 * Star Brightness Calculator (星曜亮度計算)
 * 
 * Calculates and retrieves brightness (廃旺利陷) for primary and secondary stars
 * based on star name and palace information (heavenly stem + earthly branch).
 * 
 * Brightness Levels:
 * - 廃 (Excellent) | 旺 (Strong) | 利 (Good) | 平 (Neutral) | 陷 (Fallen)
 * 
 * Supports brightness schools:
 * - 'shuoshu' (斗數全書) - Default, primary reference
 * 
 * Dependencies:
 * - assets/data/brightness.js (BrightnessDatabase)
 * 
 * Exports: registerAdapterModule('brightness', ...)
 */

'use strict';

// ============================================================================
// Primary Stars Brightness
// ============================================================================

/**
 * Calculate brightness for primary stars
 * 
 * @param {Object} primaryStars - Primary stars map from placePrimaryStars()
 *                                Format: { '紫微': 0, '天機': 1, ... }
 * @param {Object} palaceMapping - Palace information with stem and branch
 *                                 Format: { 0: { stem, stemIndex, branchZhi, branchIndex, ... }, ... }
 * @param {string} school - Brightness school name (default: 'shuoshu')
 * @returns {Object} Brightness map { starName: brightness, ... }
 */
function calculatePrimaryBrightness(primaryStars, palaceMapping, school = 'shuoshu') {
    
    if (!primaryStars || typeof primaryStars !== 'object') {
        return {};
    }

    const brightnessDatabase = getBrightnessDatabase(school);
    if (!brightnessDatabase) {
        console.error('[Brightness] Database not available for school:', school);
        return {};
    }

    const result = {};

    for (const [starName, palaceIndex] of Object.entries(primaryStars)) {
        if (typeof palaceIndex !== 'number') continue;

        // Get palace info (contains branchIndex for brightness lookup)
        const palaceInfo = palaceMapping[palaceIndex];
        if (!palaceInfo) continue;

        // Get brightness from database using star name and branch index
        const branchIndex = palaceInfo.branchIndex;
        const brightness = brightnessDatabase.getBrightness(starName, branchIndex);
        
        if (brightness) {
            result[starName] = {
                brightness: brightness,
                palaceIndex: palaceIndex,
                branchIndex: branchIndex,
                stem: palaceInfo?.stem || '',
                branchZhi: palaceInfo?.branchZhi || ''
            };

            // Debug logging intentionally removed to reduce console noise.
        }
    }

    return result;
}

/**
 * Calculate brightness for secondary stars
 * 
 * @param {Object} secondaryStars - Secondary stars map from calculateAllSecondaryStars()
 *                                  Format: { '左輔': 0, '右弼': 1, ... }
 * @param {Object} palaceMapping - Palace information with stem and branch
 * @param {string} school - Brightness school name
 * @returns {Object} Brightness map { starName: brightness, ... }
 */
function calculateSecondaryBrightness(secondaryStars, palaceMapping, school = 'shuoshu') {
    
    if (!secondaryStars || typeof secondaryStars !== 'object') {
        return {};
    }

    const brightnessDatabase = getBrightnessDatabase(school);
    if (!brightnessDatabase) {
        console.error('[Brightness] Database not available for school:', school);
        return {};
    }

    const result = {};

    for (const [starName, palaceIndex] of Object.entries(secondaryStars)) {
        if (typeof palaceIndex !== 'number') continue;

        const palaceInfo = palaceMapping[palaceIndex];
        if (!palaceInfo) continue;

        // Get brightness from database using star name and branch index
        const branchIndex = palaceInfo.branchIndex;
        const brightness = brightnessDatabase.getBrightness(starName, branchIndex);
        
        if (brightness) {
            result[starName] = {
                brightness: brightness,
                palaceIndex: palaceIndex,
                branchIndex: branchIndex,
                stem: palaceInfo?.stem || '',
                branchZhi: palaceInfo?.branchZhi || ''
            };

            // Debug logging intentionally removed to reduce console noise.
        }
    }

    return result;
}

/**
 * Calculate brightness for all stars (primary and secondary combined)
 *
 * @param {Object} primaryStars - Primary stars map from placePrimaryStars()
 *                                Format: { '紫微': 0, '天機': 1, ... }
 * @param {Object} secondaryStars - Secondary stars map from calculateAllSecondaryStars()
 *                                Format: { '左輔': 0, '右弼': 1, ... }
 * @param {Object} palaceMapping - Palace information with stem and branch
 *                                 Format: { 0: { stem, stemIndex, branchZhi, branchIndex, ... }, ... }
 * @param {string} school - Brightness school name (default: 'shuoshu')
 * @returns {Object} Brightness data structured as { primary: { starName: brightness }, secondary: { starName: brightness } }
 */
function calculateAllBrightness(primaryStars, secondaryStars, palaceMapping, school = 'shuoshu') {
    const primaryBrightness = calculatePrimaryBrightness(primaryStars, palaceMapping, school);
    const secondaryBrightness = calculateSecondaryBrightness(secondaryStars, palaceMapping, school);

    // Return structured data as expected by chart.js
    return {
        primary: primaryBrightness,
        secondary: secondaryBrightness
    };
}

/**
 * Get brightness database for a specific school
 * Uses the main BrightnessDatabase interface from data/brightness.js
 *
 * @param {string} school - School name (default: 'shuoshu')
 * @returns {Object|null} Brightness database interface or null
 */
function getBrightnessDatabase(school = 'shuoshu') {
    // Use the main BrightnessDatabase interface from data/brightness.js
    const database = window.BrightnessDatabase;
    if (database && typeof database.getDatabase === 'function') {
        return database.getDatabase(school);
    }

    // Fallback to direct window reference if main interface not available
    return window.BrightnessShuoshu || null;
}

/**
 * Get brightness for a single star at a specific branch
 * 
 * @param {string} starName - Star name
 * @param {number} branchIndex - Earthly branch index (0-11)
 * @param {string} school - Brightness school name
 * @returns {string} Brightness level or empty string
 */
function getStarBrightness(starName, branchIndex, school = 'shuoshu') {
    const database = getBrightnessDatabase(school);
    return database?.getBrightness(starName, branchIndex) || '';
}

/**
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

// Expose public API via adapter module registration
registerAdapterModule('brightness', {
    calculateAllBrightness,
    calculatePrimaryBrightness,
    calculateSecondaryBrightness,
    getStarBrightness,
    getBrightnessDatabase
});

// Module loaded log removed to avoid verbose console output in production.
