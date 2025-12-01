'use strict';

/**
 * Global Constants Module
 * Centralized management of magic numbers, repeated definitions, regex patterns
 * 
 * Dependencies: None (loads before all other JS modules)
 * Exports: window.ziweiConstants
 */

(function() {
    // ============================================================================
    // 1. Regular Expressions
    // ============================================================================
    const REGEX = Object.freeze({
        DATE: /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
        TIME: /^([01]\d|2[0-3]):([0-5]\d)$/,   // HH:MM (00:00 - 23:59)
        YEAR: /^\d{4}$/,                       // YYYY
        MONTH: /^(0?[1-9]|1[0-2])$/,           // 1-12
        DAY: /^(0?[1-9]|[12]\d|3[01])$/,       // 1-31
        HOUR: /^([01]?\d|2[0-3])$/,            // 0-23
        MINUTE: /^[0-5]?\d$/                   // 0-59
    });

    // ============================================================================
    // 2. Grid & Palace Mappings
    // ============================================================================
    
    /**
     * 4x4 Grid branch index mapping for Ziwei chart
     * Layout:
     *   巳(5)  午(6)  未(7)  申(8)
     *   辰(4)    X      X    酉(9)
     *   卯(3)    X      X    戌(10)
     *   寅(2)   丑(1)   子(0)   亥(11)
     */
    const GRID_BRANCH_MAP = Object.freeze([
        [5, 6, 7, 8],      // Row 1: 巳午未申
        [4, -1, -1, 9],    // Row 2: 辰..酉
        [3, -1, -1, 10],   // Row 3: 卯..戌
        [2, 1, 0, 11]      // Row 4: 寅丑子亥
    ]);

    /**
     * Three-direction Four-square (三方四正) mapping
     * For each palace index (0-11), calculate all 4 related palaces:
     * - Self (i)
     * - Opposition (對宮): (i + 6) % 12
     * - First Trine (第一三合): (i + 4) % 12
     * - Second Trine (第二三合): (i + 8) % 12
     */
    const TRI_SQUARE_MAP = Object.freeze(
        Array.from({ length: 12 }, (_, i) => ({
            self: i,
            opposition: (i + 6) % 12,
            trine1: (i + 4) % 12,
            trine2: (i + 8) % 12
        }))
    );

    // ============================================================================
    // 3. Branch Names
    // ============================================================================
    const BRANCH_NAMES = Object.freeze([
        '子', '丑', '寅', '卯', '辰', '巳',
        '午', '未', '申', '酉', '戌', '亥'
    ]);

    // ============================================================================
    // 4. Heavenly Stems
    // ============================================================================
    const STEM_NAMES = Object.freeze([
        '甲', '乙', '丙', '丁', '戊', '己',
        '庚', '辛', '壬', '癸'
    ]);

    // ============================================================================
    // 5. Performance Configuration
    // ============================================================================
    const PERF_CONFIG = Object.freeze({
        DEBOUNCE_MS: 250,           // Form input debounce delay (ms)
        CACHE_MAX_SIZE: 50,         // Max LRU cache entries
        REFLOW_BATCH_SIZE: 100      // Max DOM operations per batch
    });

    // ============================================================================
    // 6. Debug Flags
    // ============================================================================
    const DEBUG = Object.freeze({
        FORM: !!(window?.ziweiCalData?.env?.isDebug),
        INTERACTION: !!(window?.ziweiCalData?.env?.isDebug),
        CALCULATOR: !!(window?.ziweiCalData?.env?.isDebug),
        CHART: !!(window?.ziweiCalData?.env?.isDebug),
        CONSTANTS: !!(window?.ziweiCalData?.env?.isDebug)
    });

    // ============================================================================
    // 7. Numeric Constants
    // ============================================================================
    const NUMERIC = Object.freeze({
        PALACES_COUNT: 12,              // 12 palaces in Ziwei chart
        STEMS_COUNT: 10,                // 10 heavenly stems
        NAYIN_LOCI_MIN: 2,              // Minimum Nayin loci (water)
        NAYIN_LOCI_MAX: 6,              // Maximum Nayin loci (fire)
        LUNAR_YEAR_MIN: 1800,           // Min supported lunar year
        LUNAR_YEAR_MAX: 2100,           // Max supported lunar year
        HOURS_IN_DAY: 24,               // 24 hours per day
        MILITARY_HOURS: 12,             // 12 military hours (時辰)
        GRID_SIZE: 4,                   // 4x4 grid
        GRID_TOTAL_CELLS: 16            // 16 cells in 4x4 grid
    });

    // ============================================================================
    // 8. CSS & Display Constants
    // ============================================================================
    const CSS = Object.freeze({
        GRID_FIXED_WIDTH: '640px',      // Fixed chart width
        GRID_FIXED_HEIGHT: '640px',     // Fixed chart height
        CELL_BORDER_COLOR: '#ccc',
        CELL_PADDING: '12px',
        PRIMARY_STAR_COLOR: '#e74c3c',  // Red
        SECONDARY_STAR_COLOR: '#6b7a87' // Gray
    });

    // ============================================================================
    // Public API Export
    // ============================================================================
    window.ziweiConstants = {
        REGEX,
        GRID_BRANCH_MAP,
        TRI_SQUARE_MAP,
        BRANCH_NAMES,
        STEM_NAMES,
        PERF_CONFIG,
        DEBUG,
        NUMERIC,
        CSS,
        VERSION: '1.0.0'
    };

    if (DEBUG.CONSTANTS) {
        console.log('[ziweiConstants] Module loaded:', window.ziweiConstants);
    }
})();
