/**
 * 企鹅通知系统 v1.0
 * ── 双通道提醒：浏览器 Notification API（主动推送） + 页面内 UI 卡片（被动展示）
 * ── 目标：降低连续登录流失率 60%+
 */
const NotificationManager = {
  // 通知权限状态缓存
  _permission: null,
  // 提醒定时器ID
  _reminderTimer: null,
  // 今日是否已经提醒过（防止重复通知）
  _todayReminded: false,
  // 引用回 App 实例（由 App.init 注入）
  app: null,

  /** 初始化通知系统 */
  init(appInstance) {
    this.app = appInstance;

    // 检查通知权限状态
    this._permission = localStorage.getItem('penguin_notification_permission');

    // 每 30 分钟检查一次是否需要提醒（对于常驻用户）
    this._startPeriodicCheck();

    // 首次进入时渲染打卡卡片
    this._renderStreakCard();
  },

  // ============================================
  //  通知权限
  // ============================================

  /** 请求通知权限（温和时机触发，如完成领蛋后） */
  requestPermission() {
    if (!('Notification' in window)) {
      // 浏览器不支持 Notification API
      return;
    }

    if (Notification.permission === 'granted') {
      this._permission = 'granted';
      localStorage.setItem('penguin_notification_permission', 'granted');
      return;
    }

    if (Notification.permission === 'denied') {
      this._permission = 'denied';
      localStorage.setItem('penguin_notification_permission', 'denied');
      return;
    }

    // 默认状态：询问用户
    Notification.requestPermission().then(perm => {
      this._permission = perm;
      localStorage.setItem('penguin_notification_permission', perm);
      if (perm === 'granted') {
        // 通知权限已开启
      }
    });
  },

  /** 显示一个温和的 toast 邀请开启通知 */
  showPermissionToast() {
    if (this._permission === 'granted' || this._permission === 'denied') return;
    if (localStorage.getItem('penguin_notification_toast_shown')) return;

    // 延迟显示避免和页面加载冲突
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.className = 'notification-toast-permission';
      toast.innerHTML = `
        <span>🔔 开启通知，让蛋蛋每天提醒你~</span>
        <button class="ntp-btn ntp-btn-yes" id="ntp-btn-yes">好的</button>
        <button class="ntp-btn ntp-btn-later" id="ntp-btn-later">以后再说</button>
      `;
      document.body.appendChild(toast);

      const cleanup = () => {
        localStorage.setItem('penguin_notification_toast_shown', '1');
        if (toast.parentNode) toast.remove();
      };

      document.getElementById('ntp-btn-yes').addEventListener('click', () => {
        this.requestPermission();
        cleanup();
      });
      document.getElementById('ntp-btn-later').addEventListener('click', cleanup);

      // 10秒后自动消失
      setTimeout(cleanup, 10000);
    }, 2000);
  },

  // ============================================
  //  定时检查
  // ============================================

  _startPeriodicCheck() {
    // 每 30 分钟检查一次是否到了提醒时间
    this._reminderTimer = setInterval(() => {
      this._checkAndNotify();
    }, 30 * 60 * 1000);

    // 首次延迟 5 秒检查
    setTimeout(() => this._checkAndNotify(), 5000);
  },

  /** 核心检查逻辑 */
  _checkAndNotify() {
    if (!this.app || !this.app.penguinData) return;

    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();
    const consecutiveDays = this.app.penguinData.consecutiveDays || 0;
    const lastLoginDate = this.app.penguinData.lastLoginDate || '';

    // 如果已经在今天打开过了 → 不需要提醒
    if (lastLoginDate === today) {
      this._todayReminded = false; // 重置标记
      return;
    }

    // 如果今天已经发过通知 → 不重复发
    if (this._todayReminded) return;

    // ── 场景判断 ──
    // ① 连续 3 天以上 + 今天未登录 + 晚上 → 预警中断
    if (consecutiveDays >= 3 && hour >= 20 && hour < 23) {
      this._sendNotification(
        '⚠️ 连续打卡预警',
        `蛋蛋已经连续陪伴你 ${consecutiveDays} 天了！今天还没来看看吗？过了今天就断了...`
      );
      this._todayReminded = true;
    }
    // ② 连续 7 天 → 里程碑提醒
    else if (consecutiveDays === 7 && hour >= 19 && hour < 22) {
      this._sendNotification(
        '🔥 一周全勤里程碑！',
        '你已经连续陪伴蛋蛋 7 天了！今天也来看看蛋蛋吧~'
      );
      this._todayReminded = true;
    }
    // ③ 连续 14 天
    else if (consecutiveDays === 14 && hour >= 19 && hour < 22) {
      this._sendNotification(
        '🌟 两周全勤！',
        `连续 ${consecutiveDays} 天的陪伴，蛋蛋已经离不开你啦！`
      );
      this._todayReminded = true;
    }
    // ④ 每日日常提醒（20:00 默认）
    else if (/* 没有今日登录记录 */ lastLoginDate !== today && hour >= 20 && hour < 22) {
      this._sendNotification(
        '🐧 蛋蛋在想你',
        '今天还没和蛋蛋聊天哦~ 来聊聊今天发生了什么吧！'
      );
      this._todayReminded = true;
    }
  },

  /** 发送浏览器通知 */
  _sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (this._permission !== 'granted' && Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐧</text></svg>',
        tag: 'penguin-reminder',
        requireInteraction: false,
        silent: false
      });
      // 通知已发送
    } catch (e) {
      console.warn('[NotificationManager] 通知发送失败:', e.message);
    }
  },

  // ============================================
  //  页面内 UI 卡片
  // ============================================

  /** 渲染首页连续打卡卡片 */
  _renderStreakCard() {
    if (!this.app || !this.app.penguinData) return;

    const cardEl = document.getElementById('streak-card');
    if (!cardEl) return;

    const consecutiveDays = this.app.penguinData.consecutiveDays || 0;
    const today = new Date().toDateString();
    const lastLoginDate = this.app.penguinData.lastLoginDate || '';
    const isTodayLoggedIn = (lastLoginDate === today);

    let cardHTML = '';
    let cardClass = 'streak-card';

    if (consecutiveDays >= 30) {
      cardClass += ' streak-card--milestone';
      cardHTML = `
        <div class="streak-icon">🏆</div>
        <div class="streak-content">
          <div class="streak-title">${consecutiveDays} 天全勤！</div>
          <div class="streak-sub">蛋蛋是你最忠实的伙伴</div>
        </div>
      `;
    } else if (consecutiveDays >= 14) {
      cardClass += ' streak-card--hot';
      cardHTML = `
        <div class="streak-icon">🌟</div>
        <div class="streak-content">
          <div class="streak-title">已陪伴 ${consecutiveDays} 天</div>
          <div class="streak-sub">两周全勤，继续保持！</div>
        </div>
      `;
    } else if (consecutiveDays >= 7) {
      cardClass += ' streak-card--hot';
      cardHTML = `
        <div class="streak-icon">🔥</div>
        <div class="streak-content">
          <div class="streak-title">连续 ${consecutiveDays} 天</div>
          <div class="streak-sub">一周全勤，解锁「恒心企鹅」</div>
        </div>
      `;
    } else if (consecutiveDays >= 3) {
      cardHTML = `
        <div class="streak-icon">🎉</div>
        <div class="streak-content">
          <div class="streak-title">已连续陪伴 ${consecutiveDays} 天</div>
          <div class="streak-sub">${isTodayLoggedIn ? '今天已打卡 ✓' : '今天来看看蛋蛋吧~'}</div>
        </div>
      `;
    } else if (!isTodayLoggedIn && consecutiveDays > 0) {
      // 曾经有连续登录但今天断了 → 重置为 1（已经在 updateConsecutiveDays 处理）
      cardHTML = `
        <div class="streak-icon">😢</div>
        <div class="streak-content">
          <div class="streak-title">今天还没打卡</div>
          <div class="streak-sub">来和蛋蛋聊聊天吧~</div>
        </div>
      `;
    } else {
      // 第一天或尚未建立连续记录
      cardHTML = `
        <div class="streak-icon">🐧</div>
        <div class="streak-content">
          <div class="streak-title">欢迎回来！</div>
          <div class="streak-sub">${consecutiveDays > 0 ? '连续打卡第 ' + consecutiveDays + ' 天' : '每天聊天让蛋蛋成长~'}</div>
        </div>
      `;
    }

    // 即将中断预警（在卡片内叠加显示）
    if (consecutiveDays >= 3 && !isTodayLoggedIn) {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 18) {
        const hoursLeft = 24 - hour;
        cardHTML += `
          <div class="streak-warning">
            ⚠️ 距今日打卡截止还有约 ${hoursLeft} 小时
          </div>
        `;
      }
    }

    cardEl.className = cardClass;
    cardEl.innerHTML = cardHTML;
    cardEl.style.display = 'flex';
  },

  /** 刷新打卡卡片（外部调用入口） */
  refreshStreakCard() {
    this._renderStreakCard();
  }
};
