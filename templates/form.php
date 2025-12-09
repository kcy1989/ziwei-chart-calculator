<div class="ziwei-cal" data-ziwei-mode="form">
        <div class="ziwei-cal-title">
            <h1>紫微斗數排盤工具</h1>
            <p class="ziwei-cal-version-link"><a href="https://little-yin.com/2025/11/08/calculator/" target="_blank" rel="noopener noreferrer">版本 1.1.1 • 更新於 2025-12-9</a></p>
        </div>
        <form class="ziwei-cal-form" id="ziwei-cal-form" method="post" action="javascript:void(0);" novalidate>
        <!-- Name and Gender -->
        <div class="ziwei-cal-row-name-gender">
            <div class="ziwei-cal-name-group">
                <div>
                    <label class="ziwei-cal-label">
                        姓名 <span class="ziwei-cal-optional">(選填)</span>
                    </label>
                    <input type="text" id="ziwei-name" name="name" placeholder="請輸入姓名">
                </div>
                
            </div>

            <div class="ziwei-cal-gender-group">
                <div>
                    <label class="ziwei-cal-label">
                        性別 <span class="ziwei-cal-required">*</span>
                    </label>
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 0;">
                        <input type="radio" id="ziwei-male" name="gender" value="M" required>
                        男
                    </label>
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 0;">
                        <input type="radio" id="ziwei-female" name="gender" value="F" required>
                        女
                    </label>
                </div>
                <span class="ziwei-cal-error-message" id="gender-error" style="display: none;">請選擇性別</span>
            </div>
        </div>

        <!-- Birth Date and Time -->
        <div class="ziwei-cal-datetime-group">
            <label class="ziwei-cal-label">
                出生日期與時間 (西曆)<span class="ziwei-cal-required">*</span>
            </label>
            <div class="ziwei-cal-datetime-row">
                <div class="ziwei-cal-date-section">
                    <input type="text" id="ziwei-birth-year" name="year" class="ziwei-cal-year-input" value="<?php echo date('Y'); ?>" placeholder="例如：1990" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric">
                    <span class="ziwei-cal-unit">年</span>

                    <select id="ziwei-birth-month" name="month" class="ziwei-cal-md-input" required>
                        <?php 
                            $currentMonth = (int)date('m');
                            for ($month = 1; $month <= 12; $month++):
                                $selected = ($month === $currentMonth) ? 'selected' : '';
                        ?>
                            <option value="<?php echo $month; ?>" <?php echo $selected; ?>><?php echo $month; ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">月</span>

                    <select id="ziwei-birth-day" name="day" class="ziwei-cal-md-input" required>
                        <?php 
                            $currentDay = (int)date('d');
                            for ($day = 1; $day <= 31; $day++):
                                $selected = ($day === $currentDay) ? 'selected' : '';
                        ?>
                            <option value="<?php echo $day; ?>" <?php echo $selected; ?>><?php echo $day; ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">日</span>
                </div>

                <div class="ziwei-cal-spacer"></div>

                <div class="ziwei-cal-time-section">
                    <select id="ziwei-birth-hour" name="hour" class="ziwei-cal-time-select" required>
                        <?php for ($hour = 0; $hour < 24; $hour++): ?>
                            <option value="<?php echo $hour; ?>"><?php echo sprintf('%02d', $hour); ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">時</span>

                    <select id="ziwei-birth-minute" name="minute" class="ziwei-cal-time-select" required>
                        <?php for ($minute = 0; $minute < 60; $minute += 5): ?>
                            <option value="<?php echo $minute; ?>"><?php echo sprintf('%02d', $minute); ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">分</span>
                </div>
            </div>
        </div>

        <!-- Birthplace -->
        <div class="ziwei-cal-form-group">
            <label class="ziwei-cal-label">
                出生地點 <span class="ziwei-cal-optional">(選填)</span>
            </label>
            <input type="text" id="ziwei-birthplace" name="birthplace" placeholder="例如：香港">
        </div>

        <!-- Action Buttons -->
        <div class="ziwei-cal-form-actions">
            <button type="submit" id="ziwei-submit-btn" class="ziwei-cal-btn ziwei-cal-btn-primary">
                開始排盤
            </button>
            <button type="button" id="ziwei-ai-btn" class="ziwei-cal-btn ziwei-cal-btn-primary">
                生成AI算命提示詞
            </button>
            <button type="button" class="ziwei-cal-btn ziwei-cal-btn-secondary" onclick="document.getElementById('ziwei-cal-form').reset();">
                重新填寫
            </button>
        </div>
    </form>
    <script>
document.addEventListener('DOMContentLoaded', function() {
  const DEBUG = window.ziweiCalData?.env?.isDebug || false;
  const form = document.getElementById('ziwei-cal-form');
  if (!form) return console.error('[inline] Form not found');
  if (DEBUG) console.log('[inline] Form found, attaching submit');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (DEBUG) console.log('[inline] Submit fired - single');
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData);
    if (DEBUG) console.log('[inline] Payload:', payload);
    
    window.ziweiCalData = window.ziweiCalData || {};
    const restUrl = window.ziweiCalData.restUrl || '/wp-json/ziwei-cal/v1/calculate';
    const nonce = window.ziweiCalData.nonce || '';
    if (DEBUG) console.log('[inline] Using restUrl:', restUrl, 'nonce:', !!nonce);
    
    try {
      const resp = await fetch(restUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-WP-Nonce': nonce},
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (DEBUG) console.log('[inline] API success:', data);
      
      // Poll for chart.draw ready
      let pollCount = 0;
      const pollChart = () => {
        if (window.ziweiChart && typeof window.ziweiChart.draw === 'function') {
          if (DEBUG) console.log('[inline] chart.draw ready, drawing');
          try {
            const chartWrapper = window.ziweiChart.draw(data.data);
            if (DEBUG) console.log('[inline] Chart drawn:', !!chartWrapper);
            const container = form.closest('.ziwei-cal');
            if (container && chartWrapper) {
              form.replaceWith(chartWrapper);
              container.setAttribute('data-ziwei-mode', 'chart');
              if (DEBUG) console.log('[inline] Chart inserted');
            }
          } catch (drawErr) {
            console.error('[inline] draw error:', drawErr);
          }
        } else if (pollCount < 100) {
          pollCount++;
          if (DEBUG) console.log('[inline] Polling chart.draw attempt', pollCount);
          setTimeout(pollChart, 50);
        } else {
          console.error('[inline] chart.draw timeout after 5s');
        }
      };
      pollChart();
    } catch (err) {
      console.error('[inline] Error:', err);
    }
  });
});
</script>
<script>
window.ziweiCalData = window.ziweiCalData || {};
window.ziweiCalData.restUrl = '<?php echo esc_js(rest_url("ziwei-cal/v1/calculate")); ?>';
window.ziweiCalData.nonce = '<?php echo esc_js(wp_create_nonce("wp_rest")); ?>';
</script>
    </div>
