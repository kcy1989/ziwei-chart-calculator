/**
 * Lunar Calendar Converter
 * Source: https://github.com/isee15/Lunar-Solar-Calendar-Converter
 * License: MIT
 * Supports: 1900-2100
 */

function Lunar() {
    this.isleap = false;
    this.lunarDay = 0;
    this.lunarMonth = 0;
    this.lunarYear = 0;
}

function Solar() {
    this.solarDay = 0;
    this.solarMonth = 0;
    this.solarYear = 0;
}

function LunarSolarConverter() {
    /*
     * |----4位閏月|-------------13位1為30天，0為29天|
     */
    this.lunar_month_days = [1887, 0x1694, 0x16aa, 0x4ad5,
        0xab6, 0xc4b7, 0x4ae, 0xa56, 0xb52a, 0x1d2a, 0xd54, 0x75aa, 0x156a,
        0x1096d, 0x95c, 0x14ae, 0xaa4d, 0x1a4c, 0x1b2a, 0x8d55, 0xad4,
        0x135a, 0x495d, 0x95c, 0xd49b, 0x149a, 0x1a4a, 0xbaa5, 0x16a8,
        0x1ad4, 0x52da, 0x12b6, 0xe937, 0x92e, 0x1496, 0xb64b, 0xd4a,
        0xda8, 0x95b5, 0x56c, 0x12ae, 0x492f, 0x92e, 0xcc96, 0x1a94,
        0x1d4a, 0xada9, 0xb5a, 0x56c, 0x726e, 0x125c, 0xf92d, 0x192a,
        0x1a94, 0xdb4a, 0x16aa, 0xad4, 0x955b, 0x4ba, 0x125a, 0x592b,
        0x152a, 0xf695, 0xd94, 0x16aa, 0xaab5, 0x9b4, 0x14b6, 0x6a57,
        0xa56, 0x1152a, 0x1d2a, 0xd54, 0xd5aa, 0x156a, 0x96c, 0x94ae,
        0x14ae, 0xa4c, 0x7d26, 0x1b2a, 0xeb55, 0xad4, 0x12da, 0xa95d,
        0x95a, 0x149a, 0x9a4d, 0x1a4a, 0x11aa5, 0x16a8, 0x16d4, 0xd2da,
        0x12b6, 0x936, 0x9497, 0x1496, 0x1564b, 0xd4a, 0xda8, 0xd5b4,
        0x156c, 0x12ae, 0xa92f, 0x92e, 0xc96, 0x6d4a, 0x1d4a, 0x10d65,
        0xb58, 0x156c, 0xb26d, 0x125c, 0x192c, 0x9a95, 0x1a94, 0x1b4a,
        0x4b55, 0xad4, 0xf55b, 0x4ba, 0x125a, 0xb92b, 0x152a, 0x1694,
        0x96aa, 0x15aa, 0x12ab5, 0x974, 0x14b6, 0xca57, 0xa56, 0x1526,
        0x8e95, 0xd54, 0x15aa, 0x49b5, 0x96c, 0xd4ae, 0x149c, 0x1a4c,
        0xbd26, 0x1aa6, 0xb54, 0x6d6a, 0x12da, 0x1695d, 0x95a, 0x149a,
        0xda4b, 0x1a4a, 0x1aa4, 0xbb54, 0x16b4, 0xada, 0x495b, 0x936,
        0xf497, 0x1496, 0x154a, 0xb6a5, 0xda4, 0x15b4, 0x6ab6, 0x126e,
        0x1092f, 0x92e, 0xc96, 0xcd4a, 0x1d4a, 0xd64, 0x956c, 0x155c,
        0x125c, 0x792e, 0x192c, 0xfa95, 0x1a94, 0x1b4a, 0xab55, 0xad4,
        0x14da, 0x8a5d, 0xa5a, 0x1152b, 0x152a, 0x1694, 0xd6aa, 0x15aa,
        0xab4, 0x94ba, 0x14b6, 0xa56, 0x7527, 0xd26, 0xee53, 0xd54,
        0x15aa, 0xa9b5, 0x96c, 0x14ae, 0x8a4e, 0x1a4c, 0x11d26, 0x1aa4,
        0x1b54, 0xcd6a, 0xada, 0x95c, 0x949d, 0x149a, 0x1a2a, 0x5b25,
        0x1aa4, 0xfb52, 0x16b4, 0xaba, 0xa95b, 0x936, 0x1496, 0x9a4b,
        0x154a, 0x136a5, 0xda4, 0x15ac];

    this.solar_1_1 = [1887, 0xec04c, 0xec23f, 0xec435, 0xec649,
        0xec83e, 0xeca51, 0xecc46, 0xece3a, 0xed04d, 0xed242, 0xed436,
        0xed64a, 0xed83f, 0xeda53, 0xedc48, 0xede3d, 0xee050, 0xee244,
        0xee439, 0xee64d, 0xee842, 0xeea36, 0xeec4a, 0xeee3e, 0xef052,
        0xef246, 0xef43a, 0xef64e, 0xef843, 0xefa37, 0xefc4b, 0xefe41,
        0xf0054, 0xf0248, 0xf043c, 0xf0650, 0xf0845, 0xf0a38, 0xf0c4d,
        0xf0e42, 0xf1037, 0xf124a, 0xf143e, 0xf1651, 0xf1846, 0xf1a3a,
        0xf1c4e, 0xf1e44, 0xf2038, 0xf224b, 0xf243f, 0xf2653, 0xf2848,
        0xf2a3b, 0xf2c4f, 0xf2e45, 0xf3039, 0xf324d, 0xf3442, 0xf3636,
        0xf384a, 0xf3a3d, 0xf3c51, 0xf3e46, 0xf403b, 0xf424e, 0xf4443,
        0xf4638, 0xf484c, 0xf4a3f, 0xf4c52, 0xf4e48, 0xf503c, 0xf524f,
        0xf5445, 0xf5639, 0xf584d, 0xf5a42, 0xf5c35, 0xf5e49, 0xf603e,
        0xf6251, 0xf6446, 0xf663b, 0xf684f, 0xf6a43, 0xf6c37, 0xf6e4b,
        0xf703f, 0xf7252, 0xf7447, 0xf763c, 0xf7850, 0xf7a45, 0xf7c39,
        0xf7e4d, 0xf8042, 0xf8254, 0xf8449, 0xf863d, 0xf8851, 0xf8a46,
        0xf8c3b, 0xf8e4f, 0xf9044, 0xf9237, 0xf944a, 0xf963f, 0xf9853,
        0xf9a47, 0xf9c3c, 0xf9e50, 0xfa045, 0xfa238, 0xfa44c, 0xfa641,
        0xfa836, 0xfaa49, 0xfac3d, 0xfae52, 0xfb047, 0xfb23a, 0xfb44e,
        0xfb643, 0xfb837, 0xfba4a, 0xfbc3f, 0xfbe53, 0xfc048, 0xfc23c,
        0xfc450, 0xfc645, 0xfc839, 0xfca4c, 0xfcc41, 0xfce36, 0xfd04a,
        0xfd23d, 0xfd451, 0xfd646, 0xfd83a, 0xfda4d, 0xfdc43, 0xfde37,
        0xfe04b, 0xfe23f, 0xfe453, 0xfe648, 0xfe83c, 0xfea4f, 0xfec44,
        0xfee38, 0xff04c, 0xff241, 0xff436, 0xff64a, 0xff83e, 0xffa51,
        0xffc46, 0xffe3a, 0x10004e, 0x100242, 0x100437, 0x10064b, 0x100841,
        0x100a53, 0x100c48, 0x100e3c, 0x10104f, 0x101244, 0x101438,
        0x10164c, 0x101842, 0x101a35, 0x101c49, 0x101e3d, 0x102051,
        0x102245, 0x10243a, 0x10264e, 0x102843, 0x102a37, 0x102c4b,
        0x102e3f, 0x103053, 0x103247, 0x10343b, 0x10364f, 0x103845,
        0x103a38, 0x103c4c, 0x103e42, 0x104036, 0x104249, 0x10443d,
        0x104651, 0x104846, 0x104a3a, 0x104c4e, 0x104e43, 0x105038,
        0x10524a, 0x10543e, 0x105652, 0x105847, 0x105a3b, 0x105c4f,
        0x105e45, 0x106039, 0x10624c, 0x106441, 0x106635, 0x106849,
        0x106a3d, 0x106c51, 0x106e47, 0x10703c, 0x10724f, 0x107444,
        0x107638, 0x10784c, 0x107a3f, 0x107c53, 0x107e48];

    this.GetBitInt = function(data, length, shift) {
        return (data & (((1 << length) - 1) << shift)) >> shift;
    };

    // WARNING: Dates before Oct. 1582 are inaccurate
    this.SolarToInt = function(y, m, d) {
        m = (m + 9) % 12;
        y = parseInt(y, 10) - parseInt(m / 10, 10);
        return 365 * y + parseInt(y / 4, 10) - parseInt(y / 100, 10) + parseInt(y / 400, 10) + parseInt((m * 306 + 5) / 10, 10) + (d - 1);
    };

    this.SolarFromInt = function(g) {
        var y = parseInt((10000 * g + 14780) / 3652425, 10);
        var ddd = g - (365 * y + parseInt(y / 4, 10) - parseInt(y / 100, 10) + parseInt(y / 400, 10));
        if (ddd < 0) {
            y--;
            ddd = g - (365 * y + parseInt(y / 4, 10) - parseInt(y / 100, 10) + parseInt(y / 400, 10));
        }
        var mi = parseInt((100 * ddd + 52) / 3060, 10);
        var mm = (mi + 2) % 12 + 1;
        y = y + parseInt((mi + 2) / 12, 10);
        var dd = ddd - parseInt((mi * 306 + 5) / 10, 10) + 1;
        var solar = new Solar();
        solar.solarYear = parseInt(y, 10);
        solar.solarMonth = parseInt(mm, 10);
        solar.solarDay = parseInt(dd, 10);
        return solar;
    };

    this.LunarToSolar = function(lunar) {
        var days = this.lunar_month_days[lunar.lunarYear - this.lunar_month_days[0]];
        var leap = this.GetBitInt(days, 4, 13);
        var offset = 0;
        var loopend = leap;
        if (!lunar.isleap) {
            if (lunar.lunarMonth <= leap || leap == 0) {
                loopend = lunar.lunarMonth - 1;
            } else {
                loopend = lunar.lunarMonth;
            }
        }
        for (var i = 0; i < loopend; i++) {
            offset += this.GetBitInt(days, 1, 12 - i) == 1 ? 30 : 29;
        }
        offset += lunar.lunarDay;

        var solar11 = this.solar_1_1[lunar.lunarYear - this.solar_1_1[0]];
        var y = this.GetBitInt(solar11, 12, 9);
        var m = this.GetBitInt(solar11, 4, 5);
        var d = this.GetBitInt(solar11, 5, 0);

        return this.SolarFromInt(this.SolarToInt(y, m, d) + offset - 1);
    };

    this.SolarToLunar = function(solar) {
        var lunar = new Lunar();
        var index = solar.solarYear - this.solar_1_1[0];
        var data = (solar.solarYear << 9) | (solar.solarMonth << 5) | (solar.solarDay);
        if (this.solar_1_1[index] > data) {
            index--;
        }
        var solar11 = this.solar_1_1[index];
        var y = this.GetBitInt(solar11, 12, 9);
        var m = this.GetBitInt(solar11, 4, 5);
        var d = this.GetBitInt(solar11, 5, 0);
        var offset = this.SolarToInt(solar.solarYear, solar.solarMonth, solar.solarDay) - this.SolarToInt(y, m, d);

        var days = this.lunar_month_days[index];
        var leap = this.GetBitInt(days, 4, 13);

        var lunarY = index + this.solar_1_1[0];
        var lunarM = 1;
        offset += 1;

        for (var i = 0; i < 13; i++) {
            var dm = this.GetBitInt(days, 1, 12 - i) == 1 ? 30 : 29;
            if (offset > dm) {
                lunarM++;
                offset -= dm;
            } else {
                break;
            }
        }
        var lunarD = parseInt(offset, 10);
        lunar.lunarYear = lunarY;
        lunar.lunarMonth = lunarM;
        lunar.isleap = false;
        if (leap != 0 && lunarM > leap) {
            lunar.lunarMonth = lunarM - 1;
            if (lunarM == leap + 1) {
                lunar.isleap = true;
            }
        }

        lunar.lunarDay = lunarD;
        return lunar;
    }
}

