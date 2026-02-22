// 武器基类

class Weapon {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.damage = config.damage;
    this.fireRate = config.fireRate;
    this.fireDelay = 1000 / config.fireRate;
    this.magazineSize = config.magazineSize;
    this.reloadTime = config.reloadTime;
    this.bulletSpeed = config.bulletSpeed;
    this.maxRange = config.maxRange;
    this.spread = config.spread;
    this.bulletCount = config.bulletCount || 1;
    
    // 弹道偏移（后坐力散布）
    this.spreadIncrease = config.spreadIncrease || 0.5;
    this.maxSpreadMultiplier = 3;
    this.consecutiveShots = 0;
    this.lastShotTime = 0;
    this.spreadResetDelay = 1500;
    
    this.ammo = config.magazineSize;
    this.owner = null;
  }
  
  // 获取当前散布（连续射击时增加）
  getCurrentSpread() {
    const spreadMultiplier = 1 + this.consecutiveShots * this.spreadIncrease;
    return this.spread * Math.min(spreadMultiplier, this.maxSpreadMultiplier);
  }
  
  // 重置散布
  resetSpread() {
    this.consecutiveShots = 0;
  }
  
  // 更新散布状态
  updateSpread(gameTime) {
    if (gameTime - this.lastShotTime > this.spreadResetDelay) {
      this.resetSpread();
    }
  }

  // 开火
  fire(owner, platforms = null) {
    if (this.ammo <= 0) return [];
    
    const bullets = [];
    const centerX = owner.x + owner.width / 2;
    const centerY = owner.y + owner.height / 2 - 5;
    const armLength = 20;
    const gunLength = 35;
    const totalLength = armLength + gunLength;
    
    const falloffRate = this.config.damageFalloff || 0;
    const isSniper = this.config.name === 'sniper';
    const tracerAlpha = isSniper ? 1.0 : 0.4;
    
    const currentSpread = this.getCurrentSpread();
    
    for (let i = 0; i < this.bulletCount; i++) {
      let angle = owner.aimAngle;
      if (currentSpread > 0) {
        const spreadRad = Utils.degToRad(currentSpread);
        angle += Utils.randomRange(-spreadRad, spreadRad);
      }
      
      // 计算射线方向
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      
      // 枪口位置
      const muzzleX = centerX + Math.cos(angle) * totalLength;
      const muzzleY = centerY + Math.sin(angle) * totalLength;
      
      // 射线检测命中
      let hitInfo = null;
      let maxDist = this.maxRange;
      
      // 检测墙壁遮挡
      if (platforms) {
        for (const platform of platforms) {
          // 忽略边界墙
          const isBorderWall = (platform.x <= 0) || 
                               (platform.x >= 1970) || 
                               (platform.y >= 1170);
          if (isBorderWall) continue;
          
          // 检测射线与平台四条边的相交
          const walls = [
            // 上边
            { x1: platform.x, y1: platform.y, x2: platform.x + platform.width, y2: platform.y },
            // 下边
            { x1: platform.x, y1: platform.y + platform.height, x2: platform.x + platform.width, y2: platform.y + platform.height },
            // 左边
            { x1: platform.x, y1: platform.y, x2: platform.x, y2: platform.y + platform.height },
            // 右边
            { x1: platform.x + platform.width, y1: platform.y, x2: platform.x + platform.width, y2: platform.y + platform.height }
          ];
          
          for (const wall of walls) {
            const wallHit = Utils.raycastSegment(muzzleX, muzzleY, dirX, dirY, wall.x1, wall.y1, wall.x2, wall.y2);
            if (wallHit.hit && wallHit.distance < maxDist) {
              maxDist = wallHit.distance;
              hitInfo = {
                type: 'wall',
                point: wallHit.point,
                distance: wallHit.distance
              };
            }
          }
        }
      }
      
      // 检测敌人命中（只检测敌方队伍）
      const game = window.game;
      if (game && game.players) {
        for (const player of game.players) {
          if (!player.alive || player.team === owner.team) continue;
          
          // 射线与玩家身体相交检测
          const bodyHit = Utils.raycastRect(muzzleX, muzzleY, dirX, dirY, player.x, player.y, player.width, player.height);
          if (bodyHit.hit && bodyHit.distance < maxDist) {
            // 检查是否爆头
            const headBox = player.getHeadBox();
            const headHit = Utils.raycastRect(muzzleX, muzzleY, dirX, dirY, headBox.x, headBox.y, headBox.width, headBox.height);
            const isHead = headHit.hit && headHit.distance < maxDist;
            
            maxDist = bodyHit.distance;
            hitInfo = {
              type: 'player',
              player: player,
              point: bodyHit.point,
              distance: bodyHit.distance,
              isHead: isHead
            };
          }
        }
      }
      
      // 结算伤害
      if (hitInfo && hitInfo.type === 'player') {
        const damage = this._calculateDamage(hitInfo.distance, hitInfo.isHead, falloffRate);
        
        const wasAlive = hitInfo.player.health > 0;
        hitInfo.player.takeDamage(damage, owner);
        
        if (hitInfo.isHead) {
          game._createHeadshotText(hitInfo.player.x, hitInfo.player.y);
        }
        
        game._createHitEffect(hitInfo.point.x, hitInfo.point.y);
        
        if (!hitInfo.player.alive && wasAlive) {
          game._createBloodSplatter(hitInfo.player.x + hitInfo.player.width/2, hitInfo.player.y + hitInfo.player.height/2);
          game.scores[owner.team]++;
          game._createKillFeed(owner, hitInfo.player);
        }
        
        if (game.audio) {
          game.audio.playHit();
        }
      }
      
      // 创建视觉子弹（仅装饰）
      const bulletPool = window.Game?.bulletPool;
      if (bulletPool) {
        const bullet = bulletPool.get();
        bullet.spawn(
          muzzleX,
          muzzleY,
          angle,
          this.bulletSpeed,
          this.damage,
          this.maxRange,
          owner.team,
          platforms,
          falloffRate
        );
        // 标记为纯视觉效果，不进行碰撞检测
        bullet.isVisualOnly = true;
        bullets.push(bullet);
      }
      
      // 创建弹道线效果
      const particlePool = window.Game?.particlePool;
      if (particlePool) {
        const tracer = particlePool.get();
        const endX = hitInfo ? hitInfo.point.x : muzzleX + dirX * this.maxRange;
        const endY = hitInfo ? hitInfo.point.y : muzzleY + dirY * this.maxRange;
        tracer.spawnTracer(muzzleX, muzzleY, endX, endY, tracerAlpha, 15, isSniper);
      }
    }
    
    // 播放音效
    if (window.AudioSystem) {
      window.AudioSystem.playShoot(this.name);
    }
    
    // 递增连续射击计数
    this.consecutiveShots++;
    this.lastShotTime = window.game ? window.game.gameTime : performance.now();
    
    return bullets;
  }

  // 计算伤害（考虑距离衰减和爆头）
  _calculateDamage(distance, isHead, falloffRate) {
    let damage = this.damage;
    
    // 应用距离衰减
    if (falloffRate > 0) {
      const falloff = Math.min(0.5, distance * falloffRate);
      damage = this.damage * (1 - falloff);
    }
    
    // 应用爆头系数
    if (isHead) {
      damage *= 2.5;
    }
    
    return damage;
  }

  // 开始换弹
  startReload() {
    // 由 Player 类处理
  }

  // 重置武器状态
  reset() {
    this.ammo = this.magazineSize;
  }
}

window.Weapon = Weapon;
