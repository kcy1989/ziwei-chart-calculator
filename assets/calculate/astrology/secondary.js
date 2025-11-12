'use strict';

/**
 * Secondary Stars Placement Module for Ziwei Doushu
 * Calculates positions of 12 secondary stars:
 * 1. Left Assistant (左輔), Right Assist (右弼)
 * 2. Literary Talent (文昌), Literary Craft (文曲)
 * 3. Earthly Emptiness (地空), Earthly Robbery (地劫)
 * 4. Celestial Canopy (天魁), Celestial Seal (天鉞)
 * 5. Prosperity (祿存), Positive Poison (擎羊), Curved Trap (陀羅)
 * 6. Fire (火星), Bells (鈴星)
 */

/**
 * Helper to get adapter module
 */
function getAdapterModule(name) {
    var adapter = window.ziweiAdapter;
    return adapter && adapter.getModule ? adapter.getModule(name) : null;
}

/**
 * Calculate Left Assistant (左輔) and Right Assist (右弼)
 * Both depend on the birth month
 * 左輔: Starts at 辰宮 (index 4) for first month, moves clockwise
 * 右弼: Starts at 戌宮 (index 10) for first month, moves counter-clockwise
 * 古訣:
 * 辰上順正尋左輔，戌上逆正右弼當，
 * 
 * @param {number} monthIndex Month index (0-11, where 0 = first lunar month)
 * @returns {Object} { leftAssistant: 0-11, rightAssist: 0-11 }
 */
function calculateLeftRightAssist(monthIndex) {
    // 左輔: 辰宮 (index 4) + month, clockwise
    const leftAssistant = (4 + monthIndex) % 12;
    
    // 右弼: 戌宮 (index 10) - month, counter-clockwise
    const rightAssist = (10 - monthIndex + 12) % 12;
    
    return {
        leftAssistant: leftAssistant,
        rightAssist: rightAssist
    };
}

/**
 * Calculate Literary Talent (文昌) and Literary Craft (文曲)
 * Both are calculated based on the birth time (hour)
 * 文昌: Starts at 戌宮 (index 10) for 子時, moves counter-clockwise
 * 文曲: Starts at 辰宮 (index 4) for 子時, moves clockwise
 * 古訣:
 * 辰上順時文曲位，戌上逆時覓文昌，
 * 
 * @param {number} timeIndex Time index (0-11, where 0 = 子時)
 * @returns {Object} { literaryTalent: 0-11, literaryCraft: 0-11 }
 */
function calculateLiteraryStars(timeIndex) {
    // 文昌: 戌宮 (index 10) - time, counter-clockwise
    const literaryTalent = (10 - timeIndex + 12) % 12;
    
    // 文曲: 辰宮 (index 4) + time, clockwise
    const literaryCraft = (4 + timeIndex) % 12;
    
    return {
        literaryTalent: literaryTalent,
        literaryCraft: literaryCraft
    };
}

/**
 * Calculate Earthly Emptiness (地空) and Earthly Robbery (地劫)
 * Both calculated based on the birth time (hour)
 * 地空: Starts at 亥宮 (index 11) for 子時, moves counter-clockwise
 * 地劫: Starts at 亥宮 (index 11) for 子時, moves clockwise
 * 古訣:
 * 亥上子時順安劫，逆回便是地空亡。
 * 
 * @param {number} timeIndex Time index (0-11, where 0 = 子時)
 * @returns {Object} { earthlyEmptiness: 0-11, earthlyRobbery: 0-11 }
 */
function calculateEarthlyStars(timeIndex) {
    // 地空: 亥宮 (index 11) - time, counter-clockwise
    const earthlyEmptiness = (11 - timeIndex + 12) % 12;
    
    // 地劫: 亥宮 (index 11) + time, clockwise
    const earthlyRobbery = (11 + timeIndex) % 12;
    
    return {
        earthlyEmptiness: earthlyEmptiness,
        earthlyRobbery: earthlyRobbery
    };
}

