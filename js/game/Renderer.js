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
    const anim = player.animationState;
    
    // 蹲下
    if (player.crouching) {
      ctx.scale(1, 0.7);
      ctx.translate(0, player.height * 0.15);
    }
    
    // 跳跃
    if (!player.onGround) {
      ctx.rotate(Utils.degToRad(-5));
    }
  }

  // 绘制腿部
  _drawLegs(ctx, player) {
    const legOffset = Math.sin(player.walkAnim) * 10;
    const legColor = '#2d3748';
    
    ctx.fillStyle = legColor;
    
    // 左腿
    ctx.save();
    ctx.translate(-8, 15);
    ctx.rotate(Utils.degToRad(player.onGround ? legOffset : -10));
    ctx.fillRect(-5, 0, 10, 18);
    ctx.restore();
    
    // 右腿
    ctx.save();
    ctx.translate(8, 15);
    ctx.rotate(Utils.degToRad(player.onGround ? -legOffset : 10));
    ctx.fillRect(-5, 0, 10, 18);
    ctx.restore();
  }

  // 绘制身体
  _drawBody(ctx, player) {
    const bodyColor = player.team === 'blue' ? '#4299e1' : '#f56565';
    const darken = player.team === 'blue' ? '#3182ce' : '#e53e3e';
    
    // 身体主体
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-15, -10, 30, 30, 5);
    ctx.fill();
    
    // 战术背心
    ctx.fillStyle = darken;
    ctx.fillRect(-12, -5, 24, 20);
    
    // 队伍标识
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.team === 'blue' ? 'B' : 'R', 0, 10);
  }

  // 绘制头部
  _drawHead(ctx, player) {
    const headColor = '#f6ad55';
    
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(0, -20, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 头盔
    ctx.fillStyle = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    ctx.beginPath();
    ctx.arc(0, -22, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.arc(4, -20, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 绘制手臂
  _drawArm(ctx, player) {
    const armColor = '#f6ad55';
    // 补偿坐标系翻转：当 facingLeft 时，使用 Math.PI - aimAngle
    const renderAngle = player.facingLeft ? Math.PI - player.aimAngle : player.aimAngle;
    
    ctx.save();
    ctx.translate(10, -5);
    ctx.rotate(renderAngle);
    
    ctx.fillStyle = armColor;
    ctx.fillRect(0, -4, 20, 8);
    
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
    const gunColor = '#4a5568';
    const gripColor = '#2d3748';
    
    ctx.fillStyle = gunColor;
    
    // 根据不同枪械绘制不同外形
    switch (weaponConfig.name) {
      case 'pistol':
        ctx.fillRect(15, -4, 18, 8);
        ctx.fillStyle = gripColor;
        ctx.fillRect(12, 2, 8, 10);
        break;
        
      case 'smg':
        ctx.fillRect(15, -5, 25, 10);
        ctx.fillStyle = gripColor;
        ctx.fillRect(18, 3, 10, 12);
        // 弹匣
        ctx.fillStyle = gunColor;
        ctx.fillRect(20, 8, 6, 10);
        break;
        
      case 'rifle':
        ctx.fillRect(15, -6, 40, 10);
        ctx.fillStyle = gripColor;
        ctx.fillRect(25, 2, 12, 14);
        // 瞄准器
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(35, -10, 8, 4);
        break;
        
      case 'sniper':
        ctx.fillRect(15, -5, 60, 8);
        ctx.fillStyle = gripColor;
        ctx.fillRect(30, 2, 10, 12);
        // 瞄准镜
        ctx.fillStyle = '#1a202c';
        ctx.beginPath();
        ctx.ellipse(45, -8, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'shotgun':
        ctx.fillRect(15, -7, 35, 12);
        ctx.fillStyle = gripColor;
        ctx.fillRect(20, 4, 12, 14);
        // 泵动式
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(30, -3, 15, 6);
        break;
    }
    
    ctx.restore();
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
