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

  // 绘制腿部（简化版）
  _drawLegs(ctx, player) {
    const legOffset = Math.sin(player.walkAnim) * 8;
    const thighColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const shinColor = player.team === 'blue' ? '#1a365d' : '#742a2a';
    const bootColor = '#1a202c';
    
    // 左腿
    ctx.save();
    ctx.translate(-10, 20);
    const leftLegAngle = player.onGround ? legOffset : -8;
    ctx.rotate(Utils.degToRad(leftLegAngle));
    
    // 大腿
    ctx.fillStyle = thighColor;
    ctx.fillRect(-5, 0, 10, 18);
    // 膝盖
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-5, 16, 10, 4);
    // 小腿
    ctx.fillStyle = shinColor;
    ctx.fillRect(-4, 20, 8, 16);
    // 军靴
    ctx.fillStyle = bootColor;
    ctx.fillRect(-5, 34, 10, 6);
    
    ctx.restore();
    
    // 右腿
    ctx.save();
    ctx.translate(10, 20);
    const rightLegAngle = player.onGround ? -legOffset : 8;
    ctx.rotate(Utils.degToRad(rightLegAngle));
    
    // 大腿
    ctx.fillStyle = thighColor;
    ctx.fillRect(-5, 0, 10, 18);
    // 膝盖
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-5, 16, 10, 4);
    // 小腿
    ctx.fillStyle = shinColor;
    ctx.fillRect(-4, 20, 8, 16);
    // 军靴
    ctx.fillStyle = bootColor;
    ctx.fillRect(-5, 34, 10, 6);
    
    ctx.restore();
  }

  // 绘制身体（简化版）
  _drawBody(ctx, player) {
    const bodyColor = player.team === 'blue' ? '#4299e1' : '#f56565';
    const vestColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const shoulderColor = player.team === 'blue' ? '#2b6cb0' : '#e53e3e';
    
    // 躯干主体（简化：圆角矩形）
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-16, -18, 32, 42, 5);
    ctx.fill();
    
    // 肩膀（简化：两个圆形）
    ctx.fillStyle = shoulderColor;
    ctx.beginPath();
    ctx.arc(-18, -15, 8, 0, Math.PI * 2);
    ctx.arc(18, -15, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 战术背心（简化：纯色块）
    ctx.fillStyle = vestColor;
    ctx.fillRect(-12, -10, 24, 26);
    
    // 队伍标识（简化：圆形徽章）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.team === 'blue' ? '#4299e1' : '#f56565';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.team === 'blue' ? 'B' : 'R', 0, 2);
    
    // 腰带（简化）
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-14, 20, 28, 5);
  }

  // 绘制头部（简化版）
  _drawHead(ctx, player) {
    const skinColor = '#f6ad55';
    const helmetColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const helmetDark = player.team === 'blue' ? '#1a365d' : '#742a2a';
    
    // 脸型（简化：椭圆形）
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(0, -20, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 头盔（简化：圆顶 military helmet）
    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(0, -23, 14, Math.PI * 0.1, Math.PI * 0.9);
    ctx.lineTo(-13, -15);
    ctx.lineTo(-14, -8);
    ctx.lineTo(14, -8);
    ctx.lineTo(13, -15);
    ctx.closePath();
    ctx.fill();
    
    // 头盔顶部细节
    ctx.fillStyle = helmetDark;
    ctx.beginPath();
    ctx.arc(0, -24, 11, Math.PI * 0.2, Math.PI * 0.8);
    ctx.fill();
    
    // 护目镜（简化：横贯矩形）
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.roundRect(-10, -23, 20, 6, 2);
    ctx.fill();
    
    // 镜片反光（简化：两个小矩形）
    ctx.fillStyle = 'rgba(79, 172, 254, 0.6)';
    ctx.fillRect(-6, -21, 4, 3);
    ctx.fillRect(3, -21, 4, 3);
  }

  // 绘制手臂（简化版）
  _drawArm(ctx, player) {
    const sleeveColor = player.team === 'blue' ? '#2b6cb0' : '#e53e3e';
    const gloveColor = '#1a202c';
    const renderAngle = player.facingLeft ? Math.PI - player.aimAngle : player.aimAngle;
    
    ctx.save();
    ctx.translate(12, -8);
    ctx.rotate(renderAngle);
    
    // 上臂（简化：矩形）
    ctx.fillStyle = sleeveColor;
    ctx.fillRect(0, -5, 14, 10);
    
    // 前臂（简化：矩形）
    ctx.fillStyle = '#f6ad55';
    ctx.fillRect(14, -4, 12, 8);
    
    // 手套（简化：矩形）
    ctx.fillStyle = gloveColor;
    ctx.fillRect(24, -5, 8, 10);
    
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
  
  // 绘制手枪（简化版）
  _drawPistol(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 套筒（简化：矩形）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -6, 28, 12);
    
    // 握把（简化：梯形）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(18, 6);
    ctx.lineTo(25, 6);
    ctx.lineTo(23, 20);
    ctx.lineTo(15, 18);
    ctx.closePath();
    ctx.fill();
    
    // 枪管（简化：小矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(40, -4, 8, 8);
    
    // 扳机护圈（简化：L 形）
    ctx.strokeStyle = gunMetal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 6);
    ctx.lineTo(25, 11);
    ctx.lineTo(29, 11);
    ctx.stroke();
  }
  
  // 绘制冲锋枪（简化版）
  _drawSMG(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（简化：矩形）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(15, -7, 38, 14);
    
    // 枪管（简化：矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(53, -5, 18, 10);
    
    // 弹匣（简化：矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(28, 7, 12, 16);
    
    // 握把（简化：矩形）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(25, 7, 10, 14);
    
    // 枪托（简化：矩形）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(5, -4, 12, 8);
    
    // 护木（简化）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(55, 5, 16, 8);
  }
  
  // 绘制步枪（简化版）
  _drawRifle(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（简化：矩形）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(10, -8, 42, 16);
    
    // 枪管（简化：长矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(52, -5, 38, 10);
    
    // 护木（简化：矩形）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(52, 5, 28, 10);
    
    // 弹匣（简化：弧形矩形）
    ctx.fillStyle = gunDark;
    ctx.beginPath();
    ctx.moveTo(25, 8);
    ctx.lineTo(35, 8);
    ctx.quadraticCurveTo(39, 12, 40, 22);
    ctx.lineTo(27, 22);
    ctx.closePath();
    ctx.fill();
    
    // 握把（简化：梯形）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(22, 8);
    ctx.lineTo(30, 8);
    ctx.lineTo(28, 24);
    ctx.lineTo(19, 22);
    ctx.closePath();
    ctx.fill();
    
    // 枪托（简化：矩形）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(-8, -6, 20, 12);
  }

  // 绘制狙击枪（简化版）
  _drawSniper(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（简化：长矩形）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(10, -8, 48, 16);
    
    // 枪管（简化：超长矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(58, -5, 65, 10);
    
    // 瞄准镜（简化：细长矩形）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(20, -18, 45, 8);
    
    // 弹匣（简化：小矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(30, 8, 10, 14);
    
    // 握把（简化：梯形）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(25, 8);
    ctx.lineTo(35, 8);
    ctx.lineTo(33, 22);
    ctx.lineTo(22, 20);
    ctx.closePath();
    ctx.fill();
    
    // 枪托（简化：长矩形）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(-20, -6, 32, 12);
    
    // 两脚架（简化：两条线）
    ctx.strokeStyle = gunDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(45, 8);
    ctx.lineTo(40, 22);
    ctx.moveTo(55, 8);
    ctx.lineTo(60, 22);
    ctx.stroke();
  }
  
  // 绘制霰弹枪（简化版）
  _drawShotgun(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣（简化：大矩形）
    ctx.fillStyle = gunMetal;
    ctx.fillRect(10, -9, 32, 18);
    
    // 枪管（简化：粗矩形）
    ctx.fillStyle = gunDark;
    ctx.fillRect(42, -7, 28, 14);
    
    // 护木（简化：矩形）
    ctx.fillStyle = gripBrown;
    ctx.fillRect(45, 7, 20, 10);
    
    // 握把（简化：梯形）
    ctx.fillStyle = gripBrown;
    ctx.beginPath();
    ctx.moveTo(20, 9);
    ctx.lineTo(30, 9);
    ctx.lineTo(28, 23);
    ctx.lineTo(17, 21);
    ctx.closePath();
    ctx.fill();
    
    // 枪托（简化：矩形）
    ctx.fillStyle = gunBlack;
    ctx.fillRect(-10, -6, 22, 12);
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
