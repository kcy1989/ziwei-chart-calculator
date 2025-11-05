/**
 * Basic Ziwei Doushu Calculations
 * Handles month index transformation and leap month adjustments
 * Time index is generated in lunar-converter.js
 */

/**
 * Convert lunar month to month index (0-11)
 * 一月 = 0, 二月 = 1, ..., 十二月 = 11
 * Handles leap month adjustment based on lunar day
 * 
 * @param {number} month Lunar month (1-12)
 * @param {number} day Lunar day (1-30)
 * @param {boolean} isLeapMonth Whether this is a leap month
 * @returns {number} Month index (0-11)
 */
function getMonthIndex(month, day, isLeapMonth) {
    // Convert month (1-12) to month index (0-11)
    let monthIndex = month - 1;
    
    // Leap month adjustment rule:
    // - If day >= 15: month index = month (add 1)
    // - If day < 15: month index = month - 1 (no change)
    // - Only apply if it's actually a leap month
    
    if (isLeapMonth && day >= 15) {
        monthIndex = month;
        // Wrap around if exceeds 11
        if (monthIndex > 11) {
            monthIndex = monthIndex - 12;
        }
    }
    
    return monthIndex;
}

/**
 * Calculate basic indices from lunar date
 * Accepts lunar data from lunar-converter (which includes timeIndex 0-11)
 * and calculates monthIndex (0-11)
 * 
 * @param {Object} lunar Lunar date from lunar-converter { lunarMonth, lunarDay, timeIndex, isLeapMonth }
 * @returns {Object} Indices { monthIndex: 0-11, timeIndex: 0-11 }
 */
function getBasicIndices(lunar) {
    const month = lunar.lunarMonth || lunar.month;
    const day = lunar.lunarDay || lunar.day;
    const timeIndex = lunar.timeIndex;
    const isLeapMonth = lunar.isLeapMonth || lunar.isleap || false;
    
    if (!month || !day || timeIndex === undefined) {
        console.warn('Invalid lunar date for basic indices:', lunar);
        return { monthIndex: 0, timeIndex: 0 };
    }
    
    const monthIndex = getMonthIndex(month, day, isLeapMonth);
    
    return { monthIndex, timeIndex };
}

/**
 * Get the heavenly stem (天干) for a given lunar year
 * Formula: year % 10, where 0=甲, 1=乙, ..., 9=癸
 * 
 * @param {number} year Lunar year (e.g., 2024)
 * @returns {number} Stem index (0-9)
 */
function getHeavenlyStemIndex(year) {
    // Formula: (year - 4) % 10 gives the correct stem
    return (year - 4 + 10) % 10;
}

/**
 * Get the earthly branch (地支) for a given lunar year
 * Formula: year % 12, where 0=子, 1=丑, ..., 11=亥
 * 
 * @param {number} year Lunar year (e.g., 2024)
 * @returns {number} Branch index (0-11)
 */
function getEarthlyBranchIndex(year) {
    // Formula: (year - 4) % 12 gives the correct branch
    return (year - 4 + 12) % 12;
}

/**
 * Get the heavenly stem character for each palace position based on birth year
 * 五虎遁法 (Five Tiger Method) - Determine the starting stem at 寅宮 based on year stem
 * 
 * 口訣:
 * 甲己之年丙遁寅，乙庚之歲戊先行。
 * 丙辛還從庚上起，丁壬源自起於壬。
 * 戊癸之年寅遁甲，遁干化氣必逢生。
 * 
 * Translation: 
 * - 甲/己 year: 寅宮 starts with 丙 (index 2)
 * - 乙/庚 year: 寅宮 starts with 戊 (index 4)
 * - 丙/辛 year: 寅宮 starts with 庚 (index 6)
 * - 丁/壬 year: 寅宮 starts with 壬 (index 8)
 * - 戊/癸 year: 寅宮 starts with 甲 (index 0)
 * 
 * Then increment by 1 sequentially for each palace clockwise: 丙->丁->戊->己->庚->...->癸->甲->乙->丙
 * Palace indices cycle: 0(子)->1(丑)->2(寅)->...->11(亥)->0(子)...
 * 
 * @param {number} palaceIndex Palace index (0-11) where 0=子, 1=丑, 2=寅, etc.
 * @param {number} lunarYear Birth lunar year
 * @returns {Object} { stemIndex: 0-9, stem: character }
 */
