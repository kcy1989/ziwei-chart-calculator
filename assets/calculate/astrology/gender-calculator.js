/**
 * Gender and Yin-Yang Calculator
 * 
 * Determines the gender classification for Ziwei Doushu charts:
 * - 陽年生: 陽男/陽女
 * - 陰年生: 陰男/陰女
 * 
 * Yang stems (陽年天干): 甲, 丙, 戊, 庚, 壬
 * Yin stems (陰年天干): 乙, 丁, 己, 辛, 癸
 * 
 * Dependencies: None
 * 
 * Exports: registerAdapterModule('gender', ...)
 */

'use strict';

// ============================================================================
// Gender Classification
// ============================================================================

/**
 * Calculate gender classification based on gender and lunar year
 * 
 * @param {string} gender 'M' (male) or 'F' (female)
 * @param {number} lunarYear The lunar year
 * @returns {string} '陽男', '陰男', '陽女', or '陰女'
 */
function getGenderClassification(gender, lunarYear) {
    // Calculate Heavenly Stem (天干) - cycles every 10 years
    // Base year 1864 (甲子年) is Yang
    const yearOffset = (lunarYear - 1864) % 10;
    const adjustedOffset = yearOffset < 0 ? yearOffset + 10 : yearOffset;
    
    // Yang stems (陽干): indices 0, 2, 4, 6, 8
    const yangStems = [0, 2, 4, 6, 8];
    const isYangYear = yangStems.includes(adjustedOffset);
    
    // Determine gender
    const isMale = gender === 'M' || gender === '男';
    
    // Build classification
    if (isYangYear) {
        return isMale ? '陽男' : '陽女';
    } else {
        return isMale ? '陰男' : '陰女';
    }
}

/**
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

// Expose public API
registerAdapterModule('gender', {
    getGenderClassification
});
