'use strict';

/**
 * Life Cycle Calculations - Major Cycles (大運) and Twelve Life Stages (十二長生)
 * 
 * Twelve Life Stages Order (Fixed):
 * 長生 → 沐浴 → 冠帶 → 臨官 → 帝旺 → 衰 → 病 → 死 → 墓 → 絕 → 胎 → 養
 * 
 * Nayin loci to starting palace mapping:
 * 2 (Water) → 8, 3 (Wood) → 11, 4 (Metal) → 5, 5 (Fire) → 8, 6 (Earth) → 2
 * 
 * Major Cycle Starting Age by Nayin Loci:
 * 2 (水二局) → age 2-11, 3 (木三局) → 3-12, 4 (金四局) → 4-13, 5 (火五局) → 5-14, 6 (土六局) → 6-15
 * 
 * Arrangement rules:
 * - Yang male (陽男) or Yin female (陰女): clockwise
 * - Yin male (陰男) or Yang female (陽女): counter-clockwise
 */

/**
 * Helper to get adapter module
 */
function getAdapterModule(name) {
    var adapter = window.ziweiAdapter;
    return adapter && adapter.getModule ? adapter.getModule(name) : null;
}

const TWELVE_LIFE_STAGES = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];

const NAYIN_LOCI_TO_PALACE = {
    2: 8,   // Water (水二局)
    3: 11,  // Wood (木三局)
    4: 5,   // Metal (金四局)
    5: 8,   // Fire (火五局)
    6: 2    // Earth (土六局)
};

/**
 * Calculate twelve life stages positions for all 12 palaces
 * @param {number} nayinLoci Nayin loci (2-6) determining starting position
 * @param {string} gender Birth gender ('M' or 'F')
 * @param {number} lunarYear Birth lunar year
 * @returns {Object} Mapping of palace index (0-11) to life stage name
 */
function calculateTwelveLongLifePositions(nayinLoci, gender, lunarYear) {
    const startPalaceIndex = NAYIN_LOCI_TO_PALACE[nayinLoci];
    if (typeof startPalaceIndex !== 'number') {
        throw new Error('Invalid Nayin loci: no palace mapping available');
    }
    
    // Get arrangement direction using basic module via adapter
    var basicModule = getAdapterModule('basic');
    if (!basicModule || typeof basicModule.isClockwise !== 'function') {
        console.warn('Basic module not available for isClockwise calculation');
        return {};
    }
    
    const clockwise = basicModule.isClockwise(gender, lunarYear);
    
    const palaceToLifeStage = {};
    for (let i = 0; i < 12; i++) {
        const palaceIndex = clockwise 
            ? (startPalaceIndex + i) % 12
            : (startPalaceIndex - i + 120) % 12;
        
        palaceToLifeStage[palaceIndex] = TWELVE_LIFE_STAGES[i];
    }
    
    return palaceToLifeStage;
}

/**
 * Calculate major cycles starting from Ming Palace
 * Cycles span from nayin loci value to nayin loci value + 9 (10-year period)
 * 
 * @param {number} nayinLoci Nayin loci (2-6) determining starting age and cycle length
 * @param {string} gender Birth gender ('M' or 'F')
 * @param {number} lunarYear Birth lunar year
 * @param {number} mingPalaceIndex Ming Palace index (0-11) - where first cycle starts
 * @returns {Array} Array of major cycles with age ranges
 * Example: nayinLoci=2 → cycles start at age 2-11, 12-21, 22-31, etc.
 */
function calculateMajorCycles(nayinLoci, gender, lunarYear, mingPalaceIndex) {
    if (typeof nayinLoci !== 'number') {
        throw new Error('Invalid Nayin loci: expected number');
    }
    const startAge = nayinLoci;  // Nayin loci value is the starting age
    
    // Get arrangement direction using basic module via adapter
    var basicModule = getAdapterModule('basic');
    if (!basicModule || typeof basicModule.isClockwise !== 'function') {
        console.warn('Basic module not available for isClockwise calculation');
        return [];
    }
    
    const clockwise = basicModule.isClockwise(gender, lunarYear);
    
    const cycles = [];
    
    // Generate 12 major cycles (spans 120 years, covering typical lifespan)
    for (let i = 0; i < 12; i++) {
        const cycleStartAge = startAge + (i * 10);
        const cycleEndAge = cycleStartAge + 9;
        
        // Calculate palace index for this cycle
        let palaceIndex;
        if (clockwise) {
            palaceIndex = (mingPalaceIndex + i) % 12;
        } else {
            palaceIndex = (mingPalaceIndex - i + 120) % 12;
        }
        
        cycles.push({
            startAge: cycleStartAge,
            endAge: cycleEndAge,
            ageRange: `${cycleStartAge}-${cycleEndAge}`,
            palaceIndex: palaceIndex,
            cycleIndex: i
        });
    }
    
    return cycles;
}

/**
 * Get major cycle info for specific palace index
 * Reuses pre-calculated cycles instead of recalculating
 * 
 * @param {number} palaceIndex Palace index (0-11)
 * @param {Array} cycles Pre-calculated major cycles array
 * @returns {Object} Major cycle info for this palace or null
 */
function getMajorCycleForPalace(palaceIndex, cycles) {
    if (!Array.isArray(cycles)) {
        console.warn('Invalid cycles array');
        return null;
    }
    return cycles.find(cycle => cycle.palaceIndex === palaceIndex) || null;
}

/**
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

// Expose public API
registerAdapterModule('lifeCycle', {
    calculateTwelveLongLifePositions,
    calculateMajorCycles,
    getMajorCycleForPalace
}); // T076: No global backward compat references
