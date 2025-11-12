Data Adapter 重構指引文件
專案名稱：紫微斗數計算器 - Data Adapter 層重構


📌 專案概述
當前問題
資料流混亂

form.js 收集表單後自行驗證、正規化
calculator.js 再次處理輸入格式
chart.js 重複進行網格映射、星曜分類
三個模組各自定義資料格式，缺乏統一標準
代碼重複

網格映射邏輯在 palace-interaction.js 和 chart.js 重複
星曜分類邏輯在多處重複
驗證邏輯分散在各模組
難以維護

修改資料格式需同步更新多個檔案
錯誤處理不一致
缺乏統一的資料轉換層
測試困難

資料轉換邏輯與業務邏輯耦合
無法獨立測試資料轉換
解決方案
引入 Data Adapter 層，作為資料轉換的單一職責模組：

表單資料 → [Input Adapter] → 計算模組 → [Output Adapter] → 渲染模組
data-adapter.js 同時具備Input Adapter，Output Adapter功能
表單form.js只收集原始資料，不做驗證，驗證功能在adapter進行
adapter呼叫相關的計算模組進行運算
計算模組只進行計算，計算結果轉回給adapter
adapter擁有所有渲染模組所需的資料，渲染模組也能統一在Adapter調取資料

🎯 專案目標
主要目標
建立統一的資料轉換層（data-adapter.js）
遷移現有模組使用 Adapter
清理重複代碼，提升可維護性
預期效果
✅ 代碼行數減少 20-30%
✅ 資料格式統一且有文檔
✅ 錯誤訊息更明確
✅ 易於測試和擴展
✅ 功能保持完全一致（零破壞性變更）

📋 執行計劃（三階段）
階段 1：建立 data-adapter.js
任務：建立完整的 Adapter 層

功能需求：
1.1 Input Adapter
負責：表單原始資料 → 計算模組標準格式
輸入包括: form.js (最原始資料)，calculator.js，lunar-converter.js等(第二層運算的輸入，例如計算主星需要農曆資料，這是lunar-converter的輸出，同時是primary.js的輸入)

1.2 Output Adapter
負責：收集計算結果 → 圖表渲染格式
輸入包括: lunar-converter.js，palace-interaction.js，astrology文件中的.js
輸出至chart.js，control.js，cycles.js等

1.3 Error Handler
自訂 AdapterError 類別
包含 type、message、context、timestamp
提供 isAdapterError() 判斷函式
1.4 匯出 API

技術要求：

使用 IIFE 包裹，避免全域污染
所有函式加 JSDoc 註解
使用 window.ziweiConstants 的常量（正則、網格映射）
農曆轉換使用 window.lunarConverter
錯誤處理完整，包含 context 資訊
支援除錯模式（window.ziweiConstants.DEBUG.ADAPTER）

階段 2：遷移現有模組
任務：讓 calculator.js、chart.js、form.js 等等 使用 Adapter

注意事項：

不要修改計算邏輯本身
保持快取機制正常運作
錯誤訊息要包含 context 資訊

2.2 遷移 chart.js（4 小時）
修改檔案：assets/js/chart.js

修改點：

修改 renderChart 函式（或主要渲染入口）

開頭加入：const chartData = window.ziweiAdapter.output.process(calcResult, inputData);
用 try-catch 包裹，捕捉 AdapterError
若驗證失敗，顯示錯誤訊息而非渲染
傳遞 chartData.grid 和 chartData.palaces 給渲染函式
簡化渲染邏輯

刪除或註解掉：buildGrid()、classifyStars()、calculateTriSquare() 等函式
這些邏輯已在 Output Adapter 完成
修改 createPalaceCell 函式

直接使用 Adapter 提供的格式：

這是最複雜的檔案（67KB），謹慎修改
只修改資料來源，不改變渲染邏輯
保持所有互動功能正常

2.3 遷移 form.js
修改點：

簡化資料收集

移除本地驗證邏輯（已在 Input Adapter）
移除正規化邏輯（已在 Input Adapter）
只收集原始表單值，不做任何處理
修改提交流程

收集原始資料：{ birthDate, birthTime, gender, calendarType, leapMonth }
直接呼叫：window.ziweiCalculator.computeChartWithCache(rawData)
捕捉 AdapterError，顯示對應欄位錯誤
優化錯誤處理

新增 handleAdapterError(error) 函式
從 error.context.errors 讀取錯誤欄位
使用現有的 showError(field, message) 顯示錯誤
注意事項：

保留防重入機制
保留 ARIA 屬性管理
保留防抖機制

階段 3：清理舊代碼（3 小時）
任務：移除重複邏輯，優化註解
移除項目：

舊的驗證函式（若有）
舊的正規化函式（若有）

