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

  // 绘制腿部（短腿版）
  _drawLegs(ctx, player) {
    const legColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const bootColor = '#1a202c';
    const legOffset = Math.sin(player.walkAnim) * 5;
    
    // 左腿
    ctx.save();
    ctx.translate(-6, 22);
    ctx.rotate(Utils.degToRad(player.onGround ? legOffset : -5));
    ctx.fillStyle = legColor;
    ctx.fillRect(-4, 0, 8, 12);
    ctx.fillStyle = bootColor;
    ctx.fillRect(-5, 10, 10, 5);
    ctx.restore();
    
    // 右腿
    ctx.save();
    ctx.translate(6, 22);
    ctx.rotate(Utils.degToRad(player.onGround ? -legOffset : 5));
    ctx.fillStyle = legColor;
    ctx.fillRect(-4, 0, 8, 12);
    ctx.fillStyle = bootColor;
    ctx.fillRect(-5, 10, 10, 5);
    ctx.restore();
  }

  // 绘制身体（圆角矩形版）
  _drawBody(ctx, player) {
    const bodyColor = player.team === 'blue' ? '#4299e1' : '#f56565';
    const vestColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    
    // 躯干主体（圆角矩形）
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-13, -18, 26, 40, 7);
    ctx.fill();
    
    // 战术背心（圆角矩形）
    ctx.fillStyle = vestColor;
    ctx.beginPath();
    ctx.roundRect(-9, -10, 18, 24, 4);
    ctx.fill();
    
    // 队伍标识
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyColor;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.team === 'blue' ? 'B' : 'R', 0, 6);
    
    // 腰带
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-11, 20, 22, 4);
  }

  // 绘制头部（大头版）
  _drawHead(ctx, player) {
    const skinColor = '#f6ad55';
    const helmetColor = player.team === 'blue' ? '#2c5282' : '#9b2c2c';
    const helmetDark = player.team === 'blue' ? '#1a365d' : '#742a2a';
    
    // 1. 先画完整的脸部（黄种人肤色，圆形大头）
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, -14, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // 2. 头盔主体（圆顶覆盖头顶）
    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(0, -18, 17, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    
    // 3. 头盔侧边延伸（遮住耳朵，与头盔连接）
    ctx.fillStyle = helmetColor;
    // 左耳侧边
    ctx.beginPath();
    ctx.roundRect(-18, -21, 6, 12, 2);
    ctx.fill();
    // 右耳侧边
    ctx.beginPath();
    ctx.roundRect(12, -21, 6, 12, 2);
    ctx.fill();
    
    // 4. 头盔边缘描边
    ctx.strokeStyle = helmetDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -18, 17, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    
    // 5. 护目镜（两个方形镜片+中间连接）
    ctx.fillStyle = '#1a202c';
    // 左镜片
    ctx.beginPath();
    ctx.roundRect(-11, -18, 8, 5, 1);
    ctx.fill();
    // 右镜片
    ctx.beginPath();
    ctx.roundRect(3, -18, 8, 5, 1);
    ctx.fill();
    // 中间连接横杠
    ctx.beginPath();
    ctx.roundRect(-3, -17, 6, 3, 1);
    ctx.fill();
    // 镜片反光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(-10, -17, 3, 1);
    ctx.fillRect(4, -17, 3, 1);
  }

  // 绘制手臂（简化版）
  _drawArm(ctx, player) {
    const sleeveColor = player.team === 'blue' ? '#2b6cb0' : '#e53e3e';
    const gloveColor = '#1a202c';
    const renderAngle = player.facingLeft ? Math.PI - player.aimAngle : player.aimAngle;
    
    ctx.save();
    ctx.translate(10, -8);
    ctx.rotate(renderAngle);
    
    // 上臂
    ctx.fillStyle = sleeveColor;
    ctx.fillRect(0, -4, 12, 8);
    
    // 前臂
    ctx.fillStyle = '#f6ad55';
    ctx.fillRect(12, -3, 10, 6);
    
    // 手套
    ctx.fillStyle = gloveColor;
    ctx.fillRect(20, -4, 6, 8);
    
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
  
  // 绘制手枪（极简版）
  _drawPistol(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 套筒
    ctx.fillStyle = gunMetal;
    ctx.fillRect(8, -4, 18, 8);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(10, 4, 6, 10);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(24, -3, 5, 6);
  }
  
  // 绘制冲锋枪（极简版）
  _drawSMG(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣
    ctx.fillStyle = gunMetal;
    ctx.fillRect(8, -5, 22, 10);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(30, -4, 12, 8);
    
    // 弹匣
    ctx.fillStyle = gunDark;
    ctx.fillRect(16, 5, 7, 10);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(14, 5, 5, 9);
    
    // 枪托
    ctx.fillStyle = gunBlack;
    ctx.fillRect(2, -3, 7, 6);
  }
  
  // 绘制步枪（极简版）
  _drawRifle(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣
    ctx.fillStyle = gunMetal;
    ctx.fillRect(6, -5, 24, 10);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(30, -4, 22, 8);
    
    // 护木
    ctx.fillStyle = gripBrown;
    ctx.fillRect(30, 4, 16, 6);
    
    // 弹匣
    ctx.fillStyle = gunDark;
    ctx.fillRect(14, 5, 8, 10);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(12, 5, 5, 9);
    
    // 枪托
    ctx.fillStyle = gunBlack;
    ctx.fillRect(-4, -4, 11, 8);
  }

  // 绘制狙击枪（极简版）
  _drawSniper(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣
    ctx.fillStyle = gunMetal;
    ctx.fillRect(6, -5, 26, 10);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(32, -3, 35, 6);
    
    // 瞄准镜
    ctx.fillStyle = gunBlack;
    ctx.fillRect(12, -10, 24, 5);
    
    // 弹匣
    ctx.fillStyle = gunDark;
    ctx.fillRect(16, 5, 6, 8);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(14, 5, 5, 9);
    
    // 枪托
    ctx.fillStyle = gunBlack;
    ctx.fillRect(-10, -4, 17, 8);
  }
  
  // 绘制霰弹枪（极简版）
  _drawShotgun(ctx, gunMetal, gunDark, gunBlack, gripBrown) {
    // 机匣
    ctx.fillStyle = gunMetal;
    ctx.fillRect(6, -6, 18, 12);
    
    // 枪管
    ctx.fillStyle = gunDark;
    ctx.fillRect(24, -5, 16, 10);
    
    // 护木
    ctx.fillStyle = gripBrown;
    ctx.fillRect(26, 5, 10, 5);
    
    // 握把
    ctx.fillStyle = gripBrown;
    ctx.fillRect(12, 6, 5, 9);
    
    // 枪托
    ctx.fillStyle = gunBlack;
    ctx.fillRect(-6, -5, 13, 10);
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
    const arrowY = player.y - 45;  // 向上移动，浮在头盔上方
    const arrowSize = 12;  // 缩小一点
    
    ctx.save();
    ctx.translate(arrowX, arrowY);
    
    // 箭头脉冲动画
    const pulse = Math.sin(Date.now() / 200) * 2;
    
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

  // 绘制击杀信息
  drawKillFeed(killFeed) {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const startY = this.height - 150;
    
    ctx.save();
    
    for (let i = 0; i < killFeed.length; i++) {
      const entry = killFeed[i];
      const y = startY - i * 30;
      
      ctx.globalAlpha = entry.alpha;
      
      const killerColor = entry.killerTeam === 'blue' ? '#4299e1' : '#f56565';
      const victimColor = entry.victimTeam === 'blue' ? '#4299e1' : '#f56565';
      
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      
      const text = `${entry.killerName} 击杀 ${entry.victimName}`;
      const metrics = ctx.measureText(text);
      const padding = 10;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(centerX - metrics.width / 2 - padding, y - 12, metrics.width + padding * 2, 24);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, centerX, y + 4);
      
      ctx.fillStyle = killerColor;
      ctx.fillText(entry.killerName, centerX - ctx.measureText(` 击杀 ${entry.victimName}`).width / 2, y + 4);
      
      ctx.fillStyle = victimColor;
      ctx.fillText(entry.victimName, centerX + ctx.measureText(`${entry.killerName} 击杀 `).width / 2, y + 4);
    }
    
    ctx.restore();
  }
}

window.Renderer = Renderer;