function getPalaceStemByIndex(palaceIndex, lunarYear) {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const yearStemIndex = getHeavenlyStemIndex(lunarYear);
    const yinStartIndex = [2, 4, 6, 8, 0][yearStemIndex % 5];
    const offsetFromYin = (palaceIndex - 2 + 12) % 12;
    const stemIndex = (yinStartIndex + offsetFromYin) % 10;
    
    return {
        stemIndex: stemIndex,
        stem: stems[stemIndex]
    };
}

/**
 * Get the Master (命主) star based on birth year branch
 * 命主 determination by birth year earthly branch (地支)
 * Maps branch index (0-11) directly to corresponding star
 * 
 * 古訣:
 * 子屬貪狼丑巨門，寅戌生人屬祿存，
 * 卯酉屬文巳未武，辰申廉宿午破軍。
 * 
 * @param {number} lunarYear Birth lunar year
 * @returns {Object} { branchIndex: 0-11, starName: Chinese star name }
 */
function getMasterPalace(lunarYear) {
    const masterStars = ['貪狼', '巨門', '祿存', '文曲', '廉貞', '武曲', '破軍', '武曲', '廉貞', '文曲', '祿存', '巨門'];
    const branchIndex = getEarthlyBranchIndex(lunarYear);
    
    return {
        branchIndex: branchIndex,
        starName: masterStars[branchIndex],
        type: 'master'
    };
}

/**
 * Get the Body (身主) star based on birth year branch
 * 身主 determination by birth year earthly branch (地支)
 * Maps branch index (0-11) directly to corresponding star
 * 
 * 古訣:
 * 子午安身鈴火宿，丑未天相寅申梁，
 * 卯酉天同身主是，巳亥天機辰戌昌。
 * 
 * @param {number} lunarYear Birth lunar year
 * @returns {Object} { branchIndex: 0-11, starName: Chinese star name }
 */
function getBodyPalace(lunarYear) {
    const bodyStars = ['火星', '天相', '天梁', '天同', '文昌', '天機', '火星', '天相', '天梁', '天同', '文昌', '天機'];
    const branchIndex = getEarthlyBranchIndex(lunarYear);
    
    return {
        branchIndex: branchIndex,
        starName: bodyStars[branchIndex],
        type: 'body'
    };
}

/**
 * Determine if arrangement is clockwise based on gender and lunar year
 * Used for twelve life stages (十二長生) and major cycles (大運) arrangement
 * 
 * Rule: 陽男及陰女順時針排，陰男及陽女逆時針排
 * - Yang male (陽男) or Yin female (陰女): clockwise
 * - Yin male (陰男) or Yang female (陽女): counter-clockwise
 * 
 * @param {string} gender Birth gender ('M' for male, 'F' for female)
 * @param {number} lunarYear Birth lunar year
 * @returns {boolean} true for clockwise, false for counter-clockwise
 */
function isClockwise(gender, lunarYear) {
    const branchIndex = getEarthlyBranchIndex(lunarYear);
    const isYang = branchIndex % 2 === 0;  // Even = Yang, Odd = Yin
    
    // Clockwise: Yang male (陽男) or Yin female (陰女)
    return (gender === 'M' && isYang) || (gender === 'F' && !isYang);
}

// Expose public API
window.ziweiBasic = {
    getMonthIndex,
    getBasicIndices,
    getHeavenlyStemIndex,
    getEarthlyBranchIndex,
    getPalaceStemByIndex,
    getMasterPalace,
    getBodyPalace,
    isClockwise
};
