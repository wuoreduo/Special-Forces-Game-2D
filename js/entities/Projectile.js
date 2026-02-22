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
  }

  // 初始化子弹
  spawn(x, y, angle, speed, damage, maxDist, team) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.maxDist = maxDist;
    this.team = team;
    this.distTraveled = 0;
    this.active = true;
    
    // 计算速度向量
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  // 更新子弹
  update(dt) {
    if (!this.active) return;
    
    // 移动
    const moveX = Math.cos(this.angle) * this.speed;
    const moveY = Math.sin(this.angle) * this.speed;
    
    this.x += moveX;
    this.y += moveY;
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
  }
}

window.Projectile = Projectile;
