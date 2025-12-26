/**
 * Global Constants Module
 * 
 * Centralized management of magic numbers, repeated definitions,
 * regex patterns, and configuration values.
 * 
 * Dependencies: None (loads before all other JS modules)
 * 
 * Exports: window.ziweiConstants
 */

'use strict';

(function() {

    // ============================================================================
    // 1. Regular Expressions
    // ============================================================================
    const REGEX = Object.freeze({
        DATE: /^\d{4}-\d{2}-\d{2}$/,
        TIME: /^([01]\d|2[0-3]):([0-5]\d)$/,
        YEAR: /^\d{4}$/,
        MONTH: /^(0?[1-9]|1[0-2])$/,
        DAY: /^(0?[1-9]|[12]\d|3[01])$/,
        HOUR: /^([01]?\d|2[0-3])$/,
        MINUTE: /^[0-5]?\d$/
    });

    // ============================================================================
    // 2. Grid & Palace Mappings
    // ============================================================================
    const GRID_BRANCH_MAP = Object.freeze([
        [5, 6, 7, 8],
        [4, -1, -1, 9],
        [3, -1, -1, 10],
        [2, 1, 0, 11]
    ]);

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
        DEBOUNCE_MS: 250,
        CACHE_MAX_SIZE: 50,
        REFLOW_BATCH_SIZE: 100
    });

    // ============================================================================
    // 6. Debug Flags
    // ============================================================================
    const DEBUG = Object.freeze({
        FORM: !!(window?.ziweiCalData?.env?.isDebug),
        INTERACTION: !!(window?.ziweiCalData?.env?.isDebug),
        CALCULATOR: !!(window?.ziweiCalData?.env?.isDebug),
        CHART: !!(window?.ziweiCalData?.env?.isDebug),
        CONSTANTS: !!(window?.ziweiCalData?.env?.isDebug),
        ADAPTER: !!(window?.ziweiCalData?.env?.isDebug)
    });

    // ============================================================================
    // 7. Numeric Constants
    // ============================================================================
    const NUMERIC = Object.freeze({
        PALACES_COUNT: 12,
        STEMS_COUNT: 10,
        BRANCHES_COUNT: 12,
        NAYIN_LOCI_MIN: 2,
        NAYIN_LOCI_MAX: 6,
        LUNAR_YEAR_MIN: 800,
        LUNAR_YEAR_MAX: 2200,
        HOURS_IN_DAY: 24,
        MILITARY_HOURS: 12,
        GRID_SIZE: 4,
        GRID_TOTAL_CELLS: 16
    });

    // ============================================================================
    // 8. CSS & Display Constants
    // ============================================================================
    const CSS = Object.freeze({
        GRID_FIXED_WIDTH: '640px',
        GRID_FIXED_HEIGHT: '640px',
        CELL_BORDER_COLOR: '#ccc',
        CELL_PADDING: '12px',
        PRIMARY_STAR_COLOR: '#e74c3c',
        SECONDARY_STAR_COLOR: '#6b7a87'
    });

    // ============================================================================
    // 9. Adapter Storage Keys (NEW)
    // ============================================================================
    const ADAPTER_KEYS = Object.freeze({
        ADAPTER_OUTPUT: 'adapterOutput',
        CALC_RESULT: 'calcResult',
        NORMALIZED_INPUT: 'normalizedInput',
        META: 'meta',
        RAW: 'raw',
        FORM_INPUT: 'formInput'
    });

    // ============================================================================
    // 10. Module Names (NEW)
    // ============================================================================
    const MODULE_NAMES = Object.freeze({
        PRIMARY: 'primary',
        SECONDARY: 'secondary',
        MINOR_STARS: 'minorStars',
        MUTATIONS: 'mutations',
        ATTRIBUTES: 'attributes',
        PALACES: 'palaces',
        PALACE_NAMES: 'palaceNames',
        BASIC: 'basic',
        BRIGHTNESS: 'brightness',
        LIFE_CYCLE: 'lifeCycle',
        NAYIN: 'nayin',
        GENDER: 'gender',
        MAJOR_CYCLE_STARS: 'majorCycleStars',
        INTERPRETATIONS: 'interpretations'
    });

    // ============================================================================
    // 11. Error Codes (NEW)
    // ============================================================================
    const ERROR_CODES = Object.freeze({
        INPUT_INVALID: 'INPUT_INVALID',
        INPUT_CONTEXT_REQUIRED: 'INPUT_CONTEXT_REQUIRED',
        CALCULATOR_MISSING: 'CALCULATOR_MISSING',
        PALACES_FAILED: 'PALACES_FAILED',
        PRIMARY_FAILED: 'PRIMARY_FAILED',
        SECONDARY_FAILED: 'SECONDARY_FAILED',
        MINOR_FAILED: 'MINOR_FAILED',
        MUTATIONS_FAILED: 'MUTATIONS_FAILED',
        ATTRIBUTES_FAILED: 'ATTRIBUTES_FAILED',
        MODULE_MISSING: 'MODULE_MISSING',
        CALCULATION_FAILED: 'CALCULATION_FAILED'
    });

    // ============================================================================
    // 12. Default Values
    // ============================================================================
    const DEFAULTS = Object.freeze({
        NAME: '無名氏',
        GENDER: '',
        CALENDAR_TYPE: 'solar',
        BRIGHTNESS_SCHOOL: 'shuoshu',
        PALACE_SCHOOL: 'standard',
        ZI_HOUR_HANDLING: 'midnightChange',
        LEAP_MONTH_HANDLING: 'mid'
    });

    // ============================================================================
    // 13. Time Boundaries (for hour index calculation)
    // ============================================================================
    const TIME_BOUNDARIES = Object.freeze([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);

    // ============================================================================
    // 14. Time Index Mapping
    // ============================================================================
    const TIME_INDEX_MAP = Object.freeze({
        // Hour ranges to time index (子=0, 丑=1, etc.)
        RANGES: [
            { start: 23, end: 1, index: 0 },   // 子
            { start: 1, end: 3, index: 1 },    // 丑
            { start: 3, end: 5, index: 2 },    // 寅
            { start: 5, end: 7, index: 3 },    // 卯
            { start: 7, end: 9, index: 4 },    // 辰
            { start: 9, end: 11, index: 5 },   // 巳
            { start: 11, end: 13, index: 6 },  // 午
            { start: 13, end: 15, index: 7 },  // 未
            { start: 15, end: 17, index: 8 },  // 申
            { start: 17, end: 19, index: 9 },  // 酉
            { start: 19, end: 21, index: 10 }, // 戌
            { start: 21, end: 23, index: 11 }  // 亥
        ]
    });

    // = : 15. Calculation Settings (affect cache key)
    // ============================================================================
    const CALCULATION_SETTINGS = Object.freeze([
        'leapMonthHandling',
        'ziHourHandling',
        'hour-change',
        'stemInterpretation_甲',
        'stemInterpretation_戊',
        'stemInterpretation_庚',
        'stemInterpretation_辛',
        'stemInterpretation_壬',
        'stemInterpretation_癸'
    ]);

    // ============================================================================
    // 16. Controversial Stems (四化爭議天干)
    // ============================================================================
    const CONTROVERSIAL_STEMS = Object.freeze(['甲', '戊', '庚', '辛', '壬', '癸']);

    // ============================================================================
    // Public API Export
    // ============================================================================
    window.ziweiConstants = Object.freeze({
        REGEX,
        GRID_BRANCH_MAP,
        TRI_SQUARE_MAP,
        BRANCH_NAMES,
        STEM_NAMES,
        PERF_CONFIG,
        DEBUG,
        NUMERIC,
        CSS,
        ADAPTER_KEYS,
        MODULE_NAMES,
        ERROR_CODES,
        DEFAULTS,
        TIME_BOUNDARIES,
        TIME_INDEX_MAP,
        CALCULATION_SETTINGS,
        CONTROVERSIAL_STEMS,
        VERSION: '1.3.0'
    });

    if (DEBUG.CONSTANTS) {
        console.log('[ziweiConstants] Module loaded');
    }
})();
