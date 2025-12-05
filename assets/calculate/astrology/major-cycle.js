/**
 * Major Cycle Stars Module
 * 
 * Calculates positions of major cycle stars (大限星曜):
 * - 大限文昌 (大昌) - Major Cycle Literary Talent
 * - 大限文曲 (大曲) - Major Cycle Literary Craft
 * - 大限祿存 (大祿) - Major Cycle Prosperity
 * - 大限擎羊 (大羊) - Major Cycle Positive Poison
 * - 大限陀羅 (大陀) - Major Cycle Curved Trap
 * - And more...
 * 
 * Dependencies:
 * - assets/data/constants.js (ziweiConstants)
 * 
 * Exports: registerAdapterModule('majorCycle', ...)
 */

'use strict';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert heavenly stem character to index (0-9)
 * 甲=0, 乙=1, 丙=2, 丁=3, 戊=4, 己=5, 庚=6, 辛=7, 壬=8, 癸=9
 * 
 * @param {string} stemChar Heavenly stem character (甲-癸)
 * @returns {number} Stem index (0-9), or -1 if invalid
 */
function stemCharToIndex(stemChar) {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const index = stems.indexOf(stemChar);
    return index >= 0 ? index : -1;
}

/**
 * Calculate Major Cycle Literary Talent (大限文昌 / 大昌)
 * Position based on the heavenly stem of the major cycle palace
 * 
 * Stem-to-Palace index mapping:
 * 甲(0) → 5(巳), 乙(1) → 6(午), 丙(2) → 8(申), 丁(3) → 9(酉), 戊(4) → 8(申),
 * 己(5) → 9(酉), 庚(6) → 11(亥), 辛(7) → 0(子), 壬(8) → 2(寅), 癸(9) → 3(卯)
 * 
 * @param {number} stemIndex Heavenly stem index of the major cycle palace (0-9)
 * @returns {number} Palace index (0-11) where 大昌 is located
 */
function calculateMajorCycleWenChang(stemIndex) {
    const majorWenChangPalaces = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
    return majorWenChangPalaces[stemIndex % 10];
}

/**
 * Calculate Major Cycle Literary Craft (大限文曲 / 大曲)
 * Position based on the heavenly stem of the major cycle palace
 * 
 * Stem-to-Palace index mapping:
 * 甲(0) → 9(酉), 乙(1) → 8(申), 丙(2) → 6(午), 丁(3) → 5(巳), 戊(4) → 6(午),
 * 己(5) → 5(巳), 庚(6) → 3(卯), 辛(7) → 2(寅), 壬(8) → 0(子), 癸(9) → 11(亥)
 * 
 * @param {number} stemIndex Heavenly stem index of the major cycle palace (0-9)
 * @returns {number} Palace index (0-11) where 大曲 is located
 */
function calculateMajorCycleWenQu(stemIndex) {
    const majorWenQuPalaces = [9, 8, 6, 5, 6, 5, 3, 2, 0, 11];
    return majorWenQuPalaces[stemIndex % 10];
}

/**
 * Calculate Major Cycle Celestial Canopy (大限天魁 / 大魁)
 * Position based on the heavenly stem of the major cycle palace
 * 
 * Stem-to-Palace index mapping:
 * 甲(0) → 1(丑), 乙(1) → 0(子), 丙(2) → 11(亥), 丁(3) → 11(亥),
 * 戊(4) → 1(丑), 己(5) → 0(子), 庚(6) → 1(丑), 辛(7) → 6(午), 壬(8) → 3(卯), 癸(9) → 3(卯)
 * 
 * @param {number} stemIndex Heavenly stem index of the major cycle palace (0-9)
 * @returns {number} Palace index (0-11) where 大魁 is located
 */
function calculateMajorCycleCelestialCanopy(stemIndex) {
    const majorCelestialCanopyPalaces = [1, 0, 11, 11, 1, 0, 1, 6, 3, 3];
    return majorCelestialCanopyPalaces[stemIndex % 10];
}

