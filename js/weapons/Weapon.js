// 武器基类

class Weapon {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.damage = config.damage;
    this.fireRate = config.fireRate;
    this.fireDelay = 1000 / config.fireRate;  // 射击间隔（毫秒）
    this.magazineSize = config.magazineSize;
    this.reloadTime = config.reloadTime;
    this.bulletSpeed = config.bulletSpeed;
    this.maxRange = config.maxRange;
    this.spread = config.spread;
    this.bulletCount = config.bulletCount || 1;
    
    // 状态
    this.ammo = config.magazineSize;
    this.owner = null;
  }

  // 开火
  fire(owner) {
    if (this.ammo <= 0) return [];
    
    const bullets = [];
    const centerX = owner.x + owner.width / 2;
    const centerY = owner.y + owner.height / 2;
    
    // 霰弹枪发射多发子弹
    for (let i = 0; i < this.bulletCount; i++) {
      // 计算散布
      let angle = owner.aimAngle;
      if (this.spread > 0) {
        const spreadRad = Utils.degToRad(this.spread);
        angle += Utils.randomRange(-spreadRad, spreadRad);
      }
      
      // 创建子弹（使用全局对象池）
      const bulletPool = window.Game?.bulletPool;
      if (!bulletPool) continue;
      
      const bullet = bulletPool.get();
      bullet.spawn(
        centerX + Math.cos(angle) * 30,
        centerY + Math.sin(angle) * 30,
        angle,
        this.bulletSpeed,
        this.damage,
        this.maxRange,
        owner.team
      );
      
      bullets.push(bullet);
    }
    
    // 播放音效
    if (window.AudioSystem) {
      window.AudioSystem.playShoot(this.name);
    }
    
    return bullets;
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
