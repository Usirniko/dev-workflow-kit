/**
 * AI企鹅养成 - 个人知识库模块
 * 收藏/分类/搜索/导出聊天中的知识点
 */

const KnowledgeModule = {
  STORAGE_KEY: 'penguin_knowledge_base',
  items: [],
  categories: ['编程', '产品', '设计', '运营', '法律', '游戏', '学习方法', '求职', '面试', '技能', '其他'],

  init() {
    this.load();
  },

  /**
   * 添加知识条目
   */
  addItem({ title, content, category = '其他', tags = [], source = 'chat', sourceMessageId = null }) {
    const item = {
      id: 'kb_' + Date.now(),
      title,
      content,
      category,
      tags,
      source,
      sourceMessageId,
      createdAt: Date.now(),
      dateStr: new Date().toLocaleDateString('zh-CN'),
      pinned: false
    };

    this.items.unshift(item);
    this.save();
    return item;
  },

  /**
   * 从聊天中提取知识点（基于关键词分析）
   */
  extractFromChat(userMsg, aiMsg, keywordAnalysis) {
    const combinedText = userMsg.content + ' ' + aiMsg.content;
    
    // 根据关键词分析判断分类
    let category = '其他';
    if (keywordAnalysis && keywordAnalysis.direction) {
      const catMap = {
        law: '法律',
        programming: '编程',
        product: '产品',
        design: '设计',
        operations: '运营',
        game: '游戏'
      };
      category = catMap[keywordAnalysis.direction.category] || '其他';
    }

    // 智能标题生成
    let title = userMsg.content.slice(0, 40);
    if (title.length >= 40) title += '...';

    // 提取标签
    const tags = [];
    if (keywordAnalysis) {
      if (keywordAnalysis.matchedDirectionKeywords) {
        tags.push(...keywordAnalysis.matchedDirectionKeywords.slice(0, 3));
      }
      if (keywordAnalysis.matchedCompetencyKeywords) {
        tags.push(...keywordAnalysis.matchedCompetencyKeywords.slice(0, 3));
      }
    }

    // 提取AI回复中的关键信息作为内容摘要
    const summary = aiMsg.content.slice(0, 300);

    return this.addItem({
      title,
      content: summary,
      category,
      tags,
      source: 'chat',
      sourceMessageId: userMsg.id
    });
  },

  /**
   * 手动添加知识点
   */
  addManualItem(title, content, category = '其他', tags = []) {
    return this.addItem({
      title,
      content,
      category,
      tags,
      source: 'manual'
    });
  },

  /**
   * 更新条目
   */
  updateItem(id, updates) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.items[idx] = { ...this.items[idx], ...updates };
    this.save();
    return this.items[idx];
  },

  /**
   * 删除条目
   */
  deleteItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  },

  /**
   * 置顶/取消置顶
   */
  togglePin(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.pinned = !item.pinned;
      this.save();
    }
  },

  /**
   * 搜索
   */
  search(query) {
    const lower = query.toLowerCase();
    return this.items.filter(i =>
      i.title.toLowerCase().includes(lower) ||
      i.content.toLowerCase().includes(lower) ||
      i.tags.some(t => t.toLowerCase().includes(lower)) ||
      i.category.toLowerCase().includes(lower)
    );
  },

  /**
   * 按分类筛选
   */
  getByCategory(category) {
    return this.items.filter(i => i.category === category);
  },

  /**
   * 按标签筛选
   */
  getByTag(tag) {
    return this.items.filter(i => i.tags.includes(tag));
  },

  /**
   * 获取所有（置顶在前）
   */
  getAll() {
    return [...this.items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  },

  /**
   * 获取分类统计
   */
  getCategoryStats() {
    const stats = {};
    this.categories.forEach(cat => { stats[cat] = 0; });
    this.items.forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + 1;
    });
    return stats;
  },

  /**
   * 导出知识库
   */
  export(format = 'markdown') {
    if (format === 'markdown') {
      let md = '# 📚 个人知识库\n\n';
      const byCategory = {};
      this.items.forEach(item => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      });

      for (const [cat, items] of Object.entries(byCategory)) {
        md += `## ${cat}\n\n`;
        items.forEach(item => {
          md += `### ${item.title}\n`;
          md += `- 日期: ${item.dateStr}\n`;
          md += `- 标签: ${item.tags.join(', ') || '无'}\n`;
          md += `- 内容: ${item.content}\n\n`;
        });
      }
      return md;
    }
    
    // JSON 格式
    return JSON.stringify(this.items, null, 2);
  },

  /**
   * 获取统计
   */
  getStats() {
    const total = this.items.length;
    const pinned = this.items.filter(i => i.pinned).length;
    const fromChat = this.items.filter(i => i.source === 'chat').length;
    const fromManual = this.items.filter(i => i.source === 'manual').length;
    const tags = new Set();
    this.items.forEach(i => i.tags.forEach(t => tags.add(t)));

    return { total, pinned, fromChat, fromManual, uniqueTags: tags.size };
  },

  // ============================================
  //  持久化
  // ============================================
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      this.items = this.items.slice(0, 300);
      this.save();
    }
  },

  clear() {
    this.items = [];
    this.save();
  }
};
