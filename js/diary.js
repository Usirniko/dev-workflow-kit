/**
 * AI企鹅养成 - 成长日记模块 v3
 * 按日期存储日记，支持心情/天气标签、多维度筛选
 * 数据结构: { "2026-06-11": { content: "...", mood: "happy", weather: "sunny", markedAsResume: false }, ... }
 */

const DiaryModule = {
  STORAGE_KEY: 'penguin_diary_data_v3',

  // 心情标签映射
  MOOD_MAP: {
    happy: '😊 开心',
    calm: '😌 平静',
    sad: '😢 难过',
    excited: '🤩 兴奋',
    anxious: '😰 焦虑',
    grateful: '🙏 感恩',
    tired: '😴 疲惫',
    motivated: '💪 充实'
  },

  // 天气标签映射
  WEATHER_MAP: {
    sunny: '☀️ 晴天',
    cloudy: '⛅ 多云',
    rainy: '🌧️ 下雨',
    snowy: '❄️ 下雪',
    windy: '💨 大风',
    stormy: '⛈️ 暴风雨',
    foggy: '🌫️ 雾霾'
  },

  data: {},

  /** 初始化 */
  init() {
    this.load();
    this.migrateFromV2();
  },

  /** 获取某天的日记 */
  getEntry(dateKey) {
    return this.data[dateKey] || null;
  },

  /** 保存某天的日记内容 */
  saveContent(dateKey, content) {
    if (!this.data[dateKey]) {
      this.data[dateKey] = { content: '', mood: '', weather: '', markedAsResume: false };
    }
    this.data[dateKey].content = content;
    this.save();
  },

  /** 设置心情标签 */
  setMood(dateKey, mood) {
    if (!this.data[dateKey]) {
      this.data[dateKey] = { content: '', mood: '', weather: '', markedAsResume: false };
    }
    this.data[dateKey].mood = mood;
    this.save();
  },

  /** 设置天气标签 */
  setWeather(dateKey, weather) {
    if (!this.data[dateKey]) {
      this.data[dateKey] = { content: '', mood: '', weather: '', markedAsResume: false };
    }
    this.data[dateKey].weather = weather;
    this.save();
  },

  /** 删除某天的日记 */
  deleteEntry(dateKey) {
    delete this.data[dateKey];
    this.save();
  },

  /** 切换简历标记 */
  toggleResumeMark(dateKey) {
    if (!this.data[dateKey]) return false;
    this.data[dateKey].markedAsResume = !this.data[dateKey].markedAsResume;
    this.save();
    return this.data[dateKey].markedAsResume;
  },

  /** 设置简历标记 */
  setResumeMark(dateKey, value) {
    if (!this.data[dateKey]) return;
    this.data[dateKey].markedAsResume = value;
    this.save();
  },

  /** 获取某月所有有日记的日期集合 */
  getMonthDates(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const dates = [];
    Object.keys(this.data).forEach(key => {
      if (key.startsWith(prefix)) {
        const content = (this.data[key].content || '').trim();
        if (content.length > 0) {
          dates.push(key);
        }
      }
    });
    return dates;
  },

  /** 按筛选条件获取日记列表 */
  getFilteredEntries({ dateFrom, dateTo, mood, resumeOnly } = {}) {
    return Object.entries(this.data)
      .filter(([, v]) => (v.content || '').trim())
      .filter(([key]) => {
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
        return true;
      })
      .filter(([, v]) => {
        if (mood && mood !== 'all' && v.mood !== mood) return false;
        return true;
      })
      .filter(([, v]) => {
        if (resumeOnly && !v.markedAsResume) return false;
        return true;
      })
      .map(([dateKey, v]) => ({
        dateKey,
        dateStr: this.formatDateKey(dateKey),
        content: v.content,
        mood: v.mood || '',
        weather: v.weather || '',
        markedAsResume: v.markedAsResume || false
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  },

  /** 获取所有条目 */
  getAll() {
    return Object.entries(this.data)
      .filter(([, v]) => (v.content || '').trim())
      .map(([dateKey, v]) => ({
        id: 'diary_' + dateKey,
        dateKey,
        date: new Date(dateKey).toISOString(),
        dateStr: this.formatDateKey(dateKey),
        content: v.content,
        mood: v.mood || '',
        weather: v.weather || '',
        type: 'manual',
        penguinSnapshot: null,
        tags: [],
        markAsResume: v.markedAsResume || false,
        createdAt: new Date(dateKey).getTime()
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /** 获取统计 */
  getStats() {
    const entries = Object.values(this.data).filter(v => (v.content || '').trim());
    return {
      total: entries.length,
      resumeCount: entries.filter(v => v.markedAsResume).length,
      uniqueDays: entries.length
    };
  },

  /** 获取标记为简历素材的日期列表 */
  getResumeMarkedDates() {
    return Object.entries(this.data)
      .filter(([, v]) => v.markedAsResume && (v.content || '').trim())
      .map(([k]) => k);
  },

  /** 获取所有简历素材条目 */
  getResumeEntries() {
    return Object.entries(this.data)
      .filter(([, v]) => v.markedAsResume && (v.content || '').trim())
      .map(([dateKey, v]) => ({
        id: 'diary_' + dateKey,
        dateKey,
        dateStr: this.formatDateKey(dateKey),
        content: v.content,
        mood: v.mood || '',
        weather: v.weather || '',
        type: 'manual',
        tags: [],
        markAsResume: true,
        createdAt: new Date(dateKey).getTime()
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /** 导出日记 */
  export() {
    let text = '# 📓 成长日记\n\n';
    const sorted = Object.keys(this.data).sort();
    sorted.forEach(dateKey => {
      const entry = this.data[dateKey];
      if (!entry || !(entry.content || '').trim()) return;
      text += `## ${this.formatDateKey(dateKey)}\n`;
      if (entry.mood) text += `心情：${this.MOOD_MAP[entry.mood] || entry.mood}  `;
      if (entry.weather) text += `天气：${this.WEATHER_MAP[entry.weather] || entry.weather}\n`;
      else if (entry.mood) text += '\n';
      text += `${entry.content}\n`;
      if (entry.markedAsResume) text += '🏷️ 简历素材\n';
      text += '\n---\n\n';
    });
    return text;
  },

  /** v2 → v3 迁移 */
  migrateFromV2() {
    try {
      const oldRaw = localStorage.getItem('penguin_diary_data');
      if (!oldRaw) return;
      const oldData = JSON.parse(oldRaw);
      let migrated = false;
      Object.entries(oldData).forEach(([key, val]) => {
        if (!this.data[key] && val && (val.content || '').trim()) {
          this.data[key] = {
            content: val.content || '',
            mood: val.mood || '',
            weather: val.weather || '',
            markedAsResume: val.markedAsResume || false
          };
          migrated = true;
        }
      });
      if (migrated) {
        this.save();
        localStorage.removeItem('penguin_diary_data');
      }
    } catch (e) { /* 静默处理 */ }
  },

  /** 从旧格式迁移 */
  migrateFromOld() {
    try {
      const oldRaw = localStorage.getItem('penguin_diary_entries');
      if (!oldRaw) return;
      const oldEntries = JSON.parse(oldRaw);
      if (!Array.isArray(oldEntries) || oldEntries.length === 0) return;
      oldEntries.forEach(entry => {
        if (entry.type === 'manual' && entry.date) {
          const d = new Date(entry.date);
          const dateKey = this.toDateKey(d);
          if (!this.data[dateKey] || !(this.data[dateKey].content || '').trim()) {
            this.data[dateKey] = {
              content: entry.content || '',
              mood: '',
              weather: '',
              markedAsResume: entry.markAsResume || false
            };
          }
        }
      });
      this.save();
      localStorage.removeItem('penguin_diary_entries');
    } catch (e) { /* 静默处理 */ }
  },

  // ========== 工具方法 ==========

  toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatDateKey(dateKey) {
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    return `${parts[0]}年${parts[1]}月${parts[2]}日`;
  },

  // ========== 持久化 ==========

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.data = raw ? JSON.parse(raw) : {};
      this.migrateFromOld();
    } catch (e) {
      this.data = {};
    }
  },

  save() {
    try {
      // 自动清理空条目
      Object.keys(this.data).forEach(key => {
        const entry = this.data[key];
        if (!entry) { delete this.data[key]; return; }
        if (!(entry.content || '').trim() && !entry.markedAsResume) {
          delete this.data[key];
        }
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Diary storage full');
    }
  },

  clear() {
    this.data = {};
    this.save();
  }
};
