'use strict';

/**
 * Chart rendering module for Ziwei Calculator
 */

/**
 * Convert branch index (0-11) to Chinese character
 * 0=子, 1=丑, 2=寅, 3=卯, 4=辰, 5=巳, 6=午, 7=未, 8=申, 9=酉, 10=戌, 11=亥
 * @param {number} branchIndex The branch index (0-11)
 * @returns {string} The Chinese character for this branch
 */
function branchNumToChar(branchIndex) {
    const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    return branches[branchIndex] || '';
}

/**
 * Convert birth time (HH:MM) to military hour index (0-11)
 * Military hours (十二時辰): 子(23-1), 丑(1-3), 寅(3-5), ... 亥(21-23)
 * Index 0=子, 1=丑, 2=寅, ... 11=亥
 * @param {string} timeStr Birth time in format "HH:MM"
 * @returns {number} Military hour index (0-11), defaults to 0 if invalid
 */
function getMilitaryHourIndex(timeStr) {
    if (!timeStr) return 0;  // Default to 子 (midnight)
    
    const parts = timeStr.split(':');
    const hour = parseInt(parts[0], 10);
    
    if (isNaN(hour)) return 0;
    
    // Convert 24-hour format to 12 military hours
    // 子時: 23-1, 丑時: 1-3, 寅時: 3-5, 卯時: 5-7, 辰時: 7-9, 巳時: 9-11,
    // 午時: 11-13, 未時: 13-15, 申時: 15-17, 酉時: 17-19, 戌時: 19-21, 亥時: 21-23
    
    if (hour === 0 || hour === 23) return 0;  // 子
    if (hour >= 1 && hour < 3) return 1;      // 丑
    if (hour >= 3 && hour < 5) return 2;      // 寅
    if (hour >= 5 && hour < 7) return 3;      // 卯
    if (hour >= 7 && hour < 9) return 4;      // 辰
    if (hour >= 9 && hour < 11) return 5;     // 巳
    if (hour >= 11 && hour < 13) return 6;    // 午
    if (hour >= 13 && hour < 15) return 7;    // 未
    if (hour >= 15 && hour < 17) return 8;    // 申
    if (hour >= 17 && hour < 19) return 9;    // 酉
    if (hour >= 19 && hour < 21) return 10;   // 戌
    if (hour >= 21 && hour < 23) return 11;   // 亥
    
    return 0;  // Default fallback
}

/**
 * Draw a Ziwei chart from API data
 * @param {Object} chartData The chart data from API
 * @returns {HTMLElement} The rendered chart element
 */
