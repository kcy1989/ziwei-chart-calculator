/**
 * Nayin (納音五行局) Loci Table
 * 
 * Based on the heavenly stem and earthly branch of Ming Palace (命宮)
 * Determines which of the 5 loci the person belongs to:
 * - 2: 水二局 (Water)
 * - 3: 木三局 (Wood)
 * - 4: 金四局 (Metal)
 * - 5: 土五局 (Earth)
 * - 6: 火六局 (Fire)
 * 
 * Table structure:
 * Heavenly stems grouped into 5 categories (甲乙, 丙丁, 戊己, 庚辛, 壬癸)
 * Earthly branches grouped into 6 categories (子丑, 寅卯, 辰巳, 午未, 申酉, 戌亥)
 * Total: 5 x 6 = 30 possibilities
 */

/**
 * Wuxing Loci Table - 6x5 Matrix Format
 * 
 * Rows: Earthly Branch Groups (地支)
 *   Row 0: 子丑 (indices 0-1)
 *   Row 1: 寅卯 (indices 2-3)
 *   Row 2: 辰巳 (indices 4-5)
 *   Row 3: 午未 (indices 6-7)
 *   Row 4: 申酉 (indices 8-9)
 *   Row 5: 戌亥 (indices 10-11)
 * 
 * Columns: Heavenly Stem Groups (天干)
 *   Col 0: 甲乙 (indices 0-1)
 *   Col 1: 丙丁 (indices 2-3)
 *   Col 2: 戊己 (indices 4-5)
 *   Col 3: 庚辛 (indices 6-7)
 *   Col 4: 壬癸 (indices 8-9)
 * 
 * Values: Loci numbers (2=水, 3=木, 4=金, 5=土, 6=火)
 */
const nayinMatrix = [
    //     甲乙  丙丁  戊己  庚辛  壬癸
    /*子丑*/ [4,   2,   6,   5,   3],
    /*寅卯*/ [2,   6,   5,   3,   4],
    /*辰巳*/ [6,   5,   3,   4,   2],
    /*午未*/ [4,   2,   6,   5,   3],
    /*申酉*/ [2,   6,   5,   3,   4],
    /*戌亥*/ [6,   5,   3,   4,   2],
];

/**
 * Convert matrix-based table to key-value object for compatibility
 */
const nayinTable = {};
for (let branchGroup = 0; branchGroup < 6; branchGroup++) {
    for (let stemGroup = 0; stemGroup < 5; stemGroup++) {
        const key = `${stemGroup},${branchGroup}`;
        nayinTable[key] = nayinMatrix[branchGroup][stemGroup];
    }
}

/**
 * Get the Nayin Loci number based on Ming Palace stem and branch
 * @param {number} stemIndex Heavenly stem index (0-9)
 * @param {number} branchIndex Earthly branch index (0-11)
 * @returns {number} Loci number (2, 3, 4, 5, or 6)
 */
function getNayin(stemIndex, branchIndex) {
    // Group stem into 5 categories
    const stemGroup = Math.floor(stemIndex / 2);  // 0-4
    
    // Group branch into 6 categories
    const branchGroup = Math.floor(branchIndex / 2);  // 0-5
    
    // Look up the loci from the table
    const key = `${stemGroup},${branchGroup}`;
    const loci = nayinTable[key];
    
    if (loci === undefined) {
        console.warn(`Nayin loci not found for stem ${stemIndex}, branch ${branchIndex} (key: ${key})`);
        return null;
    }
    
    return loci;
}

/**
 * Get the Nayin Loci name
 * @param {number} loci Loci number (2, 3, 4, 5, or 6)
 * @returns {string} Loci name
 */
function getNayinName(loci) {
    const names = {
        2: '水二局',
        3: '木三局',
        4: '金四局',
        5: '土五局',
        6: '火六局'
    };
    return names[loci] || '';
}

// Expose public API
window.ziweiNayin = {
    getNayin,
    getNayinName
};
