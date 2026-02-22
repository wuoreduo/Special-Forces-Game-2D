// 子弹类

class Projectile extends Entity {
  constructor() {
    super(0, 0, 12, 6);
    this.active = false;
    this.speed = 15;
    this.damage = 25;
    this.angle = 0;
    this.distTraveled = 0;
    this.maxDist = 1000;
    this.team = null;
    this.trail = [];  // 子弹轨迹
    this.trailTimer = 0;
    this.radius = 6;  // 用于视锥剔除
  }

  // 初始化子弹
  spawn(x, y, angle, speed, damage, maxDist, team, platforms = null, falloffRate = 0) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.baseDamage = damage;
    this.damage = damage;
    this.maxDist = maxDist;
    this.team = team;
    this.distTraveled = 0;
    this.active = true;
    this.trail = [];
    this.trailTimer = 0;
    this.platforms = platforms;
    this.falloffRate = falloffRate;
    
    // 计算速度向量
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  // 获取当前距离的伤害
  getDamage() {
    if (this.falloffRate <= 0) {
      return this.baseDamage;
    }
    const falloff = Math.min(0.5, this.distTraveled * this.falloffRate);
    return this.baseDamage * (1 - falloff);
  }

  // 检查是否击中墙壁
  _checkWallCollision(newX, newY) {
    if (!this.platforms) return false;
    
    // 使用射线检测，检查从旧位置到新位置的路径
    const steps = 5;
    const stepX = (newX - this.x) / steps;
    const stepY = (newY - this.y) / steps;
    
    let checkX = this.x;
    let checkY = this.y;
    
    for (let i = 0; i < steps; i++) {
      checkX += stepX;
      checkY += stepY;
      
      for (const platform of this.platforms) {
        // 忽略边界墙（左右边界和地面）
        const isBorderWall = (platform.x <= 0) || 
                             (platform.x >= 1970) || 
                             (platform.y >= 1170);
        if (isBorderWall) continue;
        
        // 小碰撞盒检测（子弹半径）
        const bulletRadius = 4;
        if (checkX >= platform.x + bulletRadius && 
            checkX <= platform.x + platform.width - bulletRadius &&
            checkY >= platform.y + bulletRadius && 
            checkY <= platform.y + platform.height - bulletRadius) {
          return true;
        }
      }
    }
    return false;
  }

  // 更新子弹
  update(dt) {
    if (!this.active) return;
    
    // 添加轨迹点（每 2 帧添加一个点）
    this.trailTimer += dt;
    if (this.trailTimer > 16) {
      this.trail.push({ x: this.x, y: this.y, alpha: 1 });
      this.trailTimer = 0;
      
      // 限制轨迹长度
      if (this.trail.length > 10) {
        this.trail.shift();
      }
    }
    
    // 更新轨迹透明度（更快衰减）
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha -= 0.3;
    }
    this.trail = this.trail.filter(t => t.alpha > 0);
    
    // 移动
    const moveX = Math.cos(this.angle) * this.speed;
    const moveY = Math.sin(this.angle) * this.speed;
    
    const newX = this.x + moveX;
    const newY = this.y + moveY;
    
    // 检查是否撞墙
    if (this._checkWallCollision(newX, newY)) {
      this.active = false;
      return;
    }
    
    this.x = newX;
    this.y = newY;
    this.distTraveled += this.speed;
    
    // 检查是否超出最大距离
    if (this.distTraveled >= this.maxDist) {
      this.active = false;
    }
  }

  // 绘制子弹
  draw(renderer, camera) {
    if (!this.active) return;
    renderer.drawBullet(this, camera);
  }

  // 重置子弹（用于对象池）
  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.distTraveled = 0;
    this.trail = [];
    this.trailTimer = 0;
  }
}

window.Projectile = Projectile;