function draw(chartData) {
    // Create 4x4 grid where center 2x2 is merged into one large square
    const grid = document.createElement('div');
    grid.className = 'ziwei-4x4-grid';
    grid.style.opacity = '0';
    
    // Get metadata from API response
    const meta = chartData?.data || {};
    
    console.log('Chart draw - Metadata:', meta);
    console.log('Chart draw - Lunar data:', meta.lunar);
    console.log('Chart draw - Gender:', meta.gender);
    
    // Calculate palace positions (Ming Palace, Shen Palace, others)
    let palaceData = {};
    if (window.ziweiPalaces && meta.lunar && meta.gender) {
        console.log('Calculating palace positions...');
        palaceData = window.ziweiPalaces.calculatePalacePositions(meta);
        console.log('Palace calculation complete:', palaceData);
    } else {
        console.warn('Palace calculation skipped - Missing dependencies:', {
            hasPalacesModule: !!window.ziweiPalaces,
            hasLunar: !!meta.lunar,
            hasGender: !!meta.gender
        });
    }
    
    // Calculate primary stars placement
    let primaryStarsData = {};
    if (window.ziweiPrimary && window.ziweiNayin && meta.lunar) {
        try {
            console.log('Calculating primary stars positions...');
            // Get nayin loci from Ming Palace stem and branch
            const mingPalaceData = Object.values(palaceData).find(p => p.isMing);
            if (mingPalaceData) {
                const stemIndex = mingPalaceData.stemIndex;
                const branchIndex = mingPalaceData.index;
                const nayinLoci = window.ziweiNayin.getNayin(stemIndex, branchIndex);
                const lunarDay = meta.lunar.lunarDay;
                
                // Calculate primary stars
                const chartDataForStars = {
                    lunarDay: lunarDay,
                    nayinLoci: nayinLoci
                };
                
                primaryStarsData = window.ziweiPrimary.placePrimaryStars(chartDataForStars);
                console.log('Primary stars calculation complete:', primaryStarsData);
            }
        } catch (e) {
            console.warn('Primary stars calculation failed:', e);
        }
    }
    
    // Calculate life cycles (major cycles and twelve life stages)
    let lifeCycleData = {};
    if (window.ziweiLifeCycle && meta.lunar) {
        try {
            console.log('Calculating life cycles...');
            
            // Get Ming Palace data (where first major cycle starts)
            let mingPalaceIndex = 0;  // Default to palace 0 (子)
            let nayinLoci = null;
            
            if (window.ziweiNayin && palaceData && Object.keys(palaceData).length > 0) {
                try {
                    const mingPalaceData = Object.values(palaceData).find(p => p.isMing);
                    if (mingPalaceData) {
                        mingPalaceIndex = mingPalaceData.index;
                        const stemIndex = mingPalaceData.stemIndex;
                        nayinLoci = window.ziweiNayin.getNayin(stemIndex, mingPalaceIndex);
                        console.log(`Ming Palace: index=${mingPalaceIndex}, nayin=${nayinLoci}`);
                    }
                } catch (e) {
                    console.warn('Ming Palace or Nayin calculation failed:', e);
                }
            }
            
            // Calculate major cycles (starting from Ming Palace, based on nayin loci)
            let majorCycles = [];
            if (nayinLoci) {
                try {
                    majorCycles = window.ziweiLifeCycle.calculateMajorCycles(
                        nayinLoci,
                        meta.gender,
                        meta.lunar.lunarYear,
                        mingPalaceIndex
                    );
                    console.log('Major cycles calculated:', majorCycles);
                } catch (e) {
                    console.warn('Major cycles calculation failed:', e);
                }
            }
            
            // Calculate twelve life stages positions for each palace
            let twelveLongLifePositions = {};
            if (nayinLoci) {
                try {
                    twelveLongLifePositions = window.ziweiLifeCycle.calculateTwelveLongLifePositions(
                        nayinLoci,
                        meta.gender,
                        meta.lunar.lunarYear
                    );
                    console.log('Twelve life stages positions:', twelveLongLifePositions);
                } catch (e) {
                    console.warn('Twelve life stages calculation failed:', e);
                }
            }
            
            lifeCycleData = {
                majorCycles: majorCycles,
                twelveLongLifePositions: twelveLongLifePositions,
                nayinLoci: nayinLoci,
                mingPalaceIndex: mingPalaceIndex
            };
            
            // Create palace index to major cycle mapping for quick lookup
            majorCycles.forEach((cycle) => {
                lifeCycleData[cycle.palaceIndex] = cycle;
            });
            
            console.log('Life cycle calculation complete:', lifeCycleData);
        } catch (e) {
            console.warn('Life cycle calculation failed:', e);
        }
    }
    
    // Get lunar year for use in multiple calculations
    const lunarYear = meta.lunar?.lunarYear;
    
    // Calculate secondary stars (13 auxiliary stars)
    let secondaryStarsData = {};
    if (window.ziweiSecondary && meta.lunar && palaceData && Object.keys(palaceData).length > 0) {
        try {
            console.log('Calculating secondary stars...');
            
            // Get body palace index for secondary star calculations
            let bodyPalaceIndex = 0;  // Default fallback
            
            try {
                // Try to get body palace from stored data
                const bodyPalaceData = Object.values(palaceData).find(p => p.isShen);
                if (bodyPalaceData) {
                    bodyPalaceIndex = bodyPalaceData.index;
                    console.log(`Body Palace index: ${bodyPalaceIndex}`);
                } else {
                    // Fallback: calculate from basic module
                    if (window.ziweiBasic) {
                        const bodyPalaceInfo = window.ziweiBasic.getBodyPalace(lunarYear);
                        bodyPalaceIndex = bodyPalaceInfo.palaceIndex || 0;
                        console.log(`Body Palace (from basic): ${bodyPalaceIndex}`);
                    }
                }
            } catch (e) {
                console.warn('Body palace determination failed, using default:', e);
            }
            
            // Get month and time indices from birth data
            const monthIndex = meta.lunar.lunarMonth - 1;  // Convert to 0-based
            const timeIndex = getMilitaryHourIndex(meta.birthtime);  // Convert time to hour index (0-11)
            
            // Get heavenly stem and earthly branch indices from ziweiBasic
            const stemIndex = window.ziweiBasic.getHeavenlyStemIndex(lunarYear);
            const branchIndex = window.ziweiBasic.getEarthlyBranchIndex(lunarYear);
            
            // Calculate all secondary stars
            const secondaryStarsInput = {
                monthIndex: monthIndex,
                timeIndex: timeIndex,
                stemIndex: stemIndex,
                branchIndex: branchIndex
            };
            
            console.log('Secondary stars input:', secondaryStarsInput);
            
            secondaryStarsData = window.ziweiSecondary.calculateAllSecondaryStars(secondaryStarsInput);
            console.log('Secondary stars calculation complete:', secondaryStarsData);
        } catch (e) {
            console.warn('Secondary stars calculation failed:', e);
        }
    }
    
    // Calculate birth year four mutations (生年四化 / birth-year-mutation)
    let mutationsData = null;
    if (window.ziweiMutations && lunarYear) {
        try {
            console.log('Calculating birth year mutations...');
            
            // Get heavenly stem index from lunar year
            const stemIndex = window.ziweiBasic.getHeavenlyStemIndex(lunarYear);
            
            // Calculate four mutations based on birth year stem
            mutationsData = window.ziweiMutations.calculateBirthYearMutations(stemIndex);
            console.log('Birth year mutations calculation complete:', mutationsData);
        } catch (e) {
            console.warn('Mutations calculation failed:', e);
            console.error(e);
        }
    } else {
        console.warn('Mutations calculation skipped:', {
            hasMutationsModule: !!window.ziweiMutations,
            hasLunarYear: !!lunarYear
        });
    }
    
    // Calculate minor stars (雜曜)
    let minorStarsData = {};
    if (window.ziweiMinorStars && meta.lunar) {
        try {
            console.log('Calculating minor stars positions...');
            
            // Get required indices for minor stars calculation
            const monthIndex = meta.lunar.lunarMonth - 1; // Convert to 0-based index
            const timeIndex = getMilitaryHourIndex(meta.birthtime);
            const lunarYear = meta.lunar.lunarYear;
            const yearBranchIndex = window.ziweiBasic.getEarthlyBranchIndex(lunarYear);
            const yearStemIndex = window.ziweiBasic.getHeavenlyStemIndex(lunarYear);
            
            // For day branch, we need the lunar day
            const lunarDay = meta.lunar.lunarDay;
            const dayBranchIndex = (lunarDay - 1) % 12; // Simple calculation, may need refinement
            
            // Get Ming Palace, Shen Palace, and Migration Palace indices
            const mingPalaceData = Object.values(palaceData).find(p => p.isMing);
            const shenPalaceData = Object.values(palaceData).find(p => p.isShen);
            const migrationPalaceData = Object.values(palaceData).find(p => p.name === '遷移');
            
            const mingPalaceIndex = mingPalaceData ? mingPalaceData.index : 0;
            const shenPalaceIndex = shenPalaceData ? shenPalaceData.index : 0;
            const migrationPalaceIndex = migrationPalaceData ? migrationPalaceData.index : (mingPalaceIndex + 6) % 12;
            
            // Get secondary star positions (文曲, 左輔, 右弼, 文昌) from secondary stars data
            const literaryCraftIndex = secondaryStarsData['文曲'] !== undefined ? secondaryStarsData['文曲'] : 0;
            const leftAssistantIndex = secondaryStarsData['左輔'] !== undefined ? secondaryStarsData['左輔'] : 0;
            const rightAssistIndex = secondaryStarsData['右弼'] !== undefined ? secondaryStarsData['右弼'] : 0;
            const literaryTalentIndex = secondaryStarsData['文昌'] !== undefined ? secondaryStarsData['文昌'] : 0;
            
            minorStarsData = window.ziweiMinorStars.calculateMinorStars(
                monthIndex,
                timeIndex,
                yearBranchIndex,
                dayBranchIndex,
                yearStemIndex,
                mingPalaceIndex,
                shenPalaceIndex,
                meta.gender,
                lunarYear,
                migrationPalaceIndex,
                literaryCraftIndex,
                leftAssistantIndex,
                rightAssistIndex,
                literaryTalentIndex,
                lunarDay
            );
            console.log('Minor stars calculation complete:', minorStarsData);
        } catch (e) {
            console.warn('Minor stars calculation failed:', e);
            console.error(e);
        }
    } else {
        console.warn('Minor stars calculation skipped:', {
            hasMinorStarsModule: !!window.ziweiMinorStars,
            hasLunar: !!meta.lunar
        });
    }
    
    // Add all 12 palace cells (skip center positions)
    for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 4; col++) {
            if ((row === 2 || row === 3) && (col === 2 || col === 3)) continue; // Skip center
            grid.appendChild(createPalaceCell(row, col, palaceData, primaryStarsData, secondaryStarsData, lifeCycleData, mutationsData, minorStarsData));
        }
    }

    // Append center cell (spanning 2x2) - pass palaceData directly
    grid.appendChild(createCenterCell(meta, palaceData));

    // Fade-in effect
    requestAnimationFrame(() => {
        grid.style.transition = 'opacity 300ms ease';
        requestAnimationFrame(() => {
            grid.style.opacity = '1';
        });
    });

    return grid;
}