/**
 * Calculate Celestial Canopy (天魁) and Celestial Seal (天鉞)
 * Calculated based on heavenly stem index (天干索引)
 * 天魁 positions by stem (甲-癸): [1, 0, 11, 11, 1, 0, 1, 6, 3, 3]
 * 天鉞 positions by stem (甲-癸): [7, 8, 9, 9, 7, 8, 7, 2, 5, 5]
 * 古訣:
 * 甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，
 * 壬癸免蛇藏，六辛逢馬虎，魁鉞貴人方。
 * 
 * @param {number} stemIndex Heavenly stem index (0-9), obtained from ziweiBasic.getHeavenlyStemIndex()
 * @returns {Object} { celestialCanopy: 0-11, celestialSeal: 0-11 }
 */
function calculateCelestialStars(stemIndex) {
    const celestialCanopyPositions = [1, 0, 11, 11, 1, 0, 1, 6, 3, 3];
    const celestialSealPositions = [7, 8, 9, 9, 7, 8, 7, 2, 5, 5];
    
    const celestialCanopy = celestialCanopyPositions[stemIndex]; // 天魁
    const celestialSeal = celestialSealPositions[stemIndex]; // 天鉞

    return {
        celestialCanopy: celestialCanopy,
        celestialSeal: celestialSeal
    };
}

/**
 * Calculate Prosperity (祿存), Positive Poison (擎羊), Curved Trap (陀羅)
 * Prosperity depends on the heavenly stem (天干), Positive Poison is Prosperity +1 clockwise, Curved Trap is Prosperity -1 counter-clockwise
 * 
 * 古訣:
 * 甲祿到寅宮，乙祿居卯府，丙戊祿在巳，丁巳祿在午，
 * 庚祿定居申，辛祿酉上補，壬祿亥中藏，癸祿居子戶。
 * 祿前擎羊當，祿後陀羅府。
 * 
 * @param {number} stemIndex Heavenly stem index (0-9), obtained from ziweiBasic.getHeavenlyStemIndex()
 * @returns {Object} { prosperity: 0-11, positivePoison: 0-11, curvedTrap: 0-11 }
 */
function calculateWealthStars(stemIndex) {
    const prosperityPositions = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0]; // 祿存 positions by stem (甲-癸)
    const prosperity = prosperityPositions[stemIndex];
    return {
        prosperity: prosperity,
        positivePoison: (prosperity + 1) % 12,   // 擎羊: Prosperity +1 clockwise
        curvedTrap: (prosperity - 1 + 12) % 12   // 陀羅: Prosperity -1 counter-clockwise
    };
}

/**
 * Calculate Fire (火星) and Bells (鈴星)
 * Both depend on the birth year branch (地支) and birth time branch (地支)
 * Starting positions for 子時 vary by year branch group, then move clockwise by time index
 * 古訣:
 * 申子辰人寅戌揚，寅午戌人丑卯方，
 * 巳酉丑人卯戌位，亥卯未人酉戌房。
 * 
 * @param {number} timeIndex Time index (0-11, where 0 = 子時)
 * @param {number} branchIndex Earthly branch index (0-11), obtained from ziweiBasic.getEarthlyBranchIndex()
 * @returns {Object} { fire: 0-11, bells: 0-11 }
 */
