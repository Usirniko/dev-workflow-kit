/**
 * AI企鹅养成 - 活动系统 v1
 * 核心功能：
 *   1. 20 个年级专属活动（一次性 + 可重复）
 *   2. 5 项每日任务
 *   3. 10 个成就徽章
 *   4. 防刷机制（一次性限制、每日上限、冷却时间、消息长度）
 *   5. 活动奖励计算与连续登录倍率联动
 */

const ActivitySystem = {
  // =============================================
  //  一、20 个年级专属活动定义
  // =============================================
  GRADE_ACTIVITIES: {
    freshman: [
      {
        id: 'first_lecture',
        name: '🏫 第一次选课',
        type: 'one_time',           // 一次性
        triggers: ['选课', '课程', '选修', '必修', '学分', '课表'],
        rewards: { knowledge: 10, exp: 20 },
        description: '首次提及选课/课程触发'
      },
      {
        id: 'library_first',
        name: '📖 图书馆初体验',
        type: 'one_time',
        triggers: ['图书馆', '自习', '自习室', '自修', '阅览室'],
        rewards: { knowledge: 8, exp: 15 },
        description: '首次提及图书馆/自习触发'
      },
      {
        id: 'club_recruit',
        name: '🎪 社团招新',
        type: 'one_time',
        triggers: ['社团', '组织', '招新', '学生会', '部门', '俱乐部'],
        rewards: { social: 10, exp: 20 },
        description: '首次提及社团/组织触发'
      },
      {
        id: 'meet_roommate',
        name: '🤝 认识室友',
        type: 'one_time',
        triggers: ['室友', '宿舍', '舍友', '寝室', '住宿'],
        rewards: { social: 8, exp: 15 },
        description: '首次提及室友/宿舍触发'
      },
      {
        id: 'campus_explore',
        name: '🗺️ 校园探索',
        type: 'repeatable',         // 可重复
        triggers: ['校园', '食堂', '操场', '体育馆', '教学楼', '学校', '校区', '逛校园'],
        rewards: { action: 5, exp: 10 },
        maxDaily: 3,
        description: '提及校园地点触发（每日限 3 次）'
      }
    ],
    sophomore: [
      {
        id: 'major_choice',
        name: '📊 专业方向选择',
        type: 'one_time',
        triggers: ['专业分流', '选专业', '方向选择', '分流', '专业方向', '转专业'],
        rewards: { knowledge: 15, exp: 30 },
        description: '首次提及专业分流触发'
      },
      {
        id: 'research_first',
        name: '🔬 科研初探',
        type: 'one_time',
        triggers: ['科研', '实验', '实验室', '课题组', '导师', '研究项目', '论文发表'],
        rewards: { creativity: 12, exp: 25 },
        description: '首次提及科研/实验触发'
      },
      {
        id: 'class_presentation',
        name: '🎤 课堂展示',
        type: 'repeatable',
        triggers: ['PPT', '演讲', '展示', '汇报', 'presentation', '上台', '讲台'],
        rewards: { social: 10, exp: 20 },
        maxDaily: 3,
        description: '提及PPT/演讲/展示触发（每日限 3 次）'
      },
      {
        id: 'competition_join',
        name: '🏆 竞赛参与',
        type: 'one_time',
        triggers: ['竞赛', '比赛', '参赛', '大赛', '挑战赛', '编程比赛', '数学建模'],
        rewards: { action: 15, exp: 30 },
        description: '首次提及竞赛/比赛触发'
      },
      {
        id: 'exchange_program',
        name: '🌍 交换项目',
        type: 'one_time',
        triggers: ['交换', '出国', '留学', '交换生', '访学', '海外'],
        rewards: { social: 12, exp: 25 },
        description: '首次提及交换/出国触发'
      }
    ],
    junior: [
      {
        id: 'first_resume',
        name: '💼 第一份简历',
        type: 'one_time',
        triggers: ['简历', 'CV', 'Resume', '个人简历', '写简历', '简历模板'],
        rewards: { action: 15, exp: 30 },
        description: '首次提及简历/CV触发'
      },
      {
        id: 'career_planning',
        name: '🎯 职业规划',
        type: 'one_time',
        triggers: ['职业规划', '职业发展', '生涯规划', '职场规划', '未来职业'],
        rewards: { knowledge: 15, exp: 30 },
        description: '首次提及职业/规划触发'
      },
      {
        id: 'intern_interview',
        name: '🤝 实习面试',
        type: 'one_time',
        triggers: ['面试', '笔试', '群面', '单面', '面试官', '面经', '面试题'],
        rewards: { social: 15, exp: 30 },
        description: '首次提及面试触发'
      },
      {
        id: 'project_experience',
        name: '📝 项目经验',
        type: 'repeatable',
        triggers: ['项目', '作品集', 'portfolio', '个人项目', '开源项目', '项目经历'],
        rewards: { creativity: 10, exp: 20 },
        maxDaily: 3,
        description: '提及项目/作品集触发（每日限 3 次）'
      },
      {
        id: 'company_visit',
        name: '🏢 企业参观',
        type: 'one_time',
        triggers: ['企业参观', '公司参观', '参观企业', '开放日', '企业走访'],
        rewards: { knowledge: 10, exp: 20 },
        description: '首次提及企业/公司参观触发'
      }
    ],
    senior: [
      {
        id: 'graduation_project',
        name: '🎓 毕业设计',
        type: 'one_time',
        triggers: ['毕设', '毕业设计', '毕业论文', '答辩', '毕业答辩'],
        rewards: { knowledge: 20, exp: 40 },
        description: '首次提及毕设/论文触发'
      },
      {
        id: 'autumn_recruit',
        name: '💻 秋招冲刺',
        type: 'one_time',
        triggers: ['秋招', '春招', '校招', '招聘会', '双选会', '网申'],
        rewards: { action: 20, exp: 40 },
        description: '首次提及秋招/校招触发'
      },
      {
        id: 'offer_choice',
        name: '📋 Offer选择',
        type: 'one_time',
        triggers: ['offer', '录用', 'offer选择', '选offer', '薪资', '待遇对比'],
        rewards: { mentality: 15, exp: 30 },
        description: '首次提及offer/选择触发'
      },
      {
        id: 'grad_trip',
        name: '🎉 毕业旅行',
        type: 'one_time',
        triggers: ['毕业旅行', '毕业游', '旅行计划', '旅游', '度假'],
        rewards: { mentality: 20, exp: 40 },
        description: '首次提及毕业旅行触发'
      },
      {
        id: 'workplace_newbie',
        name: '🌟 职场新人',
        type: 'repeatable',
        triggers: ['职场', '工作', '上班', '入职', '新人', '试用期', '转正', '同事', '领导'],
        rewards: { knowledge: 5, creativity: 5, social: 5, action: 5, mentality: 5, exp: 25 },
        maxDaily: 3,
        description: '提及职场/工作触发（每日限 3 次）'
      }
    ]
  },

  // =============================================
  //  二、5 项每日任务定义
  // =============================================
  DAILY_TASKS: [
    {
      id: 'daily_checkin',
      name: '☀️ 每日打卡',
      icon: '☀️',
      condition: '每天首次打开应用',
      reward: { exp: 5 },
      check(self, penguinData, today) { return !self._dailyCheckedIn; }
    },
    {
      id: 'daily_chat',
      name: '💬 每日对话',
      icon: '💬',
      condition: '每天完成至少1次对话',
      reward: { exp: 10 },
      check(self, penguinData, today) { return (penguinData._dailyChatCount || 0) >= 1; }
    },
    {
      id: 'consecutive_chat',
      name: '🔥 连续对话',
      icon: '🔥',
      condition: '连续3天有对话记录',
      reward: { exp: 20, knowledge: 3, creativity: 3, social: 3, action: 3, mentality: 3 },
      check(self, penguinData, today) { return penguinData.consecutiveDays >= 3; }
    },
    {
      id: 'deep_chat',
      name: '📝 深度交流',
      icon: '📝',
      condition: '单次对话超过5轮',
      reward: { exp: 15 },
      specialReward: { type: 'random_attribute', value: 5 }, // 随机属性+5
      check(self, penguinData, today) { return (penguinData._sessionRounds || 0) >= 5; }
    },
    {
      id: 'topic_master',
      name: '🌟 话题达人',
      icon: '🌟',
      condition: '一天内触发2个以上活动',
      reward: { exp: 10 },
      check(self, penguinData, today) { return (penguinData._dailyActivityCount || 0) >= 2; }
    }
  ],

  // =============================================
  //  三、10 个成就徽章定义
  // =============================================
  BADGES: [
    { id: 'first_egg',       name: '🥚 初生之蛋',    icon: '🥚', condition: '首次领蛋',                  check(penguinData) { return true; } },
    { id: 'hatch_out',       name: '🐣 破壳而出',    icon: '🐣', condition: '达到Lv.3',                  check(penguinData) { return penguinData.level >= 3; } },
    { id: 'scholar',         name: '📚 学霸企鹅',    icon: '📚', condition: '知识力达到80',               check(penguinData) { return penguinData.attributes.knowledge >= 80; } },
    { id: 'creative_star',   name: '🎨 创意之星',    icon: '🎨', condition: '创造力达到80',               check(penguinData) { return penguinData.attributes.creativity >= 80; } },
    { id: 'social_expert',   name: '💬 社交达人',    icon: '💬', condition: '社交力达到80',               check(penguinData) { return penguinData.attributes.social >= 80; } },
    { id: 'action_pioneer',  name: '⚡ 行动先锋',    icon: '⚡', condition: '行动力达到80',               check(penguinData) { return penguinData.attributes.action >= 80; } },
    { id: 'mentality_king',  name: '💪 心态王者',    icon: '💪', condition: '心态值达到80',               check(penguinData) { return penguinData.attributes.mentality >= 80; } },
    { id: 'all_rounder',     name: '🏆 全能企鹅',    icon: '🏆', condition: '全属性达到60',               check(penguinData) { const a = penguinData.attributes; return a.knowledge >= 60 && a.creativity >= 60 && a.social >= 60 && a.action >= 60 && a.mentality >= 60; } },
    { id: 'graduate',        name: '🎓 毕业企鹅',    icon: '🎓', condition: '达到Lv.MAX(10级)',          check(penguinData) { return penguinData.level >= 10; } },
    { id: 'persist_star',    name: '🔥 坚持之星',    icon: '🔥', condition: '连续登录30天',               check(penguinData) { return penguinData.consecutiveDays >= 30; } }
  ],

  // =============================================
  //  内部状态
  // =============================================
  // 冷却记录：{ activityId: lastTriggerTimestamp }
  _cooldowns: {},
  // 冷却时间（毫秒）- 5分钟
  COOLDOWN_MS: 5 * 60 * 1000,
  // 有效消息最小长度
  MIN_MESSAGE_LENGTH: 5,
  // 每日打卡标记
  _dailyCheckedIn: false,
  // 本会话对话轮数
  _sessionRounds: 0,

  /**
   * 根据年级获取活动列表
   */
  getActivitiesByGrade(grade) {
    const gradeMap = {
      freshman: 'freshman',
      sophomore: 'sophomore',
      junior: 'junior',
      senior: 'senior'
    };
    return this.GRADE_ACTIVITIES[gradeMap[grade]] || this.GRADE_ACTIVITIES.freshman;
  },

  /**
   * 匹配用户消息中的活动
   * @param {string} message - 用户消息
   * @param {string} grade - 用户年级
   * @param {Array} completedActivities - 已完成的一次性活动 ID 列表
   * @param {Object} dailyActivities - 每日活动计数 { '2026-06-12': { activityId: count } }
   * @returns {Array} 触发的活动列表 [{ id, name, type, rewards, ... }]
   */
  matchActivities(message, grade, completedActivities, dailyActivities) {
    // 消息长度不足，不触发任何活动
    if (message.length < this.MIN_MESSAGE_LENGTH) {
      return [];
    }

    const activities = this.getActivitiesByGrade(grade);
    const today = this._getToday();
    const dailyRecord = dailyActivities[today] || {};
    const triggered = [];
    const lowerMsg = message.toLowerCase();

    for (const activity of activities) {
      // === 防刷检查 1：一次性活动已触发过 ===
      if (activity.type === 'one_time' && completedActivities.includes(activity.id)) {
        continue;
      }

      // === 防刷检查 2：可重复活动每日上限 ===
      if (activity.type === 'repeatable') {
        const dailyCount = dailyRecord[activity.id] || 0;
        if (dailyCount >= (activity.maxDaily || 3)) {
          continue;
        }
      }

      // === 防刷检查 3：冷却时间（5 分钟内不重复）===
      if (this._cooldowns[activity.id]) {
        const elapsed = Date.now() - this._cooldowns[activity.id];
        if (elapsed < this.COOLDOWN_MS) {
          continue;
        }
      }

      // === 触发词匹配 ===
      let matched = false;
      let matchedWord = '';
      for (const trigger of activity.triggers) {
        if (lowerMsg.includes(trigger.toLowerCase())) {
          matched = true;
          matchedWord = trigger;
          break;
        }
      }

      if (matched) {
        // 记录冷却
        this._cooldowns[activity.id] = Date.now();
        triggered.push({
          id: activity.id,
          name: activity.name,
          type: activity.type,
          triggers: activity.triggers,
          rewards: { ...activity.rewards },
          matchedWord,
          description: activity.description
        });
      }
    }

    return triggered;
  },

  /**
   * 应用活动奖励到属性变更
   * @param {Object} changes - 现有属性变更 { knowledge, creativity, social, action, mentality }
   * @param {Array} triggeredActivities - 触发的活动列表
   * @param {number} consecutiveBonus - 连续登录倍率
   * @returns {Object} { changes（更新后的）, activityRewards（活动奖励汇总） }
   */
  applyActivityRewards(changes, triggeredActivities, consecutiveBonus) {
    const bonus = consecutiveBonus || 1.0;
    const activityRewards = {
      knowledge: 0,
      creativity: 0,
      social: 0,
      action: 0,
      mentality: 0,
      exp: 0,
      details: []
    };

    if (!triggeredActivities || triggeredActivities.length === 0) {
      return { changes, activityRewards };
    }

    const dims = ['knowledge', 'creativity', 'social', 'action', 'mentality'];

    for (const activity of triggeredActivities) {
      const detail = {
        id: activity.id,
        name: activity.name,
        rewards: {}
      };

      // 属性奖励（乘以倍率）
      for (const dim of dims) {
        if (activity.rewards[dim] && activity.rewards[dim] > 0) {
          const baseValue = activity.rewards[dim];
          const boostedValue = Math.round(baseValue * bonus);
          changes[dim] += boostedValue;
          activityRewards[dim] += boostedValue;
          detail.rewards[dim] = boostedValue;
        }
      }

      // 经验奖励（乘以倍率）
      if (activity.rewards.exp && activity.rewards.exp > 0) {
        const boostedExp = Math.round(activity.rewards.exp * bonus);
        activityRewards.exp += boostedExp;
        detail.rewards.exp = boostedExp;
      }

      activityRewards.details.push(detail);
    }

    return { changes, activityRewards };
  },

  /**
   * 记录活动触发（更新 completedActivities 和 dailyActivities）
   * @param {Object} penguinData - 企鹅数据
   * @param {Array} triggeredActivities - 触发的活动列表
   */
  recordActivities(penguinData, triggeredActivities) {
    if (!triggeredActivities || triggeredActivities.length === 0) return;

    const today = this._getToday();

    // 确保数据结构存在
    if (!Array.isArray(penguinData.completedActivities)) {
      penguinData.completedActivities = [];
    }
    if (!penguinData.dailyActivities || typeof penguinData.dailyActivities !== 'object') {
      penguinData.dailyActivities = {};
    }
    if (!penguinData.dailyActivities[today]) {
      penguinData.dailyActivities[today] = {};
    }

    for (const activity of triggeredActivities) {
      // 记录一次性活动
      if (activity.type === 'one_time' && !penguinData.completedActivities.includes(activity.id)) {
        penguinData.completedActivities.push(activity.id);
      }

      // 记录每日活动次数
      penguinData.dailyActivities[today][activity.id] =
        (penguinData.dailyActivities[today][activity.id] || 0) + 1;
    }

    // 清理过期的每日记录（保留最近 7 天）
    this._cleanOldDailyRecords(penguinData);
  },

  /**
   * 检查并解锁成就徽章
   * @param {Object} penguinData - 企鹅数据
   * @returns {Array} 新解锁的徽章列表
   */
  checkBadges(penguinData) {
    if (!Array.isArray(penguinData.unlockedBadges)) {
      penguinData.unlockedBadges = [];
    }

    const newlyUnlocked = [];

    for (const badge of this.BADGES) {
      // 跳过已解锁的
      if (penguinData.unlockedBadges.includes(badge.id)) continue;

      // 检查条件
      if (badge.check(penguinData)) {
        penguinData.unlockedBadges.push(badge.id);
        newlyUnlocked.push(badge);
      }
    }

    return newlyUnlocked;
  },

  /**
   * 检查每日任务
   * @param {Object} penguinData - 企鹅数据
   * @returns {Array} 今日完成的任务列表
   */
  checkDailyTasks(penguinData) {
    const today = this._getToday();
    const completedTasks = [];

    // 确保存储
    if (!penguinData._dailyTaskRecord) {
      penguinData._dailyTaskRecord = {};
    }
    if (penguinData._dailyTaskRecord._date !== today) {
      penguinData._dailyTaskRecord = { _date: today };
    }

    for (const task of this.DAILY_TASKS) {
      // 今天已记录完成，跳过
      if (penguinData._dailyTaskRecord[task.id]) continue;

      // 检查条件
      if (task.check(this, penguinData, today)) {
        penguinData._dailyTaskRecord[task.id] = true;
        completedTasks.push(task);
      }
    }

    return completedTasks;
  },

  /**
   * 应用每日任务奖励
   * @param {Array} completedTasks - 完成的任务列表
   * @param {Object} penguinData - 企鹅数据
   * @returns {Object} { taskRewards, attributeChanges }
   */
  applyDailyTaskRewards(completedTasks, penguinData) {
    const dims = ['knowledge', 'creativity', 'social', 'action', 'mentality'];
    const attributeChanges = { knowledge: 0, creativity: 0, social: 0, action: 0, mentality: 0 };
    const taskRewards = { exp: 0, details: [] };

    if (!completedTasks || completedTasks.length === 0) {
      return { taskRewards, attributeChanges };
    }

    for (const task of completedTasks) {
      const detail = { id: task.id, name: task.name, icon: task.icon, rewards: {} };

      // 固定属性奖励
      for (const dim of dims) {
        if (task.reward[dim] && task.reward[dim] > 0) {
          penguinData.attributes[dim] = Math.min(100, penguinData.attributes[dim] + task.reward[dim]);
          attributeChanges[dim] += task.reward[dim];
          detail.rewards[dim] = task.reward[dim];
        }
      }

      // 经验奖励
      if (task.reward.exp) {
        taskRewards.exp += task.reward.exp;
        detail.rewards.exp = task.reward.exp;
      }

      // 特殊奖励：随机属性
      if (task.specialReward && task.specialReward.type === 'random_attribute') {
        const randomDim = dims[Math.floor(Math.random() * dims.length)];
        const val = task.specialReward.value || 5;
        penguinData.attributes[randomDim] = Math.min(100, penguinData.attributes[randomDim] + val);
        attributeChanges[randomDim] += val;
        const dimNames = { knowledge: '知识力📚', creativity: '创造力🎨', social: '社交力💬', action: '行动力⚡', mentality: '心态值💪' };
        detail.specialReward = `${dimNames[randomDim]}+${val}`;
      }

      taskRewards.details.push(detail);
    }

    return { taskRewards, attributeChanges };
  },

  /**
   * 每日打卡（应用启动时调用一次）
   */
  dailyCheckin(penguinData) {
    const today = this._getToday();
    if (penguinData._lastCheckinDate === today) return null;

    penguinData._lastCheckinDate = today;
    this._dailyCheckedIn = true;

    // 打卡奖励：经验+5
    penguinData.exp += 5;
    penguinData._dailyChatCount = 0;
    penguinData._dailyActivityCount = 0;
    penguinData._sessionRounds = 0;

    return { exp: 5, name: '☀️ 每日打卡' };
  },

  /**
   * 增加对话轮次计数
   */
  incrementSessionRounds(penguinData) {
    penguinData._sessionRounds = (penguinData._sessionRounds || 0) + 1;
    penguinData._dailyChatCount = (penguinData._dailyChatCount || 0) + 1;
  },

  /**
   * 增加当日活动计数
   */
  incrementDailyActivityCount(penguinData) {
    penguinData._dailyActivityCount = (penguinData._dailyActivityCount || 0) + 1;
  },

  /**
   * 加载冷却记录（从 sessionStorage）
   */
  loadCooldowns() {
    try {
      const raw = sessionStorage.getItem('activity_cooldowns');
      if (raw) {
        const saved = JSON.parse(raw);
        // 过滤已过期的冷却
        const now = Date.now();
        this._cooldowns = {};
        for (const [key, timestamp] of Object.entries(saved)) {
          if (now - timestamp < this.COOLDOWN_MS) {
            this._cooldowns[key] = timestamp;
          }
        }
      }
    } catch (e) {
      this._cooldowns = {};
    }
  },

  /**
   * 保存冷却记录（到 sessionStorage）
   */
  saveCooldowns() {
    try {
      sessionStorage.setItem('activity_cooldowns', JSON.stringify(this._cooldowns));
    } catch (e) { /* ignore */ }
  },

  /**
   * 获取今日日期字符串
   */
  _getToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /**
   * 清理 7 天前的每日活动记录
   */
  _cleanOldDailyRecords(penguinData) {
    const today = this._getToday();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

    if (penguinData.dailyActivities) {
      const cleaned = {};
      for (const [date, record] of Object.entries(penguinData.dailyActivities)) {
        if (date >= cutoffStr) {
          cleaned[date] = record;
        }
      }
      penguinData.dailyActivities = cleaned;
    }
  },

  /**
   * 加载会话状态
   */
  loadSessionState() {
    this.loadCooldowns();
    try {
      const raw = sessionStorage.getItem('activity_session');
      if (raw) {
        const state = JSON.parse(raw);
        this._dailyCheckedIn = state.dailyCheckedIn || false;
        this._sessionRounds = state.sessionRounds || 0;
      }
    } catch (e) {
      this._dailyCheckedIn = false;
      this._sessionRounds = 0;
    }
  },

  /**
   * 保存会话状态
   */
  saveSessionState() {
    this.saveCooldowns();
    try {
      sessionStorage.setItem('activity_session', JSON.stringify({
        dailyCheckedIn: this._dailyCheckedIn,
        sessionRounds: this._sessionRounds
      }));
    } catch (e) { /* ignore */ }
  }
};
