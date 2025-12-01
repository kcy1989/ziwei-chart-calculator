/**
 * Share and Export System Module
 * Features: PNG/PDF download, social sharing
 * Version: 1.2 (Fix Integration with Control.js)
 *
 * Public API:
 * - window.ziweiShare.downloadPNG()
 * - window.ziweiShare.downloadPDF()
 * - window.ziweiShare.share()
 * - window.ziweiShare.init()
 */

(function () {
  "use strict";

// ==================
// Private Configuration
// ==================  
const MODULE_NAME = "ziwei-share";
  const CAPTURE_TARGET_SELECTORS = [
    ".ziwei-chart-container",
    ".ziwei-4x4-grid"
  ];
  const EXPORT_SCALE = 2;

  let browserSupport = {};
  let isMenuOpen = false;
  let loader;

// ==================
// Browser Support Detection
// ==================  

function checkBrowserSupport() {
    const ua = navigator.userAgent;
    const isIE11 = ua.includes("Trident") && ua.includes("11.0");

    browserSupport = {
      canExportPNG: typeof window.domtoimage !== "undefined" && !isIE11,
      canExportPDF: typeof window.jspdf?.jsPDF !== "undefined" && !isIE11,
      canShare: typeof navigator.share !== "undefined",
      canShareWeb: /iPhone|iPad|Android/.test(ua),
      isUnsupported: isIE11,
    };

    return browserSupport;
  }

// ==================
// File Naming
// ==================  
function getFileName(format, name, date) {
    if (typeof format !== "string") {
      throw new Error("getFileName: format 參數必須是字符串 (png|pdf|json)");
    }

    format = format.toLowerCase();
    if (format !== "png" && format !== "pdf" && format !== "json") {
      throw new Error("getFileName: format 必須為 png、pdf 或 json");
    }

    // date/birth info passed from meta, format: YYYYMMDD_HHMM
    let cleanName = "";
    if (name && typeof name === "string") {
      name = name.trim();
      name = name.replace(/[/\\:*?"<>|]/g, "");
      if (name) {
        cleanName = name;
      }
    }
    let birthStr = "";
    if (date && typeof date === "string") {
      birthStr = date;
    }
    if (!cleanName && !birthStr) {
      return "命盤." + format;
    }
    return cleanName + (birthStr ? "_" + birthStr : "") + "." + format;
  }
// ==================
// PNG Download Implementation
// ==================
/**
 * Mark DOM during export to allow CSS adjustments
 */
  function prepareForExport(node) {
    const className = "ziwei-exporting";
    const targets = [document.documentElement, document.body, node].filter(
      Boolean
    );

    targets.forEach(function (el) {
      el.classList.add(className);
    });

    return function cleanup() {
      targets.forEach(function (el) {
        el.classList.remove(className);
      });
    };
  }
  
  function downloadBlob(blob, fileName) {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function getPixelsFromBase64(base64, width, height) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve(imageData.data);
      };
      img.onerror = () => reject(new Error("圖片處理失敗"));
      img.src = base64;
    });
  }

  async function downloadPNG() {
    let target = null;
    for (const selector of CAPTURE_TARGET_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) {
        target = el;
        break;
      }
    }

    if (!target) {
      alert("找不到命盤元素，無法截圖");
      return;
    }

    if (!window.domtoimage) {
        alert("截圖組件 (dom-to-image) 尚未加載，請刷新頁面重試");
        return;
    }

    const cleanupExport = prepareForExport(target);
    showLoadingState("正在生成 PNG...");

    // 只用 chart meta，沒資料就用預設檔名
    let name = '';
    let birthStr = '';
    const chart = window.ziweiAdapter?.getCurrentChart();
    if (chart && chart.meta) {
      name = chart.meta.name || '';
      let date = chart.meta.birthdate || '';
      let time = chart.meta.birthtime || '';
      if (date && time) {
        const dateNum = date.replace(/[^0-9]/g, '');
        const timeNum = time.replace(/[^0-9]/g, '');
        if (dateNum && timeNum) {
          birthStr = dateNum + '_' + timeNum;
        } else if (dateNum) {
          birthStr = dateNum;
        }
      } else if (date) {
        birthStr = date.replace(/[^0-9]/g, '');
      }
    }

    try {
      const rect = target.getBoundingClientRect();
      const scale = EXPORT_SCALE;
      const width = Math.round(rect.width * scale);
      const height = Math.round(rect.height * scale);

      const dataUrl = await window.domtoimage.toPng(target, {
        bgcolor: "#ffffff",
        width: width,
        height: height,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          left: "0",
          top: "0",
          margin: "0"
        }
      });

      if (window.UPNG) {
        const pixelData = await getPixelsFromBase64(dataUrl, width, height);
        const compressed = window.UPNG.encode([pixelData.buffer], width, height, 256);
        const blob = new Blob([compressed], { type: "image/png" });
        downloadBlob(blob, getFileName("png", name, birthStr));
      } else {
        const link = document.createElement('a');
        link.download = getFileName("png", name, birthStr);
        link.href = dataUrl;
        link.click();
      }

    } catch (err) {
      console.error("PNG Export Error:", err);
      alert("圖片生成失敗: " + (err.message || "未知錯誤"));
    } finally {
      cleanupExport();
      if (loader) loader.style.display = "none";
    }
  }

