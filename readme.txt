````plaintext
=== 紫微斗數排盤工具 ===
Contributors: kcy1989
Tags: 紫微斗數, 命理, 排盤, 中州派, astrology
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.6.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

紫微斗數命盤排盤工具 - 支援多派別，專注於中州派


== Description ==

紫微斗數排盤 WordPress 插件，提供即時互動式命盤生成功能。

**核心特色：**
* ✅ 即時互動，無需重新載入頁面
* ✅ 響應式設計，支援桌面、平板、手機
* ✅ 傳統直排書寫命盤顯示
* ✅ 無需登入，匿名使用
* ✅ 不儲存用戶資料，重視隱私
* ✅ 支援 1900-2100 年份範圍

**開發進度與功能階段**

本插件採「分階段」逐步開發。目前共規劃 14 個主要開發階段：

1. 基礎資料輸入表單（✅ 完成）
2. 農曆轉換功能（✅ 完成）
3. 命盤框架與顯示（✅ 完成）
4. 安主星（✅ 完成）
5. 安輔星（✅ 完成）
6. 四化（祿權科忌）顯示（✅ 完成）
7. 雜曜（其他星曜）（✅ 完成）
8. 神煞（太歲、將前、博士）（✅ 完成）
9. 三方四正與美化（✅ 完成）
10. 大限流年（✅ 完成）
11. 派別/流派設定系統（✅ 完成）
    * Phase 11a: 個人資料隱藏（✅ v0.5.1 完成）
    * Phase 11b: 派別選擇與規則（✅ v0.5.2+ 完成）
12. 分享與匯出系統（🚧 開發中 - v0.7.0）
    * Phase 12a: PNG 匯出（html2canvas）
    * Phase 12b: PDF 匯出（jsPDF）
    * Phase 12c: Web Share API 分享
    * Phase 12d: 品牌水印顯示
13. 星曜說明與提示（⏳ 計畫中 - v0.8.0）
14. 星曜組合解釋（⏳ 計畫中 - v0.9.0）
15. AI提示詞輸出（⏳ 計畫中）

== Installation ==

1. 上傳插件檔案到 `/wp-content/plugins/ziwei-cal/` 目錄
2. 在 WordPress 後台「插件」頁面啟用「紫微斗數排盤工具」
3. 在頁面或文章中插入短代碼 `[ziwei_cal]`
4. 發佈頁面即可使用

== Technical Details ==

**程式架構：**

本插件採用**三層分離架構**：計算層 → 協調層（Adapter） → 顯示層

```
ziwei-cal/
├── ziwei-cal.php                  # 主插件文件（PHP、REST API 路由）
├── readme.txt                     # WordPress 插件說明文件
├── templates/
│   └── form.php                   # 表單模板
├── assets/
│   ├── calculate/                 # 計算層（純計算邏輯，無依賴）
│   │   ├── astrology/             # 計算模組
│   │   │   ├── basic.js           # 基本索引計算、方向判斷
│   │   │   ├── palaces.js         # 宮位計算
│   │   │   ├── primary.js         # 主星安置
│   │   │   ├── secondary.js       # 輔星安置
│   │   │   ├── minor-stars.js     # 雜曜計算
│   │   │   ├── attributes.js      # 神煞計算
│   │   │   ├── life-cycle.js      # 十二長生計算
│   │   │   ├── major-cycle.js     # 大限/流年計算
│   │   │   ├── gender-calculator.js # 陰陽性別分類計算
│   │   │   ├── brightness.js      # 星曜亮度
│   │   │   └── mutations.js       # 四化計算
│   │   └── common/
│   │       ├── calculator.js      # 協調層：整合 Adapter 與 REST API
│   │       └── lunar-converter.js # 農曆轉換
│   ├── js/                        # 全域模組
│       └── data-adapter.js        # Adapter 層：輸入/輸出轉換、模組註冊
│   ├── display/                   # 顯示層（純 UI 邏輯，依賴 Adapter）
│   │   ├── css/
│   │   │   ├── chart.css          # 命盤排盤樣式（4x4 網格、宮位內容）
│   │   │   ├── form.css           # 表單樣式
│   │   │   ├── control.css        # 控制列樣式
│   │   │   ├── config.css         # 設定面板樣式
│   │   │   ├── palace-interaction.css  # 宮位互動樣式（高亮、連線）
│   │   │   ├── cycles.css         # 大限/流年控制面板樣式
│   │   │   └── share.css          # 分享/匯出按鈕樣式
│   │   └── js/
│   │       ├── chart.js           # 命盤渲染引擎（使用 adapterOutput）
│   │       ├── form.js            # 表單邏輯（收集輸入，不驗證）
│   │       ├── control.js         # 控制列管理（時辰切換、設定、分享）
│   │       ├── config.js          # 設定模組（選項管理）
│   │       ├── palace-interaction.js  # 宮位互動邏輯
│   │       ├── cycles.js          # 大限/流年顯示邏輯
│   │       └── share.js           # 分享與匯出系統（PNG/PDF/社群分享）
│   └── data/                      # 資料表
│       ├── constants.js           # 全域常數（宮位名、天干、地支等）
│       ├── palaces-name.js        # 宮位名稱
│       ├── nayin.js               # 納音五行局
│       ├── brightness.js          # 星曜亮度表
│       └── mutation.js            # 四化表
└── .github/
    ├── copilot-instructions.md    # GitHub Copilot 開發規範
    └── improvement-guide.md       # 代碼改進指南
```

