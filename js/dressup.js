/**
 * AI企鹅养成 - 装扮系统
 * 三类装扮：头饰(hat)、服饰(outfit)、背景(background)
 * 每件装扮有解锁条件，已解锁可穿戴，数据存 localStorage
 */
const DressUp = {
  // 当前穿戴状态
  wearing: {
    hat: null,       // 当前穿戴的头饰ID
    outfit: null,    // 当前穿戴的服饰ID
    background: null // 当前穿戴的背景ID
  },

  // =============================================
  //  装扮数据定义
  // =============================================
  COSTUMES: {
    // ① 头饰类
    hat: [
      {
        id: 'judge_hat',
        name: '法官帽',
        icon: '⚖️',
        category: 'hat',
        description: '威严的黑色法官帽，象征法律精神',
        unlockCondition: '和企鹅聊5次法律方向话题',
        unlockCheck(data) {
          const counts = this._getAccessoryCounts();
          return (counts.judgeHat || 0) >= 5;
        }
      },
      {
        id: 'code_glasses',
        name: '代码眼镜',
        icon: '🤓',
        category: 'hat',
        description: '程序员必备圆框眼镜，镜片上跳动着代码',
        unlockCondition: '知识力达到50',
        unlockCheck(data) {
          return data.attributes.knowledge >= 50;
        }
      },
      {
        id: 'badge_card',
        name: '工牌',
        icon: '🪪',
        category: 'hat',
        description: '腾讯风格工牌，产品经理的象征',
        unlockCondition: '和企鹅聊5次产品方向话题',
        unlockCheck(data) {
          const counts = this._getAccessoryCounts();
          return (counts.badge || 0) >= 5;
        }
      },
      {
        id: 'headphone',
        name: '耳机',
        icon: '🎧',
        category: 'hat',
        description: '炫酷头戴式耳机，沉浸在创造的世界里',
        unlockCondition: '创造力达到50',
        unlockCheck(data) {
          return data.attributes.creativity >= 50;
        }
      },
      {
        id: 'scholar_hat',
        name: '学士帽',
        icon: '🎓',
        category: 'hat',
        description: '经典学士帽，学术成就的证明',
        unlockCondition: '企鹅达到阶段2（波波）',
        unlockCheck(data) {
          return data.stage >= 2;
        }
      }
    ],

    // ② 服饰类
    outfit: [
      {
        id: 'blazer',
        name: '小西装',
        icon: '👔',
        category: 'outfit',
        description: '精致深蓝小西装，职场精英范儿',
        unlockCondition: '完成简历填写',
        unlockCheck(data) {
          try {
            const resume = JSON.parse(localStorage.getItem('resume_data') || '{}');
            return resume && Object.keys(resume).length > 1;
          } catch (e) { return false; }
        }
      },
      {
        id: 'hoodie',
        name: '连帽衫',
        icon: '🧥',
        category: 'outfit',
        description: '舒适连帽卫衣，休闲学院风',
        unlockCondition: '社交力达到50',
        unlockCheck(data) {
          return data.attributes.social >= 50;
        }
      },
      {
        id: 'coding_tee',
        name: '编程T恤',
        icon: '👕',
        category: 'outfit',
        description: '印有代码图案的酷炫T恤',
        unlockCondition: '和企鹅聊5次技术方向话题',
        unlockCheck(data) {
          const counts = this._getAccessoryCounts();
          return (counts.keyboard || 0) >= 5;
        }
      },
      {
        id: 'robe',
        name: '法袍',
        icon: '🫅',
        category: 'outfit',
        description: '庄严黑色法袍，法律人专属',
        unlockCondition: '和企鹅聊10次法律方向话题',
        unlockCheck(data) {
          const counts = this._getAccessoryCounts();
          return (counts.judgeHat || 0) >= 10;
        }
      },
      {
        id: 'star_vest',
        name: '星星马甲',
        icon: '⭐',
        category: 'outfit',
        description: '闪耀星星马甲，成长之路上最亮的仔',
        unlockCondition: '企鹅达到阶段3（酷酷）',
        unlockCheck(data) {
          return data.stage >= 3;
        }
      }
    ],

    // ③ 背景类
    background: [
      {
        id: 'starry_sky',
        name: '星空',
        icon: '🌌',
        category: 'background',
        description: '璀璨星空环绕，梦想的起点',
        unlockCondition: '连续7天写日记',
        unlockCheck(data) {
          return data.consecutiveDays >= 7;
        }
      },
      {
        id: 'library',
        name: '图书馆',
        icon: '📚',
        category: 'background',
        description: '书香弥漫的图书馆，知识的殿堂',
        unlockCondition: '知识力达到80',
        unlockCheck(data) {
          return data.attributes.knowledge >= 80;
        }
      },
      {
        id: 'office',
        name: '办公室',
        icon: '🏢',
        category: 'background',
        description: '现代科技办公室，职场初体验',
        unlockCondition: '完成简历填写且社交力达到40',
        unlockCheck(data) {
          try {
            const resume = JSON.parse(localStorage.getItem('resume_data') || '{}');
            const hasResume = resume && Object.keys(resume).length > 1;
            return hasResume && data.attributes.social >= 40;
          } catch (e) { return false; }
        }
      },
      {
        id: 'campus',
        name: '校园',
        icon: '🏫',
        category: 'background',
        description: '青春校园风光，永远的大学生',
        unlockCondition: '企鹅达到阶段2（波波）',
        unlockCheck(data) {
          return data.stage >= 2;
        }
      },
      {
        id: 'aurora',
        name: '极光',
        icon: '🌠',
        category: 'background',
        description: '神秘极光天幕，为探索者点亮夜空',
        unlockCondition: '连续登录21天',
        unlockCheck(data) {
          return data.consecutiveDays >= 21;
        }
      }
    ]
  },

  // =============================================
  //  核心方法
  // =============================================

  /**
   * 获取配饰累计计数
   */
  _getAccessoryCounts() {
    try {
      const raw = localStorage.getItem('penguin_accessory_counts');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  /**
   * 初始化：从 localStorage 加载穿戴状态
   */
  init() {
    try {
      const raw = localStorage.getItem('penguin_costumes');
      if (raw) {
        const saved = JSON.parse(raw);
        this.wearing = {
          hat: saved.hat || null,
          outfit: saved.outfit || null,
          background: saved.background || null
        };
      }
    } catch (e) {
      this.wearing = { hat: null, outfit: null, background: null };
    }
  },

  /**
   * 保存穿戴状态到 localStorage
   */
  save() {
    try {
      localStorage.setItem('penguin_costumes', JSON.stringify(this.wearing));
    } catch (e) {
      console.warn('Failed to save costumes');
    }
  },

  /**
   * 获取所有装扮（含解锁状态）
   * @param {Object} penguinData - 企鹅数据
   * @returns {Object} { hat: [...], outfit: [...], background: [...] }
   */
  getAllCostumes(penguinData) {
    const result = {};
    for (const category of ['hat', 'outfit', 'background']) {
      result[category] = this.COSTUMES[category].map(item => ({
        ...item,
        unlocked: item.unlockCheck.call(this, penguinData),
        isWearing: this.wearing[category] === item.id
      }));
    }
    return result;
  },

  /**
   * 检查某件装扮是否已解锁
   */
  isUnlocked(costumeId, penguinData) {
    const item = this.findCostume(costumeId);
    if (!item) return false;
    return item.unlockCheck.call(this, penguinData);
  },

  /**
   * 查找装扮定义
   */
  findCostume(costumeId) {
    for (const cat of ['hat', 'outfit', 'background']) {
      const found = this.COSTUMES[cat].find(c => c.id === costumeId);
      if (found) return found;
    }
    return null;
  },

  /**
   * 穿戴装扮
   * @param {string} costumeId - 装扮ID
   * @param {Object} penguinData - 企鹅数据（用于解锁检查）
   * @returns {Object} { success, message }
   */
  wear(costumeId, penguinData) {
    const item = this.findCostume(costumeId);
    if (!item) return { success: false, message: '装扮不存在' };
    if (!item.unlockCheck.call(this, penguinData)) {
      return { success: false, message: '尚未解锁此装扮' };
    }
    this.wearing[item.category] = costumeId;
    this.save();
    return { success: true, message: `已穿戴 ${item.icon} ${item.name}` };
  },

  /**
   * 卸下某类装扮
   * @param {string} category - hat/outfit/background
   */
  remove(category) {
    this.wearing[category] = null;
    this.save();
  },

  /**
   * 获取当前穿戴的装扮详情
   */
  getWearingDetail() {
    const result = {};
    for (const [cat, id] of Object.entries(this.wearing)) {
      if (id) {
        result[cat] = this.COSTUMES[cat].find(c => c.id === id) || null;
      } else {
        result[cat] = null;
      }
    }
    return result;
  }
};