// ==================
// PDF & Share Implementation (Placeholders)
// ==================  
async function downloadPDF() {
      let target = null;
      for (const selector of CAPTURE_TARGET_SELECTORS) {
          const el = document.querySelector(selector);
          if (el) {
              target = el;
              break;
          }
      }
  
      if (!target) {
          alert("找不到命盤元素，無法生成 PDF");
          return;
      }

      if (!window.domtoimage || !window.jspdf?.jsPDF) {
          alert("PDF 組件尚未加載，請刷新頁面重試");
          return;
      }
  
      const cleanupExport = prepareForExport(target);
      showLoadingState("正在生成 PDF...");
  
      // Use same chart meta as PNG
      let name = '';
      let birthStr = '';
      const chart = window.ziweiAdapter?.getCurrentChart();
      if (chart && chart.meta) {
          name = chart.meta.name || '';
          let date = chart.meta.birthdate || '';
          let time = chart.meta.birthtime || '';
          if (date && time) {
              const dateNum = date.replace(/[^0-9]/g, '');
              const timeNum = time.replace(/[^0-9]/g, '');
              if (dateNum && timeNum) {
                  birthStr = dateNum + '_' + timeNum;
              } else if (dateNum) {
                  birthStr = dateNum;
              }
          } else if (date) {
              birthStr = date.replace(/[^0-9]/g, '');
          }
      }
  
      try {
          const rect = target.getBoundingClientRect();
          const scale = EXPORT_SCALE;
          const width = Math.round(rect.width * scale);
          const height = Math.round(rect.height * scale);

          const dataUrl = await window.domtoimage.toPng(target, {
              bgcolor: "#ffffff",
              width: width,
              height: height,
              style: {
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  left: "0",
                  top: "0",
                  margin: "0"
              }
          });

          const pdf = new window.jspdf.jsPDF('p', 'mm', 'a5');
          const leftMargin = 20;
          const rightMargin = 10;
          const topMargin = 10;
          const bottomMargin = 10;
          const pdfWidth = pdf.internal.pageSize.getWidth() - leftMargin - rightMargin; // left 20mm, right/top/bottom 10mm, content 108x190mm
          const pdfHeight = pdf.internal.pageSize.getHeight() - topMargin - bottomMargin;
          const imgHeight = (pdfWidth * height) / width;

          let imageSrc = dataUrl;
          let revokeUrl = null;
          if (window.UPNG) {
            const pixelData = await getPixelsFromBase64(dataUrl, width, height);
            const compressed = window.UPNG.encode([pixelData.buffer], width, height, 256);
            const blob = new Blob([compressed], { type: "image/png" });
            const optimizedUrl = URL.createObjectURL(blob);
            imageSrc = optimizedUrl;
            revokeUrl = optimizedUrl;
          }

          let positionY = topMargin;
          pdf.addImage(imageSrc, 'PNG', leftMargin, positionY, pdfWidth, imgHeight);
          positionY += imgHeight + 10;

          // Multi-page if needed (unlikely for single chart)
          if (positionY > pdfHeight) {
              pdf.addPage();
              positionY = topMargin;
              pdf.addImage(imageSrc, 'PNG', leftMargin, positionY, pdfWidth, imgHeight);
          }

          if (revokeUrl) {
            URL.revokeObjectURL(revokeUrl);
          }
  
          pdf.save(getFileName("pdf", name, birthStr));
  
      } catch (err) {
          console.error("PDF Export Error:", err);
          alert("PDF 生成失敗: " + (err.message || "未知錯誤"));
      } finally {
          cleanupExport();
          if (loader) loader.style.display = "none";
      }
  }

// ==================
// JSON Download Implementation
// ==================

/**
 * Get stem-branch combination for palace index
 * @param {number} palaceIndex Palace index (0-11)
 * @returns {string} Stem-branch combination (e.g., "甲子")
 */
function getPalaceStemBranch(palaceIndex) {
  const chart = window.ziweiAdapter?.getCurrentChart();
  if (!chart || !chart.palaces || !chart.palaces[palaceIndex]) {
    return '';
  }
  
  const palace = chart.palaces[palaceIndex];
  const stem = palace.stem || '';
  const branch = palace.branch || '';
  return stem + branch;
}

/**
 * Get palace name for palace index
 * @param {number} palaceIndex Palace index (0-11)
 * @returns {string} Palace name (e.g., "命宮")
 */
function getPalaceName(palaceIndex) {
  const palaceNames = window.ziweiPalaceNames?.getPalaceNames?.() || [
    '命宮', '父母', '福德', '田宅', '事業', '交友',
    '遷移', '疾厄', '財帛', '子女', '夫妻', '兄弟'
  ];
  return palaceNames[palaceIndex] || '';
}

/**
 * Get stars for a palace with brightness
 * @param {Object} palace Palace data
 * @returns {Object} Stars with brightness
 */
function getStarsWithBrightness(palace) {
  const brightness = window.ziweiBrightness?.getStarBrightness?.() || {};
  
  return {
    primary: palace.primaryStars?.map(star => ({
      name: star.name,
      brightness: brightness[star.name] || 1.0
    })) || [],
    secondary: palace.secondaryStars?.map(star => ({
      name: star.name,
      brightness: brightness[star.name] || 1.0
    })) || [],
    minor: palace.minorStars?.map(star => ({
      name: star.name,
      brightness: brightness[star.name] || 1.0
    })) || []
  };
}

/**
 * Get mutations for a stem character
 * @param {string} stem Stem character (甲-癸)
 * @returns {Object} Mutations object
 */
function getMutationsForStem(stem) {
  if (!stem) return {};
  
  const mutations = window.ziweiMutations?.getMutations?.(stem) || {};
  return {
    祿: mutations.lu || '',
    權: mutations.quan || '',
    科: mutations.ke || '',
    忌: mutations.ji || ''
  };
}

/**
 * Check if major cycle is active and get its data
 * @returns {Object|null} Major cycle data or null
 */
