// 玩家/角色类 - 包含 5 部位分层绘制和动画状态机

class Player extends Entity {
  constructor(x, y, team, isControlled = false) {
    super(x, y, 30, 50);
    
    this.team = team;
    this.isControlled = isControlled;
    
    // 玩家名字
    this.name = isControlled ? '玩家' : `AI-${team === 'blue' ? '蓝' : '红'}-${Math.floor(Math.random() * 100)}`;
    
    // 状态
    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
    this.deadTime = 0;
    
    // 朝向
    this.facingLeft = false;
    this.aimAngle = 0;
    
    // 动画
    this.walkAnim = 0;
    this.animationState = 'idle';  // idle, run, jump, crouch, shoot, reload, melee, death
    this.falling = false;
    this.fallenAngle = 0;
    
    // 武器
    this.weapon = null;
    this.secondaryWeapon = null;
    this.lastShootTime = 0;
    this.reloading = false;
    this.reloadTime = 0;
    this.meleeAttacking = false;
    this.meleeCooldown = 0;
    
    // 输入状态（AI 或玩家控制）
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpHeld = false;
    this.crouching = false;
    this.shooting = false;
    
    // 击杀统计
    this.kills = 0;
    this.deaths = 0;
  }

  // 设置武器
  setWeapon(weaponConfig) {
    this.weapon = new Weapon(weaponConfig);
    this.weapon.owner = this;
  }

  // 设置副武器
  setSecondaryWeapon(weaponConfig) {
    this.secondaryWeapon = new Weapon(weaponConfig);
    this.secondaryWeapon.owner = this;
  }

  // 切换主副武器
  swapWeapon() {
    if (!this.secondaryWeapon || this.reloading) return;
    
    const temp = this.weapon;
    this.weapon = this.secondaryWeapon;
    this.secondaryWeapon = temp;
  }

  // 设置平台引用（用于子弹碰撞）
  setPlatforms(platforms) {
    this.platforms = platforms;
  }

