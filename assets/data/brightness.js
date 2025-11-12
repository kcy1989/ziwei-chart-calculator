'use strict';

/**
 * Star Brightness Database (星曜亮度表) - Multiple Schools Support
 * 
 * Brightness Levels:
 * 廟 (Excellent) | 旺 (Strong) | 利 (Good) | 平 (Neutral) | 陷 (Fallen)
 * 
 * Organization:
 * - Each school has its own complete brightness table
 * - Currently supported: 斗數全書 (Doushu Quanquan - Complete Scripture)
 * - Future support: 大地派 (Dadi School), 台灣派 (Taiwan School), etc.
 * 
 * Dependencies: None
 * Exports: window.BrightnessDatabase (main interface)
 *          window.BrightnessShuoshu (斗數全書 table)
 */

(function() {
    // ============================================================================
    // Earthly Branches Reference (地支參考)
    // ============================================================================
    const BRANCHES = (window.ziweiConstants && window.ziweiConstants.BRANCH_NAMES) ||
                     ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    // ============================================================================
    // Brightness Lookup Tables (亮度查表)
    // Format: starName: [brightness at branch 0, brightness at branch 1, ..., brightness at branch 11]
    // Order: Follows primary.js → secondary.js calculation sequence
    // ============================================================================
    
    // ========================================================================
    // 斗數全書 - Doushu Quanquan (Complete Scripture)
    // Brightness table based on methods documented in "紫微斗數全書"
    // ========================================================================
    const brightnessTableShuoshu = {
        // ========================================================================
        // 紫微系主星
        // ========================================================================
        '紫微': ['平', '廟', '廟', '旺', '陷', '旺', '廟', '廟', '旺', '平', '閒', '旺'],
        '天機': ['廟', '陷', '地', '旺', '利', '平', '廟', '陷', '地', '旺', '利', '平'],
        '太陽': ['陷', '失', '旺', '廟', '旺', '旺', '旺', '地', '地', '平', '失', '陷'],
        '武曲': ['旺', '廟', '地', '利', '廟', '平', '旺', '廟', '地', '利', '廟', '平'],
        '天同': ['旺', '失', '利', '平', '平', '廟', '陷', '失', '旺', '平', '平', '廟'],
        '廉貞': ['平', '利', '廟', '平', '利', '陷', '平', '利', '廟', '平', '利', '陷'],
        
        // ========================================================================
        // 天府系主星
        // ========================================================================
        '天府': ['廟', '廟', '廟', '地', '廟', '地', '旺', '廟', '地', '旺', '廟', '地'],
        '太陰': ['廟', '廟', '旺', '陷', '陷', '陷', '失', '失', '利', '旺', '旺', '廟'],
        '貪狼': ['旺', '廟', '平', '利', '廟', '陷', '旺', '廟', '平', '利', '廟', '陷'],
        '巨門': ['旺', '失', '廟', '廟', '陷', '旺', '旺', '失', '廟', '廟', '陷', '旺'],
        '天相': ['廟', '廟', '廟', '陷', '地', '地', '廟', '廟', '廟', '陷', '地', '地'],
        '天梁': ['廟', '旺', '廟', '廟', '廟', '陷', '廟', '旺', '陷', '地', '廟', '陷'],
        '七殺': ['旺', '廟', '廟', '旺', '廟', '平', '旺', '廟', '廟', '旺', '廟', '平'],
        '破軍': ['廟', '旺', '地', '陷', '旺', '平', '廟', '旺', '地', '陷', '旺', '平'],

                
        // ========================================================================
        // 輔星
        // ========================================================================
        '天魁': ['旺', '旺', '-', '廟', '-', '-', '廟', '-', '-', '-', '-', '旺'],
        '天鉞': ['-', '-', '旺', '-', '-', '旺', '-', '旺', '廟', '廟', '-', '-'],
        '左輔': ['旺', '廟', '廟', '陷', '廟', '平', '旺', '廟', '平', '陷', '廟', '閒'],
        '右弼': ['廟', '廟', '旺', '陷', '廟', '平', '旺', '廟', '閒', '陷', '廟', '平'],
        '文昌': ['地', '廟', '陷', '利', '地', '廟', '陷', '利', '地', '廟', '陷', '利'],
        '文曲': ['地', '廟', '平', '旺', '地', '廟', '陷', '旺', '地', '廟', '陷', '旺'],
        '火星': ['陷', '地', '廟', '利', '陷', '地', '廟', '利', '陷', '地', '廟', '利'],
        '鈴星': ['陷', '地', '廟', '利', '陷', '地', '廟', '利', '陷', '地', '廟', '利'],
        '祿存': ['廟', '-', '廟', '廟', '-', '廟', '廟', '-', '廟', '廟', '-', '廟'],
        '擎羊': ['陷', '廟', '-', '陷', '廟', '-', '平', '廟', '-', '陷', '廟', '-'],
        '陀羅': ['-', '廟', '陷', '-', '廟', '陷', '-', '廟', '陷', '-', '廟', '陷'],
        '地空': ['平', '陷', '陷', '平', '陷', '廟', '廟', '平', '廟', '廟', '陷', '陷'],
        '地劫': ['陷', '陷', '平', '平', '陷', '閒', '廟', '平', '廟', '平', '平', '旺'],
    };
    
    // ============================================================================
    // Brightness Database Interface
    // ============================================================================
    
    /**
     * Create a brightness database interface for a school
     * @param {Object} tableData The brightness table for the school
     * @returns {Object} Database interface
     */
    function createBrightnessDatabase(tableData) {
        return {
            /**
             * Get brightness for a star at a specific Earthly Branch
             * @param {string} starName - Name of the star
             * @param {number} branchIndex - Index of Earthly Branch (0-11)
             * @returns {string} Brightness level (廟|旺|利|平|陷) or empty string if not found
             */
            getBrightness(starName, branchIndex) {
                const brightnesses = tableData[starName];
                if (!brightnesses || branchIndex < 0 || branchIndex > 11) {
                    return '';
                }
                return brightnesses[branchIndex] || '';
            },

            /**
             * Get all brightness values for a star across all 12 branches
             * @param {string} starName - Name of the star
             * @returns {Array<string>} Array of brightness levels for branches 0-11
             */
            getBrightnessForAllBranches(starName) {
                return tableData[starName] || [];
            },

            /**
             * Get the complete brightness table
             * @returns {Object} Complete brightness lookup table
             */
            getAllBrightness() {
                return tableData;
            },

            /**
             * Get the Earthly Branch name from index
             * @param {number} branchIndex - Index (0-11)
             * @returns {string} Branch name (子|丑|寅|...)
             */
            getBranchName(branchIndex) {
                return BRANCHES[branchIndex] || '';
            },

            /**
             * Check if a star exists in the database
             * @param {string} starName - Name of the star
             * @returns {boolean} True if star exists
             */
            hasStar(starName) {
                return starName in tableData;
            },

            /**
             * Get all available star names
             * @returns {Array<string>} Array of star names
             */
            getAllStarNames() {
                return Object.keys(tableData);
            }
        };
    }
    
    // ============================================================================
    // Public API - School-specific databases
    // ============================================================================
    
    // 斗數全書 (Doushu Quanquan - methods from Complete Scripture)
    window.BrightnessShuoshu = createBrightnessDatabase(brightnessTableShuoshu);
    
    // ============================================================================
    // Main Database Interface with School Selection
    // ============================================================================
    window.BrightnessDatabase = {
        /**
         * Get brightness database for a specific school
         * @param {string} school - School name ('shuoshu' | '斗數全書')
         * @returns {Object} Brightness database interface
         */
        getDatabase(school = 'shuoshu') {
            const schoolMap = {
                'shuoshu': window.BrightnessShuoshu,
                '斗數全書': window.BrightnessShuoshu,
                'default': window.BrightnessShuoshu
            };
            return schoolMap[school] || schoolMap['default'];
        },

        /**
         * Get brightness for a star at a specific branch
         * @param {string} starName - Star name
         * @param {number} branchIndex - Branch index (0-11)
         * @param {string} school - School name
         * @returns {string} Brightness level or empty string
         */
        getBrightness(starName, branchIndex, school = 'shuoshu') {
            const database = this.getDatabase(school);
            return database.getBrightness(starName, branchIndex);
        },

        /**
         * Get list of supported schools
         * @returns {Array<string>} School names
         */
        getSupportedSchools() {
            return ['shuoshu'];  // Will add more: 'dadi', 'taiwan', etc.
        }
    };

    if (window.ziweiCalData?.env?.isDebug) {
        console.log('[BrightnessDatabase] Module loaded with schools:', window.BrightnessDatabase.getSupportedSchools());
        console.log('[BrightnessShuoshu] Loaded with', Object.keys(brightnessTableShuoshu).length, 'stars');
    }
})();
