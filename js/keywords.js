/**
 * AI企鹅养成 - 关键词分析引擎
 * 核心功能：解析用户消息中的关键词，映射至企鹅配饰和属性变化
 * 
 * 两大关键词体系：
 * 1. DIRECTION_KEYWORDS（方向关键词）→ 主配饰
 * 2. COMPETENCY_KEYWORDS（能力关键词）→ 特质配饰
 */

const KeywordEngine = {
  // =============================================
  //  方向关键词 → 主配饰映射
  // =============================================
  DIRECTION_KEYWORDS: {
    law: {
      keywords: ['法律', '律师', '法院', '法官', '合同', '法规', '诉讼', '仲裁', '法务', '合规', '知识产权', '宪法', '刑法', '民法'],
      mainAccessory: 'judgeHat',      // 法官帽
      accessoryName: '⚖️ 法官帽',
      accessoryColor: '#1A1A1A',
      weight: 5
    },
    programming: {
      keywords: ['编程', '代码', '程序员', '开发', '前端', '后端', '全栈', 'Python', 'Java', 'C++', 'JavaScript', 'React', 'Vue', '算法', '数据结构', 'Git', 'GitHub', '开源', 'API', '数据库', 'SQL', 'Node', 'Docker', 'Kubernetes', '服务器', '部署', '测试', 'Debug'],
      mainAccessory: 'keyboard',      // 键盘
      accessoryName: '⌨️ 键盘',
      accessoryColor: '#E8E8E8',
      weight: 5
    },
    product: {
      keywords: ['产品', '产品经理', 'PM', '需求', '原型', 'PRD', '用户', '体验', 'UX', '交互', '竞品', '市场', '调研', '分析', '数据', '指标', '增长', '转化', '留存', 'A/B测试', '敏捷', 'Sprint', '迭代'],
      mainAccessory: 'badge',         // 工牌
      accessoryName: '🪪 工牌',
      accessoryColor: '#0052D9',
      weight: 5
    },
    design: {
      keywords: ['设计', '设计师', 'UI', '界面', '配色', '排版', '字体', '图标', '插画', 'Figma', 'Sketch', 'PS', 'Photoshop', 'Adobe', '视觉', '品牌', 'Logo', '海报', '动效', '动画', '3D', '建模'],
      mainAccessory: 'palette',       // 调色板
      accessoryName: '🎨 调色板',
      accessoryColor: '#E070B0',
      weight: 5
    },
    operations: {
      keywords: ['运营', '新媒体', '公众号', '短视频', '抖音', '小红书', '微博', 'B站', '内容', '文案', '策划', '活动', '社群', '粉丝', '流量', 'KOL', '直播', '电商', '私域', '裂变', '营销', '品牌', '传播'],
      mainAccessory: 'megaphone',     // 喇叭
      accessoryName: '📢 喇叭',
      accessoryColor: '#F0A030',
      weight: 5
    },
    game: {
      keywords: ['游戏', '电竞', '策划', '关卡', '数值', 'Unity', 'Unreal', 'UE4', 'UE5', 'Cocos', '渲染', 'Shader', '特效', '场景', '角色', '玩法', '平衡', '引擎', '帧率', '优化', '多人在线', 'MOBA', 'RPG', 'FPS'],
      mainAccessory: 'gamepad',       // 手柄
      accessoryName: '🎮 手柄',
      accessoryColor: '#50C878',
      weight: 5
    }
  },

  // =============================================
  //  能力关键词 → 特质配饰映射
  // =============================================
  COMPETENCY_KEYWORDS: {
    learning: {
      keywords: ['怎么学', '如何学', '学习方法', '学习技巧', '记笔记', '复习', '备考', '理解', '掌握', '入门', '进阶', '教程', '课程', '推荐书', '书籍', '资料', '资源', '自学', '效率'],
      traitAccessory: 'glowingEyes',  // 发光眼睛
      accessoryName: '✨ 发光眼睛',
      weight: 3
    },
    criticalThinking: {
      keywords: [
        '为什么', '原因', '原理', '本质', '底层', '根源', 
        '逻辑', '思考', '分析', '批判', '辩证', '论证', 
        '推理', '假设', '验证', '证明',
        '悖论', '谬误', '预设', '前提', '隐含假设',
        '第一性原理', '二阶思考', '元认知', '认知偏见', '认知偏差',
        '视角转换', '稻草人论证', '幸存者偏差', '证实偏差',
        '框架效应', '沉没成本', '锚定效应', '光环效应',
        '归纳', '演绎', '类比', '溯因',
        '反事实', '思想实验', '归谬', '奥卡姆剃刀',
        '系统思维', '反馈回路', '涌现', '还原论',
        '相关性', '因果', '混淆变量',
        '证据', '信源', '可证伪', '置信度',
        '反思', '自省', '复盘', '迭代'
      ],
      traitAccessory: 'lightbulb',    // 灯泡
      accessoryName: '💡 灯泡',
      weight: 3
    },
    teamwork: {
      keywords: ['团队', '合作', '协作', '分工', '沟通', '协调', '组队', '队友', '搭档', '配合', '会议', '讨论', '头脑风暴', '分享', '互助', '支持'],
      traitAccessory: 'shield',       // 盾牌
      accessoryName: '🛡️ 盾牌',
      weight: 3
    },
    anxiety: {
      keywords: ['焦虑', '压力', '紧张', '担心', '害怕', '恐惧', '迷茫', '困惑', '不知所措', '失眠', '内卷', '竞争', '比较', '自卑', '不自信', '怀疑自己', '崩溃', '抑郁', 'emo'],
      traitAccessory: 'gearNecklace', // 齿轮项链（代表调整心态）
      accessoryName: '⚙️ 齿轮项链',
      weight: 3
    },
    tencent: {
      keywords: ['腾讯', 'Tencent', '微信', 'QQ', '王者荣耀', '和平精英', '腾讯云', '企业微信', '腾讯文档', '腾讯会议', '微信支付', '小程序', '视频号'],
      traitAccessory: 'penguinBadge', // 企鹅徽章
      accessoryName: '🐧 企鹅徽章',
      weight: 4
    },
    tcp: {
      keywords: ['TCP', 'IP', 'HTTP', 'HTTPS', '网络', '协议', 'Socket', 'WebSocket', 'DNS', 'CDN', '负载均衡', 'Nginx', '网关', '代理', '防火墙'],
      traitAccessory: 'networkCable', // 网线
      accessoryName: '🔌 网线',
      weight: 3
    },
    algorithm: {
      keywords: ['算法', '排序', '搜索', '动态规划', '贪心', '回溯', '分治', '图论', '树', '哈希', '链表', '队列', '栈', '堆', '递归', '时间复杂度', '空间复杂度', 'LeetCode', '刷题', '面试题', '笔试'],
      traitAccessory: 'brainGear',    // 大脑齿轮
      accessoryName: '🧠 思维齿轮',
      weight: 4
    },
    growth: {
      keywords: ['成长', '进步', '提升', '改变', '突破', '挑战', '目标', '梦想', '理想', '未来', '规划', '职业', '发展', '方向', '选择', '道路'],
      traitAccessory: 'starBadge',    // 星星徽章
      accessoryName: '⭐ 成长之星',
      weight: 2
    }
  },

  // =============================================
  //  配饰累计数据存储
  // =============================================
  // 累计配饰计数（localStorage持久化）
  accessoryCounts: {},

  /**
   * 分析用户消息，返回所有匹配结果
   * @param {string} message - 用户输入的消息
   * @returns {Object} 分析结果
   */
  analyze(message) {
    const result = {
      direction: null,           // 匹配到的方向 { category, accessory, name, color, weight, matchedKeywords }
      competencies: [],          // 匹配到的能力列表
      matchedDirectionKeywords: [],
      matchedCompetencyKeywords: [],
      totalWeight: 0
    };

    const lowerMsg = message.toLowerCase();

    // 1. 分析方向关键词
    let maxDirectionWeight = 0;
    for (const [category, config] of Object.entries(this.DIRECTION_KEYWORDS)) {
      let matchCount = 0;
      const matched = [];
      
      for (const kw of config.keywords) {
        if (lowerMsg.includes(kw.toLowerCase())) {
          matchCount++;
          matched.push(kw);
        }
      }
      
      if (matchCount > 0) {
        const totalWeight = matchCount * config.weight;
        if (totalWeight > maxDirectionWeight) {
          maxDirectionWeight = totalWeight;
          result.direction = {
            category,
            accessory: config.mainAccessory,
            name: config.accessoryName,
            color: config.accessoryColor,
            weight: totalWeight,
            matchedKeywords: matched
          };
          result.matchedDirectionKeywords = matched;
        }
      }
    }

    // 2. 分析能力关键词
    for (const [category, config] of Object.entries(this.COMPETENCY_KEYWORDS)) {
      let matchCount = 0;
      const matched = [];
      
      for (const kw of config.keywords) {
        if (lowerMsg.includes(kw.toLowerCase())) {
          matchCount++;
          matched.push(kw);
        }
      }
      
      if (matchCount > 0) {
        const totalWeight = matchCount * config.weight;
        result.competencies.push({
          category,
          accessory: config.traitAccessory,
          name: config.accessoryName,
          weight: totalWeight,
          matchedKeywords: matched
        });
        result.matchedCompetencyKeywords.push(...matched);
      }
    }

    result.totalWeight = (result.direction ? result.direction.weight : 0) 
      + result.competencies.reduce((sum, c) => sum + c.weight, 0);

    return result;
  },

  /**
   * 更新配饰累计计数
   * @param {Object} analysisResult - analyze() 的返回结果
   */
  updateAccessoryCounts(analysisResult) {
    // 从 localStorage 加载现有计数
    this.loadAccessoryCounts();

    if (analysisResult.direction) {
      const acc = analysisResult.direction.accessory;
      this.accessoryCounts[acc] = (this.accessoryCounts[acc] || 0) + 1;
    }

    for (const comp of analysisResult.competencies) {
      const acc = comp.accessory;
      this.accessoryCounts[acc] = (this.accessoryCounts[acc] || 0) + 1;
    }

    this.saveAccessoryCounts();
  },

  /**
   * 获取当前应显示的配饰列表（基于累计计数）
   * 按出现频次排序，最多返回 topN 个
   * @param {number} topN - 最多返回几个配饰
   * @returns {Array} 配饰列表
   */
  getActiveAccessories(topN = 3) {
    this.loadAccessoryCounts();
    
    const sorted = Object.entries(this.accessoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return sorted.map(([accessory, count]) => {
      // 找到对应的名称
      const allDirection = Object.values(this.DIRECTION_KEYWORDS);
      const allComp = Object.values(this.COMPETENCY_KEYWORDS);
      const all = [...allDirection, ...allComp];
      
      for (const config of all) {
        if (config.mainAccessory === accessory || config.traitAccessory === accessory) {
          return {
            id: accessory,
            name: config.accessoryName || accessory,
            count,
            color: config.accessoryColor || '#666'
          };
        }
      }
      
      return { id: accessory, name: accessory, count, color: '#666' };
    });
  },

  /**
   * 重置配饰计数
   */
  resetAccessoryCounts() {
    this.accessoryCounts = {};
    this.saveAccessoryCounts();
  },

  /**
   * 从 localStorage 加载配饰计数
   */
  loadAccessoryCounts() {
    try {
      const raw = localStorage.getItem('penguin_accessory_counts');
      this.accessoryCounts = raw ? JSON.parse(raw) : {};
    } catch (e) {
      this.accessoryCounts = {};
    }
  },

  /**
   * 保存配饰计数到 localStorage
   */
  saveAccessoryCounts() {
    try {
      localStorage.setItem('penguin_accessory_counts', JSON.stringify(this.accessoryCounts));
    } catch (e) {
      console.warn('Failed to save accessory counts');
    }
  },

  // =============================================
  //  年级自适应推荐问题
  // =============================================
  GRADE_QUESTIONS: {
    freshman: [
      { q: '大学和高中最大的不同是什么？', icon: '🎓' },
      { q: '怎么选择适合自己的社团？', icon: '🤝' },
      { q: '如何快速适应大学生活？', icon: '🏫' },
      { q: '大一需要开始考虑职业规划吗？', icon: '🧭' },
      { q: '室友关系怎么处理比较好？', icon: '🏠' },
      { q: '选课有什么技巧吗？', icon: '📝' },
      { q: '大学期间应该培养哪些习惯？', icon: '🌱' },
      { q: '如何在大学里交到志同道合的朋友？', icon: '👥' }
    ],
    sophomore: [
      { q: '如何确定自己的专业方向？', icon: '🎯' },
      { q: '要不要辅修第二专业？', icon: '📚' },
      { q: '怎么开始学习编程？', icon: '💻' },
      { q: '参加竞赛对求职有帮助吗？', icon: '🏆' },
      { q: '大二暑假应该实习还是学习？', icon: '☀️' },
      { q: '如何平衡学习和社团活动？', icon: '⚖️' },
      { q: '产品经理和程序员哪个更适合我？', icon: '🤔' },
      { q: '推荐一些大学生必读的书？', icon: '📖' }
    ],
    junior: [
      { q: '怎么写一份让HR眼前一亮的简历？', icon: '📋' },
      { q: '腾讯的面试流程是什么样的？', icon: '🏢' },
      { q: '技术岗和非技术岗该怎么选？', icon: '🔄' },
      { q: '实习期间如何快速成长？', icon: '🚀' },
      { q: '如何准备技术面试中的算法题？', icon: '🧮' },
      { q: '产品经理需要懂技术吗？', icon: '💡' },
      { q: '校招和社招的区别是什么？', icon: '🔍' },
      { q: '如何打造自己的项目作品集？', icon: '🎨' }
    ],
    senior: [
      { q: '收到多个offer怎么选择？', icon: '🤔' },
      { q: '腾讯的职级体系是怎样的？', icon: '📊' },
      { q: '如何做好从学生到职场人的转变？', icon: '🔄' },
      { q: '毕业设计怎么做得更出彩？', icon: '🎓' },
      { q: '入职前需要做哪些准备？', icon: '✅' },
      { q: '第一份工作最重要的是什么？', icon: '⭐' },
      { q: '如何规划毕业后的职业路径？', icon: '🗺️' },
      { q: '职场新人最容易犯什么错误？', icon: '⚠️' }
    ]
  },

  /**
   * 获取年级对应的推荐问题
   * @param {string} grade - freshman/sophomore/junior/senior
   * @param {number} count - 返回数量
   * @returns {Array} 推荐问题列表
   */
  getSuggestedQuestions(grade, count = 5) {
    const questions = this.GRADE_QUESTIONS[grade] || this.GRADE_QUESTIONS.freshman;
    // 随机打乱后取 count 个
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },

  /**
   * 根据用户最近关键词动态生成推荐问题
   * @param {Array} recentKeywords - 最近匹配到的关键词
   * @returns {Array} 动态推荐问题
   */
  generateDynamicQuestions(recentKeywords) {
    const suggestions = [];
    const keywordSet = new Set(recentKeywords || []);

    if (keywordSet.has('编程') || keywordSet.has('算法')) {
      suggestions.push({ q: '给我出一个简单的算法题练练手？', icon: '🧮' });
    }
    if (keywordSet.has('简历') || keywordSet.has('面试')) {
      suggestions.push({ q: '帮我看看简历还有什么可以优化的？', icon: '📋' });
    }
    if (keywordSet.has('腾讯') || keywordSet.has('互联网')) {
      suggestions.push({ q: '腾讯的企业文化是什么样的？', icon: '🐧' });
    }
    if (keywordSet.has('产品') || keywordSet.has('设计')) {
      suggestions.push({ q: '产品经理的一天是怎样的？', icon: '📱' });
    }
    if (keywordSet.has('焦虑') || keywordSet.has('压力')) {
      suggestions.push({ q: '可以给我一些缓解压力的建议吗？', icon: '💆' });
    }
    if (keywordSet.has('团队') || keywordSet.has('合作')) {
      suggestions.push({ q: '如何在团队项目中更好地协作？', icon: '🤝' });
    }
    if (keywordSet.has('游戏') || keywordSet.has('策划')) {
      suggestions.push({ q: '游戏策划需要具备哪些核心能力？', icon: '🎮' });
    }
    if (keywordSet.has('法律') || keywordSet.has('法务')) {
      suggestions.push({ q: '互联网法务主要做什么工作？', icon: '⚖️' });
    }

    return suggestions.slice(0, 5);
  }
};
