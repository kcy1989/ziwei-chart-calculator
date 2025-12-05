/**
 * Primary Stars Placement Module
 * 
 * Handles placement of 14 primary stars including:
 * - Ziwei Star System (紫微星系): 紫微, 天機, 太陽, 武曲, 天同, 廉貞
 * - Tianfu Star System (天府星系): 天府, 太陰, 貪狼, 巨門, 天相, 天梁, 七殺, 破軍
 * 
 * Dependencies:
 * - assets/js/data-adapter.js (ziweiAdapter)
 * 
 * Exports: registerAdapterModule('primary', ...)
 */

'use strict';

// ============================================================================
// Adapter Helpers
// ============================================================================

/**
 * Helper to get adapter module
 */
function getAdapterModule(name) {
    var adapter = window.ziweiAdapter;
    return adapter && adapter.getModule ? adapter.getModule(name) : null;
}

/**
 * Calculate Ziwei Star (紫微星) placement position
 * 古訣:
 * 六五四三一，酉什亥辰丑，
 * 局數除日數，商數宮前走，
 * 若見數無餘，便要起虎口，
 * 日數小於局，逕直宮中走。
 * 
 * Algorithm:
 * 1. Step = ceil(day / loci), where loci is the five elements loci number
 * 2. Remainder = step * loci - day
 * 3. If remainder is even: totalStep = step + remainder - 1
 *    If remainder is odd: totalStep = step - remainder - 1
 * 4. Ziwei position = (2 + totalStep) % 12
 *    (counting from palace index 2 = 寅宮)
 * 
 * @param {number} lunarDay Lunar birth day (1-30)
 * @param {number} nayinLoci Five elements loci number (2, 3, 4, 5, or 6)
 * @returns {Object} { palaceIndex: 0-11, step: number, remainder: number, totalStep: number }
 */
function calculateZiweiStarPosition(lunarDay, nayinLoci) {
    // Validate inputs
    if (!lunarDay || lunarDay < 1 || lunarDay > 30) {
        console.error('Invalid lunar day:', lunarDay);
        return null;
    }
    
    if (!nayinLoci || ![2, 3, 4, 5, 6].includes(nayinLoci)) {
        console.error('Invalid nayin loci:', nayinLoci);
        return null;
    }
    
    const step = Math.ceil(lunarDay / nayinLoci);
    const remainder = step * nayinLoci - lunarDay;
    let totalStep;
    if (remainder % 2 === 0) {
        // Even remainder: totalStep = step + remainder - 1
        totalStep = step + remainder - 1;
    } else {
        // Odd remainder: totalStep = step - remainder - 1
        totalStep = step - remainder - 1;
    }
    
    const palaceIndex = (2 + totalStep) % 12;
    
    // Handle negative modulo correctly in JavaScript
    const normalizedPalaceIndex = palaceIndex < 0 ? palaceIndex + 12 : palaceIndex;
    
    // Debug logging removed to reduce console noise
    
    return {
        palaceIndex: normalizedPalaceIndex,
        step,
        remainder,
        totalStep
    };
}

/**
 * Calculate Ziwei Star System (紫微星系) - Secondary stars positions
 * Based on Ziwei star position as reference point (index 0)
 * 
 * 紫微逆去宿天機，隔一太陽武曲移,
 * 天同隔二廉貞位，空三復見紫微池。
 * 
 * @param {number} ziweiPalaceIndex Ziwei star palace index (0-11)
 * @returns {Object} Secondary stars positions { starName: palaceIndex }
 */
function calculateZiweiSystemStars(ziweiPalaceIndex) {
    if (ziweiPalaceIndex === undefined || ziweiPalaceIndex === null) {
        console.error('Invalid Ziwei palace index:', ziweiPalaceIndex);
        return null;
    }
    
    // Relative positions from Ziwei star (index 0)
    const secondaryStarOffsets = {
        '廉貞': 4,
        '天同': 7,
        '武曲': 8,
        '太陽': 9,
        '天機': 11
    };
    
    const systemStars = {};
    for (const [starName, offset] of Object.entries(secondaryStarOffsets)) {
        const palaceIndex = (ziweiPalaceIndex + offset) % 12;
        systemStars[starName] = palaceIndex;
    }
    
    // Debug logging removed to reduce console noise
    
    return systemStars;
}

