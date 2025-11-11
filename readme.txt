=== 紫微斗數排盤工具 ===
Contributors: kcy1989
Tags: 紫微斗數, 命理, 排盤, 中州派, astrology
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.5.1
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
11. 派別/流派設定系統（⏳ 長期開發中 - v0.5.x 系列）
    * Phase 11a: 個人資料隱藏（✅ v0.5.1 完成）
    * Phase 11b: 派別選擇與規則（🚧 開發中 - v0.5.2+）
    * Phase 11c: 時區與地點調整（⏳ 計畫中 - v0.5.x）
12. 匯出 PNG/PDF（⏳ 計畫中）
13. 星曜說明與提示（⏳ 計畫中）
14. 星曜組合解釋（⏳ 計畫中）

**版本規劃**：
- **v0.5.x 系列**（長期）：完成第 11 階段所有設定功能
- **v0.6.0**（未來）：第 12-14 階段功能完成後發佈

== Installation ==

1. 上傳插件檔案到 `/wp-content/plugins/ziwei-cal/` 目錄
2. 在 WordPress 後台「插件」頁面啟用「紫微斗數排盤工具」
3. 在頁面或文章中插入短代碼 `[ziwei_cal]`
4. 發佈頁面即可使用

== Technical Details ==

**程式架構：**

ziwei-cal/
├── ziwei-cal.php                  # 主插件文件（PHP、REST API 路由）
├── readme.txt                     # WordPress 插件說明文件
├── templates/
│   └── form.php                   # 表單模板
├── assets/
│   ├── css/
│   │   ├── form.css               # 表單樣式
│   │   └── chart.css              # 命盤樣式
│   ├── js/
│   │   ├── form.js                # 表單邏輯與表單驗證
│   │   ├── calculator.js          # 主計算器（POST 到 API）
│   │   ├── control.js             # 控制列管理（時辰切換、設定按鈕）
│   │   ├── config.js              # 設定模組（選項管理、應用邏輯）
│   │   ├── chart.js               # 命盤渲染引擎
│   │   ├── lunar-converter.js     # 農曆轉換（LunarSolarConverter）
│   │   ├── palace-interaction.js  # 宮位三方四正互動
│   │   └── cycles.js              # 大限盤選取、流年、四化顯示
│   ├── astrology/
│   │   ├── basic.js               # 基本索引計算、方向判斷
│   │   ├── palaces.js             # 宮位計算
│   │   ├── primary.js             # 主星（紫微、天府等）安置
│   │   ├── secondary.js           # 輔星（左輔右弼、文昌等）安置
│   │   ├── minor-stars.js         # 雜曜計算（43 顆星曜）
│   │   ├── attributes.js          # 神煞計算（太歲、將前、博士）
│   │   ├── life-cycle.js          # 大運與十二長生計算
│   │   ├── major-cycle.js         # 大限星、流年星、四化標註
│   │   ├── gender-calculator.js   # 陰陽性別分類計算
│   │   └── mutations.js           # 生年四化（祿權科忌）
│   └── data/
│       ├── palaces-name.js        # 宮位名稱資料
│       ├── nayin.js               # 納音五行局資料
│       └── mutation-zhongzhou.js  # 中州派四化表
└── .github/
    ├── copilot-instructions.md    # GitHub Copilot 開發規範
    └── CONFIG_MODULE_GUIDE.md     # 設定模組開發指引

**技術規範：**

* PHP 7.4+ (strict typing)
* WordPress 5.0+
* REST API 架構
* 前端：Vanilla JavaScript (ES6+)
* 樣式：純 CSS (Grid + Flexbox)
* 農曆轉換：LunarSolarConverter (1900-2100)

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

* 當某宮位同時包含大量主星、輔星與雜曜時，可能出現文字溢出或重疊。後續版本將考慮：
    * 星曜縮排 / 摺疊顯示

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
