/**
 * App DressUp 模块 v1.0 — 企鹅装扮系统
 * 从 app.js 拆分，通过 AppDressUp.app 引用宿主 App
 */
const AppDressUp = {
  app: null,

  init(app) { this.app = app; },

  initDressUp() {
    if (typeof DressUp === 'undefined') return;

    const dressupBtn = document.getElementById('btn-dressup');
    if (dressupBtn) {
      dressupBtn.addEventListener('click', () => this.openDressUp());
    }

    const dressupClose = document.getElementById('dressup-close');
    if (dressupClose) {
      dressupClose.addEventListener('click', () => this.closeDressUp());
    }

    const dressupOverlay = document.getElementById('dressup-overlay');
    if (dressupOverlay) {
      dressupOverlay.addEventListener('click', (e) => {
        if (e.target === dressupOverlay) this.closeDressUp();
      });
    }

    const tabs = document.querySelectorAll('.dressup-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderDressUpItems(tab.dataset.cat);
      });
    });
  },

  openDressUp() {
    const overlay = document.getElementById('dressup-overlay');
    if (!overlay) return;
    overlay.style.display = '';  // 清除 ensureCleanState 残留的 inline display:none
    overlay.classList.add('active');

    const previewCanvas = document.getElementById('dressup-preview-canvas');
    if (previewCanvas && typeof PenguinRenderer !== 'undefined') {
      const previewRenderer = Object.create(PenguinRenderer);
      previewRenderer.init(previewCanvas);
      this._previewRenderer = previewRenderer;
      this.renderDressUpPreview();
    }

    document.querySelectorAll('.dressup-tab').forEach((t, i) => {
      t.classList.toggle('active', i === 0);
    });
    this.renderDressUpItems('hat');
    this.updateDressUpWearingInfo();
  },

  closeDressUp() {
    const overlay = document.getElementById('dressup-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');

    if (this._previewRenderer) {
      this._previewRenderer.stop();
      this._previewRenderer = null;
    }
    this.app.rerenderPenguin();
  },

  renderDressUpPreview() {
    const renderer = this._previewRenderer;
    if (!renderer || !this.app.penguinData) return;
    renderer.render(this.app.penguinData);
  },

  renderDressUpItems(category) {
    const container = document.getElementById('dressup-items-scroll');
    if (!container || typeof DressUp === 'undefined') return;

    const allCostumes = DressUp.getAllCostumes(this.app.penguinData);
    const items = allCostumes[category] || [];

    container.innerHTML = items.map(item => {
      const lockedClass = item.unlocked ? '' : 'locked';
      const wearingClass = item.isWearing ? ' wearing' : '';
      const lockIcon = item.unlocked ? '' : '<div class="dressup-item-lock">🔒</div>';
      return `
        <div class="dressup-item ${lockedClass}${wearingClass}"
             data-costume-id="${item.id}" data-category="${item.category}">
          <div class="dressup-item-icon">${item.icon}</div>
          <div class="dressup-item-name">${item.name}</div>
          <div class="dressup-item-desc">${item.description}</div>
          <div class="dressup-item-condition">
            ${item.unlocked ? '✅ ' : ''}${item.unlockCondition}
          </div>
          ${lockIcon}
        </div>
      `;
    }).join('');

    container.querySelectorAll('.dressup-item').forEach(el => {
      el.addEventListener('click', () => {
        this.handleDressUpClick(el.dataset.costumeId, el.dataset.category);
      });
    });
  },

  handleDressUpClick(costumeId, category) {
    if (typeof DressUp === 'undefined') return;
    const item = DressUp.findCostume(costumeId);
    if (!item) return;
    if (!DressUp.isUnlocked(costumeId, this.app.penguinData)) return;

    if (DressUp.wearing[category] === costumeId) {
      DressUp.remove(category);
    } else {
      const result = DressUp.wear(costumeId, this.app.penguinData);
      if (!result.success) return;
    }

    this.renderDressUpPreview();
    const activeTab = document.querySelector('.dressup-tab.active');
    if (activeTab) this.renderDressUpItems(activeTab.dataset.cat);
    this.updateDressUpWearingInfo();
  },

  updateDressUpWearingInfo() {
    const container = document.getElementById('dressup-wearing-info');
    if (!container || typeof DressUp === 'undefined') return;

    const wearing = DressUp.getWearingDetail();
    const tags = [];
    if (wearing.hat) tags.push(`${wearing.hat.icon} ${wearing.hat.name}`);
    if (wearing.outfit) tags.push(`${wearing.outfit.icon} ${wearing.outfit.name}`);
    if (wearing.background) tags.push(`${wearing.background.icon} ${wearing.background.name}`);

    if (tags.length === 0) {
      container.innerHTML = '<span class="dressup-wearing-empty">未穿戴装扮</span>';
    } else {
      container.innerHTML = `<div class="dressup-wearing-tags">
        ${tags.map(t => `<span class="dressup-wearing-tag">${t}</span>`).join('')}
      </div>`;
    }
  }
};
