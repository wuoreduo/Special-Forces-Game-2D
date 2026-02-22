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
    this.isText = false;
    this.text = '';
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
    this.isText = false;
    this.text = '';
  }

  // 生成爆头文字
  spawnHeadshotText(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = -1;
    this.size = 24;
    this.life = 80;
    this.decay = 1 / 80;
    this.color = '#ff3333';
    this.gravity = 0;
    this.active = true;
    this.isText = true;
    this.text = 'HEADSHOT!';
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
    
    if (this.isText) {
      ctx.save();
      ctx.globalAlpha = this.life / 80;
      ctx.fillStyle = this.color;
      ctx.font = 'bold 24px Arial';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(this.text, this.x, this.y);
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    } else {
      ctx.globalAlpha = this.life;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 重置粒子
  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.isText = false;
    this.text = '';
  }
}

window.Particle = Particle;
