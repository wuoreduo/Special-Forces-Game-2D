// 粒子类 - 用于枪口火焰、命中效果等

class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 5;
    this.life = 1;
    this.decay = 0.05;
    this.color = '#fff';
    this.active = false;
    this.gravity = 0;
  }

  // 生成粒子
  spawn(x, y, vx, vy, size, life, color, gravity = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.life = life;
    this.decay = 1 / life;
    this.color = color;
    this.gravity = gravity;
    this.active = true;
  }

  // 更新粒子
  update(dt) {
    if (!this.active) return;
    
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life -= this.decay;
    
    if (this.life <= 0) {
      this.active = false;
    }
  }

  // 绘制粒子
  draw(ctx, camera) {
    if (!this.active) return;
    
    const screenPos = camera.worldToScreen(this.x, this.y);
    
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 重置粒子
  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
  }
}

window.Particle = Particle;
