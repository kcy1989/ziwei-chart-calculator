## 設定變更即時更新（Development 指引）

目的
- 當使用者在設定面板（config）更改任何選項（例如閏月處理模式）時，前端必須立即產生並繪製使用新設定的命盤，不應要求使用者重新填寫或重新提交表單。
- 明確分工：計算層（assets/calculate/...）負責所有天文/曆算與派位；Adapter（assets/js/data-adapter.js）負責整合與輸出一個完整、可供顯示層使用的資料結構；顯示層（assets/display/js/*.js）僅負責渲染，不得執行任何計算。

簡短契約（Contract）
- 輸入：formData（使用者輸入） + settings（例如 leapMonthHandling）
- 輸出：adapterOutput（包含 meta, lunar, indices, sections, derived, constants, errors）
- 成功標準：在設定改動後，呼叫 compute pipeline → 取得新的 adapterOutput → chart 以該 adapterOutput 完整重繪，且畫面與使用者期待一致。
- 錯誤模式：若 adapterOutput 缺少顯示層所需的預計算欄位（例如 `derived.nayin.name`、`derived.masterPalace`），顯示層必須 failAndAbort（顯示錯誤訊息並中止），而不是在顯示層進行任何補算。

關鍵要求（Summary Requirements）
1. 設定選擇 (select) 一經被使用者改變：
   - 保存設定（sessionStorage/localStorage），並立即（非阻塞）觸發命盤重新計算。
   - 若已有命盤在頁面上，嘗試從全域快取（window.ziweiChartData）或表單取回先前的 formData，將新的設定插入，並呼叫 window.ziweiCalculator.compute(formData)。
   - compute 必須繞過快取（或使用包含設定的 cache-key 以強制重算），確保結果反映新設定。

2. 計算/Adapter 的輸出必須包含（顯示層不可計算或推斷）
   - `adapterOutput.derived.nayin.name`（命宮納音名稱）
   - `adapterOutput.derived.mingPalace`（命宮資料物件）
   - `adapterOutput.derived.masterPalace`、`adapterOutput.derived.bodyPalace`（主/身主星資訊）
   - `adapterOutput.sections` 中的所有顯示需要資料：`palaces`, `primaryStars`, `secondaryStars`, `minorStars`, `mutations`, `attributes`, `brightness`, `lifeCycles` 等
   - 若顯示層需要互動性（例如快速切換大限/流年），可由 Adapter 一次性提供預計算映射（例如 `derived.majorCycleStarsByPalace`）以避免顯示層呼叫計算模組

3. 顯示層（assets/display/js/*.js）
   - 嚴禁直接呼叫計算模組（如 getAdapterModule('basic') 來算主/身主、getAdapterModule('nayin') 來算納音等）。
   - 若缺少必要欄位，呼叫 `failAndAbort('明確中文錯誤訊息')`，終止繪製並提示開發/測試人員檢查 Adapter。
   - 支援兩種更新場景：
     - 有表單（典型情況）：使用 `window.showChart(result)` 或 `window.updateDisplay(result)` 將整個畫面刷新（若已有表單介面則優先使用現有刷新流程）。
     - 無表單（嵌入式或僅圖示情況）：使用 `control.updateChartDisplay` 或由 config.js 執行 DOM 替換（replace chart wrapper）。不要在顯示層產生阻塞錯誤，而是記錄並安全重試/提示。

實作細節（Implementation Notes）

- Cache key
  - `assets/calculate/common/calculator.js` 的 cache key 必須包含會影響計算結果的所有設定（例如 `leapMonthHandling`、時區、校正選項等），以便在設定改變時觸發 cache miss 並重算。

- 設定儲存
  - 在 `assets/display/js/config.js`：每個 select 的 onChange handler 應
    1. 將新值寫入 sessionStorage（或 localStorage，視需求而定），
    2. 嘗試組出可用的 formData（優先使用當下表單資料；若不存在，從 `window.ziweiChartData` 恢復 normalized/raw），
    3. 插入新的設定值（`formData.leapMonthHandling = 'mid'|'current'|'next'`），
    4. 呼叫 `window.ziweiCalculator.compute(formData)`，
    5. 在 promise resolve 時，把結果（calcResult / adapterOutput / normalizedInput）寫回 `window.ziweiChartData`，並呼叫更新流程。

- 計算 API 與 Adapter
  - `adapter.input.normalize(formData)`：保證把設定帶到 normalize 的 meta（meta.leapMonthHandling）供後續模組使用。
  - `adapter.output.process(calcResult, normalizedInput)`：確保 `derived` 與 `sections` 包含顯示層所需的預計算資料（見上面列舉）。如果後端或計算模組沒有該資料，Adapter 應在 `.errors` 中加入可辨識的錯誤，並嘗試提供安全的預設或直接回傳錯誤以利顯示層 fail fast。

- 顯示層錯誤處理
  - 對於缺少關鍵資料的情況（例如納音），顯示層應顯示明確的中文說明，像是：
    > "命盤資料缺少納音資訊（derived.nayin.name），顯示層不進行計算，請確認計算模組或 Adapter 已提供納音結果。"
  - 錯誤在開發環境應伴隨 console.error 與堆疊資訊以協助追蹤。

互動事件與可觀察性
- 當設定改變並觸發 compute，建議發出 DOM 事件：
  - `window.dispatchEvent(new CustomEvent('ziwei:configChanged', { detail: { key, value, result } }))`
  - 其他模組（cycles, control）可監聽此事件進行輕量更新。

測試與驗收標準（Testing & Acceptance）
- 自動化測試（建議）
  1. Unit test：對 `assets/calculate/astrology/basic.js` 的 `getMonthIndex()` 輸入三種模式（mid/current/next）驗證回傳結果。
  2. Integration test：模擬 `formData + setting` 呼叫 `window.ziweiCalculator.compute()`，驗證回傳的 `adapterOutput.derived.nayin.name` 與其它 derived 欄位存在。
  3. UI test：模擬設定改變，驗證 `compute` 被呼叫，且畫面上 `data-ziwei-chart` 的內容更新（例如命宮名稱或納音文字改變）。

- 手動 QA（逐步）
  1. 在本地環境開啟表單，輸入測試出生資料並提交一次，確認命盤成功繪製。
  2. 打開 devtools，切換到 Console。打開設定面板，調整「閏月處理模式」為另一個選項。
  3. 確認：
     - Console 顯示 compute 被觸發（或顯示由 config.js 的 debug log），
     - 畫面上的命盤在 1-2 秒內更新（肉眼可見），且納音 / 命宮 / 主身主資訊同步更新，
     - 若 adapter 輸出有問題，顯示層立即以清楚中文錯誤提示並停止渲染，而非悄悄以預設值渲染。

邊界情況（Edge cases）
- 使用者在沒有提交過表單（沒表單資料）直接在只含圖表的嵌入頁面改設定：
  - config.js 應優先從 `window.ziweiChartData` 恢復 normalized/raw 作為 formData，若皆無則顯示非阻塞提示並要求使用者先提交一次。
- 伺服器回傳錯誤或網路失敗：
  - 顯示非阻塞通知，保留舊圖表視覺，並允許使用者重試。
- sessionStorage 失效或無法寫入：
  - 退回到記憶體暫存（window.ziweiConfig）並在 console 輸出警告。

實作檢查清單（Developer checklist）
 - [ ] 計算層已支援並被測試的閏月模式（basic.js）
 - [ ] Adapter 將 `meta.leapMonthHandling` 傳入所有需要的模組
 - [ ] calculator cache-key 包含 leapMonthHandling
 - [ ] config.js 的 onChange handler 儲存設定並觸發 compute
 - [ ] chart.js 不包含任何計算邏輯（對應段落應檢查 `getAdapterModule('nayin')`、`basic`、`majorCycleStars` 的使用）
 - [ ] chart.js 對缺少欄位使用 `failAndAbort` 並顯示清楚中文錯誤
 - [ ] 更新/替換 chart 的 fallback 路徑（有表單／無表單情況）工作正常
 - [ ] 新增或更新單元測試與整合測試

常見檔案指引（快速導航）
- 計算層（核心）：
  - assets/calculate/astrology/basic.js
  - assets/calculate/common/calculator.js
- Adapter：
  - assets/js/data-adapter.js
- 顯示層（設定 + 圖表）：
  - assets/display/js/config.js
  - assets/display/js/chart.js
  - assets/display/js/control.js
  - assets/display/js/cycles.js

例子：config.js onChange 範例流程（偽碼）
```js
// 當設定改變
sessionStorage.setItem('ziweiLeapMonth', newValue);
let formData = getFormData() || extractFrom(window.ziweiChartData) || null;
if (!formData) { showNonBlocking('請先填寫並提交一次命盤資料以使用此功能'); return; }
formData.leapMonthHandling = newValue;
const result = await window.ziweiCalculator.compute(formData);
window.ziweiChartData = mergeChartCache(window.ziweiChartData, result);
// 若表單存在，更新既有流程；否則用 control.updateChartDisplay 或 DOM replace
if (window.showChart) { window.showChart(result); } else { control.updateChartDisplay(result.adapterOutput); }
```

最後說明
- 這份指引旨在給開發者明確的契約、實作細節、測試建議與 QA 流程。請在合併前執行一次整合測試：在已繪制命盤的頁面中更改設定，確認命盤在 1–3 秒內更新且沒有顯示層自行計算的情況。

若要我代為執行下一個步驟（A: 將 chart.js 中剩餘的顯示層計算位置替換為讀取 adapterOutput，或 B: 同步更新 adapter.output.process 使其輸出更多 derived 欄位），請選 A 或 B。