function getActiveMajorCycle() {
  const activeButton = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
  if (!activeButton) return null;
  
  const cycleIndex = parseInt(activeButton.dataset.cycleIndex, 10);
  const palaceIndex = parseInt(activeButton.dataset.palaceIndex, 10);
  
  const chart = window.ziweiAdapter?.getCurrentChart();
  if (!chart || !chart.lifeCycleData || !chart.lifeCycleData.majorCycles) {
    return null;
  }
  
  const cycle = chart.lifeCycleData.majorCycles.find(c => c.cycleIndex === cycleIndex);
  if (!cycle) return null;
  
  const stemBranch = getPalaceStemBranch(palaceIndex);
  const palaceName = getPalaceName(palaceIndex);
  
  return {
    cycleIndex,
    palaceIndex,
    stemBranch,
    palaceName: `大限${palaceName}`,
    ageRange: cycle.ageRange,
    stars: getStarsWithBrightness(chart.palaces?.[palaceIndex] || {}),
    mutations: getMutationsForStem(stemBranch.charAt(0))
  };
}

/**
 * Check if annual cycle is active and get its data
 * @returns {Object|null} Annual cycle data or null
 */
function getActiveAnnualCycle() {
  const activeButton = document.querySelector('.ziwei-annual-cycle-button.ziwei-cycle-button-active');
  if (!activeButton) return null;
  
  const age = parseInt(activeButton.dataset.age, 10);
  const cycleIndex = parseInt(activeButton.dataset.cycleIndex, 10);
  
  const chart = window.ziweiAdapter?.getCurrentChart();
  if (!chart || !chart.lifeCycleData || !chart.lifeCycleData.majorCycles) {
    return null;
  }
  
  const cycle = chart.lifeCycleData.majorCycles.find(c => c.cycleIndex === cycleIndex);
  if (!cycle) return null;
  
  // Calculate branch index from annual cycle
  const branchIndex = (cycle.palaceIndex + age) % 12;
  const stemBranch = getPalaceStemBranch(branchIndex);
  const palaceName = getPalaceName(branchIndex);
  
  return {
    age,
    cycleIndex,
    branchIndex,
    stemBranch,
    palaceName: `流年${palaceName}`,
    stars: getStarsWithBrightness(chart.palaces?.[branchIndex] || {}),
    mutations: getMutationsForStem(stemBranch.charAt(0))
  };
}

/**
 * Build JSON data structure for export
 * Uses data-adapter.js as single source of truth to match chart.js display
 * @returns {Object} Complete JSON data
 */