/**
 * Calculate Major Cycle Celestial Seal (大限天鉞 / 大鉞)
 * Position based on the heavenly stem of the major cycle palace
 * 
 * Stem-to-Palace index mapping:
 * 甲(0) → 7(未), 乙(1) → 8(申), 丙(2) → 9(酉), 丁(3) → 9(酉),
 * 戊(4) → 7(未), 己(5) → 8(申), 庚(6) → 7(未), 辛(7) → 2(寅), 壬(8) → 5(巳), 癸(9) → 5(巳)
 * 
 * @param {number} stemIndex Heavenly stem index of the major cycle palace (0-9)
 * @returns {number} Palace index (0-11) where 大鉞 is located
 */
function calculateMajorCycleCelestialSeal(stemIndex) {
    const majorCelestialSealPalaces = [7, 8, 9, 9, 7, 8, 7, 2, 5, 5];
    return majorCelestialSealPalaces[stemIndex % 10];
}

/**
 * Calculate Major Cycle Prosperity (大限祿存 / 大祿)
 * Position based on the heavenly stem of the major cycle palace
 * 
 * Stem-to-Palace index mapping:
 * 甲(0) → 2(寅), 乙(1) → 3(卯), 丙(2) → 5(巳), 丁(3) → 6(午),
 * 戊(4) → 5(巳), 己(5) → 6(午), 庚(6) → 8(申), 辛(7) → 9(酉), 壬(8) → 11(亥), 癸(9) → 0(子)
 * 
 * @param {number} stemIndex Heavenly stem index of the major cycle palace (0-9)
 * @returns {number} Palace index (0-11) where 大祿 is located
 */
function calculateMajorCycleProsperity(stemIndex) {
    const majorProsperityPalaces = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
    return majorProsperityPalaces[stemIndex % 10];
}

/**
 * Calculate Major Cycle Positive Poison (大限擎羊 / 大羊) and Curved Trap (大限陀羅 / 大陀)
 * 大羊 = 大祿 + 1 (clockwise), 大陀 = 大祿 - 1 (counter-clockwise)
 * 
 * @param {number} stemIndex Heavenly stem index of the major cycle palace (0-9)
 * @returns {Object} { positivePoison: 0-11, curvedTrap: 0-11 }
 */
function calculateMajorCycleWealthStars(stemIndex) {
    const prosperity = calculateMajorCycleProsperity(stemIndex);
    
    return {
        positivePoison: (prosperity + 1) % 12,  // 大羊: Prosperity +1 clockwise
        curvedTrap: (prosperity - 1 + 12) % 12  // 大陀: Prosperity -1 counter-clockwise
    };
}

/**
 * Calculate Major Cycle Fire (大限火星 / 大火)
 * Position based on the earthly branch of the major cycle palace and birth time
 * 
 * Starting positions vary by major cycle branch group:
 * - 申子辰(8,0,4): starts at 寅(2), arranged by time clockwise
 * - 寅午戌(2,6,10): starts at 丑(1), arranged by time clockwise
 * - 巳酉丑(5,9,1): starts at 卯(3), arranged by time clockwise
 * - 亥卯未(11,3,7): starts at 酉(9), arranged by time clockwise
 * 
 * @param {number} timeIndex Birth time index (0-11, where 0 = 子時)
 * @param {number} majorCycleBranchIndex Earthly branch index of major cycle palace (0-11)
 * @returns {number} Palace index (0-11) where 大火 is located
 */
function calculateMajorCycleFire(timeIndex, majorCycleBranchIndex) {
    let startFire;
    
    // Determine starting position based on major cycle branch group
    if ([8, 0, 4].includes(majorCycleBranchIndex)) { // 申子辰
        startFire = 2; // 大火在寅宮排起
    } else if ([2, 6, 10].includes(majorCycleBranchIndex)) { // 寅午戌
        startFire = 1; // 大火在丑宮排起
    } else if ([5, 9, 1].includes(majorCycleBranchIndex)) { // 巳酉丑
        startFire = 3; // 大火在卯宮排起
    } else if ([11, 3, 7].includes(majorCycleBranchIndex)) { // 亥卯未
        startFire = 9; // 大火在酉宮排起
    } else {
        throw new Error('Invalid branch index for Major Cycle Fire calculation');
    }
    
    // Move clockwise by time index
    return (startFire + timeIndex) % 12;
}

