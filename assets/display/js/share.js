/**
 * 分享與匯出系統模組
 * 功能: PNG/PDF 下載、社交分享
 * 版本: 1.0 (Phase 1)
 * 
 * 公開 API:
 * - window.ziweiShare.downloadPNG()
 * - window.ziweiShare.downloadPDF()
 * - window.ziweiShare.share()
 * - window.ziweiShare.getFileName()
 * - window.ziweiShare.checkSupport()
 * - window.ziweiShare.handleError()
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

  // ==================
  // 瀏覽器支持檢測 (T007)
  // ==================

  /**
   * 檢測瀏覽器對各項功能的支持情況
   * - dom-to-image: PNG 導出
   * - jsPDF: PDF 導出
   * - Web Share API: 社交分享
   * - IE 11 判定為不支持
   */
  function checkBrowserSupport() {
    const ua = navigator.userAgent;
    const isIE11 = ua.includes("Trident") && ua.includes("11.0");

    browserSupport = {
      canExportPNG: typeof window.domtoimage !== "undefined" && !isIE11,
      canExportPDF: typeof window.jsPDF !== "undefined" && !isIE11,
      canShare: typeof navigator.share !== "undefined",
      canShareWeb: /iPhone|iPad|Android/.test(ua),
      browserName: detectBrowser(ua),
      isUnsupported: isIE11,
    };

    if (browserSupport.isUnsupported) {
      console.warn(
        "[" + MODULE_NAME + "] 舊版瀏覽器 (IE 11)，某些功能不可用"
      );
    } else {
      console.log("[" + MODULE_NAME + "] 瀏覽器支持檢測完成", browserSupport);
    }

    // 發送事件供其他模組監聽
    document.dispatchEvent(
      new CustomEvent("ziwei-browser-support-checked", {
        detail: browserSupport,
      })
    );

    return browserSupport;
  }

  /**
   * 檢測瀏覽器類型
   */
  function detectBrowser(ua) {
    if (ua.includes("Chrome") && !ua.includes("Chromium")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edge")) return "Edge";
    if (ua.includes("Trident")) return "IE";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    return "Unknown";
  }

  // ==================
  // 文件命名 (T008)
  // ==================

  /**
   * 生成文件名稱
   * 規則:
   * - 有姓名: [完整姓名]_[YYYY-MM-DD].[format]
   * - 無姓名: 無名氏_[YYYY-MM-DD].[format]
   * - 移除禁止字符: / \ : * ? " < > |
   */
  function getFileName(format, name, date) {
    if (typeof format !== "string") {
      throw new Error("getFileName: format 參數必須是字符串 (png|pdf)");
    }

    format = format.toLowerCase();
    if (format !== "png" && format !== "pdf") {
      throw new Error("getFileName: format 必須為 png 或 pdf");
    }

    // 使用提供的日期或當前日期
    date = date instanceof Date ? date : new Date();
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

    // 清理姓名 (移除禁止字符)
    let cleanName = "無名氏";
    if (name && typeof name === "string") {
      name = name.trim();
      // 移除禁止字符: / \ : * ? " < > |
      name = name.replace(/[/\\:*?"<>|]/g, "");
      if (name) {
        cleanName = name;
      }
    }

    return cleanName + "_" + dateStr + "." + format;
  }

  // ==================
  // PNG 下載 (T009)
  // ==================

  /**
   * 下載命盤為 PNG 圖片
   * 使用 dom-to-image 捕獲 DOM，保留當前高亮狀態
   */
  async function downloadAsPNG() {
    if (!browserSupport.canExportPNG) {
      const err = new Error("瀏覽器不支持 PNG 下載");
      handleError(err);
      throw err;
    }

    const target = getCaptureTarget();
    if (!target) {
      const err = new Error("未找到可供導出的命盤元素");
      handleError(err);
      throw err;
    }

    if (typeof window.domtoimage === "undefined") {
      const err = new Error("dom-to-image 庫尚未加載");
      handleError(err);
      throw err;
    }

    const cleanupExport = prepareForExport(target);
    showLoadingState("正在生成 PNG...");

    try {
      const rect = target.getBoundingClientRect();
      const scale = EXPORT_SCALE;
      const width = rect.width * scale;
      const height = rect.height * scale;
      console.log(
        "[" + MODULE_NAME + "] 開始捕獲命盤 (" + width + "x" + height + ")"
      );

      const dataUrl = await window.domtoimage.toPng(target, {
        quality: 0.98,
        bgcolor: "#ffffff",
        allowTaint: true,
        skipExternalLinks: true,
        width: width,
        height: height,
        style: {
          transform: "scale(" + scale + ")",
          transformOrigin: "top left",
          backgroundColor: "#ffffff",
        },
        filter: function (node) {
          return !node.classList?.contains("ziwei-share-loader");
        },
      });

      const blob = dataURLToBlob(dataUrl);
      const fileName = getFileName("png", getUserName());
      downloadBlob(blob, fileName);

      document.dispatchEvent(
        new CustomEvent("ziwei-download-completed", {
          detail: {
            format: "png",
            fileName: fileName,
            timestamp: new Date().toISOString(),
          },
        })
      );

      console.log("[" + MODULE_NAME + "] PNG 下載完成: " + fileName);
    } catch (error) {
      console.error("[" + MODULE_NAME + "] PNG 下載失敗:", error);

      document.dispatchEvent(
        new CustomEvent("ziwei-download-failed", {
          detail: {
            format: "png",
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        })
      );

      handleError(error);
      throw error;
    } finally {
      hideLoadingState();
      cleanupExport();
    }
  }

  /**
   * 取得可用的命盤快照元素
   */
  function getCaptureTarget() {
    for (let i = 0; i < CAPTURE_TARGET_SELECTORS.length; i++) {
      const selector = CAPTURE_TARGET_SELECTORS[i];
      const node = document.querySelector(selector);
      if (node) {
        return node;
      }
    }
    return null;
  }

  /**
   * dataURL 轉換為 Blob 以供下載
   */
  function dataURLToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(parts[1]);
    const len = binary.length;
    const buffer = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }

    return new Blob([buffer], { type: mime });
  }

  /**
   * 下載 Blob
   */
  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

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


  // ==================
  // PDF 下載 (T010 - 佔位符)
  // ==================

  /**
   * 下載命盤為 PDF (階段 2 實現)
   * 暫時拋出錯誤，由 Phase 2 實現
   */
  async function downloadAsPDF() {
    const err = new Error(
      "PDF 下載功能在階段 2 (Phase 2) 實現。請稍後更新。"
    );
    console.warn("[" + MODULE_NAME + "]", err.message);
    handleError(err);
    throw err;
  }

  // ==================
  // 社交分享 (T011 - 佔位符)
  // ==================

  /**
   * 分享到社交媒體 (階段 3 實現)
   * 暫時拋出錯誤，由 Phase 3 實現
   */
  async function share() {
    const err = new Error(
      "社交分享功能在階段 3 (Phase 3) 實現。請稍後更新。"
    );
    console.warn("[" + MODULE_NAME + "]", err.message);
    handleError(err);
    throw err;
  }

  // ==================
  // UI 互動 - 初始化
  // ==================

  /**
   * 初始化 UI 層 (分享按鈕、菜單)
   */
  function initializeUI() {
    try {
      checkBrowserSupport();
      createShareButton();
      attachEventListeners();

      console.log("[" + MODULE_NAME + "] UI 初始化完成");
    } catch (error) {
      console.error("[" + MODULE_NAME + "] UI 初始化失敗:", error);
    }
  }

  /**
   * 創建分享按鈕和下拉菜單 (T013 - 子任務)
   * 位置: 控制列右側，「開啟設定」按鈕左邊
   */
  function createShareButton() {
    // 找到控制列
    const controlBar = document.querySelector(".ziwei-control-bar");
    if (!controlBar) {
      console.warn(
        "[" + MODULE_NAME + "] 未找到控制列 (.ziwei-control-bar)"
      );
      return;
    }

    // 創建分享按鈕
    const button = document.createElement("button");
    button.className = "ziwei-share-btn";
    button.innerHTML = "📤";
    button.setAttribute("data-action", "toggle-menu");
    button.title = "分享與匯出";

    // 創建下拉菜單
    const menu = document.createElement("div");
    menu.className = "ziwei-share-menu";
    menu.innerHTML = [
      '<button class="ziwei-share-option" data-action="download-png">📥 下載 PNG</button>',
      '<button class="ziwei-share-option" data-action="download-pdf">📄 下載 PDF</button>',
      '<button class="ziwei-share-option" data-action="share">🔗 分享</button>',
    ].join("");

    button.appendChild(menu);

    // 根據瀏覽器支持禁用選項
    if (!browserSupport.canExportPNG) {
      const pngBtn = menu.querySelector('[data-action="download-png"]');
      if (pngBtn) {
        pngBtn.disabled = true;
        pngBtn.title = "您的瀏覽器不支持 PNG 下載";
      }
    }

    if (!browserSupport.canExportPDF) {
      const pdfBtn = menu.querySelector('[data-action="download-pdf"]');
      if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.title = "您的瀏覽器不支持 PDF 下載";
      }
    }

    // 找到「開啟設定」按鈕 (class: ziwei-control-settings-btn)
    const settingsBtn = controlBar.querySelector(
      ".ziwei-control-settings-btn"
    );
    if (settingsBtn && settingsBtn.parentNode) {
      // 插入到設定按鈕左邊
      settingsBtn.parentNode.insertBefore(button, settingsBtn);
      console.log("[" + MODULE_NAME + "] 分享按鈕已插入控制列");
    } else {
      // 降級: 直接追加到控制列末尾
      controlBar.appendChild(button);
      console.log("[" + MODULE_NAME + "] 分享按鈕已添加到控制列末尾");
    }
  }

  /**
   * 綁定事件監聽 (T014 - 子任務)
   * - 按鈕點擊: 切換菜單
   * - 菜單選項點擊: 執行相應動作
   * - 菜單外點擊: 關閉菜單
   */
  function attachEventListeners() {
    // 綁定菜單選項事件
    document.addEventListener("click", function (e) {
      const action = e.target.getAttribute("data-action");

      if (!action) return;

      if (action === "toggle-menu") {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      } else if (action === "download-png") {
        e.preventDefault();
        e.stopPropagation();
        downloadAsPNG().catch(function (err) {
          handleError(err);
        });
        closeMenu();
      } else if (action === "download-pdf") {
        e.preventDefault();
        e.stopPropagation();
        downloadAsPDF().catch(function (err) {
          handleError(err);
        });
        closeMenu();
      } else if (action === "share") {
        e.preventDefault();
        e.stopPropagation();
        share().catch(function (err) {
          handleError(err);
        });
        closeMenu();
      }
    });

    // 點擊菜單外關閉菜單 (澄清 Q1)
    document.addEventListener("click", function (e) {
      const menu = document.querySelector(".ziwei-share-menu");
      const button = document.querySelector(".ziwei-share-btn");

      if (!menu || !button || !isMenuOpen) return;

      // 如果點擊目標不在菜單和按鈕內
      if (!menu.contains(e.target) && !button.contains(e.target)) {
        closeMenu();
      }
    });

    console.log("[" + MODULE_NAME + "] 事件監聽已綁定");
  }

  /**
   * 切換菜單狀態 (T015 - 子任務)
   */
  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  /**
   * 打開菜單
   */
  function openMenu() {
    const menu = document.querySelector(".ziwei-share-menu");
    if (menu) {
      menu.classList.add("open");
      isMenuOpen = true;

      document.dispatchEvent(new CustomEvent("ziwei-share-menu-opened"));
      console.log("[" + MODULE_NAME + "] 菜單已打開");
    }
  }

  /**
   * 關閉菜單 (澄清 Q1 - 自動關閉)
   */
  function closeMenu() {
    const menu = document.querySelector(".ziwei-share-menu");
    if (menu) {
      menu.classList.remove("open");
      isMenuOpen = false;

      document.dispatchEvent(new CustomEvent("ziwei-share-menu-closed"));
      console.log("[" + MODULE_NAME + "] 菜單已關閉");
    }
  }

  // ==================
  // ==================
  // 輔助函數 (T026, T027, T028)
  // ==================

  /**
   * 顯示加載狀態 (T026)
   */
  function showLoadingState(message) {
    message = message || "處理中...";

    let loader = document.querySelector(".ziwei-share-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "ziwei-share-loader";
      document.body.appendChild(loader);
    }

    loader.textContent = message;
    loader.style.display = "block";

    console.log("[" + MODULE_NAME + "] 加載狀態: " + message);
  }

  /**
   * 隱藏加載狀態 (T026)
   */
  function hideLoadingState() {
    const loader = document.querySelector(".ziwei-share-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }

  /**
   * 獲取用戶輸入的姓名 (T027)
   */
  function getUserName() {
    const nameInput = document.querySelector('input[name="name"]');
    return nameInput ? nameInput.value : "";
  }

  /**
   * 錯誤處理 (T028)
   * 澄清 Q3: 舊版瀏覽器顯示友好訊息
   */
  function handleError(error) {
    if (!error) {
      error = new Error("未知錯誤");
    }

    console.error("[" + MODULE_NAME + "] 錯誤:", error);

    let userMessage = "發生錯誤，請稍後重試";

    // 根據錯誤訊息提供友好的提示
    if (error.message.includes("不支持")) {
      userMessage = "您的瀏覽器不支持此功能，請升級至最新版本";
    } else if (error.message.includes("未找到")) {
      userMessage = "命盤元素未找到，請重新排盤";
    } else if (error.message.includes("階段")) {
      userMessage = "此功能即將推出，敬請期待";
    } else if (error.message.includes("CDN")) {
      userMessage = "載入資源失敗，請檢查網絡連接";
    } else if (error.message.includes("跨域")) {
      userMessage = "無法訪問某些資源，請稍後重試";
    }

    console.warn("[" + MODULE_NAME + "] 用戶提示: " + userMessage);

    // 發送錯誤事件
    document.dispatchEvent(
      new CustomEvent("ziwei-share-error", {
        detail: {
          message: userMessage,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  // ==================
  // 公開 API (T029)
  // ==================

  /**
   * 暴露公開 API
   * window.ziweiShare.downloadPNG()
   * window.ziweiShare.downloadPDF()
   * window.ziweiShare.share()
   * 等等
   */
  window.ziweiShare = {
    downloadPNG: downloadAsPNG,
    downloadPDF: downloadAsPDF,
    share: share,
    getFileName: getFileName,
    checkSupport: function () {
      return browserSupport;
    },
    handleError: handleError,
    // 調試用
    _toggleMenu: toggleMenu,
    _openMenu: openMenu,
    _closeMenu: closeMenu,
  };

  // ==================
  // 初始化 (T012)
  // ==================

  /**
   * 追踪初始化狀態，防止重複初始化
   */
  let initialized = false;
  let initAttempts = 0;
  const INIT_MAX_ATTEMPTS = 20;
  const INIT_RETRY_DELAY_MS = 200;

  /**
   * 執行初始化（帶護欄）
   */
  function performInitialization() {
    if (initialized) {
      console.log("[" + MODULE_NAME + "] 已經初始化，跳過重複初始化");
      return;
    }
    
    // 檢查必要元素是否存在
    const controlBar = document.querySelector(".ziwei-control-bar");
    const centerCell = document.querySelector(".ziwei-center-big");
    
    if (!controlBar || !centerCell) {
      console.log(
        "[" + MODULE_NAME + "] 等待控制列和圖表元素... (controlBar: " +
        !!controlBar + ", centerCell: " + !!centerCell + ")"
      );
      if (initAttempts >= INIT_MAX_ATTEMPTS) {
        console.warn(
          "[" +
            MODULE_NAME +
            "] 初始化重試超過限制，請確認 control.js 與 chart.js 是否正常運作"
        );
        return;
      }
      initAttempts += 1;
      setTimeout(performInitialization, INIT_RETRY_DELAY_MS);
      return;
    }
    
    initialized = true;
    initAttempts = 0;
    console.log("[" + MODULE_NAME + "] 所有元素準備完畢，執行初始化...");
    
    // Defer UI initialization by 500ms to avoid blocking chart rendering
    // This allows the chart to fully render before share button and controls are added
    setTimeout(initializeUI, 500);
  }

  /**
   * 監聽自定義事件，當圖表準備完畢時觸發初始化
   */
  window.addEventListener("ziwei-chart-ready", function () {
    console.log("[" + MODULE_NAME + "] 收到 ziwei-chart-ready 事件");
    performInitialization();
  });

  /**
   * 公開重新初始化函數（用於調試或手動恢復）
   */
  function reinitialize() {
    initialized = false;
    initAttempts = 0;
    console.log("[" + MODULE_NAME + "] 重置初始化狀態");
    performInitialization();
  }
})();
