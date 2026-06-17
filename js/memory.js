/**
 * AI企鹅养成 - 长期记忆模块 v2
 * ── 三层记忆架构 ──
 * L0 关键词层：词频统计（保留现有逻辑，基础兜底）
 * L1 结构化层：事件提取 + 情感分析 + 行为分类（纯前端，零 API）
 * L2 语义层：AI 异步摘要（每 10 轮触发，不阻塞聊天）
 */

const MemoryModule = {
  STORAGE_KEY: 'penguin_long_term_memory',
  EMOTION_STORAGE_KEY: 'penguin_emotion_tracker',

  // 情感词典（约 150 词）
  EMOTION_WORDS: {
    positive: [
      '喜欢', '热爱', '开心', '兴奋', '有趣', '好用', '简单', '顺利', '进步', '掌握',
      '学会', '成功', '拿下', '通过', '获奖', '表扬', '愉快', '满意', '惊喜', '高兴',
      '有意思', '有收获', '恍然大悟', '豁然开朗', '受益匪浅', '醍醐灌顶', '如获至宝',
      '感谢', '感恩', '充实', '自信', '自豪', '骄傲', '期望', '期待', '憧憬',
      '好', '棒', '赞', '厉害', '牛', '优秀', '完美', '舒服', '轻松', '放心'
    ],
    negative: [
      '难', '讨厌', '烦', '焦虑', '压力', '不会', '不懂', '放弃', '累', '崩溃',
      '抑郁', '失落', '沮丧', '迷茫', '困惑', '纠结', '担心', '害怕', '紧张', '不安',
      '无从下手', '一塌糊涂', '乱七八糟', '痛苦', '难受', '恶心', '失望', '绝望',
      '乏味', '无聊', '枯燥', '郁闷', '烦躁', '生气', '恼火', '后悔', '自责',
      '差', '烂', '糟糕', '失败', '挂了', '熬夜', '困', '疲惫', '无力'
    ]
  },

  // 行为分类词库
  ACTION_WORDS: {
    learning: ['学', '学习', '刷题', '看书', '读', '上课', '听课', '做笔记', '复习', '预习', '背', '考试', '做题'],
    job_hunting: ['面试', '投简历', '笔试', '实习', '内推', '校招', '秋招', '春招', 'offer', '网申'],
    building: ['做', '写', '开发', '编程', 'coding', '搭建', '实现', '完成', '部署', '上线'],
    deciding: ['纠结', '不确定', '犹豫', '选择', '比较', '权衡', '考虑', '在想'],
    quitting: ['放弃', '不学了', '不想', '算了', '不干了', '摆烂', '躺平', '随便'],
    achieving: ['通过', '拿到', '获得', '完成', '成功', '搞定', '达成', '实现'],
    worrying: ['担心', '害怕', '焦虑', '紧张', '睡不着', '压力大', '崩溃'],
    connecting: ['聊天', '交流', '组队', '社团', '聚会', '认识', '朋友', '同学']
  },

  // L2 语义摘要计数器
  _lastSummarizedCount: 0,
  
  // 向量化引擎状态
  _vocabulary: null,
  _vocabularyDirty: true,
  
  // 记忆数据结构
  memory: {
    // 用户画像
    profile: {
      name: '',
      school: '',
      major: '',
      interests: [],
      goals: [],
      strengths: [],
      weaknesses: []
    },
    
    // 重要事件记忆（关键对话摘要）
    keyEvents: [],
    
    // 学习进度
    learningProgress: {},
    
    // 技能标签（从关键词累计）
    skillTags: {},
    
    // 偏好设置
    preferences: {
      topics: [],       // 常聊话题
      style: 'casual',  // 对话风格偏好
      tone: 'supportive'
    },
    
    // 最近更新
    lastUpdated: Date.now()
  },

  init() {
    this.load();
    // 加载完成后初始化向量引擎
    setTimeout(() => this.initVectorEngine(), 100);
  },

  /**
   * 从对话中提取并更新记忆
   */
  updateFromChat(userMsg, keywordAnalysis, penguinData) {
    const content = userMsg.content;

    // 1. 更新技能标签
    if (keywordAnalysis && keywordAnalysis.matchedDirectionKeywords) {
      keywordAnalysis.matchedDirectionKeywords.forEach(kw => {
        this.memory.skillTags[kw] = (this.memory.skillTags[kw] || 0) + 1;
      });
    }
    if (keywordAnalysis && keywordAnalysis.matchedCompetencyKeywords) {
      keywordAnalysis.matchedCompetencyKeywords.forEach(kw => {
        this.memory.skillTags[kw] = (this.memory.skillTags[kw] || 0) + 1;
      });
    }

    // 2. 提取用户信息（姓名、学校、专业等）
    this.extractProfileInfo(content);

    // 3. 提取兴趣
    this.extractInterests(content);

    // 4. 提取目标
    this.extractGoals(content);

    // 5. 更新常聊话题
    if (keywordAnalysis && keywordAnalysis.direction) {
      const topic = keywordAnalysis.direction.category;
      if (!this.memory.preferences.topics.includes(topic)) {
        this.memory.preferences.topics.push(topic);
        if (this.memory.preferences.topics.length > 10) {
          this.memory.preferences.topics.shift();
        }
      }
    }

    // 6. L1 结构化提取：检测重要事件
    const structured = this.extractStructuredEvent(content);

    if (content.length > 50 || keywordAnalysis.totalWeight >= 8 || structured.dominantAction) {
      this.addKeyEvent({
        type: 'conversation',
        summary: content.slice(0, 100),
        keywords: keywordAnalysis.matchedDirectionKeywords || [],
        date: new Date().toISOString(),
        sentiment: structured.sentiment,
        dominantAction: structured.dominantAction,
        actions: structured.actions,
        subject: structured.subject
      });
    }

    this.memory.lastUpdated = Date.now();
    this.save();

    // 7. 异步触发 L2 语义摘要（不阻塞对话）
    setTimeout(() => this.trySummarizeAsync(), 500);
  },

  /**
   * 提取用户画像信息
   */
  extractProfileInfo(content) {
    // 姓名
    const nameMatch = content.match(/(?:我叫|我是|名字是|叫我)\s*([\u4e00-\u9fa5]{2,4})/);
    if (nameMatch && !this.memory.profile.name) {
      this.memory.profile.name = nameMatch[1];
    }

    // 学校
    const schoolMatch = content.match(/(?:在|读于|学校是)\s*([\u4e00-\u9fa5]+大学)/);
    if (schoolMatch && !this.memory.profile.school) {
      this.memory.profile.school = schoolMatch[1];
    }

    // 专业
    const majorMatch = content.match(/(?:专业是|学的是|读的)\s*([\u4e00-\u9fa5]+)/);
    if (majorMatch && !this.memory.profile.major) {
      this.memory.profile.major = majorMatch[1];
    }
  },

  /**
   * 提取用户兴趣
   */
  extractInterests(content) {
    const interestPatterns = [
      /喜欢(?:做|玩|看|听|读)?\s*([\u4e00-\u9fa5]{2,6})/g,
      /(?:热爱|爱好|感兴趣|擅长)\s*([\u4e00-\u9fa5]{2,6})/g
    ];

    interestPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const interest = match[1];
        if (interest.length >= 2 && !this.memory.profile.interests.includes(interest)) {
          this.memory.profile.interests.push(interest);
          if (this.memory.profile.interests.length > 10) {
            this.memory.profile.interests.shift();
          }
        }
      }
    });
  },

  /**
   * 提取用户目标
   */
  extractGoals(content) {
    const goalPatterns = [
      /(?:目标是|想要|打算|计划|希望|争取)\s*([\u4e00-\u9fa5]{2,20})/g,
      /(?:以后想|未来想|毕业后想)\s*([\u4e00-\u9fa5]{2,20})/g
    ];

    goalPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const goal = match[1];
        if (goal.length >= 2 && !this.memory.profile.goals.includes(goal)) {
          this.memory.profile.goals.push(goal);
          if (this.memory.profile.goals.length > 10) {
            this.memory.profile.goals.shift();
          }
        }
      }
    });
  },

  // ============================================
  //  L1 结构化层：情感分析 + 行为分类（纯前端）
  // ============================================

  /**
   * 计算消息的情感极性（-1 ~ +1）
   */
  calcSentiment(content) {
    let score = 0;
    let matchCount = 0;

    for (const word of this.EMOTION_WORDS.positive) {
      if (content.includes(word)) {
        score += 0.2;
        matchCount++;
      }
    }
    for (const word of this.EMOTION_WORDS.negative) {
      if (content.includes(word)) {
        score -= 0.2;
        matchCount++;
      }
    }

    // 没有匹配到情感词 → 中性
    if (matchCount === 0) return 0;

    return Math.max(-1, Math.min(1, Math.round(score * 100) / 100));
  },

  /**
   * 从消息中提取结构化事件
   * @returns {{ sentiment: number, actions: string[], subject: string, dominantAction: string|null }}
   */
  extractStructuredEvent(content) {
    const result = {
      sentiment: this.calcSentiment(content),
      actions: [],
      subject: 'user',
      dominantAction: null
    };

    // 行为分类
    const actionScores = {};
    for (const [actionType, words] of Object.entries(this.ACTION_WORDS)) {
      for (const word of words) {
        if (content.includes(word)) {
          actionScores[actionType] = (actionScores[actionType] || 0) + 1;
        }
      }
    }

    // 排序取主导行为
    const sorted = Object.entries(actionScores).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      result.dominantAction = sorted[0][0];
      result.actions = sorted.slice(0, 3).map(([a]) => a);
    }

    // 主语检测
    if (/我(?:觉得|认为|想|要|打算|准备|学了|学会了|会了|在|正在)/.test(content)) {
      result.subject = 'user';
    } else if (/老师(?:说|讲了|教|布置)/.test(content)) {
      result.subject = 'teacher';
    } else if (/同学(?:说|推荐|告诉我)/.test(content)) {
      result.subject = 'classmate';
    } else if (/学校|学院|课程/.test(content)) {
      result.subject = 'school';
    }

    return result;
  },

  /**
   * 获取用户的情绪趋势（最近 10 条记录的 sentiment 平均值）
   */
  getEmotionTrend() {
    const recent = this.memory.keyEvents.slice(-10);
    if (recent.length === 0) return 'neutral';

    const avg = recent.reduce((s, e) => s + (e.sentiment || 0), 0) / recent.length;

    if (avg > 0.3) return 'positive';
    if (avg < -0.2) return 'negative';
    if (avg < -0.05) return 'slightly_negative';
    if (avg > 0.1) return 'slightly_positive';
    return 'neutral';
  },

  /**
   * 获取近期主导行为（最近 10 条记录的行为频率统计）
   */
  getDominantActions() {
    const recent = this.memory.keyEvents.slice(-10);
    const actionFreq = {};
    for (const e of recent) {
      if (e.dominantAction) {
        actionFreq[e.dominantAction] = (actionFreq[e.dominantAction] || 0) + 1;
      }
    }
    return Object.entries(actionFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([action, count]) => ({ action, count }));
  },

  // ============================================
  //  L2 语义层：异步 AI 摘要
  // ============================================

  /**
   * 尝试触发 AI 语义记忆摘要
   * 条件：自上次摘要后新增 >= 10 条关键事件
   */
  async trySummarizeAsync() {
    const newCount = this.memory.keyEvents.length - this._lastSummarizedCount;
    if (newCount < 10) return;

    // 避免并发触发
    if (this._isSummarizing) return;
    this._isSummarizing = true;

    try {
      const recentEvents = this.memory.keyEvents.slice(-10);
      const eventTexts = recentEvents.map((e, i) =>
        `[${i + 1}] ${e.summary || '(无内容)'}`
      ).join('\n');

      // 构建摘要 prompt
      const prompt = `请将以下用户与AI企鹅的对话片段提取为JSON格式的结构化记忆分析。只输出JSON，不要其他内容：

${eventTexts}

输出格式（严格JSON）：
{"topics":["话题1","话题2"],"sentiment":"positive/neutral/negative/mixed","interests":["兴趣1"],"concerns":["担忧1"],"learnings":["学到1"],"summary":"一句话总结用户近期状态"}`;

      const result = await this._callAIForSummary(prompt);
      if (result) {
        this._mergeSemanticMemory(result);
        this._lastSummarizedCount = this.memory.keyEvents.length;
        this.save();
        // 语义摘要完成并保存
      }
    } catch (e) {
      console.warn('[Memory L2] 摘要失败，下次重试:', e.message);
    } finally {
      this._isSummarizing = false;
    }
  },

  /**
   * 调用 AI 进行语义摘要（复用 ChatEngine）
   */
  async _callAIForSummary(prompt) {
    if (typeof ChatEngine === 'undefined' || !ChatEngine.isApiKeyReady()) {
      return null; // 无 API Key 静默跳过
    }

    try {
      const response = await ChatEngine.sendMessage(prompt, [], '你是一个数据分析助手，只返回JSON格式数据。');
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * 合并 AI 语义摘要到记忆
   */
  _mergeSemanticMemory(result) {
    if (!result) return;

    // 合并 topics
    if (result.topics) {
      for (const topic of result.topics) {
        if (!this.memory.preferences.recentTopics) this.memory.preferences.recentTopics = [];
        if (!this.memory.preferences.recentTopics.includes(topic)) {
          this.memory.preferences.recentTopics.push(topic);
        }
      }
      if (this.memory.preferences.recentTopics && this.memory.preferences.recentTopics.length > 8) {
        this.memory.preferences.recentTopics = this.memory.preferences.recentTopics.slice(-8);
      }
    }

    // 合并 interests
    if (result.interests) {
      for (const interest of result.interests) {
        if (!this.memory.profile.interests.includes(interest)) {
          this.memory.profile.interests.push(interest);
        }
      }
    }

    // 合并 concerns
    if (result.concerns) {
      if (!this.memory.preferences.concerns) this.memory.preferences.concerns = [];
      for (const c of result.concerns) {
        if (!this.memory.preferences.concerns.includes(c)) {
          this.memory.preferences.concerns.push(c);
        }
      }
      if (this.memory.preferences.concerns.length > 5) {
        this.memory.preferences.concerns = this.memory.preferences.concerns.slice(-5);
      }
    }

    // 保存语义摘要
    this.memory.semanticSummary = result.summary || null;
    this.memory.semanticUpdatedAt = Date.now();
  },

  // ============================================
  //  三级记忆检索
  // ============================================

  /**
   * 三级 + 向量检索：关键词 → 结构化 → 语义 → 向量
   */
  searchMemory(query) {
    const results = [];

    // L0: 关键词匹配
    const queryWords = query.split(/[,，\s]+/).filter(w => w.length >= 2);
    for (const event of this.memory.keyEvents) {
      let score = 0;
      for (const word of queryWords) {
        if ((event.summary || '').includes(word)) score += 1;
      }
      if (score > 0) results.push({ event, score, layer: 'L0' });
    }

    // L1: 结构化匹配（情感/行为）
    const structured = this.extractStructuredEvent(query);
    for (const event of this.memory.keyEvents) {
      if (results.some(r => r.event === event)) continue; // 已匹配跳过
      let score = 0;
      if (event.dominantAction && structured.dominantAction === event.dominantAction) score += 2;
      if (structured.sentiment !== 0 && event.sentiment !== undefined &&
          Math.sign(structured.sentiment) === Math.sign(event.sentiment)) score += 1;
      if (score > 0) results.push({ event, score, layer: 'L1' });
    }

    // L2: 语义匹配（如果有摘要）
    if (this.memory.semanticSummary) {
      const summaryWords = new Set(this.memory.semanticSummary.split(/[,，\s]+/));
      for (const word of queryWords) {
        if (summaryWords.has(word)) {
          results.push({
            event: { summary: this.memory.semanticSummary, type: 'semantic' },
            score: 3,
            layer: 'L2'
          });
          break;
        }
      }
    }

    // ── 向量检索（TF-IDF 余弦相似度）──
    const vectorResults = this.searchByVector(query, 5);
    for (const vr of vectorResults) {
      // 避免与已匹配事件重复，归一化向量分数到 1-5 区间
      if (!results.some(r => r.event === vr.event)) {
        results.push({ event: vr.event, score: Math.round(vr.score * 5), layer: 'vector' });
      }
    }

    // 排序取 Top 5
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  },

  /**
   * 添加关键事件
   */
  addKeyEvent(event) {
    this.memory.keyEvents.push(event);
    // 最多保留50条关键事件
    if (this.memory.keyEvents.length > 50) {
      this.memory.keyEvents = this.memory.keyEvents.slice(-50);
    }
    // 标记词汇表需要重建
    this._vocabularyDirty = true;
    this.save();
  },

  // ============================================
  //  向量化层：TF-IDF 纯前端语义检索
  // ============================================

  /**
   * 中文分词：从文本提取字符级 n-gram 特征
   * 策略：单字(unigram) + 双字(bigram) + 关键词全词匹配
   * @returns {string[]} 特征词列表
   */
  _tokenize(text) {
    if (!text) return [];
    const features = [];
    const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');

    // 单字特征（unigram）
    for (let i = 0; i < cleaned.length; i++) {
      features.push(cleaned[i]);
    }

    // 双字特征（bigram）
    for (let i = 0; i < cleaned.length - 1; i++) {
      features.push(cleaned.substring(i, i + 2));
    }

    return features;
  },

  /**
   * 构建/重建词汇表（计算 IDF）
   * 在所有 keyEvents 上统计文档频率
   */
  _buildVocabulary() {
    const df = {};           // { term: 出现该词的文档数 }
    const totalDocs = this.memory.keyEvents.length;
    this._vocabularyDirty = false;

    if (totalDocs === 0) {
      this._vocabulary = { df: {}, idf: {}, totalDocs: 0 };
      return;
    }

    // 统计每个 term 的文档频率
    for (const event of this.memory.keyEvents) {
      const text = (event.summary || '') + ' ' + (event.dominantAction || '');
      const terms = new Set(this._tokenize(text));
      for (const term of terms) {
        df[term] = (df[term] || 0) + 1;
      }
    }

    // 计算 IDF：idf = log(1 + totalDocs / (1 + df))
    const idf = {};
    for (const [term, count] of Object.entries(df)) {
      idf[term] = Math.log(1 + totalDocs / (1 + count));
    }

    this._vocabulary = { df, idf, totalDocs };
  },

  /**
   * 确保词汇表是有效的
   */
  _ensureVocabulary() {
    if (this._vocabularyDirty || !this._vocabulary || this._vocabulary.totalDocs === 0) {
      this._buildVocabulary();
    }
  },

  /**
   * 将文本编码为 TF-IDF 稀疏向量
   * @param {string} text - 待编码文本
   * @returns {Object} 稀疏向量 { term: tfidf_weight }
   */
  _encodeVector(text) {
    this._ensureVocabulary();
    const { idf, totalDocs } = this._vocabulary;
    const terms = this._tokenize(text);
    const tf = {};
    const vector = {};

    // 计算词频 TF
    for (const term of terms) {
      tf[term] = (tf[term] || 0) + 1;
    }

    // 归一化 TF（除以最大词频）
    const maxTf = Math.max(1, ...Object.values(tf));

    // 计算 TF-IDF
    for (const [term, freq] of Object.entries(tf)) {
      const normalizedTf = freq / maxTf;
      const termIdf = idf[term] || 0;
      vector[term] = normalizedTf * termIdf;
    }

    return vector;
  },

  /**
   * 计算两个稀疏向量的余弦相似度
   * @returns {number} 相似度 [-1, 1]，越大越相似
   */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // 计算点积（只遍历非零维度）
    for (const [term, weightA] of Object.entries(vecA)) {
      normA += weightA * weightA;
      if (vecB[term] !== undefined) {
        dotProduct += weightA * vecB[term];
      }
    }

    for (const weightB of Object.values(vecB)) {
      normB += weightB * weightB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },

  /**
   * 向量化搜索：计算 query 与所有 keyEvents 的余弦相似度
   * @param {string} query - 用户查询文本
   * @param {number} topK - 返回前 K 个最相关结果
   * @returns {Array} 排序后的结果 [{ event, score, layer: 'vector' }]
   */
  searchByVector(query, topK = 5) {
    this._ensureVocabulary();
    const queryVec = this._encodeVector(query);
    const results = [];

    for (let i = 0; i < this.memory.keyEvents.length; i++) {
      const event = this.memory.keyEvents[i];
      const eventText = (event.summary || '') + ' ' + (event.dominantAction || '');
      const eventVec = this._encodeVector(eventText);
      const similarity = this._cosineSimilarity(queryVec, eventVec);

      if (similarity > 0) {
        results.push({ event, score: Math.round(similarity * 1000) / 1000, layer: 'vector', index: i });
      }
    }

    // 按相似度降序排列
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  },

  /**
   * 获取与给定事件最相似的 N 个历史事件
   * @param {Object|number} eventOrIndex - 事件对象或 events 数组索引
   * @param {number} topK - 返回数量
   */
  getRelatedEvents(eventOrIndex, topK = 3) {
    const idx = typeof eventOrIndex === 'number'
      ? eventOrIndex
      : this.memory.keyEvents.indexOf(eventOrIndex);

    if (idx < 0 || idx >= this.memory.keyEvents.length) return [];

    const targetEvent = this.memory.keyEvents[idx];
    const targetText = (targetEvent.summary || '') + ' ' + (targetEvent.dominantAction || '');
    const targetVec = this._encodeVector(targetText);
    const scores = [];

    for (let i = 0; i < this.memory.keyEvents.length; i++) {
      if (i === idx) continue;
      const eventText = (this.memory.keyEvents[i].summary || '') + ' ' + (this.memory.keyEvents[i].dominantAction || '');
      const eventVec = this._encodeVector(eventText);
      const similarity = this._cosineSimilarity(targetVec, eventVec);
      if (similarity > 0.1) {
        scores.push({ event: this.memory.keyEvents[i], score: similarity, index: i });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  },

  /**
   * 初始化向量化引擎（初始化时调用，预计算词汇表）
   */
  initVectorEngine() {
    this._vocabularyDirty = true;
    this._ensureVocabulary();
    const totalDocs = this._vocabulary ? this._vocabulary.totalDocs : 0;
    // 词汇表已就绪
  },

  /**
   * 构建增强版记忆上下文（L0+L1+L2 三层数据）
   */
  buildMemoryContext() {
    const parts = [];

    // ── L0 基础画像 ──
    if (this.memory.profile.name) {
      parts.push(`用户姓名：${this.memory.profile.name}`);
    }
    if (this.memory.profile.school) {
      parts.push(`学校：${this.memory.profile.school}`);
    }
    if (this.memory.profile.major) {
      parts.push(`专业：${this.memory.profile.major}`);
    }
    if (this.memory.profile.interests.length > 0) {
      parts.push(`兴趣爱好：${this.memory.profile.interests.join('、')}`);
    }
    if (this.memory.profile.goals.length > 0) {
      parts.push(`目标：${this.memory.profile.goals.join('、')}`);
    }

    // 技能标签（Top 5）
    const topSkills = Object.entries(this.memory.skillTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => `${skill}(${count}次)`);
    if (topSkills.length > 0) {
      parts.push(`常聊话题：${topSkills.join('、')}`);
    }

    // ── L1 结构化洞察 ──
    const emotionTrend = this.getEmotionTrend();
    const emotionLabels = {
      positive: '积极向上',
      slightly_positive: '略显积极',
      neutral: '情绪平稳',
      slightly_negative: '略有低落',
      negative: '情绪低落'
    };

    const dominantActions = this.getDominantActions();
    if (dominantActions.length > 0) {
      const actionLabels = {
        learning: '学习', job_hunting: '求职准备', building: '动手实践',
        deciding: '选择纠结', quitting: '想放弃', achieving: '取得成果',
        worrying: '焦虑不安', connecting: '社交活动'
      };
      const actionText = dominantActions
        .map(d => actionLabels[d.action] || d.action)
        .join('、');
      parts.push(`近期状态：${emotionLabels[emotionTrend] || '中性'}，主要在${actionText}`);
    } else {
      parts.push(`近期状态：${emotionLabels[emotionTrend] || '中性'}`);
    }

    // ── L2 语义洞察 ──
    if (this.memory.semanticSummary) {
      parts.push(`AI 洞察：${this.memory.semanticSummary}`);
    }
    if (this.memory.preferences.concerns && this.memory.preferences.concerns.length > 0) {
      parts.push(`最近担忧：${this.memory.preferences.concerns.join('、')}`);
    }
    if (this.memory.preferences.recentTopics && this.memory.preferences.recentTopics.length > 0) {
      parts.push(`最近关注：${this.memory.preferences.recentTopics.join('、')}`);
    }

    // 最近关键事件
    const recentEvents = this.memory.keyEvents.slice(-3);
    if (recentEvents.length > 0) {
      parts.push(`近期话题：${recentEvents.map(e => e.summary).join('；')}`);
    }

    // ── 向量相似历史事件（TF-IDF 语义关联）──
    if (this.memory.keyEvents.length >= 3) {
      const latestIdx = this.memory.keyEvents.length - 1;
      const related = this.getRelatedEvents(latestIdx, 2);
      const relatedTexts = related
        .filter(r => r.score > 0.15)
        .map(r => r.event.summary);
      if (relatedTexts.length > 0) {
        parts.push(`相关历史：${relatedTexts.join('；')}`);
      }
    }

    // 洞察建议
    if (emotionTrend === 'negative' || emotionTrend === 'slightly_negative') {
      parts.push('提示：用户近期情绪较低落，请多一些鼓励和共情');
    }

    return parts.length > 0 ? '\n【关于用户的长期记忆】\n' + parts.join('\n') : '';
  },

  /**
   * 获取完整记忆数据
   */
  getAll() {
    return { ...this.memory };
  },

  /**
   * 获取用户画像摘要
   */
  getProfileSummary() {
    return {
      ...this.memory.profile,
      topSkills: Object.entries(this.memory.skillTags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([skill]) => skill),
      totalEvents: this.memory.keyEvents.length
    };
  },

  /**
   * 导出
   */
  export() {
    return JSON.stringify(this.memory, null, 2);
  },

  /**
   * 导入
   */
  import(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this.memory = { ...this.memory, ...data };
      this.save();
      return true;
    } catch (e) {
      return false;
    }
  },

  // ============================================
  //  持久化
  // ============================================
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.memory = { ...this.memory, ...data };
      }
    } catch (e) {
      console.warn('Memory load failed, using defaults');
    }
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.warn('Memory storage full');
    }
  },

  clear() {
    this.memory = {
      profile: { name: '', school: '', major: '', interests: [], goals: [], strengths: [], weaknesses: [] },
      keyEvents: [],
      learningProgress: {},
      skillTags: {},
      preferences: { topics: [], style: 'casual', tone: 'supportive' },
      lastUpdated: Date.now()
    };
    this.save();
  }
};