/**
 * Convert birth hour to time index (0-11)
 * 子時 = 0, 丑時 = 1, 寅時 = 2, ..., 亥時 = 11
 * 
 * @param {number} hour Birth hour (0-23)
 * @returns {number} Time index (0-11)
 */
function getTimeIndex(hour) {
    // Ensure hour is an integer
    hour = parseInt(hour, 10);
    
    // Map clock hours to Chinese double-hour indices (0-11)
    if (hour >= 23 || hour < 1) return 0;   // 子時 (23-0)
    if (hour >= 1 && hour < 3) return 1;    // 丑時 (1-2)
    if (hour >= 3 && hour < 5) return 2;    // 寅時 (3-4)
    if (hour >= 5 && hour < 7) return 3;    // 卯時 (5-6)
    if (hour >= 7 && hour < 9) return 4;    // 辰時 (7-8)
    if (hour >= 9 && hour < 11) return 5;   // 巳時 (9-10)
    if (hour >= 11 && hour < 13) return 6;  // 午時 (11-12)
    if (hour >= 13 && hour < 15) return 7;  // 未時 (13-14)
    if (hour >= 15 && hour < 17) return 8;  // 申時 (15-16)
    if (hour >= 17 && hour < 19) return 9;  // 酉時 (17-18)
    if (hour >= 19 && hour < 21) return 10; // 戌時 (19-20)
    if (hour >= 21 && hour < 23) return 11; // 亥時 (21-22)

    return 0; // default to 子時
}