function calculateFireBells(timeIndex, branchIndex) {
    let startFire, startBells;
    
    // Determine starting positions based on year branch group
    if ([8, 0, 4].includes(branchIndex)) { // 申子辰
        startFire = 2; // 火星在寅宮排起
        startBells = 10; // 鈴星在戌宮排起
    } else if ([2, 6, 10].includes(branchIndex)) { // 寅午戌
        startFire = 1; // 火星在丑宮排起
        startBells = 3; // 鈴星在卯宮排起
    } else if ([5, 9, 1].includes(branchIndex)) { // 巳酉丑
        startFire = 3; // 火星在卯宮排起
        startBells = 10; // 鈴星在戌宮排起
    } else if ([11, 3, 7].includes(branchIndex)) { // 亥卯未
        startFire = 9; // 火星在酉宮排起
        startBells = 10; // 鈴星在戌宮排起
    } else {
        throw new Error('Invalid branch index for Fire and Bells calculation');
    }
    
    // Move clockwise by time index
    const fire = (startFire + timeIndex) % 12;
    const bells = (startBells + timeIndex) % 12;
    
    return {
        fire: fire,
        bells: bells
    };
}

/**
 * Calculate all secondary stars at once
 * 
 * @param {Object} data Contains: { monthIndex, timeIndex, stemIndex, branchIndex }
 *   - stemIndex: from ziweiBasic.getHeavenlyStemIndex(lunarYear)
 *   - branchIndex: from ziweiBasic.getEarthlyBranchIndex(lunarYear)
 * @returns {Object} All secondary stars mapped to palace indices
 */
function calculateAllSecondaryStars(data) {
    const {
        monthIndex,
        timeIndex,
        stemIndex,
        branchIndex
    } = data;
    
    const leftRight = calculateLeftRightAssist(monthIndex);
    const literary = calculateLiteraryStars(timeIndex);
    const earthly = calculateEarthlyStars(timeIndex);
    const celestial = calculateCelestialStars(stemIndex);
    const wealth = calculateWealthStars(stemIndex);
    const fireBells = calculateFireBells(timeIndex, branchIndex); // Added branchIndex parameter
    
    // Create a mapping of star name to palace index
    const secondaryStarsMap = {
        '左輔': leftRight.leftAssistant,
        '右弼': leftRight.rightAssist,
        '文昌': literary.literaryTalent,
        '文曲': literary.literaryCraft,
        '地空': earthly.earthlyEmptiness,
        '地劫': earthly.earthlyRobbery,
        '天魁': celestial.celestialCanopy,
        '天鉞': celestial.celestialSeal,
        '祿存': wealth.prosperity,
        '擎羊': wealth.positivePoison,
        '陀羅': wealth.curvedTrap,
        '火星': fireBells.fire,
        '鈴星': fireBells.bells
    };
    
    return secondaryStarsMap;
}

/**
 * Get secondary stars for a specific palace
 * Returns array of star names at that palace
 * 
 * @param {number} palaceIndex Palace index (0-11)
 * @param {Object} secondaryStarsMap Map from calculateAllSecondaryStars
 * @returns {Array} Array of star names at this palace
 */
function getSecondaryStarsForPalace(palaceIndex, secondaryStarsMap) {
    if (!secondaryStarsMap || typeof secondaryStarsMap !== 'object') {
        return [];
    }
    
    return Object.entries(secondaryStarsMap)
        .filter(([name, index]) => index === palaceIndex)
        .map(([name, index]) => name);
}

/**
 * Helper to register module with adapter
 */
function registerAdapterModule(name, api) {
    var adapter = window.ziweiAdapter;
    if (adapter && typeof adapter.registerModule === 'function') {
        adapter.registerModule(name, api);
    } else {
        window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
        window.__ziweiAdapterModules[name] = api;
    }
}

// Expose public API
registerAdapterModule('secondary', {
    calculateAllSecondaryStars,
    getSecondaryStarsForPalace,
    calculateLeftRightAssist,
    calculateLiteraryStars,
    calculateEarthlyStars,
    calculateCelestialStars,
    calculateWealthStars,
    calculateFireBells
});

// Keep global reference for backward compatibility
window.ziweiSecondary = {
    calculateAllSecondaryStars,
    getSecondaryStarsForPalace,
    calculateLeftRightAssist,
    calculateLiteraryStars,
    calculateEarthlyStars,
    calculateCelestialStars,
    calculateWealthStars,
    calculateFireBells
};