function buildExportJSON() {
  const adapter = window.ziweiAdapter;
  if (!adapter) {
    throw new Error('無法取得命盤資料：adapter 不存在');
  }
  
  // Get the same data source as chart.js - adapter.storage.get('adapterOutput')
  const chart = adapter.storage?.get('adapterOutput') ||
                adapter.output?.getLastOutput() ||
                adapter.getCurrentChart();
  
  if (!chart) {
    throw new Error('無法取得命盤資料：請先生成命盤');
  }
  
  // Use ziweiConstants for all constants (same as chart.js)
  const constants = window.ziweiConstants || {};
  const BRANCH_NAMES = constants.BRANCH_NAMES || ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const STEM_NAMES = constants.STEM_NAMES || ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  
  // Get modules from adapter (same as chart.js)
  const basicModule = adapter.getModule('basic');
  const palaceNamesModule = adapter.getModule('palaceNames');
  const mutationsModule = adapter.getModule('mutations');
  const majorCycleModule = adapter.getModule('majorCycleStars');
  const settings = adapter.settings;
  const showBrightness = settings?.get('starBrightness') === 'shuoshu';
  
  // === Dynamic palace name sequence based on user settings (same as cycles.js/chart.js) ===
  let palaceSequenceRaw = palaceNamesModule?.getPalaceNames?.('standard') || 
    ['命宮', '父母', '福德', '田宅', '事業', '交友', '遷移', '疾厄', '財帛', '子女', '夫妻', '兄弟'];
  
  // Apply user palace name preferences (career/friends palaces)
  const careerSetting = settings?.get('palaceNameCareer') || 'career';
  const friendsSetting = settings?.get('palaceNameFriends') || 'friends';
  
  // Career palace: index 4 relative to Ming (事業宮 position)
  if (careerSetting === 'official') {
    palaceSequenceRaw[4] = '官祿';
  }
  
  // Friends palace: index 5 relative to Ming (交友宮 position)
  if (friendsSetting === 'servants') {
    palaceSequenceRaw[5] = '奴僕';
  } else if (friendsSetting === 'servants_alt') {
    palaceSequenceRaw[5] = '僕役';
  }
  
  // Add "宮" suffix to palace names that don't already have it
  const addGongSuffix = (name) => {
    if (!name) return '';
    // Already has 宮 suffix
    if (name.endsWith('宮')) return name;
    // Special cases that should have 宮 suffix
    return name + '宮';
  };
  
  // Helper to convert branch char to index (same as cycles.js branchCharToIndex)
  const branchCharToIndex = (branchChar) => {
    return BRANCH_NAMES.indexOf(branchChar);
  };
  
  // Extract sections (same structure as chart.js uses)
  const { meta = {}, lunar = {}, derived = {}, sections = {}, indices = {} } = chart;
  const { palaces = {}, primaryStars = {}, secondaryStars = {}, minorStars = {}, 
          attributes = {}, lifeCycles = {}, mutations = {}, brightness = {} } = sections;
  
  // Compute mingIndex by finding the Ming Palace (same logic as chart.js)
  let mingIndex = -1;
  for (let j = 0; j < 12; j++) {
    const palace = palaces[j];
    if (palace && palace.isMing) {
      mingIndex = j;
      break;
    }
  }
  if (mingIndex === -1) {
    // Fallback: check derived.mingPalace
    mingIndex = derived.mingPalace?.index ?? 0;
  }
  
  const lunarYear = lunar?.lunarYear || meta?.lunarYear || 0;
  const timeIndex = indices?.timeIndex ?? lunar?.timeIndex ?? 0;
  
  // 命主 & 身主 from basic module
  const mingzhu = basicModule?.getMasterPalace?.(lunarYear)?.starName || '';
  const shenzhu = basicModule?.getBodyPalace?.(lunarYear)?.starName || '';
  
  // Format dates
  const birthdate = meta.birthdate || '';
  const birthtime = meta.birthtime || '';
  const solarTime = birthdate.replace(/(\d{4})-0?(\d{1,2})-0?(\d{1,2})/, '$1年$2月$3日') + 
                    (birthtime ? birthtime.replace(':', '時') + '分' : '');
  
  let lunarDate = meta.birthdateLunarText || lunar.formatted?.full || '';
  // Remove "農曆：" or "農曆:" prefix and normalize
  lunarDate = lunarDate.replace(/^農曆[：:]\s*/i, '');
  const timeName = lunar.formatted?.timeName || '';
  if (timeName && !lunarDate.includes(timeName)) {
    lunarDate += timeName;
  }
  // Remove duplicate time if present
  if (timeName) {
    const escapedTimeName = timeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    lunarDate = lunarDate.replace(new RegExp(escapedTimeName + '\\s*' + escapedTimeName), timeName);
  }
  
  // === Build 基本資料 ===
  const jsonData = {
    "基本資料": {
      "姓名": meta.name || '無名氏',
      "性別": meta.genderClassification || (meta.gender === 'M' ? '男' : '女'),
      "西曆出生時間": solarTime,
      "農曆出生日期": lunarDate,
      "五行局": derived.nayin?.name || '',
      "命主": mingzhu,
      "身主": shenzhu
    },
    "宮位資料": {}
  };
  
  // === Detect active major cycle from DOM (same as chart.js rendering) ===
  const activeMajorBtn = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
  let activeMajorPalaceIndex = null;
  let majorCycleStem = null;
  let majorCycleStemBranch = '';
  let majorCycleMutations = {};
  let majorCycleStars = {};
  let majorCycleAgeRange = '';
  
  if (activeMajorBtn) {
    activeMajorPalaceIndex = parseInt(activeMajorBtn.dataset.palaceIndex, 10);
    const palace = palaces[activeMajorPalaceIndex];
    if (palace) {
      majorCycleStem = palace.stem || '';
      majorCycleStemBranch = (palace.stem || '') + (palace.branchZhi || BRANCH_NAMES[activeMajorPalaceIndex] || '');
      
      // Get major cycle info for age range
      const majorCycleInfo = lifeCycles.major?.find(c => c.palaceIndex === activeMajorPalaceIndex);
      if (majorCycleInfo) {
        majorCycleAgeRange = majorCycleInfo.ageRange || `${majorCycleInfo.startAge}-${majorCycleInfo.endAge}`;
      }
      
      // Get major cycle mutations (same as chart.js applyMajorCycleMutations)
      if (majorCycleStem && mutationsModule?.calculateMajorCycleMutations) {
        const majorMut = mutationsModule.calculateMajorCycleMutations(majorCycleStem);
        majorCycleMutations = majorMut?.byStar || {};
      }
      
      // Get major cycle stars (same as chart.js showMajorCycleStars)
      if (majorCycleModule?.calculateAllMajorCycleStars && majorCycleStem) {
        const stemIndex = majorCycleModule.stemCharToIndex?.(majorCycleStem);
        if (stemIndex !== undefined && stemIndex >= 0) {
          majorCycleStars = majorCycleModule.calculateAllMajorCycleStars(stemIndex, activeMajorPalaceIndex, timeIndex) || {};
        }
      }
    }
    
    // Add 當今大限 to 基本資料: ["甲申限", "55-64歲"]
    jsonData["基本資料"]["當今大限"] = [`${majorCycleStemBranch}限`, `${majorCycleAgeRange}歲`];
  }
  
  // === Detect active annual cycle from DOM ===
  const activeAnnualBtn = document.querySelector('.ziwei-annual-cycle-button.ziwei-cycle-button-active');
  let activeAnnualBranchIndex = null;
  let annualCycleStem = null;
  let annualCycleStemBranch = '';
  let annualCycleMutations = {};
  let annualCycleStars = {};
  let annualYear = '';
  let annualAge = null;
  
  if (activeAnnualBtn) {
    annualAge = parseInt(activeAnnualBtn.dataset.age, 10);
    annualYear = activeAnnualBtn.dataset.year || '';
    
    // Get stemBranch from the button's display text (same source as cycles.js)
    // The button contains: yearSpan (2083年) and stemBranchSpan (癸卯59歲)
    const stemBranchSpan = activeAnnualBtn.querySelector('.ziwei-annual-stem-branch');
    if (stemBranchSpan) {
      const spanText = stemBranchSpan.textContent || '';
      // Extract first two characters (干支)
      if (spanText.length >= 2) {
        annualCycleStemBranch = spanText.substring(0, 2);
        annualCycleStem = spanText.charAt(0);
        const branchChar = spanText.charAt(1);
        // Get branchIndex from the year's branch character (same as cycles.js)
        activeAnnualBranchIndex = branchCharToIndex(branchChar);
      }
    }
    
    if (activeAnnualBranchIndex !== null && activeAnnualBranchIndex >= 0) {
      // Get annual cycle mutations (same as chart.js applyAnnualCycleMutations)
      if (annualCycleStem && mutationsModule?.calculateAnnualCycleMutations) {
        const annualMut = mutationsModule.calculateAnnualCycleMutations(annualCycleStem);
        annualCycleMutations = annualMut?.byStar || {};
      }
      
      // Get annual cycle stars (same as chart.js showAnnualCycleStars)
      // These are 流曜 (流昌, 流曲, etc.) converted from 大昌, 大曲
      if (majorCycleModule?.calculateAllMajorCycleStars && annualCycleStem) {
        const stemIndex = majorCycleModule.stemCharToIndex?.(annualCycleStem);
        if (stemIndex !== undefined && stemIndex >= 0) {
          const rawStars = majorCycleModule.calculateAllMajorCycleStars(stemIndex, activeAnnualBranchIndex, timeIndex) || {};
          // Convert 大XX to 流XX (same transformation as chart.js)
          Object.entries(rawStars).forEach(([starName, palaceIdx]) => {
            const label = starName.startsWith('大') ? starName.replace(/^大/, '流') : `流${starName}`;
            annualCycleStars[label] = palaceIdx;
          });
        }
      }
    }
    
    // Add 當今流年 to 基本資料: ["癸卯", "2083年", "59歲"]
    jsonData["基本資料"]["當今流年"] = [`${annualCycleStemBranch}年`, `${annualYear}年`, `${annualAge}歲`];
  }
  
  // === 四化 mapping ===
  const mutationTypeMap = { '祿': '化祿', '權': '化權', '科': '化科', '忌': '化忌' };
  // Birth year mutations from adapter (same as chart.js mutationBirthLookup)
  const starMutationsBirth = mutations?.byStar || {};
  
  // === Major/Flow cycle star short-to-full name mapping ===
  const STAR_SHORT_TO_FULL = {
    '昌': '文昌',
    '曲': '文曲',
    '魁': '天魁',
    '鉞': '天鉞',
    '祿': '祿存',
    '羊': '擎羊',
    '陀': '陀羅',
    '火': '火星',
    '鈴': '鈴星',
    '馬': '天馬',
    '鸞': '紅鸞',
    '喜': '天喜'
  };
  
  // === Build 宮位資料 for all 12 palaces ===
  for (let i = 0; i < 12; i++) {
    const palace = palaces[i] || {};
    const branchName = BRANCH_NAMES[i];
    const stemBranch = (palace.stem || '') + (palace.branchZhi || BRANCH_NAMES[i]);
    
    // Palace name from sequence (based on position relative to Ming Palace)
    const seqIndex = (i - mingIndex + 12) % 12;
    const baseNameRaw = palaceSequenceRaw[seqIndex] || '';
    const baseName = addGongSuffix(baseNameRaw);
    
    // Build palace names array
    const palaceNames = [baseName];
    if (palace.isShen) {
      palaceNames.push('身宮');
    }
    
    // Add 大限 palace name (using full name with 宮 suffix)
    if (activeMajorPalaceIndex !== null) {
      const majorMingSeqIndex = (i - activeMajorPalaceIndex + 12) % 12;
      if (majorMingSeqIndex < palaceSequenceRaw.length) {
        const majorPalaceBaseNameRaw = palaceSequenceRaw[majorMingSeqIndex];
        palaceNames.push(`大限${addGongSuffix(majorPalaceBaseNameRaw)}`);
      }
    }
    
    // Add 流年 palace name (using correct branchIndex from year's branch)
    if (activeAnnualBranchIndex !== null && activeAnnualBranchIndex >= 0) {
      const annualMingSeqIndex = (i - activeAnnualBranchIndex + 12) % 12;
      if (annualMingSeqIndex < palaceSequenceRaw.length) {
        const annualPalaceBaseNameRaw = palaceSequenceRaw[annualMingSeqIndex];
        palaceNames.push(`流年${addGongSuffix(annualPalaceBaseNameRaw)}`);
      }
    }
    
    // === 主星 with mutations (生年/大限/流年) + brightness ===
    const zhuStars = [];
    Object.entries(primaryStars).forEach(([starName, idx]) => {
      if (idx === i) {
        const starEntry = [starName];
        // 生年四化
        const birthMut = starMutationsBirth[starName];
        if (birthMut && mutationTypeMap[birthMut]) {
          starEntry.push('生年' + mutationTypeMap[birthMut]);
        }
        // 大限四化
        const majorMut = majorCycleMutations[starName];
        if (majorMut && mutationTypeMap[majorMut]) {
          starEntry.push('大限' + mutationTypeMap[majorMut]);
        }
        // 流年四化
        const annualMut = annualCycleMutations[starName];
        if (annualMut && mutationTypeMap[annualMut]) {
          starEntry.push('流年' + mutationTypeMap[annualMut]);
        }
        // Brightness (廟/旺/利/平/墓/閒/陷) if enabled
        if (showBrightness) {
          const brightnessLevel = window.BrightnessDatabase?.getBrightness(starName, i) || '';
          if (brightnessLevel) {
            starEntry.push(brightnessLevel);
          }
        }
        zhuStars.push(starEntry);
      }
    });
    
    // === 輔星 with mutations + brightness ===
    const fuStars = [];
    Object.entries(secondaryStars).forEach(([starName, idx]) => {
      if (idx === i) {
        const starEntry = [starName];
        // 生年四化
        const birthMut = starMutationsBirth[starName];
        if (birthMut && mutationTypeMap[birthMut]) {
          starEntry.push('生年' + mutationTypeMap[birthMut]);
        }
        // 大限四化
        const majorMut = majorCycleMutations[starName];
        if (majorMut && mutationTypeMap[majorMut]) {
          starEntry.push('大限' + mutationTypeMap[majorMut]);
        }
        // 流年四化
        const annualMut = annualCycleMutations[starName];
        if (annualMut && mutationTypeMap[annualMut]) {
          starEntry.push('流年' + mutationTypeMap[annualMut]);
        }
        // Brightness (廟/旺/利/平/墓/閒/陷) if enabled
        if (showBrightness) {
          const brightnessLevel = window.BrightnessDatabase?.getBrightness(starName, i) || '';
          if (brightnessLevel) {
            starEntry.push(brightnessLevel);
          }
        }
        fuStars.push(starEntry);
      }
    });
    
    // === 雜曜 ===
    const zaYao = [];
    Object.entries(minorStars).forEach(([starName, placement]) => {
      const isAtPalace = Array.isArray(placement) ? placement.includes(i) : placement === i;
      if (isAtPalace) zaYao.push(starName);
    });
    
    // === 流曜 (major cycle stars + annual cycle stars) - with full names ===
    const liuYao = [];
    // Major cycle stars (大限星): 大祿 → 大限祿存
    Object.entries(majorCycleStars).forEach(([starName, palaceIdx]) => {
      if (palaceIdx === i) {
        const shortName = starName.slice(1); // Remove '大'
        const fullStarName = STAR_SHORT_TO_FULL[shortName] || shortName;
        liuYao.push(`大限${fullStarName}`);
      }
    });
    // Annual cycle stars (流年星): 流馬 → 流年天馬
    Object.entries(annualCycleStars).forEach(([starName, palaceIdx]) => {
      if (palaceIdx === i) {
        const shortName = starName.slice(1); // Remove '流'
        const fullStarName = STAR_SHORT_TO_FULL[shortName] || shortName;
        liuYao.push(`流年${fullStarName}`);
      }
    });
    
    // === 神煞 - get directly from adapter's attributes (same as chart.js) ===
    // The attributes object from adapter already has palace-indexed array of star names
    const palaceAttrs = attributes[i] || attributes[String(i)] || [];
    
    // Categorize 神煞 into 太歲, 將前, 博士 (each palace gets exactly ONE star per category)
    // Using the same star arrays as defined in attributes.js
    const TAI_SUI_STARS = ['太歲', '晦氣', '喪門', '貫索', '官符', '小耗', '歲破', '龍德', '白虎', '天德', '吊客', '病符'];
    const JIANG_QIAN_STARS = ['將星', '攀鞍', '歲驛', '息神', '華蓋', '劫煞', '災煞', '天煞', '指背', '咸池', '月煞', '亡神'];
    const BO_SHI_STARS = ['博士', '力士', '青龍', '小耗', '將軍', '奏書', '飛廉', '喜神', '病符', '大耗', '伏兵', '官符'];
    
    const shenSha = { "太歲": "", "將前": "", "博士": "" };
    palaceAttrs.forEach(star => {
      if (TAI_SUI_STARS.includes(star) && !shenSha["太歲"]) {
        shenSha["太歲"] = star;
      } else if (JIANG_QIAN_STARS.includes(star) && !shenSha["將前"]) {
        shenSha["將前"] = star;
      } else if (BO_SHI_STARS.includes(star) && !shenSha["博士"]) {
        shenSha["博士"] = star;
      }
    });
    
    // === 十二長生 ===
    const twelveLongLife = lifeCycles.twelve?.[i] || '';
    
    // === 大限資料 ===
    const majorCycle = lifeCycles.major?.find(c => c.palaceIndex === i);
    const daXianStart = majorCycle?.startAge || '';
    const daXianEnd = majorCycle?.endAge || '';
    
    // Build palace data object
    const palaceData = {
      "宮位名稱": palaceNames,
      "天干地支": stemBranch,
      "星曜": {
        "主星": zhuStars,
        "輔星": fuStars,
        "雜曜": zaYao
      },
      "十二長生": twelveLongLife,
      "神煞": shenSha
    };
    
    // Add 流曜 if there are any
    if (liuYao.length > 0) {
      palaceData.星曜["流曜"] = liuYao;
    }
    
    // Add 大限 info if applicable
    if (daXianStart !== '' && daXianEnd !== '') {
      palaceData["大限起始歲數"] = daXianStart;
      palaceData["大限結束歲數"] = daXianEnd;
    }
    
    jsonData.宮位資料[branchName] = palaceData;
  }
  
  return jsonData;
}