/**
 * Create the large center cell
 * @param {Object} meta Metadata about the person
 * @param {Object} palaceData Palace position mapping from calculatePalacePositions
 * @returns {HTMLElement} The center cell element
 */
function createCenterCell(meta, palaceData = {}) {
    const cell = document.createElement('div');
    cell.className = 'ziwei-center-big';
    // Apply inline styles to ensure theme CSS cannot override these critical visual properties
    cell.style.background = '#f6f8fb';
    cell.style.display = 'flex';
    cell.style.flexDirection = 'column';
    cell.style.justifyContent = 'center';
    cell.style.alignItems = 'flex-start';

    // left-aligned container inside center cell
    const left = document.createElement('div');
    left.className = 'ziwei-center-left';

    // Name and Gender Classification row
    const nameGenderRow = document.createElement('div');
    nameGenderRow.className = 'ziwei-name-gender-row';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'ziwei-name';
    nameEl.textContent = meta.name || '';

    // Calculate gender classification (陽男/陰男/陽女/陰女)
    let genderClassEl = null;
    if (meta.lunar && window.ziweiGender) {
        const classification = window.ziweiGender.getGenderClassification(
            meta.gender,
            meta.lunar.lunarYear
        );
        genderClassEl = document.createElement('div');
        genderClassEl.className = 'ziwei-gender-classification';
        genderClassEl.textContent = classification;
    }

    // Nayin (納音) Five Elements Loci
    let nayinEl = null;
    if (meta.lunar && window.ziweiNayin && palaceData) {
        try {
            // Get Ming Palace stem and branch from palaceData parameter
            const mingPalaceData = Object.values(palaceData).find(p => p.isMing);
            
            if (mingPalaceData) {
                const stemIndex = mingPalaceData.stemIndex;
                const branchIndex = mingPalaceData.index;
                
                // Get the loci number
                const loci = window.ziweiNayin.getNayin(stemIndex, branchIndex);
                const lociName = window.ziweiNayin.getNayinName(loci);
                
                nayinEl = document.createElement('div');
                nayinEl.className = 'ziwei-nayin';
                nayinEl.textContent = lociName;
                
                if (window.ziweiCalData?.env?.isDebug) {
                    console.log(`Nayin calculation: stem=${stemIndex}, branch=${branchIndex}, loci=${loci}, name=${lociName}`);
                }
            } else {
                console.warn('Ming Palace not found in palaceData');
            }
        } catch (e) {
            console.warn('Nayin calculation failed:', e);
        }
    } else {
        if (window.ziweiCalData?.env?.isDebug) {
            console.log('Nayin calculation skipped:', {
                hasLunar: !!meta.lunar,
                hasNayin: !!window.ziweiNayin,
                hasPalaceData: !!palaceData
            });
        }
    }

    // Add all elements to the same row
    nameGenderRow.appendChild(nameEl);
    if (genderClassEl) {
        nameGenderRow.appendChild(genderClassEl);
    }
    if (nayinEl) {
        nameGenderRow.appendChild(nayinEl);
    }
    
    left.appendChild(nameGenderRow);
    
    // Format Gregorian date and time display
    const whenEl = document.createElement('div');
    whenEl.className = 'ziwei-datetime';
    const gregDate = meta.birthdate || '';
    const gregTime = meta.birthtime || '';
    const [year, month, day] = gregDate.split('-').map(v => parseInt(v, 10));
    const [hour, minute] = gregTime.split(':').map(v => parseInt(v, 10));
    const gregText = (year && month && day) 
        ? `西曆：${year}年${month}月${day}日${hour || 0}時${minute || 0}分`
        : `西曆：${gregDate} ${gregTime}`;
    whenEl.textContent = gregText;

    // Get lunar date from API response (already converted by backend)
    let lunarStr = '';
    const lunarData = meta.lunar;
    
    if (lunarData) {
        try {
            lunarStr = formatLunar(lunarData);
        } catch (e) {
            console.warn('Lunar formatting failed:', e);
            lunarStr = '';
        }
    } else if (window.ziweiCalData?.isDebug) {
        console.warn('No lunar data in API response', { meta });
    }

    // Lunar display element (always show — if conversion failed show placeholder)
    const lunarEl = document.createElement('div');
    lunarEl.className = 'ziwei-datetime ziwei-lunar';
    lunarEl.textContent = lunarStr ? (`農曆：${lunarStr}`) : '農曆：查無資料';

    // Master and Body Palace information
    let masterBodyEl = null;
    if (meta.lunar && window.ziweiBasic) {
        try {
            const lunarYear = meta.lunar.lunarYear;
            const masterPalace = window.ziweiBasic.getMasterPalace(lunarYear);
            const bodyPalace = window.ziweiBasic.getBodyPalace(lunarYear);
            
            masterBodyEl = document.createElement('div');
            masterBodyEl.className = 'ziwei-master-body-row';
            
            const masterInfo = document.createElement('span');
            masterInfo.className = 'ziwei-master-info';
            masterInfo.textContent = `命主：${masterPalace.starName}`;
            
            const bodyInfo = document.createElement('span');
            bodyInfo.className = 'ziwei-body-info';
            bodyInfo.textContent = `身主：${bodyPalace.starName}`;
            
            masterBodyEl.appendChild(masterInfo);
            masterBodyEl.appendChild(bodyInfo);
            
            if (window.ziweiCalData?.env?.isDebug) {
                console.log('Master and Body Palaces:', { masterPalace, bodyPalace });
            }
        } catch (e) {
            console.warn('Master/Body palace calculation failed:', e);
        }
    }

    // Append elements into left container in order (name + gender on top-left)
    left.appendChild(whenEl);
    left.appendChild(lunarEl);
    if (masterBodyEl) {
        left.appendChild(masterBodyEl);
    }

    cell.appendChild(left);

    return cell;
}

