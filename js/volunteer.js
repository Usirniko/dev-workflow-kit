/**
 * AI企鹅养成 - 志愿时长模块
 * 记录/证明/提醒/统计用户的志愿活动时长
 */

const VolunteerModule = {
  STORAGE_KEY: 'penguin_volunteer_hours',
  records: [],
  totalHours: 0,
  targetHours: 40, // 默认目标时长

  init() {
    this.load();
  },

  /**
   * 添加志愿记录
   */
  addRecord({ title, hours, date = new Date().toISOString(), description = '', organization = '', proof = '' }) {
    const record = {
      id: 'vol_' + Date.now(),
      title,
      hours: parseFloat(hours) || 0,
      date,
      dateStr: new Date(date).toLocaleDateString('zh-CN'),
      description,
      organization,
      proof,       // 证明文件或图片链接
      verified: false,
      createdAt: Date.now()
    };

    this.records.unshift(record);
    this.recalculateTotal();
    this.save();
    return record;
  },

  /**
   * 更新记录
   */
  updateRecord(id, updates) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.records[idx] = { ...this.records[idx], ...updates };
    this.recalculateTotal();
    this.save();
    return this.records[idx];
  },

  /**
   * 删除记录
   */
  deleteRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.recalculateTotal();
    this.save();
  },

  /**
   * 验证记录（标记已验证）
   */
  verifyRecord(id) {
    return this.updateRecord(id, { verified: true });
  },

  /**
   * 重新计算总时长
   */
  recalculateTotal() {
    this.totalHours = this.records.reduce((sum, r) => sum + r.hours, 0);
  },

  /**
   * 获取完成进度
   */
  getProgress() {
    return {
      total: this.totalHours,
      target: this.targetHours,
      percentage: Math.min(100, Math.round((this.totalHours / this.targetHours) * 100)),
      remaining: Math.max(0, this.targetHours - this.totalHours)
    };
  },

  /**
   * 设置目标时长
   */
  setTarget(hours) {
    this.targetHours = hours;
    this.save();
  },

  /**
   * 验证并设置目标时长
   * 返回 { valid, value, message }
   */
  validateAndSetTarget(inputValue) {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num <= 0) {
      return { valid: false, value: null, message: '请输入有效的正数' };
    }
    if (num > 9999) {
      return { valid: false, value: null, message: '目标时长不能超过 9999 小时' };
    }
    this.setTarget(num);
    return { valid: true, value: num, message: `目标已更新为 ${num}h` };
  },

  /** 获取默认目标值（用于重置） */
  getDefaultTarget() {
    return 40;
  },

  /** 重置目标为默认值 */
  resetTargetToDefault() {
    this.targetHours = this.getDefaultTarget();
    this.save();
    return this.targetHours;
  },

  /**
   * 获取所有记录
   */
  getAll() {
    return [...this.records];
  },

  /**
   * 按时间范围筛选
   */
  getByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return this.records.filter(r => {
      const t = new Date(r.date).getTime();
      return t >= start && t <= end;
    });
  },

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.records.length;
    const verified = this.records.filter(r => r.verified).length;
    const unverified = total - verified;
    
    // 本月时长
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthHours = this.records
      .filter(r => new Date(r.date) >= monthStart)
      .reduce((sum, r) => sum + r.hours, 0);

    // 组织分布
    const orgs = {};
    this.records.forEach(r => {
      if (r.organization) {
        orgs[r.organization] = (orgs[r.organization] || 0) + r.hours;
      }
    });

    return {
      total,
      verified,
      unverified,
      totalHours: this.totalHours,
      monthHours,
      targetHours: this.targetHours,
      organizations: orgs
    };
  },

  /**
   * 生成志愿证明
   */
  generateCertificate() {
    const stats = this.getStats();
    return {
      totalHours: stats.totalHours,
      recordCount: stats.total,
      verifiedCount: stats.verified,
      period: {
        from: this.records.length > 0 ? this.records[this.records.length - 1].dateStr : '',
        to: this.records.length > 0 ? this.records[0].dateStr : ''
      },
      records: this.records.map(r => ({
        title: r.title,
        hours: r.hours,
        date: r.dateStr,
        organization: r.organization
      }))
    };
  },

  /**
   * 导出
   */
  export() {
    let text = '# ⏱️ 志愿时长记录\n\n';
    text += `## 总计：${this.totalHours} 小时\n`;
    text += `目标：${this.targetHours} 小时 | 完成度：${this.getProgress().percentage}%\n\n`;
    
    this.records.forEach(r => {
      text += `### ${r.title}\n`;
      text += `- 时长：${r.hours} 小时\n`;
      text += `- 日期：${r.dateStr}\n`;
      if (r.organization) text += `- 组织：${r.organization}\n`;
      if (r.description) text += `- 描述：${r.description}\n`;
      text += `- 验证：${r.verified ? '✅ 已验证' : '⏳ 待验证'}\n\n`;
    });
    
    return text;
  },

  /**
   * 获取提醒建议（如果离目标还有差距）
   */
  getReminder() {
    const progress = this.getProgress();
    if (progress.percentage >= 100) {
      return '🎉 恭喜！你已经完成了志愿时长目标！';
    }
    if (progress.percentage >= 75) {
      return `💪 还差 ${progress.remaining} 小时就达成目标了，加油！`;
    }
    if (progress.percentage >= 50) {
      return `📋 已完成 ${progress.percentage}%，再接再厉！`;
    }
    return `🌱 目前完成了 ${progress.totalHours} 小时，距离目标还有 ${progress.remaining} 小时。`;
  },

  // ============================================
  //  持久化
  // ============================================
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.records = data.records || [];
        this.targetHours = data.targetHours || 40;
        this.recalculateTotal();
      }
    } catch (e) {
      this.records = [];
      this.targetHours = 40;
      this.totalHours = 0;
    }
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        records: this.records,
        targetHours: this.targetHours
      }));
    } catch (e) {
      console.warn('Volunteer storage full');
    }
  },

  clear() {
    this.records = [];
    this.totalHours = 0;
    this.targetHours = 40;
    this.save();
  }
};