  // 更新玩家
  update(dt, platforms) {
    if (!this.alive) {
      this.deadTime += dt;
      this._updateAnimation();
      return;
    }

    // 换弹逻辑
    if (this.reloading) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        this.finishReload();
      }
      // 换弹时仍可移动，继续执行下面的代码
    }

    // 近战冷却
    if (this.meleeCooldown > 0) {
      this.meleeCooldown -= dt;
    }

    // 移动
    this._handleMovement(dt);
    
    // 应用物理
    this._applyPhysics();
    
    // 更新动画
    this._updateAnimation();
    
    // 限制在地图内
    this.x = Utils.clamp(this.x, 0, this.mapWidth - this.width);
    this.y = Utils.clamp(this.y, 0, this.mapHeight - this.height);
  }

  // 处理移动
  _handleMovement(dt) {
    const moveSpeed = this.crouching ? 2 : 5;
    
    if (this.moveLeft) {
      this.vx -= 1;
      this.facingLeft = true;
    }
    if (this.moveRight) {
      this.vx += 1;
      this.facingLeft = false;
    }
    
    // 限制速度
    this.vx = Utils.clamp(this.vx, -moveSpeed, moveSpeed);
    
    // 跳跃
    if (this.jumpHeld && this.onGround) {
      this.vy = -14;
      this.onGround = false;
      this.jumpHeld = false;
    }
  }

  // 跳跃
  jump() {
    if (this.onGround && this.alive) {
      this.vy = -14;
      this.onGround = false;
    }
  }

  // 应用物理
  _applyPhysics() {
    // 重力
    this.vy += 0.6;
    
    // 摩擦力
    this.vx *= 0.85;
    
    // 应用速度
    this.x += this.vx;
    this.y += this.vy;
    
    // 限制最大速度
    this.vy = Utils.clamp(this.vy, -20, 20);
  }

  // 更新动画状态
  _updateAnimation() {
    if (!this.alive) {
      if (this.falling) {
        this.fallenAngle += 10;
        if (this.fallenAngle >= 90) {
          this.fallenAngle = 90;
          this.falling = false;
        }
      }
      this.animationState = 'death';
      return;
    }
    
    // 换弹
    if (this.reloading) {
      this.animationState = 'reload';
      return;
    }
    
    // 近战
    if (this.meleeAttacking) {
      this.animationState = 'melee';
      return;
    }
    
    // 射击
    if (this.shooting) {
      this.animationState = 'shoot';
    }
    // 跳跃
    else if (!this.onGround) {
      this.animationState = 'jump';
    }
    // 蹲下
    else if (this.crouching) {
      this.animationState = 'crouch';
    }
    // 移动
    else if (Math.abs(this.vx) > 0.5) {
      this.animationState = 'run';
      this.walkAnim += 0.3;
    }
    // 待机
    else {
      this.animationState = 'idle';
    }
  }

  // 射击
  shoot(gameTime) {
    if (!this.alive || this.reloading || !this.weapon) return [];
    
    // 更新散布状态
    this.weapon.updateSpread(gameTime);
    
    // 检查冷却
    if (gameTime - this.lastShootTime < this.weapon.fireDelay) return [];
    
    // 检查弹药
    if (this.weapon.ammo <= 0) {
      this.startReload();
      return [];
    }
    
    this.lastShootTime = gameTime;
    this.weapon.ammo--;
    
    // 创建子弹
    const bullets = this.weapon.fire(this, this.platforms);
    
    return bullets;
  }

  // 停止射击
  stopShooting() {
    this.shooting = false;
    if (this.weapon) {
      this.weapon.resetSpread();
    }
  }

  // 开始换弹
  startReload() {
    if (this.reloading || !this.weapon || this.weapon.ammo === this.weapon.magazineSize) return;
    
    this.reloading = true;
    this.reloadTime = this.weapon.reloadTime;
    
    // 播放音效
    if (window.AudioSystem) {
      window.AudioSystem.playReload();
    }
  }

  // 完成换弹
  finishReload() {
    this.reloading = false;
    this.weapon.ammo = this.weapon.magazineSize;
  }

  // 近战攻击
  melee(gameTime) {
    if (!this.alive || this.meleeCooldown > 0) return;
    
    this.meleeAttacking = true;
    this.meleeCooldown = 500;
    
    // 播放音效
    if (window.AudioSystem) {
      window.AudioSystem.playMelee();
    }
    
    // 检测命中
    setTimeout(() => {
      this.meleeAttacking = false;
    }, 200);
    
    return true;
  }

  // 受到伤害
  takeDamage(amount, attacker) {
    if (!this.alive) return false;
    
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.die(attacker);
      return true;
    }
    
    return false;
  }

  // 死亡
  die(killer) {
    this.alive = false;
    this.deadTime = 0;
    this.deaths++;
    this.falling = true;
    this.fallenAngle = 0;
    
    if (killer && killer !== this) {
      killer.kills++;
    }
  }

  // 重生
  respawn(x, y) {
    this.x = x;
    this.y = y;
    
    const isDebugMode = window.game && window.game.settings && window.game.settings.debugGodMode && this.isControlled;
    this.maxHealth = isDebugMode ? 1000 : 100;
    this.health = this.maxHealth;
    
    this.alive = true;
    this.vx = 0;
    this.vy = 0;
    this.reloading = false;
    this.falling = false;
    this.fallenAngle = 0;
    
    if (this.weapon) {
      this.weapon.ammo = this.weapon.magazineSize;
    }
  }

  // 获取头部区域
  getHeadBox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height * 0.2
    };
  }

  // 受到子弹命中检测
  checkBulletHit(bullet) {
    const headBox = this.getHeadBox();
    const isHead = (
      bullet.x >= headBox.x &&
      bullet.x <= headBox.x + headBox.width &&
      bullet.y >= headBox.y &&
      bullet.y <= headBox.y + headBox.height
    );
    
    const bodyHit = (
      bullet.x >= this.x &&
      bullet.x <= this.x + this.width &&
      bullet.y >= this.y &&
      bullet.y <= this.y + this.height
    );
    
    return bodyHit ? { hit: true, isHead } : { hit: false };
  }

  // 获取近战攻击范围
  getMeleeRange() {
    const range = 60;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    return {
      x: this.facingLeft ? centerX - range : centerX,
      y: centerY - 20,
      width: range,
      height: 40
    };
  }

  // 绘制（由 Renderer 处理，这里是备份）
  draw(renderer, camera) {
    renderer.drawPlayer(this, camera);
  }
}

window.Player = Player;