/**
 * Calculate Major Cycle Bells (大限鈴星 / 大鈴)
 * Position based on the earthly branch of the major cycle palace and birth time
 * 
 * Starting positions vary by major cycle branch group:
 * - 申子辰(8,0,4): starts at 戌(10), arranged by time clockwise
 * - 寅午戌(2,6,10): starts at 卯(3), arranged by time clockwise
 * - 巳酉丑(5,9,1): starts at 戌(10), arranged by time clockwise
 * - 亥卯未(11,3,7): starts at 戌(10), arranged by time clockwise
 * 
 * @param {number} timeIndex Birth time index (0-11, where 0 = 子時)
 * @param {number} majorCycleBranchIndex Earthly branch index of major cycle palace (0-11)
 * @returns {number} Palace index (0-11) where 大鈴 is located
 */
function calculateMajorCycleBells(timeIndex, majorCycleBranchIndex) {
    let startBells;
    
    // Determine starting position based on major cycle branch group
    if ([8, 0, 4].includes(majorCycleBranchIndex)) { // 申子辰
        startBells = 10; // 大鈴在戌宮排起
    } else if ([2, 6, 10].includes(majorCycleBranchIndex)) { // 寅午戌
        startBells = 3; // 大鈴在卯宮排起
    } else if ([5, 9, 1].includes(majorCycleBranchIndex)) { // 巳酉丑
        startBells = 10; // 大鈴在戌宮排起
    } else if ([11, 3, 7].includes(majorCycleBranchIndex)) { // 亥卯未
        startBells = 10; // 大鈴在戌宮排起
    } else {
        throw new Error('Invalid branch index for Major Cycle Bells calculation');
    }
    
    // Move clockwise by time index
    return (startBells + timeIndex) % 12;
}

/**
 * Calculate Major Cycle Heavenly Horse (大限天馬 / 大馬)
 * Position based on the earthly branch of the major cycle palace
 * 
 * Stem-to-Palace index mapping (repeats every 4 branches):
 * 子(0) → 2(寅), 丑(1) → 11(亥), 寅(2) → 8(申), 卯(3) → 5(巳),
 * 辰(4) → 2(寅), 巳(5) → 11(亥), 午(6) → 8(申), 未(7) → 5(巳),
 * 申(8) → 2(寅), 酉(9) → 11(亥), 戌(10) → 8(申), 亥(11) → 5(巳)
 * 
 * @param {number} majorCycleBranchIndex Earthly branch index of major cycle palace (0-11)
 * @returns {number} Palace index (0-11) where 大馬 is located
 */
function calculateMajorCycleHeavenlyHorse(majorCycleBranchIndex) {
    const tianMaPattern = [2, 11, 8, 5];
    return tianMaPattern[majorCycleBranchIndex % 4];
}

/**
 * Calculate Major Cycle Red Luan (大限紅鸞 / 大鸞)
 * Position based on the earthly branch of the major cycle palace
 * Formula: (3 - branchIndex + 12) % 12
 * 
 * Branch-to-Palace index mapping:
 * 子(0) → 3(卯), 丑(1) → 2(寅), 寅(2) → 1(丑), 卯(3) → 0(子),
 * 辰(4) → 11(亥), 巳(5) → 10(戌), 午(6) → 9(酉), 未(7) → 8(申),
 * 申(8) → 7(未), 酉(9) → 6(午), 戌(10) → 5(巳), 亥(11) → 4(辰)
 * 
 * @param {number} majorCycleBranchIndex Earthly branch index of major cycle palace (0-11)
 * @returns {number} Palace index (0-11) where 大鸞 is located
 */
function calculateMajorCycleRedLuan(majorCycleBranchIndex) {
    return (3 - majorCycleBranchIndex + 12) % 12;
}

/**
 * Calculate Major Cycle Heavenly Joy (大限天喜 / 大喜)
 * Position based on the earthly branch of the major cycle palace
 * Formula: (9 - branchIndex + 12) % 12
 * 
 * Branch-to-Palace index mapping:
 * 子(0) → 9(酉), 丑(1) → 8(申), 寅(2) → 7(未), 卯(3) → 6(午),
 * 辰(4) → 5(巳), 巳(5) → 4(辰), 午(6) → 3(卯), 未(7) → 2(寅),
 * 申(8) → 1(丑), 酉(9) → 0(子), 戌(10) → 11(亥), 亥(11) → 10(戌)
 * 
 * @param {number} majorCycleBranchIndex Earthly branch index of major cycle palace (0-11)
 * @returns {number} Palace index (0-11) where 大喜 is located
 */
