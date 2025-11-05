    <div class="ziwei-cal">
        <h1 class="ziwei-cal-title">紫微斗數排盤工具</h1>
        <form class="ziwei-cal-form" id="ziwei-cal-form" novalidate>
        <!-- Name and Gender -->
        <div class="ziwei-cal-row-name-gender">
            <div class="ziwei-cal-name-group">
                <label class="ziwei-cal-label">
                    姓名 <span class="ziwei-cal-required">*</span>
                </label>
                <input type="text" id="ziwei-name" name="name" required placeholder="請輸入姓名">
            </div>

            <div class="ziwei-cal-gender-group">
                <label class="ziwei-cal-label">
                    性別 <span class="ziwei-cal-required">*</span>
                </label>
                <div style="display: flex; gap: 12px;">
                    <label style="flex: 1; cursor: pointer;">
                        <input type="radio" id="ziwei-male" name="gender" value="M" required style="margin-right: 8px;">
                        男
                    </label>
                    <label style="flex: 1; cursor: pointer;">
                        <input type="radio" id="ziwei-female" name="gender" value="F" required style="margin-right: 8px;">
                        女
                    </label>
                </div>
            </div>
        </div>

        <!-- Birth Date and Time -->
        <div class="ziwei-cal-datetime-group">
            <label class="ziwei-cal-label">
                出生日期與時間（西曆） <span class="ziwei-cal-required">*</span>
            </label>
            <div class="ziwei-cal-datetime-row">
                <div class="ziwei-cal-date-section">
                    <select id="ziwei-birth-year" name="year" class="ziwei-cal-year-input" required>
                        <option value="">年份</option>
                        <?php for ($year = date('Y'); $year >= 1900; $year--): ?>
                            <option value="<?php echo $year; ?>"><?php echo $year; ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">年</span>

                    <select id="ziwei-birth-month" name="month" class="ziwei-cal-md-input" required>
                        <option value="">月</option>
                        <?php for ($month = 1; $month <= 12; $month++): ?>
                            <option value="<?php echo $month; ?>"><?php echo $month; ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">月</span>

                    <select id="ziwei-birth-day" name="day" class="ziwei-cal-md-input" required>
                        <option value="">日</option>
                        <?php for ($day = 1; $day <= 31; $day++): ?>
                            <option value="<?php echo $day; ?>"><?php echo $day; ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">日</span>
                </div>

                <div class="ziwei-cal-spacer"></div>

                <div class="ziwei-cal-time-section">
                    <select id="ziwei-birth-hour" name="hour" class="ziwei-cal-time-select" required>
                        <option value="">時</option>
                        <?php for ($hour = 0; $hour < 24; $hour++): ?>
                            <option value="<?php echo $hour; ?>"><?php echo sprintf('%02d', $hour); ?></option>
                        <?php endfor; ?>
                    </select>
                    <span class="ziwei-cal-unit">時</span>

                    <select id="ziwei-birth-minute" name="minute" class="ziwei-cal-time-select" required>
                        <option value="">分</option>
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
            <button type="submit" class="ziwei-cal-btn ziwei-cal-btn-primary">
                開始排盤
            </button>
            <button type="button" class="ziwei-cal-btn ziwei-cal-btn-secondary" onclick="document.getElementById('ziwei-cal-form').reset();">
                重新填寫
            </button>
        </div>
    </form>
    </div>
