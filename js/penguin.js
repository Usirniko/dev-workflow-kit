/**
 * AI企鹅养成 - 企鹅渲染引擎（QQ风格版）
 * 腾讯QQ企鹅风格：圆润矮胖、大头小身、黑色主体+白色肚皮+橙色扁嘴
 * 豆豆眼、短翅膀小短腿、Q萌可爱
 * 不同进化阶段保持同一风格，只变化大小和配饰
 */
const PenguinRenderer = {
  canvas: null,
  ctx: null,
  animationId: null,
  frameCount: 0,
  frameSkip: 0,       // 帧跳过计数器：放缓动画速度（每2帧才推进一次）
  frameSpeed: 2,      // 速度除数：越大越慢，当前为2即速度减半
  blinkTimer: 0,
  blinkState: false,
  particles: [],

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    let containerWidth = container ? container.clientWidth : 0;
    // 兜底：如果容器宽度为 0（尚未渲染/隐藏状态），取 canvas 自身或默认值
    if (containerWidth === 0) {
      containerWidth = this.canvas.clientWidth || this.canvas.width || 240;
    }
    const size = Math.max(60, Math.min(containerWidth * 0.7, 300));
    this.canvas.width = size;
    this.canvas.height = size;
  },

  // 获取阶段配置 - QQ风格配色 + 关键词驱动配饰
  getStageConfig(stage, attributes) {
    // 从关键词引擎获取活跃配饰
    const activeAccessories = typeof KeywordEngine !== 'undefined' 
      ? KeywordEngine.getActiveAccessories(5) 
      : [];
    const accIds = activeAccessories.map(a => a.id);

    const configs = {
      1: { // 蛋/初生阶段 - 迷你QQ企鹅（带一点婴儿肥）
        name: '蛋蛋',
        bodyColor: '#1A1A1A',
        bellyColor: '#FFFFFF',
        beakColor: '#F5B942',
        scarfColor: '#E03E3E',
        eyeColor: '#1A1A1A',
        size: 0.65,
        hasBeak: true,
        hasWings: true,
        hasFeet: true,
        hasScarf: false,
        hasGlasses: false,
        hasHat: false,
        hasKeyboard: false,
        hasShield: false,
        hasTie: false,
        isEgg: true,
        sparkle: false,
        // 关键词驱动配饰
        hasJudgeHat: false,
        hasBadge: false,
        hasPalette: false,
        hasMegaphone: false,
        hasGamepad: false,
        hasLightbulb: false,
        hasGearNecklace: false,
        hasPenguinBadge: false,
        hasNetworkCable: false,
        hasBrainGear: false,
        hasStarBadge: false
      },
      2: { // 幼崽阶段 - 戴围巾的小QQ
        name: '波波',
        bodyColor: '#1A1A1A',
        bellyColor: '#FFFFFF',
        beakColor: '#F5B942',
        scarfColor: '#E03E3E',
        eyeColor: '#1A1A1A',
        size: 0.78,
        hasBeak: true,
        hasWings: true,
        hasFeet: true,
        hasScarf: true,
        hasGlasses: attributes.knowledge >= 50,
        hasHat: accIds.includes('judgeHat'),
        hasKeyboard: accIds.includes('keyboard'),
        hasShield: accIds.includes('shield') || attributes.mentality >= 50,
        hasTie: false,
        isEgg: false,
        sparkle: false,
        // 关键词驱动配饰
        hasJudgeHat: accIds.includes('judgeHat'),
        hasBadge: accIds.includes('badge'),
        hasPalette: accIds.includes('palette'),
        hasMegaphone: accIds.includes('megaphone'),
        hasGamepad: accIds.includes('gamepad'),
        hasLightbulb: accIds.includes('lightbulb'),
        hasGearNecklace: accIds.includes('gearNecklace'),
        hasPenguinBadge: accIds.includes('penguinBadge'),
        hasNetworkCable: accIds.includes('networkCable'),
        hasBrainGear: accIds.includes('brainGear'),
        hasStarBadge: accIds.includes('starBadge')
      },
      3: { // 青少年阶段 - 戴帽子+眼镜
        name: '酷酷',
        bodyColor: '#1A1A1A',
        bellyColor: '#FFFFFF',
        beakColor: '#F5B942',
        scarfColor: '#E03E3E',
        eyeColor: '#1A1A1A',
        size: 0.88,
        hasBeak: true,
        hasWings: true,
        hasFeet: true,
        hasScarf: true,
        hasGlasses: attributes.knowledge >= 60 || accIds.includes('glowingEyes'),
        hasHat: true,
        hasKeyboard: accIds.includes('keyboard') || attributes.action >= 60,
        hasShield: accIds.includes('shield') || attributes.mentality >= 60,
        hasTie: false,
        isEgg: false,
        sparkle: false,
        // 关键词驱动配饰
        hasJudgeHat: accIds.includes('judgeHat'),
        hasBadge: accIds.includes('badge'),
        hasPalette: accIds.includes('palette'),
        hasMegaphone: accIds.includes('megaphone'),
        hasGamepad: accIds.includes('gamepad'),
        hasLightbulb: accIds.includes('lightbulb'),
        hasGearNecklace: accIds.includes('gearNecklace'),
        hasPenguinBadge: accIds.includes('penguinBadge'),
        hasNetworkCable: accIds.includes('networkCable'),
        hasBrainGear: accIds.includes('brainGear'),
        hasStarBadge: accIds.includes('starBadge')
      },
      4: { // 成年阶段 - 全套装备
        name: '飞飞',
        bodyColor: '#1A1A1A',
        bellyColor: '#FFFFFF',
        beakColor: '#F5B942',
        scarfColor: '#E03E3E',
        eyeColor: '#1A1A1A',
        size: 0.98,
        hasBeak: true,
        hasWings: true,
        hasFeet: true,
        hasScarf: true,
        hasGlasses: attributes.knowledge >= 70 || accIds.includes('glowingEyes'),
        hasHat: accIds.includes('judgeHat'),
        hasKeyboard: accIds.includes('keyboard') || attributes.action >= 70,
        hasShield: accIds.includes('shield') || attributes.mentality >= 60,
        hasTie: true,
        isEgg: false,
        sparkle: true,
        // 关键词驱动配饰
        hasJudgeHat: accIds.includes('judgeHat'),
        hasBadge: accIds.includes('badge'),
        hasPalette: accIds.includes('palette'),
        hasMegaphone: accIds.includes('megaphone'),
        hasGamepad: accIds.includes('gamepad'),
        hasLightbulb: accIds.includes('lightbulb'),
        hasGearNecklace: accIds.includes('gearNecklace'),
        hasPenguinBadge: accIds.includes('penguinBadge'),
        hasNetworkCable: accIds.includes('networkCable'),
        hasBrainGear: accIds.includes('brainGear'),
        hasStarBadge: accIds.includes('starBadge')
      }
    };
    const cfg = configs[stage] || configs[1];

    // 注入装扮系统数据
    if (typeof DressUp !== 'undefined') {
      cfg._costumeHat = DressUp.wearing.hat;
      cfg._costumeOutfit = DressUp.wearing.outfit;
      cfg._costumeBackground = DressUp.wearing.background;
    } else {
      cfg._costumeHat = null;
      cfg._costumeOutfit = null;
      cfg._costumeBackground = null;
    }

    return cfg;
  },

  // 渲染企鹅
  render(penguinData) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 8;
    const config = this.getStageConfig(penguinData.stage, penguinData.attributes);

    ctx.clearRect(0, 0, w, h);

    // 呼吸动画（frameSkip 控制速度：每 frameSpeed 帧才推进一次 frameCount）
    this.frameSkip++;
    if (this.frameSkip >= this.frameSpeed) {
      this.frameSkip = 0;
      this.frameCount++;
    }
    const breathScale = 1 + Math.sin(this.frameCount * 0.05) * 0.02;
    
    // 眨眼逻辑
    this.blinkTimer++;
    if (this.blinkTimer > 180 + Math.random() * 120) {
      this.blinkState = true;
      if (this.blinkTimer > 188) {
        this.blinkState = false;
        this.blinkTimer = 0;
      }
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(breathScale, breathScale);

    // 基础大小
    const baseSize = Math.min(w, h) * config.size * 0.48;

    this.drawQQPenguin(ctx, baseSize, config, penguinData);

    ctx.restore();

    // 粒子特效
    if (config.sparkle) {
      this.updateParticles(w, h);
      this.drawParticles(ctx);
    }

    this.animationId = requestAnimationFrame(() => this.render(penguinData));
  },

  /**
   * 绘制QQ风格企鹅核心方法
   * 特征：圆润矮胖梨形身材、大头小身比例、黑色主体、白色心形肚皮
   * 扁平橙色喙、豆豆眼（瞳孔偏一侧）、红色围巾、短小翅膀
   */
  drawQQPenguin(ctx, s, config, data) {
    
    // ===== 0. 装扮背景（在企鹅之前绘制）=====
    if (config._costumeBackground) {
      this.drawCostumeBackground(ctx, s, config._costumeBackground);
    }

    // ===== 1. 地面阴影 =====
    ctx.fillStyle = ThemeColors.get().groundShadow;
    ctx.beginPath();
    ctx.ellipse(2, s * 0.92, s * 0.52, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // ===== 2. 橙色脚掌（扁平椭圆）=====
    ctx.fillStyle = config.beakColor; // #F5B942
    const footY = s * 0.85;
    // 左脚
    ctx.beginPath();
    ctx.ellipse(-s * 0.22, footY, s * 0.18, s * 0.075, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // 右脚
    ctx.beginPath();
    ctx.ellipse(s * 0.22, footY, s * 0.18, s * 0.075, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // ===== 3. 身体（QQ矮胖梨形轮廓）=====
    const bodyGrad = ctx.createRadialGradient(-s * 0.06, -s * 0.12, s * 0.06, 0, s * 0.08, s * 0.72);
    bodyGrad.addColorStop(0, '#2D2D2D');
    bodyGrad.addColorStop(0.5, config.bodyColor);   // #1A1A1A
    bodyGrad.addColorStop(1, '#0D0D0D');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.78);                              // 顶部圆弧
    ctx.bezierCurveTo(
      s * 0.68, -s * 0.76,                                // 右上肩
      s * 0.80, s * 0.04,                                  // 右侧腰
      s * 0.64, s * 0.48                                   // 右下底
    );
    ctx.bezierCurveTo(
      s * 0.52, s * 0.78,                                  // 底部中心右
      -s * 0.52, s * 0.78,                                 // 底部中心左
      -s * 0.64, s * 0.48                                  // 左下底
    );
    ctx.bezierCurveTo(
      -s * 0.80, s * 0.04,                                 // 左侧腰
      -s * 0.68, -s * 0.76,                               // 左上肩
      0, -s * 0.78                                         // 回到顶部
    );
    ctx.closePath();
    ctx.fill();

    // ===== 4. 白色肚皮区域（水滴形/心形）=====
    const bellyGrad = ctx.createRadialGradient(0, s * 0.12, s * 0.03, 0, s * 0.16, s * 0.48);
    bellyGrad.addColorStop(0, '#FFFFFF');
    bellyGrad.addColorStop(0.65, '#FAFAFA');
    bellyGrad.addColorStop(1, '#EEEEEE');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.32);
    ctx.bezierCurveTo(
      s * 0.36, -s * 0.30,
      s * 0.44, s * 0.18,
      s * 0.40, s * 0.50
    );
    ctx.bezierCurveTo(
      s * 0.28, s * 0.72,
      -s * 0.28, s * 0.72,
      -s * 0.40, s * 0.50
    );
    ctx.bezierCurveTo(
      -s * 0.44, s * 0.18,
      -s * 0.36, -s * 0.30,
      0, -s * 0.32
    );
    ctx.closePath();
    ctx.fill();

    // ===== 5. 红色围巾 =====
    if (config.hasScarf) {
      this.drawScarf(ctx, s, config);
    }

    // ===== 6. 翅膀（短小椭圆）=====
    if (config.hasWings) {
      const wingWave = Math.sin(this.frameCount * 0.04) * (s * 0.015);
      // 左翅
      ctx.fillStyle = config.bodyColor;
      ctx.save();
      ctx.translate(-s * 0.56, s * 0.10);
      ctx.rotate(-0.25 + wingWave * 0.01);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.09, s * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 右翅
      ctx.save();
      ctx.translate(s * 0.56, s * 0.10);
      ctx.rotate(0.25 - wingWave * 0.01);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.09, s * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ===== 7. 配饰（帽子、领带、键盘、盾牌等）=====
    // 法官帽（法律方向）
    if (config.hasJudgeHat) {
      this.drawJudgeHat(ctx, s);
    } else if (config.hasHat) {
      this.drawScholarHat(ctx, s);
    }
    // 领带
    if (config.hasTie) {
      this.drawTie(ctx, s);
    }
    // 工牌（产品方向）
    if (config.hasBadge) {
      this.drawBadge(ctx, s);
    }
    // 键盘（编程/行动力配饰）
    if (config.hasKeyboard) {
      this.drawKeyboard(ctx, s);
    }
    // 调色板（设计方向）
    if (config.hasPalette) {
      this.drawPalette(ctx, s);
    }
    // 喇叭（运营方向）
    if (config.hasMegaphone) {
      this.drawMegaphone(ctx, s);
    }
    // 手柄（游戏方向）
    if (config.hasGamepad) {
      this.drawGamepad(ctx, s);
    }
    // 盾牌（心态值/团队）
    if (config.hasShield) {
      this.drawShield(ctx, s);
    }
    // 灯泡（思考/为什么）
    if (config.hasLightbulb) {
      this.drawLightbulb(ctx, s);
    }
    // 齿轮项链（焦虑调整）
    if (config.hasGearNecklace) {
      this.drawGearNecklace(ctx, s);
    }
    // 企鹅徽章（腾讯相关）
    if (config.hasPenguinBadge) {
      this.drawPenguinBadge(ctx, s);
    }
    // 网线（TCP/网络）
    if (config.hasNetworkCable) {
      this.drawNetworkCable(ctx, s);
    }
    // 思维齿轮（算法）
    if (config.hasBrainGear) {
      this.drawBrainGear(ctx, s);
    }
    // 星星徽章（成长）
    if (config.hasStarBadge) {
      this.drawStarBadge(ctx, s);
    }

    // ===== 装扮系统：服饰（在配饰之后、眼睛之前）=====
    if (config._costumeOutfit) {
      this.drawCostumeOutfit(ctx, s, config._costumeOutfit);
    }
    // 装扮系统：头饰（覆盖阶段帽子）
    if (config._costumeHat) {
      this.drawCostumeHat(ctx, s, config._costumeHat);
    }

    // ===== 8. 眼睛（豆豆眼）=====
    const eyeY = -s * 0.20;
    const eyeSpacing = s * 0.16;

    // 先画墨镜或眼镜（如果有）
    if (config.hasGlasses) {
      this.drawGlasses(ctx, s, eyeY, eyeSpacing, config);
    }

    // 左眼
    this.drawQQEye(ctx, -eyeSpacing, eyeY, s * 0.11, config, false);
    // 右眼（可能wink）
    const rightWink = !this.blinkState && (Math.random() > 0.996);
    this.drawQQEye(ctx, eyeSpacing, eyeY, s * 0.11, config, rightWink);

    // ===== 9. 橙色扁嘴/喙 =====
    if (config.hasBeak) {
      this.drawBeak(ctx, s, config);
    }
  },

  // ---------- 子绘制方法 ----------

  /** 绘制红色围巾 */
  drawScarf(ctx, s, config) {
    const scarfY = s * 0.12;
    ctx.fillStyle = config.scarfColor; // #E03E3E
    // 围巾环绕脖子一圈
    ctx.beginPath();
    ctx.moveTo(-s * 0.52, scarfY - s * 0.06);
    ctx.bezierCurveTo(-s * 0.55, scarfY + s * 0.12, -s * 0.46, scarfY + s * 0.18, -s * 0.42, scarfY + s * 0.18);
    ctx.lineTo(s * 0.42, scarfY + s * 0.18);
    ctx.bezierCurveTo(s * 0.46, scarfY + s * 0.18, s * 0.55, scarfY + s * 0.12, s * 0.52, scarfY - s * 0.06);
    ctx.bezierCurveTo(s * 0.46, scarfY - s * 0.10, -s * 0.46, scarfY - s * 0.10, -s * 0.52, scarfY - s * 0.06);
    ctx.closePath();
    ctx.fill();
    // 围巾下垂部分
    ctx.beginPath();
    ctx.moveTo(-s * 0.10, scarfY + s * 0.17);
    ctx.lineTo(-s * 0.10, scarfY + s * 0.38);
    ctx.quadraticCurveTo(-s * 0.10, scarfY + s * 0.46, s * 0.06, scarfY + s * 0.46);
    ctx.quadraticCurveTo(s * 0.14, scarfY + s * 0.46, s * 0.14, scarfY + s * 0.38);
    ctx.lineTo(s * 0.14, scarfY + s * 0.17);
    ctx.closePath();
    ctx.fill();
  },

  /** 绘制学士帽 */
  drawScholarHat(ctx, s) {
    const hatBaseY = -s * 0.72;
    // 帽顶板
    ctx.fillStyle = '#1A1A1A';
    this.roundRectPath(ctx, -s * 0.34, hatBaseY - s * 0.08, s * 0.68, s * 0.07, 2);
    ctx.fill();
    // 帽托（头顶部分）
    ctx.fillRect(-s * 0.20, hatBaseY - s * 0.15, s * 0.40, s * 0.09);
    // 帽穗线
    ctx.strokeStyle = '#E9C46A';
    ctx.lineWidth = s * 0.018;
    ctx.beginPath();
    ctx.moveTo(s * 0.24, hatBaseY - s * 0.04);
    ctx.quadraticCurveTo(s * 0.38, hatBaseY + s * 0.10, s * 0.32, hatBaseY + s * 0.28);
    ctx.stroke();
    // 帽穗球
    ctx.fillStyle = '#E9C46A';
    ctx.beginPath();
    ctx.arc(s * 0.32, hatBaseY + s * 0.29, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
  },

  /** 绘制领带 */
  drawTie(ctx, s) {
    const tieY = s * 0.04;
    // 领带结
    ctx.fillStyle = '#C1121F';
    this.roundRectPath(ctx, -s * 0.055, tieY - s * 0.07, s * 0.11, s * 0.06, 2);
    ctx.fill();
    // 领带主体
    ctx.fillStyle = '#E03E3E';
    ctx.beginPath();
    ctx.moveTo(0, tieY - s * 0.02);
    ctx.lineTo(s * 0.07, tieY + s * 0.06);
    ctx.lineTo(0, tieY + s * 0.26);
    ctx.lineTo(-s * 0.07, tieY + s * 0.06);
    ctx.closePath();
    ctx.fill();
  },

  /** 绘制键盘配饰（行动力） */
  drawKeyboard(ctx, s) {
    const kbX = -s * 0.45;
    const kbY = s * 0.30;
    ctx.save();
    ctx.translate(kbX, kbY);
    ctx.rotate(-0.3);
    // 键盘本体
    ctx.fillStyle = '#E8E8E8';
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    this.roundRectPath(ctx, -s * 0.16, -s * 0.08, s * 0.32, s * 0.22, s * 0.03);
    ctx.fill();
    ctx.stroke();
    // 键盘按键
    ctx.fillStyle = '#D0D0D0';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillRect(
          -s * 0.13 + col * s * 0.07,
          -s * 0.05 + row * s * 0.058,
          s * 0.052,
          s * 0.042
        );
      }
    }
    ctx.restore();
  },

  /** 绘制盾牌配饰（心态值） */
  drawShield(ctx, s) {
    const shX = s * 0.45;
    const shY = s * 0.25;
    ctx.save();
    ctx.translate(shX, shY);
    ctx.rotate(0.15);
    // 盾牌外形
    ctx.fillStyle = '#4A90D9';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.13);
    ctx.lineTo(s * 0.12, -s * 0.06);
    ctx.lineTo(s * 0.12, s * 0.04);
    ctx.quadraticCurveTo(s * 0.06, s * 0.14, 0, s * 0.17);
    ctx.quadraticCurveTo(-s * 0.06, s * 0.14, -s * 0.12, s * 0.04);
    ctx.lineTo(-s * 0.12, -s * 0.06);
    ctx.closePath();
    ctx.fill();
    // 盾牌内勾（白色对勾）
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = s * 0.022;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, s * 0.01);
    ctx.lineTo(-s * 0.01, s * 0.06);
    ctx.lineTo(s * 0.06, -s * 0.04);
    ctx.stroke();
    ctx.restore();
  },

  /** 绘制圆框眼镜（知识属性）*/
  drawGlasses(ctx, s, eyeY, eyeSpacing, config) {
    ctx.strokeStyle = '#E9C46A';
    ctx.lineWidth = s * 0.018;
    // 左镜框
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, s * 0.105, 0, Math.PI * 2);
    ctx.stroke();
    // 右镜框
    ctx.beginPath();
    ctx.arc(eyeSpacing, eyeY, s * 0.105, 0, Math.PI * 2);
    ctx.stroke();
    // 鼻梁
    ctx.beginPath();
    ctx.moveTo(-eyeSpacing + s * 0.105, eyeY);
    ctx.lineTo(eyeSpacing - s * 0.105, eyeY);
    ctx.stroke();
  },

  /**
   * 绘制QQ风格豆豆眼
   * @param {boolean} wink 是否眨眼/wink（^ 形状）
   */
  drawQQEye(ctx, x, y, r, config, wink) {
    // 眼白（大椭圆，略竖长）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.blinkState || wink) {
      // 眨眼 / wink（^ 弧线）
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (wink) {
        // wink 上弯 ^ 
        ctx.moveTo(x - r * 0.65, y + r * 0.1);
        ctx.quadraticCurveTo(x, y - r * 0.35, x + r * 0.65, y - r * 0.05);
      } else {
        // 正常闭眼 —
        ctx.moveTo(x - r * 0.6, y);
        ctx.lineTo(x + r * 0.6, y);
      }
      ctx.stroke();
    } else {
      // 豆豆瞳孔（靠内侧偏下方，QQ特征）
      ctx.fillStyle = config.eyeColor; // #1A1A1A
      ctx.beginPath();
      ctx.arc(x + r * 0.22, y + r * 0.1, r * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // 高光点（两个，一大一小，QQ特征）
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x + r * 0.05, y - r * 0.22, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.30, y + r * 0.18, r * 0.10, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** 绘制橙色扁平喙 */
  drawBeak(ctx, s, config) {
    const beakY = -s * 0.06;
    // 渐变色扁椭圆嘴
    const beakGrad = ctx.createLinearGradient(-s * 0.12, beakY - s * 0.04, s * 0.12, beakY + s * 0.08);
    beakGrad.addColorStop(0, '#F5B942');
    beakGrad.addColorStop(0.5, '#F0A620');
    beakGrad.addColorStop(1, '#E09510');
    ctx.fillStyle = beakGrad;
    ctx.beginPath();
    ctx.ellipse(0, beakY + s * 0.06, s * 0.155, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    // 中间分割线
    ctx.strokeStyle = '#D98A0A';
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.moveTo(0, beakY + s * 0.005);
    ctx.lineTo(0, beakY + s * 0.115);
    ctx.stroke();
  },

  /** 辅助：绘制圆角矩形路径 */
  roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  // ========== 粒子系统 ==========
  spawnParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        life: 1,
        decay: 0.01 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#F5B942' : '#FFFFFF'
      });
    }
  },

  updateParticles(w, h) {
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
    });
    if (this.frameCount % 60 === 0 && this.particles.length < 30) {
      this.spawnParticles(w / 2, h / 2, 5);
    }
  },

  drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  },

  // ========== 关键词驱动配饰绘制 ==========

  /** 法官帽（法律方向） */
  drawJudgeHat(ctx, s) {
    const hatY = -s * 0.78;
    // 帽体
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.rect(-s * 0.22, hatY - s * 0.06, s * 0.44, s * 0.08);
    ctx.fill();
    // 帽顶圆
    ctx.beginPath();
    ctx.arc(0, hatY - s * 0.06, s * 0.12, Math.PI, 0);
    ctx.fill();
    // 金色徽章
    ctx.fillStyle = '#E9C46A';
    ctx.beginPath();
    ctx.arc(0, hatY, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  },

  /** 工牌（产品方向） */
  drawBadge(ctx, s) {
    const bx = 0, by = s * 0.05;
    ctx.save();
    // 工牌挂绳
    ctx.strokeStyle = '#0052D9';
    ctx.lineWidth = s * 0.015;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, by - s * 0.18);
    ctx.lineTo(-s * 0.08, by);
    ctx.stroke();
    ctx.moveTo(s * 0.12, by - s * 0.18);
    ctx.lineTo(s * 0.08, by);
    ctx.stroke();
    // 工牌卡片
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0052D9';
    ctx.lineWidth = 1.5;
    this.roundRectPath(ctx, -s * 0.14, by, s * 0.28, s * 0.16, s * 0.02);
    ctx.fill();
    ctx.stroke();
    // 工牌文字
    ctx.fillStyle = '#0052D9';
    ctx.font = `${s * 0.06}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('PM', 0, by + s * 0.11);
    ctx.restore();
  },

  /** 调色板（设计方向） */
  drawPalette(ctx, s) {
    const px = -s * 0.52, py = s * 0.35;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.2);
    // 调色板底板
    ctx.fillStyle = '#D2691E';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.14, s * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    // 颜色点
    const colors = ['#E03E3E', '#0052D9', '#F5B942', '#50C878', '#9B59B6'];
    colors.forEach((c, i) => {
      const angle = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * s * 0.06, Math.sin(angle) * s * 0.04, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  },

  /** 喇叭（运营方向） */
  drawMegaphone(ctx, s) {
    const mx = -s * 0.45, my = s * 0.38;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#F0A030';
    ctx.beginPath();
    ctx.moveTo(-s * 0.10, -s * 0.04);
    ctx.lineTo(s * 0.05, -s * 0.06);
    ctx.lineTo(s * 0.14, -s * 0.02);
    ctx.lineTo(s * 0.14, s * 0.04);
    ctx.lineTo(s * 0.05, s * 0.06);
    ctx.lineTo(-s * 0.10, s * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  /** 手柄（游戏方向） */
  drawGamepad(ctx, s) {
    const gx = s * 0.48, gy = s * 0.35;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(0.15);
    // 手柄主体
    ctx.fillStyle = '#333';
    this.roundRectPath(ctx, -s * 0.13, -s * 0.05, s * 0.26, s * 0.10, s * 0.02);
    ctx.fill();
    // 方向键
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-s * 0.06, 0, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
    // 按钮
    ctx.fillStyle = '#E03E3E';
    ctx.beginPath();
    ctx.arc(s * 0.06, -s * 0.01, s * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#50C878';
    ctx.beginPath();
    ctx.arc(s * 0.09, 0, s * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /** 灯泡（思考/为什么） */
  drawLightbulb(ctx, s) {
    const lx = 0, ly = -s * 0.80;
    // 灯泡发光
    ctx.fillStyle = 'rgba(255, 230, 100, 0.2)';
    ctx.beginPath();
    ctx.arc(lx, ly, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    // 灯泡本体
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(lx, ly - s * 0.02, s * 0.06, Math.PI, 0);
    ctx.quadraticCurveTo(lx + s * 0.06, ly + s * 0.03, lx, ly + s * 0.05);
    ctx.quadraticCurveTo(lx - s * 0.06, ly + s * 0.03, lx - s * 0.06, ly - s * 0.02);
    ctx.closePath();
    ctx.fill();
    // 灯泡底座
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.rect(lx - s * 0.03, ly + s * 0.04, s * 0.06, s * 0.025);
    ctx.fill();
  },

  /** 齿轮项链（焦虑调整） */
  drawGearNecklace(ctx, s) {
    const gx = 0, gy = s * 0.18;
    // 项链线
    ctx.strokeStyle = '#999';
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.arc(0, gy - s * 0.12, s * 0.10, Math.PI * 0.7, Math.PI * 0.3);
    ctx.stroke();
    // 齿轮
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(gx, gy, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // 齿轮齿
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const rx = gx + Math.cos(angle) * s * 0.05;
      const ry = gy + Math.sin(angle) * s * 0.05;
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(rx, ry, s * 0.015, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /** 企鹅徽章（腾讯相关） */
  drawPenguinBadge(ctx, s) {
    const px = s * 0.32, py = -s * 0.55;
    ctx.save();
    ctx.translate(px, py);
    // 徽章圆底
    ctx.fillStyle = '#0052D9';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // 小企鹅图标
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.025, s * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0052D9';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.008, s * 0.012, s * 0.015, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /** 网线（TCP/网络） */
  drawNetworkCable(ctx, s) {
    const nx = s * 0.48, ny = s * 0.08;
    ctx.save();
    ctx.translate(nx, ny);
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = s * 0.018;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.quadraticCurveTo(s * 0.08, -s * 0.06, s * 0.02, 0);
    ctx.stroke();
    // RJ45头
    ctx.fillStyle = '#CCC';
    ctx.beginPath();
    ctx.rect(-s * 0.02, -s * 0.14, s * 0.04, s * 0.03);
    ctx.fill();
    ctx.restore();
  },

  /** 思维齿轮（算法） */
  drawBrainGear(ctx, s) {
    const bx = s * 0.35, by = -s * 0.62;
    ctx.save();
    ctx.translate(bx, by);
    const t = this.frameCount * 0.02;
    ctx.rotate(t);
    ctx.fillStyle = '#9B59B6';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.fillStyle = '#9B59B6';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * s * 0.052, Math.sin(angle) * s * 0.052, s * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }
    // 中心
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /** 星星徽章（成长） */
  drawStarBadge(ctx, s) {
    const sx = -s * 0.38, sy = -s * 0.55;
    ctx.save();
    ctx.translate(sx, sy);
    // 星星
    ctx.fillStyle = '#F5B942';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = i === 0 ? s * 0.05 : s * 0.02;
      if (i === 0) ctx.moveTo(Math.cos(angle) * s * 0.05, Math.sin(angle) * s * 0.05);
      else ctx.lineTo(Math.cos(angle) * s * 0.022, Math.sin(angle) * s * 0.022);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // 进化特效
  playEvolutionAnimation(callback) {
    if (!this.canvas) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    this.spawnParticles(cx, cy, 30);
    setTimeout(callback, 1500);
  },

  // =============================================
  //  装扮系统绘制方法
  // =============================================

  /** 绘制装扮背景 */
  drawCostumeBackground(ctx, s, bgId) {
    ctx.save();
    // 在企鹅后方绘制背景装饰
    const bgSize = s * 1.8;

    switch (bgId) {
      case 'starry_sky': {
        // 星空背景：渐变夜空 + 闪烁星星
        const grad = ctx.createRadialGradient(0, -s * 0.3, s * 0.2, 0, 0, bgSize);
        grad.addColorStop(0, 'rgba(20, 24, 82, 0.25)');
        grad.addColorStop(0.6, 'rgba(10, 14, 60, 0.15)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-bgSize, -bgSize, bgSize * 2, bgSize * 2);
        // 星星
        const starCount = 15;
        for (let i = 0; i < starCount; i++) {
          const sx = (Math.sin(i * 2.7 + 0.5) * s * 1.2);
          const sy = (Math.cos(i * 3.1 + 1.2) * s * 1.1 - s * 0.3);
          const sr = s * 0.015 + (i % 3) * s * 0.008;
          const alpha = 0.4 + (i % 4) * 0.15;
          ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
          ctx.beginPath();
          this._drawStar(ctx, sx, sy, sr, sr * 0.45, 5);
          ctx.fill();
        }
        break;
      }
      case 'library': {
        // 图书馆背景：书架纹理
        const grad = ctx.createLinearGradient(0, -bgSize, 0, bgSize);
        grad.addColorStop(0, 'rgba(139, 90, 43, 0.12)');
        grad.addColorStop(1, 'rgba(101, 67, 33, 0.06)');
        ctx.fillStyle = grad;
        ctx.fillRect(-bgSize * 0.6, -bgSize, bgSize * 1.2, bgSize * 2);
        // 书架横板
        for (let row = 0; row < 4; row++) {
          const y = -s * 0.4 + row * s * 0.25;
          ctx.fillStyle = 'rgba(101, 67, 33, 0.15)';
          ctx.fillRect(-s * 0.7, y, s * 1.4, s * 0.025);
        }
        break;
      }
      case 'office': {
        // 办公室背景：现代网格 + 蓝色调
        const grad = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, bgSize);
        grad.addColorStop(0, 'rgba(230, 240, 255, 0.2)');
        grad.addColorStop(1, 'rgba(200, 220, 250, 0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(-bgSize, -bgSize, bgSize * 2, bgSize * 2);
        // 装饰几何线
        ctx.strokeStyle = 'rgba(0, 82, 217, 0.08)';
        ctx.lineWidth = s * 0.01;
        ctx.beginPath();
        ctx.moveTo(-s * 0.9, -s * 0.35);
        ctx.lineTo(s * 0.9, -s * 0.35);
        ctx.moveTo(-s * 0.8, s * 0.5);
        ctx.lineTo(s * 0.8, s * 0.5);
        ctx.stroke();
        break;
      }
      case 'campus': {
        // 校园背景：绿树阳光
        const grad = ctx.createLinearGradient(0, -bgSize, 0, bgSize);
        grad.addColorStop(0, 'rgba(135, 206, 235, 0.18)');
        grad.addColorStop(0.5, 'rgba(144, 238, 144, 0.08)');
        grad.addColorStop(1, 'rgba(34, 139, 34, 0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(-bgSize, -bgSize, bgSize * 2, bgSize * 2);
        // 阳光效果
        ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
        ctx.beginPath();
        ctx.arc(s * 0.3, -s * 0.6, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'aurora': {
        // 极光背景：多层渐变光带
        for (let i = 0; i < 3; i++) {
          const yOff = -s * 0.5 + i * s * 0.3;
          const grad = ctx.createLinearGradient(-bgSize, yOff, bgSize, yOff + s * 0.3);
          const colors = [
            ['rgba(72, 219, 251, 0.12)', 'rgba(46, 196, 182, 0.06)', 'rgba(72, 219, 251, 0.0)'],
            ['rgba(162, 155, 254, 0.1)', 'rgba(108, 92, 231, 0.05)', 'rgba(162, 155, 254, 0.0)'],
            ['rgba(0, 184, 148, 0.1)', 'rgba(85, 239, 196, 0.05)', 'rgba(0, 184, 148, 0.0)']
          ];
          const c = colors[i];
          grad.addColorStop(0, c[0]);
          grad.addColorStop(0.5, c[1]);
          grad.addColorStop(1, c[2]);
          ctx.fillStyle = grad;
          ctx.fillRect(-bgSize * 0.8, yOff, bgSize * 1.6, s * 0.35);
        }
        break;
      }
    }
    ctx.restore();
  },

  /** 五角星辅助方法 */
  _drawStar(ctx, cx, cy, outerR, innerR, points) {
    ctx.moveTo(cx, cy - outerR);
    for (let i = 1; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
  },

  /** 绘制装扮服饰 */
  drawCostumeOutfit(ctx, s, outfitId) {
    ctx.save();
    switch (outfitId) {
      case 'blazer': {
        // 小西装：深蓝西装领
        ctx.fillStyle = '#1B3A5C';
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, s * 0.02);
        ctx.bezierCurveTo(-s * 0.48, s * 0.15, -s * 0.46, s * 0.38, -s * 0.38, s * 0.48);
        ctx.lineTo(s * 0.38, s * 0.48);
        ctx.bezierCurveTo(s * 0.46, s * 0.38, s * 0.48, s * 0.15, s * 0.42, s * 0.02);
        ctx.closePath();
        ctx.fill();
        // 领口白衬衫
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, s * 0.05);
        ctx.lineTo(0, s * 0.18);
        ctx.lineTo(s * 0.1, s * 0.05);
        ctx.closePath();
        ctx.fill();
        // 纽扣
        ctx.fillStyle = '#C8A96E';
        ctx.beginPath();
        ctx.arc(0, s * 0.22, s * 0.018, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, s * 0.3, s * 0.018, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'hoodie': {
        // 连帽衫：宽松卫衣
        ctx.fillStyle = '#6B7B8D';
        ctx.beginPath();
        ctx.moveTo(-s * 0.46, s * 0.04);
        ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 0.48, s * 0.42, -s * 0.4, s * 0.5);
        ctx.lineTo(s * 0.4, s * 0.5);
        ctx.bezierCurveTo(s * 0.48, s * 0.42, s * 0.5, s * 0.2, s * 0.46, s * 0.04);
        ctx.closePath();
        ctx.fill();
        // 帽子褶皱
        ctx.fillStyle = '#5A6978';
        ctx.beginPath();
        ctx.arc(0, s * 0.01, s * 0.18, Math.PI, 0);
        ctx.fill();
        // 口袋
        ctx.strokeStyle = '#5A6978';
        ctx.lineWidth = s * 0.015;
        this.roundRectPath(ctx, -s * 0.18, s * 0.2, s * 0.36, s * 0.1, s * 0.02);
        ctx.stroke();
        break;
      }
      case 'coding_tee': {
        // 编程T恤：黑色T恤+代码图案
        ctx.fillStyle = '#2D2D2D';
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, s * 0.06);
        ctx.bezierCurveTo(-s * 0.44, s * 0.2, -s * 0.42, s * 0.4, -s * 0.36, s * 0.48);
        ctx.lineTo(s * 0.36, s * 0.48);
        ctx.bezierCurveTo(s * 0.42, s * 0.4, s * 0.44, s * 0.2, s * 0.4, s * 0.06);
        ctx.closePath();
        ctx.fill();
        // 代码字符装饰
        ctx.fillStyle = '#00FF41';
        ctx.font = `${s * 0.055}px monospace`;
        ctx.fillText('</>', -s * 0.08, s * 0.28);
        break;
      }
      case 'robe': {
        // 法袍：黑色长袍+红色饰边
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.moveTo(-s * 0.44, s * 0.0);
        ctx.bezierCurveTo(-s * 0.5, s * 0.18, -s * 0.5, s * 0.45, -s * 0.42, s * 0.52);
        ctx.lineTo(s * 0.42, s * 0.52);
        ctx.bezierCurveTo(s * 0.5, s * 0.45, s * 0.5, s * 0.18, s * 0.44, s * 0.0);
        ctx.closePath();
        ctx.fill();
        // 红色饰边
        ctx.strokeStyle = '#C1121F';
        ctx.lineWidth = s * 0.025;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, s * 0.05);
        ctx.lineTo(-s * 0.08, s * 0.32);
        ctx.lineTo(0, s * 0.2);
        ctx.lineTo(s * 0.08, s * 0.32);
        ctx.lineTo(s * 0.12, s * 0.05);
        ctx.stroke();
        break;
      }
      case 'star_vest': {
        // 星星马甲：金色点缀
        ctx.fillStyle = '#F5E6CA';
        ctx.beginPath();
        ctx.moveTo(-s * 0.36, s * 0.08);
        ctx.bezierCurveTo(-s * 0.4, s * 0.22, -s * 0.38, s * 0.4, -s * 0.32, s * 0.47);
        ctx.lineTo(s * 0.32, s * 0.47);
        ctx.bezierCurveTo(s * 0.38, s * 0.4, s * 0.4, s * 0.22, s * 0.36, s * 0.08);
        ctx.closePath();
        ctx.fill();
        // 小星星装饰
        ctx.fillStyle = '#E9C46A';
        for (let i = 0; i < 3; i++) {
          const sx = -s * 0.1 + i * s * 0.1;
          this._drawStar(ctx, sx, s * 0.3, s * 0.03, s * 0.014, 5);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  },

  /** 绘制装扮头饰 */
  drawCostumeHat(ctx, s, hatId) {
    ctx.save();
    switch (hatId) {
      case 'judge_hat': {
        // 法官帽：已有的绘制方法
        this.drawJudgeHat(ctx, s);
        break;
      }
      case 'code_glasses': {
        // 代码眼镜：厚框圆眼镜+绿色镜片反光
        const eyeY = -s * 0.20;
        const eyeSpacing = s * 0.16;
        // 左镜框
        ctx.strokeStyle = '#333';
        ctx.lineWidth = s * 0.025;
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, s * 0.14, 0, Math.PI * 2);
        ctx.stroke();
        // 右镜框
        ctx.beginPath();
        ctx.arc(eyeSpacing, eyeY, s * 0.14, 0, Math.PI * 2);
        ctx.stroke();
        // 镜桥
        ctx.beginPath();
        ctx.moveTo(-eyeSpacing + s * 0.12, eyeY);
        ctx.lineTo(eyeSpacing - s * 0.12, eyeY);
        ctx.stroke();
        // 镜片绿色反光
        ctx.fillStyle = 'rgba(0, 255, 65, 0.12)';
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeSpacing, eyeY, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'badge_card': {
        // 工牌：挂在脖子上的卡片
        this.drawBadge(ctx, s);
        break;
      }
      case 'headphone': {
        // 耳机：头戴式
        ctx.strokeStyle = '#555';
        ctx.lineWidth = s * 0.035;
        ctx.beginPath();
        ctx.arc(0, -s * 0.15, s * 0.32, Math.PI * 0.75, Math.PI * 0.25, true);
        ctx.stroke();
        // 耳罩
        ctx.fillStyle = '#444';
        this.roundRectPath(ctx, -s * 0.32, -s * 0.38, s * 0.1, s * 0.22, s * 0.02);
        ctx.fill();
        this.roundRectPath(ctx, s * 0.22, -s * 0.38, s * 0.1, s * 0.22, s * 0.02);
        ctx.fill();
        // 耳罩内圈
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(-s * 0.27, -s * 0.27, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.27, -s * 0.27, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'scholar_hat': {
        // 学士帽：已有绘制方法
        this.drawScholarHat(ctx, s);
        break;
      }
    }
    ctx.restore();
  },

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
};
