// 渲染系统 - Canvas 渲染，支持离屏缓存和视锥剔除

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    // 离屏缓存（用于静态地图）
    this.mapCache = null;
    this.mapCacheDirty = true;
    
    // 背景缓存
    this.backgroundCache = null;
  }

  // 调整大小
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
    this.mapCacheDirty = true;
  }

  // 清除画布
  clear() {
    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // 绘制背景（渐变）
  drawBackground() {
    if (!this.backgroundCache) {
      this.backgroundCache = document.createElement('canvas');
      this.backgroundCache.width = this.width;
      this.backgroundCache.height = this.height;
      const ctx = this.backgroundCache.getContext('2d');
      
      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    
    this.ctx.drawImage(this.backgroundCache, 0, 0);
  }

  // 预渲染地图（离屏缓存）
  cacheMap(platforms) {
    this.mapCache = document.createElement('canvas');
    this.mapCache.width = 2000;  // 地图最大宽度
    this.mapCache.height = 1200; // 地图最大高度
    const ctx = this.mapCache.getContext('2d');
    
    // 绘制平台
    for (const platform of platforms) {
      this._drawPlatform(ctx, platform);
    }
    
    this.mapCacheDirty = false;
  }

  // 绘制缓存的地图
  drawMap(camera, platforms) {
    // 直接绘制平台（不使用缓存，避免缓存问题）
    for (const platform of platforms) {
      if (this._isPlatformInView(platform, camera)) {
        this._drawPlatform(this.ctx, platform);
      }
    }
  }

  // 检查平台是否在视野内
  _isPlatformInView(platform, camera) {
    return !(platform.x + platform.width < camera.x ||
             platform.x > camera.x + camera.width ||
             platform.y + platform.height < camera.y ||
             platform.y > camera.y + camera.height);
  }

  // 绘制平台
  _drawPlatform(ctx, platform) {
    const gradient = ctx.createLinearGradient(
      platform.x, platform.y,
      platform.x, platform.y + platform.height
    );
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(1, '#2d3748');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // 顶部高光
    ctx.fillStyle = '#718096';
    ctx.fillRect(platform.x, platform.y, platform.width, 3);
    
    // 边框
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
  }

  // 绘制角色（5 部位分层）
  drawPlayer(player, camera) {
    if (!camera.isInView(player, 100)) return;
    
    const ctx = this.ctx;
    ctx.save();
    
    // 应用玩家变换
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // 翻转（朝向）
    if (player.facingLeft) {
      ctx.scale(-1, 1);
    }
    
    // 应用动画偏移
    this._applyAnimationOffset(ctx, player);
    
    // 绘制各部位
    this._drawLegs(ctx, player);
    this._drawBody(ctx, player);
    this._drawHead(ctx, player);
    this._drawArm(ctx, player);
    this._drawWeapon(ctx, player);
    
    // 绘制血条
    this._drawHealthBar(ctx, player);
    
    ctx.restore();
    
    // 绘制控制箭头
    if (player.isControlled && player.alive) {
      this._drawControlArrow(player);
    }
  }

  // 应用动画偏移
  _applyAnimationOffset(ctx, player) {
    if (player.falling || player.fallenAngle > 0) {
      ctx.rotate(Utils.degToRad(player.fallenAngle));
      ctx.translate(player.height * 0.35, 0);
      return;
    }
    
    if (player.crouching) {
      ctx.scale(1, 0.7);
      ctx.translate(0, player.height * 0.15);
    }
    
    if (!player.onGround) {
      ctx.rotate(Utils.degToRad(-5));
    }
  }

  // 绘制腿部
  _drawLegs(ctx, player) {
    const legOffset = Math.sin(player.walkAnim) * 10;
    const thighColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const shinColor = player.team === 'blue' ? '#1a365d' : '#742a2a';
    const bootColor = '#1a202c';
    
    // 左腿
    ctx.save();
    ctx.translate(-8, 15);
    const leftLegAngle = player.onGround ? legOffset : -10;
    ctx.rotate(Utils.degToRad(leftLegAngle));
    
    // 大腿
    ctx.fillStyle = thighColor;
    ctx.fillRect(-5, 0, 10, 12);
    // 膝盖护具
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-5, 10, 10, 4);
    // 小腿
    ctx.fillStyle = shinColor;
    ctx.fillRect(-5, 14, 10, 10);
    // 军靴
    ctx.fillStyle = bootColor;
    ctx.fillRect(-5, 22, 10, 6);
    
    ctx.restore();
    
    // 右腿
    ctx.save();
    ctx.translate(8, 15);
    const rightLegAngle = player.onGround ? -legOffset : 10;
    ctx.rotate(Utils.degToRad(rightLegAngle));
    
    // 大腿
    ctx.fillStyle = thighColor;
    ctx.fillRect(-5, 0, 10, 12);
    // 膝盖护具
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-5, 10, 10, 4);
    // 小腿
    ctx.fillStyle = shinColor;
    ctx.fillRect(-5, 14, 10, 10);
    // 军靴
    ctx.fillStyle = bootColor;
    ctx.fillRect(-5, 22, 10, 6);
    
    ctx.restore();
    
    // 腿袋（侧面）
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(player.facingLeft ? 5 : -12, 8, 7, 8);
  }

  // 绘制身体
  _drawBody(ctx, player) {
    const bodyColor = player.team === 'blue' ? '#4299e1' : '#f56565';
    const vestColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const shoulderColor = player.team === 'blue' ? '#2b6cb0' : '#e53e3e';
    
    // 躯干主体
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-15, -10, 30, 30, 5);
    ctx.fill();
    
    // 肩膀（左右各一个）
    ctx.fillStyle = shoulderColor;
    // 左肩
    ctx.beginPath();
    ctx.arc(-14, -8, 8, 0, Math.PI * 2);
    ctx.fill();
    // 右肩
    ctx.beginPath();
    ctx.arc(14, -8, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 战术背心
    ctx.fillStyle = vestColor;
    ctx.fillRect(-12, -5, 24, 22);
    
    // 背心口袋细节
    ctx.fillStyle = '#1a365d';
    ctx.fillRect(-10, 5, 8, 8);
    ctx.fillRect(2, 5, 8, 8);
    
    // 肩带
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-5, 5);
    ctx.moveTo(8, -8);
    ctx.lineTo(5, 5);
    ctx.stroke();
    
    // 腰带/装备包
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-14, 18, 28, 6);
    // 装备包细节
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(-10, 19, 6, 4);
    ctx.fillRect(4, 19, 6, 4);
    
    // 队伍标识徽章
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.team === 'blue' ? '#4299e1' : '#f56565';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.team === 'blue' ? 'B' : 'R', 0, 8);
  }

  // 绘制头部
  _drawHead(ctx, player) {
    const skinColor = '#f6ad55';
    const skinShadow = '#d69e5a';
    const helmetColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const helmetDark = player.team === 'blue' ? '#1a365d' : '#742a2a';
    
    // 脸型（椭圆，3/4 侧视效果）
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(0, -20, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 脸部阴影（立体感）
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(2, -18, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 头盔主体（包裹式）
    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(0, -24, 15, Math.PI * 0.1, Math.PI * 0.9);
    ctx.lineTo(-13, -15);
    ctx.lineTo(-14, -8);
    ctx.lineTo(14, -8);
    ctx.lineTo(13, -15);
    ctx.closePath();
    ctx.fill();
    
    // 头盔顶部细节
    ctx.fillStyle = helmetDark;
    ctx.beginPath();
    ctx.arc(0, -26, 13, Math.PI * 0.2, Math.PI * 0.8);
    ctx.fill();
    
    // 护目镜（横贯式设计，包裹双眼）
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.roundRect(-10, -23, 20, 8, 3);
    ctx.fill();
    
    // 护目镜带
    ctx.fillStyle = helmetDark;
    ctx.fillRect(-12, -19, 4, 6);
    ctx.fillRect(8, -19, 4, 6);
    
    // 镜片反光（左右各一）
    ctx.fillStyle = 'rgba(79, 172, 254, 0.7)';
    // 左镜片
    ctx.beginPath();
    ctx.ellipse(-4, -20, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // 右镜片
    ctx.beginPath();
    ctx.ellipse(4, -20, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛（两只，对称）
    ctx.fillStyle = '#1a202c';
    // 左眼
    ctx.beginPath();
    ctx.arc(-5, -19, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // 右眼
    ctx.beginPath();
    ctx.arc(5, -19, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -20, 1, 0, Math.PI * 2);
    ctx.arc(6, -20, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子轮廓（侧视感）
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(3, -15);
    ctx.lineTo(2, -13);
    ctx.closePath();
    ctx.fill();
  }

  // 绘制手臂
  _drawArm(ctx, player) {
    const armColor = '#f6ad55';
    const sleeveColor = player.team === 'blue' ? '#2b6cb0' : '#e53e3e';
    const gloveColor = '#1a202c';
    // 补偿坐标系翻转：当 facingLeft 时，使用 Math.PI - aimAngle
    const renderAngle = player.facingLeft ? Math.PI - player.aimAngle : player.aimAngle;
    
    ctx.save();
    ctx.translate(10, -5);
    ctx.rotate(renderAngle);
    
    // 上臂（袖子）
    ctx.fillStyle = sleeveColor;
    ctx.fillRect(0, -5, 12, 10);
    
    // 肘部护具
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(10, -5, 4, 10);
    
    // 下臂（前臂）
    ctx.fillStyle = armColor;
    ctx.fillRect(14, -4, 14, 8);
    
    // 手套
    ctx.fillStyle = gloveColor;
    ctx.fillRect(26, -5, 6, 10);
    
    ctx.restore();
  }

  // 绘制武器
  _drawWeapon(ctx, player) {
    const weapon = player.weapon;
    if (!weapon) return;
    
    ctx.save();
    ctx.translate(10, -5);
    // 补偿坐标系翻转：当 facingLeft 时，使用 Math.PI - aimAngle
    const renderAngle = player.facingLeft ? Math.PI - player.aimAngle : player.aimAngle;
    ctx.rotate(renderAngle);
    
    const weaponConfig = weapon.config;
    const gunMetal = '#4a5568';
    const gunDark = '#2d3748';
    const gunBlack = '#1a202c';
    const gripBrown = '#5d4e37';
    
    // 根据不同枪械绘制不同外形
    switch (weaponConfig.name) {
      case 'pistol':
        this._drawPistol(ctx, gunMetal, gunDark, gunBlack, gripBrown);
        break;
        
      case 'smg':
        this._drawSMG(ctx, gunMetal, gunDark, gunBlack, gripBrown);
        break;
        
      case 'rifle':
        this._drawRifle(ctx, gunMetal, gunDark, gunBlack, gripBrown);
        break;
        
      case 'sniper':
        this._drawSniper(ctx, gunMetal, gunDark, gunBlack, gripBrown);
        break;
        
      case 'shotgun':
        this._drawShotgun(ctx, gunMetal, gunDark, gunBlack, gripBrown);
        break;
    }
    
    ctx.restore();
  }
  
  // 绘制手枪（现代战术风格 - Glock/SIG P320）
  _drawPistol(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 套筒（slide）- 现代聚合物设计
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -6, 28, 12);
    
    // 套筒前部斜角
    ctx.beginPath();
    ctx.moveTo(43, -6);
    ctx.lineTo(46, -4);
    ctx.lineTo(46, 4);
    ctx.lineTo(43, 6);
    ctx.closePath();
    ctx.fill();
    
    // 枪管（突出部分）
    ctx.fillStyle = gunDark;
    ctx.fillRect(42, -3, 6, 6);
    
    // 套筒防滑纹（后部）
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(18 + i * 4, -6);
      ctx.lineTo(18 + i * 4, 6);
      ctx.stroke();
    }
    
    // 皮卡汀尼导轨（枪管下方）
    ctx.fillStyle = gunDark;
    ctx.fillRect(22, 6, 15, 4);
    ctx.strokeStyle = gunMetal;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(24 + i * 4, 6);
      ctx.lineTo(24 + i * 4, 10);
      ctx.stroke();
    }
    
    // 握把（grip）- 聚合物材质，带纹理
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(15, 6);
    ctx.lineTo(22, 6);
    ctx.lineTo(20, 20);
    ctx.lineTo(10, 18);
    ctx.closePath();
    ctx.fill();
    
    // 握把纹理（现代格状）
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillRect(13 + j * 5, 8 + i * 2, 3, 1);
      }
    }
    
    // 扳机护圈（方形现代设计）
    ctx.strokeStyle = gunMetal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 6);
    ctx.lineTo(22, 12);
    ctx.lineTo(28, 12);
    ctx.lineTo(28, 8);
    ctx.stroke();
    
    // 扳机
    ctx.fillStyle = gunDark;
    ctx.fillRect(25, 7, 2, 4);
    
    // 击铁（后部）
    ctx.fillStyle = gunDark;
    ctx.fillRect(12, -3, 4, 6);
    
    // 红点瞄准镜（可选）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(28, -10, 8, 4);
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(30, -9, 4, 2);
  }
  
  // 绘制冲锋枪（现代战术风格 - MP5-A3 / Vector）
  _drawSMG(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（receiver）- 现代设计
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -7, 35, 14);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(50, -5, 18, 10);
    
    // 枪口装置（消焰器）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(68, -4, 6, 8);
    
    // 护木（带 M-LOK 槽）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(52, 5, 20, 10);
    // M-LOK 散热孔
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(54 + i * 4, 7, 3, 6);
    }
    
    // 弹匣（现代弧形，SMG 风格）
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.moveTo(28, 7);
    ctx.lineTo(38, 7);
    ctx.lineTo(36, 24);
    ctx.lineTo(26, 22);
    ctx.closePath();
    ctx.fill();
    // 弹匣细节（观察窗）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(29, 10, 6, 2);
    ctx.fillRect(28, 16, 6, 2);
    
    // 握把（垂直前握把）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(55, 15, 8, 14);
    // 握把纹理
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(56, 17 + i * 2, 6, 1);
    }
    
    // 主握把
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(25, 7);
    ctx.lineTo(33, 7);
    ctx.lineTo(31, 20);
    ctx.lineTo(22, 18);
    ctx.closePath();
    ctx.fill();
    // 握把纹理
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(26, 9 + i * 2, 5, 1);
    }
    
    // 伸缩枪托（现代折叠式）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-5, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(5, -2);
    ctx.closePath();
    ctx.fill();
    // 枪托垫板
    ctx.fillStyle = gunDark;
    ctx.fillRect(-8, -3, 5, 6);
    
    // 全息瞄准镜（现代）
    ctx.fillStyle = gunDark;
    ctx.fillRect(30, -12, 14, 5);
    // 镜片
    ctx.fillStyle = '#4299e1';
    ctx.fillRect(34, -10, 8, 3);
    
    // 折叠机械瞄具（前）
    ctx.fillStyle = gunDark;
    ctx.fillRect(65, -8, 3, 6);
    
    // 战术灯/激光（导轨下）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(45, 15, 8, 4);
  }
  
  // 绘制步枪（现代战术风格 - M4A1 / HK416）
  _drawRifle(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 下机匣（lower receiver）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -5, 40, 10);
    
    // 上机匣（upper receiver）
    ctx.fillRect(15, -10, 40, 10);
    
    // 枪管（中长）
    ctx.fillStyle = gunDark;
    ctx.fillRect(55, -4, 30, 8);
    
    // 枪口装置（消焰器/制退器）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(85, -5, 8, 10);
    
    // 浮置护木（M-LOK 导轨系统）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(40, 5, 35, 10);
    // M-LOK 槽
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(42 + i * 5, 7, 4, 6);
    }
    
    // 弹匣（AR-15 风格，弧形）
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.moveTo(32, 5);
    ctx.lineTo(44, 5);
    ctx.lineTo(42, 26);
    ctx.lineTo(30, 24);
    ctx.closePath();
    ctx.fill();
    // 弹匣细节（观察窗 + 纹理）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(33, 10, 8, 2);
    ctx.fillRect(32, 18, 8, 2);
    // 弹匣卡笋
    ctx.fillStyle = gunBlack;
    ctx.fillRect(38, 4, 3, 3);
    
    // 握把（AR-15 风格）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(28, 5);
    ctx.lineTo(36, 5);
    ctx.lineTo(34, 20);
    ctx.lineTo(24, 18);
    ctx.closePath();
    ctx.fill();
    // 握把纹理（格状）
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(26, 7 + i * 2, 6, 1);
    }
    
    // 伸缩枪托（现代 6 段可调）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(8, -7);
    ctx.lineTo(-18, -7);
    ctx.lineTo(-18, 7);
    ctx.lineTo(8, 7);
    ctx.quadraticCurveTo(12, 0, 8, -7);
    ctx.closePath();
    ctx.fill();
    // 枪托调节钮
    ctx.fillStyle = gunDark;
    ctx.fillRect(-5, -3, 4, 6);
    // 枪托垫板（橡胶）
    ctx.fillStyle = gunDark;
    ctx.fillRect(-20, -5, 5, 10);
    
    // 瞄准镜导轨（平顶机匣）
    ctx.fillStyle = gunDark;
    ctx.fillRect(20, -12, 30, 2);
    
    // 红点/全息瞄准镜（现代）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(35, -18, 16, 6);
    // 镜片（蓝色镀膜）
    ctx.fillStyle = '#4299e1';
    ctx.fillRect(40, -16, 10, 4);
    
    // 准星（折叠式）
    ctx.fillStyle = gunDark;
    ctx.fillRect(80, -7, 4, 6);
    
    // 垂直前握把（导轨下）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(50, 15, 10, 14);
    // 握把纹理
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(52, 17 + i * 2, 6, 1);
    }
    
    // 枪灯/激光（导轨下）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(60, 15, 10, 5);
    // 枪灯镜片
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(68, 16, 3, 3);
    
    // 弹匣释放钮
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.arc(42, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 绘制狙击枪（现代战术风格 - AWM / M24）
  _drawSniper(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（长，精密加工）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -8, 45, 16);
    
    // 枪管（超长，重型）
    ctx.fillStyle = gunDark;
    ctx.fillRect(60, -5, 55, 10);
    
    // 枪口制退器（大型）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(115, -7, 12, 14);
    // 制退器开槽
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(118 + i * 3, -5, 2, 10);
    }
    
    // 重型护木
    ctx.fillStyle = gripBrown;
    ctx.fillRect(45, 6, 40, 12);
    // 防滑纹
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(48 + i * 4, 8, 3, 8);
    }
    
    // 弹匣（AW 风格，单排）
    ctx.fillStyle = gunDark;
    ctx.fillRect(35, 8, 10, 18);
    // 弹匣细节
    ctx.fillStyle = gunMetal;
    ctx.fillRect(37, 12, 6, 2);
    ctx.fillRect(37, 20, 6, 2);
    
    // 握把（精密射击风格）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(30, 8);
    ctx.lineTo(40, 8);
    ctx.lineTo(38, 22);
    ctx.lineTo(26, 20);
    ctx.closePath();
    ctx.fill();
    // 握把纹理（精细格状）
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(31, 10 + i * 2, 6, 1);
    }
    
    // 战术枪托（可调式，带托腮板）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(-25, -6);
    ctx.lineTo(-25, 10);
    ctx.lineTo(10, 10);
    ctx.quadraticCurveTo(15, 2, 10, -6);
    ctx.closePath();
    ctx.fill();
    // 可调托腮板
    ctx.fillStyle = gunDark;
    ctx.fillRect(-28, -4, 8, 8);
    // 枪托调节钮
    ctx.fillStyle = gunMetal;
    ctx.fillRect(-15, 0, 4, 4);
    // 橡胶垫板
    ctx.fillStyle = gunDark;
    ctx.fillRect(-30, -3, 4, 6);
    
    // 细长高倍瞄准镜（重点：不再是"大盘鸡"！）
    // 镜筒主体（细长型）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.roundRect(25, -18, 55, 8, 2);
    ctx.fill();
    
    // 物镜（前端，较大）
    ctx.fillStyle = gunDark;
    ctx.fillRect(72, -20, 8, 12);
    // 镜片（蓝色镀膜）
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(74, -18, 4, 8);
    
    // 目镜（后端）
    ctx.fillStyle = gunDark;
    ctx.fillRect(22, -19, 6, 10);
    
    // 调节旋钮（两个）
    ctx.fillStyle = gunDark;
    // 风调（上方）
    ctx.fillRect(45, -24, 10, 6);
    // 高低调（侧面）
    ctx.fillRect(50, -18, 6, 4);
    // 旋钮纹理
    ctx.strokeStyle = gunMetal;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(47 + i * 1.5, -24);
      ctx.lineTo(47 + i * 1.5, -18);
      ctx.stroke();
    }
    
    // 两脚架（折叠式）
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // 左腿
    ctx.moveTo(55, 18);
    ctx.lineTo(48, 32);
    ctx.lineTo(48, 36);
    // 右腿
    ctx.moveTo(65, 18);
    ctx.lineTo(72, 32);
    ctx.lineTo(72, 36);
    // 连接杆
    ctx.moveTo(50, 34);
    ctx.lineTo(70, 34);
    ctx.stroke();
    // 脚架底座
    ctx.fillStyle = gunDark;
    ctx.fillRect(52, 18, 16, 4);
    
    // 消音器（可选，现代战术风格）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(125, -6, 15, 12);
    // 消音器开槽
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(128 + i * 3, -6);
      ctx.lineTo(128 + i * 3, 6);
      ctx.stroke();
    }
  }
  
  // 绘制霰弹枪（现代战术风格 - Benelli M4 / AA-12）
  _drawShotgun(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（大型，半自动）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -9, 35, 18);
    
    // 枪管（粗，短）
    ctx.fillStyle = gunDark;
    ctx.fillRect(50, -7, 25, 14);
    
    // 枪口装置（喉缩/制退器）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(75, -8, 8, 16);
    
    // 管状弹仓（枪管下方）
    ctx.fillStyle = gunDark;
    ctx.fillRect(52, 6, 22, 6);
    // 弹仓细节（观察孔）
    ctx.fillStyle = gunMetal;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(56 + i * 5, 9, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 泵动式护木（战术风格，短）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(55, 12, 18, 10);
    // 防滑纹（纵向）
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(58 + i * 3, 12);
      ctx.lineTo(58 + i * 3, 22);
      ctx.stroke();
    }
    
    // 战术握把（手枪式）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(22, 9);
    ctx.lineTo(32, 9);
    ctx.lineTo(30, 24);
    ctx.lineTo(18, 22);
    ctx.closePath();
    ctx.fill();
    
    // 握把纹理（格状）
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(20, 11 + i * 2, 10, 1);
    }
    
    // 握把背部（弧形）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.arc(20, 18, 8, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    
    // 伸缩枪托（战术折叠式）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-12, 8);
    ctx.lineTo(8, 8);
    ctx.quadraticCurveTo(12, 1, 8, -6);
    ctx.closePath();
    ctx.fill();
    // 枪托缓冲垫
    ctx.fillStyle = gunDark;
    ctx.fillRect(-14, -4, 5, 8);
    // 枪托调节钮
    ctx.fillStyle = gunMetal;
    ctx.fillRect(-5, 0, 4, 4);
    
    // 顶部导轨
    ctx.fillStyle = gunDark;
    ctx.fillRect(18, -12, 25, 3);
    
    // 红点瞄准镜（战术）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(28, -17, 12, 5);
    // 镜片
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(31, -15, 8, 3);
    
    // 准星（折叠式，前部）
    ctx.fillStyle = gunDark;
    ctx.fillRect(72, -10, 4, 8);
    
    // 战术灯/激光（导轨下）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(40, 18, 10, 5);
    // 激光发射口
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(48, 19, 3, 3);
    
    // 弹匣释放钮
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.arc(38, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 枪背带环
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.lineTo(-10, 12);
    ctx.stroke();
  }

  // 绘制血条
  _drawHealthBar(ctx, player) {
    const barWidth = 40;
    const barHeight = 5;
    const healthPercent = player.health / player.maxHealth;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-barWidth / 2, -45, barWidth, barHeight);
    
    const healthColor = healthPercent > 0.5 ? '#48bb78' : 
                        healthPercent > 0.25 ? '#f6ad55' : '#f56565';
    ctx.fillStyle = healthColor;
    ctx.fillRect(-barWidth / 2, -45, barWidth * healthPercent, barHeight);
  }


  // 绘制控制箭头
  _drawControlArrow(player) {
    const ctx = this.ctx;
    const arrowX = player.x + player.width / 2;
    const arrowY = player.y - 25;
    const arrowSize = 15;
    
    ctx.save();
    ctx.translate(arrowX, arrowY);
    
    // 箭头脉冲动画
    const pulse = Math.sin(Date.now() / 200) * 3;
    
    // 箭头主体
    ctx.fillStyle = '#4facfe';
    ctx.shadowColor = '#4facfe';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize + pulse);
    ctx.lineTo(-arrowSize / 2, arrowSize + pulse);
    ctx.lineTo(0, arrowSize / 2 + pulse);
    ctx.lineTo(arrowSize / 2, arrowSize + pulse);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  // 绘制子弹
  drawBullet(bullet, camera) {
    if (!bullet.active || !camera.isCircleInView(bullet, 50)) return;
    
    const ctx = this.ctx;
    
    // 绘制轨迹
    for (const point of bullet.trail) {
      ctx.fillStyle = `rgba(255, 200, 50, ${point.alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle);
    
    // 子弹主体
    ctx.fillStyle = '#f6e05e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加发光效果
    ctx.shadowColor = '#f6e05e';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.restore();
  }

  // 绘制粒子
  drawParticle(particle, camera) {
    if (!camera.isCircleInView(particle, 20)) return;
    
    const ctx = this.ctx;
    
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 绘制枪口火焰
  drawMuzzleFlash(x, y, angle, camera) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    
    // 火焰
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 200, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(15, 0, 25, 15, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  // 绘制命中效果
  drawHitEffect(x, y, camera) {
    this.ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 10, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // 开始批量渲染
  beginBatch() {
    // 可以添加批量渲染优化
  }

  // 结束批量渲染
  endBatch() {
    // 可以添加批量渲染优化
  }
}

window.Renderer = Renderer;