**架構特點：**

| 層級 | 位置 | 職責 | 特點 |
|------|------|------|------|
| **計算層** | `assets/calculate/astrology/` | 純計算邏輯 | 無 window 依賴、無副作用、易於單元測試 |
| **協調層** | `assets/calculate/common/` + `assets/js/` | Adapter 實現、數據轉換、模組協調 | 規範化輸入/輸出、錯誤處理 |
| **顯示層** | `assets/display/js/` | UI 邏輯、事件處理、DOM 操作 | 只讀數據，通過 Adapter 與計算層通訊 |
| **資料層** | `assets/data/` | 常數、表格、配置 | 中立資料，無業務邏輯 |

**技術規範：**

* PHP 7.4+ (strict typing)
* WordPress 5.0+
* REST API 架構（無資料庫存儲）
* 前端：Vanilla JavaScript (ES6+)
* 樣式：純 CSS (Grid + Flexbox) + Vertical Writing
* 農曆轉換：LunarSolarConverter (1900-2100)
* 無外部依賴（無 jQuery、npm 等）

**安全性：**

* ✅ REST API nonce 驗證
* ✅ 所有輸入已消毒（sanitize）
* ✅ 所有輸出已轉義（escape）
* ✅ 無 SQL 注入風險（使用 WordPress API）
* ✅ 無 XSS 漏洞（proper escaping）

== Frequently Asked Questions ==

= 支援哪些年份範圍？ =

支援西曆 1900 年至 2100 年的農曆轉換。

= 資料會被儲存嗎？ =

不會。本插件不儲存任何用戶輸入資料，所有計算都在瀏覽器端完成，重視隱私。

= 需要登入嗎？ =

不需要。任何訪客都可以匿名使用排盤功能。

= 支援哪些派別？ =

目前規劃支援多派別，重點在中州派。未來版本將加入派別選擇功能。

= 可以列印命盤嗎？ =

此功能將在階段 12 開發。

== Changelog ==
= 0.6.4 - 2025-11-20 =
* 新增：個人資料隱藏選項 - 新增「隱藏日期」選項
* 修正：將星及蜚廉安星問題

= 0.6.3 - 2025-11-18 =
* 優化：實施漸進式渲染，延遲載入非必要資源，減少排盤等待時間
* 變更：更改品牌標題位置

= 0.6.2 - 2025-11-18 =
* 修正：下載圖片的宮位高亮顯示
* 修正：宮位互動正確用紫色標示選中宮位

= 0.6.1 - 2025-11-18 =
* 新增：分享與匯出系統 - PNG 匯出
* 變更：控制列按鈕圖形化

= 0.6.0 - 2025-11-16 =
* 新增：多個設定選項:截空、旬空、天傷、天使、四化、宮位名稱
* 優化：改善設定變更響應速度
* 修正：多項架構問題

= 0.5.4 - 2025-11-15 =
* 新增：子時（午夜）處理功能
* 優化：優化後台計算程序
* 清理：減少多餘的後台除錯訊息

= 0.5.3 - 2025-11-14 =
* 新增：閏月處理設定（月中換月 - 預設、視為本月、視為下月）
* 修正：改進設定變更後的重新排盤流程，確保畫面即時更新

