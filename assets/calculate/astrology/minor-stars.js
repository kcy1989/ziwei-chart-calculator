'use strict';

/**
 * Minor Stars (雜曜) Calculation Module
 * 
 * This module calculates positions of minor/miscellaneous stars in Ziwei Doushu.
 * Note: Current formulas are placeholders for testing display effects.
 * These will be updated with accurate astrological calculations later.
 * 
 * @module MinorStars
 */

/**
 * Helper to get adapter module
 */
function getAdapterModule(name) {
    var adapter = window.ziweiAdapter;
    return adapter && adapter.getModule ? adapter.getModule(name) : null;
}

/**
 * Calculate positions of all minor stars.
 * 
 * @param {number} monthIndex - Lunar month index (0-11, 0 = 正月)
 * @param {number} timeIndex - Military hour index (0-11, 0 = 子時)
 * @param {number} yearBranchIndex - Year's earthly branch index (0-11)
 * @param {number} dayBranchIndex - Day's earthly branch index (0-11)
 * @param {number} yearStemIndex - Year's heavenly stem index (0-9, 0 = 甲)
 * @param {number} mingPalaceIndex - Ming Palace (命宮) position index (0-11)
 * @param {number} shenPalaceIndex - Shen Palace (身宮) position index (0-11)
 * @param {string} gender - Birth gender ('M' for male, 'F' for female)
 * @param {number} lunarYear - Birth lunar year for calculating clockwise/counterclockwise
 * @param {number} migrationPalaceIndex - Migration Palace (遷移宮) position index (0-11)
 * @param {number} literaryCraftIndex - Literary Craft (文曲) position index (0-11) from secondary stars
 * @param {number} leftAssistantIndex - Left Assistant (左輔) position index (0-11) from secondary stars
 * @param {number} rightAssistIndex - Right Assist (右弼) position index (0-11) from secondary stars
 * @param {number} literaryTalentIndex - Literary Talent (文昌) position index (0-11) from secondary stars
 * @param {number} lunarDay - Birth lunar day (1-30) for Three Terraces and Eight Thrones calculation
 * @param {string} woundedServantHandling - Handling method: 'zhongzhou' (default) or 'noDistinction'
 * @returns {Object} Object mapping star names to palace indices (or arrays for stars appearing in multiple palaces)
 * 
 * @example
 * const minorStars = calculateMinorStars(2, 4, 3, 7, 0, 3, 9, 'M', 2024, 5, 8, 7, 1, 10, 15, 'zhongzhou');
 * // Returns: { '天官': 7, ..., '恩光': 6, '天貴': 11 }
 */