async function downloadJSON() {
  showLoadingState("正在生成 JSON...");
  
  try {
    const jsonData = buildExportJSON();
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    
    // Get file name from chart meta
    let name = '';
    let birthStr = '';
    const chart = window.ziweiAdapter?.getCurrentChart();
    if (chart && chart.meta) {
      name = chart.meta.name || '';
      let date = chart.meta.birthdate || '';
      let time = chart.meta.birthtime || '';
      if (date && time) {
        const dateNum = date.replace(/[^0-9]/g, '');
        const timeNum = time.replace(/[^0-9]/g, '');
        if (dateNum && timeNum) {
          birthStr = dateNum + '_' + timeNum;
        } else if (dateNum) {
          birthStr = dateNum;
        }
      } else if (date) {
        birthStr = date.replace(/[^0-9]/g, '');
      }
    }
    
    downloadBlob(blob, getFileName("json", name, birthStr));
    
  } catch (err) {
    console.error("JSON Export Error:", err);
    alert("JSON 生成失敗: " + (err.message || "未知錯誤"));
  } finally {
    hideLoadingState();
  }
}

/**
 * Copy JSON to clipboard in compact format (no indentation, no spaces)
 * Optimized for AI input to minimize token usage
 */
async function copyJSON() {
  try {
    const jsonData = buildExportJSON();
    const jsonString = JSON.stringify(jsonData); // Compact format
    
    await navigator.clipboard.writeText(jsonString);
    
    // Show brief success feedback
    const originalText = event?.target?.textContent || '';
    if (event?.target) {
      event.target.textContent = '已複製!';
      setTimeout(() => {
        event.target.textContent = originalText || '複製 JSON';
      }, 1500);
    } else {
      alert('JSON 已複製到剪貼簿');
    }
    
  } catch (err) {
    console.error("JSON Copy Error:", err);
    alert("複製失敗: " + (err.message || "未知錯誤"));
  }
}