/**
 * Calculate Tianfu Star (天府星) placement position
 * 
 * Tianfu position is derived from Ziwei star position using the formula:
 * tianfu = (4 - ziweiIndex) % 12 (with proper handling for negative modulo)
 * 
 * 局定生日逆佈紫，斜對天府順流行，
 * 唯有寅申同一位，其餘丑卯互安星。
 * 
 * Mapping table (Ziwei → Tianfu):
 * 2→2, 3→1, 4→0, 5→11, 6→10, 7→9, 8→8, 9→7, 10→6, 11→5, 0→4, 1→3
 * 
 * @param {number} ziweiPalaceIndex Ziwei star palace index (0-11)
 * @returns {number} Tianfu star palace index (0-11)
 */
function calculateTianfuStarPosition(ziweiPalaceIndex) {
    if (ziweiPalaceIndex === undefined || ziweiPalaceIndex === null) {
        console.error('Invalid Ziwei palace index:', ziweiPalaceIndex);
        return null;
    }
    
    // Formula: (4 - ziweiIndex) % 12 with proper modulo for negative numbers
    const tianfuIndex = ((4 - ziweiPalaceIndex) % 12 + 12) % 12;
    
    // Debug logging removed to reduce console noise
    
    return tianfuIndex;
}

/**
 * Calculate Tianfu Star System (天府星系) - Secondary stars positions
 * Based on Tianfu star position as reference point (index 0)
 * 
 * 天府順行有太陰，貪狼而後巨門臨，
 * 隨來天相天梁繼，七殺空三是破軍。
 * 
 * @param {number} tianfuPalaceIndex Tianfu star palace index (0-11)
 * @returns {Object} Secondary stars positions { starName: palaceIndex }
 */
function calculateTianfuSystemStars(tianfuPalaceIndex) {
    if (tianfuPalaceIndex === undefined || tianfuPalaceIndex === null) {
        console.error('Invalid Tianfu palace index:', tianfuPalaceIndex);
        return null;
    }
    
    // Relative positions from Tianfu star (index 0)
    const secondaryStarOffsets = {
        '太陰': 1,
        '貪狼': 2,
        '巨門': 3,
        '天相': 4,
        '天梁': 5,
        '七殺': 6,
        '破軍': 10
    };
    
    const systemStars = {};
    for (const [starName, offset] of Object.entries(secondaryStarOffsets)) {
        const palaceIndex = (tianfuPalaceIndex + offset) % 12;
        systemStars[starName] = palaceIndex;
    }
    
    // Debug logging removed to reduce console noise
    
    return systemStars;
}

/**
 * Place all 14 primary stars on the chart
 * 
 * @param {Object} chartData Chart data with lunarDay and nayinLoci
 * @returns {Object} Mapping of star positions { starName: palaceIndex }
 */
function placePrimaryStars(chartData) {
    // Validate required data
    if (!chartData || !chartData.lunarDay || !chartData.nayinLoci) {
        console.error('Missing required chart data: lunarDay or nayinLoci', chartData);
        return null;
    }
    
    const { lunarDay, nayinLoci } = chartData;
    
    const primaryStars = {};
    
    // Calculate Ziwei star position
    const ziweiData = calculateZiweiStarPosition(lunarDay, nayinLoci);
    if (ziweiData) {
        const ziweiIndex = ziweiData.palaceIndex;
        primaryStars['紫微'] = ziweiIndex;
        
        // Calculate Ziwei System secondary stars based on Ziwei position
        const ziweiSystemStars = calculateZiweiSystemStars(ziweiIndex);
        if (ziweiSystemStars) {
            Object.assign(primaryStars, ziweiSystemStars);
        }
    }
    
    // Calculate Tianfu star position based on Ziwei position
    const tianfuIndex = calculateTianfuStarPosition(ziweiData?.palaceIndex);
    if (tianfuIndex !== null && tianfuIndex !== undefined) {
        primaryStars['天府'] = tianfuIndex;
        
        // Calculate Tianfu System secondary stars based on Tianfu position
        const tianfuSystemStars = calculateTianfuSystemStars(tianfuIndex);
        if (tianfuSystemStars) {
            Object.assign(primaryStars, tianfuSystemStars);
        }
    }
    
    // Primary stars computed (debug logging removed)
    
    return primaryStars;
}

// Expose public API through centralized adapter registration (assets/js/adapter-utils.js)
window.registerAdapterModule('primary', {
    calculateZiweiStarPosition,
    calculateZiweiSystemStars,
    calculateTianfuStarPosition,
    calculateTianfuSystemStars,
    placePrimaryStars
});