function calculateMajorCycleHeavenlyJoy(majorCycleBranchIndex) {
    return (9 - majorCycleBranchIndex + 12) % 12;
}

/**
 * Calculate all major cycle stars
 * Returns a map of star name to palace index
 * 
 * @param {number} majorCycleStemIndex Heavenly stem index of the major cycle palace (0-9)
 * @param {number} majorCycleBranchIndex Earthly branch index of the major cycle palace (0-11)
 * @param {number} timeIndex Birth time index (0-11, where 0 = 子時)
 * @returns {Object} Map of all major cycle stars to palace indices
 */
function calculateAllMajorCycleStars(majorCycleStemIndex, majorCycleBranchIndex, timeIndex) {
    const majorCycleStars = {};
    
    // Calculate 大昌 (Major Cycle Literary Talent)
    majorCycleStars['大昌'] = calculateMajorCycleWenChang(majorCycleStemIndex);
    
    // Calculate 大曲 (Major Cycle Literary Craft)
    majorCycleStars['大曲'] = calculateMajorCycleWenQu(majorCycleStemIndex);
    
    // Calculate 大魁 (Major Cycle Celestial Canopy - abbr. from 大限天魁)
    majorCycleStars['大魁'] = calculateMajorCycleCelestialCanopy(majorCycleStemIndex);
    
    // Calculate 大鉞 (Major Cycle Celestial Seal - abbr. from 大限天鉞)
    majorCycleStars['大鉞'] = calculateMajorCycleCelestialSeal(majorCycleStemIndex);
    
    // Calculate 大祿 (Major Cycle Prosperity)
    majorCycleStars['大祿'] = calculateMajorCycleProsperity(majorCycleStemIndex);
    
    // Calculate 大羊 and 大陀 (Major Cycle Positive Poison and Curved Trap)
    const wealthStars = calculateMajorCycleWealthStars(majorCycleStemIndex);
    majorCycleStars['大羊'] = wealthStars.positivePoison;
    majorCycleStars['大陀'] = wealthStars.curvedTrap;
    
    // Calculate 大火 (Major Cycle Fire) - requires branch and time
    if (majorCycleBranchIndex !== undefined && timeIndex !== undefined) {
        majorCycleStars['大火'] = calculateMajorCycleFire(timeIndex, majorCycleBranchIndex);
        
        // Calculate 大鈴 (Major Cycle Bells) - requires branch and time
        majorCycleStars['大鈴'] = calculateMajorCycleBells(timeIndex, majorCycleBranchIndex);
        
        // Calculate 大馬 (Major Cycle Heavenly Horse) - requires branch
        majorCycleStars['大馬'] = calculateMajorCycleHeavenlyHorse(majorCycleBranchIndex);
        
        // Calculate 大鸞 (Major Cycle Red Luan) - requires branch
        majorCycleStars['大鸞'] = calculateMajorCycleRedLuan(majorCycleBranchIndex);
        
        // Calculate 大喜 (Major Cycle Heavenly Joy) - requires branch
        majorCycleStars['大喜'] = calculateMajorCycleHeavenlyJoy(majorCycleBranchIndex);
    }
    
    return majorCycleStars;
}

/**
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

registerAdapterModule('majorCycleStars', {
    stemCharToIndex,
    calculateMajorCycleWenChang,
    calculateMajorCycleWenQu,
    calculateMajorCycleCelestialCanopy,
    calculateMajorCycleCelestialSeal,
    calculateMajorCycleProsperity,
    calculateMajorCycleWealthStars,
    calculateMajorCycleFire,
    calculateMajorCycleBells,
    calculateMajorCycleHeavenlyHorse,
    calculateMajorCycleRedLuan,
    calculateMajorCycleHeavenlyJoy,
    calculateAllMajorCycleStars
});
