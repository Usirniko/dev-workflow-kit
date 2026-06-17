/**
 * App Egg 模块 v1.0 — 领蛋、孵化、年级选择、命名
 * 从 app.js 拆分，通过 AppEgg.app 引用宿主 App
 */
const AppEgg = {
  app: null,

  init(app) { this.app = app; },

  showEggPage() {
    UI.showEggPage();
    this.app.appState.currentPage = 'egg';
  },

  handleClaim() {
    try {
      const btn = UI.elements.claimBtn;
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = '🐣 孵化中...';
      btn.style.opacity = '0.6';
      
      let hatchDone = false;
      
      const showGrade = () => {
        try {
          if (hatchDone) return;
          hatchDone = true;
          if (btn) btn.textContent = '🎉 孵化成功！';
          setTimeout(() => {
            try { UI.showGradeModal(); } catch (e) {
              console.error('[AppEgg] showGradeModal 失败:', e);
              // 兜底：直接操作 DOM
              const modal = document.getElementById('grade-modal');
              if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
            }
          }, 500);
        } catch (e) {
          console.error('[AppEgg] showGrade 失败:', e);
        }
      };
      
      // 核心兜底：不管动画如何，最多 3 秒必须弹出年级选择
      setTimeout(() => { showGrade(); }, 3000);
      
      // Canvas 孵化动画（纯视觉，不影响流程）
      if (window.eggCanvas) {
        try { window.eggCanvas.startHatch(() => { showGrade(); }); } catch (e) {}
      }
    } catch (e) {
      console.error('[AppEgg] handleClaim 失败:', e);
      // 出错时恢复按钮
      const btn = UI.elements.claimBtn;
      if (btn) { btn.disabled = false; btn.textContent = '🎁 领取我的蛋'; btn.style.opacity = '1'; }
    }
  },

  handleGradeSelect(grade) {
    try {
      const app = this.app;
      if (!app) { console.error('[AppEgg] app 未初始化'); return; }

      // 确保 penguinData.attributes 存在（防止重置后空对象）
      if (!app.penguinData.attributes) {
        app.penguinData.attributes = { knowledge: 0, creativity: 0, social: 0, action: 0, mentality: 0 };
      }

      app.userConfig.grade = grade;
      app.userConfig.selectedAt = Date.now();
      app.penguinData.grade = grade;

      const gradeStages = { freshman: 1, sophomore: 2, junior: 3, senior: 4 };
      app.penguinData.stage = gradeStages[grade] || 1;

      const initialAttrs = {
        freshman: { knowledge: 5, creativity: 10, social: 10, action: 5, mentality: 15 },
        sophomore: { knowledge: 20, creativity: 25, social: 25, action: 20, mentality: 25 },
        junior:    { knowledge: 40, creativity: 35, social: 40, action: 45, mentality: 40 },
        senior:    { knowledge: 55, creativity: 50, social: 55, action: 60, mentality: 55 }
      };
      Object.assign(app.penguinData.attributes, initialAttrs[grade]);
      app.penguinData.exp = Object.values(initialAttrs[grade]).reduce((a, b) => a + b, 0);
      app.penguinData.lastLoginDate = new Date().toDateString();
      app.penguinData.consecutiveDays = 1;
      try { app.saveData(); } catch (e) { console.error('[AppEgg] saveData 失败:', e); }

      const card = document.querySelector(`.grade-card[data-grade="${grade}"]`);
      if (card) card.classList.add('selected');
      UI.hideGradeModal();

      setTimeout(() => {
        try {
          const currentName = app.penguinData.name !== '蛋蛋' ? app.penguinData.name : '';
          UI.showNamingCard(currentName);
        } catch (e) {
          console.error('[AppEgg] showNamingCard 失败:', e);
        }
      }, 350);
    } catch (e) {
      console.error('[AppEgg] handleGradeSelect 失败:', e);
    }
  },

  handleNamingSkip() {
    try {
      this.app.penguinData.name = '蛋蛋';
      UI.hideNamingCard(() => { this.app.showResumePage(); });
    } catch (e) { console.error('[AppEgg] handleNamingSkip 失败:', e); }
  },

  handleNamingConfirm() {
    try {
      let name = UI.getNamingInput();
      if (!name) name = '蛋蛋';
      name = name.slice(0, 6);
      this.app.penguinData.name = name;
      UI.hideNamingCard(() => { this.app.showResumePage(); });
    } catch (e) { console.error('[AppEgg] handleNamingConfirm 失败:', e); }
  }
};