// ==================
// Social Media Sharing Implementation
// ==================

/**
 * Check if device is mobile
 */
function isMobileDevice() {
  return /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
}

/**
 * Generate PNG image with predefined text overlay for social sharing
 */
async function generateSocialShareImage(userName) {
  let target = null;
  for (const selector of CAPTURE_TARGET_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      target = el;
      break;
    }
  }

  if (!target) {
    throw new Error("找不到命盤元素，無法生成分享圖片");
  }

  if (!window.domtoimage) {
    throw new Error("截圖組件尚未加載");
  }

  const cleanupExport = prepareForExport(target);
  
  try {
    const rect = target.getBoundingClientRect();
    const scale = EXPORT_SCALE;
    const width = Math.round(rect.width * scale);
    const height = Math.round(rect.height * scale);

    // Generate base chart image
    const chartDataUrl = await window.domtoimage.toPng(target, {
      bgcolor: "#ffffff",
      width: width,
      height: height,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        left: "0",
        top: "0",
        margin: "0"
      }
    });

    // Create canvas to add text overlay
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height + 60; // Extra space for text
    const ctx = canvas.getContext('2d');

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw chart image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        resolve();
      };
      img.onerror = reject;
      img.src = chartDataUrl;
    });

    // Add predefined text
    ctx.fillStyle = '#333333';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const text = `我在晉賢紫微斗數 (little-yin.com) 生成了${userName}的紫微斗數命盤`;
    const maxWidth = width - 40;
    
    // Word wrap for Chinese text
    const words = text.split('');
    let line = '';
    let y = height + 20;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, width / 2, y);
        line = words[i];
        y += 25;
        if (y > canvas.height - 10) break; // Prevent text overflow
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, y);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("圖片生成失敗"));
        }
      }, 'image/png');
    });

  } finally {
    cleanupExport();
  }
}

