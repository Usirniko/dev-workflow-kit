/**
 * AI企鹅养成 - 数据持久化模块
 * 负责localStorage的安全读写、数据校验、异常恢复
 */
const STORAGE_KEYS = {
  PENGUIN: 'penguin_data',
  CHAT: 'chat_history',
  CONFIG: 'user_config',
  STATE: 'app_state',
  RESUME: 'resume_data',
  VERSION: 'data_version'
};

const DATA_VERSION = '1.0.0';

const Storage = {
  // 安全写入
  set(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        this.cleanupOldChats();
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (e2) {
          console.error('Storage full, cleanup failed');
          return false;
        }
      }
      console.error('Storage write error:', e);
      return false;
    }
  },

  // 安全读取
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      console.error('Storage read error:', e);
      localStorage.removeItem(key);
      return defaultValue;
    }
  },

  // 清理旧聊天记录
  cleanupOldChats() {
    const chat = this.get(STORAGE_KEYS.CHAT, { messages: [], contextWindow: [] });
    if (chat.messages.length > 50) {
      chat.messages = chat.messages.slice(-30);
      chat.contextWindow = chat.contextWindow.slice(-20);
      this.set(STORAGE_KEYS.CHAT, chat);
    }
  },

  // 保存所有数据
  saveAll(penguinData, chatHistory, userConfig, appState) {
    this.set(STORAGE_KEYS.PENGUIN, penguinData);
    this.set(STORAGE_KEYS.CHAT, chatHistory);
    this.set(STORAGE_KEYS.CONFIG, userConfig);
    this.set(STORAGE_KEYS.STATE, appState);
    this.set(STORAGE_KEYS.VERSION, DATA_VERSION);
  },

  // 保存简历数据
  saveResume(resumeData) {
    this.set(STORAGE_KEYS.RESUME, resumeData);
  },

  // 加载简历数据
  loadResume() {
    return this.get(STORAGE_KEYS.RESUME, null);
  },

  // 加载所有数据
  loadAll() {
    const version = this.get(STORAGE_KEYS.VERSION);
    if (version !== DATA_VERSION) {
      this.clearAll();
      return null;
    }
    return {
      penguinData: this.get(STORAGE_KEYS.PENGUIN),
      chatHistory: this.get(STORAGE_KEYS.CHAT),
      userConfig: this.get(STORAGE_KEYS.CONFIG),
      appState: this.get(STORAGE_KEYS.STATE),
      resumeData: this.get(STORAGE_KEYS.RESUME)
    };
  },

  // 清除所有数据
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  // 数据导出
  exportData() {
    const data = {};
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      data[name] = this.get(key);
    }
    return JSON.stringify(data, null, 2);
  },

  // 数据导入
  importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        if (data[name] !== undefined) {
          this.set(key, data[name]);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // 检测存储空间
  getStorageInfo() {
    let used = 0;
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key);
      if (item) used += item.length * 2; // UTF-16
    }
    return {
      used: (used / 1024).toFixed(2) + ' KB',
      available: '~5MB (浏览器限制)'
    };
  }
};
