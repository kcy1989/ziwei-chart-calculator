/**
 * Data Adapter Module
 * 
 * Central data transformation layer between form input and chart rendering.
 * Handles input normalization, module registration, calculation orchestration,
 * and output processing.
 * 
 * Dependencies:
 * - assets/data/constants.js (ziweiConstants)
 * - assets/calculate/common/lunar-converter.js (solarToLunar)
 * 
 * Exports: window.ziweiAdapter
 */

/* global solarToLunar */
(function(window) {
    'use strict';

    // ============================================================================
    // Dependencies & Initialization
    // ============================================================================
    
    const constants = window.ziweiConstants;
    
    // Ensure adapter object exists with proper structure
    window.ziweiAdapter = window.ziweiAdapter || {};
    const adapter = window.ziweiAdapter;

    // Initialize modules registry
    adapter.modules = adapter.modules || {};

    // Initialize storage system
    adapter._storage = adapter._storage || {};
    adapter.storage = adapter.storage || {
        get: function(key) {
            return adapter._storage[key];
        },
        set: function(key, value) {
            adapter._storage[key] = value;
        },
        remove: function(key) {
            delete adapter._storage[key];
        },
        clear: function() {
            adapter._storage = {};
        }
    };

    // Initialize settings system
    adapter._settings = adapter._settings || {};
    adapter.settings = adapter.settings || {
        get: function(key) {
            return adapter._settings[key];
        },
        set: function(key, value) {
            adapter._settings[key] = value;
        },
        getAll: function() {
            return Object.assign({}, adapter._settings);
        }
    };

    // Register module function
    adapter.registerModule = function(name, api) {
        if (!name || !api) return;
        adapter.modules[name] = api;
    };

    // Get module function
    adapter.getModule = function(name) {
        if (!name) return null;
        return adapter.modules[name] || null;
    };

    // Check if module exists
    adapter.hasModule = function(name) {
        return !!adapter.getModule(name);
    };

    // Process any pending modules registered before adapter was ready
    if (window.__ziweiAdapterModules) {
        Object.entries(window.__ziweiAdapterModules).forEach(function([name, api]) {
            adapter.registerModule(name, api);
        });
        delete window.__ziweiAdapterModules;
    }

    // Current computed NatalChart object (in-memory)
    adapter._currentChart = adapter._currentChart || null;

    adapter.setCurrentChart = function(chart) {
        adapter._currentChart = deepClone(chart);
    };

    adapter.getCurrentChart = function() {
        return deepClone(adapter._currentChart) || null;
    };

    // ============================================================================
    // Constants & Configuration
    // ============================================================================

    const DEBUG = constants.DEBUG.ADAPTER;
    const REGEX = constants.REGEX;
    const DEFAULTS = constants.DEFAULTS;
    const ERROR_CODES = constants.ERROR_CODES;
    const NUMERIC = constants.NUMERIC;
    const NUMERIC_LIMITS = constants.NUMERIC; // Alias for backward compatibility

    // ============================================================================
    // Helper Functions
    // ============================================================================

    function log() {
        if (DEBUG) {
            const args = Array.prototype.slice.call(arguments);
            args.unshift('[ziweiAdapter]');
            console.log.apply(console, args);
        }
    }

    function warn() {
        if (DEBUG) {
            const args = Array.prototype.slice.call(arguments);
            args.unshift('[ziweiAdapter]');
            console.warn.apply(console, args);
        }
    }

    function AdapterError(type, message, context, cause) {
        const error = new Error(message || 'Adapter error');
        error.name = 'AdapterError';
        error.type = type || ERROR_CODES.CALCULATION_FAILED;
        error.context = context || {};
        error.timestamp = Date.now();
        if (cause) {
            error.cause = cause;
        }
        return error;
    }

    function isAdapterError(value) {
        return value instanceof Error && value.name === 'AdapterError';
    }

    function isPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }

    function deepClone(value) {
        if (value === null || value === undefined) {
            return value;
        }
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(value);
            } catch (err) {
                // Fall through to JSON method
            }
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (err2) {
            if (Array.isArray(value)) {
                return value.slice();
            }
            if (isPlainObject(value)) {
                return Object.assign({}, value);
            }
            return value;
        }
    }

    function normalizeGender(value) {
        if (!value && value !== 0) return DEFAULTS.GENDER;
        const normalized = String(value).trim().toUpperCase();
        return normalized === 'M' || normalized === 'F' ? normalized : DEFAULTS.GENDER;
    }

    function sanitizeName(value) {
        if (typeof value !== 'string') return DEFAULTS.NAME;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : DEFAULTS.NAME;
    }

    function sanitizeText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function normalizeCalendarType(value) {
        const lowered = (value || '').toString().toLowerCase();
        return lowered === 'lunar' ? 'lunar' : DEFAULTS.CALENDAR_TYPE;
    }

    function toBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lowered = value.trim().toLowerCase();
            return lowered === '1' || lowered === 'true' || lowered === 'yes';
        }
        return Boolean(value);
    }

    function parseInteger(value, fallback) {
        if (value === null || value === undefined || value === '') return fallback;
        const num = Number(value);
        return Number.isFinite(num) ? parseInt(num, 10) : fallback;
    }

    function pad2(num) {
        return String(num).padStart(2, '0');
    }

    function buildBirthdate(year, month, day) {
        if (!year || !month || !day) return '';
        return String(year).padStart(4, '0') + '-' + pad2(month) + '-' + pad2(day);
    }

    function buildBirthtime(hour, minute) {
        if (hour === null || hour === undefined || minute === null || minute === undefined) return '';
        return pad2(hour) + ':' + pad2(minute);
    }

    // ============================================================================
    // Validation Logic
    // ============================================================================

    function validateRequiredFields(values, errors) {
        if (!values.gender) errors.gender = '請選擇性別';
        if (!values.year) errors.year = '請輸入出生年份';
        if (!values.month) errors.month = '請輸入出生月份';
        if (!values.day) errors.day = '請輸入出生日期';
        if (values.hour === null || values.hour === undefined) errors.hour = '請輸入出生時';
        if (values.minute === null || values.minute === undefined) errors.minute = '請輸入出生分';
    }

    function validateRegex(values, errors) {
        if (REGEX.YEAR && values.year && !REGEX.YEAR.test(String(values.year))) errors.year = '年份格式不正確';
        if (REGEX.MONTH && values.month && !REGEX.MONTH.test(String(values.month))) errors.month = '月份格式不正確';
        if (REGEX.DAY && values.day && !REGEX.DAY.test(String(values.day))) errors.day = '日期格式不正確';
        if (REGEX.HOUR && values.hour !== null && values.hour !== undefined && !REGEX.HOUR.test(String(values.hour))) errors.hour = '小時格式不正確';
        if (REGEX.MINUTE && values.minute !== null && values.minute !== undefined && !REGEX.MINUTE.test(String(values.minute))) errors.minute = '分鐘格式不正確';
    }

    // ============================================================================
    // Core Logic: Normalization & Calculation
    // ============================================================================

    /**
     * Ensures the provided lunar object is valid, checks if the lunar year is within supported range,
     * and normalizes the isLeapMonth property.
     */
    function ensureLunarObject(lunar, context) {
        if (!lunar) {
            throw AdapterError('LUNAR_MISSING', '無法取得農曆資料。', context);
        }
        if (lunar.lunarYear < NUMERIC_LIMITS.LUNAR_YEAR_MIN || lunar.lunarYear > NUMERIC_LIMITS.LUNAR_YEAR_MAX) {
            throw AdapterError('LUNAR_YEAR_OUT_OF_RANGE', '農曆年份超出支援範圍。', context);
        }
        return Object.assign({}, lunar, {
            isLeapMonth: lunar.isLeapMonth !== undefined ? lunar.isLeapMonth : !!lunar.isleap
        });
    }

    /**
     * Derives various indices and palaces based on lunar, solar, and meta data for Ziwei astrology calculations.
     * This function aggregates indices from basic modules, handles leap month modes, and computes time indices,
     * body palace, master palace, and gender classification where applicable.
     */
    function deriveIndices(meta, lunar, solar) {
        // Input validation
        if (!lunar?.lunarYear) {
            throw AdapterError('MISSING_LUNAR_YEAR', 'Lunar year is required for index derivation.');
        }
        if (!meta?.gender) {
            warn('deriveIndices: Missing gender, genderClassification skipped.');
        }

        const indices = {};
        const basic = adapter.getModule('basic') || {};
        const genderModule = adapter.getModule('gender');

        // 1. Year stem/branch (independent)
        if (typeof basic.getHeavenlyStemIndex === 'function') {
            indices.yearStemIndex = basic.getHeavenlyStemIndex(lunar.lunarYear);
        }
        if (typeof basic.getEarthlyBranchIndex === 'function') {
            indices.yearBranchIndex = basic.getEarthlyBranchIndex(lunar.lunarYear);
        }

        // 2. Month/time indices (leap-aware; REQUIRED - no fallback)
        if (typeof basic.getBasicIndices === 'function') {
            try {
                const leapMonthMode = meta.leapMonthHandling ?? 'mid';
                const result = basic.getBasicIndices(lunar, leapMonthMode);
                if (result?.monthIndex !== undefined) indices.monthIndex = result.monthIndex;
                if (result?.timeIndex !== undefined) indices.timeIndex = result.timeIndex;
            } catch (err) {
                warn('basic.getBasicIndices failed:', err);
            }
        }

        // 3. Body & Master palaces
        if (typeof basic.getBodyPalace === 'function') {
            try {
                indices.bodyPalace = basic.getBodyPalace(lunar.lunarYear);
            } catch (err) {
                warn('basic.getBodyPalace failed:', err);
            }
        }
        if (typeof basic.getMasterPalace === 'function') {
            try {
                indices.masterPalace = basic.getMasterPalace(lunar.lunarYear);
            } catch (err) {
                warn('basic.getMasterPalace failed:', err);
            }
        }

        // 4. Gender classification
        if (genderModule && typeof genderModule.getGenderClassification === 'function') {
            try {
                indices.genderClassification = genderModule.getGenderClassification(meta.gender, lunar.lunarYear);
            } catch (err) {
                warn('gender.getGenderClassification failed:', err);
            }
        }

        // Strict: Ensure critical indices present (post-processing check)
        if (indices.timeIndex === undefined) {
            throw AdapterError('MISSING_TIME_INDEX', 'timeIndex computation failed. Check basic module and upstream lunar.timeIndex.');
        }

        return indices;
    }

    /**
     * Normalizes and validates raw input data for Ziwei astrology calculations.
     */
    function normalizeInput(rawData) {
        try {
            // STEP 1: Input sanitization and validation
            const sanitizedData = sanitizeAndValidateInput(rawData);
            
            // STEP 2: Calendar processing with Zi hour handling
            const { solar, lunar } = processCalendarData(sanitizedData, rawData);
            
            // STEP 3: Time data processing and index calculation
            const processedLunar = processTimeData(lunar, solar, rawData);
            
            // STEP 4: Metadata assembly
            const meta = buildMetadata(sanitizedData, rawData);
            const strings = buildDisplayStrings(solar);
            
            // STEP 5: Final assembly
            const indices = deriveIndices(meta, processedLunar, solar);
            const normalized = {
                meta: meta,
                solar: solar,
                lunar: processedLunar,
                indices: indices,
                strings: strings,
                raw: deepClone(rawData),
                ziHourHandling: meta.ziHourHandling
            };

            log('Normalized input meta:', meta);
            log('Normalized lunar data:', processedLunar);
            log('Derived indices:', indices);

            return normalized;
            
        } catch (error) {
            if (isAdapterError(error)) {
                throw error;
            }
            throw AdapterError('INPUT_NORMALIZATION_FAILED', '輸入資料處理失敗', { rawData: deepClone(rawData) }, error);
        }
    }

    /**
     * Sanitizes and validates basic input fields.
     */
    function sanitizeAndValidateInput(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            throw AdapterError('INVALID_INPUT_TYPE', '輸入資料格式不正確');
        }
    
        const sanitized = {
            gender: normalizeGender(rawData.gender),
            year: parseInteger(rawData.year, null),
            month: parseInteger(rawData.month, null),
            day: parseInteger(rawData.day, null),
            hour: parseInteger(rawData.hour, null),
            minute: parseInteger(rawData.minute, null)
        };
    
        const errors = {};
        validateRequiredFields(sanitized, errors);
        validateRegex(sanitized, errors);
        validateRanges(sanitized, errors);
    
        if (Object.keys(errors).length > 0) {
            const message = Object.keys(errors).length === 1
                ? Object.values(errors)[0]
                : Object.values(errors).join('；');
            throw AdapterError('INPUT_VALIDATION_FAILED', message, { errors, rawData: deepClone(rawData) });
        }
    
        return sanitized;
    }

    /**
     * Enhanced range validation with better error messages.
     */
    function validateRanges(sanitized, errors) {
        if (sanitized.year && 
            (sanitized.year < NUMERIC.LUNAR_YEAR_MIN || sanitized.year > NUMERIC.LUNAR_YEAR_MAX)) {
            errors.year = `年份需介於 ${NUMERIC.LUNAR_YEAR_MIN}-${NUMERIC.LUNAR_YEAR_MAX}`;
        }
    }

    /**
     * Processes calendar data with improved Zi hour handling.
     */
    function processCalendarData(sanitizedData, rawData) {
        const solar = createSolarObject(sanitizedData);
        const calendarType = normalizeCalendarType(rawData.calendarType);
        
        let lunar;
        if (calendarType === 'solar') {
            lunar = convertSolarToLunarOptimized(solar, rawData);
        } else if (rawData.lunar && isPlainObject(rawData.lunar)) {
            lunar = deepClone(rawData.lunar);
        } else {
            throw AdapterError('INVALID_CALENDAR_TYPE', '無效的曆法類型');
        }
        
        return { solar, lunar };
    }

    /**
     * Optimized solar to lunar conversion with improved Zi hour logic.
     */
    function convertSolarToLunarOptimized(solar, rawData) {
        if (typeof solarToLunar !== 'function') {
            throw AdapterError('LUNAR_CONVERTER_MISSING', '找不到農曆轉換函式');
        }

        const conversionParams = calculateConversionParams(solar, rawData);
        
        try {
            return solarToLunar(conversionParams.year, conversionParams.month, conversionParams.day, 
                               conversionParams.hour, conversionParams.minute);
        } catch (error) {
            throw AdapterError('LUNAR_CONVERSION_FAILED', '國曆轉農曆失敗', 
                { solar: deepClone(solar), params: conversionParams }, error);
        }
    }

    /**
     * Calculates conversion parameters with optimized Zi hour handling.
     */
    function calculateConversionParams(solar, rawData) {
        const params = {
            year: solar.year,
            month: solar.month,
            day: solar.day,
            hour: solar.hour,
            minute: solar.minute
        };

        // Only process Zi hour if explicitly requested
        const ziHourHandling = getZiHourHandling(rawData);
        if (ziHourHandling === 'ziChange') {
            const ziAdjustment = calculateZiHourAdjustment(solar.hour, solar.minute);
            if (ziAdjustment.shouldAdjust) {
                const adjustedDate = adjustDateForZiHour(solar, ziAdjustment.daysToAdd);
                Object.assign(params, adjustedDate);
                
                log('[DEBUG] Applied Zi hour adjustment:', {
                    original: { hour: solar.hour, minute: solar.minute },
                    adjusted: adjustedDate,
                    reason: ziAdjustment.reason
                });
            }
        }

        return params;
    }

    /**
     * Get Zi hour handling preference with fallback to defaults.
     */
    function getZiHourHandling(rawData) {
        if (typeof rawData.ziHourHandling === 'string') {
            return rawData.ziHourHandling;
        }
        if (adapter.settings?.get) {
            return adapter.settings.get('ziHourHandling') || DEFAULTS.ZI_HOUR_HANDLING;
        }
        return DEFAULTS.ZI_HOUR_HANDLING;
    }

    /**
     * Calculate Zi hour adjustment with early returns.
     */
    function calculateZiHourAdjustment(hour, minute) {
        const baseHour = Number(hour);
        
        // Early Zi hour (23:xx) - needs date adjustment
        if (baseHour === 23) {
            return { shouldAdjust: true, daysToAdd: 1, reason: 'Early Zi hour adjustment' };
        }
        
        // Late Zi hour (00:xx) or non-Zi hour - no adjustment
        return { shouldAdjust: false, daysToAdd: 0, reason: 'No adjustment needed' };
    }

    /**
     * Adjust date for Zi hour with optimized Date handling.
     */
    function adjustDateForZiHour(solar, daysToAdd) {
        const date = new Date(solar.year, solar.month - 1, solar.day, solar.hour, solar.minute || 0);
        date.setDate(date.getDate() + daysToAdd);
        
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };
    }

    /**
     * Processes time data and calculates time index.
     */
    function processTimeData(lunar, solar, rawData) {
        const validatedLunar = ensureLunarObject(lunar, { solar: deepClone(solar) });
        
        const processedLunar = {
            ...validatedLunar,
            hour: validatedLunar.hour ?? solar.hour,
            minute: validatedLunar.minute ?? solar.minute
        };
        
        if (processedLunar.timeIndex === undefined || processedLunar.timeIndex === null) {
            processedLunar.timeIndex = calculateTimeIndexOptimized(solar);
        }
        
        return processedLunar;
    }

    /**
     * Optimized time index calculation with better error handling.
     */
    function calculateTimeIndexOptimized(solar) {
        const calculator = window.ziweiCalculator;
        if (!calculator?.getMilitaryHourIndex) {
            throw AdapterError('CALCULATOR_MISSING', 'calculator.getMilitaryHourIndex not found');
        }

        const timeString = formatTimeString(solar.hour, solar.minute);
        return calculator.getMilitaryHourIndex(timeString);
    }

    /**
     * Format time string with template literals.
     */
    function formatTimeString(hour, minute) {
        if (hour == null || minute == null) return '00:00';
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    /**
     * Builds metadata with improved stem interpretation handling.
     */
    function buildMetadata(sanitizedData, rawData) {
        updateStemInterpretationsSafely(rawData.stemInterpretations);
        
        return {
            name: sanitizeName(rawData.name),
            gender: sanitizedData.gender || 'M',
            birthplace: sanitizeText(rawData.birthplace),
            calendarType: normalizeCalendarType(rawData.calendarType),
            leapMonth: toBoolean(rawData.leapMonth),
            leapMonthHandling: rawData.leapMonthHandling || null,
            ziHourHandling: getZiHourHandling(rawData)
        };
    }

    /**
     * Safely updates stem interpretations with graceful error handling.
     */
    function updateStemInterpretationsSafely(stemInterpretations) {
        if (!stemInterpretations || typeof stemInterpretations !== 'object') return;
        if (!adapter.settings?.set) return;
        
        try {
            Object.entries(stemInterpretations).forEach(([stem, interpretation]) => {
                adapter.settings.set(`stemInterpretation_${stem}`, interpretation);
            });
        } catch (error) {
            warn('Failed to update stem interpretations:', error);
            // Non-critical error - continue processing
        }
    }

    /**
     * Builds display strings with optimized string building.
     */
    function buildDisplayStrings(solar) {
        return {
            birthdate: buildBirthdate(solar.year, solar.month, solar.day),
            birthtime: buildBirthtime(solar.hour, solar.minute)
        };
    }

    /**
     * Creates solar object from sanitized data.
     */
    function createSolarObject(sanitizedData) {
        return {
            year: sanitizedData.year,
            month: sanitizedData.month,
            day: sanitizedData.day,
            hour: sanitizedData.hour,
            minute: sanitizedData.minute
        };
    }

    /**
     * Enhanced mergeMeta function with improved readability, performance, and maintainability
     * 
     * Merges metadata from normalized data and calculated metadata, 
     * applying defaults and generating formatted birthdate strings.
     * 
     * @param {Object} normalized - The normalized data object containing meta, lunar, solar, strings, and indices properties.
     * @param {Object} [calcMeta] - Optional calculated metadata to merge into the normalized meta.
     * @returns {Object} The merged metadata object with defaults applied and formatted birthdate texts.
     * @throws {Error} If input validation fails
     */
    function mergeMeta(normalized, calcMeta) {
        try {
            // Input validation
            const errors = [];
            if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
                errors.push('normalized must be a valid object');
            }
            if (calcMeta !== undefined && (typeof calcMeta !== 'object' || Array.isArray(calcMeta))) {
                errors.push('calcMeta must be a valid object if provided');
            }
            if (errors.length > 0) {
                const error = new Error(`mergeMeta validation failed: ${errors.join(', ')}`);
                error.name = 'AdapterError';
                error.type = ERROR_CODES.CALCULATION_FAILED;
                throw error;
            }
            
            // Enhanced helper function for safe property access
            function safeGet(obj, path, defaultValue) {
                if (!obj || typeof obj !== 'object') return defaultValue;
                return path.split('.').reduce((current, key) => {
                    return (current && current[key] !== undefined) ? current[key] : defaultValue;
                }, obj);
            }
            
            // Enhanced string sanitization
            function sanitizeString(value, defaultValue = '') {
                if (typeof value !== 'string') return defaultValue;
                const trimmed = value.trim();
                return trimmed.length > 0 ? trimmed : defaultValue;
            }
            
            // Step 1: Initial merge with safe defaults
            const meta = safeGet(normalized, 'meta', {});
            const initialMerge = Object.assign({}, meta, calcMeta || {});
            
            // Step 2: Include lunar data from normalized
            const lunar = safeGet(normalized, 'lunar');
            if (lunar) {
                initialMerge.lunar = lunar;
            }
            
            // Step 3: Apply defaults with enhanced validation
            const DEFAULTS_ENHANCED = {
                CHINESE_NAME: '無名氏',
                DEFAULT_GENDER: 'M',
                SOLAR_PREFIX: '西曆：',
                LUNAR_PREFIX: '農曆：',
                TIME_SUFFIX: '時',
                LEAP_PREFIX: '閏'
            };
            
            // Apply name defaults
            if (!initialMerge.name) {
                initialMerge.name = sanitizeString(
                    safeGet(normalized, 'meta.name'), 
                    DEFAULTS_ENHANCED.CHINESE_NAME
                );
            }
            
            // Apply gender defaults with validation
            if (!initialMerge.gender) {
                const normalizedGender = safeGet(normalized, 'meta.gender');
                initialMerge.gender = sanitizeString(normalizedGender, DEFAULTS_ENHANCED.DEFAULT_GENDER).toUpperCase();
                
                // Validate gender values
                if (initialMerge.gender !== 'M' && initialMerge.gender !== 'F') {
                    initialMerge.gender = DEFAULTS_ENHANCED.DEFAULT_GENDER;
                }
            }
            
            // Apply birthdate defaults
            if (!initialMerge.birthdate) {
                initialMerge.birthdate = sanitizeString(
                    safeGet(normalized, 'strings.birthdate')
                );
            }
            
            // Apply birthtime defaults
            if (!initialMerge.birthtime) {
                initialMerge.birthtime = sanitizeString(
                    safeGet(normalized, 'strings.birthtime')
                );
            }
            
            // Apply birthplace defaults
            if (!initialMerge.birthplace) {
                initialMerge.birthplace = sanitizeString(
                    safeGet(normalized, 'meta.birthplace')
                );
            }
            
            // Step 4: Merge gender classification with safe access
            const genderClassification = safeGet(normalized, 'indices.genderClassification');
            if (genderClassification !== undefined) {
                initialMerge.genderClassification = genderClassification;
            }
            
            // Step 5: Generate formatted birthdate texts with enhanced error handling
            
            // Enhanced solar date processing
            const solar = safeGet(normalized, 'solar');
            if (solar) {
                try {
                    const timeString = safeGet(normalized, 'strings.birthtime', '');
                    
                    // Validate solar data
                    if (solar.year !== undefined && solar.month !== undefined && solar.day !== undefined) {
                        const timePart = sanitizeString(timeString);
                        const timeDisplay = timePart ? ` ${timePart}` : '';
                        
                        // Use template literals for better performance
                        const solarText = `${DEFAULTS_ENHANCED.SOLAR_PREFIX}${solar.year}年${solar.month}月${solar.day}日${timeDisplay}`;
                        initialMerge.birthdateSolarText = solarText;

                        // Generate birthdateSolarNumeric for control.js hour navigation
                        const hour = (solar.hour !== undefined) ? solar.hour : 0;
                        const minute = (solar.minute !== undefined) ? solar.minute : 0;
                        
                        // Validate time ranges
                        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                            initialMerge.birthdateSolarNumeric = {
                                year: solar.year,
                                month: solar.month,
                                day: solar.day,
                                hour: hour,
                                minute: minute
                            };
                        }
                    }
                } catch (error) {
                    warn('Solar data processing failed:', error);
                    if (!initialMerge.birthdateSolarText) {
                        initialMerge.birthdateSolarText = '';
                    }
                }
            }
            
            // Enhanced lunar date processing
            const lunarData = safeGet(normalized, 'lunar');
            if (lunarData) {
                try {
                    const timeIndex = safeGet(lunarData, 'timeIndex');
                    const timeBranch = (typeof timeIndex === 'number' && 
                                      timeIndex >= 0 && timeIndex < constants.BRANCH_NAMES.length) 
                                      ? constants.BRANCH_NAMES[timeIndex] || '' : '';
                    
                    let lunarText;
                    
                    // Handle pre-formatted gan-zhi year and date from converter
                    if (lunarData.year && lunarData.date && 
                        typeof lunarData.year === 'string' && typeof lunarData.date === 'string') {
                        const yearIndex = lunarData.year.indexOf('年');
                        if (yearIndex !== -1) {
                            const ganzhiYear = lunarData.year.slice(0, yearIndex + 1);
                            lunarText = `${DEFAULTS_ENHANCED.LUNAR_PREFIX}${ganzhiYear}${lunarData.date}${timeBranch}${DEFAULTS_ENHANCED.TIME_SUFFIX}`;
                        }
                    }
                    
                    // Fallback for direct lunar input (numeric values)
                    if (!lunarText) {
                        const lunarYear = safeGet(lunarData, 'lunarYear');
                        const lunarMonth = safeGet(lunarData, 'lunarMonth');
                        const lunarDay = safeGet(lunarData, 'lunarDay');
                        
                        if (lunarYear && lunarMonth && lunarDay) {
                            const isLeapMonth = Boolean(safeGet(lunarData, 'isLeapMonth'));
                            const leapPrefix = isLeapMonth ? DEFAULTS_ENHANCED.LEAP_PREFIX : '';
                            
                            lunarText = `${DEFAULTS_ENHANCED.LUNAR_PREFIX}${lunarYear}年${leapPrefix}${lunarMonth}月${lunarDay}日${timeBranch}${DEFAULTS_ENHANCED.TIME_SUFFIX}`;
                        }
                    }
                    
                    if (lunarText) {
                        initialMerge.birthdateLunarText = lunarText;
                    }
                } catch (error) {
                    warn('Lunar data processing failed:', error);
                    if (!initialMerge.birthdateLunarText) {
                        initialMerge.birthdateLunarText = '';
                    }
                }
            }
            
            log('Meta merge completed successfully');
            return initialMerge;
            
        } catch (error) {
            warn('Meta merge failed:', error);
            
            // Provide fallback with minimal data
            if (error.name === 'AdapterError') {
                throw error;
            }
            
            const adapterError = new Error('Metadata merge operation failed');
            adapterError.name = 'AdapterError';
            adapterError.type = ERROR_CODES.CALCULATION_FAILED;
            adapterError.context = { normalized, calcMeta, originalError: error };
            throw adapterError;
        }
    }

    function extractMeta(calcResult) {
        if (!calcResult) return {};
        const payload = calcResult.data || calcResult;
        if (!payload || typeof payload !== 'object') return {};
        const meta = {};
        if (payload.name) meta.name = payload.name;
        if (payload.gender) meta.gender = payload.gender;
        if (payload.birthdate) meta.birthdate = payload.birthdate;
        if (payload.birthtime) meta.birthtime = payload.birthtime;
        if (payload.birthplace) meta.birthplace = payload.birthplace;
        if (payload.lunar) meta.lunar = payload.lunar;
        if (payload.dayBranchIndex !== undefined) meta.dayBranchIndex = payload.dayBranchIndex;
        return meta;
    }

    function ensureBasicIndex(context, calcMeta) {
        if (context.indices.dayBranchIndex === undefined && calcMeta && calcMeta.dayBranchIndex !== undefined) {
            context.indices.dayBranchIndex = calcMeta.dayBranchIndex;
        }
        if (context.indices.timeIndex === undefined) {
            context.indices.timeIndex = context.lunar.timeIndex;
        }
    }

    function computePalaces(context) {
        const palacesModule = adapter.getModule('palaces');
        if (!palacesModule || typeof palacesModule.calculatePalacePositions !== 'function') {
            throw AdapterError('MODULE_MISSING', '找不到宮位計算模組。');
        }
        const meta = {
            lunar: context.lunar,
            gender: context.meta.gender
        };
        const result = palacesModule.calculatePalacePositions(meta) || {};
        if (!result || Object.keys(result).length === 0) {
            throw AdapterError('PALACE_CALC_FAILED', '宮位計算失敗。', { meta: meta });
        }
        return result;
    }

    function toPalaceList(palaces) {
        if (!palaces) return [];
        return Array.isArray(palaces) ? palaces : Object.values(palaces);
    }

    function findPalace(list, predicate) {
        if (!Array.isArray(list)) return null;
        for (let i = 0; i < list.length; i += 1) {
            if (predicate(list[i])) return list[i];
        }
        return null;
    }

    function computeNayinInfo(mingPalace) {
        if (!window.ziweiNayin) return { loci: null, name: '' };
        try {
            const loci = typeof window.ziweiNayin.getNayin === 'function'
                ? window.ziweiNayin.getNayin(mingPalace.stemIndex, mingPalace.index)
                : null;
            const name = loci !== null && typeof window.ziweiNayin.getNayinName === 'function'
                ? window.ziweiNayin.getNayinName(loci)
                : '';
            return { loci: loci, name: name };
        } catch (err) {
            warn('Nayin calculation failed', err);
            return { loci: null, name: '' };
        }
    }

    function computePrimaryStars(context, derived) {
        const primaryModule = adapter.getModule('primary');
        if (!primaryModule || typeof primaryModule.placePrimaryStars !== 'function') {
            throw AdapterError('MODULE_MISSING', '找不到主星計算模組。');
        }
        const chartData = {
            lunarDay: context.lunar.lunarDay,
            nayinLoci: derived.nayin.loci
        };
        const result = primaryModule.placePrimaryStars(chartData);
        if (!result || Object.keys(result).length === 0) {
            throw AdapterError('PRIMARY_STARS_FAILED', '主星計算失敗。', { chartData: chartData });
        }
        return result;
    }

    function computeSecondaryStars(context) {
        const secondaryModule = adapter.getModule('secondary');
        if (!secondaryModule || typeof secondaryModule.calculateAllSecondaryStars !== 'function') {
            throw AdapterError('MODULE_MISSING', '找不到輔星計算模組。');
        }
        const payload = {
            monthIndex: context.indices.monthIndex,
            timeIndex: context.indices.timeIndex,
            stemIndex: context.indices.yearStemIndex,
            branchIndex: context.indices.yearBranchIndex
        };
        const result = secondaryModule.calculateAllSecondaryStars(payload);
        if (!result || Object.keys(result).length === 0) {
            throw AdapterError('SECONDARY_STARS_FAILED', '輔星計算失敗。', { payload: payload });
        }
        return result;
    }

    function computeMutations(context) {
        const mutationsModule = adapter.getModule('mutations');
        if (!mutationsModule || typeof mutationsModule.calculateBirthYearMutations !== 'function') {
            return null;
        }
        return mutationsModule.calculateBirthYearMutations(context.indices.yearStemIndex);
    }

    function resolveSecondaryPosition(secondaryStars, key) {
        if (!secondaryStars) return null;
        if (secondaryStars[key] !== undefined) return secondaryStars[key];
        if (secondaryStars.positions && secondaryStars.positions[key] !== undefined) {
            return secondaryStars.positions[key];
        }
        return null;
    }

    function computeMinorStars(context, derived, secondaryStars) {
        const minorModule = adapter.getModule('minorStars');
        if (!minorModule || typeof minorModule.calculateMinorStars !== 'function') {
            return null;
        }
        const indices = context.indices;
        const lunar = context.lunar;
        const shenPalaceIndex = derived.shenPalace ? derived.shenPalace.index : null;
        
        const migrationPalace = findPalace(derived.palaceList, function(item) {
            return item && (item.name === '遷移' || (item.name && item.name.indexOf('遷') !== -1));
        });
        
        // Get migration palace index from found palace or calculate from Ming palace
        let migrationPalaceIndex;
        if (!migrationPalace || migrationPalace.index === null || migrationPalace.index === undefined) {
            // Migration palace is always opposite to Ming palace (6 positions apart)
            if (derived.mingPalace && derived.mingPalace.index !== undefined) {
                migrationPalaceIndex = (derived.mingPalace.index + 6) % 12;
            } else {
                throw AdapterError('MIGRATION_PALACE_NOT_FOUND', '遷移宮不存在，無法計算天傷和天使。', { derived: derived });
            }
        } else {
            migrationPalaceIndex = migrationPalace.index;
        }
        
        if (typeof migrationPalaceIndex !== 'number' || migrationPalaceIndex < 0 || migrationPalaceIndex > 11) {
            throw AdapterError('INVALID_MIGRATION_INDEX', '遷移宮位置無效：' + migrationPalaceIndex, { migrationPalaceIndex: migrationPalaceIndex });
        }
        
        let woundedServantHandling = 'zhongzhou';
        if (adapter.settings && typeof adapter.settings.get === 'function') {
            const val = adapter.settings.get('woundedServantHandling');
            if (val) woundedServantHandling = val;
        }
        
        // calculateMinorStars expects positional arguments, not an object
        return minorModule.calculateMinorStars(
            indices.monthIndex,                              // monthIndex
            indices.timeIndex,                               // timeIndex
            indices.yearBranchIndex,                         // yearBranchIndex
            indices.dayBranchIndex,                          // dayBranchIndex
            indices.yearStemIndex,                           // yearStemIndex
            derived.mingPalace ? derived.mingPalace.index : null, // mingPalaceIndex
            shenPalaceIndex,                                 // shenPalaceIndex
            context.gender,                                  // gender
            lunar.lunarYear,                                 // lunarYear
            migrationPalaceIndex,                            // migrationPalaceIndex
            resolveSecondaryPosition(secondaryStars, '文曲'), // literaryCraftIndex (文曲)
            resolveSecondaryPosition(secondaryStars, '左輔'), // leftAssistantIndex (左輔)
            resolveSecondaryPosition(secondaryStars, '右弼'), // rightAssistIndex (右弼)
            resolveSecondaryPosition(secondaryStars, '文昌'), // literaryTalentIndex (文昌)
            lunar.lunarDay,                                  // lunarDay
            woundedServantHandling                           // woundedServantHandling
        );
    }

    function computeAttributes(context, secondaryStars) {
        const attributesModule = adapter.getModule('attributes');
        if (!attributesModule || typeof attributesModule.calculateAllAttributes !== 'function') {
            return null;
        }
        
        // Get 祿存 position from secondary stars
        const luCunIndex = resolveSecondaryPosition(secondaryStars, '祿存');
        if (luCunIndex === null || luCunIndex === undefined) {
            return null;
        }
        
        // Calculate direction based on gender and year
        const basicModule = adapter.getModule('basic');
        let isClockwise = true; // default
        if (basicModule && typeof basicModule.isClockwise === 'function') {
            isClockwise = basicModule.isClockwise(context.meta.gender, context.lunar.lunarYear);
        }
        
        return attributesModule.calculateAllAttributes(
            context.indices.yearBranchIndex,
            luCunIndex,
            isClockwise
        );
    }

    function computeBrightness(context, derived, sections) {
        const brightnessModule = adapter.getModule('brightness');
        if (!brightnessModule || typeof brightnessModule.calculateAllBrightness !== 'function') {
            warn('calculateAllBrightness function not found in brightness module, returning empty brightness data');
            return {};
        }
        const result = brightnessModule.calculateAllBrightness(
            sections.primaryStars,
            sections.secondaryStars,
            derived.palaces
        );
        log('Brightness calculation completed');
        return result;
    }

    function computeLifeCycles(context, derived) {
        const lifeCycleModule = adapter.getModule('lifeCycle');
        if (!lifeCycleModule || typeof lifeCycleModule.calculateMajorCycles !== 'function') {
            return {};
        }
        // Use lunar.year for lunarYear - needed for clockwise calculation
        const lunarYear = context.lunar?.year;
        const major = lifeCycleModule.calculateMajorCycles(
            derived.nayin.loci,
            context.meta.gender,
            lunarYear,
            derived.mingPalace.index
        );
        const twelve = typeof lifeCycleModule.calculateTwelveLongLifePositions === 'function'
            ? lifeCycleModule.calculateTwelveLongLifePositions(derived.nayin.loci, context.meta.gender, lunarYear)
            : {};
        return { major: major, twelve: twelve };
    }

    // ============================================================================
    // Main Calculation Function
    // ============================================================================

    adapter.calculate = function(inputData) {
        try {
            log('Starting calculation with input:', inputData);

            const normalized = normalizeInput(inputData);
            const context = {
                meta: normalized.meta,
                lunar: normalized.lunar,
                solar: normalized.solar,
                indices: normalized.indices,
                strings: normalized.strings
            };

            // 1. Compute Palaces
            const palaces = computePalaces(context);
            const palaceList = toPalaceList(palaces);
            const mingPalace = findPalace(palaceList, p => p.isMing);
            const shenPalace = findPalace(palaceList, p => p.isShen);

            if (!mingPalace) {
                throw AdapterError('MING_PALACE_MISSING', '無法定位命宮。');
            }

            const derived = {
                palaces: palaces,
                palaceList: palaceList,
                mingPalace: mingPalace,
                shenPalace: shenPalace,
                nayin: computeNayinInfo(mingPalace)
            };

            // 2. Compute Stars
            const primaryStars = computePrimaryStars(context, derived);
            const secondaryStars = computeSecondaryStars(context);
            const mutations = computeMutations(context);
            const minorStars = computeMinorStars(context, derived, secondaryStars);
            const attributes = computeAttributes(context, secondaryStars);

            const sections = {
                palaces: palaces,
                primaryStars: primaryStars,
                secondaryStars: secondaryStars,
                minorStars: minorStars,
                mutations: mutations,
                attributes: attributes
            };

            // 3. Compute Brightness & Life Cycles
            const brightness = computeBrightness(context, derived, sections);
            const lifeCycles = computeLifeCycles(context, derived);

            sections.brightness = brightness;
            sections.lifeCycles = lifeCycles;

            // 4. Assemble Final Output
            const output = {
                meta: mergeMeta(normalized, {}),
                lunar: context.lunar,
                indices: context.indices,
                derived: derived,
                sections: sections,
                normalized: normalized
            };

            adapter.setCurrentChart(output);
            log('Calculation completed successfully.', output);
            return output;

        } catch (err) {
            warn('Calculation failed:', err);
            if (isAdapterError(err)) {
                throw err;
            }
            throw AdapterError('CALCULATION_FAILED', '排盤過程發生未預期的錯誤。', { input: inputData }, err);
        }
    };

    // Expose normalizeInput for external use (e.g. form validation)
    adapter.normalizeInput = normalizeInput;

})(window);