/**
 * Format lunar object into Chinese string
 * Frontend uses local LunarSolarConverter (1900-2100)
 * Returns format: { year: "癸卯年，兔", date: "二月初十", lunarYear, lunarMonth, lunarDay, ... }
 * Example output: 癸卯年二月初十午時
 */
function formatLunar(lunar) {
    if (!lunar) return '';
    
    // Check if using new format with string year and date
    if (typeof lunar.year === 'string' && typeof lunar.date === 'string') {
        // Format: { year: "癸卯年，兔", date: "二月初十", ... }
        const yearPart = lunar.year.split('，')[0]; // Extract "癸卯年" from "癸卯年，兔"
        const datePart = lunar.date;
        const hourPart = (lunar.hour !== undefined && lunar.hour !== null) ? hourToChinese(lunar.hour) : '';
        
        return `${yearPart}${datePart}${hourPart}`;
    }
    
    // Fallback for numeric format
    if (typeof lunar.year === 'number' && lunar.month && lunar.day) {
        const { year, month, day, isLeapMonth, hour } = lunar;
        const gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const stemIndex = (year - 4) % 10;
        const branchIndex = (year - 4) % 12;
        const yearName = `${gan[(stemIndex+10)%10]}${zhi[(branchIndex+12)%12]}年`;
        const monthName = (isLeapMonth ? '閏' : '') + chineseNumber(month) + '月';
        const dayName = formatLunarDay(day);
        const hourName = (hour !== undefined && hour !== null) ? hourToChinese(hour) : '';
        
        return `${yearName}${monthName}${dayName}${hourName}`;
    }
    
    return '';
}

