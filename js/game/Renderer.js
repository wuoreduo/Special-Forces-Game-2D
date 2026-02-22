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
    const helmetColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const helmetDark = player.team === 'blue' ? '#1a365d' : '#742a2a';
    
    // 面部（圆形）
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, -20, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 下巴轮廓（侧视效果）
    ctx.fillStyle = '#d69e5a';
    ctx.beginPath();
    ctx.arc(3, -17, 5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    
    // 头盔主体（覆盖头顶）
    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(0, -22, 14, Math.PI, 0);
    ctx.lineTo(12, -20);
    ctx.lineTo(-12, -20);
    ctx.closePath();
    ctx.fill();
    
    // 头盔后部（突出）
    ctx.fillStyle = helmetDark;
    ctx.beginPath();
    ctx.arc(-2, -23, 13, Math.PI * 0.6, Math.PI * 1.4);
    ctx.lineTo(-8, -20);
    ctx.closePath();
    ctx.fill();
    
    // 护目镜/面罩
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.ellipse(3, -21, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 镜片反光
    ctx.fillStyle = 'rgba(79, 172, 254, 0.6)';
    ctx.beginPath();
    ctx.ellipse(4, -21, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛（侧视，在护目镜下）
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.arc(5, -20, 2, 0, Math.PI * 2);
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
  
  // 绘制手枪
  _drawPistol(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 套筒（slide）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -5, 22, 10);
    // 套筒前部斜角
    ctx.beginPath();
    ctx.moveTo(37, -5);
    ctx.lineTo(40, -3);
    ctx.lineTo(40, 3);
    ctx.lineTo(37, 5);
    ctx.closePath();
    ctx.fill();
    
    // 枪管（突出部分）
    ctx.fillStyle = gunDark;
    ctx.fillRect(35, -3, 8, 6);
    
    // 套筒防滑纹
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(20 + i * 3, -5);
      ctx.lineTo(20 + i * 3, 5);
      ctx.stroke();
    }
    
    // 握把（grip）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(15, 3);
    ctx.lineTo(20, 3);
    ctx.lineTo(18, 16);
    ctx.lineTo(10, 14);
    ctx.closePath();
    ctx.fill();
    
    // 握把纹理
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(12, 5 + i * 2, 6, 1);
    }
    
    // 扳机护圈
    ctx.strokeStyle = gunMetal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(18, 5, 4, 0, Math.PI, false);
    ctx.stroke();
    
    // 击锤
    ctx.fillStyle = gunDark;
    ctx.fillRect(12, -4, 4, 6);
  }
  
  // 绘制冲锋枪
  _drawSMG(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（receiver）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -6, 30, 12);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(45, -4, 15, 8);
    
    // 护木/前握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(48, 4, 12, 10);
    
    // 弹匣（前置，弯曲）
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.moveTo(25, 6);
    ctx.lineTo(33, 6);
    ctx.lineTo(30, 22);
    ctx.lineTo(22, 20);
    ctx.closePath();
    ctx.fill();
    // 弹匣细节
    ctx.strokeStyle = gunMetal;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, 10);
    ctx.lineTo(32, 10);
    ctx.moveTo(24, 14);
    ctx.lineTo(31, 14);
    ctx.moveTo(23, 18);
    ctx.lineTo(30, 18);
    ctx.stroke();
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(22, 6, 8, 12);
    // 握把纹理
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(23, 7 + i * 2, 6, 1);
    }
    
    // 枪托（折叠式）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(10, -3);
    ctx.lineTo(0, -3);
    ctx.lineTo(5, 0);
    ctx.lineTo(10, 0);
    ctx.closePath();
    ctx.fill();
    
    // 瞄准器（红点）
    ctx.fillStyle = gunDark;
    ctx.fillRect(30, -10, 8, 4);
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(32, -9, 4, 2);
  }
  
  // 绘制步枪
  _drawRifle(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -7, 35, 14);
    
    // 枪管（长）
    ctx.fillStyle = gunDark;
    ctx.fillRect(50, -5, 25, 10);
    
    // 护木（handguard）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(35, 5, 25, 10);
    // 护木散热孔
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(38 + i * 4, 7, 3, 6);
    }
    
    // 弹匣
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.moveTo(30, 7);
    ctx.lineTo(40, 7);
    ctx.lineTo(38, 24);
    ctx.lineTo(32, 24);
    ctx.closePath();
    ctx.fill();
    // 弹匣细节
    ctx.strokeStyle = gunMetal;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(31, 12);
    ctx.lineTo(39, 12);
    ctx.moveTo(32, 17);
    ctx.lineTo(40, 17);
    ctx.stroke();
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(25, 7);
    ctx.lineTo(32, 7);
    ctx.lineTo(30, 20);
    ctx.lineTo(22, 18);
    ctx.closePath();
    ctx.fill();
    
    // 枪托（固定式）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(5, -5);
    ctx.lineTo(-15, -5);
    ctx.lineTo(-15, 5);
    ctx.lineTo(5, 5);
    ctx.quadraticCurveTo(10, 0, 5, -5);
    ctx.closePath();
    ctx.fill();
    // 枪托垫板
    ctx.fillStyle = gunDark;
    ctx.fillRect(-18, -3, 5, 6);
    
    // 瞄准器（红点/全息）
    ctx.fillStyle = gunDark;
    ctx.fillRect(35, -12, 12, 5);
    ctx.fillStyle = '#4299e1';
    ctx.fillRect(38, -10, 6, 3);
    
    // 准星
    ctx.fillStyle = gunDark;
    ctx.fillRect(70, -8, 3, 6);
  }
  
  // 绘制狙击枪
  _drawSniper(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（长）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -6, 40, 12);
    
    // 枪管（超长）
    ctx.fillStyle = gunDark;
    ctx.fillRect(55, -4, 50, 8);
    
    // 枪管散热槽
    ctx.fillStyle = gunMetal;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(60 + i * 5, -4, 2, 8);
    }
    
    // 两脚架
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 6);
    ctx.lineTo(45, 18);
    ctx.moveTo(55, 6);
    ctx.lineTo(60, 18);
    ctx.stroke();
    
    // 弹匣
    ctx.fillStyle = gunDark;
    ctx.fillRect(35, 6, 8, 14);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(30, 6);
    ctx.lineTo(38, 6);
    ctx.lineTo(36, 18);
    ctx.lineTo(27, 16);
    ctx.closePath();
    ctx.fill();
    
    // 枪托（带托腮板）
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.lineTo(-20, -4);
    ctx.lineTo(-20, 6);
    ctx.lineTo(10, 6);
    ctx.quadraticCurveTo(15, 1, 10, -4);
    ctx.closePath();
    ctx.fill();
    // 托腮板
    ctx.fillStyle = gunDark;
    ctx.fillRect(-22, -2, 5, 4);
    // 枪托垫板
    ctx.fillStyle = gunDark;
    ctx.fillRect(-25, -1, 5, 2);
    
    // 大型瞄准镜
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.ellipse(45, -12, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // 镜筒
    ctx.fillRect(25, -16, 40, 8);
    // 调节旋钮
    ctx.fillStyle = gunDark;
    ctx.fillRect(40, -20, 8, 4);
    ctx.fillRect(50, -20, 6, 4);
    // 镜片（前后）
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(18, -14, 4, 8);
    ctx.fillRect(68, -10, 4, 6);
  }
  
  // 绘制霰弹枪
  _drawShotgun(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -8, 30, 16);
    
    // 枪管（粗）
    ctx.fillStyle = gunDark;
    ctx.fillRect(45, -6, 25, 12);
    
    // 泵动式护木（pump forend）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(50, 6, 20, 10);
    // 泵动式防滑纹
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(52 + i * 4, 6);
      ctx.lineTo(52 + i * 4, 16);
      ctx.stroke();
    }
    
    // 管状弹仓（枪管下方）
    ctx.fillStyle = gunDark;
    ctx.fillRect(48, -3, 20, 4);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(20, 8);
    ctx.lineTo(28, 8);
    ctx.lineTo(26, 20);
    ctx.lineTo(16, 18);
    ctx.closePath();
    ctx.fill();
    
    // 握把纹理
    ctx.fillStyle = gunDark;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(18, 10 + i * 2, 8, 1);
    }
    
    // 枪托
    ctx.fillStyle = gunBlack;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(-15, -6);
    ctx.lineTo(-15, 8);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(15, 1, 10, -6);
    ctx.closePath();
    ctx.fill();
    // 枪托装饰纹
    ctx.strokeStyle = gripBrown;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-5, 0, 8, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    
    // 准星
    ctx.fillStyle = gunDark;
    ctx.fillRect(68, -9, 3, 6);
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
