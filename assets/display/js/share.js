/**
 * 分享與匯出系統模組
 * 功能: PNG/PDF 下載、社交分享
 * 版本: 1.2 (Fix Integration with Control.js)
 * 
 * 公開 API:
 * - window.ziweiShare.downloadPNG()
 * - window.ziweiShare.downloadPDF()
 * - window.ziweiShare.share()
 * - window.ziweiShare.init()
 */

(function () {
  "use strict";

  // ==================
  // 私有配置
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
  // 瀏覽器支持檢測
  // ==================

  function checkBrowserSupport() {
    const ua = navigator.userAgent;
    const isIE11 = ua.includes("Trident") && ua.includes("11.0");

    browserSupport = {
      canExportPNG: typeof window.domtoimage !== "undefined" && !isIE11,
      canExportPDF: typeof window.jsPDF !== "undefined" && !isIE11,
      canShare: typeof navigator.share !== "undefined",
      canShareWeb: /iPhone|iPad|Android/.test(ua),
      isUnsupported: isIE11,
    };

    return browserSupport;
  }

  // ==================
  // 文件命名
  // ==================

  function getFileName(format, name, date) {
    if (typeof format !== "string") {
      throw new Error("getFileName: format 參數必須是字符串 (png|pdf)");
    }

    format = format.toLowerCase();
    if (format !== "png" && format !== "pdf") {
      throw new Error("getFileName: format 必須為 png 或 pdf");
    }

    // date/birth info 由 meta 傳入，格式: YYYYMMDD_HHMM
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
  // 功能實現: PNG 下載
  // ==================

  /**
   * 在導出期間標記 DOM，允許 CSS 做專屬調整
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
  // 功能實現: PDF & Share (Placeholders)
  // ==================

  async function downloadPDF() {
    alert("PDF 下載功能將在下一版本推出");
  }

  async function shareChart() {
    alert("社交分享功能將在下一版本推出");
  }

  // ==================
  // UI 邏輯
  // ==================

  /**
   * 注入菜單 HTML 到現有的按鈕中
   */
  function injectMenu(btn) {
    if (btn.querySelector('.ziwei-share-menu')) return; // 已注入

    const menu = document.createElement('div');
    menu.className = 'ziwei-share-menu';
    menu.innerHTML = [
      '<button class="ziwei-share-option" data-action="download-png">📥 下載 PNG</button>',
      '<button class="ziwei-share-option" data-action="download-pdf">📄 下載 PDF</button>',
      '<button class="ziwei-share-option" data-action="share">🔗 分享</button>',
    ].join("");
    btn.appendChild(menu);

    // 根據瀏覽器支持禁用選項
    if (!browserSupport.canExportPNG) {
      const opt = menu.querySelector('[data-action="download-png"]');
      if(opt) opt.classList.add('disabled');
    }
    
    console.log('[' + MODULE_NAME + '] 菜單已注入');
  }

  /**
   * 查找或創建分享按鈕
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
   * 切換菜單顯示
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
    console.log('[ziwei-share] Menu opened');
  } else {
    menu.classList.remove('open');
    console.log('[ziwei-share] Menu closed');
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
        console.log('[' + MODULE_NAME + '] 執行動作:', action);
        
        if (action === 'download-png') downloadPNG();
        else if (action === 'download-pdf') downloadPDF();
        else if (action === 'share') shareChart();

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
  // 輔助函數 (T026, T027, T028)
  // ==================

  /**
   * 顯示加載狀態 (T026)
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

    console.log("[" + MODULE_NAME + "] 加載狀態: " + message);
  }

  // ==================
  // 初始化
  // ==================

  function init() {
    console.log('[' + MODULE_NAME + '] 初始化...');
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