= 0.5.2 - 2025-11-12 =
* 新增：星曜廟旺利陷（亮度）顯示，支援紫微斗數全書
* 優化：設置配適層，以便開發新輸出格式
* 優化：改進顯示算法，提高反應速度
* 優化：重新設計文件架構，以便開發新功能
* 修正：多項 UI 細節與錯誤

= 0.5.1 - 2025-11-11 =
* 新增：個人資料隱藏功能（隱藏姓名、性別、出生日期）
* 新增：快速更改時辰
* 新增：支援年份至2100年
* 改進：預填今日資料
* 優化：代碼清理，移除冗餘邏輯
* 優化：改善效能，加強安全性

= 0.5.0 - 2025-11-11 =
* 新增：流曜顯示
* 新增：流年四化（綠色標示）
* 刪除：取消姓名輸入要求，去除相關驗證
* 改進：宮位布局調整
* 優化：CSS 代碼整理

= 0.4.4 - 2025-11-10 =
* 新增：開發日誌超連結及版本資訊
* 改進：表單輸入框的預填字樣風格
* 改進：強化核心計算的錯誤處理
* 優化：DRY 原則改進代碼

= 0.4.3 - 2025-11-10 =
* 改進：修復手機版顯示問題

= 0.4.2 - 2025-11-09 =
* 新增：可選取大限盤，並顯示流年鍵
* 新增：大限四化、大限流曜標註
* 新增：大限盤互動、選取狀態、UI優化
* 修復：部分顯示問題

= 0.4.1 - 2025-11-08 =
* 修復：部份顯示問題

= 0.4.0 - 2025-11-08 =
* 完成：宮位互動功能 - 點擊任何宮位顯示三方四正
* 改進：表單驗證 - 增強錯誤提示UX
* 改進：表單布局改進
* 新增：palace-interaction.js 檔案（宮位互動與連線功能）
* 新增：cycles.js 檔案（大限/流年控制面板）

= 0.3.0 - 2025-11-07 =
* 完成：神煞（太歲、將前、博士）
* 優化：命盤左-中-右三層布局（神煞 | 大運/十二長生 | 宮位名稱），精準間距計算
* 優化：代碼重構，移除 10+ 條冗餘計算，統一使用預計算的索引值
* 優化：清除 20+ 條調試日誌，保留錯誤處理用的 console.error

= 0.2.0 - 2025-11-07 =
* 完成：雜曜共 43 顆星曜全面實現

= 0.1.3 - 2025-11-05 =
* 完成：輔星（左輔右弼、文昌文曲、天魁天鉞等）顯示與排盤
* 完成：生年四化（祿權科忌）顯示，主星與輔星皆支援
* 改進：四化標籤與星體排列、間距、背景色、正方形樣式
* 修正：星體與四化標籤重疊、間距不一等視覺問題

= 0.1.2 - 2025-11-03 =
* 新增：天干地支組合顯示（五虎遁法）
* 新增：納音五行局計算與顯示
* 修復：午夜時間驗證 bug (empty(0) 問題)
* 改進：命盤中央資訊版面與樣式統一
* 優化：只支援桌面版顯示

= 0.1.1 - 2025-11-02 =
* 新增：農曆轉換系統（支援 1900-2100 年）
* 新增：命盤 4x4 網格框架與中央資料顯示
* 新增：十二地支宮位標示
* 新增：陰陽性別分類計算（陽男/陰男/陽女/陰女）
* 改進：前後端分離架構，使用 WordPress REST API
* 改進：模組化代碼結構
* 優化：命盤外觀與響應式設計

= 0.1.0 - 2025-11-01 =
* 初始版本
* 基本資料輸入表單
* 表單驗證功能

**貢獻：**

歡迎提交 Issue 和 Pull Request！

== Known Issues ==

* 當某宮位同時包含大量主星、輔星與雜曜時，可能出現文字溢出或重疊。後續版本將考慮：星曜縮排 / 摺疊顯示
* 廟旺利陷表找不到可靠來源，暫在網上收集，歡迎提供特定門派慣用表
* 設定已經很完備了，暫時沒有其他想法，歡迎提出更多設定的意見

== Credits ==

* 農曆轉換演算法：基於 [Lunar-Solar-Calendar-Converter](https://github.com/isee15/Lunar-Solar-Calendar-Converter)

== License ==

本插件採用 GPLv2 或更新版本授權。

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