function chineseNumber(n) {
    const nums = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二'];
    return nums[n] || String(n);
}

function formatLunarDay(d) {
    // Rules: 20 -> 二十, 21-29 -> 廿一..廿九, 30 -> 三十. No '日' suffix.
    if (d === 20) return '二十';
    if (d >= 21 && d <= 29) return '廿' + chineseNumber(d - 20);
    if (d === 30) return '三十';
    // For 1-19 use standard Chinese numerals without '日'
    if (d <= 10) return chineseNumber(d);
    return chineseNumber(d);
}

function hourToChinese(hour) {
    // Map hour (0-23) to traditional 12 double-hour names (子-亥)
    const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const index = hour >= 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
    return branches[index] + '時';
}

/**
 * Create a palace cell for the chart
 * @param {number} row Row number (1-4)
 * @param {number} col Column number (1-4)
 * @param {Object} palaceData Palace position mapping from calculatePalacePositions
 * @param {Object} primaryStarsData Primary stars positions from placePrimaryStars
 * @param {Object} secondaryStarsData Secondary stars positions from calculateAllSecondaryStars
 * @param {Object} lifeCycleData Life cycle information for all 12 palaces
 * @param {Object} mutationsData Four mutations data from calculateBirthYearMutations
 * @param {Object} minorStarsData Minor stars positions from calculateMinorStars
 * @returns {HTMLElement} The palace cell element
 */