function calculateMinorStars(
    monthIndex,
    timeIndex,
    yearBranchIndex,
    dayBranchIndex,
    yearStemIndex,
    mingPalaceIndex,
    shenPalaceIndex,
    gender,
    lunarYear,
    migrationPalaceIndex,
    literaryCraftIndex,
    leftAssistantIndex,
    rightAssistIndex,
    literaryTalentIndex,
    lunarDay,
    woundedServantHandling
) {
    // Calculation started (inputs are intentionally not logged to reduce console noise)

    const minorStars = {};

    // 天官 (Heavenly Official) - based on year stem
    // 甲至癸年 (stem 0-9): 7,4,5,2,3,9,11,9,10,6
    const tianGuanPositions = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6];
    minorStars['天官'] = tianGuanPositions[yearStemIndex];

    // 天福 (Heavenly Blessing) - based on year stem
    // 甲至癸年 (stem 0-9): 9,8,0,11,3,2,6,5,6,5
    const tianFuPositions = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5];
    minorStars['天福'] = tianFuPositions[yearStemIndex];

    // 天廚 (Heavenly Kitchen) - based on year stem
    // 甲至癸年 (stem 0-9): 5,6,0,5,6,8,2,6,9,11
    const tianChuPositions = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11];
    minorStars['天廚'] = tianChuPositions[yearStemIndex];

    // 截空/副截 (Cut Void and Deputy Cut) - appears in TWO palaces, based on year stem
    // Pattern analysis:
    // 甲(0): 8,9   乙(1): 6,7   丙(2): 4,5   丁(3): 2,3   戊(4): 0,1
    // 己(5): 8,9   庚(6): 6,7   辛(7): 4,5   壬(8): 2,3   癸(9): 0,1
    // Pattern: stem % 5 determines the pair, each pair decreases by 2
    // Formula: first = (8 - (stem % 5) * 2) % 12, second = (first + 1) % 12
    const jieKongBase = (8 - (yearStemIndex % 5) * 2 + 12) % 12;
    const jieKongSecond = (jieKongBase + 1) % 12;

    // Primary/deputy parity rule applied below.
    // - If the palace branch (地支) for a position and the birth year's branch are both
    //   陰 or both 陽, that palace keeps the primary name; otherwise it is labeled as the deputy.
    const isYang = (idx) => (idx % 2) === 0; // true for 陽, false for 陰
    const yearYang = isYang(yearBranchIndex);
    const firstIsMatch = isYang(jieKongBase) === yearYang;

    if (firstIsMatch) {
        minorStars['截空'] = jieKongBase;
        minorStars['副截'] = jieKongSecond;
    } else {
        minorStars['截空'] = jieKongSecond;
        minorStars['副截'] = jieKongBase;
    }

    // 旬空 (Xun Void) - appears in TWO palaces, based on year stem and branch
    // Formula:
    // 1. Calculate steps: 11 - yearStemIndex (癸 is 9, so 11 - stem = steps from stem to 癸)
    // 2. Add steps to yearBranchIndex, then +1 and +2 are the two Xun Void positions
    // Example: 戊午年 (stem=4, branch=6): steps = 11-4 = 7, 6+7 = 13 % 12 = 1 (丑), so 旬空 at (1+1)%12=2 and (1+2)%12=3
    // Wait, let me re-read: 戊午年，步數是癸減戊=5步，午(6)+5=11(亥)，亥之後是子(0)和丑(1)
    // So: steps = (9 - yearStemIndex), base = (yearBranchIndex + steps) % 12, then +1 and +2
    const xunKongSteps = 9 - yearStemIndex;  // Steps from current stem to 癸 (index 9)
    const xunKongBase = (yearBranchIndex + xunKongSteps) % 12;  // Base position
    const xunKongFirst = (xunKongBase + 1) % 12;  // First Xun Void position (next palace)
    const xunKongSecond = (xunKongBase + 2) % 12;  // Second Xun Void position (palace after that)

    // Apply the parity rule above to select primary 旬空 / deputy 副旬.
    const firstXunMatch = isYang(xunKongFirst) === yearYang;
    if (firstXunMatch) {
        minorStars['旬空'] = xunKongFirst;
        minorStars['副旬'] = xunKongSecond;
    } else {
        minorStars['旬空'] = xunKongSecond;
        minorStars['副旬'] = xunKongFirst;
    }
    
    // xunKong positions computed (debug logging removed)

    // 天馬 (Heavenly Horse) - based on year branch
    // Pattern: 子至亥 (0-11): 2,11,8,5,2,11,8,5,2,11,8,5 (repeats every 4, decreasing by 3 mod 12)
    // Formula: cycles through [2, 11, 8, 5]
    const tianMaPattern = [2, 11, 8, 5];
    minorStars['天馬'] = tianMaPattern[yearBranchIndex % 4];

    // 天空 (Sky Void) - based on year branch
    // 子年是丑宮(1)，順時針排，亥年是子宮(0)
    // Formula: (yearBranchIndex + 1) % 12
    minorStars['天空'] = (yearBranchIndex + 1) % 12;

    // 天哭 (Heavenly Cry) - based on year branch
    // 從午宮起，子年在午宮，逆時針排
    // Formula: (6 - yearBranchIndex + 12) % 12
    minorStars['天哭'] = (6 - yearBranchIndex + 12) % 12;

    // 天虛 (Heavenly Void) - based on year branch
    // 從午宮起，子年在午宮，順時針排
    // Formula: (6 + yearBranchIndex) % 12
    minorStars['天虛'] = (6 + yearBranchIndex) % 12;

    // 紅鸞 (Red Phoenix) - based on year branch
    // 子年在卯宮(3)，逆時針排
    // Formula: (3 - yearBranchIndex + 12) % 12
    minorStars['紅鸞'] = (3 - yearBranchIndex + 12) % 12;

    // 天喜 (Heavenly Joy) - based on year branch
    // 子年在酉宮(9)，逆時針排（與紅鸞相差6）
    // Formula: (9 - yearBranchIndex + 12) % 12
    minorStars['天喜'] = (9 - yearBranchIndex + 12) % 12;

    // 孤辰 (Lonely Star) - based on year branch
    // Pattern: 子至亥: 2,2,5,5,5,8,8,8,11,11,11,2
    // Group pattern: 亥子丑→2, 寅卯辰→5, 巳午未→8, 申酉戌→11
    const guChenPattern = [2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11, 2];
    minorStars['孤辰'] = guChenPattern[yearBranchIndex];

    // 寡宿 (Widow Star) - based on year branch
    // Pattern: 子至亥: 10,10,1,1,1,4,4,4,7,7,7,10
    // Group pattern: 亥子丑→10, 寅卯辰→1, 巳午未→4, 申酉戌→7
    const guaSuPattern = [10, 10, 1, 1, 1, 4, 4, 4, 7, 7, 7, 10];
    minorStars['寡宿'] = guaSuPattern[yearBranchIndex];

    // 劫殺 (Robbery Strike) - based on year branch
    // Pattern: 子至亥: 5,2,11,8,5,2,11,8,5,2,11,8 (repeats every 4)
    const jieShaPattern = [5, 2, 11, 8];
    minorStars['劫殺'] = jieShaPattern[yearBranchIndex % 4];

    // 大耗 (Great Expenditure) - based on year branch
    // Pattern: 子至亥: 7,6,9,8,11,10,1,0,3,2,5,4
    const daHaoPattern = [7, 6, 9, 8, 11, 10, 1, 0, 3, 2, 5, 4];
    minorStars['大耗'] = daHaoPattern[yearBranchIndex];

    // 蜚廉 (Flying Swallow) - based on year branch
    // Pattern: 子至亥: 8,9,10,5,6,7,2,3,4,11,0,1
    const feiLianPattern = [8 ,9 ,10 ,5 ,6 ,7 ,2 ,3 ,4 ,11 ,0 ,1];
    minorStars['蜚廉'] = feiLianPattern[yearBranchIndex];

    // 破碎 (Shatter) - based on year branch
    // Pattern: 子至亥: 5,1,9,5,1,9,5,1,9,5,1,9 (repeats every 3)
    const poSuiPattern = [5, 1, 9];
    minorStars['破碎'] = poSuiPattern[yearBranchIndex % 3];

    // 華蓋 (Flower Canopy) - based on year branch
    // Pattern: 子至亥: 4,1,10,7,4,1,10,7,4,1,10,7 (repeats every 4)
    const huaGaiPattern = [4, 1, 10, 7];
    minorStars['華蓋'] = huaGaiPattern[yearBranchIndex % 4];

    // 咸池 (Salt Pond) - based on year branch
    // Pattern: 子至亥: 9,6,3,0,9,6,3,0,9,6,3,0 (repeats every 4)
    const xianChiPattern = [9, 6, 3, 0];
    minorStars['咸池'] = xianChiPattern[yearBranchIndex % 4];

    // 龍德 (Dragon Virtue) - based on year branch
    // 子年在未宮(7)，順時針排
    // Formula: (7 + yearBranchIndex) % 12
    minorStars['龍德'] = (7 + yearBranchIndex) % 12;

    // 月德 (Moon Virtue) - based on year branch
    // 子年在巳宮(5)，順時針排
    // Formula: (5 + yearBranchIndex) % 12
    minorStars['月德'] = (5 + yearBranchIndex) % 12;

    // 天德 (Heavenly Virtue) - based on year branch
    // 子年在酉宮(9)，順時針排
    // Formula: (9 + yearBranchIndex) % 12
    minorStars['天德'] = (9 + yearBranchIndex) % 12;

    // 年解 (Year Release) - based on year branch
    // 子年在戌宮(10)，逆時針排
    // Formula: (10 - yearBranchIndex + 12) % 12
    minorStars['年解'] = (10 - yearBranchIndex + 12) % 12;

    // 天才 (Heavenly Talent) - from Ming Palace clockwise
    // Based on mingPalaceIndex, count forward
    // Formula: (mingPalaceIndex + yearBranchIndex) % 12
    // Explanation: offset the Ming Palace by the year's earthly-branch index (rotate clockwise by yearBranchIndex)
    minorStars['天才'] = (mingPalaceIndex + yearBranchIndex) % 12;

    // 天壽 (Heavenly Longevity) - from both Ming and Shen Palace clockwise
    // Based on average of both, typically from Shen Palace
    // Formula: (shenPalaceIndex + yearBranchIndex) % 12
    // Explanation: offset the Shen Palace by the year's earthly-branch index (rotate clockwise by yearBranchIndex)
    minorStars['天壽'] = (shenPalaceIndex + yearBranchIndex) % 12;

    // 龍池 (Dragon Pool) - based on year branch
    // 子年在辰宮(4)，順時針排
    // Formula: (4 + yearBranchIndex) % 12
    minorStars['龍池'] = (4 + yearBranchIndex) % 12;

    // 鳳閣 (Phoenix Pavilion) - based on year branch
    // 子年在戌宮(10)，逆時針排
    // Formula: (10 - yearBranchIndex + 12) % 12
    minorStars['鳳閣'] = (10 - yearBranchIndex + 12) % 12;

    // 天刑 (Heavenly Law) - based on lunar month
    // 正月在酉宮(9)，順時針排
    // Formula: (9 + monthIndex) % 12
    minorStars['天刑'] = (9 + monthIndex) % 12;

    // 天姚 (Heavenly Beauty) - based on lunar month
    // 正月在丑宮(1)，順時針排，等於天刑+4的位置
    // Formula: (1 + monthIndex) % 12 or equivalently (9 + monthIndex + 4) % 12
    minorStars['天姚'] = (1 + monthIndex) % 12;

    // 解神 (Resolution Deity) - based on lunar month
    // Pattern 一月至十二月: 8,8,10,10,0,0,2,2,4,4,6,6
    // Repeats every 2 months with +2 increment each pair
    // Formula: (8 + Math.floor(monthIndex / 2) * 2) % 12
    minorStars['解神'] = (8 + Math.floor(monthIndex / 2) * 2) % 12;

    // 天巫 (Heavenly Shaman) - based on lunar month
    // Pattern 一月至十二月: 5,8,2,11,5,8,2,11,5,8,2,11
    // Repeats every 4 months
    const tianWuPattern = [5, 8, 2, 11];
    minorStars['天巫'] = tianWuPattern[monthIndex % 4];

    // 天月 (Heavenly Moon) - based on lunar month
    // Pattern 一月至十二月: 10,5,4,2,7,3,11,7,2,6,10,2
    // No obvious algorithmic pattern - use lookup table
    const tianYuePositions = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2];
    minorStars['天月'] = tianYuePositions[monthIndex];

    // 陰煞 (Dark Strike) - based on lunar month
    // Pattern 一月至十二月: 2,0,10,8,6,4,2,0,10,8,6,4
    // Repeats every 6 months, decrements by 2 each step
    // Formula: (2 - (monthIndex % 6) * 2 + 12) % 12
    minorStars['陰煞'] = (2 - (monthIndex % 6) * 2 + 12) % 12;

    // Determine clockwise/counterclockwise based on gender and lunar year
    // 陽男及陰女順時針排，陰男及陽女逆時針排
    var basicModule = getAdapterModule('basic');
    if (!basicModule || typeof basicModule.isClockwise !== 'function') {
        console.error('Basic module not available for isClockwise calculation');
        throw new Error('基礎模組無法取得');
    }
    const clockwise = basicModule.isClockwise(gender, lunarYear);
    const offset = clockwise ? -1 : 1;
    
    // 天傷 (Heavenly Injury) and 天使 (Heavenly Blessing Star)
    // IMPORTANT: These stars MUST be calculated using migrationPalaceIndex
    // Validation: if migrationPalaceIndex is null/undefined, throw error
    // NO fallback options allowed - must fail loudly rather than display incorrect chart
    
    if (migrationPalaceIndex === null || migrationPalaceIndex === undefined) {
        throw new Error('遷移宮位置無法確定，無法計算天傷和天使位置。天傷和天使的計算必須依賴遷移宮。');
    }
    
    // Two handling methods:
    // 1. 'zhongzhou' (中州排法 - default): Based on gender/year, uses offset
    //    - 陽男陰女 (clockwise): 天傷 at 交友宮 (遷移-1), 天使 at 疾厄宮 (遷移+1)
    //    - 陰男陽女 (counter-clockwise): 天傷 at 疾厄宮 (遷移+1), 天使 at 交友宮 (遷移-1)
    // 2. 'noDistinction' (不分陰陽): Ignore gender, always fixed positions relative to 遷移
    //    - 天傷 always at 遷移 - 1 (交友宮)
    //    - 天使 always at 遷移 + 1 (疾厄宮)
    
    if (woundedServantHandling === 'noDistinction') {
        // 不分陰陽: Fixed offset from 遷移 (交友=遷移-1, 疾厄=遷移+1)
        minorStars['天傷'] = (migrationPalaceIndex - 1 + 12) % 12;  // 交友宮 (always)
        minorStars['天使'] = (migrationPalaceIndex + 1) % 12;      // 疾厄宮 (always)
    } else {
        // 'zhongzhou' (default): Depends on gender via offset
        // 陽男陰女: 遷移宮 - 1 = 交友宮, 遷移宮 + 1 = 疾厄宮
        // 陰男陽女: 遷移宮 + 1 = 疾厄宮, 遷移宮 - 1 = 交友宮
        minorStars['天傷'] = (migrationPalaceIndex + offset + 12) % 12;
        minorStars['天使'] = (migrationPalaceIndex - offset + 12) % 12;
    }

    // 台輔 (Terrace Deputy) - based on Literary Craft (文曲) position
    // Formula: 文曲 + 2
    minorStars['台輔'] = (literaryCraftIndex + 2) % 12;

    // 封誥 (Seal Edict) - based on Literary Craft (文曲) position
    // Formula: 文曲 - 2
    minorStars['封誥'] = (literaryCraftIndex - 2 + 12) % 12;

    // 三台 (Three Terraces) - based on Left Assistant (左輔) and birth lunar day
    // Initial position: Left Assistant
    // Then move forward (clockwise) by (lunarDay - 1) positions
    // Formula: (leftAssistantIndex + (lunarDay - 1)) % 12
    minorStars['三台'] = (leftAssistantIndex + (lunarDay - 1)) % 12;

    // 八座 (Eight Thrones) - based on Right Assist (右弼) and birth lunar day
    // Initial position: Right Assist
    // Then move backward (counter-clockwise) by (lunarDay - 1) positions
    // Formula: (rightAssistIndex - (lunarDay - 1) + 36) % 12 (add 36 to ensure positive result)
    minorStars['八座'] = (rightAssistIndex - (lunarDay - 1) + 36) % 12;

    // 恩光 (Grace) - based on Literary Talent (文昌) and birth lunar day
    // Formula: (文昌 + lunarDay - 2 + 12) % 12
    minorStars['恩光'] = (literaryTalentIndex + lunarDay - 2 + 12) % 12;

    // 天貴 (Heavenly Nobility) - based on Literary Craft (文曲) and birth lunar day
    // Formula: (文曲 + lunarDay - 2 + 12) % 12
    minorStars['天貴'] = (literaryCraftIndex + lunarDay - 2 + 12) % 12;

    // minor stars calculated; result returned (logging removed)

    return minorStars;
}

// Cache for memoization
const minorStarsCache = new Map();
minorStarsCache.clear = minorStarsCache.clear || function() { this.clear(); }; // Ensure clear method

// Memoized wrapper
const memoizedCalculateMinorStars = (...args) => {
    const key = args.join(',');
    if (minorStarsCache.has(key)) {
        return minorStarsCache.get(key);
    }
    const result = calculateMinorStars(...args);
    if (minorStarsCache.size >= 100) {
        // Simple LRU: remove oldest (first entry)
        const firstKey = minorStarsCache.keys().next().value;
        minorStarsCache.delete(firstKey);
    }
    minorStarsCache.set(key, result);
    return result;
};

// Override original with memoized version
window.calculateMinorStarsMemoized = memoizedCalculateMinorStars;

/**
 * registerAdapterModule centralized in assets/js/adapter-register.js
 */

// Expose public API through centralized adapter registration (assets/js/adapter-register.js)
window.registerAdapterModule('minorStars', {
    calculateMinorStars
});