/**
 * Convert solar (Gregorian) date to lunar date with Chinese formatting
 * 
 * @param {number} year - Solar year
 * @param {number} month - Solar month (1-12)
 * @param {number} day - Solar day
 * @param {number} hour - Birth hour
 * @param {number} minute - Birth minute
 * @returns {Object|null} Lunar date object or null if conversion fails
 */
function solarToLunar(year, month, day, hour, minute) {
    try {
        // Debug input values to help trace zi-hour adjustments
        try {
            if (typeof console !== 'undefined' && console.log) {
                console.log('[lunar-converter] solarToLunar inputs:', { year: year, month: month, day: day, hour: hour, minute: minute });
            }
        } catch (dbg) {}
        // Validate year range (library supports 1900-2100)
        if (year < 1900 || year > 2100) {
            console.error('Lunar conversion: Year out of range (1900-2100)');
            return null;
        }

        // Create Solar object and parse all inputs as integers
        var solar = new Solar();
        solar.solarYear = parseInt(year);
        solar.solarMonth = parseInt(month);
        solar.solarDay = parseInt(day);
        
        // Parse hour and minute as integers to avoid string comparison issues
        hour = parseInt(hour);
        minute = parseInt(minute);

        // Convert to lunar
        var converter = new LunarSolarConverter();
        var lunar = converter.SolarToLunar(solar);

        if (!lunar) {
            console.error('Lunar conversion failed');
            return null;
        }

        // Get Heavenly Stems and Earthly Branches
        var heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
        var earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        var zodiacAnimals = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

        // Calculate year in Ganzhi (Heavenly Stems and Earthly Branches)
        // Base year is 1864 (甲子年)
        var yearOffset = (lunar.lunarYear - 1864) % 60;
        if (yearOffset < 0) yearOffset += 60;

        var heavenlyStemIndex = yearOffset % 10;
        var earthlyBranchIndex = yearOffset % 12;

        var ganzhiYear = heavenlyStems[heavenlyStemIndex] + earthlyBranches[earthlyBranchIndex];
        var zodiac = zodiacAnimals[earthlyBranchIndex];

        // Format lunar month
        var lunarMonthNames = [
            '正', '二', '三', '四', '五', '六',
            '七', '八', '九', '十', '十一', '十二'
        ];

        var monthIndex = lunar.lunarMonth - 1;
        var lunarMonthStr = '';
        if (monthIndex >= 0 && monthIndex < 12) {
            lunarMonthStr = lunarMonthNames[monthIndex] + '月';
        } else {
            lunarMonthStr = lunar.lunarMonth + '月';
        }

        // Format lunar day
        var dayNames = [
            '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
            '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
            '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
        ];

        var dayIndex = lunar.lunarDay - 1;
        var lunarDayStr = '';
        if (dayIndex >= 0 && dayIndex < 30) {
            lunarDayStr = dayNames[dayIndex];
        } else {
            lunarDayStr = lunar.lunarDay + '日';
        }

        // Format year with animal
        var yearStr = ganzhiYear + '年，' + zodiac;

        // Format date
        var dateStr = lunarMonthStr + lunarDayStr;
        if (lunar.isleap) {
            dateStr = '閏' + dateStr;
        }

        console.log('Lunar conversion success:', yearStr, dateStr);

        // Calculate time index for Ziwei calculations
        var timeIndex = getTimeIndex(hour);

        return {
            year: yearStr,              // e.g., "癸卯年，兔"
            date: dateStr,              // e.g., "二月初十"
            isLeapMonth: lunar.isleap,
            hour: hour,
            minute: minute,
            timeIndex: timeIndex,       // Time index (1-12) for calculations
            lunarYear: lunar.lunarYear,  
            lunarMonth: lunar.lunarMonth,
            lunarDay: lunar.lunarDay
        };

    } catch (error) {
        console.error('Lunar conversion error:', error);
        return null;
    }
}
// Note: External API-based conversion (e.g. Hong Kong Observatory) was removed
// The converter now uses the embedded LunarSolarConverter implementation above
// which supports years 1900-2100 and runs entirely in the browser.
