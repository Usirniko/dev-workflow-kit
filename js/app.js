/**
 * AI企鹅养成 - 应用主控制器 v3
 * 集成：关键词分析引擎、长期记忆、成长日记、知识库、志愿时长
 * 核心流程：领蛋→年级选择→简历→主页（聊天+各模块）
 */
const App = {
  penguinData: null,
  chatHistory: null,
  userConfig: null,
  appState: null,
  resumeData: null,
  resumeDirty: false,          // 简历子页面是否有未保存的修改

  getDefaultPenguinData() {
    return {
      name: '蛋蛋',
      grade: null,
      stage: 1,
      level: 1,
      exp: 0,
      maxExp: 100,
      attributes: {
        knowledge: 0,
        creativity: 0,
        social: 0,
        action: 0,
        mentality: 0
      },
      totalMessages: 0,
      totalChats: 0,
      consecutiveDays: 0,
      lastLoginDate: '',
      unlockedBadges: [],
      completedActivities: [],
      dailyActivities: {},
      levelTitle: '初生蛋'
    };
  },

  getDefaultChatHistory() {
    return {
      messages: [],
      contextWindow: []
    };
  },

  getDefaultUserConfig() {
    return {
      isFirstVisit: true,
      grade: null,
      selectedAt: null,
      apiKey: '',
      baseUrl: '',
      model: '',
      theme: 'light'
    };
  },

  getDefaultAppState() {
    return {
      currentPage: 'egg',
      currentTab: 'chat',
      isLoading: false,
      error: null,
      lastSaveTime: Date.now(),
      // 聊天路由统一状态
      chatSessionId: null,        // 当前聊天会话唯一标识
      isEnteringChat: false       // 正在进入聊天（动画过渡中）
    };
  },

  // ============================================
  //  初始化
  // ============================================
  async init() {
    this._initSafe();
  },

  _initSafe() {
    try {
      UI.cacheElements();
    } catch (e) {
      console.error('[App] UI.cacheElements 失败：', e);
    }

    try {
      this.loadData();
    } catch (e) {
      console.error('[App] loadData 失败：', e);
      // 降级为默认数据
      this.penguinData = this.getDefaultPenguinData();
      this.chatHistory = this.getDefaultChatHistory();
      this.userConfig = this.getDefaultUserConfig();
      this.appState = this.getDefaultAppState();
      this.resumeData = null;
    }

    try {
      this.bindEvents();
    } catch (e) {
      console.error('[App] bindEvents 失败：', e);
    }

    try {
      this.initModules();
    } catch (e) {
      console.error('[App] initModules 失败：', e);
    }

    try {
      if (this.userConfig.isFirstVisit) {
        this.showEggPage();
      } else {
        this.showMainPage();
        this.initPenguinRenderer();
        this.restoreChat();
        this.updateHomeSuggestedQuestions();
        this.checkApiKeyOnStart();
      }
    } catch (e) {
      console.error('[App] 页面路由失败：', e);
      // 最终兜底：至少显示主页
      try { this.showMainPage(); } catch (_) {}
    }
  },

  loadData() {
    const data = Storage.loadAll();
    
    if (data && data.penguinData && data.userConfig) {
      this.penguinData = data.penguinData;
      this.chatHistory = data.chatHistory || this.getDefaultChatHistory();
      this.userConfig = data.userConfig;
      this.appState = data.appState || this.getDefaultAppState();
      this.resumeData = data.resumeData || null;
    } else {
      this.penguinData = this.getDefaultPenguinData();
      this.chatHistory = this.getDefaultChatHistory();
      this.userConfig = this.getDefaultUserConfig();
      this.appState = this.getDefaultAppState();
      this.resumeData = null;
    }

    // ★ 关键修复：运行态标志位不得从持久化恢复，否则旧会话中途崩溃/关闭
    // 会导致 isLoading 残留为 true，阻塞所有发送（chip 点击 + Enter 键均失效）
    this.appState.isLoading = false;
    this.appState.isEnteringChat = false;

    this.updateConsecutiveDays();

    // 刷新打卡提醒卡片
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.refreshStreakCard();
    }
  },

  initModules() {
    // 初始化主题
    ThemeColors.init();
    // 初始化所有子模块
    DiaryModule.init();
    KnowledgeModule.init();
    VolunteerModule.init();
    MemoryModule.init();
    KeywordEngine.loadAccessoryCounts();
    ActivitySystem.loadSessionState();
    if (typeof DressUp !== 'undefined') {
      DressUp.init();
    }
    // 初始化子模块（独立拆分的业务模块）
    if (typeof AppDressUp !== 'undefined') AppDressUp.init(this);
    if (typeof AppEgg !== 'undefined') AppEgg.init(this);
    // AppResume / AppApiGuide 已清理 — 功能已内聚到 app.js 主控制器
    // 初始化通知系统（打卡提醒）
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.init(this);
    }
    // 初始化深度记忆系统
    if (typeof DeepMemory !== 'undefined') {
      DeepMemory.init();
    }
    // 初始化主动关怀系统
    if (typeof CareSystem !== 'undefined') {
      CareSystem.resetDaily();
      CareSystem.init(this);
    }
  },

  saveData() {
    if (this._resetting) return; // 重置中，跳过保存，防止 beforeunload 回写数据
    this.appState.lastSaveTime = Date.now();
    Storage.saveAll(this.penguinData, this.chatHistory, this.userConfig, this.appState);
  },

  updateConsecutiveDays() {
    const today = new Date().toDateString();
    const lastDate = this.penguinData.lastLoginDate;
    
    if (lastDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastDate === yesterday) {
      this.penguinData.consecutiveDays++;
    } else if (lastDate !== today) {
      this.penguinData.consecutiveDays = 1;
    }
    
    this.penguinData.lastLoginDate = today;
    this.saveData();
  },

  // ============================================
  //  事件绑定
  // ============================================
  bindEvents() {
    // 领蛋按钮
    UI.elements.claimBtn.addEventListener('click', () => this.handleClaim());

    // 年级选择
    UI.elements.gradeCards.forEach(card => {
      card.addEventListener('click', () => {
        const grade = card.dataset.grade;
        this.handleGradeSelect(grade);
      });
    });

    // 首页选项卡切换
    UI.elements.tabItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.handleTabSwitch(tab);
      });
    });

    // 设置按钮
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleSettingsOpen());
    }

    // ============================================
    //  聊天入口
    //  入口：覆盖层内推荐问题 chip 点击 → 直接填充并发送
    // ============================================

    // 推荐问题点击（聊天覆盖层内）
    UI.elements.suggestedQuestions.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggested-chip');
      if (chip) {
        const question = chip.dataset.question;
        UI.elements.chatInput.value = question;
        this.handleChatSend();
      }
    });

    // 聊天态发送
    UI.elements.chatSendBtn.addEventListener('click', () => this.handleChatSend());
    UI.elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleChatSend();
      }
    });

    // 返回按钮：关闭聊天覆盖层
    UI.elements.btnBackChat.addEventListener('click', () => this.handleBackToHome());

    // 聊天覆盖层空白区域点击返回
    UI.elements.chatOverlay.addEventListener('click', (e) => {
      if (e.target === UI.elements.chatOverlay) {
        this.handleBackToHome();
      }
    });

    // 子页面返回按钮
    ['diary', 'resume', 'knowledge', 'grade', 'volunteer'].forEach(tab => {
      const btn = document.getElementById('btn-back-' + tab);
      if (btn) {
        btn.addEventListener('click', () => {
          // 保存/刷新处理（在关闭子页面前执行）
          if (tab === 'resume') {
            if (this.resumeDirty) {
              this.resumeData = this.collectSubResumeData();
              Storage.saveResume(this.resumeData);
              this.syncFromResumeUpdate();
              this.resumeDirty = false;
            }
            this.updateHomeSuggestedQuestions();
          }
          // 强制关闭聊天覆盖层，确保不会泄漏到首页视图
          UI.closeChatOverlay();
          // 返回首页，清除所有 tab 高亮
          UI.clearHomeTab();
          UI.goToHomeView();
          // ★ 安全兜底：显式确保年级详情页不会意外残留激活态
          if (UI.elements.subGradeDetailPage) {
            UI.elements.subGradeDetailPage.classList.remove('active');
          }
          // 知识库预渲染（下次打开时即时显示）
          // 注意：日记页不在此处预渲染，避免 innerHTML 触发 reflow 干扰 CSS 滑出过渡
          if (tab === 'knowledge') this.renderKnowledgePage();
        });
      }
    });

    // 年级详情返回按钮 → 回到年级直达页面
    const btnBackGradeDetail = document.getElementById('btn-back-grade-detail');
    if (btnBackGradeDetail) {
      btnBackGradeDetail.addEventListener('click', () => {
        // 只关闭详情子页面，保留年级列表子页面
        UI.elements.subGradeDetailPage.classList.remove('active');
      });
    }

    // 年级弹窗关闭
    UI.elements.gradeOverlay.addEventListener('click', () => {
      if (this.userConfig.grade) {
        UI.hideGradeModal();
      }
    });

    // 命名卡片事件
    UI.elements.namingBtnSkip.addEventListener('click', () => this.handleNamingSkip());
    UI.elements.namingBtnConfirm.addEventListener('click', () => this.handleNamingConfirm());
    UI.elements.namingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleNamingConfirm();
      }
    });

    // 我的鹅 - 名字编辑器事件
    if (UI.elements.nameEditorEditBtn) {
      UI.elements.nameEditorEditBtn.addEventListener('click', () => this.handleNameEditClick());
    }
    if (UI.elements.nameEditorText) {
      UI.elements.nameEditorText.addEventListener('blur', () => this.handleNameEditBlur());
      UI.elements.nameEditorText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          UI.elements.nameEditorText.blur();
        }
      });
    }

    // 简历页按钮（初始流程）
    UI.elements.btnResumeSkip.addEventListener('click', () => this.handleResumeSkip());
    UI.elements.btnResumeEnter.addEventListener('click', () => this.handleResumeEnter());
    UI.setupResumeFieldListeners();

    // 更多菜单（···按钮）
    if (UI.elements.nameEditorMoreBtn) {
      UI.elements.nameEditorMoreBtn.addEventListener('click', (e) => this.handleMoreMenuToggle(e));
    }
    if (UI.elements.moreMenu) {
      const menuActions = {
        'menu-switch-grade': 'switch-grade',
        'menu-export-data': 'export-data',
        'menu-import-data': 'import-data',
        'menu-toggle-theme': 'toggle-theme',
        'menu-reset-data': 'reset-data'
      };
      Object.entries(menuActions).forEach(([id, action]) => {
        const item = document.getElementById(id);
        if (item) {
          item.addEventListener('click', () => this.handleMoreMenuItemClick(action));
        }
      });
    }

    // 点击空白关闭更多菜单
    document.addEventListener('click', (e) => {
      if (UI.elements.moreMenu && UI.elements.moreMenu.style.display !== 'none') {
        const menu = UI.elements.moreMenu;
        const btn = UI.elements.nameEditorMoreBtn;
        if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
          UI.hideMoreMenu();
        }
      }
    });

    // FAB按钮 - 新建知识条目
    if (UI.elements.btnNewKnowledge) {
      UI.elements.btnNewKnowledge.addEventListener('click', () => this.handleNewKnowledge());
    }

    // 成长档案子选项卡切换
    this.initProfileSubTabs();

    // 装扮弹窗事件
    this.initDressUp();

    // 成长时间线按钮
    const timelineBtn = document.getElementById('btn-timeline');
    if (timelineBtn) {
      timelineBtn.addEventListener('click', () => this._openTimeline());
    }

    // 时间线弹窗遮罩点击关闭
    const timelineOverlay = document.getElementById('timeline-overlay');
    if (timelineOverlay) {
      timelineOverlay.addEventListener('click', (e) => {
        if (e.target === timelineOverlay) this._closeTimeline();
      });
    }

    // 仪表盘 Tab 切换
    document.querySelectorAll('.tb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tb;
        if (tabId) this._switchTab(tabId);
      });
    });

    // 全局键盘快捷键
    document.addEventListener('keydown', (e) => {
      this._handleGlobalKeyboard(e);
    });

    // 窗口关闭前保存
    window.addEventListener('beforeunload', () => this.saveData());
  },

  /**
   * 全局键盘快捷键分发
   * Esc — 关闭当前最顶层的弹窗/浮层
   * Ctrl+Enter — 日记编辑器中换行（在 handleDiaryBindEvents 中处理）
   */
  _handleGlobalKeyboard(e) {
    // 跳过输入框内的正常键盘操作（除了 Esc 和全局组合键）
    const tag = e.target.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

    if (e.key === 'Escape') {
      e.preventDefault();

      // 按优先级从高到低关闭弹窗
      // 1. 设置弹窗
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal && settingsModal.style.display !== 'none') {
        UI.hideSettingsModal();
        return;
      }

      // 2. 装扮弹窗
      const dressupOverlay = document.getElementById('dressup-overlay');
      if (dressupOverlay && dressupOverlay.classList.contains('active')) {
        UI.hideDressUpOverlay();
        return;
      }

      // 2.5 成长时间线弹窗
      const timelineOverlayKey = document.getElementById('timeline-overlay');
      if (timelineOverlayKey && timelineOverlayKey.classList.contains('active')) {
        this._closeTimeline();
        return;
      }

      // 3. 新建知识/日记弹窗
      const newEntryModal = document.getElementById('new-entry-modal');
      if (newEntryModal && newEntryModal.style.display !== 'none') {
        newEntryModal.style.display = 'none';
        return;
      }

      // 4. 年级切换弹窗
      const gradeSwitchModal = document.getElementById('grade-switch-modal');
      if (gradeSwitchModal && gradeSwitchModal.classList.contains('active')) {
        UI.hideGradeSwitchModal();
        return;
      }

      // 5. 聊天覆盖层
      if (UI.isChatOpen()) {
        this.handleBackToHome();
        return;
      }

      // 6. 更多菜单
      if (UI.elements.moreMenu && UI.elements.moreMenu.style.display !== 'none') {
        UI.hideMoreMenu();
        return;
      }

      // 7. 子页面返回首页
      if (!UI.elements.homeView || UI.elements.homeView.style.display === 'none') {
        // 检查是否在某个子页面中
        const subPages = ['subDiaryPage','subResumePage','subKnowledgePage','subGradePage','subVolunteerPage','subGradeDetailPage'];
        for (const key of subPages) {
          const el = UI.elements[key];
          if (el && el.classList.contains('active')) {
            UI.closeAllSubPages();
            UI.goToHomeView();
            return;
          }
        }
      }

      // 8. 如果在命名卡片中，跳过命名
      const namingOverlay = document.getElementById('naming-card-overlay');
      if (namingOverlay && namingOverlay.style.display !== 'none') {
        this.handleNamingSkip();
        return;
      }

      return;
    }

    // Ctrl+Enter / Shift+Enter 在 textarea 中换行 — 交给各组件自行处理
  },

  // ============================================
  //  选项卡切换处理
  // ============================================
  handleTabSwitch(tab) {
    switch (tab) {
      case 'chat':
        UI.clearHomeTab();
        UI.goToHomeView();
        this.openChatFromHome();
        break;
      case 'diary':
        UI.navigateToSubPage('diary');
        this.renderDiaryPage();
        break;
      case 'resume':
        UI.navigateToSubPage('resume');
        this.resumeDirty = false;
        this.renderResumeSubPage();
        break;
      case 'knowledge':
        UI.navigateToSubPage('knowledge');
        this.renderKnowledgePage();
        break;
      case 'grade':
        UI.navigateToSubPage('grade');
        this.renderGradePage();
        break;
      case 'volunteer':
        UI.navigateToSubPage('volunteer');
        this.renderVolunteerPage();
        break;
    }
  },

  // ============================================
  //  返回首页态
  // ============================================
  handleBackToHome() {
    // 强制关闭聊天覆盖层，防止泄漏
    UI.closeChatOverlay();
    UI.clearHomeTab();
    UI.goToHomeView();
    // 重置聊天会话标识（回到首页即结束当前会话）
    this.appState.chatSessionId = null;
    this.updateHomeSuggestedQuestions();

    // 聊完天返回后，触发主动关怀（可能提醒打卡/总结/鼓励）
    if (typeof CareSystem !== 'undefined') {
      setTimeout(() => CareSystem.triggerCare(), 1500);
    }
  },

  // ============================================
  //  更新首页推荐问题（年级自适应）
  // ============================================
  updateHomeSuggestedQuestions() {
    const grade = this.userConfig.grade || 'freshman';
    
    // 优先从离线问答库获取推荐问题
    let questions = [];
    if (typeof OfflineQA !== 'undefined') {
      questions = OfflineQA.getSuggestedQuestions(grade, 5);
    }
    
    // 如果离线库不够，从关键词引擎补充
    if (questions.length < 3 && typeof KeywordEngine !== 'undefined') {
      const kwQuestions = KeywordEngine.getSuggestedQuestions(grade, 5 - questions.length);
      questions = [...questions, ...kwQuestions].slice(0, 5);
    }
    
    // 如果有最近关键词，添加动态推荐
    const recentKw = this.chatHistory.contextWindow
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join(' ');
    if (typeof KeywordEngine !== 'undefined' && recentKw) {
      const dynamicQs = KeywordEngine.generateDynamicQuestions(
        KeywordEngine.analyze(recentKw).matchedCompetencyKeywords
      );
      if (dynamicQs.length > 0) {
        questions = [...dynamicQs, ...questions].slice(0, 5);
      }
    }

    // 简历引导问题（优先级高于通用问题）
    const resumeQs = this.getResumeGuidedQuestions();
    if (resumeQs.length > 0) {
      questions = [...resumeQs, ...questions].slice(0, 6);
    }

    // 腾讯引导选项兜底
    const tencentQs = [
      { q: '去腾讯校招官网看看', icon: '🎯' },
      { q: '了解腾讯的业务', icon: '🏢' }
    ];
    const hasTencentQs = questions.some(q => q.q === '去腾讯校招官网看看' || q.q === '了解腾讯的业务');
    if (!hasTencentQs) {
      questions = [...questions, ...tencentQs].slice(0, 6);
    }

    const container = UI.elements.suggestedQuestions;
    if (!container) return;
    
    container.innerHTML = questions.map(q => 
      `<div class="suggested-chip" data-question="${q.q}">${q.icon} ${q.q}</div>`
    ).join('');
  },

  // ============================================
  //  从首页打开聊天覆盖层（仅打开，不自动发送消息）
  //  用户可在覆盖层内选择推荐问题或自行输入
  // ============================================
  openChatFromHome() {
    if (UI.isChatOpen()) return;

    // ★ 安全网：强制清除可能在持久化中残留的 isLoading 锁
    // 避免因旧会话异常关闭导致发送被永久阻塞
    this.appState.isLoading = false;

    // 生成新的聊天会话 ID
    this.appState.chatSessionId = 'chat_' + Date.now();

    // 打开聊天覆盖层
    UI.openChatOverlay();

    // 渲染推荐问题
    this.updateHomeSuggestedQuestions();

    // 显示起始卡片区
    if (UI.elements.chatStarterArea) {
      UI.elements.chatStarterArea.style.display = '';
    }

    // ★ 未配置 API Key 时，在聊天内插入提示气泡（仅当前会话显示一次）
    this._showApiKeyChatHint();

    // 聚焦到聊天输入框
    setTimeout(() => {
      UI.elements.chatInput.focus();
    }, 400);
  },

  /**
   * 在聊天消息区顶部插入「未配置 API Key」的系统提示气泡
   * 使用 sessionStorage 确保同一标签页内只出现一次
   */
  _showApiKeyChatHint() {
    if (this.userConfig.apiKey) return;
    if (sessionStorage.getItem('apikey_chat_hint_shown')) return;

    const container = UI.elements.chatMessages;
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message apikey-hint-msg visible';
    msgDiv.id = 'apikey-chat-hint';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `
      <div style="font-size:22px;margin-bottom:4px;">🐧</div>
      <div>我还不会说话...</div>
      <div style="font-size:12px;opacity:0.65;margin-top:2px;">配置 API Key 后即可开始 AI 对话</div>
      <a class="hint-link" href="#" id="apikey-hint-link">🔑 点此配置 API Key</a>
      <button class="hint-dismiss" id="apikey-hint-dismiss">暂时跳过</button>
    `;
    msgDiv.appendChild(bubble);
    container.appendChild(msgDiv);

    // 点击配置按钮
    bubble.querySelector('#apikey-hint-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSettingsOpen();
    });

    // 点击跳过
    bubble.querySelector('#apikey-hint-dismiss').addEventListener('click', () => {
      msgDiv.remove();
    });

    sessionStorage.setItem('apikey_chat_hint_shown', '1');
  },

  // ============================================
  //  装扮系统
  // ============================================
  //  装扮系统 — 委托 AppDressUp
  // ============================================
  initDressUp() { AppDressUp.initDressUp(); },
  openDressUp() { AppDressUp.openDressUp(); },
  closeDressUp() { AppDressUp.closeDressUp(); },
  renderDressUpPreview() { AppDressUp.renderDressUpPreview(); },
  renderDressUpItems(category) { AppDressUp.renderDressUpItems(category); },
  handleDressUpClick(costumeId, category) { AppDressUp.handleDressUpClick(costumeId, category); },
  updateDressUpWearingInfo() { AppDressUp.updateDressUpWearingInfo(); },

  // ============================================
  //  聊天态发送消息（v3增强版）
  //  统一处理聊天覆盖层中的消息发送
  //  聊天上下文、历史记录、UI 状态与 openChatFromHome() 完全共享
  // ============================================
  async handleChatSend() {
    const message = UI.elements.chatInput.value.trim();
    if (!message || this.appState.isLoading) return;

    if (message.length < 2) {
      return;
    }

    // ★ 加锁+清理输入：确保无论何种异常均能释放锁，防止永久阻塞
    this.appState.isLoading = true;
    UI.elements.chatInput.value = '';
    try {

    // 添加用户消息到UI
    UI.addChatMessage('user', message);

    // 有消息后隐藏起始推荐问题卡片
    if (UI.elements.chatStarterArea) {
      UI.elements.chatStarterArea.style.display = 'none';
    }
    
    // 综合分析消息（v3增强版：含活动系统）
    const analysis = ChatEngine.analyzeMessage(
      message,
      this.userConfig.grade,
      this.penguinData.completedActivities,
      this.penguinData.dailyActivities
    );
    
    // 活动系统：应用活动奖励到属性变更（含连续登录倍率）
    const consecutiveBonus = ChatEngine.getConsecutiveBonus(this.penguinData.consecutiveDays);
    const activityResult = ActivitySystem.applyActivityRewards(
      analysis.changes, analysis.triggeredActivities, consecutiveBonus
    );
    // 使用合并后的 changes（关键词 + 活动奖励）
    analysis.changes = activityResult.changes;
    
    // 记录活动触发
    ActivitySystem.recordActivities(this.penguinData, analysis.triggeredActivities);
    ActivitySystem.incrementSessionRounds(this.penguinData);
    ActivitySystem.incrementDailyActivityCount(this.penguinData);
    
    // 更新属性
    const result = ChatEngine.updatePenguinAttributes(this.penguinData, analysis.changes, consecutiveBonus);
    this.penguinData = result.penguinData;
    this.penguinData.totalMessages++;
    this.penguinData.totalChats++;
    
    // 徽章检测
    const newBadges = ActivitySystem.checkBadges(this.penguinData);
    
    // 每日任务检测
    const dailyTaskCompleted = ActivitySystem.checkDailyTasks(this.penguinData);
    const taskRewardResult = ActivitySystem.applyDailyTaskRewards(dailyTaskCompleted, this.penguinData);
    if (dailyTaskCompleted.length > 0) {
      this.penguinData.exp += taskRewardResult.taskRewards.exp;
    }

    // 更新长期记忆
    MemoryModule.updateFromChat(
      { content: message, id: 'msg_' + Date.now() },
      analysis.keywordAnalysis,
      this.penguinData
    );

    const hasChanges = Object.values(analysis.changes).some(v => v > 0);

    // 保存用户消息
    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      keywords: analysis.matchedKeywords,
      attributeChanges: { ...analysis.changes },
      triggeredActivities: analysis.triggeredActivities,
      keywordAnalysis: analysis.keywordAnalysis
    };
    this.chatHistory.messages.push(userMsg);
    this.chatHistory.contextWindow.push({ role: 'user', content: message });

    // 先尝试离线问答库匹配
    const offlineMatch = ChatEngine.matchOffline(message, this.userConfig.grade);
    
    // 离线命中，无需API（锁由外层 finally 统一释放）
    if (offlineMatch && offlineMatch.score >= 0.55) {
      UI.hideTyping();
      
      const reply = offlineMatch.a.replace(/\{penguinName\}/g, this.penguinData.name || '蛋蛋');
      UI.addChatMessage('assistant', reply);
      
      // 如果离线匹配包含链接，自动在新窗口打开
      if (offlineMatch.linkUrl) {
        setTimeout(() => {
          window.open(offlineMatch.linkUrl, '_blank', 'noopener');
        }, 500);
      }
      
      const aiMsg = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        keywords: offlineMatch.keywords || [],
        attributeChanges: null,
        triggeredActivities: analysis.triggeredActivities,
        offlineMatch: true
      };
      this.chatHistory.messages.push(aiMsg);
      this.chatHistory.contextWindow.push({ role: 'assistant', content: reply });
      
      // 离线匹配也会触发关键词分析
      UI.updatePenguinView(this.penguinData);
      this.rerenderPenguin();
      
      // 等级称号升级通知
      if (result.levelChanged) {
        setTimeout(() => UI.showToast(`🎉 升级！获得称号：${result.levelTitle}`, 'success'), 1600);
      }
      
      // 活动触发通知
      this._showActivityToast(analysis.triggeredActivities, newBadges, dailyTaskCompleted);

      // 记录深度记忆
      if (typeof DeepMemory !== 'undefined') {
        DeepMemory.recordMoment(message, offlineMatch.a, this.userConfig.grade);
      }
      
      if (hasChanges) {
        const changes = [];
        if (analysis.changes.knowledge > 0) changes.push(`📚知识力+${analysis.changes.knowledge}`);
        if (analysis.changes.creativity > 0) changes.push(`🎨创造力+${analysis.changes.creativity}`);
        if (analysis.changes.social > 0) changes.push(`💬社交力+${analysis.changes.social}`);
        if (analysis.changes.action > 0) changes.push(`⚡行动力+${analysis.changes.action}`);
        if (analysis.changes.mentality > 0) changes.push(`💪心态值+${analysis.changes.mentality}`);
        // 消息质量权重反馈
        if (analysis.qualityFactor >= 1.5) {
          changes.push(`🧠深度加成×${analysis.qualityFactor.toFixed(1)}`);
        }
      }
      
      this.saveData();
      return;
    }

    // 离线未命中，调用 DeepSeek API（锁由外层 finally 统一释放）
    UI.showTyping();

    // 构建系统提示词（含长期记忆+简历上下文）
    const recentTopics = this.chatHistory.contextWindow
      .slice(-6)
      .filter(m => m.role === 'user')
      .map(m => m.content.slice(0, 30))
      .join('、');
    
    let systemPrompt = ChatEngine.buildSystemPrompt(
      this.userConfig.grade,
      this.penguinData,
      recentTopics
    );

    // 注入简历驱动上下文
    const resumeCtx = this.buildResumeContextForChat();
    if (resumeCtx) {
      systemPrompt += resumeCtx;
    }

    // 注入深度记忆上下文
    if (typeof DeepMemory !== 'undefined') {
      const memCtx = DeepMemory.buildMemoryContext(this.userConfig.grade);
      if (memCtx) {
        systemPrompt += memCtx;
      }
    }


    try {
      // 流式响应：创建空消息气泡，逐字填充
      UI.createStreamingMessage();
      
      ChatEngine.sendMessageStream(
        message,
        this.chatHistory.contextWindow,
        systemPrompt,
        // onChunk — 每收到文字就追加到气泡
        (chunk, _fullText) => { UI.appendToStreamingMessage(chunk); },
        // onDone — 流结束，处理后续逻辑
        (reply) => {
          UI.finishStreamingMessage();
          
          const aiMsg = {
            id: 'msg_' + Date.now(),
            role: 'assistant',
            content: reply,
            timestamp: Date.now(),
            keywords: [],
            attributeChanges: null,
            triggeredActivities: analysis.triggeredActivities
          };
          this.chatHistory.messages.push(aiMsg);
          this.chatHistory.contextWindow.push({ role: 'assistant', content: reply });

          if (analysis.keywordAnalysis.totalWeight >= 5) {
            KnowledgeModule.extractFromChat(userMsg, aiMsg, analysis.keywordAnalysis);
          }

          UI.updatePenguinView(this.penguinData);
          this.rerenderPenguin();

          if (result.stageChanged) {
            PenguinRenderer.playEvolutionAnimation();
          }

          if (result.levelChanged) {
            setTimeout(() => UI.showToast(`🎉 升级！获得称号：${result.levelTitle}`, 'success'), 1600);
          }

          if (hasChanges) {
            const changes = [];
            if (analysis.changes.knowledge > 0) changes.push(`📚知识力+${analysis.changes.knowledge}`);
            if (analysis.changes.creativity > 0) changes.push(`🎨创造力+${analysis.changes.creativity}`);
            if (analysis.changes.social > 0) changes.push(`💬社交力+${analysis.changes.social}`);
            if (analysis.changes.action > 0) changes.push(`⚡行动力+${analysis.changes.action}`);
            if (analysis.changes.mentality > 0) changes.push(`💪心态值+${analysis.changes.mentality}`);
            // 消息质量权重反馈
            if (analysis.qualityFactor >= 1.5) {
              changes.push(`🧠深度加成×${analysis.qualityFactor.toFixed(1)}`);
            }
          }

          if (analysis.keywordAnalysis.direction) {
            const d = analysis.keywordAnalysis.direction;
          }

          this._showActivityToast(analysis.triggeredActivities, newBadges, dailyTaskCompleted);

          // 记录深度记忆
          if (typeof DeepMemory !== 'undefined') {
            DeepMemory.recordMoment(message, reply, this.userConfig.grade);
          }
        },
        // onError — 流失败时兜底
        (error) => {
          UI.finishStreamingMessage();
          
          // 如果流式消息是空的，移除它并显示错误
          const streamingBubble = UI._streamingBubble;
          if (streamingBubble && !streamingBubble.textContent.trim()) {
            if (UI._streamingMsg) {
              UI._streamingMsg.remove();
            }
            UI._streamingMsg = null;
            UI._streamingBubble = null;
          }

          let errorMsg = '这个问题我还不太会，你可以试试问点别的，比如「腾讯有哪些业务？」🐧';
          if (error.message.includes('超时')) {
            errorMsg = '这个问题我还不太会，你可以试试问点别的，比如「腾讯有哪些业务？」🐧';
          } else if (error.message.includes('频繁')) {
            errorMsg = '聊得太快了，让我喘口气~这个问题我还不太会，你可以试试问点别的，比如「腾讯有哪些业务？」🐧';
          } else if (error.message.includes('API Key')) {
            errorMsg = '请先在设置中配置 DeepSeek API Key，然后就可以和我聊天啦~🐧';
          }
          
          UI.addChatMessage('assistant', errorMsg);
          
          this.chatHistory.messages.push({
            id: 'msg_' + Date.now(),
            role: 'assistant',
            content: errorMsg,
            timestamp: Date.now(),
            keywords: [],
            attributeChanges: null,
            triggeredActivities: []
          });
          this.chatHistory.contextWindow.push({ role: 'assistant', content: errorMsg });
        }
      );
    } catch (e) {
      // 捕获同步异常（API 调用前/后的同步代码错误）
      console.error('[handleChatSend] 同步异常:', e);
    }

    this.saveData();
    } finally {
      // ★ 确保锁在任何情况下（包括同步异常、异步失败、早期返回）都被释放
      this.appState.isLoading = false;
    }
  },

  // ============================================
  //  重新渲染企鹅（应用关键词配饰）
  // ============================================
  rerenderPenguin() {
    PenguinRenderer.stop();
    const config = PenguinRenderer.getStageConfig(this.penguinData.stage, this.penguinData.attributes);
    const stageNames = ['', '🥚 好奇探索期', '🐣 方向探索期', '🐧 实习准备期', '🚀 求职冲刺期'];
    // 名字由 updatePenguinNameDisplay 统一管理
    const LEVEL_TITLES = ['初生蛋', '好奇蛋', '🐣 破壳企鹅', '探索企鹅', '🐧 实习企鹅', '进阶企鹅', '🚀 冲刺企鹅', '职场企鹅', '精英企鹅', '🏆 传奇企鹅'];
    const title = this.penguinData.levelTitle || LEVEL_TITLES[this.penguinData.level - 1] || '初生蛋';
    UI.elements.penguinLevel.textContent = `Lv.${this.penguinData.level} · ${title}`;
    UI.elements.penguinStage.textContent = stageNames[this.penguinData.stage];
    PenguinRenderer.render(this.penguinData);

    // 同步刷新"我的鹅"子页面大图
    if (this._detailRenderer) {
      cancelAnimationFrame(this._detailRenderer._animId);
      this._detailRenderer.render(this.penguinData);
    }

    // 刷新成长仪表盘
    this._renderGrowthDashboard();
  },

  // ============================================
  //  📊 成长仪表盘（时间线 + 技能树 + 雷达图 + 月度报告）
  // ============================================

  /** 收集仪表盘所需的所有数据 */
  _getTimelineData() {
    const pd = this.penguinData;
    const diaryStats = (typeof DiaryModule !== 'undefined') ? DiaryModule.getStats() : { total: 0 };

    // 简历完成度：有效字段数 / 总字段数
    let resumePct = 0;
    if (this.resumeData) {
      const fields = Object.values(this.resumeData).filter(v => typeof v === 'string');
      const filled = fields.filter(v => v.trim().length > 0).length;
      resumePct = fields.length > 0 ? Math.round((filled / fields.length) * 100) : 0;
    }

    // 特征数 = 徽章数 +（粗略）配饰数
    const badgeCount = (pd.unlockedBadges && pd.unlockedBadges.length) || 0;
    const featureCount = badgeCount + (pd.completedActivities ? pd.completedActivities.length : 0);

    // 已陪伴天数（从 firstLoginDate 或 consecutiveDays 推断）
    const daysElapsed = pd.consecutiveDays || 0;

    return {
      level: pd.level || 1,
      stage: pd.stage || 1,
      totalChats: pd.totalChats || 0,
      diaryCount: diaryStats.total || 0,
      resumePct,
      featureCount,
      daysElapsed,
      name: pd.name || '蛋蛋'
    };
  },

  /** 里程碑定义 */
  MILESTONES: [
    {
      id: 'egg',
      minLevel: 1,
      icon: '🥚',
      name: '初识期',
      levelRange: 'Lv.1-3',
      dotClass: 'stage-egg',
      desc: '你遇到了蛋蛋，开始探索求职世界。每一次对话都在积累成长的养分。'
    },
    {
      id: 'chick',
      minLevel: 4,
      icon: '🐣',
      name: '成长期',
      levelRange: 'Lv.4-6',
      dotClass: 'stage-chick',
      desc: '蛋蛋破壳而出！你开始有了方向感，技能树逐渐丰满，简历也在慢慢成型。'
    },
    {
      id: 'adult',
      minLevel: 7,
      icon: '🐧',
      name: '蜕变期',
      levelRange: 'Lv.7-10',
      dotClass: 'stage-adult',
      desc: '企鹅羽翼渐丰，你已经有了清晰的目标和扎实的准备，随时可以踏上求职战场。'
    }
  ],

  /** 获取某个里程碑的详情 HTML */
  _getMilestoneDetail(ms, data) {
    const items = [
      { icon: '💬', label: '累计对话', value: data.totalChats + ' 次' },
      { icon: '📝', label: '成长日记', value: data.diaryCount + ' 篇' },
      { icon: '📋', label: '简历完成度', value: data.resumePct + '%' },
      { icon: '🌟', label: '解锁特征', value: data.featureCount + ' 个' }
    ];
    return items.map(i =>
      '<div class="tl-detail-item"><span class="tl-di-icon">' + i.icon + '</span><span>' + i.label + '：<b>' + i.value + '</b></span></div>'
    ).join('');
  },


  /** 渲染成长仪表盘（所有 4 个 Tab） */
  _renderGrowthDashboard() {
    this._renderTimelineTab();
    this._renderSkillsTab();
    this._renderRadarTab();
    this._renderReportTab();
  },

  /** 渲染时间线 Tab 内容 */
  _renderTimelineTab() {
    const container = document.getElementById('tb-panel-timeline');
    if (!container) return;

    const data = this._getTimelineData();
    const currentLevel = data.level;

    const milestones = this.MILESTONES.map(ms => {
      let status = 'locked';
      if (currentLevel >= ms.minLevel + 3) status = 'completed';
      else if (currentLevel >= ms.minLevel) status = 'current';
      return { ...ms, status };
    });

    const nodesHtml = milestones.map(ms => {
      const nodeClass = ms.status === 'completed' ? 'completed' : (ms.status === 'current' ? 'current' : '');
      let badgeHtml = '';
      if (ms.status === 'completed') badgeHtml = '<span class="tl-badge done">✅ 已完成</span>';
      else if (ms.status === 'current') badgeHtml = '<span class="tl-badge active">🔄 当前</span>';
      else badgeHtml = '<span class="tl-badge locked">🔒</span>';
      const dotClass = ms.status === 'locked' ? 'locked' : ms.dotClass;

      return '<div class="tl-node ' + nodeClass + '" data-milestone="' + ms.id + '" onclick="App._toggleTimelineNode(this)">'
        + '<div class="tl-connector"><div class="tl-dot ' + dotClass + '"></div><div class="tl-line"></div></div>'
        + '<div class="tl-content">'
        + '<div style="display:flex;align-items:center;">'
        + '<span class="tl-stage-icon">' + ms.icon + '</span>'
        + '<span class="tl-stage-name">' + ms.name + '</span>'
        + '<span class="tl-stage-range">' + ms.levelRange + '</span>'
        + badgeHtml
        + '</div>'
        + '<div class="tl-stage-data">'
        + '<span>💬 ' + data.totalChats + '</span>'
        + '<span>📝 ' + data.diaryCount + '</span>'
        + '<span>📋 ' + data.resumePct + '%</span>'
        + '<span>🌟 ' + data.featureCount + '</span>'
        + '</div></div></div>'
        + '<div class="tl-detail" data-detail="' + ms.id + '"><div class="tl-detail-inner">'
        + '<div style="font-weight:700;margin-bottom:4px;color:var(--text-primary);">' + ms.icon + ' ' + ms.name + ' · ' + ms.levelRange + '</div>'
        + ms.desc
        + '<div style="margin-top:6px;">' + this._getMilestoneDetail(ms, data) + '</div>'
        + '</div></div>';
    }).join('');

    container.innerHTML =
      '<div class="tl-track">' + nodesHtml + '</div>'
      + '<div class="tl-summary">已陪伴 <strong>' + data.daysElapsed + '</strong> 天 · 累计 <strong>' + data.totalChats + '</strong> 次对话 · <strong>' + data.diaryCount + '</strong> 篇日记 · 解锁 <strong>' + data.featureCount + '</strong> 个特征 · 简历完成度 <strong>' + data.resumePct + '%</strong></div>';
  },

  /** 渲染技能树 Tab */
  _renderSkillsTab() {
    const container = document.getElementById('tb-panel-skills');
    if (!container) return;

    const attrs = this.penguinData.attributes || {};
    const skills = [
      { name: '知识力', key: 'knowledge', icon: '📚', color: '#0052D9', val: attrs.knowledge || 0, tip: '行业认知、专业知识储备' },
      { name: '创造力', key: 'creativity', icon: '🎨', color: '#E37318', val: attrs.creativity || 0, tip: '解决问题的能力、创新思维' },
      { name: '社交力', key: 'social', icon: '💬', color: '#00A870', val: attrs.social || 0, tip: '沟通表达、人脉拓展' },
      { name: '行动力', key: 'action', icon: '⚡', color: '#D54941', val: attrs.action || 0, tip: '执行力、项目落地能力' },
      { name: '心态值', key: 'mentality', icon: '💪', color: '#7B3FF2', val: attrs.mentality || 0, tip: '抗压韧性、自我调节' }
    ];

    let html = '<div class="sk-section"><div class="sk-section-title">🌳 你的技能树</div>';

    skills.forEach(s => {
      const pct = Math.min(100, s.val);
      const level = pct >= 80 ? '精通' : pct >= 50 ? '熟练' : pct >= 20 ? '入门' : '初学';
      html += '<div class="sk-row">'
        + '<div class="sk-header"><span class="sk-icon">' + s.icon + '</span><span class="sk-name">' + s.name + '</span><span class="sk-level" style="color:' + s.color + '">' + level + '</span></div>'
        + '<div class="sk-bar-bg"><div class="sk-bar-fill" style="width:' + pct + '%;background:' + s.color + '"></div></div>'
        + '<div class="sk-meta"><span class="sk-tip">' + s.tip + '</span><span class="sk-val">' + s.val + '/100</span></div>'
        + '</div>';
    });

    // 技能树各方向专项进度
    html += '</div><div class="sk-section"><div class="sk-section-title">🎯 专项技能方向</div>';

    const directions = [
      { name: '产品思维', icon: '🧠', base: attrs.knowledge || 0, bonus: attrs.creativity || 0, desc: '需求分析、用户洞察、产品设计' },
      { name: '技术能力', icon: '💻', base: attrs.knowledge || 0, bonus: attrs.action || 0, desc: '编程基础、架构理解、工程实践' },
      { name: '运营策略', icon: '📊', base: attrs.social || 0, bonus: attrs.creativity || 0, desc: '数据分析、活动策划、用户运营' },
      { name: '设计审美', icon: '🎨', base: attrs.creativity || 0, bonus: attrs.knowledge || 0, desc: 'UI/UX、视觉表达、设计规范' },
      { name: '领导协作', icon: '🤝', base: attrs.social || 0, bonus: attrs.mentality || 0, desc: '团队管理、跨部门沟通、项目管理' },
      { name: '数据分析', icon: '📈', base: attrs.knowledge || 0, bonus: attrs.action || 0, desc: '数据驱动决策、SQL/Excel、A/B测试' }
    ];

    directions.forEach(d => {
      const score = Math.round(d.base * 0.6 + d.bonus * 0.4);
      const pct = Math.min(100, score);
      html += '<div class="sk-dir-row">'
        + '<div class="sk-dir-icon">' + d.icon + '</div>'
        + '<div class="sk-dir-info"><div class="sk-dir-name">' + d.name + '</div><div class="sk-dir-desc">' + d.desc + '</div></div>'
        + '<div class="sk-dir-bar-wrap"><div class="sk-dir-bar"><div class="sk-dir-fill" style="width:' + pct + '%"></div></div><span class="sk-dir-val">' + score + '</span></div>'
        + '</div>';
    });

    html += '</div>';

    // 提示
    const avgAttr = Math.round(skills.reduce((s, sk) => s + sk.val, 0) / skills.length);
    let tip = '';
    if (avgAttr < 20) tip = '💡 多和企鹅聊天，探索不同话题来提升各项能力吧！';
    else if (avgAttr < 50) tip = '🌱 各项能力正在均衡发展，继续保持！';
    else if (avgAttr < 80) tip = '🚀 你已经有了不错的基础，朝着精通迈进！';
    else tip = '🏆 技能树已经相当茁壮，你是企鹅的骄傲！';
    html += '<div class="sk-tip-bottom">' + tip + '</div>';

    container.innerHTML = html;
  },

  /** 渲染职业兴趣雷达图 Tab */
  _renderRadarTab() {
    const canvas = document.getElementById('tb-radar-canvas');
    if (!canvas) return;

    const attrs = this.penguinData.attributes || {};
    const labels = ['技术研发', '产品设计', '运营市场', '数据分析', '综合管理', '创意内容'];
    const values = [
      Math.round((attrs.knowledge || 0) * 0.5 + (attrs.action || 0) * 0.5),
      Math.round((attrs.creativity || 0) * 0.6 + (attrs.knowledge || 0) * 0.4),
      Math.round((attrs.social || 0) * 0.6 + (attrs.action || 0) * 0.4),
      Math.round((attrs.knowledge || 0) * 0.7 + (attrs.action || 0) * 0.3),
      Math.round((attrs.social || 0) * 0.4 + (attrs.mentality || 0) * 0.4 + (attrs.action || 0) * 0.2),
      Math.round((attrs.creativity || 0) * 0.5 + (attrs.social || 0) * 0.3 + (attrs.knowledge || 0) * 0.2)
    ];

    const colors = ['#0052D9', '#E37318', '#00A870', '#D54941', '#7B3FF2', '#E84B9B'];

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 340;
    // 对齐 dpr 缩放前重置（避免 repeat 缩放累积）
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const cx = size / 2, cy = size / 2;
    const maxR = 118;
    const sides = labels.length;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    // 清除
    ctx.clearRect(0, 0, size, size);

    // 背景网格
    for (let level = 5; level >= 1; level--) {
      const r = (maxR / 5) * level;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = startAngle + angleStep * i;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(128,128,128,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 轴线
    for (let i = 0; i < sides; i++) {
      const a = startAngle + angleStep * i;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.strokeStyle = 'rgba(128,128,128,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 数据区域
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = startAngle + angleStep * i;
      const r = (values[i] / 100) * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,82,217,0.12)';
    ctx.fill();
    ctx.strokeStyle = '#0052D9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 数据点
    for (let i = 0; i < sides; i++) {
      const a = startAngle + angleStep * i;
      const r = (values[i] / 100) * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 标签
    ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < sides; i++) {
      const a = startAngle + angleStep * i;
      const labelR = maxR + 24;
      const x = cx + Math.cos(a) * labelR;
      const y = cy + Math.sin(a) * labelR;
      ctx.fillStyle = 'var(--text-primary)';
      ctx.fillText(labels[i], x, y);
    }

    // 图例
    const legend = document.getElementById('tb-radar-legend');
    if (legend) {
      legend.innerHTML = labels.map((l, i) =>
        '<span class="tb-radar-legend-item"><span class="tb-radar-dot" style="background:' + colors[i] + '"></span>' + l + ' <b>' + values[i] + '</b></span>'
      ).join('');
    }
  },

  /** 渲染月度报告 Tab */
  _renderReportTab() {
    const container = document.getElementById('tb-panel-report');
    if (!container) return;

    const pd = this.penguinData;
    const now = new Date();
    const monthLabel = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';

    // 收集各项统计
    const diaryStats = (typeof DiaryModule !== 'undefined') ? DiaryModule.getStats() : { total: 0 };
    const memStats = (typeof DeepMemory !== 'undefined') ? DeepMemory.getStats() : { thisMonthCount: 0, topTopics: [], avgImportance: 0, highImportanceCount: 0 };
    const completedActivities = pd.completedActivities || [];
    const badges = pd.unlockedBadges || [];

    // 本月新增数据（简化估算）
    const thisMonthActivities = completedActivities.length;
    const badgeCount = badges.length;
    const totalChats = pd.totalChats || 0;
    const level = pd.level || 1;
    const stage = pd.stage || 1;

    const stageNames = ['', '🥚 好奇探索期', '🐣 方向探索期', '🐧 实习准备期', '🚀 求职冲刺期'];

    let html = '<div class="rp-header">📊 ' + monthLabel + ' 成长月报</div>';

    // 概览卡片
    html += '<div class="rp-cards">'
      + '<div class="rp-card"><div class="rp-card-num">' + totalChats + '</div><div class="rp-card-label">累计对话</div></div>'
      + '<div class="rp-card"><div class="rp-card-num">Lv.' + level + '</div><div class="rp-card-label">当前等级</div></div>'
      + '<div class="rp-card"><div class="rp-card-num">' + stageNames[stage] + '</div><div class="rp-card-label">成长阶段</div></div>'
      + '<div class="rp-card"><div class="rp-card-num">' + badgeCount + '</div><div class="rp-card-label">成就徽章</div></div>'
      + '</div>';

    // 关注话题排行
    html += '<div class="rp-section"><div class="rp-section-title">🔥 近期关注话题</div>';
    if (memStats.topTopics && memStats.topTopics.length > 0) {
      html += '<div class="rp-topics">';
      memStats.topTopics.forEach((t, i) => {
        html += '<div class="rp-topic-item"><span class="rp-topic-rank">#' + (i + 1) + '</span><span class="rp-topic-name">' + t.topic + '</span><span class="rp-topic-count">' + t.count + '次</span></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="rp-empty">多和企鹅聊聊天，话题排行会在这里展示哦~</div>';
    }
    html += '</div>';

    // 成长里程碑
    html += '<div class="rp-section"><div class="rp-section-title">🏅 成长里程碑</div>';
    const milestones = [];
    if (level >= 3) milestones.push('🐣 成功破壳，进入成长期');
    if (level >= 7) milestones.push('🚀 进入蜕变冲刺期');
    if (level >= 10) milestones.push('🏆 达到传奇企鹅级别');
    if (stage >= 2) milestones.push('🌿 进入「' + stageNames[stage] + '」阶段');
    if (totalChats >= 50) milestones.push('💬 累计对话突破 50 次');
    if (diaryStats.total >= 10) milestones.push('📝 累计写了 ' + diaryStats.total + ' 篇日记');
    if (badgeCount >= 3) milestones.push('🌟 获得 ' + badgeCount + ' 个成就徽章');
    if (memStats.highImportanceCount >= 3) milestones.push('🧠 深度交流 ' + memStats.highImportanceCount + ' 次重要话题');

    if (milestones.length > 0) {
      html += '<div class="rp-milestones">';
      milestones.forEach(m => { html += '<div class="rp-ms-item">' + m + '</div>'; });
      html += '</div>';
    } else {
      html += '<div class="rp-empty">继续加油，你正在成长的路上！每一个里程碑都值得被记录~</div>';
    }
    html += '</div>';

    // 深度记忆统计
    if (memStats.thisMonthCount > 0) {
      html += '<div class="rp-section"><div class="rp-section-title">🧠 深度交流洞察</div>';
      html += '<div class="rp-insight">本月捕捉到 <b>' + memStats.thisMonthCount + '</b> 个重要对话节点，'
        + '平均深度评分 <b>' + memStats.avgImportance + '/10</b>。'
        + '其中 <b>' + memStats.highImportanceCount + '</b> 次属于高价值深度交流。</div>';
      html += '</div>';
    }

    // 结语
    html += '<div class="rp-ending">💙 每一步成长都值得被看见。下个月继续一起进步！</div>';

    container.innerHTML = html;
  },

  /** 打开仪表盘弹窗 */
  _openTimeline() {
    const overlay = document.getElementById('timeline-overlay');
    if (!overlay) return;
    this._renderGrowthDashboard();
    this._switchTab('timeline');
    overlay.style.display = '';
    overlay.classList.add('active');
  },

  /** 关闭仪表盘弹窗 */
  _closeTimeline() {
    const overlay = document.getElementById('timeline-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  },

  /** 切换仪表盘 Tab */
  _switchTab(tabId) {
    // 更新 Tab 按钮状态
    document.querySelectorAll('.tb-tab').forEach(t => t.classList.toggle('active', t.dataset.tb === tabId));
    // 更新面板显示
    document.querySelectorAll('.tb-panel').forEach(p => p.classList.toggle('active', p.id === 'tb-panel-' + tabId));
    // 雷达图需要重绘
    if (tabId === 'radar') {
      setTimeout(() => this._renderRadarTab(), 100);
    }
  },

  /** 点击某个节点，展开/收起详情 */
  _toggleTimelineNode(nodeEl) {
    if (!nodeEl) return;
    const msId = nodeEl.getAttribute('data-milestone');
    const track = nodeEl.closest('.tl-track');
    if (!track) return;
    const detail = track.querySelector('.tl-detail[data-detail="' + msId + '"]');
    if (!detail) return;
    track.querySelectorAll('.tl-detail.open').forEach(d => {
      if (d !== detail) d.classList.remove('open');
    });
    detail.classList.toggle('open');
  },

  // ============================================
  //  页面导航
  // ============================================
  showEggPage() {
    UI.showEggPage();
    this.appState.currentPage = 'egg';
  },

  showMainPage() {
    UI.showMainPage();
    this.appState.currentPage = 'main';
    UI.clearHomeTab();
    UI.updatePenguinView(this.penguinData);
    UI.updatePenguinNameDisplay(this.penguinData.name, this.userConfig.grade);
    this.updateHomeSuggestedQuestions();
    this.startHomeTicker();

    // 刷新打卡卡片
    if (typeof NotificationManager !== 'undefined') {
      NotificationManager.refreshStreakCard();
      NotificationManager.showPermissionToast();
    }

    // 渲染成长仪表盘
    this._renderGrowthDashboard();

    // 主动关怀检查
    if (typeof CareSystem !== 'undefined') {
      setTimeout(() => CareSystem.triggerCare(), 2000);
    }
  },

  /** 首页底部双栏：时间 + 随机问候语（按时段匹配） */
  HOME_GREETINGS: {
    morning: [  // 5:00 - 10:59
      '早上好！今天也要加油哦 ☀️',
      '新的一天，新的开始！',
      '早安呀，吃早餐了吗？🥐',
      '清晨的阳光和你都很美好~',
    ],
    noon: [     // 11:00 - 12:59
      '中午好！记得按时吃饭 🍚',
      '午饭时间到，补充能量吧！',
      '中午休息一下，下午更有精神~',
    ],
    afternoon: [ // 13:00 - 17:59
      '下午好，喝杯水休息一下~',
      '有空多看看窗外，放松眼睛~',
      '下午茶时间，来点小零食？🍪',
      '天气不错，适合出去走走 🚶',
    ],
    evening: [  // 18:00 - 21:59
      '晚上好呀，今天辛苦了 🌙',
      '晚饭吃了吗？好好犒劳自己~',
      '今晚早点休息哦 💤',
    ],
    night: [    // 22:00 - 4:59
      '晚安，做个好梦 🌟',
      '夜深了，该睡觉啦~',
      '充足的睡眠才能元气满满！',
    ],
    any: [      // 全时段通用
      '你好呀~',
      '嘿，今天过得怎么样？',
      '记得照顾好自己哦 💙',
      '今天学习了吗？企鹅陪你一起！',
      '吃点水果补充维C 🍎',
      '别忘了多喝水！',
      '加油，你是最棒的！💪',
    ],
  },

  /** 根据当前小时返回匹配的问候语 */
  _pickGreeting() {
    const h = new Date().getHours();
    let key;
    if (h >= 5 && h < 11) key = 'morning';
    else if (h >= 11 && h < 13) key = 'noon';
    else if (h >= 13 && h < 18) key = 'afternoon';
    else if (h >= 18 && h < 22) key = 'evening';
    else key = 'night';
    const pool = [...this.HOME_GREETINGS[key], ...this.HOME_GREETINGS.any];
    return pool[Math.floor(Math.random() * pool.length)];
  },

  _homeTickerId: null,
  _homeGreetingIdx: 0,

  startHomeTicker() {
    this.stopHomeTicker();
    const tick = () => {
      const el = document.getElementById('home-time-display');
      if (el) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        el.textContent = `${h}:${m}:${s}`;
      }
    };
    tick();
    // 初始显示一条匹配时段 + 全时段的问候
    const gelInit = document.getElementById('home-greeting-text');
    if (gelInit) gelInit.textContent = this._pickGreeting();

    this._homeTickerId = setInterval(() => {
      const tel = document.getElementById('home-time-display');
      if (tel) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        tel.textContent = `${h}:${m}:${s}`;
      }
      // 每 10 秒换一次问候语
      if (this._homeGreetingIdx % 10 === 0) {
        const gel = document.getElementById('home-greeting-text');
        if (gel) gel.textContent = this._pickGreeting();
      }
      this._homeGreetingIdx++;
    }, 1000);
  },

  stopHomeTicker() {
    if (this._homeTickerId) {
      clearInterval(this._homeTickerId);
      this._homeTickerId = null;
      this._homeGreetingIdx = 0;
    }
  },

  initPenguinRenderer() {
    PenguinRenderer.init(UI.elements.penguinDetailCanvas);
    PenguinRenderer.render(this.penguinData);

    // 聊天视图的小企鹅
    const miniCanvas = UI.getMiniPenguinCanvas();
    if (miniCanvas) {
      const miniRenderer = Object.create(PenguinRenderer);
      miniRenderer.canvas = miniCanvas;
      miniRenderer.ctx = miniCanvas.getContext('2d');
      miniRenderer.frameCount = 0;
      miniRenderer.blinkTimer = 0;
      miniRenderer.blinkState = false;
      miniRenderer.particles = [];
      miniCanvas.width = 56;
      miniCanvas.height = 56;
      
      const renderMini = () => {
        const config = PenguinRenderer.getStageConfig(this.penguinData.stage, this.penguinData.attributes);
        const ctx = miniRenderer.ctx;
        const w = 56, h = 56;
        ctx.clearRect(0, 0, w, h);
        
        miniRenderer.frameSkip = (miniRenderer.frameSkip || 0) + 1;
        if (miniRenderer.frameSkip >= 2) { miniRenderer.frameSkip = 0; miniRenderer.frameCount++; }
        const breathScale = 1 + Math.sin(miniRenderer.frameCount * 0.05) * 0.03;
        
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(breathScale, breathScale);
        
        const size = 18;
        
        if (config.isEgg) {
          const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, size * 0.7);
          grad.addColorStop(0, '#D4E6F1');
          grad.addColorStop(1, config.bodyColor);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.55, size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.ellipse(-2, -4, 3, 4, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#2C3E50';
          ctx.beginPath();
          ctx.arc(-3, -1, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.arc(3, -1, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(-4, -2, 0.7, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.arc(2, -2, 0.7, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = config.bodyColor;
          ctx.beginPath();
          ctx.ellipse(0, 2, size * 0.5, size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = config.bellyColor;
          ctx.beginPath();
          ctx.ellipse(0, 3, size * 0.32, size * 0.38, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = config.bodyColor;
          ctx.beginPath();
          ctx.arc(0, -size * 0.35, size * 0.32, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(-3, -size * 0.33, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.arc(3, -size * 0.33, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2C3E50';
          ctx.beginPath();
          ctx.arc(-3, -size * 0.33, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.arc(3, -size * 0.33, 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = config.beakColor;
          ctx.beginPath();
          ctx.moveTo(-1.5, -size * 0.2); ctx.lineTo(1.5, -size * 0.2);
          ctx.lineTo(0, -size * 0.1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#1A1A2E';
          ctx.beginPath();
          ctx.ellipse(-size * 0.48, 2, 3, 8, -0.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.ellipse(size * 0.48, 2, 3, 8, 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#E9C46A';
          ctx.beginPath();
          ctx.ellipse(-4, size * 0.55, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.ellipse(4, size * 0.55, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.restore();
        requestAnimationFrame(renderMini);
      };
      renderMini();
    }

    // "我的鹅"子页面大图企鹅（独立渲染器）
    const detailCanvas = UI.elements.penguinDetailCanvas;
    if (detailCanvas) {
      const detailRenderer = Object.create(PenguinRenderer);
      detailRenderer.canvas = detailCanvas;
      detailRenderer.ctx = detailCanvas.getContext('2d');
      detailRenderer.frameCount = 0;
      detailRenderer.blinkTimer = 0;
      detailRenderer.blinkState = false;
      detailRenderer.particles = [];
      detailRenderer.resize = function () {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        let containerWidth = container ? container.clientWidth : 0;
        if (containerWidth === 0) {
          containerWidth = this.canvas.clientWidth || this.canvas.width || 280;
        }
        const size = Math.max(100, Math.min(containerWidth * 0.7, 280));
        this.canvas.width = size;
        this.canvas.height = size;
      };
      detailRenderer.resize();
      detailRenderer.render = function (penguinData) {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2 + 8;
        const config = PenguinRenderer.getStageConfig(penguinData.stage, penguinData.attributes);
        ctx.clearRect(0, 0, w, h);
        this.frameSkip = (this.frameSkip || 0) + 1;
        if (this.frameSkip >= 2) { this.frameSkip = 0; this.frameCount++; }
        const breathScale = 1 + Math.sin(this.frameCount * 0.05) * 0.02;
        this.blinkTimer++;
        if (this.blinkTimer > 180 + Math.random() * 120) {
          this.blinkState = true;
          if (this.blinkTimer > 188) {
            this.blinkState = false;
            this.blinkTimer = 0;
          }
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(breathScale, breathScale);
        const baseSize = Math.min(w, h) * config.size * 0.48;
        PenguinRenderer.drawQQPenguin(ctx, baseSize, config, penguinData);
        ctx.restore();
        if (config.sparkle) {
          PenguinRenderer.updateParticles.call(this, w, h);
          PenguinRenderer.drawParticles.call(this, ctx);
        }
        this._animId = requestAnimationFrame(() => this.render(penguinData));
      };
      detailRenderer._animId = null;
      // 保存到实例上以便后续停止和重用
      this._detailRenderer = detailRenderer;
      detailRenderer.render(this.penguinData);
    }
  },

  restoreChat() {
    if (this.chatHistory.messages.length > 0) {
      UI.restoreChatMessages(this.chatHistory.messages);
    }
  },

  // ============================================
  //  领蛋 → 年级选择 → 命名 — 委托 AppEgg
  // ============================================
  handleClaim() { AppEgg.handleClaim(); },
  handleGradeSelect(grade) { AppEgg.handleGradeSelect(grade); },
  handleNamingSkip() { AppEgg.handleNamingSkip(); },
  handleNamingConfirm() { AppEgg.handleNamingConfirm(); },

  // ============================================
  //  我的鹅页面 - 名字编辑
  // ============================================
  handleNameEditClick() {
    const textEl = UI.elements.nameEditorText;
    if (!textEl) return;
    
    // 让文本可编辑
    textEl.contentEditable = 'true';
    textEl.classList.add('editing');
    textEl.focus();
    
    // 选中全部文字
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  },

  handleNameEditBlur() {
    const textEl = UI.elements.nameEditorText;
    if (!textEl) return;
    
    let newName = textEl.textContent.trim();
    textEl.contentEditable = 'false';
    textEl.classList.remove('editing');
    
    if (!newName || newName.length === 0) {
      // 恢复原名
      textEl.textContent = this.penguinData.name;
      return;
    }
    
    // 限制6字
    if (newName.length > 6) {
      newName = newName.slice(0, 6);
    }
    
    const oldName = this.penguinData.name;
    this.penguinData.name = newName;
    textEl.textContent = newName;
    
    // 同步更新首页显示
    UI.updatePenguinNameDisplay(newName, this.userConfig.grade);
    
    if (oldName !== newName) {
      // 企鹅名称已更新
    }
    
    this.saveData();
  },

  // ============================================
  //  更多菜单（···按钮）处理
  // ============================================
  handleMoreMenuToggle(e) {
    e.stopPropagation();
    UI.toggleMoreMenu();
  },

  handleMoreMenuItemClick(action) {
    UI.hideMoreMenu();
    if (action === 'switch-grade') {
      this.handleGradeSwitchClick();
    } else if (action === 'export-data') {
      this.handleExportData();
    } else if (action === 'import-data') {
      this.handleImportData();
    } else if (action === 'toggle-theme') {
      this.handleThemeToggle();
    } else if (action === 'reset-data') {
      if (confirm('⚠️ 确定要重置所有数据吗？\n\n将清除：企鹅状态、聊天记录、API 配置、学习进度等所有数据。\n\n重置后页面将自动刷新，回到最初领养企鹅的界面。')) {
        // ★ 关键：先设置标记 + 清空内存数据，防止 beforeunload 的 saveData() 把数据回写
        this._resetting = true;
        this.penguinData = {};
        this.chatHistory = { messages: [], contextWindow: [] };
        this.userConfig = {};
        this.appState = {};
        this.resumeData = {};
        localStorage.clear();
        sessionStorage.clear();
        // 使用 replace 强制全新加载，回到初始体验
        location.replace(location.origin + location.pathname);
      }
    }
  },

  // ============================================
  //  数据导出
  // ============================================
  handleExportData() {
    try {
      const jsonStr = Storage.exportData();
      const name = this.penguinData?.name || '企鹅';
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `企鹅养成_${name}_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      UI.showToast('✅ 数据已导出', 'success');
    } catch (e) {
      UI.showToast('❌ 导出失败', 'error');
    }
  },

  // ============================================
  //  数据导入
  // ============================================
  handleImportData() {
    UI.showImportConfirm((confirmed) => {
      if (!confirmed) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const success = Storage.importData(ev.target.result);
          if (success) {
            UI.showToast('✅ 数据已导入，即将刷新...', 'success');
            setTimeout(() => location.reload(), 1200);
          } else {
            UI.showToast('❌ 文件格式无效，请检查', 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },

  // ============================================
  //  主题切换
  // ============================================
  handleThemeToggle() {
    ThemeColors.toggle();
    // 重绘企鹅以适配暗色背景
    this.rerenderPenguin();
    UI.showToast(ThemeColors.isDark() ? '🌙 已切换为暗色模式' : '☀️ 已切换为亮色模式', 'success');
  },

  // ============================================
  //  年级切换处理（只能向前升级）
  // ============================================
  handleGradeSwitchClick() {
    UI.showGradeSwitchModal(this.userConfig.grade);

    // 绑定弹窗中的年级卡片点击
    const grid = UI.elements.gradeSwitchGrid;
    if (!grid) return;

    const cards = grid.querySelectorAll('.grade-card:not(.disabled)');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const newGrade = card.dataset.grade;
        this.handleGradeSwitch(newGrade);
      });
    });

    // 点击遮罩关闭
    UI.elements.gradeSwitchOverlay.onclick = () => {
      UI.hideGradeSwitchModal();
    };
  },

  handleGradeSwitch(newGrade) {
    // 允许自由切换年级（向前或回退）

    // 关闭可能泄漏的聊天覆盖层
    UI.closeChatOverlay();
    UI.hideGradeSwitchModal();

    const gradeNames = {
      freshman: '大一', sophomore: '大二', junior: '大三', senior: '大四'
    };

    // 播放进化全屏动画
    UI.showEvolutionFullscreen(newGrade, () => {
      // 更新年级
      this.userConfig.grade = newGrade;
      this.penguinData.grade = newGrade;

      // 更新阶段
      const gradeStages = { freshman: 1, sophomore: 2, junior: 3, senior: 4 };
      this.penguinData.stage = gradeStages[newGrade] || 1;

      // 更新初始属性（累加到现有基础上）
      const stageAttrs = {
        freshman: { knowledge: 5, creativity: 10, social: 10, action: 5, mentality: 15 },
        sophomore: { knowledge: 20, creativity: 25, social: 25, action: 20, mentality: 25 },
        junior: { knowledge: 40, creativity: 35, social: 40, action: 45, mentality: 40 },
        senior: { knowledge: 55, creativity: 50, social: 55, action: 60, mentality: 55 }
      };

      const attrs = stageAttrs[newGrade];
      Object.keys(attrs).forEach(k => {
        this.penguinData.attributes[k] = Math.max(
          this.penguinData.attributes[k],
          attrs[k]
        );
      });

      this.penguinData.exp = Object.values(this.penguinData.attributes).reduce((a, b) => a + b, 0);
      this.saveData();

      // 更新所有显示
      UI.updatePenguinNameDisplay(this.penguinData.name, newGrade);
      UI.updatePenguinView(this.penguinData);
      this.rerenderPenguin();

    });
  },

  showResumePage() {
    UI.showResumePage();
    this.appState.currentPage = 'resume';
    if (this.resumeData) {
      UI.fillResumeData(this.resumeData);
    }
  },

  handleResumeSkip() {
    this.userConfig.isFirstVisit = false;
    this.saveData();
    this.enterMainFromResume();
  },

  handleResumeEnter() {
    // 收集简历数据
    this.resumeData = UI.collectResumeData();
    if (!this.resumeData) {
      console.warn('[App] collectResumeData 返回空数据，使用空对象');
      this.resumeData = {};
    }

    // 持久化简历到独立存储
    Storage.saveResume(this.resumeData);

    // 简历驱动：更新企鹅traits
    try {
      this.updatePenguinTraitsFromResume();
    } catch (e) {
      console.error('[App] 简历驱动更新企鹅traits失败：', e);
    }

    this.userConfig.isFirstVisit = false;
    this.saveData();
    this.enterMainFromResume();
  },

  enterMainFromResume() {
    UI.hideResumePage();
    const grade = this.userConfig.grade;

    this.showMainPage();
    this.initPenguinRenderer();
    this.penguinData.totalChats = 0;
    
    // 更新名字显示
    UI.updatePenguinNameDisplay(this.penguinData.name, grade);

    const welcomeMessages = {
      freshman: '哇~你好呀！我是蛋蛋，一只还在蛋里的小企鹅！🥚 虽然我还不能到处跑，但我对大学生活超——级好奇！你最近有什么新鲜事想和我分享吗？你对什么方向比较感兴趣呀？编程💻？设计🎨？还是其他？',
      sophomore: '嘿！我是波波，终于破壳啦！🐣 现在我能摇摇晃晃地走路了，虽然还不太稳。大二了，你找到自己感兴趣的方向了吗？法律⚖️？产品📱？游戏🎮？我们一起探索吧！',
      junior: '你好呀！我是酷酷，看我戴上学士帽了！🐧 大三了，是时候认真准备实习了。你简历写好了吗？对哪些岗位感兴趣？算法🧮？运营📢？设计🎨？有什么想聊的，我都在！',
      senior: '嘿！我是飞飞，企鹅界的职场精英！🚀 墨镜一戴，谁都不爱~大四最后冲刺了，秋招、毕设、offer选择...你有什么纠结的，来找我聊聊！你对腾讯的哪个事业群感兴趣呀？'
    };

    UI.addChatMessage('assistant', welcomeMessages[grade]);
    this.chatHistory.messages.push({
      id: 'msg_welcome',
      role: 'assistant',
      content: welcomeMessages[grade],
      timestamp: Date.now(),
      keywords: [],
      attributeChanges: null,
      triggeredActivities: []
    });
    this.chatHistory.contextWindow.push({
      role: 'assistant',
      content: welcomeMessages[grade]
    });

    this.updateHomeSuggestedQuestions();
    this.saveData();
  },

  // ============================================
  //  子页面渲染（diary/resume 等见下方各自 render 方法）
  // ============================================

  /** 渲染简历子页面 - 所见即所得可编辑表单 */
  renderResumeSubPage() {
    const container = document.getElementById('sub-resume-page');
    if (!container) return;
    const contentArea = container.querySelector('.sub-page-content');
    if (!contentArea) return;

    // 确保 resumeData 初始化
    if (!this.resumeData) {
      this.resumeData = {
        name: '', school: '', contact: '', gpa: '', courses: '',
        projectName: '', projectDesc: '', languages: '', frameworks: '', awards: ''
      };
    }

    const resumeEntries = DiaryModule.getResumeEntries();
    const hasResumeData = this.resumeData && Object.values(this.resumeData).some(v => v && v.trim());

    // 字段定义
    const sections = [
      {
        title: '📌 基本信息',
        fields: [
          { id: 'sub-resume-name', key: 'name', label: '姓名', placeholder: '你的名字', type: 'text' },
          { id: 'sub-resume-school', key: 'school', label: '学校 / 专业', placeholder: 'XX大学 · XX专业', type: 'text' },
          { id: 'sub-resume-contact', key: 'contact', label: '联系方式', placeholder: '手机号 / 邮箱', type: 'text' }
        ]
      },
      {
        title: '🎓 教育经历',
        fields: [
          { id: 'sub-resume-gpa', key: 'gpa', label: 'GPA / 排名', placeholder: 'GPA: 待填写', type: 'text' },
          { id: 'sub-resume-courses', key: 'courses', label: '相关课程', placeholder: '如：数据结构、操作系统、计算机网络...', type: 'multiline' }
        ]
      },
      {
        title: '💻 项目经验',
        fields: [
          { id: 'sub-resume-projectName', key: 'projectName', label: '项目名称', placeholder: '项目名称', type: 'text' },
          { id: 'sub-resume-projectDesc', key: 'projectDesc', label: '项目描述', placeholder: '描述你在项目中的角色、技术栈和成果...', type: 'multiline' }
        ]
      },
      {
        title: '🛠️ 专业技能',
        fields: [
          { id: 'sub-resume-languages', key: 'languages', label: '编程语言', placeholder: '如：Python、JavaScript、C++...', type: 'text' },
          { id: 'sub-resume-frameworks', key: 'frameworks', label: '框架 / 工具', placeholder: '如：React、Vue、Git、Docker...', type: 'text' }
        ]
      },
      {
        title: '🏆 获奖与证书',
        fields: [
          { id: 'sub-resume-awards', key: 'awards', label: '荣誉奖项', placeholder: '如：校级奖学金、竞赛获奖...', type: 'multiline' }
        ]
      }
    ];

    let html = `
      <div class="module-actions">
        <button class="btn-module-action primary" onclick="App.exportResume()">📤 导出简历</button>
        <button class="btn-module-action" onclick="App.aiPolishResume()">✨ AI润色</button>
      </div>
    `;

    // 渲染可编辑表单
    html += '<div class="resume-edit-form" id="resume-edit-form">';
    sections.forEach(section => {
      html += `<div class="resume-section"><h3 class="section-title">${section.title}</h3>`;
      section.fields.forEach(f => {
        const value = this.resumeData[f.key] || '';
        const isEmpty = !value.trim();
        const filledClass = !isEmpty ? ' filled' : '';
        const placeholder = f.placeholder || '';
        if (f.type === 'multiline') {
          html += `<div class="resume-field">
            <div class="field-label">${f.label}</div>
            <textarea class="field-value multiline resume-editable${filledClass}" 
              id="${f.id}" data-field="${f.key}" 
              placeholder="${placeholder}" rows="2"></textarea>
          </div>`;
        } else {
          html += `<div class="resume-field">
            <div class="field-label">${f.label}</div>
            <input type="text" class="field-value resume-editable${filledClass}" 
              id="${f.id}" data-field="${f.key}" 
              placeholder="${placeholder}">
          </div>`;
        }
      });
      html += '</div>';
    });
    html += '</div>';

    // 来自聊天的简历素材
    if (resumeEntries.length > 0) {
      html += '<div class="resume-materials"><h3>💡 来自聊天的简历素材</h3>';
      resumeEntries.forEach(e => {
        html += `<div class="material-item">📌 ${e.content.slice(0, 150)}...</div>`;
      });
      html += '</div>';
    }

    // 岗位推荐区域
    if (hasResumeData) {
      html += `<div class="job-recommend-section" id="job-recommend-section">
        <h4 class="job-recommend-title">💼 根据你的简历，推荐你关注这些岗位</h4>
        <div class="job-recommend-list" id="job-recommend-list"></div>
      </div>`;
    }

    contentArea.innerHTML = html;

    // 填充表单值
    sections.forEach(section => {
      section.fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) {
          const value = this.resumeData[f.key] || '';
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            el.value = value;
          }
        }
      });
    });

    // 绑定输入事件 - 标记 dirty
    this.bindSubResumeInputEvents();

    // 渲染岗位推荐
    if (hasResumeData) {
      this.renderJobRecommendations();
    }
  },

  /** 绑定子简历表单的输入事件 */
  bindSubResumeInputEvents() {
    const form = document.getElementById('resume-edit-form');
    if (!form) return;

    const fields = form.querySelectorAll('.resume-editable');
    fields.forEach(el => {
      el.addEventListener('input', () => {
        this.resumeDirty = true;
        // 更新 filled 样式
        if (el.value.trim()) {
          el.classList.add('filled');
        } else {
          el.classList.remove('filled');
        }
      });
    });
  },

  /** 从子简历表单收集数据 */
  collectSubResumeData() {
    const form = document.getElementById('resume-edit-form');
    if (!form) return this.resumeData || {};

    const data = { ...this.resumeData };
    const fields = form.querySelectorAll('.resume-editable');
    fields.forEach(el => {
      const key = el.dataset.field;
      if (key) {
        data[key] = el.value.trim();
      }
    });
    return data;
  },

  /** 导出简历 */
  exportResume() {
    // 先从表单同步最新数据
    const data = this.collectSubResumeData();
    if (!data || !Object.values(data).some(v => v && v.trim())) {
      return;
    }
    let text = '# 📋 我的简历\n\n';
    text += `## 基本信息\n- 姓名：${data.name || '未填写'}\n- 学校：${data.school || '未填写'}\n- 联系方式：${data.contact || '未填写'}\n\n`;
    text += `## 教育经历\n- GPA：${data.gpa || '未填写'}\n- 课程：${data.courses || '未填写'}\n\n`;
    text += `## 项目经验\n- ${data.projectName || '未填写'}\n- ${data.projectDesc || '未填写'}\n\n`;
    text += `## 专业技能\n- 语言：${data.languages || '未填写'}\n- 框架：${data.frameworks || '未填写'}\n\n`;
    text += `## 获奖\n${data.awards || '未填写'}\n`;
    this.downloadFile('我的简历.md', text);
  },

  /** AI润色简历 */
  async aiPolishResume() {
    // 先从表单同步最新数据
    const data = this.collectSubResumeData();
    if (!data || !Object.values(data).some(v => v && v.trim())) {
      return;
    }

    try {
      const resumeText = Object.entries(data)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      
      const polishPrompt = `你是一位资深的校招简历优化专家。请帮我润色以下简历内容，使其更专业、更有竞争力，适合投递腾讯等互联网公司。保持原有信息不变，只优化表达方式。

原始简历：
${resumeText}

请用JSON格式返回优化后的简历，格式为：{"name":"","school":"","contact":"","gpa":"","courses":"","projectName":"","projectDesc":"","languages":"","frameworks":"","awards":""}`;

      const reply = await ChatEngine.sendMessage(
        polishPrompt,
        [],
        '你是简历优化专家，只输出JSON格式的结果。'
      );

      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const polished = JSON.parse(jsonMatch[0]);
          Object.assign(this.resumeData, polished);
          Storage.saveResume(this.resumeData);
          this.saveData();
          this.resumeDirty = true;
          // 直接更新表单字段值，保留用户正在编辑的内容
          Object.keys(polished).forEach(key => {
            const el = document.getElementById('sub-resume-' + key);
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
              el.value = polished[key] || '';
              if (polished[key] && polished[key].trim()) {
                el.classList.add('filled');
              }
            }
          });
        }
      } catch (parseErr) {
        console.error('AI返回格式异常', parseErr);
      }
    } catch (error) {
      console.error('润色失败：', error.message);
    }
  },

  /** 渲染知识库子页面 */
  renderKnowledgePage() {
    const container = document.getElementById('sub-knowledge-page');
    if (!container) return;
    const contentArea = container.querySelector('.sub-page-content');
    if (!contentArea) return;

    const items = KnowledgeModule.getAll();
    const stats = KnowledgeModule.getStats();
    const catStats = KnowledgeModule.getCategoryStats();

    let html = `
      <div class="module-stats">
        <span>📚 ${stats.total}条知识</span>
        <span>📌 ${stats.pinned}条置顶</span>
        <span>🏷️ ${stats.uniqueTags}个标签</span>
      </div>
      <div class="module-actions">
        <button class="btn-module-action" onclick="App.exportKnowledge()">📤 导出知识库</button>
        <input type="text" class="kb-search" id="kb-search-input" placeholder="🔍 搜索知识库..." oninput="App.searchKnowledge(this.value)">
      </div>
      <div class="category-tabs">
        ${KnowledgeModule.categories.filter(c => catStats[c] > 0).map(c => 
          `<span class="cat-chip" onclick="App.filterKnowledgeByCat('${c}')">${c} (${catStats[c]})</span>`
        ).join('')}
        <span class="cat-chip active" onclick="App.filterKnowledgeByCat('all')">全部 (${stats.total})</span>
      </div>
    `;

    if (items.length === 0) {
      html += `
        <div class="placeholder-view">
          <div class="placeholder-icon">📚</div>
          <p class="placeholder-text">知识库还是空的</p>
          <p class="placeholder-hint">与企鹅聊天时，重要知识点会自动收录。你也可以手动添加知识点。</p>
        </div>
      `;
    } else {
      html += '<div class="kb-list" id="kb-list">';
      items.slice(0, 50).forEach(item => {
        const tags = item.tags.slice(0, 5).map(t => `<span class="tag-chip">${t}</span>`).join('');
        const pinIcon = item.pinned ? '📌 ' : '';
        html += `
          <div class="kb-card" data-cat="${item.category}">
            <div class="kb-card-header">
              <span class="kb-title">${pinIcon}${item.title}</span>
              <span class="kb-cat">${item.category}</span>
            </div>
            <div class="kb-content">${item.content.slice(0, 200)}</div>
            <div class="kb-meta">
              ${tags}
              <span class="kb-date">${item.dateStr}</span>
              <button class="btn-tiny" onclick="KnowledgeModule.togglePin('${item.id}');App.renderKnowledgePage();">📌</button>
              <button class="btn-tiny danger" onclick="KnowledgeModule.deleteItem('${item.id}');App.renderKnowledgePage();">🗑️</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    contentArea.innerHTML = html;
  },

  /** 搜索知识库 */
  searchKnowledge(query) {
    const results = query.trim() ? KnowledgeModule.search(query) : KnowledgeModule.getAll();
    const list = document.getElementById('kb-list');
    if (!list) return;
    
    if (results.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">未找到匹配的知识点</p>';
      return;
    }
    
    list.innerHTML = results.slice(0, 30).map(item => {
      const tags = item.tags.slice(0, 5).map(t => `<span class="tag-chip">${t}</span>`).join('');
      return `
        <div class="kb-card" data-cat="${item.category}">
          <div class="kb-card-header">
            <span class="kb-title">${item.pinned ? '📌 ' : ''}${item.title}</span>
            <span class="kb-cat">${item.category}</span>
          </div>
          <div class="kb-content">${item.content.slice(0, 200)}</div>
          <div class="kb-meta">${tags} <span class="kb-date">${item.dateStr}</span></div>
        </div>
      `;
    }).join('');
  },

  /** 按分类筛选 */
  filterKnowledgeByCat(cat) {
    const results = cat === 'all' ? KnowledgeModule.getAll() : KnowledgeModule.getByCategory(cat);
    const list = document.getElementById('kb-list');
    if (!list) return;
    
    // 更新分类标签状态
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    const activeChip = document.querySelector(`.cat-chip[onclick*="${cat}"]`);
    if (activeChip) activeChip.classList.add('active');
    
    list.innerHTML = results.slice(0, 30).map(item => {
      const tags = item.tags.slice(0, 5).map(t => `<span class="tag-chip">${t}</span>`).join('');
      return `
        <div class="kb-card" data-cat="${item.category}">
          <div class="kb-card-header">
            <span class="kb-title">${item.pinned ? '📌 ' : ''}${item.title}</span>
            <span class="kb-cat">${item.category}</span>
          </div>
          <div class="kb-content">${item.content.slice(0, 200)}</div>
          <div class="kb-meta">${tags} <span class="kb-date">${item.dateStr}</span></div>
        </div>
      `;
    }).join('');
  },

  /** 导出知识库 */
  exportKnowledge() {
    const text = KnowledgeModule.export('markdown');
    this.downloadFile('知识库.md', text);
  },


  // ============================================
  //  成长档案页面渲染（志愿 + 课程成绩）
  // ============================================
  profileSubTab: 'volunteer', // 默认选中志愿记录

  /** 初始化子选项卡切换 */
  initProfileSubTabs() {
    const tabs = document.querySelectorAll('#profile-sub-tabs .sub-tab-item');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const subtab = tab.dataset.subtab;
        this.switchProfileSubTab(subtab);
      });
    });
  },

  /** 切换成长档案子选项卡 */
  switchProfileSubTab(subtab) {
    this.profileSubTab = subtab;

    // 更新选项卡激活状态
    document.querySelectorAll('#profile-sub-tabs .sub-tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.subtab === subtab);
    });

    // 切换面板（清除 inline display 让 CSS class 接管）
    document.querySelectorAll('.profile-panel').forEach(p => {
      p.style.display = '';
      p.classList.toggle('active', p.id === 'panel-' + subtab);
    });

    // 渲染对应内容
    if (subtab === 'volunteer') {
      this.renderVolunteerContent();
    } else if (subtab === 'courses') {
      this.renderCoursesContent();
    }
  },

  /** 渲染志愿子页面 */
  renderVolunteerPage() {
    // 确保志愿面板可见
    const volunteerPanel = document.getElementById('panel-volunteer');
    const coursesPanel = document.getElementById('panel-courses');
    if (volunteerPanel) volunteerPanel.style.display = '';
    if (coursesPanel) coursesPanel.style.display = 'none';

    // 渲染志愿内容
    this.renderVolunteerContent();
  },

  /** 渲染志愿记录内容（含内嵌新增表单） */
  renderVolunteerContent() {
    const container = document.getElementById('volunteer-dynamic');
    if (!container) return;

    const stats = VolunteerModule.getStats();
    const progress = VolunteerModule.getProgress();
    const records = VolunteerModule.getAll();

    let html = `
      <div class="volunteer-stats-card">
        <div class="stats-header">
          <span class="stats-title">⏱️ 累计志愿时长</span>
          <span class="stats-badge target-editable" id="volunteer-target-badge" title="点击修改目标">目标 ${stats.targetHours}h ✎</span>
        </div>
        <div class="stats-main">
          <span class="stats-number">${stats.totalHours.toFixed(1)}</span>
          <span class="stats-unit">小时</span>
        </div>
        <div class="stats-progress">
          <div class="stats-progress-fill" style="width:${progress.percentage}%"></div>
        </div>
        <div class="stats-sub">
          <span>完成 ${progress.percentage}%</span>
          <span>${progress.remaining > 0 ? '还差 ' + progress.remaining + 'h' : '已达标！🎉'}</span>
        </div>
      </div>

      <div class="module-stats">
        <span>📋 ${stats.total}条记录</span>
        <span>✅ ${stats.verified}条已验证</span>
        <span>📅 本月 ${stats.monthHours.toFixed(1)}h</span>
      </div>
      <div class="module-actions">
        <button class="btn-module-action" onclick="App.exportVolunteer()">📤 导出记录</button>
      </div>
    `;

    // 内嵌新增表单
    html += `
      <div class="volunteer-inline-form" id="volunteer-inline-form">
        <div class="volunteer-inline-form-title">📝 添加志愿记录</div>
        <input type="text" id="volunteer-inline-title" placeholder="活动名称，如：社区清扫活动" maxlength="50">
        <div class="volunteer-inline-row">
          <input type="number" id="volunteer-inline-hours" placeholder="时长（小时）" min="0.5" max="100" step="0.5" style="flex:1;">
          <select id="volunteer-inline-organization" style="flex:1.5;">
            <option value="">组织/类型（可选）</option>
            <option value="社区服务">社区服务</option>
            <option value="支教">支教</option>
            <option value="环保">环保</option>
            <option value="助老">助老</option>
            <option value="助残">助残</option>
            <option value="大型活动">大型活动</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <input type="text" id="volunteer-inline-desc" placeholder="简单描述活动内容（选填）" maxlength="200">
        <button class="volunteer-inline-add-btn" id="btn-volunteer-inline-add">+ 添加记录</button>
      </div>
    `;

    if (records.length === 0) {
      html += `
        <div class="placeholder-view">
          <div class="placeholder-icon">⏱️</div>
          <p class="placeholder-text">还没有志愿记录</p>
          <p class="placeholder-hint">在上方表单中添加你的志愿活动时长</p>
        </div>
      `;
    } else {
      html += '<div class="volunteer-list">';
      records.forEach(r => {
        const icons = { '社区服务': '🏘️', '支教': '📚', '环保': '🌱', '助老': '👴', '助残': '♿', '大型活动': '🎪', '其他': '❤️' };
        const icon = icons[r.organization] || '⏱️';
        html += `
          <div class="volunteer-card">
            <div class="vol-icon">${icon}</div>
            <div class="vol-info">
              <div class="vol-title">${r.title}</div>
              <div class="vol-meta">${r.dateStr}${r.organization ? ' · ' + r.organization : ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div class="vol-hours">${r.hours}h</div>
              <div class="vol-status ${r.verified ? 'verified' : ''}" title="${r.verified ? '已确认验证' : '自行记录，尚未经组织确认'}">${r.verified ? '✅ 已验证' : '⏳ 待验证'}</div>
            </div>
            <button class="vol-delete" data-vol-id="${r.id}" title="删除此记录" aria-label="删除志愿记录">×</button>
          </div>
        `;
      });
      html += '</div>';
      html += '<div class="volunteer-status-hint">💡 <b>待验证</b>：自己添加的记录默认标记为"待验证"。完成志愿服务后，可以请组织方确认。</div>';
    }

    container.innerHTML = html;

    // 绑定目标编辑点击事件
    const targetBadge = container.querySelector('#volunteer-target-badge');
    if (targetBadge) {
      targetBadge.addEventListener('click', () => this.handleEditVolunteerTarget());
    }

    // 绑定内联添加按钮
    const btnAdd = container.querySelector('#btn-volunteer-inline-add');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.handleVolunteerInlineAdd());
    }

    // 支持回车快捷添加
    const inputs = container.querySelectorAll('#volunteer-inline-form input');
    inputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleVolunteerInlineAdd();
        }
      });
    });

    // 绑定删除按钮
    const deleteBtns = container.querySelectorAll('.vol-delete');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-vol-id');
        if (id) this.handleDeleteVolunteer(id);
      });
    });
  },

  // ============================================
  //  课程成绩（内嵌表单，无弹窗，数据存储在 appState）
  // ============================================
  getCourseData() {
    if (!this.appState.courses) this.appState.courses = [];
    return this.appState.courses;
  },

  saveCourseData() {
    this.appState.courses = this.getCourseData();
    this.saveData();
  },

  /** GPA 映射表 */
  GPA_MAP: { '4.0': 4.0, '3.7': 3.7, '3.3': 3.3, '3.0': 3.0, '2.7': 2.7, '2.3': 2.3, '2.0': 2.0, '1.7': 1.7, '1.0': 1.0, '0': 0 },

  /** 百分制分数 → GPA 映射 */
  SCORE_TO_GPA(score) {
    const s = parseFloat(score);
    if (isNaN(s)) return null;
    if (s >= 95) return '4.0';
    if (s >= 90) return '3.7';
    if (s >= 85) return '3.3';
    if (s >= 82) return '3.0';
    if (s >= 78) return '2.7';
    if (s >= 75) return '2.3';
    if (s >= 72) return '2.0';
    if (s >= 68) return '1.7';
    if (s >= 60) return '1.0';
    return '0';
  },

  /** 获取存储用的 GPA 值（支持百分制分数、直接GPA值、P） */
  resolveCourseGrade(rawGrade) {
    if (!rawGrade && rawGrade !== 0 && rawGrade !== '0') return '';
    const str = String(rawGrade).trim();
    if (str === 'P' || str === 'p') return 'P';
    // 如果输入看起来像GPA值（<=4.0），直接使用
    const num = parseFloat(str);
    if (isNaN(num)) return '';
    if (num <= 4.0 && num >= 0) {
      // 是GPA值，直接用
      return str;
    }
    // 否则当作百分制分数映射到GPA
    return this.SCORE_TO_GPA(num);
  },

  /** 渲染课程成绩（含内嵌新增/编辑表单） */
  renderCoursesContent() {
    const container = document.getElementById('courses-dynamic');
    if (!container) return;

    const courses = this.getCourseData();
    const graded = courses.filter(c => c.grade && c.grade !== 'P' && this.GPA_MAP[c.grade] !== undefined);
    const totalCredits = courses.reduce((s, c) => s + (parseFloat(c.credit) || 0), 0);
    let gpa = 0;
    if (graded.length > 0) {
      const totalPoints = graded.reduce((s, c) => s + this.GPA_MAP[c.grade] * (parseFloat(c.credit) || 0), 0);
      const gpaCredits = graded.reduce((s, c) => s + (parseFloat(c.credit) || 0), 0);
      gpa = gpaCredits > 0 ? totalPoints / gpaCredits : 0;
    }

    // 按学年+学期分组
    const groups = {};
    courses.forEach(c => {
      const key = `${c.year}|${c.semester}`;
      if (!groups[key]) {
        groups[key] = {
          year: c.year,
          semester: c.semester,
          label: `${c.year} 第${c.semester === '上' ? '一' : '二'}学期`,
          courses: []
        };
      }
      groups[key].courses.push(c);
    });
    const sorted = Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year.localeCompare(a.year);
      return a.semester === '下' ? -1 : 1;
    });
    sorted.forEach(g => {
      g.totalCredits = g.courses.reduce((s, c) => s + (parseFloat(c.credit) || 0), 0);
      const gGraded = g.courses.filter(c => c.grade && c.grade !== 'P' && this.GPA_MAP[c.grade] !== undefined);
      if (gGraded.length > 0) {
        const pts = gGraded.reduce((s, c) => s + this.GPA_MAP[c.grade] * (parseFloat(c.credit) || 0), 0);
        const cr = gGraded.reduce((s, c) => s + (parseFloat(c.credit) || 0), 0);
        g.semesterGPA = cr > 0 ? pts / cr : 0;
      } else {
        g.semesterGPA = 0;
      }
    });

    let html = '';

    // GPA 统计卡片
    html += `
      <div class="courses-stats-row">
        <div class="courses-stat-card gpa">
          <div class="courses-stat-label">累计 GPA</div>
          <div class="courses-stat-value">${gpa.toFixed(2)}</div>
          <div class="courses-stat-sub">${graded.length} 门课程计分</div>
        </div>
        <div class="courses-stat-card credits">
          <div class="courses-stat-label">总学分</div>
          <div class="courses-stat-value">${totalCredits}</div>
          <div class="courses-stat-sub">${courses.length} 门课程</div>
        </div>
      </div>
    `;

    // 内嵌新增表单
    html += `
      <div class="course-inline-form" id="course-inline-form">
        <div class="course-inline-form-title">📝 添加课程</div>
        <div class="course-inline-row">
          <select id="course-inline-year">
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>
          <select id="course-inline-semester">
            <option value="上">上学期</option>
            <option value="下">下学期</option>
          </select>
        </div>
        <input type="text" id="course-inline-name" placeholder="课程名称，如：高等数学" maxlength="50">
        <div class="course-inline-row">
          <input type="number" id="course-inline-credit" placeholder="学分" min="0.5" max="20" step="0.5" style="flex:1;">
          <input type="text" id="course-inline-grade" placeholder="成绩，如 85 或 3.7" style="flex:1.5;">
          <select id="course-inline-type" style="flex:1;">
            <option value="必修">必修</option>
            <option value="选修">选修</option>
          </select>
        </div>
        <button class="course-inline-add-btn" id="btn-course-inline-add">+ 添加课程</button>
      </div>
    `;

    // 课程列表
    if (sorted.length === 0) {
      html += `
        <div class="courses-empty">
          <div class="courses-empty-icon">📖</div>
          <div class="courses-empty-text">还没有课程记录</div>
          <div class="courses-empty-hint">在上方表单中添加你的课程成绩</div>
        </div>
      `;
    } else {
      sorted.forEach((group, gi) => {
        html += `
          <div class="course-semester-group${gi === 0 ? ' open' : ''}" data-group-key="${group.year}|${group.semester}">
            <div class="course-semester-header" onclick="App.toggleCourseGroup(this)">
              <span class="course-semester-title">
                📅 ${group.label}
                <span class="course-semester-meta">${group.totalCredits}学分 · GPA ${group.semesterGPA.toFixed(2)}</span>
              </span>
              <span class="course-semester-arrow">▼</span>
            </div>
            <div class="course-semester-body">
              <table class="course-table">
                <thead><tr><th>课程名</th><th>学分</th><th>成绩</th><th>类型</th><th></th></tr></thead>
                <tbody>
        `;
        group.courses.forEach(c => {
          // 优先显示用户原始输入的分数，其次显示GPA值
          const gradeDisplay = c.grade === 'P' ? 'P' : (c.rawScore || c.grade || '-');
          const gradeClass = (c.grade && c.grade !== 'P') ? this.getCourseGradeClass(c.grade) : '';
          html += `
                  <tr>
                    <td class="col-name" title="${this._escHtml(c.name)}">${this._escHtml(c.name)}</td>
                    <td class="col-credit">${c.credit}</td>
                    <td class="col-grade ${gradeClass}">${gradeDisplay}</td>
                    <td><span class="course-type-badge ${c.type === '必修' ? 'required' : 'elective'}">${c.type}</span></td>
                    <td>
                      <div class="course-row-actions">
                        <button class="btn-course-delete-inline" data-course-id="${c.id}" title="删除">✕</button>
                      </div>
                    </td>
                  </tr>
          `;
        });
        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    // 绑定内嵌表单提交事件
    const addBtn = document.getElementById('btn-course-inline-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.handleCourseInlineAdd());
    }

    // 绑定删除按钮事件
    container.querySelectorAll('.btn-course-delete-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const courseId = btn.dataset.courseId;
        this.handleCourseInlineDelete(courseId);
      });
    });
  },

  /** 获取成绩等级 CSS class */
  getCourseGradeClass(gpaValue) {
    const val = parseFloat(gpaValue);
    if (isNaN(val)) return '';
    if (val >= 3.7) return 'grade-excellent';
    if (val >= 3.0) return 'grade-good';
    if (val >= 2.0) return 'grade-average';
    return 'grade-poor';
  },

  /** 内嵌表单添加课程 */
  handleCourseInlineAdd() {
    const year = document.getElementById('course-inline-year').value;
    const semester = document.getElementById('course-inline-semester').value;
    const name = document.getElementById('course-inline-name').value.trim();
    const credit = document.getElementById('course-inline-credit').value;
    const rawGrade = document.getElementById('course-inline-grade').value.trim();
    const type = document.getElementById('course-inline-type').value;

    if (!name) return;
    if (!credit || parseFloat(credit) <= 0) return;

    // 解析成绩：支持百分制分数（如85）、GPA值（如3.7）、P（通过）
    const resolvedGrade = rawGrade ? this.resolveCourseGrade(rawGrade) : '';

    const record = {
      id: 'course_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      year, semester, name,
      credit: parseFloat(credit) || 0,
      grade: resolvedGrade,
      rawScore: rawGrade, // 保存用户原始输入，用于显示
      type
    };

    const courses = this.getCourseData();
    courses.push(record);
    this.saveCourseData();

    // 清空表单关键字段
    document.getElementById('course-inline-name').value = '';
    document.getElementById('course-inline-credit').value = '';
    document.getElementById('course-inline-grade').value = '';

    this.renderCoursesContent();
  },

  /** 内嵌删除课程 */
  handleCourseInlineDelete(courseId) {
    const courses = this.getCourseData();
    this.appState.courses = courses.filter(c => c.id !== courseId);
    this.saveCourseData();
    this.renderCoursesContent();
  },

  /** 切换学期折叠 */
  toggleCourseGroup(header) {
    const group = header.closest('.course-semester-group');
    if (group) {
      group.classList.toggle('open');
    }
  },

  /** HTML 转义 */
  _escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /** 编辑志愿时长目标 */
  handleEditVolunteerTarget() {
    const currentTarget = VolunteerModule.targetHours;
    UI.showTargetEditModal('⏱️ 修改志愿目标', currentTarget, 
      (newValue) => {
        const result = VolunteerModule.validateAndSetTarget(newValue);
        if (!result.valid) {
          return false;
        }
        this.renderVolunteerContent();
        return true;
      },
      () => {
        VolunteerModule.resetTargetToDefault();
        this.renderVolunteerContent();
      }
    );
  },

  /** 导出志愿记录 */
  exportVolunteer() {
    const text = VolunteerModule.export();
    this.downloadFile('志愿时长记录.md', text);
  },

  // ============================================
  //  日记页 v3 - 三栏沉浸式布局（日历 + 列表 + 编辑器）
  // ============================================
  diaryYear: new Date().getFullYear(),
  diaryMonth: new Date().getMonth() + 1,
  diarySelectedDate: null,
  diaryFilterMood: 'all',
  diaryFilterDate: '',

  /** 渲染日记子页面（三栏） */
  renderDiaryPage() {
    const layout = document.getElementById('diary-layout');
    if (!layout) return;

    this.renderCalendar();
    this.renderDiaryEditor();
    this.renderDiaryList();
    this.updateDiaryStats();

    // 绑定月历导航
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    if (prevBtn) prevBtn.onclick = () => {
      this.diaryMonth--;
      if (this.diaryMonth < 1) { this.diaryMonth = 12; this.diaryYear--; }
      this.renderCalendar(); this.renderDiaryEditor(); this.renderDiaryList();
    };
    if (nextBtn) nextBtn.onclick = () => {
      this.diaryMonth++;
      if (this.diaryMonth > 12) { this.diaryMonth = 1; this.diaryYear++; }
      this.renderCalendar(); this.renderDiaryEditor(); this.renderDiaryList();
    };

    // 绑定保存按钮
    const saveBtn = document.getElementById('btn-diary-save');
    if (saveBtn) saveBtn.onclick = () => this.handleDiarySave();

    // 绑定 Enter 键保存（Ctrl+Enter 换行）
    const textarea = document.getElementById('diary-editor-textarea');
    if (textarea) {
      textarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          this.handleDiarySave();
        }
      };
    }

    // 绑定标记按钮
    const toggleBtn = document.getElementById('btn-toggle-resume');
    if (toggleBtn) toggleBtn.onclick = () => this.handleToggleResumeMark();

    // 绑定心情标签选择
    this.bindDiaryTagChips();

    // 绑定筛选控件
    const filterDate = document.getElementById('diary-filter-date');
    const filterTag = document.getElementById('diary-filter-tag');
    if (filterDate) filterDate.onchange = () => {
      this.diaryFilterDate = filterDate.value;
      this.diaryFilterMood = 'all';
      if (filterTag) filterTag.value = 'all';
      this.renderDiaryList();
    };
    if (filterTag) filterTag.onchange = () => {
      this.diaryFilterMood = filterTag.value;
      this.diaryFilterDate = '';
      if (filterDate) filterDate.value = '';
      this.renderDiaryList();
    };
  },

  /** 渲染月历 */
  renderCalendar() {
    const label = document.getElementById('cal-month-label');
    const grid = document.getElementById('calendar-grid');
    if (!label || !grid) return;

    label.textContent = `${this.diaryYear}年${this.diaryMonth}月`;

    const diaryDates = DiaryModule.getMonthDates(this.diaryYear, this.diaryMonth);
    const diarySet = new Set(diaryDates);

    const today = new Date();
    const todayKey = DiaryModule.toDateKey(today);

    const firstDay = new Date(this.diaryYear, this.diaryMonth - 1, 1);
    const lastDay = new Date(this.diaryYear, this.diaryMonth, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    let html = '';
    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${this.diaryYear}-${String(this.diaryMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasDiary = diarySet.has(dateKey);
      const isToday = dateKey === todayKey;
      const isSelected = dateKey === this.diarySelectedDate;

      let cls = 'cal-cell';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';
      if (hasDiary) cls += ' has-diary';

      html += `<div class="${cls}" data-date="${dateKey}" onclick="App.selectDiaryDate('${dateKey}')">
        <span class="cal-day-num">${d}</span>
        ${hasDiary ? '<span class="cal-dot"></span>' : ''}
      </div>`;
    }

    grid.innerHTML = html;
  },

  /** 选择日期 - 同时刷新列表和编辑器 */
  selectDiaryDate(dateKey) {
    this.diarySelectedDate = dateKey;
    this.renderCalendar();
    this.renderDiaryEditor();
    this.renderDiaryList();
  },

  /** 渲染日记编辑区 */
  renderDiaryEditor() {
    const dateEl = document.getElementById('diary-editor-date');
    const textarea = document.getElementById('diary-editor-textarea');
    const saveBtn = document.getElementById('btn-diary-save');
    const toggleBtn = document.getElementById('btn-toggle-resume');

    if (!dateEl || !textarea) return;

    if (!this.diarySelectedDate) {
      dateEl.textContent = '点击日历中的日期开始记录';
      textarea.value = '';
      textarea.placeholder = '选择日期后在此书写日记...';
      textarea.disabled = true;
      if (saveBtn) saveBtn.disabled = true;
      if (toggleBtn) { toggleBtn.disabled = true; toggleBtn.textContent = '🏷️ 标记为简历素材'; toggleBtn.classList.remove('marked'); }
      this.resetDiaryTagChips();
      return;
    }

    dateEl.textContent = DiaryModule.formatDateKey(this.diarySelectedDate);
    textarea.disabled = false;
    if (saveBtn) saveBtn.disabled = false;

    const entry = DiaryModule.getEntry(this.diarySelectedDate);
    if (entry && entry.content.trim()) {
      textarea.value = entry.content;
      textarea.placeholder = '继续书写...';
      if (toggleBtn) {
        toggleBtn.disabled = false;
        if (entry.markedAsResume) { toggleBtn.textContent = '🏷️ 已标记为简历素材'; toggleBtn.classList.add('marked'); }
        else { toggleBtn.textContent = '🏷️ 标记为简历素材'; toggleBtn.classList.remove('marked'); }
      }
    } else {
      textarea.value = '';
      textarea.placeholder = '这一天还没有记录……写点什么吧';
      if (toggleBtn) { toggleBtn.disabled = true; toggleBtn.textContent = '🏷️ 标记为简历素材'; toggleBtn.classList.remove('marked'); }
    }

    // 恢复心情和天气标签
    this.restoreDiaryTagChips(entry);
  },

  /** 绑定心情和天气标签点击 */
  bindDiaryTagChips() {
    const moodChips = document.querySelectorAll('#diary-tag-options .diary-tag-chip');
    const weatherChips = document.querySelectorAll('#diary-weather-options .diary-tag-chip');

    moodChips.forEach(chip => {
      chip.onclick = () => {
        if (!this.diarySelectedDate) return;
        const mood = chip.dataset.tag;
        // 点击已选中则取消
        const current = DiaryModule.getEntry(this.diarySelectedDate);
        const newMood = (current && current.mood === mood) ? '' : mood;
        DiaryModule.setMood(this.diarySelectedDate, newMood);
        this.restoreDiaryTagChips(DiaryModule.getEntry(this.diarySelectedDate));
        this.renderDiaryList();
      };
    });

    weatherChips.forEach(chip => {
      chip.onclick = () => {
        if (!this.diarySelectedDate) return;
        const weather = chip.dataset.weather;
        const current = DiaryModule.getEntry(this.diarySelectedDate);
        const newWeather = (current && current.weather === weather) ? '' : weather;
        DiaryModule.setWeather(this.diarySelectedDate, newWeather);
        this.restoreDiaryTagChips(DiaryModule.getEntry(this.diarySelectedDate));
        this.renderDiaryList();
      };
    });
  },

  /** 恢复心情/天气标签选中状态 */
  restoreDiaryTagChips(entry) {
    const moodChips = document.querySelectorAll('#diary-tag-options .diary-tag-chip');
    const weatherChips = document.querySelectorAll('#diary-weather-options .diary-tag-chip');

    moodChips.forEach(chip => {
      chip.classList.toggle('selected', !!(entry && entry.mood === chip.dataset.tag));
    });
    weatherChips.forEach(chip => {
      chip.classList.toggle('selected', !!(entry && entry.weather === chip.dataset.weather));
    });
  },

  /** 重置所有标签 */
  resetDiaryTagChips() {
    document.querySelectorAll('.diary-tag-chip').forEach(c => c.classList.remove('selected'));
  },

  /** 渲染日记列表 */
  renderDiaryList() {
    const listEl = document.getElementById('diary-list-items');
    const emptyEl = document.getElementById('diary-list-empty');
    if (!listEl || !emptyEl) return;

    let entries;
    if (this.diaryFilterDate) {
      entries = DiaryModule.getFilteredEntries({ dateFrom: this.diaryFilterDate, dateTo: this.diaryFilterDate });
    } else if (this.diaryFilterMood && this.diaryFilterMood !== 'all') {
      entries = DiaryModule.getFilteredEntries({ mood: this.diaryFilterMood });
    } else {
      entries = DiaryModule.getFilteredEntries({});
    }

    if (entries.length === 0) {
      emptyEl.style.display = 'flex';
      listEl.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.style.display = 'flex';

    listEl.innerHTML = entries.map(e => {
      const dateShort = DiaryModule.formatDateKey(e.dateKey);
      const preview = e.content.replace(/\n/g, ' ').slice(0, 60);
      const isActive = e.dateKey === this.diarySelectedDate;

      let tagHtml = '';
      if (e.mood) tagHtml += `<span class="diary-list-item-tag">${DiaryModule.MOOD_MAP[e.mood] || e.mood}</span>`;
      if (e.weather) tagHtml += `<span class="diary-list-item-tag weather-tag">${DiaryModule.WEATHER_MAP[e.weather] || e.weather}</span>`;

      return `<div class="diary-list-item${isActive ? ' active' : ''}" data-date="${e.dateKey}" onclick="App.selectDiaryDate('${e.dateKey}')">
        <div class="diary-list-item-header">
          <span class="diary-list-item-date">📅 ${dateShort}</span>
          <span class="diary-list-item-badges">${e.markedAsResume ? '📋' : ''}</span>
        </div>
        <div class="diary-list-item-preview">${preview || '(空)'}</div>
        ${tagHtml ? '<div class="diary-list-item-tags">' + tagHtml + '</div>' : ''}
      </div>`;
    }).join('');

    // 滚动到当前选中项（使用 auto 避免平滑滚动动画干扰交互）
    setTimeout(() => {
      const activeItem = listEl.querySelector('.diary-list-item.active');
      if (activeItem) activeItem.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }, 50);
  },

  /** 更新统计徽章 */
  updateDiaryStats() {
    const badge = document.getElementById('diary-stats-badge');
    if (!badge) return;
    const stats = DiaryModule.getStats();
    badge.textContent = `${stats.total} 篇`;
  },

  /** 保存日记 */
  handleDiarySave() {
    if (!this.diarySelectedDate) return;
    const textarea = document.getElementById('diary-editor-textarea');
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
      DiaryModule.deleteEntry(this.diarySelectedDate);
      this.renderCalendar();
      this.renderDiaryEditor();
      this.renderDiaryList();
      this.updateDiaryStats();
      return;
    }

    DiaryModule.saveContent(this.diarySelectedDate, content);
    this.renderCalendar();
    this.renderDiaryEditor();
    this.renderDiaryList();
    this.updateDiaryStats();
  },

  /** 切换简历素材标记 */
  handleToggleResumeMark() {
    if (!this.diarySelectedDate) return;
    const marked = DiaryModule.toggleResumeMark(this.diarySelectedDate);
    this.renderDiaryEditor();

    // ★ 不重建整个列表（避免 scrollIntoView 平滑滚动导致编辑器抖动 + 拦截心情/天气点击）
    // 只更新目标列表项的 📋 徽章
    const listItem = document.querySelector(`.diary-list-item[data-date="${this.diarySelectedDate}"]`);
    if (listItem) {
      const badgeEl = listItem.querySelector('.diary-list-item-badges');
      if (badgeEl) {
        badgeEl.textContent = marked ? '📋' : '';
      }
    }
  },

  /** 导出日记 */
  exportDiary() {
    const text = DiaryModule.export();
    this.downloadFile('成长日记.md', text);
  },

  // ============================================
  //  知识库页渲染（增强版 - 横滑标签+FAB）
  // ============================================
  renderKnowledgePage() {
    const container = document.getElementById('sub-knowledge-page');
    if (!container) return;
    const dynamicArea = document.getElementById('knowledge-dynamic-area');
    if (!dynamicArea) return;

    const items = KnowledgeModule.getAll();
    const stats = KnowledgeModule.getStats();
    const catStats = KnowledgeModule.getCategoryStats();

    // 横滑分类标签
    const categoryTabs = KnowledgeModule.categories.filter(c => catStats[c] > 0 || c === '其他');
    let html = `
      <div class="knowledge-category-tabs" id="knowledge-cat-tabs">
        <span class="cat-tab active" data-cat="all">全部 (${stats.total})</span>
        ${categoryTabs.map(c => `<span class="cat-tab" data-cat="${c}">${c} (${catStats[c]||0})</span>`).join('')}
      </div>
      <div class="module-actions">
        <button class="btn-module-action" onclick="App.exportKnowledge()">📤 导出知识库</button>
        <input type="text" class="kb-search" id="kb-search-input" placeholder="🔍 搜索知识库..." oninput="App.searchKnowledge(this.value)">
      </div>
    `;

    if (items.length === 0) {
      html += `
        <div class="placeholder-view">
          <div class="placeholder-icon">📚</div>
          <p class="placeholder-text">知识库还是空的</p>
          <p class="placeholder-hint">与企鹅聊天时，重要知识点会自动收录。点击右下角 + 手动添加。</p>
        </div>
      `;
    } else {
      html += '<div class="kb-list" id="kb-list">';
      items.slice(0, 50).forEach(item => {
        const tags = (item.tags || []).slice(0, 5).map(t => `<span class="tag-chip">${t}</span>`).join('');
        const pinIcon = item.pinned ? '📌 ' : '';
        html += `
          <div class="kb-card" data-cat="${item.category}">
            <div class="kb-card-header">
              <span class="kb-title">${pinIcon}${item.title}</span>
              <span class="kb-cat">${item.category}</span>
            </div>
            <div class="kb-content">${(item.content || '').slice(0, 200)}</div>
            <div class="kb-meta">
              ${tags}
              <span class="kb-date">${item.dateStr}</span>
              <button class="btn-tiny" onclick="KnowledgeModule.togglePin('${item.id}');App.renderKnowledgePage();">📌</button>
              <button class="btn-tiny danger" onclick="KnowledgeModule.deleteItem('${item.id}');App.renderKnowledgePage();">🗑️</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    dynamicArea.innerHTML = html;

    // 渲染腾讯官方资源卡片（在contentArea内容之后，不影响知识库列表）
    this.renderTencentResources();

    // 绑定横滑标签点击事件
    const catTabs = document.getElementById('knowledge-cat-tabs');
    if (catTabs) {
      catTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.cat-tab');
        if (!tab) return;
        // 更新active状态
        catTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        this.filterKnowledgeByCat(cat);
      });
    }
  },

  // ============================================
  //  知识库上传弹窗（文字输入 + 文件上传）
  // ============================================
  handleNewKnowledge() {
    // 移除旧弹窗
    const old = document.getElementById('knowledge-upload-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.className = 'knowledge-upload-modal active';
    modal.id = 'knowledge-upload-modal';
    modal.innerHTML = `
      <div class="ku-backdrop" id="ku-backdrop"></div>
      <div class="ku-sheet">
        <div class="ku-header">
          <h3>📤 上传知识</h3>
          <button class="ku-close-btn" id="ku-close">&times;</button>
        </div>

        <!-- 模式切换标签 -->
        <div class="ku-tab-bar" id="ku-tab-bar">
          <button class="ku-tab active" data-mode="text">✏️ 文字输入</button>
          <button class="ku-tab" data-mode="file">📁 文件上传</button>
        </div>

        <!-- 文字输入面板 -->
        <div class="ku-panel active" id="ku-panel-text">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input type="text" class="form-input" id="ku-title" placeholder="输入知识标题">
          </div>
          <div class="form-group">
            <label class="form-label">内容</label>
            <textarea class="form-textarea" id="ku-content" placeholder="输入知识内容..." rows="4"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">分类</label>
            <select class="form-select" id="ku-category">
              ${KnowledgeModule.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">标签（逗号分隔）</label>
            <input type="text" class="form-input" id="ku-tags" placeholder="如：前端, React">
          </div>
        </div>

        <!-- 文件上传面板 -->
        <div class="ku-panel" id="ku-panel-file">
          <div class="ku-dropzone" id="ku-dropzone">
            <div class="ku-dropzone-icon">📂</div>
            <p class="ku-dropzone-text">拖拽文件到此处，或点击选择</p>
            <p class="ku-dropzone-hint">支持 PDF、Word (.docx)、TXT、JPG、PNG，单文件最大 10MB</p>
            <input type="file" class="ku-file-input" id="ku-file-input" multiple accept=".pdf,.docx,.txt,.jpg,.jpeg,.png">
            <button class="ku-browse-btn" id="ku-browse-btn">浏览文件</button>
          </div>
          <!-- 文件列表预览 -->
          <div class="ku-file-list" id="ku-file-list"></div>
          <!-- 上传进度条 -->
          <div class="ku-progress-wrap" id="ku-progress-wrap" style="display:none;">
            <div class="ku-progress-bar">
              <div class="ku-progress-fill" id="ku-progress-fill"></div>
            </div>
            <span class="ku-progress-text" id="ku-progress-text">0%</span>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label">默认分类（可批量覆盖）</label>
            <select class="form-select" id="ku-file-category">
              ${KnowledgeModule.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="ku-actions">
          <button class="form-btn form-btn-cancel" id="ku-cancel">取消</button>
          <button class="form-btn form-btn-confirm" id="ku-confirm">确定上传</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 弹窗状态
    this._kuMode = 'text';
    this._kuFiles = [];           // 已验证通过的文件
    this._kuFileContents = {};    // 文件内容缓存

    // --- 绑定事件 ---
    this._bindKnowledgeUploadEvents(modal);
  },

  /** 绑定知识库上传弹窗的所有事件 */
  _bindKnowledgeUploadEvents(modal) {
    // 关闭弹窗
    const close = () => modal.remove();
    document.getElementById('ku-backdrop').addEventListener('click', close);
    document.getElementById('ku-close').addEventListener('click', close);
    document.getElementById('ku-cancel').addEventListener('click', close);

    // 模式切换
    const tabBar = document.getElementById('ku-tab-bar');
    tabBar.addEventListener('click', (e) => {
      const tab = e.target.closest('.ku-tab');
      if (!tab) return;
      this._switchKuMode(tab.dataset.mode);
    });

    // 文件选择器
    const fileInput = document.getElementById('ku-file-input');
    document.getElementById('ku-browse-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this._handleKuFileSelect(e.target.files));

    // 拖拽上传
    const dropzone = document.getElementById('ku-dropzone');
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this._handleKuFileSelect(e.dataTransfer.files);
    });

    // 确认按钮
    document.getElementById('ku-confirm').addEventListener('click', () => this._handleKuConfirm(modal));
  },

  /** 切换文字输入/文件上传模式 */
  _switchKuMode(mode) {
    this._kuMode = mode;
    document.querySelectorAll('#ku-tab-bar .ku-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    document.getElementById('ku-panel-text').classList.toggle('active', mode === 'text');
    document.getElementById('ku-panel-file').classList.toggle('active', mode === 'file');
  },

  /** 处理文件选择 */
  _handleKuFileSelect(fileList) {
    const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png'];
    const ALLOWED_EXTS = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const files = Array.from(fileList);
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
        errors.push(`"${file.name}" 格式不支持，仅支持 PDF/Word/TXT/JPG/PNG`);
      } else if (file.size > MAX_SIZE) {
        errors.push(`"${file.name}" 超过 10MB 限制`);
      } else {
        validFiles.push(file);
      }
    });

    // 错误提示
    if (errors.length > 0) {
      // 静默跳过无效文件
    }

    // 添加已验证文件（去重）
    validFiles.forEach(f => {
      if (!this._kuFiles.some(ex => ex.name === f.name && ex.size === f.size)) {
        this._kuFiles.push(f);
      }
    });

    this._renderKuFileList();
  },

  /** 渲染文件列表预览 */
  _renderKuFileList() {
    const container = document.getElementById('ku-file-list');
    if (!container) return;

    if (this._kuFiles.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this._kuFiles.map((f, i) => {
      const ext = f.name.split('.').pop().toLowerCase();
      const iconMap = { pdf: '📕', docx: '📘', txt: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️' };
      const sizeStr = f.size < 1024 * 1024 ? (f.size / 1024).toFixed(1) + ' KB' : (f.size / 1024 / 1024).toFixed(1) + ' MB';
      return `
        <div class="ku-file-item">
          <span class="ku-file-icon">${iconMap[ext] || '📎'}</span>
          <div class="ku-file-info">
            <span class="ku-file-name">${this._escHtml(f.name)}</span>
            <span class="ku-file-size">${sizeStr}</span>
          </div>
          <button class="ku-file-remove" data-index="${i}" title="移除">✕</button>
        </div>
      `;
    }).join('');

    // 绑定移除事件
    container.querySelectorAll('.ku-file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.index);
        this._kuFiles.splice(idx, 1);
        this._renderKuFileList();
      });
    });
  },

  /** 确认上传处理 */
  async _handleKuConfirm(modal) {
    if (this._kuMode === 'text') {
      // --- 文字输入模式 ---
      const title = document.getElementById('ku-title').value.trim();
      const content = document.getElementById('ku-content').value.trim();
      const category = document.getElementById('ku-category').value;
      const tagsStr = document.getElementById('ku-tags').value.trim();

      if (!title) {
        return;
      }
      if (!content) {
        return;
      }

      const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
      KnowledgeModule.addManualItem(title, content, category || '其他', tags);
      modal.remove();
      this.renderKnowledgePage();
    } else {
      // --- 文件上传模式 ---
      if (this._kuFiles.length === 0) {
        return;
      }

      const category = document.getElementById('ku-file-category').value || '其他';

      // 显示进度条
      const progressWrap = document.getElementById('ku-progress-wrap');
      const progressFill = document.getElementById('ku-progress-fill');
      const progressText = document.getElementById('ku-progress-text');
      progressWrap.style.display = 'flex';
      progressFill.style.width = '0%';
      progressText.textContent = '0%';

      let addedCount = 0;
      const total = this._kuFiles.length;

      for (let i = 0; i < total; i++) {
        const file = this._kuFiles[i];
        try {
          const content = await this._readFileContent(file);
          const title = file.name.replace(/\.[^.]+$/, ''); // 去扩展名作标题
          const ext = file.name.split('.').pop().toLowerCase();
          const typeTag = ext === 'pdf' ? 'PDF' : ext === 'docx' ? 'Word' : ext === 'txt' ? 'TXT' : '图片';
          KnowledgeModule.addManualItem(
            `[${typeTag}] ${title}`,
            content,
            category,
            [typeTag, '文件上传']
          );
          addedCount++;
        } catch (err) {
          console.error(`解析文件 ${file.name} 失败:`, err);
        }

        // 更新进度条
        const pct = Math.round(((i + 1) / total) * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = pct + '%';

        // 模拟小延迟，让进度条动画可见
        await new Promise(r => setTimeout(r, 200));
      }

      modal.remove();
      this.renderKnowledgePage();
    }
  },

  /** 读取文件内容（浏览器端解析） */
  _readFileContent(file) {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'txt') {
        // TXT：直接读取文本
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('读取失败'));
        reader.readAsText(file, 'UTF-8');
      } else if (ext === 'pdf') {
        // PDF：使用 PDF.js 解析
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const typedArray = new Uint8Array(reader.result);
            const pdfjsLib = window.pdfjsLib;
            if (!pdfjsLib) {
              resolve('[PDF 文件] 预览暂不可用，请安装 PDF.js 库');
              return;
            }
            const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(it => it.str).join(' ');
              fullText += pageText + '\n';
            }
            resolve(fullText.trim() || '[PDF 文件] 无可提取文本');
          } catch (e) {
            resolve('[PDF 文件] 解析失败，请手动编辑内容');
          }
        };
        reader.onerror = () => reject(new Error('读取失败'));
        reader.readAsArrayBuffer(file);
      } else if (ext === 'docx') {
        // DOCX：使用 mammoth.js 解析
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const arrayBuffer = reader.result;
            const mammoth = window.mammoth;
            if (!mammoth) {
              resolve('[Word 文件] 预览暂不可用，请安装 mammoth.js 库');
              return;
            }
            const result = await mammoth.extractRawText({ arrayBuffer });
            resolve(result.value.trim() || '[Word 文件] 无可提取文本');
          } catch (e) {
            resolve('[Word 文件] 解析失败，请手动编辑内容');
          }
        };
        reader.onerror = () => reject(new Error('读取失败'));
        reader.readAsArrayBuffer(file);
      } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
        // 图片：生成 Data URL 作为内容引用
        const reader = new FileReader();
        reader.onload = () => {
          resolve(`[图片文件] ${file.name}\n大小: ${(file.size / 1024).toFixed(1)} KB\n类型: ${file.type}\n（图片内容以 Base64 编码存储，可在知识条目中查看）`);
        };
        reader.onerror = () => reject(new Error('读取失败'));
        reader.readAsDataURL(file);
      } else {
        resolve('[未知格式] 无法解析内容');
      }
    });
  },

  // ============================================
  //  内联新增志愿记录（在志愿面板表单中提交）
  // ============================================
  handleVolunteerInlineAdd() {
    const titleEl = document.getElementById('volunteer-inline-title');
    const hoursEl = document.getElementById('volunteer-inline-hours');
    const orgEl = document.getElementById('volunteer-inline-organization');
    const descEl = document.getElementById('volunteer-inline-desc');

    const title = titleEl ? titleEl.value.trim() : '';
    const hours = hoursEl ? parseFloat(hoursEl.value) : 0;
    const organization = orgEl ? orgEl.value : '';
    const description = descEl ? descEl.value.trim() : '';

    if (!title) {
      titleEl && titleEl.focus();
      return;
    }
    if (!hours || hours <= 0) {
      hoursEl && hoursEl.focus();
      return;
    }

    VolunteerModule.addRecord({
      title,
      hours,
      organization: organization || '',
      description: description || ''
    });

    // 清空表单
    if (titleEl) titleEl.value = '';
    if (hoursEl) hoursEl.value = '';
    if (orgEl) orgEl.value = '';
    if (descEl) descEl.value = '';

    // 重新渲染
    this.renderVolunteerContent();

    // 聚焦回标题输入框方便连续添加
    setTimeout(() => {
      const newTitleEl = document.getElementById('volunteer-inline-title');
      if (newTitleEl) newTitleEl.focus();
    }, 100);
  },

  /**
   * 删除志愿记录（带确认）
   */
  handleDeleteVolunteer(id) {
    const record = VolunteerModule.records.find(r => r.id === id);
    if (!record) return;

    const confirmed = confirm(`确定要删除"${record.title}"（${record.hours}h）这条志愿记录吗？\n\n此操作不可撤销。`);
    if (!confirmed) return;

    VolunteerModule.deleteRecord(id);
    this.renderVolunteerContent();

    // 反馈
    const toast = document.createElement('div');
    toast.className = 'toast toast--success';
    toast.textContent = '已删除志愿记录';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  },

  // ============================================
  //  工具方法
  // ============================================
  downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // ============================================
  //  腾讯官方资源快捷入口
  // ============================================
  /** 腾讯官方资源数据 */
  TENCENT_RESOURCES: [
    {
      id: 'campus',
      icon: '🎯',
      title: '腾讯校招官网',
      desc: '大三/大四 — 投简历、查岗位',
      gradeTag: '大三·大四',
      url: 'https://join.qq.com'
    },
    {
      id: 'about',
      icon: '🏢',
      title: '腾讯公司介绍',
      desc: '大一/大二 — 了解腾讯是做什么的',
      gradeTag: '大一·大二',
      url: 'https://www.tencent.com/zh-cn/about'
    },
    {
      id: 'culture',
      icon: '💙',
      title: '"用户为本，科技向善"文化',
      desc: '所有年级 — 面试必考"为什么选腾讯"',
      gradeTag: '全年级',
      url: 'https://www.tencent.com/zh-cn/about.html#about-con-6'
    },
    {
      id: 'business',
      icon: '📖',
      title: '腾讯业务全景',
      desc: '大一 — 看腾讯有哪些产品',
      gradeTag: '大一',
      url: 'https://www.tencent.com'
    },
    {
      id: 'ssv',
      icon: '🌱',
      title: '腾讯SSV（可持续社会价值）',
      desc: '所有年级 — "科技向善"在做什么',
      gradeTag: '全年级',
      url: 'https://ssv.tencent.com'
    },
    {
      id: 'labs',
      icon: '🧪',
      title: '腾讯云动手实验室',
      desc: '所有年级 — 免费实战，边学边练',
      gradeTag: '全年级',
      url: 'https://cloud.tencent.com/developer/labs'
    }
  ],

  /** 渲染腾讯官方资源卡片 */
  renderTencentResources() {
    const grid = document.getElementById('resources-grid');
    if (!grid) return;

    grid.innerHTML = this.TENCENT_RESOURCES.map(r => `
      <a class="resource-card" href="${r.url}" target="_blank" rel="noopener" title="${r.desc}">
        <span class="res-icon">${r.icon}</span>
        <span class="res-title">${r.title}</span>
        <span class="res-desc">${r.desc}</span>
        <span class="res-grade-tag">${r.gradeTag}</span>
        <span class="res-link-hint">↗ 新窗口打开</span>
      </a>
    `).join('');
  },

  // ============================================
  //  年级直达卡片数据
  // ============================================
  GRADE_CARDS: [
    {
      grade: 'freshman',
      icon: '🌱',
      name: '大一·好奇探索期',
      summary: '了解互联网和腾讯',
      phase: '好奇探索期',
      items: [
        { icon: '🌐', title: '互联网行业全景图', content: '点击下方标签页探索不同维度', visualData: { type: 'tabs', tabs: [
          { id: 'map', icon: '🗺️', label: '赛道地图', html: '' },  // 动态渲染
          { id: 'company', icon: '🏗️', label: '公司格局', html: '' },
          { id: 'role', icon: '🎯', label: '岗位雷达', html: '' },
          { id: 'salary', icon: '💰', label: '薪资速览', html: '' }
        ]}, _renderVisual(container) { this._renderIndustryVisual(container); } },
        { icon: '🏢', title: '腾讯业务介绍', content: '点击事业群卡片查看详情', visualData: { type: 'biz-grid', groups: [
          { id: 'wxg', abbr: 'WXG', name: '微信事业群', location: '广州', color: '#07C160', emoji: '💬', desc: '微信 · 支付 · 小程序 · 视频号 · 企业微信', highlight: '月活13亿+，最大流量入口', roles: '产品经理 / 前后端开发 / 数据分析 / 运营' },
          { id: 'ieg', abbr: 'IEG', name: '互动娱乐事业群', location: '深圳', color: '#FF6B35', emoji: '🎮', desc: '王者荣耀 · 和平精英 · LOL · 无畏契约 · QQ飞车', highlight: '现金牛，收入占腾讯30%+', roles: '游戏策划 / C++/Unity/UE / 游戏美术 / 电竞运营' },
          { id: 'csig', abbr: 'CSIG', name: '云与智慧产业事业群', location: '深圳', color: '#0052D9', emoji: '☁️', desc: '腾讯云 · 腾讯会议 · 企业微信 · 安全', highlight: '校招大户，云市场份额第二', roles: '后端开发 / B端PM / 售前架构师 / 法务合规' },
          { id: 'pcg', abbr: 'PCG', name: '平台与内容事业群', location: '深圳/北京', color: '#FFB800', emoji: '📺', desc: 'QQ · 腾讯视频 · 腾讯新闻 · 动漫 · 微视', highlight: '年轻人聚集地，内容运营摇篮', roles: '产品经理 / 内容运营 / UI&UX / 前端开发' },
          { id: 'cdg', abbr: 'CDG', name: '企业发展事业群', location: '深圳', color: '#9B59B6', emoji: '🧠', desc: '腾讯广告（广点通）· 腾讯投资', highlight: '腾讯大脑，决定战略方向', roles: '商业分析 / 战略投资 / 广告PM / 数据分析' },
          { id: 'teg', abbr: 'TEG', name: '技术工程事业群', location: '深圳', color: '#2C3E50', emoji: '⚙️', desc: '混元大模型 · 云底层技术 · AI Lab · 安全实验室', highlight: '技术心脏，AI方向大热', roles: '算法工程师 / 后端开发 / 安全 / 系统架构' },
          { id: 'newbiz', abbr: '创新', name: '企业发展事业部', location: '多地', color: '#E91E63', emoji: '🚀', desc: '创新业务孵化 · 内部创业', highlight: '鼓励内部创业，小团队做大产品', roles: '多方向开放，适合有创业精神的你' }
        ]}, link: 'https://www.tencent.com/zh-cn/business' },
        { icon: '📋', title: '大一行动清单', content: '勾选已完成项，追踪你的成长轨迹', visualData: { type: 'checklist', sections: [
          { id: 'academic', icon: '📚', label: '学术篇 · 稳住基本盘', color: '#4A90D9', items: [
            { id: 'gpa', num: '①', icon: '📊', title: '保住绩点', desc: '大一的绩点决定了你未来三年的起点。很多大厂简历筛选中，绩点是一个隐性筛选条件——<b>3.5 / 4.0</b> 是一条常见的隐形线。', tips: '别挂科，别放松，至少保持中上水平。', tag: '学业' },
            { id: 'english', num: '②', icon: '🔤', title: '搞定英语四六级', desc: '越早考越好，因为大一是你英语水平的巅峰。互联网行业的技术文档、面试题、海外市场——英语好是很大的加分项。<b>六级 500+</b> 在简历上是一个亮点。', tips: '', tag: '语言' },
            { id: 'code', num: '③', icon: '💻', title: '学好一门编程语言', desc: '不管你是什么专业，<b>Python 都值得学</b>。法学 + Python 能做法律数据分析，商科 + Python 能做量化分析，设计 + Python 能做自动化工具。', tips: '推荐（全免费）：Python 官方教程 · 菜鸟教程 · 廖雪峰 Python 教程', tag: '硬技能' }
          ]},
          { id: 'cognition', icon: '🧠', label: '认知篇 · 开始了解行业', color: '#00A870', items: [
            { id: 'news', num: '④', icon: '📡', title: '每周花 30 分钟看互联网资讯', desc: '不需要精读，刷个标题和摘要就行。关注 <b>腾讯科技 · 36氪 · 晚点 LatePost</b> 公众号；日常刷知乎互联网话题、即刻 App。', tips: '慢慢你会发现：半年前听不懂的词（"私域流量""底层能力""闭环"），半年后随口就能用。', tag: '视野' },
            { id: 'jobdesc', num: '⑤', icon: '🔍', title: '了解一份岗位说明书', desc: '去招聘网站找一个你感兴趣的岗位，看看它的「岗位要求」写的是什么。不用看懂全部，只需要知道<b>"原来做这个需要会这些技能"</b>。', tips: '大一能做的事，就是大四的底牌。', tag: '认知' }
          ]},
          { id: 'practice', icon: '🛠️', label: '实践篇 · 动手做点什么', color: '#E37318', items: [
            { id: 'club', num: '⑥', icon: '🤝', title: '参加一个社团 / 组织', desc: '学生会、社团、志愿者组织——不只是为了简历上多一行字，而是为了积累<b>"你曾和一群人一起完成过一件事"</b>的经验。面试官问"团队协作经历"时，你至少能说出一个具体的例子。', tips: '', tag: '软技能' },
            { id: 'contest', num: '⑦', icon: '🏆', title: '参加一次比赛', desc: '互联网+ 创新创业大赛、挑战杯、模拟法庭、程序竞赛——什么比赛都行。重点不是你拿了第几名，而是你完整经历了一次<b>"设定目标 → 组队 → 分工 → 执行 → 交付"</b>的全流程。', tips: '', tag: '实践' },
            { id: 'project', num: '⑧', icon: '🚀', title: '做一个属于自己的小项目', desc: '<b>学法</b>的：写一篇互联网法律分析文章，发在知乎/公众号。<b>学技术</b>的：写一个个人博客/小工具，放 GitHub 上。<b>学设计</b>的：给某个产品重新设计一版界面，发在设计社区。', tips: '这个小项目，就是你大四简历上「项目经历」栏的第一行内容。', tag: '作品' }
          ]},
          { id: 'habit', icon: '🌱', label: '习惯篇 · 建立长期优势', color: '#8B5CF6', items: [
            { id: 'journal', num: '⑨', icon: '📝', title: '养成记录的习惯', desc: '用一路有鹅的日记功能，每天花 5 分钟记录"今天做了什么"。这不是任务，而是帮你建立"回顾"的习惯——到大四回头看，你会发现自己走了多远。', tips: '', tag: '习惯' },
            { id: 'hobby', num: '⑩', icon: '🎯', title: '找到一个可以长期坚持的爱好', desc: '运动、摄影、写作、乐器——随便什么都好。工作后的压力远比大学大，一个能让你放松下来的爱好，是你能走远的重要支撑。', tips: '', tag: '生活' }
          ]}
        ], footer: '<b>📌 一句话总结</b><br>大一最不需要做的事：<b>焦虑</b>。大一最需要做的事：<b>动手</b>。<br><br>上面 10 条，不用全做。挑 3 条你觉得最感兴趣的，动手开始做就行。做完一条回来打个勾 🗹，你的企鹅会为你解锁一个对应的小特征。' } },
        { icon: '🗓️', title: '大学四年时间线总览', content: '一张图看清从大一到大四每个阶段的核心任务', visualData: { type: 'html', html: `<div class="fr-timeline">
          <div class="fr-tl-row r1"><div class="fr-tl-year">🌱 大一</div><div class="fr-tl-phase">好奇探索期</div><div class="fr-tl-desc">了解互联网行业全景，学好基础课，建立好习惯</div><div class="fr-tl-actions">📋 行动清单 · 🌐 行业认知</div></div>
          <div class="fr-tl-row r2"><div class="fr-tl-year">🌿 大二</div><div class="fr-tl-phase">方向探索期</div><div class="fr-tl-desc">深入探索岗位方向，积累技能和项目经验</div><div class="fr-tl-actions">🎭 岗位探索 · 🌳 技能树规划</div></div>
          <div class="fr-tl-row r3"><div class="fr-tl-year">🌳 大三</div><div class="fr-tl-phase">实习冲刺期</div><div class="fr-tl-desc">拿下暑期实习，积累真实职场经验</div><div class="fr-tl-actions">🏕️ 实习攻略 · 📝 简历打磨</div></div>
          <div class="fr-tl-row r4"><div class="fr-tl-year">🚀 大四</div><div class="fr-tl-phase">求职冲刺期</div><div class="fr-tl-desc">秋招面试，拿下心仪offer</div><div class="fr-tl-actions">🎤 面试冲刺 · ⚖️ Offer决策</div></div>
        </div>` } },
        { icon: '🧪', title: '互联网岗位体验日', content: '6个岗位，6个小任务，用一小时体验不同方向', visualData: { type: 'html', html: `<div class="fr-exp-intro">选一个你感兴趣的岗位，花 <b>15 分钟</b>完成对应的小任务。做完之后你可能会发现：<b>"原来我对这个方向还挺有兴趣的"</b>——或者"嗯，这个方向不太适合我"。哪一种发现都很有价值。</div>
          <div class="fr-exp-grid">
            <div class="fr-exp-card c1"><span class="fr-exp-emoji">📱</span><div class="fr-exp-name">产品经理</div><div class="fr-exp-task">选一个你常用的App，写下它的3个优点和3个可以改进的地方</div><span class="fr-exp-tag">难度 ★★</span></div>
            <div class="fr-exp-card c2"><span class="fr-exp-emoji">💻</span><div class="fr-exp-name">前端开发</div><div class="fr-exp-task">打开浏览器F12开发者工具，看看你最常访问的网页代码长什么样</div><span class="fr-exp-tag">难度 ★</span></div>
            <div class="fr-exp-card c3"><span class="fr-exp-emoji">📊</span><div class="fr-exp-name">数据分析</div><div class="fr-exp-task">用Excel统计你最近一周的手机使用时间，画出每天的使用分布</div><span class="fr-exp-tag">难度 ★</span></div>
            <div class="fr-exp-card c4"><span class="fr-exp-emoji">📣</span><div class="fr-exp-name">内容运营</div><div class="fr-exp-task">为你喜欢的产品写一条朋友圈/小红书风格的推荐文案</div><span class="fr-exp-tag">难度 ★★</span></div>
            <div class="fr-exp-card c5"><span class="fr-exp-emoji">🎨</span><div class="fr-exp-name">UI设计</div><div class="fr-exp-task">截图一个App页面，用手机自带的标注工具标记3个"看着不舒服"的地方</div><span class="fr-exp-tag">难度 ★</span></div>
            <div class="fr-exp-card c6"><span class="fr-exp-emoji">🧪</span><div class="fr-exp-name">测试/QA</div><div class="fr-exp-task">打开一个网页/App，连续点10个地方，看看有没有什么奇怪的响应</div><span class="fr-exp-tag">难度 ★</span></div>
          </div>` } },
        { icon: '📡', title: '行业热点追踪', content: '了解最近互联网行业发生了什么，保持信息敏感度', visualData: { type: 'html', html: `<div class="fr-news-list">
          <div class="fr-news-item"><span class="fr-news-badge">🤖 AI</span><span class="fr-news-text">大模型竞争白热化——各大厂商纷纷推出自研大模型，AI应用正从"聊天"走向"生产力工具"</span></div>
          <div class="fr-news-item"><span class="fr-news-badge">🌍 出海</span><span class="fr-news-text">中国企业加速出海——TikTok/Temu/SHEIN等App在海外市场表现亮眼，催生大量海外运营/产品岗位</span></div>
          <div class="fr-news-item"><span class="fr-news-badge">☁️ 云服务</span><span class="fr-news-text">云计算+AI深度结合——云厂商正在从"卖算力"向"卖AI能力"转型</span></div>
          <div class="fr-news-item"><span class="fr-news-badge">🎮 游戏</span><span class="fr-news-text">国产游戏全球化——米哈游/腾讯等厂商的全球化布局加速，游戏出海需求旺盛</span></div>
          <div class="fr-news-item"><span class="fr-news-badge">📊 数据</span><span class="fr-news-text">数据合规成为刚需——个人隐私保护法规趋严，数据合规人才需求爆发式增长</span></div>
        </div>
        <div class="fr-news-footer">💡 <b>小建议：</b>每周花10分钟看看 36氪 / 腾讯科技 / 晚点LatePost 的标题就行。<br>不求深读，但求知道"行业在说什么"——这本身就是一种积累。🏗️</div>` } }
      ]
    },
    {
      grade: 'sophomore',
      icon: '🌿',
      name: '大二·方向探索期',
      summary: '找到你的方向',
      phase: '方向探索期',
      items: [
        { icon: '🎭', title: '各岗位角色卡', content: '点击每个岗位卡片查看详情——了解不同岗位真实的工作日常', visualData: { type: 'role-detail-cards', roles: [
          { emoji: '📱', name: '产品经理', color: '#0052D9', oneliner: '想清楚做什么、为什么做，然后推动团队把它做出来', day: '看数据 → 对需求 → 画原型 → 写文档 → 和开发沟通（不是吵架😄）', skills: '逻辑思维 · 沟通 · 用户感 · 数据分析', fit: '喜欢想"为什么"、喜欢和人打交道的人', quote: '"产品经理不是经理，是啥都得管的那个人"', detail: '产品经理负责定义产品的功能和体验，需要理解用户需求、分析数据、设计解决方案，然后推动工程师和设计师一起把产品做出来。不同公司的PM分工不同——有的偏用户侧（C端），有的偏商业侧（B端），有的偏策略/增长。' },
          { emoji: '💻', name: '前端开发', color: '#E37318', oneliner: '你看到的网页/App界面，都是前端写的', day: '写页面 → 调接口 → 修bug → 开会 → 逛GitHub → 继续写页面', skills: 'HTML · CSS · JavaScript · React · Vue', fit: '有耐心、审美还行、喜欢"写出来就能看到"的人', quote: '"前端是最能快速看到成果的方向，改一行代码页面就变了"', detail: '前端开发负责把设计稿变成可交互的页面，需要理解浏览器原理、掌握至少一个主流框架（React/Vue），还要懂一点后端才能更好地和接口打交道。随着跨端技术的发展，前端的能力边界正在扩展到小程序、移动端甚至桌面端。' },
          { emoji: '📊', name: '后端开发', color: '#00A870', oneliner: '你看不到但离不开的东西，都是后端写的', day: '写接口 → 设计数据库 → 看监控 → 修bug → 技术分享', skills: 'Java/Go/Python · 数据库 · 系统设计 · Linux', fit: '逻辑清晰、喜欢抽象思维、能接受"代码跑了但用户看不到"的人', quote: '"好的后端工程师像一个城市的供水系统——平时没人注意，但一旦出问题所有人都会发现"', detail: '后端开发负责服务器端的逻辑、数据存储和接口设计，需要理解分布式系统、数据库原理、网络协议等。腾讯的后端技术栈以C++和Go为主，部分团队也用Java和Python。校招面试看重数据结构与算法、操作系统、数据库等基础知识。' },
          { emoji: '📣', name: '运营', color: '#ED7B2F', oneliner: '让产品被更多人知道、用起来、留下来', day: '看数据 → 写内容 → 做活动 → 跟社区 → 复盘 → 继续看数据', skills: '内容 · 数据分析 · 用户洞察 · 活动策划', fit: '网感好、爱刷社媒、喜欢搞事情的人', quote: '"运营是没有标准答案的工作，但也是离用户最近的工作"', detail: '运营种类繁多——内容运营负责产出优质内容、用户运营维护核心用户群体、活动运营策划增长方案、数据运营用数据驱动决策。运营的核心能力是"把一个想法落地成可执行方案并能验证效果"，这在大二就可以通过运营一个公众号/社群来练习。' },
          { emoji: '🎨', name: 'UI/UX设计', color: '#E070B0', oneliner: '让产品好看 + 好用', day: '画稿 → 做交互 → 对需求 → 跟开发 → 改稿 → 看数据', skills: 'Figma · 设计规范 · 用户研究 · 交互思维', fit: '审美在线、注重细节、愿意学工具的人', quote: '"好的设计是让用户感觉不到设计的存在"', detail: 'UI设计关注视觉层面（颜色、字体、间距、图标），UX设计关注交互层面（用户流程、信息架构、可用性）。在腾讯，设计师需要同时具备UI和UX能力，还要能理解商业目标和用户需求的平衡。大二可以开始用Figma做作品集。' },
          { emoji: '⚖️', name: '法务/合规', color: '#9B59B6', oneliner: '保证公司不做违法的事，出了事能兜住', day: '审合同 → 查合规 → 写意见 → 跟项目 → 学新法规', skills: '法律功底 · 合同审核 · 数据合规 · 商业思维', fit: '法学专业、细心、有边界感的人', quote: '"法务不是\'说不\'的人，是帮业务找到\'可以怎么做\'的人"', detail: '互联网法务与传统法务不同，需要理解技术逻辑和产品逻辑。数据合规（个人信息保护法）、知识产权（游戏/内容版权）、反垄断等都是互联网法务的高频场景。大二可以开始关注数据合规领域，这是近年互联网法务需求最大的方向。' },
          { emoji: '🧪', name: '测试/QA', color: '#4A90D9', oneliner: '你不是来找茬的，你是用户最后一道防线', day: '写用例 → 做测试 → 提bug → 写自动化脚本 → 跟开发沟通', skills: 'Python/Shell · 测试理论 · 自动化工具 · 细心耐心', fit: '逻辑缜密、喜欢追根究底、能从用户视角看问题的人', quote: '"产品上线前的最后一道关卡，你拦住的bug就是帮用户拦住的烦躁"', detail: '测试不只是"点点点"，现代QA需要写自动化测试脚本、做性能测试、安全测试。大厂测试岗对编程能力有要求（至少能写自动化脚本），但门槛比开发岗稍低，是技术转型的好入口。' }
        ]} },
        { icon: '🗺️', title: '专业→职业对应表', content: '每个专业大类展开3个互联网方向，配真实鹅厂人案例', visualData: { type: 'major-career-map', majors: [
          { major: '计算机/软件', icon: '💻', directions: [
            { career: '前端开发', detail: '最对口，直接写界面', example: '某鹅厂前端：大二开始学Vue，做了个人博客和两个小程序' },
            { career: '后端开发', detail: '偏服务端、数据库', example: '某鹅厂后端：ACM省赛银牌，LeetCode 400题，实习转正' },
            { career: '算法工程师', detail: '数学要好，读论文能力', example: '某鹅厂算法：研二发了一篇顶会，被内推面试直通终面' }
          ]},
          { major: '数学/统计', icon: '📐', directions: [
            { career: '数据分析师', detail: '最直接，各行各业都要', example: '某鹅厂DA：统计学本科，会用SQL+Python+Tableau就够了' },
            { career: '算法工程师', detail: '数学功底是核心优势', example: '某鹅厂算法：数学系博士，研究方向刚好对口业务需求' },
            { career: '商业分析', detail: '偏战略、市场分析', example: '某鹅厂BA：统计+经管双学位，暑期实习拿到return offer' }
          ]},
          { major: '设计/美术', icon: '🎨', directions: [
            { career: 'UI/UX设计', detail: '最对口，需要作品集', example: '某鹅厂设计师：视觉传达专业，大三作品集拿了3个大厂offer' },
            { career: '游戏美术', detail: '原画/3D/动效', example: '某鹅厂游戏美术：国美毕业，大学期间参加GGJ游戏创作比赛' },
            { career: '新媒体设计', detail: '公众号/海报/H5', example: '某鹅厂设计：大学运营系公众号积累了20+排版案例' }
          ]},
          { major: '中文/新闻', icon: '📝', directions: [
            { career: '内容运营', detail: '最对口，会写就行', example: '某鹅厂运营：新闻系，大学写了100+篇公众号文章，阅读量破百万' },
            { career: '新媒体策划', detail: '短视频、社区方向', example: '某鹅厂策划：中文系，B站UP主，5万粉丝，被HR主动联系' },
            { career: '公关/品牌', detail: '偏外部沟通和传播', example: '某鹅厂公关：新闻+英语双学位，实习时写过一篇10w+新闻稿' }
          ]},
          { major: '法学', icon: '⚖️', directions: [
            { career: '法务', detail: '互联网法务需求大', example: '某鹅厂法务：法大硕士，通过法考，实习期间跟过两个合规项目' },
            { career: '数据合规', detail: '近年最火的交叉领域', example: '某鹅厂合规：法学本科+辅修计算机，个人信息保护法领域稀缺人才' },
            { career: '知识产权', detail: '游戏/影视版权方向', example: '某鹅厂IP法务：知识产权方向硕士，写过游戏版权分析论文' }
          ]},
          { major: '心理学', icon: '🧠', directions: [
            { career: '用户研究', detail: '最对口，做用研', example: '某鹅厂用研：心理学硕士，毕设做的就是社交App用户行为分析' },
            { career: 'HR', detail: '招聘、培训方向', example: '某鹅厂HR：应用心理学，校招季跟着参与了一整个招聘流程' },
            { career: '产品经理', detail: '洞察用户心理', example: '某鹅厂PM：心理学+辅修计算机，用户同理心是ta的核心优势' }
          ]},
          { major: '外语', icon: '🌍', directions: [
            { career: '海外运营', detail: '出海业务需要语言', example: '某鹅厂海外运营：日语N1+英语专八，负责日本市场的社群运营' },
            { career: '国际化产品', detail: '多语言产品设计', example: '某鹅厂PM：英语专业+自学设计，负责东南亚市场的产品本地化' },
            { career: '海外商务', detail: '跨境合作、BD', example: '某鹅厂BD：西语专业，负责拉美市场游戏发行合作谈判' }
          ]},
          { major: '商科/经管', icon: '💼', directions: [
            { career: '商业分析', detail: '战略、投资方向', example: '某鹅厂BA：金融+计算机双学位，做过一份咨询公司PTA' },
            { career: '产品运营', detail: 'B端产品运营需求', example: '某鹅厂运营：市场营销专业，暑期实习时做了一个增长方案被采纳' },
            { career: '商务拓展', detail: '对外合作、渠道', example: '某鹅厂BD：国际经济与贸易，英语流利，有过一个出海电商实习' }
          ]}
        ], footer: '💡 核心逻辑：<b>不是"你的专业能干什么"，而是"你的专业 × 互联网 = 什么交叉岗位"</b>。跨专业完全可行，关键是找到交叉点并用项目经历证明自己。' } },
        { icon: '🌳', title: '技能树规划', content: '选一个方向，看看大二这一年该怎么长技能', visualData: { type: 'skill-tree', directions: [
          { id: 'pm', name: '产品经理 方向', icon: '📱', color: '#0052D9', semesters: [
            { label: '大二上学期 · 入门基础', items: [
              { id: 's2-pm-read', text: '读《人人都是产品经理》入门', tag: '阅读' },
              { id: 's2-pm-proto', text: '学会用 Figma 画原型', tag: '工具' },
              { id: 's2-pm-data', text: '学会看数据（SQL + Excel 透视表）', tag: '硬技能' },
              { id: 's2-pm-follow', text: '关注 3 个行业号（36氪/晚点/乱翻书）', tag: '视野' }
            ]},
            { label: '大二下学期 · 项目实战', items: [
              { id: 's2-pm-interview', text: '做一次用户访谈（至少5个人）', tag: '实践' },
              { id: 's2-pm-prd', text: '写一份完整 PRD（产品需求文档）', tag: '硬技能' },
              { id: 's2-pm-project', text: '参与一个真实项目（社团/比赛/创业）', tag: '实践' },
              { id: 's2-pm-output', text: '输出一篇产品分析文章', tag: '输出' }
            ]}
          ]},
          { id: 'frontend', name: '前端开发 方向', icon: '💻', color: '#E37318', semesters: [
            { label: '大二上学期 · 打好地基', items: [
              { id: 's2-fe-htmlcss', text: '精通 HTML/CSS（Flex + Grid 布局）', tag: '基础' },
              { id: 's2-fe-js', text: '系统学 JavaScript（ES6+）', tag: '语言' },
              { id: 's2-fe-git', text: '学会 Git 版本管理', tag: '工具' },
              { id: 's2-fe-project1', text: '做一个个人博客/作品集网站', tag: '项目' }
            ]},
            { label: '大二下学期 · 框架进阶', items: [
              { id: 's2-fe-react', text: '学 React 或 Vue（选一个深入）', tag: '框架' },
              { id: 's2-fe-npm', text: '用过至少 5 个 npm 包并理解原理', tag: '工程化' },
              { id: 's2-fe-ts', text: '开始用 TypeScript', tag: '语言' },
              { id: 's2-fe-project2', text: '做一个有后端接口的全栈项目', tag: '项目' }
            ]}
          ]},
          { id: 'backend', name: '后端开发 方向', icon: '📊', color: '#00A870', semesters: [
            { label: '大二上学期 · 语言+基础', items: [
              { id: 's2-be-lang', text: '精通一门后端语言（Go/Java/Python）', tag: '语言' },
              { id: 's2-be-linux', text: '会用 Linux 命令行 + 写 Shell 脚本', tag: '工具' },
              { id: 's2-be-sql', text: '精通 SQL（增删改查 + 索引优化）', tag: '数据库' },
              { id: 's2-be-algo', text: '刷 LeetCode 简单+中等（100题）', tag: '算法' }
            ]},
            { label: '大二下学期 · 系统+项目', items: [
              { id: 's2-be-system', text: '学操作系统/计算机网络基础', tag: '基础' },
              { id: 's2-be-api', text: '写一个 RESTful API 服务并部署上线', tag: '项目' },
              { id: 's2-be-redis', text: '会用 Redis + MySQL 做缓存方案', tag: '中间件' },
              { id: 's2-be-opensource', text: '读一个开源项目的源码并写分析', tag: '进阶' }
            ]}
          ]},
          { id: 'design', name: '设计 方向', icon: '🎨', color: '#E070B0', semesters: [
            { label: '大二上学期 · 学工具+临摹', items: [
              { id: 's2-ds-figma', text: '熟练使用 Figma（组件/变体/自动布局）', tag: '工具' },
              { id: 's2-ds-copy', text: '临摹 10 个 App 界面（选你喜欢的）', tag: '练习' },
              { id: 's2-ds-color', text: '建立自己的设计参考库（Dribbble/Pinterest）', tag: '审美' },
              { id: 's2-ds-read', text: '读《写给大家看的设计书》', tag: '阅读' }
            ]},
            { label: '大二下学期 · 作品集+实战', items: [
              { id: 's2-ds-redesign', text: '给一个产品做完整 redesign 案例', tag: '作品' },
              { id: 's2-ds-ux', text: '做一个完整的用户研究项目', tag: '用研' },
              { id: 's2-ds-folio', text: '整理一个设计作品集（至少3个项目）', tag: '输出' },
              { id: 's2-ds-real', text: '接一个真实设计需求（社团/朋友/比赛）', tag: '实战' }
            ]}
          ]},
          { id: 'ops', name: '运营 方向', icon: '📣', color: '#ED7B2F', semesters: [
            { label: '大二上学期 · 内容基本功', items: [
              { id: 's2-op-write', text: '每周至少写一篇内容（公众号/小红书/知乎）', tag: '内容' },
              { id: 's2-op-tool', text: '学会用 Excel/飞书表格分析数据', tag: '数据' },
              { id: 's2-op-platform', text: '深度使用至少2个主流内容平台', tag: '网感' },
              { id: 's2-op-follow', text: '拆解3个你喜欢的账号运营策略', tag: '分析' }
            ]},
            { label: '大二下学期 · 数据+活动', items: [
              { id: 's2-op-event', text: '策划并执行一个完整的小活动', tag: '策划' },
              { id: 's2-op-data2', text: '用数据复盘一次运营动作（曝光→转化→留存）', tag: '数据' },
              { id: 's2-op-case', text: '建一个运营案例库（收集至少20个案例）', tag: '积累' },
              { id: 's2-op-sql', text: '学会写简单 SQL 查数据', tag: '硬技能' }
            ]}
          ]},
          { id: 'legal', name: '法学 方向', icon: '⚖️', color: '#9B59B6', semesters: [
            { label: '大二上学期 · 法律基础', items: [
              { id: 's2-law-exam', text: '开始准备法考（可以分批过）', tag: '资质' },
              { id: 's2-law-data', text: '学《个人信息保护法》+ 数据安全相关法规', tag: '合规' },
              { id: 's2-law-tech', text: '了解互联网技术基础概念（API/数据库/AI）', tag: '跨界' },
              { id: 's2-law-case', text: '读3个互联网公司合规案例', tag: '案例' }
            ]},
            { label: '大二下学期 · 实务入门', items: [
              { id: 's2-law-internet', text: '系统学习互联网法律框架', tag: '专业' },
              { id: 's2-law-project', text: '参与一个合规项目（帮社团/创业团队审合同）', tag: '实践' },
              { id: 's2-law-output', text: '写一篇互联网法律分析文章', tag: '输出' },
              { id: 's2-law-network', text: '联系一位互联网法务从业者做访谈', tag: '人脉' }
            ]}
          ]}
        ], checklistKey: 'sophomore_skilltree' } },
        { icon: '🎬', title: '鹅厂学长学姐的一天', content: '看看真实鹅厂人的一天是怎么过的——比你想象的更有趣', visualData: { type: 'html', html: `<div class="so-day-grid">
          <div class="so-day-card">
            <div class="so-day-head"><span class="so-day-avatar">👩‍💻</span><div class="so-day-meta"><span class="so-day-role">产品经理学姐</span><span class="so-day-dept">WXG · 广州</span></div></div>
            <div class="so-day-timeline">
              <div class="so-day-tl-item"><span class="so-day-time">9:30</span><span>看昨晚数据报表，发现新功能点击率涨了20% 🔥</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">10:30</span><span>和开发、设计开站立晨会，对齐今天的优先级</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">14:00</span><span>用Figma画下一版需求的原型图</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">16:00</span><span>用户访谈：听三个用户吐槽我们的产品（很重要！）</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">19:00</span><span>写PRD文档，输出明天开发要评审的需求</span></div>
            </div>
            <div class="so-day-bonus">💬 "这个岗位最爽的是：你提的需求真的会被几百万人用到"</div>
          </div>
          <div class="so-day-card">
            <div class="so-day-head"><span class="so-day-avatar">👨‍💻</span><div class="so-day-meta"><span class="so-day-role">前端开发学长</span><span class="so-day-dept">PCG · 深圳</span></div></div>
            <div class="so-day-timeline">
              <div class="so-day-tl-item"><span class="so-day-time">10:00</span><span>到工位，冲杯咖啡 ☕，review 昨天的代码</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">11:00</span><span>写一个新组件的单元测试（TDD真的好用）</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">14:30</span><span>Code Review：帮同事看代码，发现一个性能坑</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">16:30</span><span>技术分享会：这周讲 React 19 新特性</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">20:00</span><span>写今天最后一个组件，然后去健身房 🏋️</span></div>
            </div>
            <div class="so-day-bonus">💬 "程序员不都是996，腾讯大部分团队节奏挺健康的"</div>
          </div>
          <div class="so-day-card">
            <div class="so-day-head"><span class="so-day-avatar">👩‍🎨</span><div class="so-day-meta"><span class="so-day-role">UI设计师学姐</span><span class="so-day-dept">IEG · 深圳</span></div></div>
            <div class="so-day-timeline">
              <div class="so-day-tl-item"><span class="so-day-time">9:30</span><span>浏览 Dribbble/Pinterest 找灵感 🎨</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">10:30</span><span>画新活动的页面视觉稿（Figma真好用）</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">14:00</span><span>和PM+前端三方评审：设计能不能落地？</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">16:00</span><span>做用户可用性测试，看新设计的操作路径是否流畅</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">18:00</span><span>整理设计规范文档，同步给团队</span></div>
            </div>
            <div class="so-day-bonus">💬 "设计和产品逻辑深度融合，不是单纯'把东西画好看'"</div>
          </div>
          <div class="so-day-card">
            <div class="so-day-head"><span class="so-day-avatar">👨‍💼</span><div class="so-day-meta"><span class="so-day-role">运营学长</span><span class="so-day-dept">CDG · 深圳</span></div></div>
            <div class="so-day-timeline">
              <div class="so-day-tl-item"><span class="so-day-time">9:00</span><span>看数据看板：昨天活动的 UV/PV/转化率 📊</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">10:00</span><span>写活动复盘文档：哪些渠道效果好？为什么？</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">14:00</span><span>策划下个月的用户增长活动方案</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">16:30</span><span>和设计、开发拉会：“这个活动页能不能三天出？”</span></div>
              <div class="so-day-tl-item"><span class="so-day-time">19:00</span><span>刷竞品动态，看看别的团队最近在做什么</span></div>
            </div>
            <div class="so-day-bonus">💬 "运营最酷的是：你的一个idea可能影响百万用户的行为"</div>
          </div>
        </div>` } },
        { icon: '📚', title: '大二升大三暑假·黄金窗口', content: '用好这两个月，大三开学你就领先了大部分人', visualData: { type: 'html', html: `<div class="so-summer">
          <div class="so-summer-intro">大二暑假是你大学四年里<b>最重要的一个暑假</b>——没有之一。用好这两个月，你在大三开学时就比别人多了实实在在的项目经历。</div>
          <div class="so-summer-month">
            <div class="so-sm-head m7">📅 7月 · 技能冲刺月</div>
            <div class="so-sm-body">
              <div class="so-sm-item"><span class="so-sm-emoji">💻</span><span><b>技术方向：</b>集中学一个框架（React/Vue/Spring Boot），写一个完整的个人项目</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">📱</span><span><b>产品方向：</b>做一份完整的产品分析报告（选3个竞品深度拆解）</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">🎨</span><span><b>设计方向：</b>用Figma做一套完整App界面 redesign 作品集</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">📣</span><span><b>运营方向：</b>开一个公众号/小红书，坚持日更30天</span></div>
            </div>
          </div>
          <div class="so-summer-month">
            <div class="so-sm-head m8">📅 8月 · 实战积累月</div>
            <div class="so-sm-body">
              <div class="so-sm-item"><span class="so-sm-emoji">🗂️</span><span>把7月做的东西整理成<b>简历上的项目经历</b>（用STAR法则写）</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">🔗</span><span>技术同学把代码推到 <b>GitHub</b>，设计同学发到 <b>站酷/Behance</b></span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">📖</span><span>开始看面经——牛客网/知乎搜"腾讯校招面经"，了解面试考什么</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">🧹</span><span>如果还没找到实习，<b>去小厂也行</b>——经历本身比公司牌子重要</span></div>
            </div>
            <div class="so-sm-footer">💡 哪怕是做了一个简单的个人网站或公众号，也比"暑假什么也没做"好一百倍。</div>
          </div>
          <div class="so-summer-month">
            <div class="so-sm-head m9">📅 9月 · 开学准备月</div>
            <div class="so-sm-body">
              <div class="so-sm-item"><span class="so-sm-emoji">📝</span><span>更新简历，把暑期项目/实习经历写进简历</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">🎯</span><span>明确大三投递方向——针对性地补足技能差距</span></div>
              <div class="so-sm-item"><span class="so-sm-emoji">📨</span><span>关注腾讯日常实习岗位，有合适的立刻投，别等"完全准备好"</span></div>
            </div>
            <div class="so-sm-footer">🚀 大三开学后，你的目标只有一个：<b>拿到一份暑期实习offer</b></div>
          </div>
        </div>` } }
      ]
    },
    {
      grade: 'junior',
      icon: '🌳',
      name: '大三·实习准备期',
      summary: '拿下实习，赢在校招起跑线',
      phase: '实习准备期',
      items: [
        { icon: '🏕️', title: '实习攻略', link: 'https://join.qq.com', visualData: { type: 'role-detail-cards', labels: { day: '📋 核心内容', skills: '🏷️ 关键要点', fit: '👥 适用人群', detail: '🔍 深度解析' }, roles: [
          { emoji: '💡', name: '实习到底有多重要？', color: '#0052D9', oneliner: '腾讯实习转正率约50%-70%', day: '大三有一段腾讯实习，校招简历通过率至少翻倍。实习转正比秋招直接面容易得多，拿到转正offer等于提前锁定大厂入场券。', skills: '转正率50-70% · 校招通过率翻倍 · 提前锁定offer', fit: '所有方向的同学都适用的黄金机会', quote: '校招简历上最能拉开差距的，就是有没有一段大厂实习经历', detail: '腾讯的实习生在秋招中简历通过率远高于无实习经历的候选人。实习转正答辩通过的，大多能直接拿到留用offer，无需再走秋招流程。' },
          { emoji: '☀️', name: '实习有哪几种类型？', color: '#00A870', oneliner: '暑期/日常/远程，各有优势', day: '<b>☀️ 暑期实习</b>（3-5月申请，7-8月到岗）：含金量最高，有转正机会<br><b>📆 日常实习</b>（全年滚动，2-3个月）：门槛相对低，适合积累经历<br><b>🏠 远程实习</b>（少数岗位）：灵活，但含金量看团队', skills: '暑期实习 · 日常实习 · 远程实习', fit: '大三优先冲刺暑期实习，日常实习可做保底', quote: '暑期实习转正率最高，是进入大厂的最佳路径', detail: '暑期实习面试流程完整，和校招流程高度相似，是练兵的最佳机会。日常实习面试相对简单，适合大二升大三或大三上学期积累经验。' },
          { emoji: '🎯', name: '简历筛选的潜规则', color: '#E37318', oneliner: '匹配度远大于学校名气', day: '<b>🏅 有相关项目经历</b> > 有大厂实习 > 有社团经历 > 啥都没有<br><b>🎯 技能和岗位匹配度</b> > 学校名气<br><b>⚡ 不要等到「准备好了再投」</b>，先投才有机会', skills: '项目经历 · 技能匹配 · 先投再说', fit: 'HR平均看6秒，信息密度决定命运', quote: '你永远等不到「完全准备好」的那天，投了才有机会被看到', detail: '大厂筛选简历时，相关项目经历的权重最高。哪怕是一个完整的课堂项目或课程设计，也比空白简历好得多。' },
          { emoji: '🧭', name: '实习能学到什么？', color: '#8B5CF6', oneliner: '比知识更重要的是方向', day: '<b>🔧 知道产品/功能从0到1怎么做</b> — 真实的项目经验<br><b>⚡ 体验互联网工作节奏</b> — 学会协作与沟通<br><b>📝 积累真实面试案例</b> — 每个经历都能讲出故事<br><b>🧭 确定自己喜不喜欢这个方向</b> — 最重要的事', skills: '0到1经验 · 真实节奏 · 实战案例 · 方向确认', fit: '实习是试错成本最低的职业探索方式', quote: '一个暑假的实习，比听一百场职业规划讲座都有用', detail: '很多同学通过实习才发现自己并不适合某个岗位，这本身就是巨大的收获。越早知道自己不喜欢什么，就越早能找到真正喜欢的方向。' }
        ] } },
        { icon: '📝', title: '简历写作指南', visualData: { type: 'html', html: '<div class="jr-section-label">1. 腾讯喜欢什么样的简历？</div><div class="jr-pref-grid"><div class="jr-pref-card"><div class="jr-pref-card-title">📄 一页纸原则</div><div class="jr-pref-card-desc">HR只看6秒，信息密度 > 长度</div></div><div class="jr-pref-card c2"><div class="jr-pref-card-title">⭐ STAR法则</div><div class="jr-pref-card-desc">情境 › 任务 › 行动 › 结果</div></div><div class="jr-pref-card c3"><div class="jr-pref-card-title">📊 数字说话</div><div class="jr-pref-card-desc">「提升30%」> 「大幅提升」</div></div><div class="jr-pref-card c4"><div class="jr-pref-card-title">🎨 排版清爽</div><div class="jr-pref-card-desc">不用花哨模板，内容为王</div></div></div><div class="jr-section-label">2. 最容易踩的5个坑</div><div class="jr-trap-list"><div class="jr-trap-item"><span class="jr-trap-emoji">❌</span><span>写「熟练掌握」面试一问就卡壳</span><span class="jr-trap-arrow">▶</span><span>改成「用过，能做基础XX」</span></div><div class="jr-trap-item"><span class="jr-trap-emoji">❌</span><span>经历写太像流水账</span><span class="jr-trap-arrow">▶</span><span>改用 STAR + 数字</span></div><div class="jr-trap-item"><span class="jr-trap-emoji">❌</span><span>所有岗位同一份简历</span><span class="jr-trap-arrow">▶</span><span>每投一个岗微调一次</span></div><div class="jr-trap-item"><span class="jr-trap-emoji">❌</span><span>联系方式放错或漏了</span><span class="jr-trap-arrow">▶</span><span>检查三遍再投</span></div><div class="jr-trap-item"><span class="jr-trap-emoji">❌</span><span>简历超过一页纸</span><span class="jr-trap-arrow">▶</span><span>删到一页，精简再精简</span></div></div><div class="jr-section-label">3. 不同方向简历侧重点</div><div class="jr-dir-grid"><div class="jr-dir-card"><div class="jr-dir-role">💻 技术岗</div><div class="jr-dir-chain"><b>项目经历</b> > 实习经历 > 竞赛 > 成绩</div></div><div class="jr-dir-card d2"><div class="jr-dir-role">📱 产品岗</div><div class="jr-dir-chain"><b>项目经历</b> > 实习经历 > 分析作品 > 社团</div></div><div class="jr-dir-card d3"><div class="jr-dir-role">📣 运营岗</div><div class="jr-dir-chain"><b>作品案例</b> > 实习 > 数据成果 > 社团</div></div><div class="jr-dir-card d4"><div class="jr-dir-role">🎨 设计岗</div><div class="jr-dir-chain"><b>作品集</b> > 实习 > 设计比赛 > 工具技能</div></div></div>' } },
        { icon: '🎤', title: '面试指南', visualData: { type: 'role-detail-cards', labels: { day: '📋 核心内容', skills: '🏷️ 关键提炼', fit: '💡 核心理念', detail: '📖 深度解读' }, roles: [
          { emoji: '🏢', name: '腾讯面试有几轮？', color: '#0052D9', oneliner: '技术3-4轮，非技术4轮', day: '<b>💻 技术岗</b>：技术面1-2轮 › 组长面 › 总监面 › HR面<br><b>📋 非技术岗</b>：群面 › 专业面 › 组长面 › HR面<br><b>⏱️ 每轮30-60分钟</b>，面试节奏比较快', skills: '技术面 · 组长面 · 总监面 · HR面', fit: '提前了解流程可以大幅减少面试中的紧张感', quote: '了解面试流程 = 减少一半的紧张感', detail: '技术岗的面试轮次可能因团队而异，部分团队会在技术面中加入手写代码环节。HR面主要考察价值观和稳定性，也会谈薪资期望。' },
          { emoji: '🔍', name: '腾讯面试风格', color: '#E37318', oneliner: '追问，追问，还是追问', day: '你说会LRU › 追问<b>LFU呢？</b><br>你说懂TCP › 追问<b>TIME_WAIT为什么等2MSL？</b><br>你说做过项目 › 追问<b>「你当时为什么这么设计？」</b>', skills: '深度追问 · 边界探测 · 设计思辨', fit: '面试官不是在考你知道什么，是在考你「哪里不知道」', quote: '每个知识点备到能回答3层追问，才算真正吃透', detail: '腾讯面试官的风格是「深挖到底」，直到触及你的知识边界。这不是刁难，而是评估你的学习深度和思考能力。遇到不会的坦诚说不会，比瞎编好得多。' },
          { emoji: '👥', name: '群面怎么过（非技术）', color: '#00A870', oneliner: '推进讨论的人容易过关', day: '<b>🗣️ 不是说得最多的人过</b>，是推进讨论的人过<br><b>📐 上来先定框架</b>：「我们先明确目标用户，再分析需求...」<br><b>🤝 学会建设性补充</b>：「我同意XX的观点，补充一点...」<br><b>🚫 别抢话</b>，别固执己见', skills: '框架先行 · 建设性补充 · 谦虚协作', fit: '群面考察的是团队协作能力，不是个人英雄主义', quote: '面试官看重的是：你能不能帮团队更好地完成讨论', detail: '群面通常6-10人一组，40分钟讨论+展示。关键是快速建立一个讨论框架，然后在框架内贡献有价值的观点。抢话和固执己见是最常见的淘汰原因。' },
          { emoji: '❓', name: '必问题提前准备', color: '#8B5CF6', oneliner: '4个高频题，提前备好答案', day: '<b>1️⃣ 「为什么想加入腾讯？」</b><br><b>2️⃣ 「你最大的缺点是什么？」</b><br><b>3️⃣ 「分享一个你遇到困难并解决它的经历」</b><br><b>4️⃣ 「你对我们产品有什么建议？」</b>', skills: '动机匹配 · 自我认知 · 解决问题 · 产品思维', fit: '每个问题准备2-3个版本，别临场编', quote: '提前准备不是背答案，而是梳理自己的真实经历和思考', detail: '这些问题几乎每轮面试都会出现。关键在于梳理好自己的经历和思考，回答真实、有深度。说「没有缺点」反而是最大的缺点——说明缺乏自我认知。' },
          { emoji: '📋', name: '面试当天注意事项', color: '#9B59B6', oneliner: '4件小事拉开差距', day: '<b>⏰ 提前10分钟</b>进入面试间/到达<br><b>📝 带好纸笔</b>，用来记关键问题<br><b>❓ 反问1-2个问题</b>，展示你的思考深度<br><b>✉️ 发一封感谢邮件</b>，加分项不是必须', skills: '提前到达 · 笔记习惯 · 反问环节 · 感谢邮件', fit: '细节决定成败，这些小动作往往影响最终结果', detail: '反问环节是展示思考深度的好机会。可以问「团队目前在攻克什么难题」「新人入职培养机制是怎样的」，而不是问「我面试表现如何」这种让人尴尬的问题。' }
        ] } },
        { icon: '📅', title: '实习时间线', visualData: { type: 'html', html: `
            <div class="junior-timeline-phase">
              <div class="junior-tl-title">📚 大三上学期（9月-1月）</div>
              <div class="junior-tl-item">▸ <b>9月</b>：确定目标方向（产品/技术/运营/设计/法务？）</div>
              <div class="junior-tl-item">▸ <b>10月</b>：更新简历，用一路有鹅的简历功能写一版</div>
              <div class="junior-tl-item">▸ <b>11月</b>：开始刷题（技术）/ 准备作品集（设计）/ 分析竞品（产品）</div>
              <div class="junior-tl-item">▸ <b>12月</b>：关注腾讯日常实习岗位，尝试投递</div>
              <div class="junior-tl-item">▸ <b>1月</b>：寒假找一段实习/项目（小厂也行，积累经历）</div>
            </div>

            <div class="junior-timeline-phase highlight">
              <div class="junior-tl-title">⭐ 大三下学期（2月-6月）· 黄金期</div>
              <div class="junior-tl-item">▸ <b>2月</b>：腾讯暑期实习网申开始，立刻投！</div>
              <div class="junior-tl-item">▸ <b>3月</b>：笔试准备（腾讯自研题库，刷面经）</div>
              <div class="junior-tl-item">▸ <b>4月</b>：面试密集期，每周练习1-2次模拟面试</div>
              <div class="junior-tl-item">▸ <b>5月</b>：如果还没offer，继续投日常实习/其他公司实习</div>
              <div class="junior-tl-item">▸ <b>6月</b>：拿到实习offer的话，准备入职</div>
            </div>

            <div class="junior-timeline-phase highlight2">
              <div class="junior-tl-title">🔥 大三暑假（7月-8月）· 最关键的两个月</div>
              <div class="junior-tl-item">▸ <b>在腾讯实习</b>：认真干活+多和同事交流+争取转正</div>
              <div class="junior-tl-item">▸ <b>没去成腾讯</b>：去其他公司实习也一样，经历最重要</div>
              <div class="junior-tl-item">▸ <b>无论在哪</b>：记录每天做了什么（为之后写简历攒素材）</div>
            </div>

            <div class="junior-timeline-phase">
              <div class="junior-tl-title">🏁 大四上学期（9月-12月）</div>
              <div class="junior-tl-item">▸ <b>9月</b>：腾讯秋招开始（实习转正的等结果，没转正的再投）</div>
              <div class="junior-tl-item">▸ <b>10月-11月</b>：秋招面试期</div>
              <div class="junior-tl-item">▸ <b>12月</b>：offer陆续发放</div>
            </div>
        ` } },
        { icon: '🔗', title: '腾讯实习生培养体系', content: '了解腾讯实习生的成长路径和支持资源', visualData: { type: 'html', html: `<div class="jr-culture-grid">
          <div class="jr-culture-card"><span class="jr-culture-emoji">🧑‍🏫</span><div class="jr-culture-name">导师制</div><div class="jr-culture-desc">每个实习生都有专属导师，1对1指导技术和业务</div><span class="jr-culture-hl">1对1带教</span></div>
          <div class="jr-culture-card"><span class="jr-culture-emoji">📚</span><div class="jr-culture-name">鹅厂课堂</div><div class="jr-culture-desc">内部学习平台，涵盖技术、产品、设计全方向课程</div><span class="jr-culture-hl">海量课程</span></div>
          <div class="jr-culture-card"><span class="jr-culture-emoji">🏗️</span><div class="jr-culture-name">实战项目</div><div class="jr-culture-desc">实习生直接参与真实业务项目，不是"打杂"</div><span class="jr-culture-hl">真实项目</span></div>
          <div class="jr-culture-card"><span class="jr-culture-emoji">🎤</span><div class="jr-culture-name">转正答辩</div><div class="jr-culture-desc">实习结束时做述职答辩，展示你的成长和贡献</div><span class="jr-culture-hl">转正率50-70%</span></div>
          <div class="jr-culture-card"><span class="jr-culture-emoji">🤝</span><div class="jr-culture-name">社区融入</div><div class="jr-culture-desc">实习生社群活动、团建、技术分享会，快速建立人脉</div><span class="jr-culture-hl">人脉积累</span></div>
          <div class="jr-culture-card"><span class="jr-culture-emoji">🎓</span><div class="jr-culture-name">提前批通道</div><div class="jr-culture-desc">优秀实习生可走绿色通道，提前锁定校招offer</div><span class="jr-culture-hl">提前锁定</span></div>
        </div>` } },
        { icon: '📊', title: '校招漏斗：从投递到Offer', content: '用数据看清校招每一步的淘汰率，知己知彼', visualData: { type: 'html', html: `<div class="jr-funnel">
          <div class="jr-funnel-intro">腾讯校招竞争有多激烈？用漏斗模型看每一步的通过率——<b>数据不是让你焦虑，而是让你了解全貌后更有策略地准备。</b></div>
          <div class="jr-fn-stage"><div class="jr-fn-bar s1"><span class="jr-fn-num">~10万</span><span class="jr-fn-label">网申投递</span><span class="jr-fn-rate">100%</span></div></div>
          <div class="jr-fn-stage"><div class="jr-fn-bar s2"><span class="jr-fn-num">~3万</span><span class="jr-fn-label">通过简历筛选</span><span class="jr-fn-rate">约30%</span></div></div>
          <div class="jr-fn-stage"><div class="jr-fn-bar s3"><span class="jr-fn-num">~6000</span><span class="jr-fn-label">通过笔试</span><span class="jr-fn-rate">约20%</span></div></div>
          <div class="jr-fn-stage"><div class="jr-fn-bar s4"><span class="jr-fn-num">~2000</span><span class="jr-fn-label">通过面试</span><span class="jr-fn-rate">约33%</span></div></div>
          <div class="jr-fn-stage"><div class="jr-fn-bar s5"><span class="jr-fn-num">~3000</span><span class="jr-fn-label">最终Offer</span><span class="jr-fn-rate">~3%</span></div></div>
        </div>
        <div class="jr-funnel-note">💡 <b>关键启示：</b>简历筛选和笔试是淘汰率最高的两关。一份好的简历 + 充分准备笔试，你就已经超过了约 <b>80%</b> 的竞争者。<br>数据为估算值，实际每年有浮动。重要的是看清「每个环节都能准备」这个事实。</div>` } }
      ]
    },
    {
      grade: 'senior',
      icon: '🚀',
      name: '大四·求职冲刺期',
      summary: '拿下offer',
      phase: '求职冲刺期',
      items: [
        { icon: '🗺️', title: '校招流程全解析', link: 'https://join.qq.com', visualData: { type: 'html', html: `
          <div class="sr-timeline-bar">
            <div class="sr-tl-node n1"><div class="sr-tl-month">8月</div><div class="sr-tl-label">网申开启</div><div class="sr-tl-sub">投递简历</div></div>
            <div class="sr-tl-node n2"><div class="sr-tl-month">9月</div><div class="sr-tl-label">在线笔试</div><div class="sr-tl-sub">自研题库</div></div>
            <div class="sr-tl-node n3"><div class="sr-tl-month">10-11月</div><div class="sr-tl-label">面试阶段</div><div class="sr-tl-sub">2-4轮面试</div></div>
            <div class="sr-tl-node n4"><div class="sr-tl-month">12-1月</div><div class="sr-tl-label">Offer发放</div><div class="sr-tl-sub">陆续发放</div></div>
          </div>
          <div class="sr-phase-note"><b>⏱️ 面试轮次拆解：</b>技术面1-2轮 → 组长面 → 总监面 → HR面。每轮间隔一般1-2周，视频面试为主（腾讯会议）。</div>
          <div class="sr-section-label">② 网申阶段（8月）</div>
          <div class="sr-timeline-detail">
            <div class="sr-phase-card c2">
              <div class="sr-phase-title">📮 投递渠道</div>
              <div class="sr-phase-item">官网投递：<b>join.qq.com</b></div>
              <div class="sr-phase-item">可以同时投1-2个岗位，部分事业群可填调剂意向</div>
            </div>
            <div class="sr-phase-card c2">
              <div class="sr-phase-title">💡 关键提醒</div>
              <div class="sr-phase-item"><b>内推有没有用？</b>有用——简历会被优先看到，但不是「直接进面试」</div>
              <div class="sr-phase-item"><b>什么时候投最好？</b>越早越好，不是「等准备好了再投」</div>
            </div>
          </div>
          <div class="sr-section-label">③ 笔试阶段（9月）</div>
          <div class="sr-timeline-detail">
            <div class="sr-phase-card c3">
              <div class="sr-phase-title">📝 题型分布</div>
              <div class="sr-phase-item">选择题：<b>计算机基础 + 行测</b></div>
              <div class="sr-phase-item">编程题：<b>2-4道，Medium难度</b></div>
              <div class="sr-phase-item">考试时长：<b>约2小时</b></div>
            </div>
            <div class="sr-phase-card c3">
              <div class="sr-phase-title">📊 关键数据</div>
              <div class="sr-phase-item">腾讯自研题库，不是LeetCode原题，但思路高度相似</div>
              <div class="sr-phase-item">通过率约<b>30%-40%</b>（100人投，笔试过30-40人）</div>
            </div>
          </div>
          <div class="sr-section-label">④ 面试阶段（10-11月）</div>
          <div class="sr-timeline-detail">
            <div class="sr-phase-card c4">
              <div class="sr-phase-title">⏰ 时间节奏</div>
              <div class="sr-phase-item">每轮间隔一般<b>1-2周</b></div>
              <div class="sr-phase-item">面完快的话<b>当天出结果</b>，慢的话1-2周</div>
              <div class="sr-phase-item">挂了一般不主动通知，<b>超2周没消息可默认挂了</b></div>
            </div>
            <div class="sr-phase-card c4">
              <div class="sr-phase-title">🎯 面试形式</div>
              <div class="sr-phase-item">视频面试为主（<b>腾讯会议</b>）</div>
              <div class="sr-phase-item">技术面会有<b>手写代码环节</b>（共享屏幕）</div>
              <div class="sr-phase-item">HR面主要考察<b>价值观 + 稳定性</b></div>
            </div>
          </div>
          <div class="sr-section-label">⑤ Offer阶段（12月-1月）</div>
          <div class="sr-timeline-detail full">
            <div class="sr-phase-card c5">
              <div class="sr-phase-title">📋 拿到Offer后</div>
              <div class="sr-phase-item">校招薪资是<b>标准化</b>的，基本没有argue空间</div>
              <div class="sr-phase-item">接了offer不建议毁约，但确实有同学这样做</div>
              <div class="sr-phase-item">入职时间一般是在<b>毕业后的7月统一入职</b></div>
            </div>
          </div>
        ` } },
        { icon: '📝', title: '面经汇总', visualData: { type: 'html', html: `
          <div class="sr-iv-grid">
            <div class="sr-iv-cat t1">
              <div class="sr-iv-cat-head">💻 技术岗高频题</div>
              <div class="sr-iv-q"><b>手撕LRU缓存</b>（出现频次最高的题）<br><span class="sr-iv-point">考察点</span>哈希表+双向链表，O(1)操作<br><span class="sr-iv-point">追问</span>LFU怎么实现？线程安全版本？</div>
              <div class="sr-iv-q"><b>反转链表 / 合并有序链表</b></div>
              <div class="sr-iv-q"><b>手撕快排 / 堆排 / 归并</b></div>
              <div class="sr-iv-q"><b>TCP三次握手为什么不是两次</b><br><span class="sr-iv-point">考察点</span>对网络协议本质的理解</div>
              <div class="sr-iv-q"><b>epoll的底层实现</b><br><span class="sr-iv-point">考察点</span>红黑树+就绪链表，I/O多路复用</div>
            </div>
            <div class="sr-iv-cat t2">
              <div class="sr-iv-cat-head">📱 产品岗高频题</div>
              <div class="sr-iv-q"><b>「分析一款你最喜欢的APP」</b><br><span class="sr-iv-point">考察点</span>产品思维+逻辑+表达<br><span class="sr-iv-point">框架</span>产品定位 → 目标用户 → 核心功能 → 优缺点 → 改进建议</div>
              <div class="sr-iv-q"><b>「估算北京有多少个加油站」</b><br><span class="sr-iv-point">考察点</span>费米估算，不看结果看思路</div>
              <div class="sr-iv-q"><b>「设计一个面向XX用户的产品」</b></div>
              <div class="sr-iv-q"><b>「如果你和开发意见不合怎么办」</b></div>
            </div>
            <div class="sr-iv-cat t3">
              <div class="sr-iv-cat-head">📊 运营岗高频题</div>
              <div class="sr-iv-q"><b>「如何为一个新产品做冷启动？」</b></div>
              <div class="sr-iv-q"><b>「分析一个你关注的热点事件」</b></div>
              <div class="sr-iv-q"><b>「如果数据下降了，你怎么排查原因？」</b></div>
            </div>
            <div class="sr-iv-cat t4">
              <div class="sr-iv-cat-head">🎨 设计岗高频题</div>
              <div class="sr-iv-q"><b>「重新设计微信的XX功能」</b></div>
              <div class="sr-iv-q"><b>「解释你作品集中最满意的一个项目」</b></div>
            </div>
            <div class="sr-iv-cat t5">
              <div class="sr-iv-cat-head">🌐 所有岗位通用题</div>
              <div class="sr-iv-q"><b>「为什么想加入腾讯？」</b><br><span class="sr-iv-point">框架</span>认同腾讯的产品/文化 + 我的能力匹配 + 我想在这里成长</div>
              <div class="sr-iv-q"><b>「你最大的缺点是什么？」</b><br><span class="sr-iv-point">原则</span>说真缺点 + 但已经意识到 + 正在改进中</div>
              <div class="sr-iv-q"><b>「用三个词形容自己」</b></div>
              <div class="sr-iv-q"><b>「你的职业规划是什么？」</b></div>
            </div>
          </div>
        ` } },
        { icon: '⚖️', title: 'Offer决策框架', visualData: { type: 'html', html: `
          <div class="sr-section-label">① 决策四维度打分法</div>
          <div class="sr-phase-note">给每个offer从以下四个维度打分（1-10分），<b>总分最高的选</b>。这是一套被验证有效的理性决策方法。</div>
          <div class="sr-score-grid">
            <div class="sr-score-dim d1"><div class="sr-score-icon">🏢</div><div class="sr-score-name">平台</div><div class="sr-score-pct">权重 30%</div><div class="sr-score-desc">公司大小 / 行业地位 / 品牌背书</div></div>
            <div class="sr-score-dim d2"><div class="sr-score-icon">📈</div><div class="sr-score-name">业务</div><div class="sr-score-pct">权重 30%</div><div class="sr-score-desc">是不是核心部门 / 赛道有没有前景</div></div>
            <div class="sr-score-dim d3"><div class="sr-score-icon">🌱</div><div class="sr-score-name">成长</div><div class="sr-score-pct">权重 25%</div><div class="sr-score-desc">能学到什么 / 有没有好导师 / 晋升路径</div></div>
            <div class="sr-score-dim d4"><div class="sr-score-icon">💰</div><div class="sr-score-name">薪资+生活</div><div class="sr-score-pct">权重 15%</div><div class="sr-score-desc">薪资 / 福利 / 加班程度 / 城市生活成本</div></div>
          </div>
          <div class="sr-section-label">② 腾讯 vs 其他公司怎么选？</div>
          <div class="sr-compare-item"><b>阿里 vs 腾讯：</b>体量相当，看业务方向和团队氛围。阿里偏运营驱动，腾讯偏产品驱动。</div>
          <div class="sr-compare-item"><b>字节 vs 腾讯：</b>字节薪资通常更高但更卷，腾讯节奏相对慢一点，WLB更好。</div>
          <div class="sr-compare-item"><b>美团/拼多多 vs 腾讯：</b>前者成长快、业务锻炼狠，后者平台大、品牌背书强。</div>
          <div class="sr-compare-item"><b>一线 vs 二线：</b>第一份工建议去一线大厂，平台背书在职业生涯初期很重要。</div>
          <div class="sr-section-label">③ 常见决策误区</div>
          <div class="sr-trap-grid">
            <div class="sr-trap"><span class="sr-trap-sym">❌</span><span>只看薪资不谈成长<br><span class="sr-trap-correct">第一份工，成长比多拿几万重要</span></span></div>
            <div class="sr-trap"><span class="sr-trap-sym">❌</span><span>只看公司不看业务<br><span class="sr-trap-correct">核心部门和边缘部门，两年后差距巨大</span></span></div>
            <div class="sr-trap"><span class="sr-trap-sym">❌</span><span>被「大厂光环」带着走<br><span class="sr-trap-correct">适合别人的不一定适合你</span></span></div>
            <div class="sr-trap"><span class="sr-trap-sym">❌</span><span>不好意思拒绝offer<br><span class="sr-trap-correct">坦诚沟通，这是你的权利</span></span></div>
          </div>
          <div class="sr-section-label">④ 接了offer之后要做什么？</div>
          <div class="sr-checklist">
            <div class="sr-chk-item"><span class="sr-chk-dot">✓</span>确认入职时间和流程，不要错过关键节点</div>
            <div class="sr-chk-item"><span class="sr-chk-dot">✓</span>了解团队和技术栈，提前做功课减少入职焦虑</div>
            <div class="sr-chk-item"><span class="sr-chk-dot">✓</span>租房/搬家（如果异地），提前踩点通勤路线</div>
            <div class="sr-chk-item"><span class="sr-chk-dot">✓</span>好好享受毕业前的最后一段时间 🎓</div>
          </div>
        ` } },
        { icon: '💙', title: '焦虑疏导 & 心态建设', visualData: { type: 'html', html: `
          <div class="sr-mindset-card m1">
            <div class="sr-md-head">🧘 你焦虑是因为你把它看得太重了</div>
            <div class="sr-md-body">第一份工作很重要，但它<b>不会决定你的一生</b>。你身边那个拿了腾讯offer的人，三年后可能跳槽了；那个没拿到的人，三年后可能创业成功了。<b>人生很长，第一份工只是起点，不是终点。</b></div>
          </div>
          <div class="sr-mindset-card m2">
            <div class="sr-md-head">📱 「别人都拿到了，我还没拿到」怎么办？</div>
            <div class="sr-md-body">社交媒体上你只看到别人拿offer的喜报，没看到他们被挂的沉默。腾讯校招录取率约 <span class="sr-md-stat">0.25%</span>——10000个人投，25个能拿到。<b>没拿到不代表你不行，只是竞争太激烈了。</b></div>
          </div>
          <div class="sr-mindset-card m3">
            <div class="sr-md-head">📋 「我实习经历少，是不是没戏了？」</div>
            <div class="sr-md-body">面试官看的不是你「有多少段实习」，而是<b>「你从每段经历中学到了什么」</b>。哪怕只有一段实习，能用STAR法则讲清楚、写出了数字成果，比写了三段经历但每段都说不清楚的人强得多。</div>
          </div>
          <div class="sr-mindset-card m4">
            <div class="sr-md-head">🔄 面试挂了怎么办？</div>
            <div class="sr-md-body">挂了不等于你不适合腾讯，可能只是这个岗位不适合你，甚至可能只是面试官和你的气场不合。你可以：<b>复盘面试 → 补短板 → 投其他公司 → 来年再战。</b>很多鹅厂人是面了两次才进来的。</div>
          </div>
          <div class="sr-mindset-card m5">
            <div class="sr-md-head">🐧 一句话送给你</div>
            <div class="sr-md-ending">你已经走到大四了，你比三年前的大一新生强了不知道多少倍。<br>不管结果如何，这一路走来——<b>你的企鹅都看在眼里。</b><br>它从一开始的一颗蛋，变成了现在这只独一无二的鹅。<br>你早就不是当初那个什么都不知道的人了。<br><br>✨ <b>毕业快乐。未来见。</b> 🐧</div>
          </div>
        ` } }
      ]
    }
  ],

  /** 渲染年级直达独立页面（四卡片列表 + 可展开详情） */
  renderGradePage() {
    const container = document.getElementById('grade-content-area');
    if (!container) return;

    const currentGrade = this.userConfig.grade || 'freshman';

    container.innerHTML = `
      <div class="grade-page-intro">
        <div class="grade-page-intro-icon">🎓</div>
        <div class="grade-page-intro-text">选择你的年级，查看专属成长指南</div>
      </div>
      <div class="grade-page-cards">
        ${this.GRADE_CARDS.map(card => {
          const isCurrent = card.grade === currentGrade;
          const cardClass = isCurrent ? 'current' : 'dimmed';
          const tagText = isCurrent ? '📍 当前年级' : {
            freshman: '大一', sophomore: '大二', junior: '大三', senior: '大四'
          }[card.grade];
          return `
            <div class="grade-page-card ${cardClass}"
                 data-grade="${card.grade}"
                 onclick="App.openGradeDetail('${card.grade}')">
              <div class="gpc-top">
                <span class="gpc-icon">${card.icon}</span>
                <span class="gpc-tag">${tagText}</span>
              </div>
              <div class="gpc-title">${card.name}</div>
              <div class="gpc-desc">${card.summary}</div>
              <div class="gpc-arrow-row">
                <span class="gpc-phase">${card.phase}</span>
                <span class="gpc-go">查看详情 →</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // 更新进度条显示
    setTimeout(() => this._updateGradeCardProgress(), 100);
  },

  /** 打开年级详情（跳转到独立详情子页面） */
  openGradeDetail(grade) {
    const card = this.GRADE_CARDS.find(c => c.grade === grade);
    if (!card) return;

    // 强制关闭聊天覆盖层，防止聊天界面泄漏到年级详情页
    UI.closeChatOverlay();

    // 更新详情页标题
    const titleEl = document.getElementById('grade-detail-title');
    if (titleEl) titleEl.textContent = `🎓 ${card.name}`;

    // 渲染详情到独立的详情子页面
    const detailArea = document.getElementById('grade-detail-content-area');
    if (!detailArea) return;

    // 获取进度数据（用于判断已读 / 注入兴趣卡片）
    const progress = this._getGradeProgress(grade);

    detailArea.innerHTML = `
      <div class="grade-detail-intro">
        <span class="grade-detail-emoji">${card.icon}</span>
        <div class="grade-detail-name">${card.name}</div>
        <div class="grade-detail-phase">📌 ${card.phase}</div>
        <div class="grade-detail-summary">${card.summary}</div>
      </div>
      <div class="grade-collapse-list">
        ${card.items.map((item, idx) => {
          const isRead = !!progress.readItems[idx];
          const readClass = isRead ? ' read' : '';
          const readDotHtml = isRead ? '<span class="gch-read-dot"></span>' : '';

          return `
          <div class="grade-collapse-card${item.visualData ? ' has-visual' : ''}${readClass}" data-collapse-id="${idx}">
            <div class="grade-collapse-header" onclick="App.toggleCollapse(this)">
              <span class="gch-icon">${item.icon}</span>
              <span class="gch-title">${item.title}</span>
              ${readDotHtml}
              <span class="gch-arrow">▼</span>
            </div>
            <div class="grade-collapse-body">
              <div class="grade-collapse-body-inner${item.visualData ? ' has-visual' : ''}">
                ${item.visualData ? this._renderVisualContent(item) : item.content.split('\n').map(line => {
                  const trimmed = line.trim();
                  if (!trimmed) return '<br>';
                  if (/^━{3,}/.test(trimmed)) {
                    return `<div class="gcb-section-title">${trimmed}</div>`;
                  }
                  const numberedMatch = trimmed.match(/^([①②③④⑤⑥⑦⑧⑨⑩]|\d+[.)])\s*/);
                  if (numberedMatch) {
                    const bullet = numberedMatch[1];
                    const rest = trimmed.slice(numberedMatch[0].length);
                    return `<div class="gcb-item"><span class="gcb-bullet">${bullet}</span><span>${rest}</span></div>`;
                  }
                  const emojiMatch = trimmed.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji}[\u{200d}\uFE0F}]?)(?=\S)/u);
                  if (emojiMatch) {
                    const bullet = emojiMatch[1];
                    const rest = trimmed.slice(bullet.length);
                    return `<div class="gcb-item"><span class="gcb-bullet">${bullet}</span><span>${rest}</span></div>`;
                  }
                  return `<div class="gcb-item"><span class="gcb-bullet">•</span><span>${trimmed}</span></div>`;
                }).join('')}
                ${item.link ? `<div style="margin-top:10px;"><a href="${item.link}" target="_blank" rel="noopener">🔗 查看详情 →</a></div>` : ''}
              </div>
            </div>
          </div>
        `}).join('')}
      </div>
      ${this._renderInterestCard(grade)}
    `;

    // 打开年级详情子页面（覆盖在年级列表子页面上方）
    UI.elements.subGradeDetailPage.classList.add('active');
    // 滚动详情页到顶部
    detailArea.scrollTop = 0;
  },

  /** 折叠卡片切换 —— 含进度追踪 */
  toggleCollapse(header) {
    const card = header.closest('.grade-collapse-card');
    if (!card) return;
    const wasOpen = card.classList.contains('open');
    card.classList.toggle('open');
    const isNowOpen = card.classList.contains('open');

    // 展开时启动5秒计时器，标记已读
    if (!wasOpen && isNowOpen) {
      this._onCollapseOpen(card, header);
    }
  },

  // ============================================
  //  进度系统（L1 板块浏览 / L2 清单 / L3 全板块完成）
  // ============================================

  /** 初始化进度数据 */
  _initGradeProgress() {
    if (!this.userConfig._gradeProgress) {
      this.userConfig._gradeProgress = {};
    }
  },

  /** 获取某年级的进度数据 */
  _getGradeProgress(grade) {
    this._initGradeProgress();
    if (!this.userConfig._gradeProgress[grade]) {
      this.userConfig._gradeProgress[grade] = { readItems: {} };
    }
    return this.userConfig._gradeProgress[grade];
  },

  /** 保存进度数据 */
  _saveGradeProgress(grade, data) {
    this._initGradeProgress();
    this.userConfig._gradeProgress[grade] = data;
    this.saveData();
  },

  /** 展开卡片后的5秒计时回调 */
  _onCollapseOpen(card, header) {
    // 获取当前年级
    const detailPage = document.getElementById('sub-grade-detail-page');
    if (!detailPage || !detailPage.classList.contains('active')) return;

    // 从卡片上找到其年级和索引
    const collapseId = card.getAttribute('data-collapse-id');
    if (collapseId === null) return;

    const cardData = this._getCurrentDetailGradeCard();
    if (!cardData) return;

    const grade = cardData.grade;
    const itemIdx = parseInt(collapseId);
    const progress = this._getGradeProgress(grade);

    // 如果已经标记过已读，跳过
    if (progress.readItems[itemIdx]) return;

    // 5秒后标记已读
    clearTimeout(card._readTimer);
    card._readTimer = setTimeout(() => {
      // 仅在仍然展开时标记
      if (card.classList.contains('open')) {
        progress.readItems[itemIdx] = Date.now();
        this._saveGradeProgress(grade, progress);

        // 在卡片头部添加已读标记
        if (header) {
          this._addReadDot(header);
        }

        // 更新年级卡片进度条
        this._updateGradeCardProgress();

        // 检查是否全板块完成
        this._checkGradeMastered(grade);
      }
    }, 5000);
  },

  /** 获取当前打开的年级详情页的卡片数据 */
  _getCurrentDetailGradeCard() {
    const detailPage = document.getElementById('sub-grade-detail-page');
    if (!detailPage || !detailPage.classList.contains('active')) return null;

    const titleEl = document.getElementById('grade-detail-title');
    if (!titleEl) return null;

    const titleText = titleEl.textContent || '';
    for (const card of this.GRADE_CARDS) {
      if (titleText.includes(card.name)) return card;
    }
    return null;
  },

  /** 添加已读标记 */
  _addReadDot(header) {
    const card = header.closest('.grade-collapse-card');
    if (!card) return;

    // 避免重复添加
    let dot = card.querySelector('.gch-read-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'gch-read-dot';
      header.appendChild(dot);
    }

    // 添加已读样式
    card.classList.add('read');
  },

  /** 检查某年级是否所有板块均已掌握（L3） */
  _checkGradeMastered(grade) {
    const cardData = this.GRADE_CARDS.find(c => c.grade === grade);
    if (!cardData) return;

    const progress = this._getGradeProgress(grade);
    const totalItems = cardData.items.length;
    const readCount = Object.keys(progress.readItems).length;

    if (readCount >= totalItems && !progress.mastered) {
      progress.mastered = true;
      progress.masteredAt = Date.now();
      this._saveGradeProgress(grade, progress);

      // 更新年级卡片 UI
      this._updateGradeCardProgress();
    }
  },

  /** 更新年级卡片上的进度条和徽章 */
  _updateGradeCardProgress() {
    const allCards = document.querySelectorAll('.grade-page-card');
    if (allCards.length === 0) return;

    allCards.forEach(cardEl => {
      const grade = cardEl.getAttribute('data-grade');
      if (!grade) return;

      const cardData = this.GRADE_CARDS.find(c => c.grade === grade);
      if (!cardData) return;

      const progress = this._getGradeProgress(grade);
      const total = cardData.items.length;
      const read = Object.keys(progress.readItems).length;
      const pct = Math.round((read / total) * 100);

      // 更新或创建进度条
      let progressWrap = cardEl.querySelector('.gpc-progress-wrap');
      if (!progressWrap) {
        progressWrap = document.createElement('div');
        progressWrap.className = 'gpc-progress-wrap';
        cardEl.appendChild(progressWrap);
      }

      if (progress.mastered) {
        // 精通状态
        progressWrap.innerHTML = `<span class="gpc-master-badge">🏅 已全部掌握</span>`;
        cardEl.classList.add('mastered');
      } else if (read > 0) {
        progressWrap.innerHTML = `
          <div class="gpc-progress-bar">
            <div class="gpc-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="gpc-progress-text">${read}/${total}</span>`;
        cardEl.classList.remove('mastered');
      }
    });
  },

  // ============================================
  //  方案三：留资/连接入口（兴趣卡片 Interest Card）
  // ============================================

  /** 检查是否已提交过兴趣信息 */
  _hasSubmittedInterest() {
    this._initGradeProgress();
    return !!(this.userConfig._gradeProgress && this.userConfig._gradeProgress._interestSubmitted);
  },

  /** 获取已存储的兴趣数据 */
  _getInterestData() {
    this._initGradeProgress();
    return (this.userConfig._gradeProgress && this.userConfig._gradeProgress._interestData) || null;
  },

  /** 渲染兴趣卡片 HTML
   *  @param {string} grade - 页面所在年级，用于展示标签和存储
   */
  _renderInterestCard(grade) {
    const interestData = this._getInterestData();
    const hasSubmitted = this._hasSubmittedInterest();

    const gradeLabels = { freshman: '大一', sophomore: '大二', junior: '大三', senior: '大四', grad: '研究生及以上' };
    const gradeLabel = gradeLabels[grade] || grade;

    const directionOptions = [
      { value: '', label: '选一个你感兴趣的方向' },
      { value: 'tech', label: '💻 技术开发' }, { value: 'product', label: '📱 产品经理' },
      { value: 'design', label: '🎨 设计' }, { value: 'ops', label: '📣 运营/市场' },
      { value: 'data', label: '📊 数据分析' }, { value: 'legal', label: '⚖️ 法务/合规' },
      { value: 'game', label: '🎮 游戏策划' }, { value: 'other', label: '🔍 还在探索中' }
    ];

    if (hasSubmitted && interestData) {
      const dirLabel = directionOptions.find(d => d.value === interestData.direction)?.label || '未指定';
      return '<div class="interest-card" data-interest-grade="' + grade + '">'
        + '<div class="ic-header"><span class="ic-title">🐧 已记住你的方向</span></div>'
        + '<div class="ic-success"><span>✅</span><span>方向：' + dirLabel + ' · ' + gradeLabel + ' —— 企鹅会更懂你！</span></div>'
        + '<div class="ic-success-actions"><button class="ic-edit-btn" onclick="App._editInterest(this)">✏️ 修改</button></div>'
        + '<div class="ic-privacy">🔒 仅保存在你的浏览器里</div></div>';
    }

    const prevDirection = interestData?.direction || '';
    const optsHtml = directionOptions.map(o => '<option value="' + o.value + '"' + (o.value === prevDirection ? ' selected' : '') + '>' + o.label + '</option>').join('');

    return '<div class="interest-card" data-interest-grade="' + grade + '">'
      + '<div class="ic-header"><span class="ic-title">🎯 你的求职方向是什么？</span><button class="ic-collapse-btn" onclick="App._toggleInterestCard(this)" title="收起">−</button></div>'
      + '<div class="ic-desc">告诉企鹅你的目标岗位，未来会为你<strong>推荐匹配的求职内容</strong>，帮你更有针对性地准备。当前阶段：<strong>' + gradeLabel + '</strong> 🐧</div>'
      + '<div class="ic-form"><div class="ic-select-row"><div class="ic-select-group"><span class="ic-select-label">我感兴趣的方向</span><select class="ic-select ic-direction">' + optsHtml + '</select></div></div><button class="ic-submit-btn" onclick="App._submitInterest(this)">🐧 告诉企鹅</button></div>'
      + '<div class="ic-privacy">🔒 仅保存在你的浏览器里，企鹅会更懂你</div></div>';
  },

  /** 提交兴趣信息 */
  _submitInterest(btn) {
    const card = btn.closest('.interest-card');
    if (!card) return;
    const directionEl = card.querySelector('.ic-direction');
    const direction = directionEl?.value || '';
    // 年级来自页面上下文（data-interest-grade），不再需要用户手选
    const grade = card.getAttribute('data-interest-grade') || 'freshman';

    if (!direction) {
      btn.style.opacity = '0.7';
      setTimeout(() => { btn.style.opacity = '1'; }, 300);
      return;
    }

    const data = { direction, grade, submittedAt: Date.now() };
    this._initGradeProgress();
    if (!this.userConfig._gradeProgress) this.userConfig._gradeProgress = {};
    this.userConfig._gradeProgress._interestSubmitted = true;
    this.userConfig._gradeProgress._interestData = data;
    this.saveData();

    // 替换所有兴趣卡片为已提交状态
    card.outerHTML = this._renderInterestCard(grade);
    setTimeout(() => {
      document.querySelectorAll('.interest-card[data-interest-grade]').forEach(el => {
        const g = el.getAttribute('data-interest-grade') || 'freshman';
        el.outerHTML = this._renderInterestCard(g);
      });
    }, 50);
  },

  /** 修改兴趣信息（清除已提交标记，恢复为表单状态） */
  _editInterest(btn) {
    const card = btn.closest('.interest-card');
    if (!card) return;
    // 清除提交标记，但保留旧数据便于预填
    this._initGradeProgress();
    if (this.userConfig._gradeProgress) {
      this.userConfig._gradeProgress._interestSubmitted = false;
    }
    this.saveData();

    // 重新渲染为表单状态
    const grade = card.getAttribute('data-interest-grade') || 'freshman';
    card.outerHTML = this._renderInterestCard(grade);
    setTimeout(() => {
      document.querySelectorAll('.interest-card[data-interest-grade]').forEach(el => {
        const g = el.getAttribute('data-interest-grade') || 'freshman';
        el.outerHTML = this._renderInterestCard(g);
      });
    }, 50);
  },

  /** 收起/展开兴趣卡片 */
  _toggleInterestCard(btn) {
    const card = btn.closest('.interest-card');
    if (!card) return;
    if (card.classList.contains('collapsed')) {
      card.classList.remove('collapsed');
      btn.textContent = '−';
    } else {
      card.classList.add('collapsed');
      btn.textContent = '+';
    }
  },

  // ============================================

  /** 根据 visualData 类型渲染内容 */
  _renderVisualContent(item) {
    const vd = item.visualData;
    if (!vd) return '';
    switch (vd.type) {
      case 'tabs': return this._renderTabbedView(vd);
      case 'biz-grid': return this._renderBizGrid(vd);
      case 'checklist': return this._renderChecklist(vd);
      case 'role-detail-cards': return this._renderRoleDetailCards(vd);
      case 'major-career-map': return this._renderMajorCareerMap(vd);
      case 'skill-tree': return this._renderSkillTree(vd);
      case 'html': return vd.html || '';
      default: return '';
    }
  },

  /** 渲染标签页式内容（互联网行业全景图） */
  _renderTabbedView(vd) {
    const tabsHtml = vd.tabs.map((t, i) =>
      `<button class="vis-tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}" onclick="App._switchVisualTab(this, '${t.id}')"><span>${t.icon}</span> ${t.label}</button>`
    ).join('');

    return `
      <div class="vis-tabbed-container">
        <div class="vis-tab-bar">${tabsHtml}</div>
        <div class="vis-tab-panels">
          ${vd.tabs.map((t, i) => `<div class="vis-tab-panel ${i === 0 ? 'active' : ''}" data-panel="${t.id}">${t.html || this._renderTabPanel(t.id)}</div>`).join('')}
        </div>
      </div>`;
  },

  /** 切换可视化标签页 */
  _switchVisualTab(btn, tabId) {
    const container = btn.closest('.vis-tabbed-container');
    if (!container) return;
    container.querySelectorAll('.vis-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    container.querySelectorAll('.vis-tab-panel').forEach(p => p.classList.remove('active'));
    const panel = container.querySelector(`[data-panel="${tabId}"]`);
    if (panel) panel.classList.add('active');
  },

  /** 渲染各个标签面板内容 */
  _renderTabPanel(tabId) {
    switch (tabId) {
      case 'map': return this._renderIndustryMap();
      case 'company': return this._renderCompanyLandscape();
      case 'role': return this._renderRoleRadar();
      case 'salary': return this._renderSalaryChart();
      default: return '';
    }
  },

  /** ① 赛道地图 - 图标矩阵 */
  _renderIndustryMap() {
    const tracks = [
      { emoji: '💬', name: '社交', desc: '微信/QQ/TikTok', companies: '腾讯、字节' },
      { emoji: '🛒', name: '电商', desc: '淘宝/京东/拼多多', companies: '阿里、京东、拼多多' },
      { emoji: '🎬', name: '内容', desc: '抖音/B站/腾讯视频', companies: '字节、B站、腾讯' },
      { emoji: '🎮', name: '游戏', desc: '王者荣耀/原神', companies: '腾讯、网易、米哈游' },
      { emoji: '☁️', name: '企业服务', desc: '腾讯云/飞书/钉钉', companies: '腾讯云、阿里云、字节' },
      { emoji: '🤖', name: 'AI大模型', desc: '深度学习/AIGC/自动驾驶', companies: 'DeepSeek、百度、字节' },
      { emoji: '💳', name: '金融科技', desc: '移动支付/理财/保险', companies: '腾讯、阿里' },
      { emoji: '🚗', name: '出行', desc: '网约车/地图/自动驾驶', companies: '滴滴、百度、高德' },
      { emoji: '🏠', name: '本地生活', desc: '外卖/到店/酒旅', companies: '美团、饿了么、抖音' }
    ];
    const cards = tracks.map(t => `
      <div class="vis-track-card">
        <span class="vis-track-emoji">${t.emoji}</span>
        <div class="vis-track-name">${t.name}</div>
        <div class="vis-track-desc">${t.desc}</div>
        <div class="vis-track-companies">${t.companies}</div>
      </div>`).join('');

    return `<div class="vis-section-intro">9大赛道，大厂往往横跨多个赛道构建生态壁垒</div>
      <div class="vis-track-grid">${cards}</div>`;
  },

  /** ② 公司格局 - 分层卡片 */
  _renderCompanyLandscape() {
    const tiers = [
      { label: '🥇 一线大厂', cls: 'tier1', items: [
        { name: '腾讯', desc: '社交+游戏+云+金融，生态最完整' },
        { name: '阿里', desc: '电商+云+物流+金融，交易底盘深厚' },
        { name: '字节跳动', desc: '抖音+TikTok+AI，全球化最激进' },
        { name: '美团', desc: '外卖+本地生活+出行，高频场景之王' },
        { name: '拼多多', desc: '社交电商+海外Temu，增长最迅猛' }
      ]},
      { label: '🥈 二线劲旅', cls: 'tier2', items: [
        { name: '快手', desc: '短视频+直播电商，下沉王者' },
        { name: '京东', desc: '自营电商+物流，品质效率标杆' },
        { name: '网易', desc: '游戏+音乐+教育，精品化路线' },
        { name: '百度', desc: 'AI+搜索+自动驾驶，技术底蕴深' },
        { name: '小红书', desc: '生活方式社区+电商，种草经济' }
      ]},
      { label: '🥉 新锐力量', cls: 'tier3', items: [
        { name: '米哈游', desc: '原神/崩坏，全球化游戏新贵' },
        { name: 'Shein', desc: '快时尚出海电商，海外用户过亿' },
        { name: '得物', desc: '潮流电商+鉴定，年轻消费入口' },
        { name: '大疆', desc: '无人机+影像，全球份额第一' }
      ]}
    ];
    return tiers.map(t => `
      <div class="vis-tier-group">
        <div class="vis-tier-label">${t.label}</div>
        <div class="vis-company-cards ${t.cls}">
          ${t.items.map(c => `<div class="vis-company-card"><strong>${c.name}</strong><span>${c.desc}</span></div>`).join('')}
        </div>
      </div>`).join('');
  },

  /** ③ 岗位雷达 - 图标卡片 */
  _renderRoleRadar() {
    const roles = [
      { emoji: '💻', name: '技术岗', sub: '前端/后端/算法/测试/运维', fit: '喜欢写代码、解决问题', core: '编程语言·数据结构·系统设计·工程思维' },
      { emoji: '📱', name: '产品岗', sub: '产品经理/产品运营/数据分析', fit: '喜欢追问「为什么做这个功能」', core: '用户洞察·逻辑推演·沟通协调·数据驱动' },
      { emoji: '🎨', name: '设计岗', sub: 'UI/UX/视觉/交互/用户研究', fit: '有审美、关注用户体验', core: '设计工具·用户研究·审美判断·交互思维' },
      { emoji: '📊', name: '市场岗', sub: '商务拓展/品牌/公关/整合营销', fit: '喜欢与人打交道、有商业嗅觉', core: '沟通谈判·市场洞察·文案表达·资源整合' },
      { emoji: '📝', name: '运营岗', sub: '内容/用户/社群/活动运营', fit: '执行力强、擅长精细化管理', core: '数据分析·用户心理·统筹执行·热点敏感' },
      { emoji: '👔', name: '职能岗', sub: 'HR/财务/法务/行政', fit: '追求专业深度、稳定发展', core: '专业资质·沟通协调·流程管理·风险意识' }
    ];
    const cards = roles.map(r => `
      <div class="vis-role-card">
        <div class="vis-role-header"><span class="vis-role-emoji">${r.emoji}</span><span class="vis-role-name">${r.name}</span></div>
        <div class="vis-role-sub">${r.sub}</div>
        <div class="vis-role-fit">👤 适合：${r.fit}</div>
        <div class="vis-role-core">🎯 核心：${r.core}</div>
      </div>`).join('');
    return `<div class="vis-section-intro">大一大二不用急着确定方向，多尝试、多实习是最好的试错方式</div>
      <div class="vis-role-grid">${cards}</div>`;
  },

  /** ④ 薪资速览 - 柱状对比 */
  _renderSalaryChart() {
    const data = [
      { label: '技术/算法', ssp: '50-80w', sp: '40-55w', normal: '30-40w', maxVal: 80, sspH: 100, spH: 69, normalH: 50, color: '#0052D9', tag: 'SSP可达80w' },
      { label: '产品岗', ssp: '', sp: '35-50w', normal: '25-35w', maxVal: 50, sspH: 0, spH: 100, normalH: 70, color: '#00A870', tag: 'SP可达50w' },
      { label: '设计/运营', ssp: '', sp: '', normal: '20-35w', maxVal: 35, sspH: 0, spH: 0, normalH: 100, color: '#ED7B2F', tag: '范围20-35w' },
      { label: '市场/职能', ssp: '', sp: '', normal: '15-28w', maxVal: 28, sspH: 0, spH: 0, normalH: 80, color: '#9B59B6', tag: '范围15-28w' }
    ];
    const bars = data.map(d => `
      <div class="vis-salary-col">
        <div class="vis-salary-bars">
          ${d.sspH > 0 ? `<div class="vis-salary-bar ssp" style="height:${d.sspH}%;background:${d.color}"><span>SSP ${d.ssp}</span></div>` : ''}
          ${d.spH > 0 ? `<div class="vis-salary-bar sp" style="height:${d.spH}%;background:${d.color}99"><span>SP ${d.sp}</span></div>` : ''}
          <div class="vis-salary-bar normal" style="height:${d.normalH}%;background:${d.color}55"><span>${d.normal}</span></div>
        </div>
        <div class="vis-salary-label">${d.label}</div>
        <div class="vis-salary-tag">${d.tag}</div>
      </div>`).join('');

    return `<div class="vis-section-intro">一线大厂校招年薪范围（含股票/签字费，单位：万元）</div>
      <div class="vis-salary-chart">${bars}</div>
      <div class="vis-salary-note">💡 平台能级、业务前景、团队氛围、成长空间同样重要。第一份工作的核心目标：积累「可迁移的能力」。</div>
      <div class="vis-salary-note">🔗 参考工具：offershow 微信小程序可查真实薪资爆料。</div>`;
  },

  /** 渲染事业群卡片网格 */
  _renderBizGrid(vd) {
    const cards = vd.groups.map(g => `
      <div class="vis-biz-card" style="--biz-color:${g.color}" onclick="App._openBizDetail(event, '${g.id}')">
        <div class="vis-biz-abbr" style="background:${g.color}">${g.abbr}</div>
        <div class="vis-biz-name">${g.emoji} ${g.name}</div>
        <div class="vis-biz-loc">📍 ${g.location}</div>
        <div class="vis-biz-products">${g.desc}</div>
        <div class="vis-biz-highlight">💡 ${g.highlight}</div>
      </div>`).join('');

    // 详情弹窗数据（存储为 JSON，在弹窗中动态渲染）
    const detailData = JSON.stringify(vd.groups.map(g => ({
      id: g.id, abbr: g.abbr, name: g.name, emoji: g.emoji, color: g.color,
      location: g.location, desc: g.desc, highlight: g.highlight, roles: g.roles
    }))).replace(/'/g, "&#39;");

    return `
      <div class="vis-biz-intro">腾讯内部按"事业群"划分业务，共七大事业群。点击卡片查看详情 👇</div>
      <div class="vis-biz-grid">${cards}</div>
      <div class="vis-biz-tip">💡 面试时能精准说出"我想去XX事业群做XX方向"，比笼统说"我想去腾讯"加分太多。</div>
      <div id="vis-biz-detail-data" style="display:none" data-json='${detailData}'></div>`;
  },

  /** 打开事业群详情弹窗 */
  _openBizDetail(event, groupId) {
    event.stopPropagation();
    const dataEl = document.getElementById('vis-biz-detail-data');
    if (!dataEl) return;
    const groups = JSON.parse(dataEl.dataset.json);
    const g = groups.find(x => x.id === groupId);
    if (!g) return;

    let overlay = document.getElementById('vis-biz-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'vis-biz-overlay';
      overlay.className = 'vis-biz-overlay';
      overlay.addEventListener('click', () => overlay.classList.remove('active'));
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="vis-biz-detail-popup" style="--biz-color:${g.color}" onclick="event.stopPropagation()">
        <button class="vis-biz-detail-close" onclick="document.getElementById('vis-biz-overlay').classList.remove('active')">✕</button>
        <div class="vis-biz-detail-header">
          <span class="vis-biz-detail-abbr" style="background:${g.color}">${g.abbr}</span>
          <div>
            <div class="vis-biz-detail-name">${g.emoji} ${g.name}</div>
            <div class="vis-biz-detail-loc">📍 ${g.location}</div>
          </div>
        </div>
        <div class="vis-biz-detail-section">
          <div class="vis-biz-detail-label">📦 旗下产品</div>
          <div class="vis-biz-detail-text">${g.desc}</div>
        </div>
        <div class="vis-biz-detail-section">
          <div class="vis-biz-detail-label">💡 关键洞察</div>
          <div class="vis-biz-detail-text">${g.highlight}</div>
        </div>
        <div class="vis-biz-detail-section">
          <div class="vis-biz-detail-label">🎯 适合方向</div>
          <div class="vis-biz-detail-roles">${g.roles.split(' / ').map(r => `<span class="vis-biz-role-tag">${r}</span>`).join('')}</div>
        </div>
      </div>`;
    overlay.classList.add('active');
  },

  /** 渲染可勾选清单（支持 sections 分组） */
  _renderChecklist(vd) {
    // 从 localStorage 读取勾选状态
    let checked = {};
    try { checked = JSON.parse(localStorage.getItem('freshman_checklist') || '{}'); } catch (e) {}

    const sections = vd.sections || [];
    // 展平所有项用于计数
    const allItems = sections.reduce((arr, sec) => arr.concat(sec.items || []), []);

    const itemsHtml = sections.map(section => {
      const sectionItems = (section.items || []).map(item => {
        const isChecked = checked[item.id] || false;
        const tipsHtml = item.tips ? `<div class="vis-check-tips">💡 ${item.tips}</div>` : '';
        return `
          <div class="vis-check-item ${isChecked ? 'done' : ''}" data-check-id="${item.id}" onclick="App._toggleCheckItem(this, '${item.id}')">
            <div class="vis-check-box">${isChecked ? '✅' : '⬜'}</div>
            <div class="vis-check-body">
              <div class="vis-check-title">
                <span class="vis-check-num">${item.num || ''}</span>
                <span class="vis-check-icon">${item.icon}</span>
                <span class="vis-check-label">${item.title}</span>
                <span class="vis-check-tag">${item.tag}</span>
              </div>
              <div class="vis-check-desc">${item.desc}</div>
              ${tipsHtml}
            </div>
          </div>`;
      }).join('');

      return `
        <div class="vis-check-section">
          <div class="vis-check-section-header" style="--section-color:${section.color}">
            <span class="vis-check-section-icon">${section.icon}</span>
            <span class="vis-check-section-label">${section.label}</span>
            <span class="vis-check-section-arrow">▼</span>
          </div>
          <div class="vis-check-section-body">${sectionItems}</div>
        </div>`;
    }).join('');

    const total = allItems.length;
    const done = Object.values(checked).filter(Boolean).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return `
      <div class="vis-check-progress">
        <div class="vis-check-progress-bar"><div class="vis-check-progress-fill" style="width:${pct}%"></div></div>
        <div class="vis-check-progress-text">${done}/${total} 已完成 · ${pct}%</div>
      </div>
      <div class="vis-check-list">${itemsHtml}</div>
      <div class="vis-check-footer">${vd.footer}</div>`;
  },

  /** 切换清单项勾选 */
  _toggleCheckItem(el, itemId) {
    let checked = {};
    try { checked = JSON.parse(localStorage.getItem('freshman_checklist') || '{}'); } catch (e) {}
    checked[itemId] = !checked[itemId];
    localStorage.setItem('freshman_checklist', JSON.stringify(checked));

    const isChecked = checked[itemId];
    el.classList.toggle('done', isChecked);
    const box = el.querySelector('.vis-check-box');
    if (box) box.textContent = isChecked ? '✅' : '⬜';

    // 更新进度条：在整个 vis-check-list 内统计全部 done 项
    const container = el.closest('.grade-collapse-body-inner');
    if (!container) return;
    const allItems = container.querySelectorAll('.vis-check-item');
    const doneCount = container.querySelectorAll('.vis-check-item.done').length;
    const total = allItems.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    const bar = container.querySelector('.vis-check-progress-fill');
    const text = container.querySelector('.vis-check-progress-text');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = `${doneCount}/${total} 已完成 · ${pct}%`;
  },

  // ============================================
  //  大二·角色详情卡片
  // ============================================

  /** 渲染各岗位角色详情卡片（折叠列表） */
  _renderRoleDetailCards(vd) {
    const roles = vd.roles || [];
    const L = vd.labels || {};
    const lblDay = L.day || '🕐 一天';
    const lblSkills = L.skills || '🎯 核心技能';
    const lblFit = L.fit || '👤 适合谁';
    const lblDetail = L.detail || '📖 更多了解';
    const cards = roles.map(role => `
      <div class="role-detail-card" style="--role-color:${role.color}">
        <div class="rdc-header" onclick="App._toggleRoleCard(this)" data-role="${role.name}">
          <span class="rdc-emoji">${role.emoji}</span>
          <div class="rdc-header-info">
            <span class="rdc-name">${role.name}</span>
            <span class="rdc-oneliner">${role.oneliner}</span>
          </div>
          <span class="rdc-arrow">▼</span>
        </div>
        <div class="rdc-body">
          <div class="rdc-section">
            <div class="rdc-label">${lblDay}</div>
            <div class="rdc-text">${role.day}</div>
          </div>
          <div class="rdc-section">
            <div class="rdc-label">${lblSkills}</div>
            <div class="rdc-skills">${role.skills.split(' · ').map(s => `<span class="rdc-skill-tag">${s.trim()}</span>`).join('')}</div>
          </div>
          <div class="rdc-section">
            <div class="rdc-label">${lblFit}</div>
            <div class="rdc-text">${role.fit}</div>
          </div>
          ${role.quote ? `<div class="rdc-quote">💬 鹅厂学长说："${role.quote}"</div>` : ''}
          <div class="rdc-section">
            <div class="rdc-label">${lblDetail}</div>
            <div class="rdc-text">${role.detail}</div>
          </div>
        </div>
      </div>
    `).join('');
    return `<div class="role-detail-list">${cards}</div>`;
  },

  /** 切换角色卡片展开/折叠 */
  _toggleRoleCard(header) {
    const card = header.closest('.role-detail-card');
    if (!card) return;
    card.classList.toggle('open');
  },

  // ============================================
  //  大二·专业→职业对应表
  // ============================================

  /** 渲染专业→职业对应表 */
  _renderMajorCareerMap(vd) {
    const majors = vd.majors || [];
    const cards = majors.map(m => `
      <div class="major-career-card">
        <div class="mcc-header">
          <span class="mcc-icon">${m.icon}</span>
          <span class="mcc-major">${m.major}</span>
        </div>
        <div class="mcc-directions">
          ${m.directions.map(d => `
            <div class="mcc-dir-item">
              <span class="mcc-dir-career">${d.career}</span>
              <span class="mcc-dir-detail">${d.detail}</span>
              ${d.example ? `<div class="mcc-dir-example">💡 ${d.example}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    const footer = vd.footer ? `<div class="major-career-footer">${vd.footer}</div>` : '';

    return `<div class="major-career-grid">${cards}</div>${footer}`;
  },

  // ============================================
  //  大二·技能树规划
  // ============================================

  /** 渲染技能树规划 */
  _renderSkillTree(vd) {
    const directions = vd.directions || [];
    const checklistKey = vd.checklistKey || 'sophomore_skilltree';

    // 读取勾选状态
    let checked = {};
    try { checked = JSON.parse(localStorage.getItem(checklistKey) || '{}'); } catch (e) {}

    const directionTabs = directions.map((d, i) => {
      const items = d.semesters.flatMap(s => s.items);
      const done = items.filter(it => checked[it.id]).length;
      const total = items.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return `<button class="skill-tree-tab ${i === 0 ? 'active' : ''}" data-dir="${d.id}" onclick="App._switchSkillTreeDir(this, '${d.id}')" style="--dir-color:${d.color}">
        <span>${d.icon}</span> ${d.name} <span class="stt-progress">${done}/${total}</span>
      </button>`;
    }).join('');

    const panels = directions.map((d, i) => {
      const semesters = d.semesters.map(sem => {
        const items = sem.items.map(it => {
          const isDone = checked[it.id] || false;
          return `<div class="skill-tree-item ${isDone ? 'done' : ''}" data-skill-id="${it.id}" onclick="App._toggleSkillItem(this, '${it.id}', '${checklistKey}')">
            <span class="sti-check">${isDone ? '✅' : '☐'}</span>
            <span class="sti-text">${it.text}</span>
            <span class="sti-tag">${it.tag}</span>
          </div>`;
        }).join('');
        return `<div class="skill-tree-semester">
          <div class="sts-label">${sem.label}</div>
          <div class="sts-items">${items}</div>
        </div>`;
      }).join('');

      return `<div class="skill-tree-panel ${i === 0 ? 'active' : ''}" data-panel="${d.id}">
        <div class="skill-tree-split">${semesters}</div>
      </div>`;
    }).join('');

    // 总体进度
    const allItems = directions.flatMap(d => d.semesters.flatMap(s => s.items));
    const totalDone = allItems.filter(it => checked[it.id]).length;
    const totalAll = allItems.length;
    const totalPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    return `
      <div class="skill-tree-intro">选择一个方向，查看大二上下学期的技能成长路径 👇</div>
      <div class="skill-tree-tabs">${directionTabs}</div>
      ${panels}
      <div class="skill-tree-footer">
        <div class="skill-tree-progress">
          <div class="skill-tree-progress-bar"><div class="skill-tree-progress-fill" style="width:${totalPct}%"></div></div>
          <span class="skill-tree-progress-text">全方向进度 ${totalDone}/${totalAll} · ${totalPct}%</span>
        </div>
        <div class="skill-tree-tip">💡 勾选已完成项追踪成长。不用每个方向都做，选一个最感兴趣的方向先动起来！</div>
      </div>`;
  },

  /** 切换技能树方向标签 */
  _switchSkillTreeDir(btn, dirId) {
    const container = btn.closest('.grade-collapse-body-inner');
    if (!container) return;
    container.querySelectorAll('.skill-tree-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    container.querySelectorAll('.skill-tree-panel').forEach(p => p.classList.remove('active'));
    const panel = container.querySelector(`[data-panel="${dirId}"]`);
    if (panel) panel.classList.add('active');
  },

  /** 切换技能项勾选 */
  _toggleSkillItem(el, itemId, checklistKey) {
    let checked = {};
    try { checked = JSON.parse(localStorage.getItem(checklistKey) || '{}'); } catch (e) {}
    checked[itemId] = !checked[itemId];
    localStorage.setItem(checklistKey, JSON.stringify(checked));

    const isDone = checked[itemId];
    el.classList.toggle('done', isDone);
    const checkEl = el.querySelector('.sti-check');
    if (checkEl) checkEl.textContent = isDone ? '✅' : '☐';

    // 更新当前方向 tab 进度
    const container = el.closest('.grade-collapse-body-inner');
    if (!container) return;
    this._updateSkillTreeProgress(container, checklistKey);

    // 更新底部总进度
    const progressFill = container.querySelector('.skill-tree-progress-fill');
    const progressText = container.querySelector('.skill-tree-progress-text');
    if (progressFill && progressText) {
      const allItems = container.querySelectorAll('.skill-tree-item');
      const allDone = container.querySelectorAll('.skill-tree-item.done');
      const pct = allItems.length > 0 ? Math.round((allDone.length / allItems.length) * 100) : 0;
      progressFill.style.width = pct + '%';
      progressText.textContent = `全方向进度 ${allDone.length}/${allItems.length} · ${pct}%`;
    }
  },

  /** 更新所有方向标签的进度数字 */
  _updateSkillTreeProgress(container, checklistKey) {
    let checked = {};
    try { checked = JSON.parse(localStorage.getItem(checklistKey) || '{}'); } catch (e) {}

    container.querySelectorAll('.skill-tree-tab').forEach(tab => {
      const dirId = tab.dataset.dir;
      const panel = container.querySelector(`[data-panel="${dirId}"]`);
      if (!panel) return;
      const items = panel.querySelectorAll('.skill-tree-item');
      const done = panel.querySelectorAll('.skill-tree-item.done');
      const progressEl = tab.querySelector('.stt-progress');
      if (progressEl) progressEl.textContent = `${done.length}/${items.length}`;
    });
  },

  // ============================================
  //  简历驱动对话 & 岗位推荐
  // ============================================

  /** 腾讯岗位大类映射表 */
  JOB_CATEGORIES: {
    tech: {
      name: '技术',
      icon: '💻',
      jobs: [
        { name: '后台开发', direction: '技术方向', desc: '构建高并发、高可用的后端服务系统，是互联网产品的基石', url: 'https://join.qq.com' },
        { name: '前端开发', direction: '技术方向', desc: '打造极致的用户体验，用代码构建用户与产品的桥梁', url: 'https://join.qq.com' },
        { name: '算法工程师', direction: '技术方向', desc: '研究前沿AI算法，推动产品智能化升级', url: 'https://join.qq.com' },
        { name: '客户端开发', direction: '技术方向', desc: '开发iOS/Android应用，让产品触达亿万用户', url: 'https://join.qq.com' }
      ]
    },
    product: {
      name: '产品',
      icon: '📱',
      jobs: [
        { name: '产品策划', direction: '产品方向', desc: '从用户需求出发，定义产品方向与功能，是产品的灵魂', url: 'https://join.qq.com' },
        { name: '产品运营', direction: '产品方向', desc: '让好产品被更多人使用，通过数据驱动产品增长', url: 'https://join.qq.com' }
      ]
    },
    design: {
      name: '设计',
      icon: '🎨',
      jobs: [
        { name: 'UI设计师', direction: '设计方向', desc: '设计美观易用的界面，让产品好看又好用', url: 'https://join.qq.com' },
        { name: 'UX设计师', direction: '设计方向', desc: '研究用户行为，优化产品交互体验', url: 'https://join.qq.com' },
        { name: '视觉设计师', direction: '设计方向', desc: '负责品牌视觉、运营活动的创意设计', url: 'https://join.qq.com' }
      ]
    },
    law: {
      name: '法学',
      icon: '⚖️',
      jobs: [
        { name: '法务', direction: '法学方向', desc: '为公司业务提供法律支持，把控合规风险', url: 'https://join.qq.com' },
        { name: '合规', direction: '法学方向', desc: '确保业务符合法律法规要求，守护公司底线', url: 'https://join.qq.com' },
        { name: '知识产权', direction: '法学方向', desc: '保护公司创新成果，管理专利/商标/版权', url: 'https://join.qq.com' }
      ]
    },
    media: {
      name: '传媒',
      icon: '📺',
      jobs: [
        { name: '内容运营', direction: '内容方向', desc: '策划和生产优质内容，连接用户与品牌', url: 'https://join.qq.com' },
        { name: '市场策划', direction: '市场方向', desc: '策划品牌营销活动，提升产品影响力', url: 'https://join.qq.com' }
      ]
    },
    finance: {
      name: '金融',
      icon: '💰',
      jobs: [
        { name: '金融产品经理', direction: '金融方向', desc: '设计创新金融产品，服务亿万用户的金融需求', url: 'https://join.qq.com' },
        { name: '风控策略', direction: '金融方向', desc: '构建智能风控体系，保障金融业务安全', url: 'https://join.qq.com' }
      ]
    },
    data: {
      name: '数据',
      icon: '📊',
      jobs: [
        { name: '数据分析师', direction: '数据方向', desc: '用数据驱动决策，发现产品增长机会', url: 'https://join.qq.com' },
        { name: '数据工程师', direction: '数据方向', desc: '搭建数据平台，让海量数据发挥价值', url: 'https://join.qq.com' }
      ]
    }
  },

  /** 简历关键词 → 岗位类别映射 */
  SKILL_JOB_MAP: [
    // 技术类
    { keywords: ['编程', '代码', 'Python', 'Java', 'C++', 'Go', 'Rust', 'JavaScript', 'TypeScript', '前端', '后端', '算法', '数据结构', 'React', 'Vue', 'Node', 'Docker', 'Kubernetes', 'Linux', 'Git', '数据库', 'SQL', 'NoSQL', '机器学习', '深度学习', 'AI', '人工智能', '神经网络', 'TensorFlow', 'PyTorch'], category: 'tech', weight: 1 },
    // 产品类
    { keywords: ['产品', '策划', '需求', 'PRD', '用户研究', '竞品分析', '原型', 'Axure', 'Figma', '用户体验', '产品经理', '商业分析', '增长', '数据分析'], category: 'product', weight: 1 },
    // 设计类
    { keywords: ['设计', 'UI', 'UX', '交互', '视觉', 'Figma', 'Sketch', 'PS', 'AI', 'Adobe', '平面', '插画', '动画', '品牌设计', '版式', '配色', '用户界面'], category: 'design', weight: 1 },
    // 法学类
    { keywords: ['法学', '法律', '法务', '合规', '知识产权', '专利', '版权', '商标', '合同法', '公司法', '刑法', '民法', '模拟法庭', '律师', '司法'], category: 'law', weight: 1 },
    // 传媒类
    { keywords: ['传媒', '新闻', '传播', '新媒体', '内容', '文案', '编辑', '写作', '短视频', '公众号', '自媒体', '公关', '品牌', '营销', '广告'], category: 'media', weight: 1 },
    // 金融类
    { keywords: ['金融', '经济', '会计', '财务', '投资', '证券', '银行', '保险', '风控', '审计', 'CPA', 'CFA'], category: 'finance', weight: 1 },
    // 数据类
    { keywords: ['数据', '统计学', 'SQL', 'Excel', 'Tableau', 'PowerBI', 'SPSS', 'R语言', '爬虫', '数据挖掘', '数据仓库', 'ETL', '可视化'], category: 'data', weight: 1 }
  ],

  /** 简历关键词 → traits维度加权 */
  RESUME_TRAIT_MAP: [
    { keywords: ['Python', 'Java', 'C++', 'Go', 'Rust', '编程', '代码', '算法', '数据结构', '机器学习', 'AI', 'TensorFlow'], trait: 'knowledge', boost: 15 },
    { keywords: ['设计', 'UI', 'UX', 'Figma', 'Sketch', 'PS', '绘画', '插画', '创意', '视觉'], trait: 'creativity', boost: 15 },
    { keywords: ['社团', '学生会', '演讲', '辩论', '沟通', '合作', '团队', '组织', '社交', '志愿者', '支教', '社区'], trait: 'social', boost: 15 },
    { keywords: ['实习', '项目', '竞赛', '获奖', '证书', 'GPA', '排名', '奖学金', '科研', '论文', '专利'], trait: 'action', boost: 15 },
    { keywords: ['法学', '模拟法庭', '辩论', '演讲', '法律', '合规'], trait: 'mentality', boost: 10 },
    { keywords: ['考研', '考公', '托福', '雅思', '四六级', '英语'], trait: 'knowledge', boost: 8 },
    { keywords: ['运动', '健身', '跑步', '篮球', '足球', '游泳'], trait: 'action', boost: 8 }
  ],

  /**
   * 从简历数据提取关键词集合
   * @returns {string[]} 提取到的关键词列表
   */
  extractResumeKeywords() {
    if (!this.resumeData) return [];
    
    // 合并所有简历字段
    const fullText = Object.values(this.resumeData).join(' ').toLowerCase();
    const keywords = new Set();

    // 技术关键词
    const techPatterns = [
      'python', 'java', 'c++', 'cpp', 'javascript', 'typescript', 'go', 'rust',
      'react', 'vue', 'angular', 'node', 'express', 'django', 'flask', 'spring',
      'docker', 'kubernetes', 'k8s', 'linux', 'git', 'sql', 'mysql', 'mongodb',
      'redis', '算法', '数据结构', '机器学习', '深度学习', 'ai', '人工智能',
      'tensorflow', 'pytorch', '前端', '后端', '全栈', '客户端', 'android', 'ios',
      '编程', '代码', '开发', '工程'
    ];
    techPatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    // 产品关键词
    const prodPatterns = [
      '产品', '策划', '需求', 'prd', '用户研究', '竞品', '原型', 'axure',
      'figma', '用户体验', '产品经理', '增长', '商业分析'
    ];
    prodPatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    // 设计关键词
    const designPatterns = [
      '设计', 'ui', 'ux', '交互', '视觉', 'figma', 'sketch', 'ps', 'photoshop',
      'illustrator', '平面', '插画', '动画', '品牌', '配色', '用户界面'
    ];
    designPatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    // 法学关键词
    const lawPatterns = [
      '法学', '法律', '法务', '合规', '知识产权', '专利', '版权', '商标',
      '合同法', '公司法', '刑法', '民法', '模拟法庭', '律师', '司法'
    ];
    lawPatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    // 传媒关键词
    const mediaPatterns = [
      '传媒', '新闻', '传播', '新媒体', '内容', '文案', '编辑', '写作',
      '短视频', '公众号', '自媒体', '公关', '品牌', '营销', '广告'
    ];
    mediaPatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    // 金融关键词
    const financePatterns = [
      '金融', '经济', '会计', '财务', '投资', '证券', '银行', '保险', '风控'
    ];
    financePatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    // 数据关键词
    const dataPatterns = [
      '数据', '统计学', 'sql', 'excel', 'tableau', 'powerbi', 'spss',
      '爬虫', '数据挖掘', '数据仓库', '可视化', '数据分析'
    ];
    dataPatterns.forEach(k => { if (fullText.includes(k)) keywords.add(k); });

    return [...keywords];
  },

  /**
   * 根据简历关键词更新企鹅traits
   */
  updatePenguinTraitsFromResume() {
    if (!this.resumeData) return;
    
    const keywords = this.extractResumeKeywords();
    const fullText = Object.values(this.resumeData).join(' ').toLowerCase();
    const traitBoosts = { knowledge: 0, creativity: 0, social: 0, action: 0, mentality: 0 };

    // 遍历trait映射
    this.RESUME_TRAIT_MAP.forEach(rule => {
      const matched = rule.keywords.some(k => fullText.includes(k.toLowerCase()));
      if (matched) {
        traitBoosts[rule.trait] = Math.max(traitBoosts[rule.trait], rule.boost);
      }
    });

    // 应用traits加权（取较大值，不覆盖已有的高属性）
    Object.keys(traitBoosts).forEach(k => {
      if (traitBoosts[k] > 0) {
        this.penguinData.attributes[k] = Math.min(100, Math.max(
          this.penguinData.attributes[k],
          traitBoosts[k]
        ));
      }
    });

    // 重新计算exp
    this.penguinData.exp = ['knowledge', 'creativity', 'social', 'action', 'mentality']
      .reduce((sum, dim) => sum + this.penguinData.attributes[dim], 0);

    return keywords;
  },

  /**
   * 根据简历技能匹配岗位推荐
   * @returns {Array} 推荐岗位列表 [{ category, icon, jobs: [{name, direction, desc, url, score}] }]
   */
  getJobRecommendations() {
    if (!this.resumeData) return [];

    const keywords = this.extractResumeKeywords();
    const fullText = Object.values(this.resumeData).join(' ').toLowerCase();
    const categoryScores = {};

    // 计算每个岗位类别的匹配得分
    this.SKILL_JOB_MAP.forEach(rule => {
      const matchCount = rule.keywords.filter(k => fullText.includes(k.toLowerCase())).length;
      if (matchCount > 0) {
        categoryScores[rule.category] = (categoryScores[rule.category] || 0) + matchCount * rule.weight;
      }
    });

    // 按得分排序
    const sorted = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // 最多推荐3个类别

    if (sorted.length === 0) return [];

    const maxScore = sorted[0][1];
    
    return sorted.map(([catKey, score]) => {
      const cat = this.JOB_CATEGORIES[catKey];
      if (!cat) return null;
      
      const normalizedScore = Math.min(100, Math.round((score / maxScore) * 100));
      
      return {
        category: cat.name,
        icon: cat.icon,
        score: normalizedScore,
        jobs: cat.jobs.map(j => ({
          ...j,
          score: normalizedScore
        }))
      };
    }).filter(Boolean);
  },

  /**
   * 渲染简历页底部岗位推荐卡片
   */
  renderJobRecommendations() {
    const section = document.getElementById('job-recommend-section');
    const list = document.getElementById('job-recommend-list');
    if (!section || !list) return;

    const recommendations = this.getJobRecommendations();

    if (recommendations.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    
    let html = '';
    recommendations.forEach(rec => {
      rec.jobs.forEach(job => {
        html += `
          <div class="job-card">
            <div class="job-icon">${rec.icon}</div>
            <div class="job-info">
              <div class="job-name">${job.name}</div>
              <div class="job-direction">${job.direction}</div>
              <div class="job-desc">${job.desc}</div>
            </div>
            <div class="match-score">
              匹配度
              <div class="score-bar"><span class="score-fill" style="width:${rec.score}%"></span></div>
            </div>
            <a class="job-link" href="${job.url}" target="_blank" rel="noopener">去官网查看 ↗</a>
          </div>
        `;
      });
    });

    list.innerHTML = html;
  },

  /**
   * 构建简历驱动的对话上下文（用于AI系统提示词）
   */
  buildResumeContextForChat() {
    if (!this.resumeData) return '';
    
    const parts = [];
    const r = this.resumeData;
    
    if (r.school && r.school !== 'XX大学 · XX专业' && r.school.trim()) {
      parts.push(`学校/专业：${r.school}`);
    }
    if (r.languages && r.languages !== '如：Python、JavaScript、C++...' && r.languages.trim()) {
      parts.push(`编程语言：${r.languages}`);
    }
    if (r.frameworks && r.frameworks !== '如：React、Vue、Git、Docker...' && r.frameworks.trim()) {
      parts.push(`框架工具：${r.frameworks}`);
    }
    if (r.projectName && r.projectName !== '项目名称' && r.projectName.trim()) {
      parts.push(`项目经验：${r.projectName}`);
    }
    if (r.awards && r.awards !== '如：校级奖学金、竞赛获奖...' && r.awards.trim()) {
      parts.push(`获奖经历：${r.awards}`);
    }
    if (r.courses && r.courses !== '如：数据结构、操作系统、计算机网络...' && r.courses.trim()) {
      parts.push(`相关课程：${r.courses}`);
    }

    if (parts.length === 0) return '';

    // 检测简历中的特殊经历关键词
    const fullText = Object.values(this.resumeData).join(' ');
    const specialTriggers = [];
    if (/模拟法庭/.test(fullText)) specialTriggers.push('用户有模拟法庭经历，面试时可能会被深挖');
    if (/竞赛|比赛|ACM|数学建模/.test(fullText)) specialTriggers.push('用户有竞赛经历，可以聊聊备赛心得');
    if (/社团|学生会/.test(fullText)) specialTriggers.push('用户有学生组织经历，体现了领导力和社交能力');
    if (/实习/.test(fullText)) specialTriggers.push('用户有实习经历，可以聊聊实习中的收获');

    let context = `\n\n【用户简历信息】\n${parts.join('\n')}`;
    if (specialTriggers.length > 0) {
      context += `\n\n【对话提示】\n${specialTriggers.join('\n')}\n在对话中自然提及这些经历，引导用户展开说说。`;
    }
    
    return context;
  },

  /**
   * 简历更新后的同步刷新（traits + 岗位推荐 + 通知）
   */
  syncFromResumeUpdate() {
    // 1. 更新企鹅traits
    const keywords = this.updatePenguinTraitsFromResume();
    this.saveData();
    
    // 2. 刷新岗位推荐
    this.renderJobRecommendations();
    
    // 3. 更新企鹅视图
    UI.updatePenguinView(this.penguinData);
    if (this.appState.currentPage === 'main') {
      this.rerenderPenguin();
    }

  },

  /**
   * 获取含简历引导的推荐问题
   */
  getResumeGuidedQuestions() {
    const questions = [];
    
    if (!this.resumeData) return questions;

    const fullText = Object.values(this.resumeData).join(' ').toLowerCase();

    // 技术类引导
    if (/python|java|c\+\+|编程|代码|算法|前端|后端/.test(fullText)) {
      questions.push({ q: '聊聊我的技术栈怎么提升', icon: '💻' });
      questions.push({ q: '面试技术岗要注意什么', icon: '🎯' });
    }

    // 法学类引导
    if (/法学|法律|法务|合规|模拟法庭/.test(fullText)) {
      questions.push({ q: '你模拟法庭的经历可以展开说说', icon: '⚖️' });
      questions.push({ q: '法学生怎么准备腾讯法务面试', icon: '📋' });
    }

    // 产品类引导
    if (/产品|策划|需求|用户研究/.test(fullText)) {
      questions.push({ q: '产品经理面试常问什么', icon: '📱' });
    }

    // 设计类引导
    if (/设计|ui|ux|视觉|figma/.test(fullText)) {
      questions.push({ q: '设计师作品集怎么准备', icon: '🎨' });
    }

    // 通用引导
    questions.push({ q: '去腾讯校招官网看看', icon: '🎯' });
    questions.push({ q: '了解腾讯的业务', icon: '🏢' });

    return questions.slice(0, 5);
  },

  // ============================================
  //  设置弹窗（API 配置）
  // ============================================
  handleSettingsOpen() {
    UI.showSettingsModal(
      this.userConfig.apiKey || '',
      this.userConfig.baseUrl || '',
      this.userConfig.model || ''
    );
  },

  handleSettingsSave(apiKey, baseUrl, model) {
    // 保存配置
    this.userConfig.apiKey = apiKey;
    if (baseUrl) this.userConfig.baseUrl = baseUrl;
    if (model) this.userConfig.model = model;

    // 同步更新 ChatEngine 运行时配置
    if (typeof ChatEngine !== 'undefined') {
      ChatEngine.syncConfig(this.userConfig);
    }

    this.saveData();
    UI.hideSettingsModal();

    // 移除聊天内的 API 提示气泡
    this.hideApiKeyBanner();

    // 成功反馈
    const hasKey = apiKey.length > 0;
    UI.showToast(hasKey ? '✅ API 配置已保存，现在可以开始 AI 对话了' : '✅ 配置已清空', 'success');
  },

  /**
   * 活动系统 Toast 通知
   * @param {Array} triggeredActivities - 触发的活动
   * @param {Array} newBadges - 新解锁徽章
   * @param {Array} dailyTaskCompleted - 完成的每日任务
   */
  _showActivityToast(triggeredActivities, newBadges, dailyTaskCompleted) {
    // 活动触发通知
    if (triggeredActivities && triggeredActivities.length > 0) {
      const names = triggeredActivities.map(a => a.name).join(' ');
      setTimeout(() => UI.showToast(`🎉 触发活动：${names}`, 'success'), 300);
    }

    // 新徽章解锁通知
    if (newBadges && newBadges.length > 0) {
      const badgeNames = newBadges.map(b => `${b.icon}${b.name}`).join(' ');
      setTimeout(() => UI.showToast(`🏅 解锁徽章：${badgeNames}`, 'success'), 800);
    }

    // 每日任务完成通知
    if (dailyTaskCompleted && dailyTaskCompleted.length > 0) {
      const taskNames = dailyTaskCompleted.map(t => `${t.icon}${t.name}`).join(' ');
      setTimeout(() => UI.showToast(`✅ 任务完成：${taskNames}`, 'success'), 1300);
    }

    // 保存会话状态
    ActivitySystem.saveSessionState();
  },

  // ============================================
  //  API Key 引导系统（三步向导 + Banner + 验证）
  // ============================================

  /** 检测 API Key 状态，决定是否显示引导或 Banner */
  checkApiKeyOnStart() {
    if (!this.userConfig.apiKey) {
      // 回访用户不再弹全屏引导，自动标记为已跳过，只显示顶部轻量 Banner
      localStorage.setItem('penguin_api_guide_skipped', '1');
      this._showApiKeyBanner();
    }
  },

  /** 显示 API Key 引导浮层 */
  showApiGuide() {
    const overlay = document.getElementById('apiguide-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    // 重置到 Step 1
    this._apiGuideStep = 1;
    this._renderGuideStep(1);

    // 事件绑定
    this._bindApiGuideEvents();
  },

  /** 关闭 API 引导 */
  closeApiGuide() {
    const overlay = document.getElementById('apiguide-overlay');
    if (overlay) overlay.style.display = 'none';
    this._unbindApiGuideEvents();
  },

  /** 跳过 API 引导 */
  skipApiGuide() {
    localStorage.setItem('penguin_api_guide_skipped', '1');
    this.closeApiGuide();
    this._showApiKeyBanner();
  },

  /** 显示未配置 Key 的聊天内提示（不再使用全局 Banner，改为聊天内轻量提示） */
  _showApiKeyBanner() {
    if (this.userConfig.apiKey) return; // 已经有 Key 不显示
    // 不再弹全局 Banner，在进入聊天界面时自动显示内嵌提示
  },

  /** 隐藏 API Key Banner（移除聊天内的提示气泡） */
  hideApiKeyBanner() {
    const hint = document.getElementById('apikey-chat-hint');
    if (hint) hint.remove();
  },

  /** 渲染当前引导步骤 */
  _renderGuideStep(step) {
    // 更新 step 指示器
    document.querySelectorAll('.apiguide-step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i + 1 === step) el.classList.add('active');
      if (i + 1 < step) el.classList.add('done');
    });

    // 切换 body
    document.querySelectorAll('.apiguide-body').forEach(el => el.classList.remove('active'));
    const body = document.getElementById(`apiguide-step${step}`);
    if (body) body.classList.add('active');

    // 切换底部按钮
    const btnPrev = document.getElementById('apiguide-btn-prev');
    const btnNext = document.getElementById('apiguide-btn-next');
    const btnDone = document.getElementById('apiguide-btn-done');
    const btnSkip = document.getElementById('apiguide-btn-skip');

    if (btnPrev) btnPrev.style.display = step > 1 ? '' : 'none';
    if (btnNext) btnNext.style.display = step < 3 ? '' : 'none';
    if (btnDone) btnDone.style.display = step === 3 ? '' : 'none';
    if (btnSkip) btnSkip.style.display = ''; // skip always visible

    this._apiGuideStep = step;
  },

  /** 绑定引导页事件 */
  _bindApiGuideEvents() {
    // 先解绑避免重复
    this._unbindApiGuideEvents();

    this._apiGuideBackdropHandler = () => this.skipApiGuide();
    const backdrop = document.getElementById('apiguide-backdrop');
    if (backdrop) backdrop.addEventListener('click', this._apiGuideBackdropHandler);

    this._apiGuideNextHandler = () => {
      if (this._apiGuideStep < 3) {
        this._renderGuideStep(this._apiGuideStep + 1);
      }
    };
    const btnNext = document.getElementById('apiguide-btn-next');
    if (btnNext) btnNext.addEventListener('click', this._apiGuideNextHandler);

    this._apiGuidePrevHandler = () => {
      if (this._apiGuideStep > 1) {
        this._renderGuideStep(this._apiGuideStep - 1);
      }
    };
    const btnPrev = document.getElementById('apiguide-btn-prev');
    if (btnPrev) btnPrev.addEventListener('click', this._apiGuidePrevHandler);

    this._apiGuideSkipHandler = () => this.skipApiGuide();
    const btnSkip = document.getElementById('apiguide-btn-skip');
    if (btnSkip) btnSkip.addEventListener('click', this._apiGuideSkipHandler);

    this._apiGuideDoneHandler = () => this._handleApiGuideVerify();
    const btnDone = document.getElementById('apiguide-btn-done');
    if (btnDone) btnDone.addEventListener('click', this._apiGuideDoneHandler);

    // Step3: toggle password visibility
    this._apiGuideToggleHandler = () => {
      const input = document.getElementById('apiguide-key-input');
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    };
    const toggleBtn = document.getElementById('apiguide-toggle-key');
    if (toggleBtn) toggleBtn.addEventListener('click', this._apiGuideToggleHandler);
  },

  /** 解绑引导页事件 */
  _unbindApiGuideEvents() {
    const backdrop = document.getElementById('apiguide-backdrop');
    if (backdrop && this._apiGuideBackdropHandler) {
      backdrop.removeEventListener('click', this._apiGuideBackdropHandler);
    }
    const btnNext = document.getElementById('apiguide-btn-next');
    if (btnNext && this._apiGuideNextHandler) {
      btnNext.removeEventListener('click', this._apiGuideNextHandler);
    }
    const btnPrev = document.getElementById('apiguide-btn-prev');
    if (btnPrev && this._apiGuidePrevHandler) {
      btnPrev.removeEventListener('click', this._apiGuidePrevHandler);
    }
    const btnSkip = document.getElementById('apiguide-btn-skip');
    if (btnSkip && this._apiGuideSkipHandler) {
      btnSkip.removeEventListener('click', this._apiGuideSkipHandler);
    }
    const btnDone = document.getElementById('apiguide-btn-done');
    if (btnDone && this._apiGuideDoneHandler) {
      btnDone.removeEventListener('click', this._apiGuideDoneHandler);
    }
    const toggleBtn = document.getElementById('apiguide-toggle-key');
    if (toggleBtn && this._apiGuideToggleHandler) {
      toggleBtn.removeEventListener('click', this._apiGuideToggleHandler);
    }
  },

  /** Step 3: 验证用户输入的 API Key */
  async _handleApiGuideVerify() {
    const input = document.getElementById('apiguide-key-input');
    const statusEl = document.getElementById('apiguide-verify-status');
    const btnDone = document.getElementById('apiguide-btn-done');
    const key = input ? input.value.trim() : '';

    if (!key) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = 'apiguide-verify-status error';
        statusEl.textContent = '请先粘贴 API Key';
      }
      return;
    }

    // 显示 loading
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.className = 'apiguide-verify-status checking';
      statusEl.textContent = '🐧 正在验证连接...';
    }
    if (btnDone) btnDone.disabled = true;

    try {
      const result = await ChatEngine.validateApiKey(key);

      if (result.success) {
        // 保存到配置
        this.userConfig.apiKey = key;
        this.saveData();

        if (statusEl) {
          statusEl.className = 'apiguide-verify-status success';
          statusEl.textContent = '✅ ' + result.message;
        }

        // 隐藏 Banner
        this.hideApiKeyBanner();

        // 1.5 秒后关闭引导
        setTimeout(() => {
          this.closeApiGuide();
          if (typeof UI !== 'undefined') UI.showToast('✅ API Key 配置成功，企鹅可以聊天啦！', 'success');
        }, 1500);
      } else {
        if (statusEl) {
          statusEl.className = 'apiguide-verify-status error';
          statusEl.textContent = '❌ ' + result.message;
        }
        if (btnDone) btnDone.disabled = false;
      }
    } catch (err) {
      if (statusEl) {
        statusEl.className = 'apiguide-verify-status error';
        statusEl.textContent = '❌ 验证出错: ' + err.message;
      }
      if (btnDone) btnDone.disabled = false;
    }
  },

  /**
   * 在设置页验证 Key（由 UI 调用）
   */
  async handleSettingsVerify() {
    const keyInput = document.getElementById('settings-api-key');
    const statusEl = document.getElementById('settings-key-status');
    const verifyBtn = document.getElementById('settings-verify-btn');
    const key = keyInput ? keyInput.value.trim() : '';

    if (!key) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.className = 'settings-key-status error';
        statusEl.textContent = '请先输入 API Key';
      }
      return;
    }

    // 显示 loading
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.className = 'settings-key-status checking';
      statusEl.textContent = '🐧 正在验证连接...';
    }
    if (verifyBtn) verifyBtn.classList.add('loading');

    try {
      const result = await ChatEngine.validateApiKey(key);

      if (statusEl) {
        statusEl.className = 'settings-key-status ' + (result.success ? 'success' : 'error');
        statusEl.textContent = (result.success ? '✅ ' : '❌ ') + result.message;
      }
    } catch (err) {
      if (statusEl) {
        statusEl.className = 'settings-key-status error';
        statusEl.textContent = '❌ 验证出错: ' + err.message;
      }
    } finally {
      if (verifyBtn) verifyBtn.classList.remove('loading');
    }
  }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