function createPalaceCell(row, col, palaceData = {}, primaryStarsData = {}, secondaryStarsData = {}, lifeCycleData = {}, mutationsData = null, minorStarsData = {}) {
    const cell = document.createElement('div');
    cell.className = 'ziwei-cell';
    cell.style.gridColumnStart = String(col);
    cell.style.gridRowStart = String(row);
    
    // Branch mapping for 4x4 grid (0-11 encoding, -1 for center)
    const branchMap = [
        [5,  6,  7,  8],  // row 1: 巳  午   未  申
        [4, -1, -1,  9],  // row 2: 辰 [中] [中] 酉
        [3, -1, -1, 10],  // row 3: 卯 [中] [中] 戌
        [2,  1,  0, 11]   // row 4: 寅  丑   子  亥
    ];
    
    const branchIndex = branchMap[row - 1]?.[col - 1];
    if (branchIndex >= 0) {
        // Add palace name and stem-branch together in bottom-right corner
        if (Object.keys(palaceData).length > 0) {
            const palace = palaceData[branchIndex];
            
            if (palace) {
                console.log(`Branch ${branchIndex} - Palace found:`, palace);
                console.log(`Stem: "${palace.stem}", Branch: "${palace.branchZhi}"`);
                
                // Create a unified container for both primary and secondary stars at the top
                const starsContainer = document.createElement('div');
                starsContainer.className = 'ziwei-stars-container';
                
                // Add primary stars (with mutations if applicable)
                for (const [starName, starPalaceIndex] of Object.entries(primaryStarsData)) {
                    // starPalaceIndex can be either a direct number or an object with palaceIndex property
                    const palaceIdx = typeof starPalaceIndex === 'number' ? starPalaceIndex : starPalaceIndex?.palaceIndex;
                    
                    if (palaceIdx === branchIndex) {
                        // Check if this star has a mutation
                        const mutationType = mutationsData ? window.ziweiMutations.getMutationForStar(starName, mutationsData) : null;
                        
                        console.log(`Star: ${starName}, Palace: ${palaceIdx}, Mutation: ${mutationType}`);
                        
                        const starGroupEl = document.createElement('div');
                        starGroupEl.className = 'ziwei-star-mutation-group';
                        
                        if (mutationType) {
                            starGroupEl.classList.add('ziwei-star-with-mutation');
                        } else {
                            starGroupEl.classList.add('ziwei-star-no-mutation');
                        }

                        // Add the star (left side)
                        const starEl = document.createElement('span');
                        starEl.className = 'ziwei-primary-star';
                        starEl.textContent = starName;
                        starGroupEl.appendChild(starEl);

                        if (mutationType) {
                            console.log(`Adding mutation ${mutationType} to star ${starName}`);

                            // Create mutations wrapper for stacking on the right
                            const mutationsWrapper = document.createElement('div');
                            mutationsWrapper.className = 'ziwei-mutations-wrapper';

                            // Add the mutation
                            const mutationEl = document.createElement('span');
                            mutationEl.className = 'ziwei-mutation ziwei-mutation-birth';
                            mutationEl.textContent = mutationType;
                            mutationsWrapper.appendChild(mutationEl);

                            starGroupEl.appendChild(mutationsWrapper);
                        }

                        starsContainer.appendChild(starGroupEl);
                    }
                }
                
                // Add secondary stars to the same container (with mutations if applicable)
                for (const [starName, starPalaceIndex] of Object.entries(secondaryStarsData)) {
                    // starPalaceIndex can be either a direct number or an object with palaceIndex property
                    const palaceIdx = typeof starPalaceIndex === 'number' ? starPalaceIndex : starPalaceIndex?.palaceIndex;
                    
                    if (palaceIdx === branchIndex) {
                        // Check if this star has a mutation
                        const mutationType = mutationsData ? window.ziweiMutations.getMutationForStar(starName, mutationsData) : null;
                        
                        console.log(`Secondary Star: ${starName}, Palace: ${palaceIdx}, Mutation: ${mutationType}`);
                        
                        const starGroupEl = document.createElement('div');
                        starGroupEl.className = 'ziwei-star-mutation-group';
                        
                        if (mutationType) {
                            starGroupEl.classList.add('ziwei-star-with-mutation');
                        } else {
                            starGroupEl.classList.add('ziwei-star-no-mutation');
                        }

                        // Add the star (left side)
                        const starEl = document.createElement('span');
                        starEl.className = 'ziwei-secondary-star';
                        starEl.textContent = starName;
                        starGroupEl.appendChild(starEl);

                        if (mutationType) {
                            console.log(`Adding mutation ${mutationType} to secondary star ${starName}`);

                            // Create mutations wrapper for stacking on the right
                            const mutationsWrapper = document.createElement('div');
                            mutationsWrapper.className = 'ziwei-mutations-wrapper';

                            // Add the mutation
                            const mutationEl = document.createElement('span');
                            mutationEl.className = 'ziwei-mutation ziwei-mutation-birth';
                            mutationEl.textContent = mutationType;
                            mutationsWrapper.appendChild(mutationEl);

                            starGroupEl.appendChild(mutationsWrapper);
                        }

                        starsContainer.appendChild(starGroupEl);
                    }
                }
                
                if (starsContainer.children.length > 0) {
                    cell.appendChild(starsContainer);
                }
                
                // Add minor stars (雜曜) on the left side, vertically centered
                if (Object.keys(minorStarsData).length > 0) {
                    const minorStarsContainer = document.createElement('div');
                    minorStarsContainer.className = 'ziwei-minor-stars-container';
                    
                    for (const [starName, starPalaceIndex] of Object.entries(minorStarsData)) {
                        // Check if star appears in this palace
                        // starPalaceIndex can be a single number or an array (for stars like 截空)
                        const isInThisPalace = Array.isArray(starPalaceIndex) 
                            ? starPalaceIndex.includes(branchIndex)
                            : starPalaceIndex === branchIndex;
                        
                        if (isInThisPalace) {
                            const minorStarEl = document.createElement('div');
                            minorStarEl.className = 'ziwei-minor-star';
                            minorStarEl.textContent = starName;
                            minorStarsContainer.appendChild(minorStarEl);
                            console.log(`Minor star "${starName}" placed at palace ${branchIndex}`);
                        }
                    }
                    
                    if (minorStarsContainer.children.length > 0) {
                        cell.appendChild(minorStarsContainer);
                    }
                }
                
                // Create a container for palace name and stem-branch (vertical writing)
                const palaceContainer = document.createElement('div');
                palaceContainer.className = 'ziwei-palace-container';
                
                // Add palace name with vertical writing
                const nameEl = document.createElement('div');
                nameEl.className = 'ziwei-palace-name';
                nameEl.textContent = palace.name;
                console.log(`Palace name: "${palace.name}"`);
                
                // Add stem-branch character (e.g., "己巳") with vertical writing (smaller)
                const stemBranchEl = document.createElement('div');
                stemBranchEl.className = 'ziwei-palace-branch';
                // Format: stem + branch (e.g., "己" + "巳" = "己巳")
                const stemBranchText = (palace.stem || '') + (palace.branchZhi || branchNumToChar(branchIndex));
                stemBranchEl.textContent = stemBranchText;
                console.log(`Stem-Branch display text: "${stemBranchText}"`);
                
                // Add in order: stem-branch, then name (so stem-branch appears on right)
                palaceContainer.appendChild(stemBranchEl);
                palaceContainer.appendChild(nameEl);
                cell.appendChild(palaceContainer);
                
                // Add life cycle information below palace cell
                if (branchIndex >= 0 && Object.keys(lifeCycleData).length > 0) {
                    const lifeCycleContainer = document.createElement('div');
                    lifeCycleContainer.className = 'ziwei-life-cycle-container';
                    
                    // Display major cycle (age range) - indexed by palace index
                    if (lifeCycleData[branchIndex]) {
                        const cycle = lifeCycleData[branchIndex];
                        const majorCycleEl = document.createElement('div');
                        majorCycleEl.className = 'ziwei-major-cycle';
                        majorCycleEl.textContent = cycle.ageRange;
                        lifeCycleContainer.appendChild(majorCycleEl);
                        console.log(`Major cycle for palace ${branchIndex}:`, cycle);
                    }
                    
                    // Display twelve life stage (based on nayin loci)
                    if (lifeCycleData.twelveLongLifePositions && 
                        lifeCycleData.twelveLongLifePositions[branchIndex]) {
                        const lifeStage = lifeCycleData.twelveLongLifePositions[branchIndex];
                        const lifeStageEl = document.createElement('div');
                        lifeStageEl.className = 'ziwei-life-stage';
                        lifeStageEl.textContent = lifeStage;
                        lifeCycleContainer.appendChild(lifeStageEl);
                        console.log(`Twelve life stage for palace ${branchIndex}:`, lifeStage);
                    }
                    
                    if (lifeCycleContainer.children.length > 0) {
                        cell.appendChild(lifeCycleContainer);
                    }
                }
                
                // Mark Ming Palace with CSS class
                if (palace.isMing) {
                    cell.classList.add('ziwei-palace-ming');
                }
                
                // Mark Shen Palace with CSS class
                if (palace.isShen) {
                    cell.classList.add('ziwei-palace-shen');
                }
            } else {
                console.warn(`Branch ${branchIndex} - No palace data found`);
                // Fallback: just show branch character
                const branchEl = document.createElement('div');
                branchEl.className = 'ziwei-palace-branch';
                branchEl.textContent = branchNumToChar(branchIndex);
                cell.appendChild(branchEl);
            }
        } else {
            console.warn('palaceData is empty');
            // Fallback: just show branch character if no palace data
            const branchEl = document.createElement('div');
            branchEl.className = 'ziwei-palace-branch';
            branchEl.textContent = branchNumToChar(branchIndex);
            cell.appendChild(branchEl);
        }
    }
    
    return cell;
}

// Expose public API
window.ziweiChart = {
    draw
};