/**
 * Share to social media platforms
 */
async function shareToSocialMedia(platform) {
  if (!isMobileDevice()) {
    alert("社交分享功能僅支援行動裝置");
    return;
  }

  showLoadingState("正在生成分享圖片...");

  try {
    // Get chart info for personalization
    const chart = window.ziweiAdapter?.getCurrentChart();
    const userName = chart && chart.meta ? chart.meta.name : '';
    
    // Generate image with text overlay
    const imageBlob = await generateSocialShareImage(userName);
    
    // Create image URL for sharing
    const imageUrl = URL.createObjectURL(imageBlob);
    
    // Sharing text
    const personalizedText = `我在晉賢紫微斗數 (little-yin.com) 生成了${userName}的紫微斗數命盤`;
    
    // Platform-specific URLs
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(personalizedText + '%0A' + imageUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl)}&quote=${encodeURIComponent(personalizedText)}`,
      threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(personalizedText)}&url=${encodeURIComponent(imageUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(imageUrl)}&text=${encodeURIComponent(personalizedText)}`
    };

    // Open social media platform
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(imageUrl);
    }, 1000);

  } catch (error) {
    console.error("Social sharing error:", error);
    alert("分享圖片生成失敗: " + (error.message || "未知錯誤"));
  } finally {
    hideLoadingState();
  }
}

/**
 * Share chart function (wrapper for social sharing)
 * This function should have been defined but was missing
 */
