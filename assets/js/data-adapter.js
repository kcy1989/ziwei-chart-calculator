/* global solarToLunar */
(function(window) {
    'use strict';

    var GLOBAL_KEY = 'ziweiAdapter';
    var adapter = window[GLOBAL_KEY] || {};
    adapter.modules = adapter.modules || {};

    var pendingModules = window.__ziweiAdapterModules;
    if (pendingModules && typeof pendingModules === 'object') {
        for (var pendingName in pendingModules) {
            if (Object.prototype.hasOwnProperty.call(pendingModules, pendingName)) {
                adapter.modules[pendingName] = pendingModules[pendingName];
            }
        }
        delete window.__ziweiAdapterModules;
    }

    if (typeof adapter.registerModule !== 'function') {
        adapter.registerModule = function(name, api) {
            if (!name || !api) {
                return;
            }
            adapter.modules[name] = api;
        };
    }

    if (typeof adapter.getModule !== 'function') {
        adapter.getModule = function(name) {
            if (!name) {
                return null;
            }
            return adapter.modules[name] || null;
        };
    }

    if (typeof adapter.hasModule !== 'function') {
        adapter.hasModule = function(name) {
            return !!adapter.getModule(name);
        };
    }

    function getAdapterModule(name) {
        var module = adapter.getModule ? adapter.getModule(name) : null;
        return module;
    }

    var constants = window.ziweiConstants || {};
    var DEBUG = !!(constants.DEBUG && constants.DEBUG.ADAPTER);
    var REGEX = constants.REGEX || {};
    var NUMERIC_LIMITS = Object.assign({
        LUNAR_YEAR_MIN: 1900,
        LUNAR_YEAR_MAX: 2100
    }, constants.NUMERIC || {});

    function log() {
        if (DEBUG) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[ziweiAdapter]');
            console.log.apply(console, args);
        }
    }

    function warn() {
        if (DEBUG) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[ziweiAdapter]');
            console.warn.apply(console, args);
        }
    }

    function AdapterError(type, message, context, cause) {
        var error = new Error(message || 'Adapter error');
        error.name = 'AdapterError';
        error.type = type || 'ADAPTER_ERROR';
        error.context = context || {};
        error.timestamp = Date.now();
        if (cause) {
            error.cause = cause;
        }
        if (Error.captureStackTrace) {
            Error.captureStackTrace(error, AdapterError);
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
                warn('structuredClone failed, fallback to JSON clone.', err);
            }
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (err2) {
            warn('JSON clone failed, fallback to shallow copy.', err2);
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
        if (!value && value !== 0) {
            return '';
        }
        var normalized = String(value).trim().toUpperCase();
        return normalized === 'M' || normalized === 'F' ? normalized : '';
    }

    function sanitizeName(value) {
        if (typeof value !== 'string') {
            return '無名氏';
        }
        var trimmed = value.trim();
        return trimmed.length ? trimmed : '無名氏';
    }

    function sanitizeText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function normalizeCalendarType(value) {
        var lowered = (value || '').toString().toLowerCase();
        return lowered === 'lunar' ? 'lunar' : 'solar';
    }

    function toBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            var lowered = value.trim().toLowerCase();
            return lowered === '1' || lowered === 'true' || lowered === 'yes';
        }
        return Boolean(value);
    }

    function parseInteger(value, fallback) {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        var num = Number(value);
        return Number.isFinite(num) ? parseInt(num, 10) : fallback;
    }

    function pad2(num) {
        return String(num).padStart(2, '0');
    }

    function buildBirthdate(year, month, day) {
        if (!year || !month || !day) {
            return '';
        }
        return String(year).padStart(4, '0') + '-' + pad2(month) + '-' + pad2(day);
    }

    function buildBirthtime(hour, minute) {
        if (hour === null || hour === undefined || minute === null || minute === undefined) {
            return '';
        }
        return pad2(hour) + ':' + pad2(minute);
    }

    function resolveTimeIndex(hour, minute) {
        var h = parseInteger(hour, 0);
        var m = parseInteger(minute, 0);
        if (!Number.isFinite(h)) {
            h = 0;
        }
        if (!Number.isFinite(m)) {
            m = 0;
        }
        var effectiveHour = h;
        if (m >= 60) {
            effectiveHour = (h + 1) % 24;
        }
        if (effectiveHour >= 23 || effectiveHour < 1) return 0;
        if (effectiveHour >= 1 && effectiveHour < 3) return 1;
        if (effectiveHour >= 3 && effectiveHour < 5) return 2;
        if (effectiveHour >= 5 && effectiveHour < 7) return 3;
        if (effectiveHour >= 7 && effectiveHour < 9) return 4;
        if (effectiveHour >= 9 && effectiveHour < 11) return 5;
        if (effectiveHour >= 11 && effectiveHour < 13) return 6;
        if (effectiveHour >= 13 && effectiveHour < 15) return 7;
        if (effectiveHour >= 15 && effectiveHour < 17) return 8;
        if (effectiveHour >= 17 && effectiveHour < 19) return 9;
        if (effectiveHour >= 19 && effectiveHour < 21) return 10;
        if (effectiveHour >= 21 && effectiveHour < 23) return 11;
        return 0;
    }

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

    function deriveIndices(meta, lunar, solar) {
        var indices = {};
        var basic = getAdapterModule('basic') || {};
        var genderModule = getAdapterModule('gender');

        if (typeof basic.getHeavenlyStemIndex === 'function') {
            indices.yearStemIndex = basic.getHeavenlyStemIndex(lunar.lunarYear);
        }
        if (typeof basic.getEarthlyBranchIndex === 'function') {
            indices.yearBranchIndex = basic.getEarthlyBranchIndex(lunar.lunarYear);
        }
        if (typeof basic.getBasicIndices === 'function') {
            try {
                var result = basic.getBasicIndices(lunar);
                if (result && typeof result === 'object') {
                    if (result.monthIndex !== undefined) indices.monthIndex = result.monthIndex;
                    if (result.timeIndex !== undefined) indices.timeIndex = result.timeIndex;
                }
            } catch (err) {
                warn('getBasicIndices failed', err);
            }
        }
        if (indices.timeIndex === undefined) {
            // 使用 calculator.js 的 getMilitaryHourIndex
            try {
                var calculator = window.ziweiCalculator || {};
                if (typeof calculator.getMilitaryHourIndex === 'function') {
                    // 組合 HH:MM 字串
                    var timeStr = '';
                    if (solar.hour !== undefined && solar.minute !== undefined) {
                        timeStr = String(solar.hour).padStart(2, '0') + ':' + String(solar.minute).padStart(2, '0');
                    }
                    indices.timeIndex = calculator.getMilitaryHourIndex(timeStr);
                } else {
                    indices.timeIndex = resolveTimeIndex(solar.hour, solar.minute);
                }
            } catch (err) {
                warn('getMilitaryHourIndex failed', err);
                indices.timeIndex = resolveTimeIndex(solar.hour, solar.minute);
            }
        }
        if (typeof basic.getBodyPalace === 'function') {
            try {
                indices.bodyPalace = basic.getBodyPalace(lunar.lunarYear);
            } catch (err2) {
                warn('getBodyPalace failed', err2);
            }
        }
        if (typeof basic.getMasterPalace === 'function') {
            try {
                indices.masterPalace = basic.getMasterPalace(lunar.lunarYear);
            } catch (err3) {
                warn('getMasterPalace failed', err3);
            }
        }
        if (genderModule && typeof genderModule.getGenderClassification === 'function') {
            try {
                indices.genderClassification = genderModule.getGenderClassification(meta.gender, lunar.lunarYear);
            } catch (err4) {
                warn('getGenderClassification failed', err4);
            }
        }
        return indices;
    }

    function buildNormalizedInput(rawData) {
        var errors = {};
        var sanitized = {
            gender: normalizeGender(rawData.gender),
            year: parseInteger(rawData.year, null),
            month: parseInteger(rawData.month, null),
            day: parseInteger(rawData.day, null),
            hour: parseInteger(rawData.hour, null),
            minute: parseInteger(rawData.minute, null)
        };

        validateRequiredFields(sanitized, errors);
        validateRegex(sanitized, errors);

        if (sanitized.year && (sanitized.year < NUMERIC_LIMITS.LUNAR_YEAR_MIN || sanitized.year > NUMERIC_LIMITS.LUNAR_YEAR_MAX)) {
            errors.year = '年份需介於 ' + NUMERIC_LIMITS.LUNAR_YEAR_MIN + '-' + NUMERIC_LIMITS.LUNAR_YEAR_MAX;
        }

        if (Object.keys(errors).length > 0) {
            throw AdapterError('INPUT_VALIDATION_FAILED', '輸入資料驗證失敗。', { errors: errors, rawData: deepClone(rawData) });
        }

        var calendarType = normalizeCalendarType(rawData.calendarType);
        var leapMonth = toBoolean(rawData.leapMonth);

        var solar = {
            year: sanitized.year,
            month: sanitized.month,
            day: sanitized.day,
            hour: sanitized.hour,
            minute: sanitized.minute
        };

        var lunar;
        if (calendarType === 'solar') {
            if (typeof solarToLunar !== 'function') {
                throw AdapterError('LUNAR_CONVERTER_MISSING', '找不到農曆轉換函式。');
            }
            try {
                lunar = solarToLunar(solar.year, solar.month, solar.day, solar.hour, solar.minute);
            } catch (convertError) {
                throw AdapterError('LUNAR_CONVERSION_FAILED', '國曆轉農曆失敗。', { solar: deepClone(solar) }, convertError);
            }
        } else if (rawData.lunar && isPlainObject(rawData.lunar)) {
            lunar = Object.assign({}, rawData.lunar);
        }

        lunar = ensureLunarObject(lunar, { solar: deepClone(solar) });
        if (lunar.hour === undefined || lunar.hour === null) {
            lunar.hour = solar.hour;
        }
        if (lunar.minute === undefined || lunar.minute === null) {
            lunar.minute = solar.minute;
        }
        if (lunar.timeIndex === undefined || lunar.timeIndex === null) {
            lunar.timeIndex = resolveTimeIndex(solar.hour, solar.minute);
        }

        var meta = {
            name: sanitizeName(rawData.name),
            gender: sanitized.gender || 'M',
            birthplace: sanitizeText(rawData.birthplace),
            calendarType: calendarType,
            leapMonth: leapMonth
        };

        var strings = {
            birthdate: buildBirthdate(solar.year, solar.month, solar.day),
            birthtime: buildBirthtime(solar.hour, solar.minute)
        };

        var indices = deriveIndices(meta, lunar, solar);

        log('Normalized input meta:', meta);
        log('Normalized lunar data:', lunar);
        log('Derived indices:', indices);

        return {
            meta: meta,
            solar: solar,
            lunar: lunar,
            indices: indices,
            strings: strings,
            raw: deepClone(rawData)
        };
    }

    function mergeMeta(normalized, calcMeta) {
        var meta = Object.assign({}, normalized.meta || {});
        var merged = Object.assign(meta, calcMeta || {});
        if (!merged.name) merged.name = '無名氏';
        if (!merged.gender) merged.gender = normalized.meta.gender || 'M';
        if (!merged.birthdate) merged.birthdate = normalized.strings.birthdate;
        if (!merged.birthtime) merged.birthtime = normalized.strings.birthtime;
        if (!merged.birthplace) merged.birthplace = normalized.meta.birthplace;
        if (!merged.lunar) merged.lunar = normalized.lunar;
        return merged;
    }

    function extractMeta(calcResult) {
        if (!calcResult) {
            return {};
        }
        var payload = calcResult.data || calcResult;
        if (!payload || typeof payload !== 'object') {
            return {};
        }
        var meta = {};
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
        var palacesModule = getAdapterModule('palaces');
        if (!palacesModule || typeof palacesModule.calculatePalacePositions !== 'function') {
            throw AdapterError('MODULE_MISSING', '找不到宮位計算模組。');
        }
        var meta = {
            lunar: context.lunar,
            gender: context.meta.gender
        };
        var result = palacesModule.calculatePalacePositions(meta) || {};
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
        for (var i = 0; i < list.length; i += 1) {
            if (predicate(list[i])) {
                return list[i];
            }
        }
        return null;
    }

    function computeNayinInfo(mingPalace) {
        if (!window.ziweiNayin) {
            return { loci: null, name: '' };
        }
        try {
            var loci = typeof window.ziweiNayin.getNayin === 'function'
                ? window.ziweiNayin.getNayin(mingPalace.stemIndex, mingPalace.index)
                : null;
            var name = loci !== null && typeof window.ziweiNayin.getNayinName === 'function'
                ? window.ziweiNayin.getNayinName(loci)
                : '';
            return { loci: loci, name: name };
        } catch (err) {
            warn('Nayin calculation failed', err);
            return { loci: null, name: '' };
        }
    }

    function computePrimaryStars(context, derived) {
        var primaryModule = getAdapterModule('primary');
        if (!primaryModule || typeof primaryModule.placePrimaryStars !== 'function') {
            throw AdapterError('MODULE_MISSING', '找不到主星計算模組。');
        }
        var chartData = {
            lunarDay: context.lunar.lunarDay,
            nayinLoci: derived.nayin.loci
        };
        var result = primaryModule.placePrimaryStars(chartData);
        if (!result || Object.keys(result).length === 0) {
            throw AdapterError('PRIMARY_STARS_FAILED', '主星計算失敗。', { chartData: chartData });
        }
        return result;
    }

    function computeSecondaryStars(context) {
        var secondaryModule = getAdapterModule('secondary');
        if (!secondaryModule || typeof secondaryModule.calculateAllSecondaryStars !== 'function') {
            throw AdapterError('MODULE_MISSING', '找不到輔星計算模組。');
        }
        var payload = {
            monthIndex: context.indices.monthIndex,
            timeIndex: context.indices.timeIndex,
            stemIndex: context.indices.yearStemIndex,
            branchIndex: context.indices.yearBranchIndex
        };
        var result = secondaryModule.calculateAllSecondaryStars(payload);
        if (!result || Object.keys(result).length === 0) {
            throw AdapterError('SECONDARY_STARS_FAILED', '輔星計算失敗。', { payload: payload });
        }
        return result;
    }

    function computeMutations(context) {
        var mutationsModule = getAdapterModule('mutations');
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
        var minorModule = getAdapterModule('minorStars');
        if (!minorModule || typeof minorModule.calculateMinorStars !== 'function') {
            return null;
        }
        var indices = context.indices;
        var lunar = context.lunar;
        var shenPalaceIndex = derived.shenPalace ? derived.shenPalace.index : null;
        var migrationPalace = findPalace(derived.palaceList, function(item) {
            return item && item.name === '遷移';
        });
        var payload = {
            monthIndex: indices.monthIndex,
            timeIndex: indices.timeIndex,
            yearBranchIndex: indices.yearBranchIndex,
            dayBranchIndex: indices.dayBranchIndex,
            yearStemIndex: indices.yearStemIndex,
            mingPalaceIndex: derived.mingPalace ? derived.mingPalace.index : null,
            shenPalaceIndex: shenPalaceIndex,
            gender: context.meta.gender,
            lunarYear: lunar.lunarYear,
            migrationPalaceIndex: migrationPalace ? migrationPalace.index : null,
            literaryCraftIndex: resolveSecondaryPosition(secondaryStars, '文曲'),
            leftAssistantIndex: resolveSecondaryPosition(secondaryStars, '左輔'),
            rightAssistIndex: resolveSecondaryPosition(secondaryStars, '右弼'),
            literaryTalentIndex: resolveSecondaryPosition(secondaryStars, '文昌'),
            lunarDay: lunar.lunarDay
        };
        try {
            return minorModule.calculateMinorStars(
                payload.monthIndex,
                payload.timeIndex,
                payload.yearBranchIndex,
                payload.dayBranchIndex,
                payload.yearStemIndex,
                payload.mingPalaceIndex,
                payload.shenPalaceIndex,
                payload.gender,
                payload.lunarYear,
                payload.migrationPalaceIndex,
                payload.literaryCraftIndex,
                payload.leftAssistantIndex,
                payload.rightAssistIndex,
                payload.literaryTalentIndex,
                payload.lunarDay
            );
        } catch (err) {
            throw AdapterError('MINOR_STARS_FAILED', '雜曜計算失敗。', { payload: payload }, err);
        }
    }

    function computeAttributes(context, derived, secondaryStars) {
        var attributesModule = getAdapterModule('attributes');
        if (!attributesModule || typeof attributesModule.calculateAllAttributes !== 'function') {
            return null;
        }
        var yearBranchIndex = context.indices.yearBranchIndex;
        var monthIndex = context.indices.monthIndex;
        var luCunIndex = resolveSecondaryPosition(secondaryStars, '祿存');
        var basic = getAdapterModule('basic') || {};
        var isClockwise = true;
        if (typeof basic.isClockwise === 'function') {
            try {
                isClockwise = basic.isClockwise(context.meta.gender, context.lunar.lunarYear);
            } catch (err) {
                warn('isClockwise failed', err);
            }
        }
        try {
            if (luCunIndex !== null && luCunIndex !== undefined) {
                return attributesModule.calculateAllAttributes(yearBranchIndex, luCunIndex, isClockwise);
            }
            return attributesModule.calculateAllAttributes(yearBranchIndex, monthIndex, isClockwise);
        } catch (err2) {
            throw AdapterError('ATTRIBUTES_FAILED', '神煞計算失敗。', { yearBranchIndex: yearBranchIndex, luCunIndex: luCunIndex }, err2);
        }
    }

    function computeLifeCycles(context, derived) {
        var lifeCycleModule = getAdapterModule('lifeCycle');
        if (!lifeCycleModule) {
            return null;
        }
        var payload = {
            nayinLoci: derived.nayin.loci,
            gender: context.meta.gender,
            lunarYear: context.lunar.lunarYear,
            mingPalaceIndex: derived.mingPalace ? derived.mingPalace.index : null
        };
        var result = {};
        if (lifeCycleModule && typeof lifeCycleModule.calculateMajorCycles === 'function') {
            try {
                result.major = lifeCycleModule.calculateMajorCycles(payload.nayinLoci, payload.gender, payload.lunarYear, payload.mingPalaceIndex);
            } catch (err) {
                warn('calculateMajorCycles failed', err);
            }
        }
        if (lifeCycleModule && typeof lifeCycleModule.calculateTwelveLongLifePositions === 'function') {
            try {
                result.twelve = lifeCycleModule.calculateTwelveLongLifePositions(payload.nayinLoci, payload.gender, payload.lunarYear);
            } catch (err2) {
                warn('calculateTwelveLongLifePositions failed', err2);
            }
        }
        return result;
    }

    function computeBrightness(primaryStars, secondaryStars, palaces) {
        var brightness = {
            primary: {},
            secondary: {}
        };
        var brightnessModule = getAdapterModule('brightness');
        if (!brightnessModule) {
            console.warn('[ziweiAdapter] Brightness module not found');
            return brightness;
        }
        try {
            // Use 'shuoshu' (斗數全書) as default brightness school
            // This maps to the brightness table from "紫微斗數全書" in assets/data/brightness.js
            brightness.primary = brightnessModule.calculatePrimaryBrightness(primaryStars, palaces, 'shuoshu') || {};
        } catch (err) {
            warn('calculatePrimaryBrightness failed', err);
        }
        try {
            brightness.secondary = brightnessModule.calculateSecondaryBrightness(secondaryStars, palaces, 'shuoshu') || {};
        } catch (err2) {
            warn('calculateSecondaryBrightness failed', err2);
        }
        return brightness;
    }

    function safeCompute(sectionName, fn, errors, fallback) {
        try {
            return fn();
        } catch (err) {
            var adapterError = isAdapterError(err) ? err : AdapterError('OUTPUT_SECTION_FAILED', '資料轉換失敗：' + sectionName, { section: sectionName }, err);
            errors[sectionName] = adapterError;
            console.error('[ziweiAdapter]', adapterError);
            return fallback;
        }
    }

    function processCalculation(calcResult, normalizedInput) {
        if (!normalizedInput || !normalizedInput.meta) {
            throw AdapterError('INPUT_CONTEXT_REQUIRED', '缺少標準化輸入。');
        }
        var calcMeta = extractMeta(calcResult);
        var context = {
            meta: mergeMeta(normalizedInput, calcMeta),
            lunar: Object.assign({}, normalizedInput.lunar, calcMeta.lunar || {}),
            indices: Object.assign({}, normalizedInput.indices),
            normalized: normalizedInput
        };
        ensureBasicIndex(context, calcMeta);
        var errors = {};

        var palaces = safeCompute('palaces', function() {
            return computePalaces(context);
        }, errors, {});
        var palaceList = toPalaceList(palaces);
        var mingPalace = findPalace(palaceList, function(item) { return item && (item.isMing || item.name === '命宮'); });
        var shenPalace = findPalace(palaceList, function(item) { return item && (item.isShen || item.name === '身宮'); });
        var nayin = mingPalace ? computeNayinInfo(mingPalace) : { loci: null, name: '' };

        var derived = {
            palaces: palaces,
            palaceList: palaceList,
            mingPalace: mingPalace,
            shenPalace: shenPalace,
            nayin: nayin
        };

        var primaryStars = safeCompute('primaryStars', function() {
            return computePrimaryStars(context, derived);
        }, errors, {});

        var secondaryStars = safeCompute('secondaryStars', function() {
            return computeSecondaryStars(context);
        }, errors, {});

        var mutations = safeCompute('mutations', function() {
            return computeMutations(context);
        }, errors, null);

        var minorStars = safeCompute('minorStars', function() {
            return computeMinorStars(context, derived, secondaryStars);
        }, errors, null);

        var attributes = safeCompute('attributes', function() {
            return computeAttributes(context, derived, secondaryStars);
        }, errors, null);

        var lifeCycles = safeCompute('lifeCycles', function() {
            return computeLifeCycles(context, derived);
        }, errors, null);

        var brightness = computeBrightness(primaryStars, secondaryStars, palaces);

        return {
            meta: context.meta,
            lunar: context.lunar,
            indices: context.indices,
            derived: derived,
            sections: {
                palaces: palaces,
                primaryStars: primaryStars,
                secondaryStars: secondaryStars,
                mutations: mutations,
                minorStars: minorStars,
                attributes: attributes,
                lifeCycles: lifeCycles,
                brightness: brightness
            },
            constants: {
                grid: deepClone(constants.GRID_BRANCH_MAP),
                triSquare: deepClone(constants.TRI_SQUARE_MAP)
            },
            errors: errors,
            raw: {
                calculation: calcResult,
                normalizedInput: normalizedInput
            }
        };
    }

    adapter.input = adapter.input || {};
    adapter.output = adapter.output || {};

    adapter.input.normalize = function(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            throw AdapterError('INPUT_INVALID', '原始表單資料格式錯誤。', { rawData: rawData });
        }
        return buildNormalizedInput(rawData);
    };

    adapter.output.process = function(calcResult, normalizedInput) {
        return processCalculation(calcResult, normalizedInput);
    };

    adapter.errors = {
        AdapterError: AdapterError,
        isAdapterError: isAdapterError
    };

    adapter.utils = {
        deepClone: deepClone
    };

    window[GLOBAL_KEY] = adapter;
    log('Data adapter initialized.');
})(window);
