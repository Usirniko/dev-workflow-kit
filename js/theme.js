/**
 * AI企鹅养成 - 主题管理模块
 * 管理亮色/暗色主题切换，提供 Canvas 绘制专用配色
 */
const ThemeColors = {
  LIGHT: {
    groundShadow: 'rgba(0,0,0,0.10)',
    eggHighlight: 'rgba(255,255,255,0.40)',
    eggHighlight2: 'rgba(255,255,255,0.55)',
    eggTexture: 'rgba(255,255,255,0.22)',
    eggBlush: 'rgba(255,160,160,0.28)',
  },
  DARK: {
    groundShadow: 'rgba(0,0,0,0.30)',
    eggHighlight: 'rgba(255,255,255,0.20)',
    eggHighlight2: 'rgba(255,255,255,0.28)',
    eggTexture: 'rgba(255,255,255,0.12)',
    eggBlush: 'rgba(255,160,160,0.18)',
  },

  get() {
    return document.body.dataset.theme === 'dark' ? this.DARK : this.LIGHT;
  },

  toggle() {
    const next = this.isDark() ? 'light' : 'dark';
    document.body.dataset.theme = next;
    localStorage.setItem('theme', next);
    this._updateMenuLabel();
    return next;
  },

  init() {
    const saved = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = saved;
    this._updateMenuLabel();
  },

  isDark() {
    return document.body.dataset.theme === 'dark';
  },

  _updateMenuLabel() {
    const item = document.getElementById('menu-toggle-theme');
    if (item) {
      item.textContent = this.isDark() ? '☀️ 亮色模式' : '🌙 暗色模式';
    }
  }
};
