/**
 * AI企鹅养成 - 主动关怀系统 v1
 * 基于用户年级/使用频率/沉默时长，企鹅主动发起话题
 *
 * 触发时机：
 *   1. 打开 App 时（沉默检查）
 *   2. 每次聊完天返回主页后（随机概率）
 *   3. 特定时间窗口（早安/晚安等）
 *
 * 显示方式：
 *   企鹅气泡浮层 —— 从企鹅图像附近弹出，2-3 秒后自动收起或用户点击进入聊天
 */

const CareSystem = {
  _app: null,                   // App 引用
  _bubbleTimer: null,           // 气泡自动消失计时器
  _checkInterval: null,         // 定期检查计时器
  _lastCheckTime: 0,

  // ==========================================
  //  关怀消息模板库
  // ==========================================
  CARING_MESSAGES: {
    // 按 Silence Duration 分层
    justNow: [
      '欢迎回来！想和我聊聊今天的事吗？',
      '嘿嘿，我就知道你会回来~今天有什么新鲜事？',
      '我又学了好多新知识，要给你讲讲鹅厂的故事吗？'
    ],
    fewHours: [
      '几个小时没见，想你了呢~最近在忙什么呀？',
      '嗨！我刚才做了个梦，梦见你在准备面试呢~是真的吗？',
      '你离开的这段时间，我又长大了0.001毫米！来看看？'
    ],
    oneDay: [
      '耶！今天也见到你了~坚持打卡的感觉怎么样？',
      '新的一天，新的成长！要不要看看你的技能树？',
      '早上好/下午好/晚上好！今天想聊点什么呢？'
    ],
    severalDays: [
      '好几天没见了！我有点想你，也担心你是不是太忙了…',
      '这几天我一直在蛋里回顾你之前聊的话题，要不要继续？',
      '终于等到你！上次我们聊到一半你就走了，要接着聊吗？'
    ],
    longTime: [
      '好久不见！我一直在等你回来。最近过得怎么样？',
      '你终于回来了！这段时间发生了好多事，想听听吗？',
      '我还以为你把我忘了呢…不过没关系，我一直在这里等你~'
    ]
  },

  // 按年级定制的引导消息
  GRADE_MESSAGES: {
    freshman: [
      '你知道吗？腾讯有7个事业群，每个都超酷的！想听哪个？',
      '大一是最好的探索期！想不想试试"互联网一日体验"？',
      '听说最近又出了新的互联网热点，要我给你讲讲吗？'
    ],
    sophomore: [
      '大二是找方向的关键期！要看看你的专业能做什么吗？',
      '暑假快到了，要不要规划一下黄金窗口期的行动计划？',
      '你知道产品经理和程序员每天都在干什么吗？'
    ],
    junior: [
      '大三的实习季到了！你的简历准备好了吗？',
      '要不要模拟一次面试？我可以当你的面试官！',
      '腾讯的实习生培养体系超棒的，要我给你介绍吗？'
    ],
    senior: [
      '秋招进行得怎么样了？有任何焦虑都可以和我说~',
      '拿到offer了吗？选offer有困惑的话，我们可以一起分析！',
      '别忘了照顾好自己的心态，你已经很棒了！'
    ]
  },

  // 按时段的消息
  TIME_MESSAGES: {
    morning:   { range: [5, 11],  msgs: ['早安！新的一天，今天有什么计划？', '早上好呀~一日之计在于晨，今天想学点什么？'] },
    noon:      { range: [11, 13], msgs: ['中午好！吃饭了吗？午休时也可以和我聊聊~', '午休时间~要不要趁现在看看最近的行业动态？'] },
    afternoon: { range: [13, 18], msgs: ['下午好！今天的学习/工作进度怎么样？', '下午有点困？来和我聊聊天提提神吧~'] },
    evening:   { range: [18, 22], msgs: ['晚上好！今天过得怎么样？有什么收获？', '一天结束了，写篇日记总结一下？'] },
    night:     { range: [22, 24], msgs: ['这么晚了还没休息呀~别太累了，早点睡觉哦', '夜深了，如果睡不着，我陪你安静地聊一会吧'] },
    lateNight: { range: [0, 5],   msgs: ['凌晨了！快放下手机去睡觉~明天我们再聊', '这个点了还不睡？有什么烦恼可以和我说说'] }
  },

  // ==========================================
  //  初始化
  // ==========================================
  init(app) {
    this._app = app;
    this._loadState();

    // 打开 App 时检查是否需要关怀
    this.checkAndShow();

    // 每 30 分钟检查一次（用户在主页时）
    this._checkInterval = setInterval(() => {
      if (this._app.appState.currentPage === 'main') {
        this.checkAndShow();
      }
    }, 30 * 60 * 1000);
  },

  _loadState() {
    try {
      const raw = localStorage.getItem('penguin_care_state');
      if (raw) {
        const state = JSON.parse(raw);
        this._lastCheckTime = state.lastCheckTime || 0;
        this._shownToday = state.shownToday || false;
        this._showCount = state.showCount || 0;
      } else {
        this._lastCheckTime = 0;
        this._shownToday = false;
        this._showCount = 0;
      }
    } catch (e) {
      this._lastCheckTime = 0;
      this._shownToday = false;
      this._showCount = 0;
    }
  },

  _saveState() {
    try {
      localStorage.setItem('penguin_care_state', JSON.stringify({
        lastCheckTime: this._lastCheckTime,
        shownToday: this._shownToday,
        showCount: this._showCount
      }));
    } catch (e) {}
  },

  // ==========================================
  //  核心逻辑：决定是否及用什么消息关怀
  // ==========================================
  checkAndShow() {
    const pd = this._app.penguinData;
    if (!pd || !pd.grade) return;

    // 今天已经显示过 3 次以上，不再打扰
    if (this._shownToday && this._showCount >= 3) return;

    const now = Date.now();
    const hour = new Date().getHours();

    // 凌晨 0-6 点不打扰
    if (hour >= 0 && hour < 6) return;

    // 检查沉默时长
    const lastChatTime = this._getLastChatTime();
    const silenceHours = Math.floor((now - lastChatTime) / 3600000);
    const silenceDays = Math.floor(silenceHours / 24);

    // 沉默 < 30 分钟不触发（除了早晚安）
    if (silenceHours < 0.5 && hour >= 6 && hour < 22) return;

    // 选择消息
    let message = this._pickMessage(pd.grade, silenceHours, silenceDays, hour);

    if (!message) return;

    // 早晚安时机用特殊消息
    const timeMsg = this._pickTimeMessage(hour);
    if (timeMsg && silenceHours > 2) {
      message = timeMsg;
    }

    // 如果有回访建议，且沉默 > 1天，优先使用
    if (silenceDays >= 1 && typeof DeepMemory !== 'undefined') {
      const followUps = DeepMemory.getFollowUpSuggestions(pd.grade);
      if (followUps.length > 0 && Math.random() < 0.6) {
        message = followUps[0].suggestion;
      }
    }

    // 显示气泡
    this._showBubble(message);

    // 更新状态
    this._lastCheckTime = now;
    this._shownToday = true;
    this._showCount++;
    this._saveState();
  },

  /** 获取最后一次聊天时间 */
  _getLastChatTime() {
    const chat = this._app.chatHistory;
    if (!chat || !chat.messages || chat.messages.length === 0) {
      return 0; // 从未聊过
    }
    // 找最后一条用户消息的时间
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].role === 'user' && chat.messages[i].timestamp) {
        return chat.messages[i].timestamp;
      }
    }
    return 0;
  },

  /** 根据沉默时长和年级选择消息 */
  _pickMessage(grade, silenceHours, silenceDays, hour) {
    let pool;

    if (silenceHours < 1) {
      pool = this.CARING_MESSAGES.justNow;
    } else if (silenceHours < 6) {
      pool = this.CARING_MESSAGES.fewHours;
    } else if (silenceDays < 1) {
      pool = this.CARING_MESSAGES.oneDay;
    } else if (silenceDays < 4) {
      pool = this.CARING_MESSAGES.severalDays;
    } else {
      pool = this.CARING_MESSAGES.longTime;
    }

    // 50% 概率混入一条年级相关引导
    if (Math.random() < 0.5 && this.GRADE_MESSAGES[grade]) {
      const gradePool = [...pool, ...this.GRADE_MESSAGES[grade]];
      return gradePool[Math.floor(Math.random() * gradePool.length)];
    }

    return pool[Math.floor(Math.random() * pool.length)];
  },

  /** 按时段选择早晚安消息 */
  _pickTimeMessage(hour) {
    for (const [key, cfg] of Object.entries(this.TIME_MESSAGES)) {
      if (hour >= cfg.range[0] && hour < cfg.range[1]) {
        return cfg.msgs[Math.floor(Math.random() * cfg.msgs.length)];
      }
    }
    return null;
  },

  // ==========================================
  //  UI：气泡展示
  // ==========================================
  _showBubble(message) {
    // 移除旧气泡
    this._hideBubble();

    // 创建气泡
    const bubble = document.createElement('div');
    bubble.className = 'care-bubble';
    bubble.id = 'care-bubble';
    bubble.innerHTML = `
      <div class="care-bubble-avatar">🐧</div>
      <div class="care-bubble-body">
        <div class="care-bubble-text">${message}</div>
        <div class="care-bubble-actions">
          <button class="care-bubble-chat" id="care-bubble-chat">💬 聊聊</button>
          <button class="care-bubble-dismiss" id="care-bubble-dismiss">✕</button>
        </div>
      </div>
    `;

    // 点击聊聊 → 打开聊天页
    bubble.querySelector('#care-bubble-chat').addEventListener('click', () => {
      this._hideBubble();
      if (this._app && this._app.openChatFromHome) {
        this._app.openChatFromHome(message);
      }
    });

    // 点击关闭
    bubble.querySelector('#care-bubble-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      this._hideBubble();
    });

    // 点击气泡其他区域也打开聊天
    bubble.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      this._hideBubble();
      if (this._app && this._app.openChatFromHome) {
        this._app.openChatFromHome(message);
      }
    });

    // 插入到企鹅区域附近
    const container = document.getElementById('penguin-display-large');
    if (container) {
      container.parentElement.appendChild(bubble);
    }

    // 入场动画
    requestAnimationFrame(() => {
      bubble.classList.add('show');
    });

    // 10 秒后自动消失
    this._bubbleTimer = setTimeout(() => this._hideBubble(), 10000);
  },

  _hideBubble() {
    if (this._bubbleTimer) {
      clearTimeout(this._bubbleTimer);
      this._bubbleTimer = null;
    }
    const bubble = document.getElementById('care-bubble');
    if (bubble) {
      bubble.classList.remove('show');
      setTimeout(() => { if (bubble.parentElement) bubble.remove(); }, 300);
    }
  },

  /** 手动触发一次关怀（e.g. 聊完天返回后调用） */
  triggerCare() {
    // 重置 showCount 让关怀可以触发
    this._showCount = Math.max(0, this._showCount - 1);
    this.checkAndShow();
  },

  /** 每日重置 */
  resetDaily() {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('penguin_care_reset');
    if (lastReset !== today) {
      this._shownToday = false;
      this._showCount = 0;
      localStorage.setItem('penguin_care_reset', today);
      this._saveState();
    }
  }
};
