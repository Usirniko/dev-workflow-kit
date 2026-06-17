/**
 * AI企鹅养成 - UI交互模块
 * 负责页面切换、动画、弹窗、聊天态/首页态切换等交互逻辑
 */
const UI = {
  elements: {},
  currentTab: 'chat',   // 当前首页选项卡

  // 缓存DOM元素
  cacheElements() {
    this.elements = {
      // 页面容器
      eggPage: document.getElementById('egg-page'),
      mainPage: document.getElementById('main-page'),
      resumePage: document.getElementById('resume-page'),
      
      // 领蛋页
      eggContainer: document.getElementById('egg-container'),
      claimBtn: document.getElementById('claim-btn'),
      
      // 年级弹窗
      gradeModal: document.getElementById('grade-modal'),
      gradeOverlay: document.getElementById('grade-overlay'),
      gradeCards: document.querySelectorAll('.grade-card'),
      
      // 主界面选项卡
      tabBar: document.getElementById('home-tab-bar'),
      tabItems: document.querySelectorAll('.tab-item'),
      
      // 首页态
      homeView: document.getElementById('home-view'),
      suggestedQuestions: document.getElementById('suggested-questions'),
      chatStarterArea: document.getElementById('chat-starter-area'),
      
      // 首页企鹅展示区
      penguinLevel: document.getElementById('penguin-level'),
      penguinStage: document.getElementById('penguin-stage'),
      expBar: document.getElementById('exp-bar'),
      expText: document.getElementById('exp-text'),
      
      // 聊天覆盖层
      chatOverlay: document.getElementById('chat-overlay'),
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      chatSendBtn: document.getElementById('chat-send-btn'),
      chatTyping: document.getElementById('chat-typing'),
      chatMiniPenguin: document.getElementById('chat-mini-penguin'),
      btnBackChat: document.getElementById('btn-back-chat'),
      
      // 子页面
      subDiaryPage: document.getElementById('sub-diary-page'),
      subResumePage: document.getElementById('sub-resume-page'),
      subKnowledgePage: document.getElementById('sub-knowledge-page'),
      subGradePage: document.getElementById('sub-grade-page'),
      subVolunteerPage: document.getElementById('sub-volunteer-page'),
      subGradeDetailPage: document.getElementById('sub-grade-detail-page'),
      
      // 企鹅详情
      penguinDetailCanvas: document.getElementById('penguin-detail-canvas'),
      attrKnowledge: document.getElementById('attr-knowledge'),
      attrCreativity: document.getElementById('attr-creativity'),
      attrSocial: document.getElementById('attr-social'),
      attrAction: document.getElementById('attr-action'),
      attrMentality: document.getElementById('attr-mentality'),
      attrKnowledgeBar: document.getElementById('attr-knowledge-bar'),
      attrCreativityBar: document.getElementById('attr-creativity-bar'),
      attrSocialBar: document.getElementById('attr-social-bar'),
      attrActionBar: document.getElementById('attr-action-bar'),
      attrMentalityBar: document.getElementById('attr-mentality-bar'),
      
      // 简历页（初始流程用）
      btnResumeSkip: document.getElementById('btn-resume-skip'),
      btnResumeEnter: document.getElementById('btn-resume-enter'),
      resumeFields: {
        name: document.getElementById('resume-name'),
        school: document.getElementById('resume-school'),
        contact: document.getElementById('resume-contact'),
        gpa: document.getElementById('resume-gpa'),
        courses: document.getElementById('resume-courses'),
        projectName: document.getElementById('resume-project-name'),
        projectDesc: document.getElementById('resume-project-desc'),
        languages: document.getElementById('resume-languages'),
        frameworks: document.getElementById('resume-frameworks'),
        awards: document.getElementById('resume-awards')
      },
      
      // 命名卡片
      namingCardOverlay: document.getElementById('naming-card-overlay'),
      namingInput: document.getElementById('naming-input'),
      namingBtnSkip: document.getElementById('naming-btn-skip'),
      namingBtnConfirm: document.getElementById('naming-btn-confirm'),
      
      // 企鹅名字显示
      nameEditorText: document.getElementById('name-editor-text'),
      nameEditorGrade: document.getElementById('name-editor-grade'),
      nameEditorEditBtn: document.getElementById('name-editor-edit-btn'),

      // 更多菜单
      nameEditorMoreBtn: document.getElementById('name-editor-more-btn'),
      moreMenu: document.getElementById('more-menu'),

      // 年级切换弹窗
      gradeSwitchModal: document.getElementById('grade-switch-modal'),
      gradeSwitchOverlay: document.getElementById('grade-switch-overlay'),
      gradeSwitchGrid: document.getElementById('grade-switch-grid'),

      // 进化全屏遮罩
      evolutionFullscreen: document.getElementById('evolution-fullscreen'),
      evolutionCelebrate: document.getElementById('evolution-celebrate'),
      evolutionPenguinCanvas: document.getElementById('evolution-penguin-canvas'),

      // FAB按钮
      btnNewKnowledge: document.getElementById('btn-new-knowledge'),

      // 新建弹窗
      newEntryModal: document.getElementById('new-entry-modal')
    };
  },

  // ==========================================
  //  页面切换
  // ==========================================
  showEggPage() {
    this.ensureCleanState('egg');
    if (this.elements.eggPage) {
      this.elements.eggPage.style.display = 'flex';
    }
  },

  showMainPage() {
    this.ensureCleanState('main');
    if (this.elements.mainPage) {
      this.elements.mainPage.style.display = 'flex';
      // 默认显示首页态（不含聊天覆盖层，无 tab 高亮）
      this.showHomeView();
      this.clearHomeTab();
    }
  },

  /** 统一页面状态清理：确保只有目标页面可见，其余全部隐藏 */
  ensureCleanState(page) {
    const pages = ['eggPage', 'mainPage', 'resumePage'];
    pages.forEach(key => {
      const el = this.elements[key];
      if (el) el.style.display = 'none';
    });

    // 清理所有弹窗/浮层
    const modals = [
      this.elements.gradeModal,
      this.elements.gradeSwitchModal,
      document.getElementById('grade-switch-modal'),
      document.getElementById('settings-modal'),
      document.getElementById('dressup-overlay'),
      document.getElementById('timeline-overlay'),
      document.getElementById('new-entry-modal')
    ];
    modals.forEach(m => { if (m) { m.style.display = 'none'; m.classList.remove('active'); } });

    // 关闭聊天覆盖层（关键：防止聊天界面泄漏到其他页面）
    this.closeChatOverlay();

    // 关闭所有子页面
    this.closeAllSubPages();

    // 关闭更多菜单
    this.hideMoreMenu();
  },

  // ==========================================
  //  首页态 vs 聊天态切换
  // ==========================================

  // 显示首页态
  showHomeView() {
    this.elements.homeView.style.display = 'flex';
    // 强制关闭聊天覆盖层，确保不会泄漏
    this.elements.chatOverlay.classList.remove('active');
    this.elements.chatOverlay.style.transform = '';
    this.closeAllSubPages();
    // 重置聊天起始卡片区可见性
    if (this.elements.chatStarterArea) {
      this.elements.chatStarterArea.style.display = '';
    }
  },

  // ==========================================
  //  聊天覆盖层（单例）—— 两个入口共享同一实例
  //  通过 CSS transform 动画控制显示/隐藏
  // ==========================================

  // 打开聊天覆盖层（幂等操作：重复调用不会创建多个实例）
  openChatOverlay() {
    if (this.isChatOpen()) return; // 已是打开状态，跳过
    // 清除 closeChatOverlay 设置的内联 transform，让 CSS class 接管
    this.elements.chatOverlay.style.transform = '';
    this.elements.chatOverlay.classList.add('active');
    // 聚焦由 openChatFromHome 的 setTimeout 回调处理，这里不再自动聚焦
  },

  // 关闭聊天覆盖层
  closeChatOverlay() {
    this.elements.chatOverlay.classList.remove('active');
    // 同步清除内联 transform，防止 CSS transition 冲突
    this.elements.chatOverlay.style.transform = '';
  },

  // 是否处于聊天态
  isChatOpen() {
    return this.elements.chatOverlay.classList.contains('active');
  },

  // ==========================================
  //  选项卡切换（仅更新高亮，不操作子页面）
  // ==========================================
  switchHomeTab(tab) {
    this.currentTab = tab;
    this.elements.tabItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });
  },

  /** 清除所有 tab 高亮（返回首页时使用，所有选项样式一致） */
  clearHomeTab() {
    this.currentTab = null;
    this.elements.tabItems.forEach(item => {
      item.classList.remove('active');
    });
  },

  // ==========================================
  //  定向导航到子页面（关闭其他 → 打开目标）
  //  用于 Tab 点击等"正向跳转"场景
  // ==========================================
  navigateToSubPage(tab) {
    // 关闭聊天覆盖层
    this.closeChatOverlay();
    // 先关闭所有子页面
    this.closeAllSubPages();
    // 更新 Tab 高亮
    this.switchHomeTab(tab);
    // 打开目标子页面（从右侧滑入）
    const page = document.getElementById('sub-' + tab + '-page');
    if (page) {
      // 隐藏 homeView 避免透过子页面可见
      this.elements.homeView.style.display = 'none';
      page.classList.add('active');
    }
  },

  // 打开子页面（通用方法，先关后开）
  openSubPage(pageId) {
    this.closeAllSubPages();
    this.elements.homeView.style.display = 'none';
    const page = document.getElementById('sub-' + pageId + '-page');
    if (page) {
      page.classList.add('active');
    }
  },

  // 关闭所有子页面
  closeAllSubPages() {
    [
      this.elements.subDiaryPage,
      this.elements.subResumePage,
      this.elements.subKnowledgePage,
      this.elements.subGradePage,
      this.elements.subVolunteerPage,
      this.elements.subGradeDetailPage
    ].forEach(page => {
      if (page) page.classList.remove('active');
    });
  },

  // 返回首页视图（关闭所有覆盖层，显示首页）
  goToHomeView() {
    this.showHomeView();
  },

  // ==========================================
  //  年级选择弹窗
  // ==========================================
  showGradeModal() {
    this.elements.gradeModal.style.display = 'flex';
    requestAnimationFrame(() => {
      this.elements.gradeModal.classList.add('active');
    });
  },

  hideGradeModal() {
    this.elements.gradeModal.classList.remove('active');
    setTimeout(() => {
      this.elements.gradeModal.style.display = 'none';
    }, 300);
  },

  // ==========================================
  //  企鹅信息展示
  // ==========================================
  updatePenguinView(penguinData) {
    const stageNames = ['', '🥚 好奇探索期', '🐣 方向探索期', '🐧 实习准备期', '🚀 求职冲刺期'];
    const LEVEL_TITLES = ['初生蛋', '好奇蛋', '🐣 破壳企鹅', '探索企鹅', '🐧 实习企鹅', '进阶企鹅', '🚀 冲刺企鹅', '职场企鹅', '精英企鹅', '🏆 传奇企鹅'];
    const title = penguinData.levelTitle || LEVEL_TITLES[penguinData.level - 1] || '初生蛋';
    
    // 名字由 updatePenguinNameDisplay 管理，这里不再设置
    this.elements.penguinLevel.textContent = `Lv.${penguinData.level} · ${title}`;
    this.elements.penguinStage.textContent = stageNames[penguinData.stage];

    // 经验条
    const levelThresholds = [0, 50, 100, 200, 300, 450, 600, 800, 1000, 1500];
    const currentMax = levelThresholds[Math.min(penguinData.level, levelThresholds.length - 1)] || 1500;
    const prevMax = levelThresholds[penguinData.level - 1] || 0;
    const progress = ((penguinData.exp - prevMax) / (currentMax - prevMax)) * 100;
    this.elements.expBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
    this.elements.expText.textContent = `${penguinData.exp} / ${currentMax}`;

    // 属性条
    const attrs = [
      { el: this.elements.attrKnowledgeBar, val: penguinData.attributes.knowledge },
      { el: this.elements.attrCreativityBar, val: penguinData.attributes.creativity },
      { el: this.elements.attrSocialBar, val: penguinData.attributes.social },
      { el: this.elements.attrActionBar, val: penguinData.attributes.action },
      { el: this.elements.attrMentalityBar, val: penguinData.attributes.mentality }
    ];
    attrs.forEach(({ el, val }) => {
      if (el) el.style.width = val + '%';
    });
    if (this.elements.attrKnowledge) this.elements.attrKnowledge.textContent = penguinData.attributes.knowledge;
    if (this.elements.attrCreativity) this.elements.attrCreativity.textContent = penguinData.attributes.creativity;
    if (this.elements.attrSocial) this.elements.attrSocial.textContent = penguinData.attributes.social;
    if (this.elements.attrAction) this.elements.attrAction.textContent = penguinData.attributes.action;
    if (this.elements.attrMentality) this.elements.attrMentality.textContent = penguinData.attributes.mentality;
  },

  // ==========================================
  //  聊天消息
  // ==========================================
  addChatMessage(role, content, attributeChanges = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = UI._formatMessageHTML(content);
    
    msgDiv.appendChild(bubble);

    if (role === 'user' && attributeChanges) {
      const changes = [];
      if (attributeChanges.knowledge > 0) changes.push(`📚+${attributeChanges.knowledge}`);
      if (attributeChanges.creativity > 0) changes.push(`🎨+${attributeChanges.creativity}`);
      if (attributeChanges.social > 0) changes.push(`💬+${attributeChanges.social}`);
      if (attributeChanges.action > 0) changes.push(`⚡+${attributeChanges.action}`);
      if (attributeChanges.mentality > 0) changes.push(`💪+${attributeChanges.mentality}`);
      
      if (changes.length > 0) {
        const changesDiv = document.createElement('div');
        changesDiv.className = 'attribute-changes';
        changesDiv.textContent = changes.join(' ');
        msgDiv.appendChild(changesDiv);
      }
    }

    this.elements.chatMessages.appendChild(msgDiv);
    this.scrollChatToBottom();
    
    requestAnimationFrame(() => {
      msgDiv.classList.add('visible');
    });
  },

  showTyping() {
    this.elements.chatTyping.style.display = 'flex';
    this.scrollChatToBottom();
    this.elements.chatSendBtn.disabled = true;
    this.elements.chatInput.disabled = true;
  },

  hideTyping() {
    this.elements.chatTyping.style.display = 'none';
    this.elements.chatSendBtn.disabled = false;
    this.elements.chatInput.disabled = false;
    this.elements.chatInput.focus();
  },

  // ==========================================
  //  流式消息（打字机效果）
  // ==========================================

  _streamingMsg: null,
  _streamingBubble: null,

  /**
   * 创建一个空的 AI 消息气泡，用于流式追加文本
   * @returns {HTMLElement} 消息气泡元素
   */
  createStreamingMessage() {
    this.hideTyping();
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message assistant visible';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble streaming';
    bubble.textContent = '';
    
    msgDiv.appendChild(bubble);
    this.elements.chatMessages.appendChild(msgDiv);
    
    this._streamingMsg = msgDiv;
    this._streamingBubble = bubble;
    
    this.scrollChatToBottom();
    return bubble;
  },

  /**
   * 向当前流式消息气泡追加文本
   * @param {string} text - 要追加的文本
   */
  appendToStreamingMessage(text) {
    if (this._streamingBubble) {
      this._streamingBubble.textContent += text;
      this.scrollChatToBottom();
    }
  },

  /**
   * 完成流式消息，清理引用
   * @returns {string} 完整的消息文本
   */
  finishStreamingMessage() {
    if (this._streamingBubble) {
      this._streamingBubble.classList.remove('streaming');
    }
    const fullText = this._streamingBubble ? this._streamingBubble.textContent : '';
    // 流式完成后将换行转为段落格式
    if (this._streamingBubble && fullText) {
      this._streamingBubble.innerHTML = UI._formatMessageHTML(fullText);
    }
    this._streamingMsg = null;
    this._streamingBubble = null;
    this.elements.chatSendBtn.disabled = false;
    this.elements.chatInput.disabled = false;
    this.elements.chatInput.focus();
    return fullText;
  },

  /**
   * 将消息内容转为带段落格式的 HTML
   * 自动识别列表项（emoji/符号开头）不加缩进，正文段落加首行缩进
   * @param {string} content - 原始消息文本
   * @returns {string} HTML 字符串
   */
  _formatMessageHTML(content) {
    if (!content) return '';
    // 按连续空行拆段
    const paras = content.split(/\n\n+/);
    return paras.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      // 检测列表项：以 emoji / 符号 / 数字序号开头
      const isListItem = /^[\p{Emoji}\p{Extended_Pictographic}\-•·\d+\.、①②③④⑤⑥⑦⑧⑨⑩★✅❌✔️☑️▪️▸►▹▪]/u.test(trimmed);
      const cls = isListItem ? 'li' : 'para';
      const inner = trimmed.replace(/\n/g, '<br>');
      return `<p class="${cls}">${inner}</p>`;
    }).join('');
  },

  scrollChatToBottom() {
    setTimeout(() => {
      this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }, 50);
  },

  clearChatMessages() {
    this.elements.chatMessages.innerHTML = '';
  },

  restoreChatMessages(messages) {
    this.clearChatMessages();
    messages.forEach(msg => {
      this.addChatMessage(msg.role, msg.content, msg.attributeChanges);
    });
  },

  getMiniPenguinCanvas() {
    return document.getElementById('mini-penguin-canvas');
  },


  // ==========================================
  //  简历页面（初始流程用）
  // ==========================================
  showResumePage() {
    this.ensureCleanState('resume');
    this.elements.resumePage.style.display = 'flex';
  },

  hideResumePage() {
    this.elements.resumePage.style.display = 'none';
  },

  collectResumeData() {
    const data = {};
    Object.keys(this.elements.resumeFields).forEach(key => {
      const el = this.elements.resumeFields[key];
      data[key] = el ? el.value.trim() : '';
    });
    return data;
  },

  fillResumeData(data) {
    if (!data) return;
    Object.keys(data).forEach(key => {
      const el = this.elements.resumeFields[key];
      if (el && data[key] && data[key].trim()) {
        el.value = data[key];
        el.classList.add('filled');
      }
    });
  },

  setupResumeFieldListeners() {
    Object.keys(this.elements.resumeFields).forEach(key => {
      const el = this.elements.resumeFields[key];
      if (!el) return;
      el.addEventListener('input', () => {
        if (el.value.trim()) {
          el.classList.add('filled');
        } else {
          el.classList.remove('filled');
        }
      });
    });
  },

  // 兼容旧方法
  playEggDropAnimation(callback) {
    if (callback) callback();
  },

  resetEggAnimation() {
    if (window.eggCanvas) {
      window.eggCanvas.reset();
    }
    const btn = this.elements.claimBtn;
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🎁 领取我的蛋';
      btn.style.opacity = '1';
    }
  },

  switchTab(tab) {
    // 兼容旧调用：现在选项卡统一用 switchHomeTab
    this.switchHomeTab(tab);
  },

  // ==========================================
  //  命名卡片弹窗
  // ==========================================
  showNamingCard(existingName) {
    this.elements.namingInput.value = existingName || '';
    this.elements.namingCardOverlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this.elements.namingCardOverlay.classList.add('active');
      // 自动聚焦输入框
      setTimeout(() => {
        this.elements.namingInput.focus();
        if (existingName) {
          this.elements.namingInput.select();
        }
      }, 450);
    });
  },

  hideNamingCard(callback) {
    const card = this.elements.namingCardOverlay.querySelector('.naming-card');
    if (card) card.classList.add('closing');
    this.elements.namingCardOverlay.classList.remove('active');
    setTimeout(() => {
      this.elements.namingCardOverlay.style.display = 'none';
      if (card) card.classList.remove('closing');
      if (callback) callback();
    }, 280);
  },

  getNamingInput() {
    return this.elements.namingInput.value.trim();
  },

  // ==========================================
  //  更新企鹅名字显示（首页）
  // ==========================================
  updatePenguinNameDisplay(name, grade) {
    const gradeNames = {
      freshman: '大一', sophomore: '大二', junior: '大三', senior: '大四'
    };
    const gradeShort = gradeNames[grade] || '';

    // 首页企鹅名字编辑区
    if (this.elements.nameEditorText) {
      this.elements.nameEditorText.textContent = name;
    }
    if (this.elements.nameEditorGrade) {
      this.elements.nameEditorGrade.textContent = gradeShort ? '· ' + gradeShort : '';
    }
  },

  // ==========================================
  //  更多菜单（···按钮）
  // ==========================================
  toggleMoreMenu() {
    const menu = this.elements.moreMenu;
    if (!menu) return;
    const isVisible = menu.style.display !== 'none';
    menu.style.display = isVisible ? 'none' : 'block';
  },

  hideMoreMenu() {
    if (this.elements.moreMenu) {
      this.elements.moreMenu.style.display = 'none';
    }
  },

  // ==========================================
  //  年级切换弹窗
  // ==========================================
  showGradeSwitchModal(currentGrade) {
    const modal = this.elements.gradeSwitchModal;
    const grid = this.elements.gradeSwitchGrid;
    if (!modal || !grid) return;

    const gradeOrder = ['freshman', 'sophomore', 'junior', 'senior'];
    const currentIdx = gradeOrder.indexOf(currentGrade);

    const grades = [
      { key: 'freshman', emoji: '🥚', name: '大一', desc: '好奇探索期' },
      { key: 'sophomore', emoji: '🐣', name: '大二', desc: '方向探索期' },
      { key: 'junior', emoji: '🐧', name: '大三', desc: '实习准备期' },
      { key: 'senior', emoji: '🚀', name: '大四', desc: '求职冲刺期' }
    ];

    grid.innerHTML = grades.map((g, i) => {
      const isCurrent = i === currentIdx;
      return `
        <div class="grade-card" data-grade="${g.key}">
          <span class="grade-emoji">${g.emoji}</span>
          <div class="grade-name">${g.name}</div>
          <div class="grade-desc">${isCurrent ? '当前年级' : g.desc}</div>
        </div>
      `;
    }).join('');

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  },

  hideGradeSwitchModal() {
    const modal = this.elements.gradeSwitchModal;
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  },

  /**
   * 关闭装扮弹窗
   */
  hideDressUpOverlay() {
    const overlay = document.getElementById('dressup-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },

  // ==========================================
  //  进化全屏动画（年级切换用）
  // ==========================================
  showEvolutionFullscreen(gradeName, callback) {
    const overlay = this.elements.evolutionFullscreen;
    const celebrate = this.elements.evolutionCelebrate;
    if (!overlay) return;

    const gradeMessages = {
      sophomore: '你长大了 🐣',
      junior: '你变得更厉害了 🐧',
      senior: '你已经是最强企鹅了 🚀'
    };
    celebrate.textContent = gradeMessages[gradeName] || '你长大了 🐣';
    overlay.classList.add('active');

    // 在进化画布上绘制简单企鹅
    const canvas = this.elements.evolutionPenguinCanvas;
    if (canvas) {
      this._drawEvolutionPenguin(canvas, gradeName);
    }

    // 3秒后隐藏
    setTimeout(() => {
      overlay.classList.remove('active');
      if (callback) callback();
    }, 3000);
  },

  _drawEvolutionPenguin(canvas, gradeName) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    let frame = 0;
    let animId;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      const breathe = 1 + Math.sin(frame * 0.06) * 0.03;
      const bounce = Math.abs(Math.sin(frame * 0.07)) * 2;

      ctx.save();
      ctx.translate(cx, cy - bounce);
      ctx.scale(breathe, breathe);

      const s = 55;

      // 阴影
      ctx.fillStyle = ThemeColors.get().groundShadow;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.88, s * 0.5, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 脚
      ctx.fillStyle = '#F5B942';
      ctx.beginPath(); ctx.ellipse(-s * 0.2, s * 0.82, s * 0.16, s * 0.07, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.2, s * 0.82, s * 0.16, s * 0.07, 0.15, 0, Math.PI * 2); ctx.fill();

      // 身体
      const bodyGrad = ctx.createRadialGradient(-s*0.05, -s*0.1, s*0.05, 0, s*0.08, s*0.7);
      bodyGrad.addColorStop(0, '#2D2D2D');
      bodyGrad.addColorStop(0.5, '#1A1A1A');
      bodyGrad.addColorStop(1, '#0D0D0D');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.bezierCurveTo(s*0.65, -s*0.73, s*0.76, s*0.04, s*0.6, s*0.46);
      ctx.bezierCurveTo(s*0.48, s*0.74, -s*0.48, s*0.74, -s*0.6, s*0.46);
      ctx.bezierCurveTo(-s*0.76, s*0.04, -s*0.65, -s*0.73, 0, -s*0.75);
      ctx.closePath();
      ctx.fill();

      // 肚皮
      const bellyGrad = ctx.createRadialGradient(0, s*0.1, s*0.02, 0, s*0.14, s*0.44);
      bellyGrad.addColorStop(0, '#FFF');
      bellyGrad.addColorStop(0.6, '#FAFAFA');
      bellyGrad.addColorStop(1, '#EEE');
      ctx.fillStyle = bellyGrad;
      ctx.beginPath();
      ctx.moveTo(0, -s*0.28);
      ctx.bezierCurveTo(s*0.34, -s*0.26, s*0.42, s*0.18, s*0.38, s*0.48);
      ctx.bezierCurveTo(s*0.26, s*0.68, -s*0.26, s*0.68, -s*0.38, s*0.48);
      ctx.bezierCurveTo(-s*0.42, s*0.18, -s*0.34, -s*0.26, 0, -s*0.28);
      ctx.closePath();
      ctx.fill();

      // 翅膀
      ctx.fillStyle = '#1A1A1A';
      const ww = Math.sin(frame * 0.05) * s * 0.012;
      ctx.save(); ctx.translate(-s*0.54, s*0.1); ctx.rotate(-0.25 + ww*0.01);
      ctx.beginPath(); ctx.ellipse(0, 0, s*0.08, s*0.24, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(s*0.54, s*0.1); ctx.rotate(0.25 - ww*0.01);
      ctx.beginPath(); ctx.ellipse(0, 0, s*0.08, s*0.24, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();

      // 眼睛
      const eyeY = -s * 0.18;
      const es = s * 0.14;
      [[-es, eyeY], [es, eyeY]].forEach(([ex, ey]) => {
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.ellipse(ex, ey, s*0.10, s*0.115, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath(); ctx.arc(ex + s*0.02, ey + s*0.01, s*0.045, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(ex - s*0.01, ey - s*0.02, s*0.02, 0, Math.PI*2); ctx.fill();
      });

      // 嘴
      const bg = ctx.createLinearGradient(-s*0.1, s*0.06, s*0.1, s*0.14);
      bg.addColorStop(0, '#F5B942'); bg.addColorStop(0.5, '#F0A620'); bg.addColorStop(1, '#E09510');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(0, s*0.10, s*0.14, s*0.065, 0, 0, Math.PI*2); ctx.fill();

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    draw();

    // 3秒后停止
    setTimeout(() => {
      if (animId) cancelAnimationFrame(animId);
    }, 3000);
  },

  // ==========================================
  //  新建条目弹窗（知识库/志愿共用）
  // ==========================================
  showNewEntryModal(title, fields, onConfirm) {
    // 移除旧弹窗
    const old = document.getElementById('new-entry-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.className = 'new-entry-modal active';
    modal.id = 'new-entry-modal';
    modal.innerHTML = `
      <div class="new-entry-backdrop" id="new-entry-backdrop"></div>
      <div class="new-entry-sheet">
        <h3>${title}</h3>
        ${fields.map(f => `
          <div class="form-group">
            <label class="form-label">${f.label}</label>
            ${f.type === 'textarea' 
              ? `<textarea class="form-textarea" id="new-entry-${f.id}" placeholder="${f.placeholder || ''}" rows="3"></textarea>`
              : f.type === 'select'
              ? `<select class="form-select" id="new-entry-${f.id}">${(f.options||[]).map(o => `<option value="${o}">${o}</option>`).join('')}</select>`
              : f.type === 'number'
              ? `<input type="number" class="form-input" id="new-entry-${f.id}" placeholder="${f.placeholder || ''}" step="0.5" min="0">`
              : `<input type="text" class="form-input" id="new-entry-${f.id}" placeholder="${f.placeholder || ''}">`
            }
          </div>
        `).join('')}
        <div class="form-actions">
          <button class="form-btn form-btn-cancel" id="new-entry-cancel">取消</button>
          <button class="form-btn form-btn-confirm" id="new-entry-confirm">确定</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 绑定事件
    document.getElementById('new-entry-backdrop').addEventListener('click', () => {
      modal.remove();
    });
    document.getElementById('new-entry-cancel').addEventListener('click', () => {
      modal.remove();
    });
    document.getElementById('new-entry-confirm').addEventListener('click', () => {
      const data = {};
      fields.forEach(f => {
        const el = document.getElementById('new-entry-' + f.id);
        data[f.id] = el ? el.value.trim() : '';
      });
      modal.remove();
      if (onConfirm) onConfirm(data);
    });

    // 保存引用
    this.elements.newEntryModal = modal;
  },

  /** 显示目标编辑弹窗（志愿时长等可自定义目标） */
  showTargetEditModal(title, currentValue, onConfirm, onReset) {
    const old = document.getElementById('target-edit-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.className = 'new-entry-modal active';
    modal.id = 'target-edit-modal';
    modal.innerHTML = `
      <div class="new-entry-backdrop" id="target-edit-backdrop"></div>
      <div class="new-entry-sheet target-edit-sheet">
        <h3>${title}</h3>
        <div class="target-edit-row">
          <label class="form-label">目标时长（小时）</label>
          <div class="target-input-wrap">
            <input type="number" class="form-input target-input" id="target-edit-input" 
              value="${currentValue}" step="0.5" min="0.5" max="9999" placeholder="如：40">
            <span class="target-unit">h</span>
          </div>
        </div>
        <div class="target-edit-hint">当前目标：${currentValue}h</div>
        <div class="form-actions">
          <button class="form-btn form-btn-cancel" id="target-edit-cancel">取消</button>
          <button class="form-btn form-btn-reset" id="target-edit-reset">🔄 恢复默认</button>
          <button class="form-btn form-btn-confirm" id="target-edit-confirm">✅ 保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 关闭弹窗
    const closeModal = () => modal.remove();
    document.getElementById('target-edit-backdrop').addEventListener('click', closeModal);
    document.getElementById('target-edit-cancel').addEventListener('click', closeModal);

    // 恢复默认
    document.getElementById('target-edit-reset').addEventListener('click', () => {
      modal.remove();
      if (onReset) onReset();
    });

    // 保存
    document.getElementById('target-edit-confirm').addEventListener('click', () => {
      const inputEl = document.getElementById('target-edit-input');
      const value = inputEl ? inputEl.value.trim() : '';
      const success = onConfirm ? onConfirm(value) : true;
      if (success !== false) {
        modal.remove();
      }
    });

    // 回车快捷保存
    const inputEl = document.getElementById('target-edit-input');
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('target-edit-confirm').click();
        }
      });
      // 自动聚焦
      setTimeout(() => inputEl.focus(), 100);
    }
  },

  // ==========================================
  //  设置弹窗（API 配置）
  // ==========================================
  showSettingsModal(currentApiKey, currentBaseUrl, currentModel) {
    const modal = document.getElementById('settings-modal');
    const keyInput = document.getElementById('settings-api-key');
    const baseUrlInput = document.getElementById('settings-base-url');
    const modelInput = document.getElementById('settings-model');
    if (!modal || !keyInput) return;

    keyInput.value = currentApiKey || '';
    if (baseUrlInput) baseUrlInput.value = currentBaseUrl || '';
    if (modelInput) modelInput.value = currentModel || '';
    modal.style.display = 'flex';

    // 清空验证提示
    const validation = document.getElementById('settings-validation');
    if (validation) {
      validation.style.display = 'none';
      validation.textContent = '';
    }

    // 清空 Key 验证状态
    const keyStatus = document.getElementById('settings-key-status');
    if (keyStatus) {
      keyStatus.style.display = 'none';
      keyStatus.textContent = '';
      keyStatus.className = 'settings-key-status';
    }

    // ---- 密码可见性切换 ----
    const toggleBtn = document.getElementById('settings-toggle-key');
    if (toggleBtn) {
      const newToggle = toggleBtn.cloneNode(true);
      toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);
      newToggle.addEventListener('click', () => {
        const isPassword = keyInput.type === 'password';
        keyInput.type = isPassword ? 'text' : 'password';
        // 切换图标：睁眼/闭眼
        const eyeIcon = newToggle.querySelector('.icon-eye');
        if (eyeIcon) {
          if (isPassword) {
            eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>';
          } else {
            eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
          }
        }
      });
    }

    // ---- Key 实时校验 ----
    const keyHint = document.getElementById('key-hint');
    const validateKeyInput = () => {
      const val = keyInput.value.trim();
      if (!val) {
        if (keyHint) { keyHint.textContent = ''; keyHint.className = 'settings-hint'; }
        return true; // 允许空值
      }
      if (!val.startsWith('sk-') && !val.startsWith('fk-') && !val.startsWith('ak-')) {
        if (keyHint) { keyHint.textContent = '⚠️ Key 格式可能不正确，建议以 sk- 开头'; keyHint.className = 'settings-hint warn'; }
        return true; // 警告但不阻止
      }
      if (keyHint) { keyHint.textContent = '✅ Key 格式正确'; keyHint.className = 'settings-hint ok'; }
      return true;
    };
    keyInput.addEventListener('input', validateKeyInput);
    validateKeyInput();

    // ---- Base URL 实时校验 ----
    if (baseUrlInput) {
      const baseUrlHint = baseUrlInput.parentElement.nextElementSibling;
      baseUrlInput.addEventListener('input', () => {
        const val = baseUrlInput.value.trim();
        if (!val) {
          if (baseUrlHint) baseUrlHint.className = 'settings-hint';
          return;
        }
        try {
          new URL(val);
          if (baseUrlHint) { baseUrlHint.textContent = '✅ URL 格式正确'; baseUrlHint.className = 'settings-hint ok'; }
        } catch {
          if (baseUrlHint) { baseUrlHint.textContent = '⚠️ URL 格式不正确'; baseUrlHint.className = 'settings-hint warn'; }
        }
      });
    }

    // ---- 保存按钮 ----
    const saveBtn = document.getElementById('settings-save-btn');
    const cancelBtn = document.getElementById('settings-cancel-btn');
    const backdrop = document.getElementById('settings-backdrop');

    const closeHandler = () => {
      this.hideSettingsModal();
    };

    // ---- 验证连接按钮 ----
    const verifyBtn = document.getElementById('settings-verify-btn');
    if (verifyBtn) {
      const newVerifyBtn = verifyBtn.cloneNode(true);
      verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);
      newVerifyBtn.addEventListener('click', () => {
        if (typeof App !== 'undefined' && App.handleSettingsVerify) {
          App.handleSettingsVerify();
        }
      });
    }

    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', () => {
        const newKey = keyInput.value.trim();
        const newBaseUrl = baseUrlInput ? baseUrlInput.value.trim() : '';
        const newModel = modelInput ? modelInput.value.trim() : '';

        // 基础验证
        if (newBaseUrl) {
          try { new URL(newBaseUrl); } catch {
            if (validation) {
              validation.style.display = 'block';
              validation.textContent = '❌ Base URL 格式不正确，请检查';
              validation.className = 'settings-validation error';
            }
            return;
          }
        }

        if (typeof App !== 'undefined' && App.handleSettingsSave) {
          App.handleSettingsSave(newKey, newBaseUrl, newModel);
        }
      });
    }

    if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      newCancelBtn.addEventListener('click', closeHandler);
    }

    if (backdrop) {
      const newBackdrop = backdrop.cloneNode(true);
      backdrop.parentNode.replaceChild(newBackdrop, backdrop);
      newBackdrop.addEventListener('click', closeHandler);
    }

    // 回车快捷保存
    const enterHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (saveBtn) saveBtn.click();
      }
    };
    keyInput.addEventListener('keydown', enterHandler);
    if (baseUrlInput) baseUrlInput.addEventListener('keydown', enterHandler);
    if (modelInput) modelInput.addEventListener('keydown', enterHandler);

    setTimeout(() => keyInput.focus(), 100);
  },

  hideSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  /**
   * 轻量 Toast 提示（用于设置保存成功/失败反馈）
   */
  showToast(message, type = 'success') {
    // 移除已有的 toast
    const existing = document.querySelector('.settings-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `settings-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 动画触发
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 自动消失
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  /**
   * 导入数据确认弹窗
   */
  showImportConfirm(callback) {
    const old = document.getElementById('import-confirm-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.className = 'new-entry-modal active';
    modal.id = 'import-confirm-modal';
    modal.innerHTML = `
      <div class="new-entry-backdrop" id="import-confirm-backdrop"></div>
      <div class="new-entry-sheet" style="max-width:340px;">
        <h3>⚠️ 确认导入数据</h3>
        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin:8px 0 16px;">
          导入将<strong style="color:var(--error);">覆盖</strong>当前所有数据（企鹅、聊天记录、配置等），此操作不可撤销。
        </p>
        <div class="form-actions">
          <button class="form-btn form-btn-cancel" id="import-confirm-cancel">取消</button>
          <button class="form-btn form-btn-confirm" id="import-confirm-confirm" style="background:var(--error);">确认导入</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = (confirmed) => {
      modal.remove();
      callback(confirmed);
    };

    document.getElementById('import-confirm-backdrop').addEventListener('click', () => close(false));
    document.getElementById('import-confirm-cancel').addEventListener('click', () => close(false));
    document.getElementById('import-confirm-confirm').addEventListener('click', () => close(true));
  }
};
