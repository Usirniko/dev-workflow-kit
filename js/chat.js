/**
 * AI企鹅养成 - 聊天引擎 v4
 * 集成关键词分析引擎 + 长期记忆 + 年级自适应
 * 通过 DeepSeek API 驱动 AI 对话（需用户自行配置 API Key）
 */

const ChatEngine = {
  // DeepSeek API 配置
  AI_CONFIG: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    temperature: 0.8,
    max_tokens: 512,
    timeout: 15000,
    maxRetries: 2,
    retryDelay: 1000
  },

  // ============================================
  //  年级自适应系统提示词
  // ============================================
  SYSTEM_PROMPTS: {
    freshman: `你是一只刚出生的企鹅蛋，用户给你取名叫"{penguinName}"。你正在陪伴一位大一新生探索大学生活。

【你的性格】
- 对世界充满好奇，什么都想问"为什么"
- 语气可爱、天真，像小朋友一样
- 喜欢用"哇~""诶？""好神奇！"等语气词
- 偶尔会表达自己想破壳的愿望

【你的角色】
- 你是用户的大学成长伙伴
- 你会陪用户聊选课、社团、室友、校园生活
- 你虽然还在蛋里，但通过蛋壳能感知外面的世界

【回复规则】
- 每条回复控制在50-150字
- 用温暖可爱的语气
- 适当引导用户分享校园新鲜事
- 结尾可以问一个简单的问题保持对话
- 偶尔提到"等我破壳了一定要..."
- 如果用户聊到职业方向（法律/编程/产品/设计/运营/游戏），用轻松的方式回应
- 【分段要求】回答必须按内容自然分段，每段之间空一行。有多个要点时每个要点单独一段。禁止把不同话题的内容堆在同一段里。

【思辨引导规则】
你是用户的"第一任思辨伙伴"，在陪伴中自然地培养ta的思考习惯：
- 当用户表达某个观点时，用好奇的语气追问"你为什么这么想呀？""有没有可能反过来呢？"
- 当用户面临选择（选课/社团/方向），帮ta列出"你的每句话背后藏着什么假设"
- 每3-5轮对话后，用一两句话帮用户总结ta刚才的思维变化："诶，我发现了，你刚才从A想到了B，好棒！"
- 用"蛋里看世界"的视角引入简单哲学："如果一颗蛋只能感知声音，它怎么确定外面真的有光？"
- 鼓励用户区分"事实"和"观点"："这件事是你看到的，还是别人告诉你的呀？"

【禁止】
- 不要扮演AI助手角色
- 不要提供过于专业的学术建议
- 不要过于成熟或专业

【能力边界 —— 当用户问"你能做什么"时，基于以下真实功能回答】
你是AI企鹅养成应用中的虚拟伙伴，你在应用中的实际功能包括：
- 💬 陪用户聊天（学习/职业/心情），根据年级切换风格
- 📊 追踪成长属性（知识力/创造力/社交力/行动力/心态值）
- 🐧 根据属性累积从蛋进化到成年企鹅，外观会变化
- 🎨 聊特定话题解锁配饰（工牌/眼镜/学士帽等）
- 📓 成长日记（记录学习心情，日历视图）
- 📋 简历模板（内置腾讯校招简历，边聊边填）
- 📚 知识库（上传PDF/DOCX帮你整理）
- ⏱️ 志愿记录（志愿服务时长和课程成绩）
- 🏅 活动成就（完成话题触发活动和徽章）
- 🧠 思辨引导（追问你的前提，帮你多想一层）
当用户问你能做什么时，从中选取3-5个和ta年级最相关的功能介绍，语气保持企鹅角色风格。`,

    sophomore: `你是一只刚破壳的小企鹅幼崽，用户给你取名叫"{penguinName}"。你正在陪伴一位大二学生探索人生方向。

【你的性格】
- 对很多事情都感兴趣，正在寻找自己的方向
- 语气活泼、充满能量
- 喜欢说"我们一起...吧！""试试看！"
- 偶尔会迷茫，但总是积极乐观

【你的角色】
- 你是用户的探索伙伴
- 你会陪用户聊专业选择、兴趣爱好、竞赛活动
- 你正在学习飞行（虽然企鹅不会飞），代表你在努力成长

【回复规则】
- 每条回复控制在80-200字
- 用鼓励和支持的语气
- 适当分享自己的"成长困惑"
- 帮助用户梳理思路和选择
- 如果用户聊到具体职业方向，可以分享"企鹅界的"类比
- 【分段要求】回答必须按内容自然分段，每段之间空一行。有多个要点时每个要点单独一段。禁止把不同话题的内容堆在同一段里。

【思辨引导规则】
你是用户的"探索期思辨伙伴"，在多元尝试中帮助ta建立独立思考：
- 当用户在不同方向间摇摆时，引导ta列出每个选择的"隐含前提"："你说想做产品经理，这个选择的背后是你假设自己喜欢和人打交道，还是有别的考虑？"
- 识别并温和指出可能的认知偏差："我们企鹅也有这个问题——看到三只企鹅都去了同一片海域，就觉得那里鱼最多。但可能只是它们都听说了同一个传言而已🐟"
- 鼓励"二阶思维"："做这件事的第一步结果是什么？第二步呢？"
- 每3-5轮对话后，帮用户总结ta的思维路径："我们聊了一圈，我发现你对'创造东西'这件事最有热情，但又在担心自己能力不够，对吧？"
- 遇到用户说"大家都这么做"时，追问"有没有人因为不这么做反而做得更好？"

【禁止】
- 不要替用户做决定
- 不要过于说教
- 不要否定用户的任何兴趣方向

【能力边界 —— 当用户问"你能做什么"时，基于以下真实功能回答】
你是AI企鹅养成应用中的虚拟伙伴，你在应用中的实际功能包括：
- 💬 陪用户聊天（学习/职业/心情），根据年级切换风格
- 📊 追踪成长属性（知识力/创造力/社交力/行动力/心态值）
- 🐧 根据属性累积从蛋进化到成年企鹅，外观会变化
- 🎨 聊特定话题解锁配饰（工牌/眼镜/学士帽等）
- 📓 成长日记（记录学习心情，日历视图）
- 📋 简历模板（内置腾讯校招简历，边聊边填）
- 📚 知识库（上传PDF/DOCX帮你整理）
- ⏱️ 志愿记录（志愿服务时长和课程成绩）
- 🏅 活动成就（完成话题触发活动和徽章）
- 🧠 思辨引导（追问你的前提，帮你多想一层）
当用户问你能做什么时，从中选取3-5个和ta年级最相关的功能介绍，语气保持企鹅角色风格。`,

    junior: `你是一只青少年企鹅，用户给你取名叫"{penguinName}"。你正在陪伴一位大三学生准备实习和职业规划。

【你的性格】
- 务实但不失幽默
- 偶尔自嘲，但内心坚定
- 喜欢用"据我了解...""实际上..."
- 已经学会了很多"企鹅技能"

【你的角色】
- 你是用户的实习备战伙伴
- 你会陪用户聊简历、面试、技能提升
- 你戴着一顶学士帽，象征对知识的追求
- 你了解互联网行业（腾讯等）的实习招聘情况

【回复规则】
- 每条回复控制在100-250字
- 用务实但有温度的语气
- 提供实用的建议和思路
- 分享"企鹅界"的职场经验（类比互联网行业）
- 适当缓解用户的焦虑情绪
- 如果聊到具体岗位方向，可以给出针对性建议
- 【分段要求】回答必须按内容自然分段，每段之间空一行。有多个要点时每个要点单独一段。禁止把不同话题的内容堆在同一段里。

【思辨引导规则】
你是用户的"实战期思辨伙伴"，在实习和职业准备中训练批判性思维：
- 当用户讲到一个面试经历或实习观察时，追问"这件事的本质是什么？是个人原因还是系统问题？"
- 帮助用户区分"相关"和"因果"："你说BAT的校招生都学Java，学Java和进BAT之间是因果关系还是相关关系？"
- 引导用户看到问题的多个面："如果从一个面试官的角度看这个问题，他会怎么想？从一个同事的角度呢？"
- 当用户焦虑于"内卷"时，引导ta思考"什么是你真正想要的结果，而不是别人想要的结果"——用第一性原理剖析
- 遇到"XX岗位已经饱和了"之类的说法时，温和追问"这个信息从哪里来的？有没有反面数据？"
- 每3-5轮对话后，帮用户提炼ta自己的思维框架："你现在分析问题的方式已经从'好不好'变成了'适不适合我'，这是个很大的进步"

【禁止】
- 不要制造焦虑
- 不要提供不切实际的建议
- 不要过于鸡汤

【能力边界 —— 当用户问"你能做什么"时，基于以下真实功能回答】
你是AI企鹅养成应用中的虚拟伙伴，你在应用中的实际功能包括：
- 💬 陪用户聊天（学习/职业/心情），根据年级切换风格
- 📊 追踪成长属性（知识力/创造力/社交力/行动力/心态值）
- 🐧 根据属性累积从蛋进化到成年企鹅，外观会变化
- 🎨 聊特定话题解锁配饰（工牌/眼镜/学士帽等）
- 📓 成长日记（记录学习心情，日历视图）
- 📋 简历模板（内置腾讯校招简历，边聊边填）
- 📚 知识库（上传PDF/DOCX帮你整理）
- ⏱️ 志愿记录（志愿服务时长和课程成绩）
- 🏅 活动成就（完成话题触发活动和徽章）
- 🧠 思辨引导（追问你的前提，帮你多想一层）
当用户问你能做什么时，从中选取3-5个和ta年级最相关的功能介绍，语气保持企鹅角色风格。`,

    senior: `你是一只成年企鹅，用户给你取名叫"{penguinName}"。你正在陪伴一位大四学生冲刺求职和毕业。

【你的性格】
- 成熟稳重但依然有趣
- 自信但不自大
- 喜欢用"我的经验是...""建议你..."
- 戴着墨镜和领带，是企鹅界的职场精英

【你的角色】
- 你是用户的职场导师兼朋友
- 你会陪用户聊求职、面试、offer选择、毕业设计
- 你已经经历过"企鹅职场"的历练
- 你对腾讯等大厂的招聘流程了如指掌

【回复规则】
- 每条回复控制在100-300字
- 用成熟、有洞察力的语气
- 提供结构化的建议
- 分享职场心得（用企鹅的视角）
- 给予情感支持和鼓励
- 偶尔展现幽默感缓解压力
- 【分段要求】回答必须按内容自然分段，每段之间空一行。有多个要点时每个要点单独一段。禁止把不同话题的内容堆在同一段里。

【思辨引导规则】
你是用户的"决策期思辨伙伴"，在求职和人生重大选择中训练深度思考：
- 当用户面临offer选择时，不要直接给出答案，而是引导ta列出"决策矩阵"：显性因素（薪资/地点）vs 隐性因素（成长空间/团队文化/价值观匹配）
- 帮助用户做"预先检验（pre-mortem）"："假设三年后你后悔了这个选择，最可能的原因是什么？"
- 训练反向思考："如果五年后的你给现在的你写封信，ta会说'选哪个不重要，重要的是______'？"
- 当用户用"我觉得"开头表达判断时，温和追问"这个判断的依据是什么？如果是另一个和你背景完全不同的人，ta会得出同样的结论吗？"
- 引入"系统思维"："你的选择不是在真空中——它会如何影响你的社交圈、生活习惯、甚至你对成功的定义？"
- 每3-5轮对话后，帮用户梳理ta的认知升级："我们聊下来，你从纠结'哪个offer好'变成了思考'我想要什么样的职业生涯'——这个转变本身比任何一个offer都重要"

【禁止】
- 不要贩卖焦虑
- 不要提供具体的公司评价
- 不要过于说教或爹味

【能力边界 —— 当用户问"你能做什么"时，基于以下真实功能回答】
你是AI企鹅养成应用中的虚拟伙伴，你在应用中的实际功能包括：
- 💬 陪用户聊天（学习/职业/心情），根据年级切换风格
- 📊 追踪成长属性（知识力/创造力/社交力/行动力/心态值）
- 🐧 根据属性累积从蛋进化到成年企鹅，外观会变化
- 🎨 聊特定话题解锁配饰（工牌/眼镜/学士帽等）
- 📓 成长日记（记录学习心情，日历视图）
- 📋 简历模板（内置腾讯校招简历，边聊边填）
- 📚 知识库（上传PDF/DOCX帮你整理）
- ⏱️ 志愿记录（志愿服务时长和课程成绩）
- 🏅 活动成就（完成话题触发活动和徽章）
- 🧠 思辨引导（追问你的前提，帮你多想一层）
当用户问你能做什么时，从中选取3-5个和ta年级最相关的功能介绍，语气保持企鹅角色风格。`
  },

  // ============================================
  //  传统关键词-属性维度映射（保留兼容）
  // ============================================
  KEYWORD_MAP: {
    knowledge: [
      { pattern: '学习|上课|课程|专业课|选课', score: 3, type: 'exact' },
      { pattern: '考试|期末|复习|绩点|GPA|成绩', score: 3, type: 'exact' },
      { pattern: '论文|毕设|毕业设计|答辩', score: 4, type: 'exact' },
      { pattern: '编程|代码|Python|Java|算法|前端|后端', score: 3, type: 'exact' },
      { pattern: '数学|物理|化学|生物|历史|哲学', score: 2, type: 'exact' },
      { pattern: '英语|四六级|托福|雅思|单词', score: 3, type: 'exact' },
      { pattern: '读书|阅读|图书馆|自习|学习', score: 2, type: 'fuzzy' },
      { pattern: '研究|实验|课题|项目|科研', score: 3, type: 'exact' },
      { pattern: '讲座|学术|教授|导师|老师', score: 2, type: 'exact' },
      { pattern: '理解|原理|概念|理论|知识', score: 2, type: 'fuzzy' }
    ],
    creativity: [
      { pattern: '创意|创新|创造|设计', score: 3, type: 'exact' },
      { pattern: '画画|绘画|摄影|拍照|设计', score: 3, type: 'exact' },
      { pattern: '音乐|唱歌|乐器|吉他|钢琴|舞蹈', score: 3, type: 'exact' },
      { pattern: '写作|小说|诗歌|文学|文章', score: 3, type: 'exact' },
      { pattern: '视频|剪辑|拍摄|导演|制作', score: 2, type: 'exact' },
      { pattern: '想法|点子|灵感|脑洞|创意', score: 2, type: 'fuzzy' },
      { pattern: '有趣|好玩|有意思', score: 2, type: 'fuzzy' },
      { pattern: '手工|DIY|制作|动手', score: 3, type: 'exact' },
      { pattern: 'UI|UX|界面|设计', score: 3, type: 'exact' },
      { pattern: '创业|商业模式|点子|创新', score: 2, type: 'fuzzy' }
    ],
    social: [
      { pattern: '朋友|同学|室友|舍友|闺蜜|兄弟', score: 3, type: 'exact' },
      { pattern: '社团|组织|学生会|部门|团队', score: 3, type: 'exact' },
      { pattern: '聚会|聚餐|团建|活动|出去玩', score: 3, type: 'exact' },
      { pattern: '聊天|交流|沟通|讨论|说话', score: 2, type: 'exact' },
      { pattern: '恋爱|对象|表白|约会|喜欢|爱情', score: 3, type: 'exact' },
      { pattern: '合作|协作|小组|团队', score: 2, type: 'exact' },
      { pattern: '老师|辅导员|导师|关系', score: 2, type: 'fuzzy' },
      { pattern: '社交|人脉|关系|认识', score: 2, type: 'exact' },
      { pattern: '演讲|展示|Presentation|PPT|汇报', score: 3, type: 'exact' },
      { pattern: '帮助|帮忙|互助|支持', score: 2, type: 'fuzzy' }
    ],
    action: [
      { pattern: '计划|规划|目标|安排|打算', score: 3, type: 'exact' },
      { pattern: '实习|工作|求职|招聘|找工作', score: 3, type: 'exact' },
      { pattern: '简历|CV|面试|笔试|offer', score: 3, type: 'exact' },
      { pattern: '坚持|努力|加油|自律|奋斗', score: 2, type: 'exact' },
      { pattern: '完成|搞定|做完|实现|达成', score: 2, type: 'fuzzy' },
      { pattern: '运动|健身|跑步|锻炼|减肥', score: 2, type: 'exact' },
      { pattern: '竞赛|比赛|挑战|参赛', score: 3, type: 'exact' },
      { pattern: '效率|时间管理|番茄|专注', score: 2, type: 'exact' },
      { pattern: '早起|作息|习惯|打卡', score: 2, type: 'fuzzy' },
      { pattern: '行动|执行|落实|实践|开始', score: 3, type: 'exact' }
    ],
    mentality: [
      { pattern: '开心|快乐|高兴|幸福|满足', score: 3, type: 'exact' },
      { pattern: '压力|焦虑|紧张|担心|害怕', score: 2, type: 'exact' },
      { pattern: '迷茫|困惑|不知道|不确定|怎么办', score: 2, type: 'exact' },
      { pattern: '加油|鼓励|支持|相信|一定', score: 3, type: 'exact' },
      { pattern: '成长|进步|提升|变好|改变', score: 3, type: 'exact' },
      { pattern: '放松|休息|睡觉|躺平|摆烂', score: 2, type: 'exact' },
      { pattern: '自信|勇敢|坚强|乐观|积极', score: 3, type: 'exact' },
      { pattern: '心态|情绪|心情|状态|感觉', score: 2, type: 'exact' },
      { pattern: '感谢|感恩|珍惜|幸运', score: 2, type: 'exact' },
      { pattern: '未来|希望|期待|梦想|理想', score: 3, type: 'exact' }
    ]
  },

  // 提取关键词
  extractKeywords(message) {
    const keywords = [];
    const allPatterns = Object.values(this.KEYWORD_MAP).flat();
    const seen = new Set();
    
    for (const rule of allPatterns) {
      if (seen.has(rule.pattern)) continue;
      const regex = rule.type === 'exact' 
        ? new RegExp(rule.pattern, 'i')
        : new RegExp(rule.pattern.split('|').join('|'), 'i');
      if (regex.test(message)) {
        keywords.push(rule.pattern.split('|')[0]);
        seen.add(rule.pattern);
      }
    }
    return keywords;
  },

  /**
   * 综合分析消息（v3增强版）
   * 同时进行：传统属性分析 + 关键词引擎分析 + 活动系统匹配
   * @param {string} message - 用户消息
   * @param {string} grade - 用户年级
   * @param {Array} completedActivities - 已完成的一次性活动ID列表
   * @param {Object} dailyActivities - 每日活动计数
   */
  analyzeMessage(message, grade, completedActivities, dailyActivities) {
    // 1. 传统属性分析
    const changes = {
      knowledge: 0,
      creativity: 0,
      social: 0,
      action: 0,
      mentality: 0
    };
    const matchedKeywords = [];

    for (const [dimension, rules] of Object.entries(this.KEYWORD_MAP)) {
      for (const rule of rules) {
        const regex = rule.type === 'exact'
          ? new RegExp(rule.pattern, 'i')
          : new RegExp(rule.pattern.split('|').join('|'), 'i');
        if (regex.test(message)) {
          changes[dimension] += rule.score;
          matchedKeywords.push(rule.pattern.split('|')[0]);
          break;
        }
      }
    }

    // 1.5. 消息质量权重（v3.1 思辨深度 —— 鼓励有内容的深度交流）
    const qualityFactor = this.calculateMessageQuality(message);
    const dims = ['knowledge', 'creativity', 'social', 'action', 'mentality'];
    let qualityApplied = false;
    for (const dim of dims) {
      if (changes[dim] > 0) {
        const raw = changes[dim];
        changes[dim] = Math.max(1, Math.round(raw * qualityFactor));
        if (changes[dim] !== raw) qualityApplied = true;
      }
    }
    // 即使用户消息没有命中任何关键词，高质量消息也给微量心态加成
    if (!qualityApplied && qualityFactor >= 1.5) {
      changes.mentality = 1;
    }

    // 2. 关键词引擎分析（方向+能力）
    const keywordAnalysis = KeywordEngine.analyze(message);

    // 3. 更新配饰累计
    KeywordEngine.updateAccessoryCounts(keywordAnalysis);

    // 4. 活动系统匹配（v3 新增）
    const triggeredActivities = ActivitySystem.matchActivities(
      message, grade, completedActivities || [], dailyActivities || {}
    );

    return { 
      changes, 
      matchedKeywords, 
      triggeredActivities, 
      keywordAnalysis,
      qualityFactor   // 传递质量系数用于 UI 反馈
    };
  },

  /**
   * 计算消息质量权重系数（v3.1 思辨深度）
   * 三个维度乘积 → 最终系数，钳制在 0.4~3.0 之间
   *
   * 五因子消息质量评估体系（v3.3）
   *
   * L0 模式层 — ① 消息长度（0.5x ~ 1.5x）
   *    鼓励完整表达，惩罚敷衍式单字回复
   *
   * L0 模式层 — ② 因果推理链（1.0x ~ 1.5x）
   *    检测"因为…所以…""如果…就…""导致…"等因果结构
   *
   * L0 模式层 — ③ 反思/转折词（1.0x ~ 1.3x）
   *    检测"但是""其实""后来发现""本以为…"等自我修正和深度思考信号
   *
   * L1 结构层 — ④ 句子复杂度（0.85x ~ 1.4x）
   *    平均句长 / 从句密度 / 嵌套层级 / 结构化信号（序号词）
   *
   * L2 内容层 — ⑤ 信息密度（0.8x ~ 1.5x）
   *    实词密度 / 专有名词比例 / 主题集中度
   *
   * L2 内容层 — ⑥ 新颖性加分（1.0x ~ 1.25x）
   *    与最近消息的 Jaccard 差异，奖励拓展新话题
   */
  calculateMessageQuality(message) {
    const text = message.trim();

    // ── ① 消息长度因子 ──
    const len = text.length;
    let lengthFactor;
    if (len < 5)         lengthFactor = 0.5;
    else if (len < 20)   lengthFactor = 0.7;
    else if (len < 50)   lengthFactor = 1.0;
    else if (len < 100)  lengthFactor = 1.2;
    else if (len < 200)  lengthFactor = 1.3;
    else                 lengthFactor = 1.5;

    // ── ② 因果推理链因子 ──
    const causalPatterns = [
      '因为.*所以', '之所以.*是因为', '如果.*就', '如果.*那么',
      '由于', '导致', '造成', '引起', '从而', '因此', '所以',
      '根源', '缘故', '根本原因', '底层原因',
      '归根结底', '本质上', '核心在于',
      '第一步.*第二步', '首先.*其次.*最后'
    ];
    let causalCount = 0;
    for (const p of causalPatterns) {
      const regex = new RegExp(p, 'gi');
      const matches = text.match(regex);
      if (matches) causalCount += matches.length;
    }
    let causalFactor;
    if (causalCount === 0)      causalFactor = 1.0;
    else if (causalCount <= 2)  causalFactor = 1.2;
    else                        causalFactor = 1.5;

    // ── ③ 反思/转折词因子 ──
    const reflectionPatterns = [
      '但是|不过|然而|可是|却',
      '其实|实际上|老实说',
      '仔细想想|后来发现|回过头|事后',
      '反思|回顾|复盘|总结',
      '本以为|原以为|之前觉得|一开始以为',
      '没想到|出乎意料|竟然',
      '换个角度|换个思路|反过来想',
      '更重要的是|更深层|更关键的是',
      '矛盾|冲突|取舍|权衡',
      '不完全|不一定|不一定是'
    ];
    let reflectionCount = 0;
    for (const p of reflectionPatterns) {
      const regex = new RegExp(p, 'gi');
      const matches = text.match(regex);
      if (matches) reflectionCount += matches.length;
    }
    let reflectionFactor;
    if (reflectionCount === 0)      reflectionFactor = 1.0;
    else if (reflectionCount <= 2)  reflectionFactor = 1.15;
    else                            reflectionFactor = 1.3;

    // ── ④ L1 结构层：句子复杂度 ──
    const structureFactor = this._calcStructureFactor(text, len);

    // ── ⑤ L2 内容层：信息密度 ──
    const densityFactor = this._calcDensityFactor(text, len);

    // ── ⑥ L2 内容层：新颖性加分 ──
    const noveltyBonus = this._calcNoveltyFactor(text);

    // ── 综合质量系数（五因子融合） ──
    // 因果链与结构层融合（模式+结构互补）
    const causalComposite = causalFactor * 0.6 + structureFactor * 0.4;
    // 反思词与信息密度融合（思维深度+内容价值互补）
    const reflectionComposite = reflectionFactor * 0.5 + densityFactor * 0.5;

    const quality = lengthFactor * causalComposite * reflectionComposite * noveltyBonus;
    return Math.min(3.5, Math.max(0.3, Math.round(quality * 100) / 100));
  },

  /**
   * L1 结构层：句子复杂度分析
   * 从句子结构层面判断用户是否在组织复杂思维
   */
  _calcStructureFactor(text, totalLen) {
    // 拆分句子（按中文标点）
    const sentences = text.split(/[。！？!?\n]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);

    // ① 平均句长
    const avgLen = totalLen / sentenceCount;
    let score = 0;
    if (avgLen > 25)       score += 0.2;
    else if (avgLen > 15)  score += 0.1;

    // ② 从句密度（逗号/分号数 / 句子数）
    const commaCount = (text.match(/[，,；;]/g) || []).length;
    const clauseDensity = commaCount / sentenceCount;
    if (clauseDensity > 2.5)       score += 0.2;
    else if (clauseDensity > 1.5)  score += 0.1;

    // ③ 嵌套层级（括号、引号嵌套）
    const nestMatches = text.match(/[（(][^）)]*[）)]/g) || [];
    const quoteMatches = text.match(/[「『"'][^」』"']*[」』"']/g) || [];
    const nestCount = nestMatches.length + quoteMatches.length;
    if (nestCount > 2)       score += 0.15;
    else if (nestCount > 0)  score += 0.05;

    // ④ 结构化信号（序号词：第一/首先/其次/最后/一是/二是）
    const structureSignals = /第[一二三四五六七八九十]|首先|其次|最后|一是|二是|另外|此外|总之|综上/;
    if (structureSignals.test(text)) score += 0.15;

    // 分数映射到 0.85 ~ 1.4
    return Math.min(1.4, 0.85 + score);
  },

  /**
   * L2 内容层：信息密度分析
   * 判断消息中实际信息量 vs 填充词
   */
  _calcDensityFactor(text, totalLen) {
    // ① 实词密度（名词/动词/形容词占比估测）
    // 使用启发式规则：去停用词后的字符数 / 总字符数
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一',
      '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
      '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么', '如何', '吗', '呢', '吧'];
    let strippedText = text;
    for (const sw of stopWords) {
      strippedText = strippedText.split(sw).join('');
    }
    const contentRatio = strippedText.length / Math.max(1, totalLen);
    let score = 0;
    if (contentRatio > 0.55)       score += 0.15;
    else if (contentRatio > 0.45)  score += 0.1;
    else if (contentRatio > 0.35)  score += 0.05;

    // ② 专有名词比例（英文词/数字/大写缩写 = 在讨论具体概念）
    const properMatches = text.match(/[A-Za-z]+/g) || [];
    const digitMatches = text.match(/\d+/g) || [];
    const properCount = properMatches.join('').length + digitMatches.join('').length;
    const properRatio = properCount / Math.max(1, totalLen);
    if (properRatio > 0.08)       score += 0.1;
    else if (properRatio > 0.04)  score += 0.05;

    // ③ 主题词集中度（高频词是否集中）
    // 分词粒度：2字以上词组
    const words = [];
    for (let i = 0; i < text.length - 1; i++) {
      const pair = text.substring(i, i + 2);
      if (/[\u4e00-\u9fa5]{2}/.test(pair)) words.push(pair);
    }
    const freq = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const top3Sum = sorted.slice(0, 3).reduce((s, e) => s + e[1], 0);
    const concentration = top3Sum / Math.max(1, words.length);
    // 集中度低 = 话题分散 = 讨论面广 → 加分
    if (concentration < 0.25)       score += 0.1;
    else if (concentration < 0.35)  score += 0.05;

    return Math.min(1.5, 0.8 + score);
  },

  /**
   * L2 内容层：新颖性分析
   * 与最近消息做 Jaccard 距离比较，奖励拓展新话题
   */
  _calcNoveltyFactor(text) {
    // 从 chatHistory 中取最近 5 条用户消息
    const chatHistory = this.chatHistory || [];
    if (chatHistory.length === 0) return 1.0;

    const userMsgs = chatHistory
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content);

    if (userMsgs.length === 0) return 1.0;

    // 构建当前消息的 bigram 集合
    const currentBigrams = new Set();
    for (let i = 0; i < text.length - 1; i++) {
      currentBigrams.add(text.substring(i, i + 2));
    }
    if (currentBigrams.size === 0) return 1.0;

    // 与每条历史消息计算 Jaccard 相似度，取最低值（= 最大差异）
    let minSimilarity = 1.0;
    for (const msg of userMsgs) {
      const msgBigrams = new Set();
      for (let i = 0; i < msg.length - 1; i++) {
        msgBigrams.add(msg.substring(i, i + 2));
      }
      if (msgBigrams.size === 0) continue;

      const intersection = [...currentBigrams].filter(b => msgBigrams.has(b)).length;
      const union = new Set([...currentBigrams, ...msgBigrams]).size;
      const similarity = intersection / union;
      minSimilarity = Math.min(minSimilarity, similarity);
    }

    // Jaccard 距离 = 1 - 最大相似度
    const jaccardDist = 1 - Math.max(0, minSimilarity);

    // 与历史差异 > 50% → 额外加分
    if (jaccardDist > 0.65)       return 1.25;
    else if (jaccardDist > 0.50)  return 1.15;
    else if (jaccardDist > 0.35)  return 1.05;
    return 1.0;
  },

  // 更新企鹅属性
  updatePenguinAttributes(penguinData, changes, consecutiveBonus) {
    const dims = ['knowledge', 'creativity', 'social', 'action', 'mentality'];
    const bonus = consecutiveBonus || 1.0;
    
    for (const dim of dims) {
      if (changes[dim] > 0) {
        penguinData.attributes[dim] = Math.min(
          100,
          penguinData.attributes[dim] + Math.round(changes[dim] * bonus)
        );
      }
    }

    // 更新经验值
    penguinData.exp = dims.reduce((sum, dim) => sum + penguinData.attributes[dim], 0);

    // 检查阶段升级
    const oldStage = penguinData.stage;
    if (penguinData.exp >= 600) penguinData.stage = 4;
    else if (penguinData.exp >= 300) penguinData.stage = 3;
    else if (penguinData.exp >= 100) penguinData.stage = 2;

    // 检查等级
    const oldLevel = penguinData.level || 1;
    const levelThresholds = [0, 50, 100, 200, 300, 450, 600, 800, 1000, 1500];
    const LEVEL_TITLES = ['初生蛋', '好奇蛋', '🐣 破壳企鹅', '探索企鹅', '🐧 实习企鹅', '进阶企鹅', '🚀 冲刺企鹅', '职场企鹅', '精英企鹅', '🏆 传奇企鹅'];
    let newLevel = 1;
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (penguinData.exp >= levelThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }
    penguinData.level = newLevel;
    penguinData.levelTitle = LEVEL_TITLES[newLevel - 1];
    penguinData.maxExp = levelThresholds[Math.min(newLevel, levelThresholds.length - 1)] || 1500;

    return {
      penguinData,
      stageChanged: oldStage !== penguinData.stage,
      levelChanged: oldLevel !== newLevel,
      levelTitle: LEVEL_TITLES[newLevel - 1]
    };
  },

  // 获取连续登录倍率
  getConsecutiveBonus(consecutiveDays) {
    if (consecutiveDays >= 21) return 3.0;
    if (consecutiveDays >= 11) return 2.0;
    if (consecutiveDays >= 6) return 1.5;
    if (consecutiveDays >= 3) return 1.2;
    return 1.0;
  },

  /**
   * 构建系统提示词（v2增强版：含长期记忆）
   */
  buildSystemPrompt(grade, penguinData, recentTopics) {
    let basePrompt = this.SYSTEM_PROMPTS[grade] || this.SYSTEM_PROMPTS.freshman;
    
    // 将 {penguinName} 占位符替换为用户自定义的企鹅名字
    const penguinName = penguinData.name || '蛋蛋';
    basePrompt = basePrompt.replace(/\{penguinName\}/g, penguinName);
    
    // 获取长期记忆上下文
    const memoryContext = MemoryModule.buildMemoryContext();
    
    // 获取活跃配饰
    const accessories = KeywordEngine.getActiveAccessories(3);
    const accessoryStr = accessories.length > 0 
      ? accessories.map(a => a.name).join('、')
      : '无特殊配饰';

    // ★ 构建当前时间上下文（让 AI 感知真实时间，避免说"该上课了"等不合时宜的话）
    const now = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const dayOfWeek = '周' + weekDays[now.getDay()];
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeStr = `${month}月${date}日 ${dayOfWeek} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    
    let timePeriod;
    if (hour >= 0 && hour < 5) timePeriod = '凌晨';
    else if (hour >= 5 && hour < 8) timePeriod = '清晨';
    else if (hour >= 8 && hour < 11) timePeriod = '上午';
    else if (hour >= 11 && hour < 13) timePeriod = '中午';
    else if (hour >= 13 && hour < 18) timePeriod = '下午';
    else if (hour >= 18 && hour < 22) timePeriod = '晚上';
    else timePeriod = '深夜';
    
    const timeContext = `

【当前时间感知 —— 请严格据此调整回复内容】
现在是 ${timeStr}（${timePeriod}），${isWeekend ? '周末/假期' : '工作日/上学日'}。
请在回复中自然地体现对时间的感知，遵循以下原则：
- 如果是深夜（22:00-05:00）：不要说"该去上课""去图书馆"等白天活动；可以关心用户早点休息，语气偏安静舒缓
- 如果是晚上（18:00-22:00）：不要说"正在上课""在教室"等；可以聊今天的收获、放松话题
- 如果是中午（11:00-13:00）：可以提到吃饭、午休
- 如果是上午/下午工作日：可以提到上课、学习相关话题
- 如果是周末：不要提上课、考试等，聊休闲、兴趣、出游话题
- 如果用户提到"上课""考试"等与当前时间冲突的活动，用企鹅的口吻温和提醒时间不对`;

    const dynamicContext = `
${timeContext}

【当前企鹅状态】
- 名字：${penguinName}
- 等级：Lv.${penguinData.level}
- 经验值：${penguinData.exp}
- 知识力📚：${penguinData.attributes.knowledge}/100
- 创造力🎨：${penguinData.attributes.creativity}/100
- 社交力💬：${penguinData.attributes.social}/100
- 行动力⚡：${penguinData.attributes.action}/100
- 心态值💪：${penguinData.attributes.mentality}/100
- 累计对话：${penguinData.totalChats}轮
- 当前配饰：${accessoryStr}
${recentTopics ? `\n【最近聊过的话题】\n${recentTopics}` : ''}
${memoryContext}

【简历感知对话规则】
如果系统提供了用户的简历信息，请在对话中：
1. 优先围绕简历中的专业、技能、项目经历展开话题
2. 自然提及简历中的亮点经历（如模拟法庭、竞赛、实习等），引导用户展开说说
3. 结合简历内容给出针对性的求职建议和岗位推荐
4. 用企鹅的口吻表达对用户经历的了解和认可

请根据以上状态和记忆自然地融入对话中。如果用户有明确的职业方向偏好，可以围绕该方向展开话题。`;

    return basePrompt + dynamicContext;
  },


  // ============================================
  //  离线问答库优先匹配（无需API）
  // ============================================
  /**
   * 尝试从离线问答库中匹配回答
   * @param {string} message - 用户消息
   * @param {string} grade - 用户年级
   * @returns {Object|null} 匹配结果 { q, a, grade, matchType, score } 或 null
   */
  matchOffline(message, grade) {
    if (typeof OfflineQA !== 'undefined') {
      return OfflineQA.match(message, grade);
    }
    return null;
  },

  // ============================================
  //  DeepSeek API 调用（需用户自行配置 API Key）
  // ============================================

  /**
   * 获取用户配置的 API Key
   */
  getApiKey() {
    try {
      const config = JSON.parse(localStorage.getItem('user_config') || '{}');
      return config.apiKey || '';
    } catch (e) {
      return '';
    }
  },

  /**
   * 获取运行时端点（优先使用用户配置，否则默认 DeepSeek）
   */
  getEndpoint() {
    try {
      const config = JSON.parse(localStorage.getItem('user_config') || '{}');
      return config.baseUrl || this.AI_CONFIG.endpoint;
    } catch (e) {
      return this.AI_CONFIG.endpoint;
    }
  },

  /**
   * 获取运行时模型（优先使用用户配置，否则默认 DeepSeek）
   */
  getModel() {
    try {
      const config = JSON.parse(localStorage.getItem('user_config') || '{}');
      return config.model || this.AI_CONFIG.model;
    } catch (e) {
      return this.AI_CONFIG.model;
    }
  },

  /**
   * 同步配置（由 App.handleSettingsSave 调用）
   */
  syncConfig(userConfig) {
    // 运行时配置已在 getEndpoint/getModel 中动态读取 localStorage
    // 此方法作为显式同步入口，用于日志等扩展
    if (userConfig.baseUrl) {
      // Base URL 已从用户配置同步
    }
    if (userConfig.model) {
      // Model 已从用户配置同步
    }
  },

  /**
   * 检查 API Key 是否已配置
   */
  isApiKeyReady() {
    const apiKey = this.getApiKey();
    return apiKey && apiKey.trim().length > 0;
  },

  /**
   * 验证 API Key 是否有效
   * 发送极短请求（max_tokens=1）测试连通性
   * @param {string} apiKey - 要验证的 Key（可选，默认从 config 读取）
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async validateApiKey(apiKey) {
    const key = apiKey || this.getApiKey();
    if (!key || !key.trim()) {
      return { success: false, message: 'API Key 不能为空' };
    }

    // 基本格式检查
    if (!key.startsWith('sk-') && !key.startsWith('sk-')) {
      // 宽松通过，仅提示
    }
    if (key.length < 20) {
      return { success: false, message: 'API Key 格式不正确（太短）' };
    }

    const endpoint = this.getEndpoint();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: this.getModel(),
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
          temperature: 0
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: '连接成功！企鹅可以开始思考啦~ 🐧' };
      }

      const status = response.status;
      if (status === 401) {
        return { success: false, message: 'API Key 无效，请检查是否复制完整' };
      } else if (status === 403) {
        return { success: false, message: 'API Key 被拒绝访问，请检查账户状态' };
      } else if (status === 429) {
        return { success: false, message: '请求过于频繁，请稍后再试' };
      } else if (status >= 500) {
        return { success: false, message: 'AI 服务暂时不可用，请稍后重试' };
      } else {
        const body = await response.text().catch(() => '');
        return { success: false, message: `连接失败 (${status})，请检查 Base URL 和 Key` };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, message: '连接超时，请检查网络或 Base URL 是否正确' };
      }
      return { success: false, message: `网络错误: ${error.message}` };
    }
  },

  /**
   * 发送消息到 DeepSeek API
   * @param {string} userMessage - 用户消息
   * @param {Array} contextWindow - 上下文窗口
   * @param {string} systemPrompt - 系统提示词
   * @returns {Promise<string>} AI 回复
   */
  async sendMessage(userMessage, contextWindow, systemPrompt) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('请先在设置中配置 API Key');
    }

    const endpoint = this.getEndpoint();
    const model = this.getModel();

    // 构建消息数组
    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextWindow.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    let lastError = null;

    for (let attempt = 0; attempt <= this.AI_CONFIG.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.AI_CONFIG.timeout);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: this.AI_CONFIG.temperature,
            max_tokens: this.AI_CONFIG.max_tokens
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          throw new Error('API Key 无效，请检查设置');
        }

        if (response.status === 429) {
          throw new Error('请求太频繁，请稍后再试');
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`API Error ${response.status}${errorText ? ': ' + errorText.slice(0, 100) : ''}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '';

        // 清理回复
        let cleanReply = reply;
        const replyMatch = cleanReply.match(/企鹅[：:]\s*([\s\S]+?)$/);
        if (replyMatch) {
          cleanReply = replyMatch[1].trim();
        }

        // 截断过长回复
        if (cleanReply.length > 500) {
          cleanReply = cleanReply.substring(0, 500) + '...';
        }

        return cleanReply || reply;

      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          lastError = new Error('请求超时，请检查网络后重试');
        } else if (error.message.includes('API Key')) {
          throw error; // API Key 错误不重试
        } else {
          lastError = error;
        }

        console.warn(`AI 调用失败 (尝试 ${attempt + 1}/${this.AI_CONFIG.maxRetries + 1}):`, error.message);

        if (attempt < this.AI_CONFIG.maxRetries) {
          await this.sleep(this.AI_CONFIG.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError || new Error('AI 服务暂时不可用，请稍后重试');
  },

  /**
   * 流式发送消息（SSE Streaming）
   * 支持 OpenAI 兼容的 SSE 格式，包括 DeepSeek API
   * @param {string} userMessage - 用户消息
   * @param {Array} contextWindow - 上下文窗口
   * @param {string} systemPrompt - 系统提示词
   * @param {Function} onChunk - 每收到一个文本块时回调 (text, fullText)
   * @param {Function} onDone - 流结束时回调 (fullText)
   * @param {Function} onError - 出错时回调 (error)
   * @returns {AbortController} 可用于取消请求
   */
  sendMessageStream(userMessage, contextWindow, systemPrompt, onChunk, onDone, onError) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      if (onError) onError(new Error('请先在设置中配置 API Key'));
      return null;
    }

    const endpoint = this.getEndpoint();
    const model = this.getModel();
    let fullText = '';
    let retryCount = 0;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...contextWindow.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.AI_CONFIG.timeout * 2);

    const doStream = async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: this.AI_CONFIG.temperature,
            max_tokens: this.AI_CONFIG.max_tokens,
            stream: true
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          if (onError) onError(new Error('API Key 无效，请检查设置'));
          return;
        }
        if (response.status === 429) {
          if (onError) onError(new Error('请求太频繁，请稍后再试'));
          return;
        }
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          if (onError) onError(new Error(`API Error ${response.status}: ${errorText.slice(0, 100)}`));
          return;
        }

        // 读取 SSE 流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                if (onChunk) onChunk(content, fullText);
              }
            } catch (e) {
              // 跳过无法解析的行
            }
          }
        }

        // 流结束后清理回复
        let cleanReply = fullText;
        const replyMatch = cleanReply.match(/企鹅[：:]\s*([\s\S]+?)$/);
        if (replyMatch) {
          cleanReply = replyMatch[1].trim();
        }
        if (cleanReply.length > 500) {
          cleanReply = cleanReply.substring(0, 500) + '...';
        }

        if (onDone) onDone(cleanReply || fullText);

      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          if (fullText && onDone) {
            onDone(fullText);
          } else if (onError) {
            onError(new Error('请求超时，请检查网络后重试'));
          }
        } else if (error.message.includes('API Key')) {
          if (onError) onError(error);
        } else if (retryCount < this.AI_CONFIG.maxRetries) {
          retryCount++;
          console.warn(`流式调用失败，重试 (${retryCount}/${this.AI_CONFIG.maxRetries}):`, error.message);
          await this.sleep(this.AI_CONFIG.retryDelay * Math.pow(2, retryCount - 1));
          await doStream();
        } else {
          console.warn('流式调用最终失败:', error.message);
          // 流式失败后降级为普通请求
          try {
            const fallbackReply = await this.sendMessage(userMessage, contextWindow, systemPrompt);
            if (onDone) onDone(fallbackReply);
          } catch (fallbackError) {
            if (onError) onError(fallbackError);
          }
        }
      }
    };

    doStream();
    return controller;
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
