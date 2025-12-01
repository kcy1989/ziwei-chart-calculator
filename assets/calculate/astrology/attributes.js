'use strict';

/**
 * Attributes (神煞) Calculation Module
 * 
 * Three main categories of Tai Sui stars (太歲神煞):
 * 1. Tai Sui (太歲) - 12 stars starting from year branch
 * 2. Jiang Qian (將前) - 12 stars starting from calculated position
 * 3. Bo Shi (博士) - 12 stars starting from Lu Cun (祿存) position
 * 
 * Each palace receives stars from all three categories combined.
 * 
 * @module Attributes
 */

/**
 * Tai Sui (太歲) - 12 sequential stars starting from year branch
 */
const TAI_SUI_STARS = [
    '太歲', '晦氣', '喪門', '貫索', '官符', '小耗',
    '歲破', '龍德', '白虎', '天德', '吊客', '病符'
];

/**
 * Jiang Qian (將前) - 12 sequential stars
 */
const JIANG_QIAN_STARS = [
    '將星', '攀鞍', '歲驛', '息神', '華蓋', '劫煞',
    '災煞', '天煞', '指背', '咸池', '月煞', '亡神'
];

/**
 * Bo Shi (博士) - 12 sequential stars
 */
const BO_SHI_STARS = [
    '博士', '力士', '青龍', '小耗', '將軍', '奏書',
    '飛廉', '喜神', '病符', '大耗', '伏兵', '官符'
];

/**
 * Calculate Tai Sui (太歲) stars positions
 * Starts at year branch index, proceeds clockwise
 * 
 * @param {number} yearBranchIndex - Year's earthly branch (0-11, 0=子)
 * @returns {Object} Map of star name to palace index
 */
function calculateTaiSui(yearBranchIndex) {
    const result = {};
    
    for (let i = 0; i < TAI_SUI_STARS.length; i++) {
        const starName = TAI_SUI_STARS[i];
        const palaceIndex = (yearBranchIndex + i) % 12;
        result[starName] = palaceIndex;
    }
    
    return result;
}

/**
 * Calculate Jiang Qian (將前) stars positions
 * Starting palace: [0, 9, 6, 3] repeating based on year branch mod 4
 * Then proceeds clockwise
 * 
 * @param {number} yearBranchIndex - Year's earthly branch (0-11, 0=子)
 * @returns {Object} Map of star name to palace index
 */
function calculateJiangQian(yearBranchIndex) {
    const result = {};
    
    // Calculate starting palace using simplified algorithm
    const jiangQianPattern = [0, 9, 6, 3];
    const startPalace = jiangQianPattern[yearBranchIndex % 4];
    
    for (let i = 0; i < JIANG_QIAN_STARS.length; i++) {
        const starName = JIANG_QIAN_STARS[i];
        const palaceIndex = (startPalace + i) % 12;
        result[starName] = palaceIndex;
    }
    
    return result;
}

/**
 * Calculate Bo Shi (博士) stars positions
 * Starts from Lu Cun (祿存) palace index
 * Direction depends on gender and orientation:
 * Yang male & Yin female = clockwise, Yin male & Yang female = counter-clockwise
 * 
 * @param {number} luCunPalaceIndex - Lu Cun (祿存) palace index (0-11)
 * @param {boolean} isClockwise - Whether to arrange clockwise (true) or counter-clockwise (false)
 * @returns {Object} Map of star name to palace index
 */
function calculateBoShi(luCunPalaceIndex, isClockwise) {
    const result = {};
    
    for (let i = 0; i < BO_SHI_STARS.length; i++) {
        const starName = BO_SHI_STARS[i];
        
        // Calculate palace index based on direction
        let palaceIndex;
        if (isClockwise) {
            palaceIndex = (luCunPalaceIndex + i) % 12;
        } else {
            // Counter-clockwise: subtract instead of add
            palaceIndex = (luCunPalaceIndex - i + 12) % 12;
        }
        
        result[starName] = palaceIndex;
    }
    
    return result;
}

/**
 * Calculate all attributes (神煞) for all 12 palaces.
 * Combines Tai Sui, Jiang Qian, and Bo Shi stars.
 * 
 * @param {number} yearBranchIndex - Year's earthly branch (0-11)
 * @param {number} luCunPalaceIndex - Lu Cun (祿存) palace index (0-11)
 * @param {boolean} isClockwise - Direction for Bo Shi stars
 * @returns {Object} Object mapping palace index (0-11) to array of star names
 */
function calculateAllAttributes(yearBranchIndex, luCunPalaceIndex, isClockwise) {
    const taiSui = calculateTaiSui(yearBranchIndex);
    const jiangQian = calculateJiangQian(yearBranchIndex);
    const boShi = calculateBoShi(luCunPalaceIndex, isClockwise);
    
    // Combine all stars into palace-indexed map
    const attributesMap = {};
    
    for (let palaceIndex = 0; palaceIndex < 12; palaceIndex++) {
        const starsAtPalace = [];
        
        // Add stars from each category
        for (const [starName, star] of Object.entries(taiSui)) {
            if (star === palaceIndex) starsAtPalace.push(starName);
        }
        for (const [starName, star] of Object.entries(jiangQian)) {
            if (star === palaceIndex) starsAtPalace.push(starName);
        }
        for (const [starName, star] of Object.entries(boShi)) {
            if (star === palaceIndex) starsAtPalace.push(starName);
        }
        
        attributesMap[palaceIndex] = starsAtPalace;
    }
    
    return attributesMap;
}

/**
 * Get attributes for a specific palace from the attributes map.
 * Returns array of star names at that palace.
 * 
 * @param {number} palaceIndex - Palace index (0-11)
 * @param {Object} attributesMap - Map from calculateAllAttributes
 * @returns {Array<string>} Array of star name strings, or empty array if not found
 */
function getAttributesForPalace(palaceIndex, attributesMap) {
    if (!attributesMap || typeof attributesMap !== 'object') {
        return [];
    }
    
    // Try both numeric and string keys
    return attributesMap[palaceIndex] || attributesMap[String(palaceIndex)] || [];
}

/**
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

// Expose public API (T076: No global backward compat references)
registerAdapterModule('attributes', {
    calculateAttributes: calculateAllAttributes,
    calculateAllAttributes,
    getAttributesForPalace
});

// Expose public API through centralized adapter registration
window.registerAdapterModule('attributes', {
    calculateTaiSui,
    calculateJiangQian,
    calculateBoShi,
    calculateAllAttributes
});
