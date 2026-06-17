/**
 * AI企鹅养成 - 深度记忆系统 v1
 * 记住关键对话节点，支持结构化回忆与主动回访
 *
 * 核心能力：
 *   1. 自动从对话中提取「记忆节点」（话题 + 情绪 + 重要性评分）
 *   2. 按年级/话题/时间三维检索
 *   3. 构建记忆上下文注入聊天，让企鹅"记得"之前聊过什么
 *   4. 主动回访建议 —— 哪些话题该跟进、哪些承诺需要兑现
 */

const DeepMemory = {
  STORAGE_KEY: 'penguin_deep_memory',
  MAX_MEMORIES: 60,          // 最多保留 60 条
  MAX_CONTEXT_MEMORIES: 4,   // 每次注入上下文最多取 4 条
  _cache: null,

  // ==========================================
  //  话题识别关键词库
  // ==========================================
  TOPIC_PATTERNS: [
    { topic: '职业规划',     weight: 9, patterns: [/职业规划/, /以后.*做/, /未来.*方向/, /想.*从事/, /就业/] },
    { topic: '实习面试',     weight: 9, patterns: [/面试/, /实习.*投/, /简历.*改/, /面经/, /笔试/, /秋招/, /春招/] },
    { topic: '专业选择',     weight: 8, patterns: [/转专业/, /辅修/, /双学位/, /选.*专业/, /专业.*方向/] },
    { topic: '技能学习',     weight: 7, patterns: [/学.*编程/, /学.*设计/, /学.*运营/, /刷题/, /考证/, /技能/] },
    { topic: '焦虑压力',     weight: 8, patterns: [/焦虑/, /压力/, /迷茫/, /不知道.*怎么办/, /崩溃/, /想放弃/, /卷不动/] },
    { topic: '人际关系',     weight: 6, patterns: [/室友/, /同学/, /朋友/, /社团/, /社交/, /导师/, /合作/] },
    { topic: '大学生活',     weight: 5, patterns: [/选课/, /考试/, /绩点/, /GPA/, /体测/, /食堂/] },
    { topic: '腾讯相关',     weight: 8, patterns: [/腾讯/, /鹅厂/, /微信/, /QQ/, /王者/, /事业群/] },
    { topic: 'Offer抉择',    weight: 9, patterns: [/offer/, /选.*公司/, /去.*还是/, /薪资/, /拒.*offer/, /签.*三方/] },
    { topic: '自我认知',     weight: 7, patterns: [/我.*擅长/, /我.*不适合/, /性格/, /优缺点/, /目标/, /想要什么/] },
    { topic: '竞赛科研',     weight: 6, patterns: [/竞赛/, /比赛/, /科研/, /论文/, /实验室/, /ACM/, /建模/] },
    { topic: '考研保研',     weight: 7, patterns: [/考研/, /保研/, /读研/, /研究生/, /深造/] },
    { topic: '成长感悟',     weight: 7, patterns: [/学到了/, /终于.*明白/, /原来/, /成长/, /改变/, /进步/, /收获/] }
  ],

  // ==========================================
  //  初始化
  // ==========================================
  init() {
    this._cache = null;
    this._cleanExpired();
  },

  /** 加载所有记忆 */
  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._cache = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this._cache = [];
    }
    return this._cache;
  },

  /** 持久化 */
  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._cache));
    } catch (e) {
      // 存储满时清理旧记忆
      if (this._cache.length > 20) {
        this._cache = this._cache.slice(-20);
      }
    }
  },

  /** 清理超过 90 天的记忆（但保留高重要性条目） */
  _cleanExpired() {
    const memories = this._load();
    const cutoff = Date.now() - 90 * 86400000;
    this._cache = memories.filter(m => m.importance >= 8 || m.timestamp > cutoff);
    this._save();
  },

  // ==========================================
  //  话题识别
  // ==========================================
  _detectTopics(text) {
    const matched = [];
    for (const tp of this.TOPIC_PATTERNS) {
      for (const re of tp.patterns) {
        if (re.test(text)) {
          matched.push({ topic: tp.topic, weight: tp.weight });
          break;
        }
      }
    }
    // 去重，取最高权重
    const seen = new Set();
    return matched.filter(m => {
      if (seen.has(m.topic)) return false;
      seen.add(m.topic);
      return true;
    }).sort((a, b) => b.weight - a.weight);
  },

  /** 评估消息重要性 0-10 */
  _calcImportance(userMsg, aiReply) {
    let score = 0;
    const combined = userMsg + aiReply;

    // 长度因子
    const len = userMsg.length;
    if (len > 200) score += 3;
    else if (len > 80) score += 2;
    else if (len > 30) score += 1;

    // 情绪信号
    if (/焦虑|压力|迷茫|崩溃|想哭|难过|害怕/.test(userMsg)) score += 2;
    if (/开心|兴奋|终于|通过|拿到|录取/.test(userMsg)) score += 2;

    // 决策信号
    if (/决定|选择|考虑到|倾向于|打算/.test(userMsg)) score += 3;

    // 承诺/目标信号
    if (/要.*学|准备.*做|计划|目标|从.*开始|以后/.test(userMsg)) score += 2;

    // AI 回复深度
    if (aiReply && aiReply.length > 150) score += 1;

    // 关键词密度
    const topics = this._detectTopics(combined);
    const topWeight = topics.length > 0 ? topics[0].weight : 0;
    score += (topWeight - 5) * 0.5;  // weight>5 的加，<5 的减

    return Math.min(10, Math.max(1, Math.round(score)));
  },

  // ==========================================
  //  公开 API
  // ==========================================

  /**
   * 记录一个对话节点
   * @param {string} userMsg     用户消息原文
   * @param {string} aiReply      AI 回复原文
   * @param {string} grade       当前年级
   * @returns {object|null}      被记录的记忆（重要性<6 则不记录）
   */
  recordMoment(userMsg, aiReply, grade) {
    if (!userMsg || userMsg.length < 15) return null;

    const importance = this._calcImportance(userMsg, aiReply);
    if (importance < 6) return null;

    const topics = this._detectTopics(userMsg + (aiReply || ''));
    const summary = userMsg.length > 60 ? userMsg.slice(0, 60) + '…' : userMsg;

    const moment = {
      id: 'mem_' + Date.now(),
      timestamp: Date.now(),
      grade: grade || 'freshman',
      summary,
      userMsg: userMsg.slice(0, 200),
      aiReply: (aiReply || '').slice(0, 200),
      topics: topics.map(t => t.topic).slice(0, 3),
      importance,
      followUpCount: 0,
      lastFollowUp: 0
    };

    const memories = this._load();
    memories.push(moment);

    // 保留最近 MAX_MEMORIES 条
    if (memories.length > this.MAX_MEMORIES) {
      // 优先删除低重要性的旧记忆
      memories.sort((a, b) => (b.importance - a.importance) || (b.timestamp - a.timestamp));
      this._cache = memories.slice(0, this.MAX_MEMORIES);
    } else {
      this._cache = memories;
    }

    this._save();
    return moment;
  },

  /**
   * 获取记忆列表
   * @param {object} opts  { grade, topic, limit }
   */
  getMemories(opts = {}) {
    const { grade, topic, limit = 20 } = opts;
    let list = [...this._load()];

    if (grade) list = list.filter(m => m.grade === grade);
    if (topic) list = list.filter(m => m.topics.includes(topic));

    // 按时间倒序
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list.slice(0, limit);
  },

  /**
   * 获取最近记忆概要（用于快速知晓用户最近状态）
   */
  getRecentSummary() {
    const recent = this.getMemories({ limit: 8 });
    if (recent.length === 0) return null;

    const topicCount = {};
    recent.forEach(m => {
      m.topics.forEach(t => {
        topicCount[t] = (topicCount[t] || 0) + 1;
      });
    });

    const topTopics = Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    const latest = recent[0];
    const daysAgo = Math.floor((Date.now() - latest.timestamp) / 86400000);

    return {
      recentCount: recent.length,
      topTopics,
      latestTopic: latest.topics[0] || '未知',
      latestSummary: latest.summary,
      daysSinceLast: daysAgo,
      hasAnxiety: recent.some(m => m.topics.includes('焦虑压力')),
      latestImportance: latest.importance
    };
  },

  /**
   * 构建记忆上下文注入聊天 System Prompt
   * 让企鹅能在对话中自然提起之前聊过的重要话题
   */
  buildMemoryContext(grade) {
    const memories = this.getMemories({ grade, limit: this.MAX_CONTEXT_MEMORIES });
    if (memories.length === 0) return '';

    const lines = memories.map((m, i) => {
      const daysAgo = Math.floor((Date.now() - m.timestamp) / 86400000);
      const timeLabel = daysAgo === 0 ? '刚才' : daysAgo === 1 ? '昨天' : `${daysAgo}天前`;
      return `${i + 1}. [${timeLabel}] 话题:${m.topics.join('、')} | 用户说:"${m.summary}"`;
    });

    return `\n\n【深度记忆 - 你们最近聊过的重要话题】\n${lines.join('\n')}\n\n在对话中自然地引用这些记忆（比如"上次你提到..."），让用户感受到你记得ta的事。但不要机械地逐一复述，挑最相关的 1-2 条自然提及即可。`;
  },

  /**
   * 获取主动回访建议
   * 哪些话题该跟进、哪些承诺需要"追问"
   */
  getFollowUpSuggestions(grade) {
    const memories = this.getMemories({ grade, limit: 15 });
    const suggestions = [];

    // 规则1：高重要性的焦虑话题，3天内未回访
    const anxietyMemories = memories.filter(
      m => m.topics.includes('焦虑压力') && m.importance >= 7 && m.followUpCount < 2
    );
    if (anxietyMemories.length > 0) {
      const latest = anxietyMemories[0];
      const daysAgo = Math.floor((Date.now() - latest.timestamp) / 86400000);
      if (daysAgo <= 7) {
        suggestions.push({
          type: 'anxiety_check',
          priority: 9,
          summary: latest.summary,
          daysAgo,
          suggestion: `上次聊到"${latest.summary}"，听起来你当时有些压力。最近感觉怎么样？`
        });
      }
    }

    // 规则2：承诺/目标话题，7天内跟进
    const goalMemories = memories.filter(
      m => (m.topics.includes('技能学习') || m.topics.includes('职业规划')) &&
           m.importance >= 7 && m.followUpCount < 3
    );
    if (goalMemories.length > 0) {
      const latest = goalMemories[0];
      const daysAgo = Math.floor((Date.now() - latest.timestamp) / 86400000);
      if (daysAgo >= 3 && daysAgo <= 14) {
        suggestions.push({
          type: 'goal_followup',
          priority: 8,
          summary: latest.summary,
          daysAgo,
          suggestion: `${daysAgo}天前你提到"${latest.summary}"，进展如何？聊聊你最近的想法？`
        });
      }
    }

    // 规则3：面试/求职相关，3-7天跟进
    const interviewMemories = memories.filter(
      m => (m.topics.includes('实习面试') || m.topics.includes('Offer抉择')) &&
           m.followUpCount < 2
    );
    if (interviewMemories.length > 0) {
      const latest = interviewMemories[0];
      const daysAgo = Math.floor((Date.now() - latest.timestamp) / 86400000);
      if (daysAgo >= 2 && daysAgo <= 10) {
        suggestions.push({
          type: 'interview_followup',
          priority: 8,
          summary: latest.summary,
          daysAgo,
          suggestion: `上次聊到"${latest.summary}"，有没有新进展？`
        });
      }
    }

    // 规则4：完全没有聊过的话题，随机推荐一个领域
    const allTopics = memories.flatMap(m => m.topics);
    const missingTopics = this.TOPIC_PATTERNS
      .map(t => t.topic)
      .filter(t => !allTopics.includes(t) && ['职业规划', '技能学习', '自我认知', '腾讯相关'].includes(t));

    if (missingTopics.length > 0) {
      const randTopic = missingTopics[Math.floor(Math.random() * missingTopics.length)];
      const topicMessages = {
        '职业规划': '要不要聊聊你未来的职业方向？我可以帮你理一理思路~',
        '技能学习': '最近在学什么新技能吗？大二可是打造技能树的黄金时间！',
        '自我认知': '有没有想过你真正擅长什么？我们一起探索一下吧~',
        '腾讯相关': '你了解腾讯的业务吗？我可以给你介绍鹅厂的各个事业群哦~'
      };
      suggestions.push({
        type: 'topic_discovery',
        priority: 6,
        topic: randTopic,
        suggestion: topicMessages[randTopic] || `来聊聊${randTopic}吧~`
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3);
  },

  /**
   * 标记某条记忆已回访
   */
  markFollowedUp(memoryId) {
    const memories = this._load();
    const found = memories.find(m => m.id === memoryId);
    if (found) {
      found.followUpCount = (found.followUpCount || 0) + 1;
      found.lastFollowUp = Date.now();
      this._save();
    }
  },

  /**
   * 获取记忆统计（用于月度报告等）
   */
  getStats() {
    const all = this._load();
    const now = Date.now();
    const thisMonth = all.filter(m => m.timestamp > now - 30 * 86400000);

    const topicCount = {};
    thisMonth.forEach(m => {
      m.topics.forEach(t => {
        topicCount[t] = (topicCount[t] || 0) + 1;
      });
    });

    const avgImportance = thisMonth.length > 0
      ? Math.round(thisMonth.reduce((s, m) => s + m.importance, 0) / thisMonth.length * 10) / 10
      : 0;

    return {
      totalMemories: all.length,
      thisMonthCount: thisMonth.length,
      avgImportance,
      topTopics: Object.entries(topicCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => ({ topic: e[0], count: e[1] })),
      highImportanceCount: thisMonth.filter(m => m.importance >= 8).length
    };
  }
};