async function shareChart() {
  
  if (!isMobileDevice()) {
    alert("社交分享功能僅支援行動裝置");
    return;
  }

  try {
    showLoadingState("正在生成分享圖片...");
    
    // Get chart info for personalization
    const chart = window.ziweiAdapter?.getCurrentChart();
    const userName = chart && chart.meta ? chart.meta.name : '';
    
    // Generate image with text overlay
    const imageBlob = await generateSocialShareImage(userName);
    
    // Create image URL for sharing
    const imageUrl = URL.createObjectURL(imageBlob);
    
    // Sharing text
    const personalizedText = `我在晉賢紫微斗數 (little-yin.com) 生成了${userName}的紫微斗數命盤`;
    
    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}的紫微斗數命盤`,
          text: personalizedText,
          url: imageUrl
        });
      } catch (shareError) {
        // User cancelled or sharing failed, fallback to opening in new tab
        const newWindow = window.open(imageUrl, '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>${userName}的紫微斗數命盤</title></head>
              <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
                <img src="${imageUrl}" style="max-width:100%; max-height:100%; box-shadow:0 4px 8px rgba(0,0,0,0.1);">
              </body>
            </html>
          `);
        }
      }
    } else {
      // Fallback to opening in new tab
      const newWindow = window.open(imageUrl, '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${userName}的紫微斗數命盤</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
              <img src="${imageUrl}" style="max-width:100%; max-height:100%; box-shadow:0 4px 8px rgba(0,0,0,0.1);">
            </body>
          </html>
        `);
      }
    }

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(imageUrl);
    }, 2000);

  } catch (error) {
    console.error("Social sharing error:", error);
    alert("分享圖片生成失敗: " + (error.message || "未知錯誤"));
  } finally {
    hideLoadingState();
  }
}

// ==================
// UI Logic
// ==================
/**
 * Inject menu HTML into existing button
 */
  function injectMenu(btn) {
    if (btn.querySelector('.ziwei-share-menu')) return; // 已注入

    const menu = document.createElement('div');
    menu.className = 'ziwei-share-menu';
    
    // Build menu HTML with social media options
    let menuHTML = [
      '<button class="ziwei-share-option" data-action="download-png">📥 下載 PNG</button>',
      '<button class="ziwei-share-option" data-action="download-pdf">📄 下載 PDF</button>',
      '<button class="ziwei-share-option" data-action="download-json">📄 下載 JSON</button>',
      '<button class="ziwei-share-option" data-action="copy-json">📋 複製 JSON</button>',
      '<div class="ziwei-share-divider"></div>',
    ].join("");

    // Add social media options if mobile device
    if (isMobileDevice()) {
      menuHTML += [
        '<button class="ziwei-share-option ziwei-social-option" data-platform="whatsapp">💬 WhatsApp</button>',
        '<button class="ziwei-share-option ziwei-social-option" data-platform="facebook">📘 Facebook</button>',
        '<button class="ziwei-share-option ziwei-social-option" data-platform="threads">🧵 Threads</button>',
        '<button class="ziwei-share-option ziwei-social-option" data-platform="telegram">📱 Telegram</button>',
      ].join("");
    } else {
      // Show disabled social options on desktop with tooltip
      menuHTML += [
        '<button class="ziwei-share-option ziwei-social-option disabled" data-platform="whatsapp" title="社交分享僅支援行動裝置">💬 WhatsApp</button>',
        '<button class="ziwei-share-option ziwei-social-option disabled" data-platform="facebook" title="社交分享僅支援行動裝置">📘 Facebook</button>',
        '<button class="ziwei-share-option ziwei-social-option disabled" data-platform="threads" title="社交分享僅支援行動裝置">🧵 Threads</button>',
        '<button class="ziwei-share-option ziwei-social-option disabled" data-platform="telegram" title="社交分享僅支援行動裝置">📱 Telegram</button>',
      ].join("");
    }

    menu.innerHTML = menuHTML;
    btn.appendChild(menu);

    // 根據瀏覽器支持禁用選項
    if (!browserSupport.canExportPNG) {
      const opt = menu.querySelector('[data-action="download-png"]');
      if(opt) opt.classList.add('disabled');
    }
  }

/**
 * Find or create share button
 */
  function ensureShareButton() {
    let btn = document.querySelector('.ziwei-share-btn');
    
    // 情況 1: control.js 已經創建了按鈕
    if (btn) {
      injectMenu(btn);
      return btn;
    }

    // 情況 2: control.js 還沒運行或按鈕被移除 -> 嘗試手動創建 (Fallback)
    const controlBar = document.querySelector('.ziwei-control-bar');
    if (!controlBar) return null; // 連控制列都沒有，放棄

    btn = document.createElement('button');
    btn.className = 'ziwei-share-btn';
    btn.setAttribute('aria-label', '分享與下載');
    btn.innerHTML = `<span class="icon">📤</span><span class="text">分享</span>`;
    
    const settingsBtn = controlBar.querySelector('.ziwei-settings-toggle');
    if (settingsBtn) {
      controlBar.insertBefore(btn, settingsBtn);
    } else {
      controlBar.appendChild(btn);
    }
    
    injectMenu(btn);
    return btn;
  }

/**
 * Toggle menu display
 */
function toggleMenu() {
  const menu = document.querySelector('.ziwei-share-menu');
  if (!menu) {
    console.error('[ziwei-share] Menu element not found');
    return;
  }

  isMenuOpen = !isMenuOpen;
  
  if (isMenuOpen) {
    menu.classList.add('open');
  } else {
    menu.classList.remove('open');
  }
}

  function setupEventListeners() {
    // 使用事件委派處理點擊
    document.addEventListener('click', function(e) {
      const target = e.target;
      
      // 1. 點擊分享按鈕 -> 切換菜單
      const shareBtn = target.closest('.ziwei-share-btn');
      
      if (shareBtn) {
        // 如果點擊的是按鈕本身（不是菜單內部），則切換菜單
        if (!target.closest('.ziwei-share-menu')) {
          e.stopPropagation();
          toggleMenu();
          return;
        }
      }

      // 2. 點擊菜單選項 -> 執行功能
      const option = target.closest('.ziwei-share-option');
      if (option && !option.classList.contains('disabled')) {
        const action = option.getAttribute('data-action');
        const platform = option.getAttribute('data-platform');
        
        if (action === 'download-png') downloadPNG();
        else if (action === 'download-pdf') downloadPDF();
        else if (action === 'download-json') downloadJSON();
        else if (action === 'copy-json') copyJSON();
        else if (action === 'share') shareChart();
        else if (platform) shareToSocialMedia(platform);

        // 關閉菜單
        document.querySelectorAll('.ziwei-share-menu').forEach(m => m.classList.remove('open'));
        isMenuOpen = false;
        return;
      }

      // 3. 點擊頁面其他地方 -> 關閉菜單
      if (!shareBtn && isMenuOpen) {
        document.querySelectorAll('.ziwei-share-menu').forEach(m => m.classList.remove('open'));
        isMenuOpen = false;
      }
    });
  }

// ==================
// Utility Functions (T026, T027, T028)
// ==================  /**
/**
 * Show loading state (T026)
 */
  function showLoadingState(message) {
    message = message || "處理中...";

    if (!loader) {
      loader = document.querySelector(".ziwei-share-loader");
      if (!loader) {
        loader = document.createElement("div");
        loader.className = "ziwei-share-loader";
        document.body.appendChild(loader);
      }
    }

    loader.textContent = message;
    loader.style.display = "block";

  }

  function hideLoadingState() {
    if (loader) {
      loader.style.display = "none";
    }
  }

// ==================
// Initialization
// ==================  

function init() {
    checkBrowserSupport();
    
    // 嘗試找到現有按鈕並注入菜單
    const btn = ensureShareButton();
    
    // 如果第一次沒找到，設置一個短暫的輪詢（應對 control.js 異步加載）
    if (!btn) {
      let attempts = 0;
      const retryInterval = setInterval(() => {
        attempts++;
        if (ensureShareButton() || attempts > 10) {
          clearInterval(retryInterval);
        }
      }, 500);
    }

    // 綁定事件（只需一次）
    if (!window.ziweiShareEventsBound) {
      setupEventListeners();
      window.ziweiShareEventsBound = true;
    }
  }

  // 暴露 API
  window.ziweiShare = {
    downloadPNG: downloadPNG,
    downloadPDF: downloadPDF,
    downloadJSON: downloadJSON,
    copyJSON: copyJSON,
    share: shareChart,
    init: init,
    _toggleMenu: toggleMenu // 供 control.js 調用
  };

  // 啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 監聽圖表重繪事件，確保按鈕和菜單存在
  window.addEventListener('ziwei-chart-drawn', function() {
    ensureShareButton();
  });

})();
