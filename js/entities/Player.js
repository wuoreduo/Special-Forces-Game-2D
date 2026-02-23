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
    
    // 倒地状态（可救援）
    this.isDowned = false;
    this.downedTime = 0;
    this.maxDownedTime = 8000;  // 倒地最长 8 秒（超时真正死亡）
    this.lastAttacker = null;   // 最后攻击者（用于倒地死亡时统计）
    
    // 救援状态
    this.isRescuing = false;
    this.rescueTarget = null;
    this.rescueProgress = 0;
    this.rescueTime = 3000;  // 救援需要 3 秒
    
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
    
    // 无敌状态
    this.invincible = false;
    this.invincibleTime = 0;
    this.invincibleDuration = 3000;
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
    // 倒地状态处理（倒地时仍然 alive=true，但无法行动）
    if (this.isDowned) {
      this.downedTime += dt;
      if (this.downedTime >= this.maxDownedTime) {
        // 超时真正死亡
        this.isDowned = false;
        this.alive = false;
        this.deadTime = 0;
        this.deaths++;
        this.falling = true;
        this.fallenAngle = 0;
      }
      this._updateAnimation();
      return;
    }
    
    // 真正死亡后的处理
    if (!this.alive) {
      this.deadTime += dt;
      this._updateAnimation();
      return;
    }
    
    // 更新救援进度
    if (this.isRescuing && this.rescueTarget) {
      this.rescueProgress += dt;
      // console.log(`[救援] ${this.name} 救援进度：${this.rescueProgress}/${this.rescueTime}`);
      if (this.rescueProgress >= this.rescueTime) {
        this._completeRescue();
      }
    }

    // 无敌时间倒计时（调试模式永久无敌）
    if (this.invincible) {
      const isDebugMode = window.game && window.game.settings && window.game.settings.debugGodMode && this.isControlled;
      if (!isDebugMode) {
        this.invincibleTime -= dt;
        if (this.invincibleTime <= 0) {
          this.invincible = false;
        }
      }
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
    // 救援中不能移动
    if (this.isRescuing) {
      this.moveLeft = false;
      this.moveRight = false;
      return;
    }
    
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
    // 倒地状态
    if (this.isDowned) {
      this.animationState = 'downed';
      return;
    }
    
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
    
    // 救援中
    if (this.isRescuing) {
      this.animationState = 'rescuing';
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
    // 倒地玩家不能射击
    if (!this.alive || this.isDowned || this.reloading || !this.weapon) return [];
    
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
    // 倒地玩家不能近战
    if (!this.alive || this.isDowned || this.meleeCooldown > 0) return;
    
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
    // 倒地玩家不受伤害，真正死亡的玩家也不受伤害
    if (!this.alive || this.isDowned) return false;
    
    // 无敌期间不受伤害
    if (this.invincible) return false;
    
    this.health -= amount;
    
    // 记录最后攻击者
    if (attacker && attacker !== this) {
      this.lastAttacker = attacker;
    }
    
    if (this.health <= 0) {
      this.health = 0;
      this.die(attacker);
      return true;
    }
    
    return false;
  }

  // 死亡（进入倒地状态，可救援）
  die(killer) {
    // 如果已经倒地，不要重复进入倒地状态
    if (this.isDowned) return;
    
    this.isDowned = true;
    this.downedTime = 0;
    this.health = 0;
    // 注意：alive 保持 true，只是 isDowned=true 表示倒地无法行动
    // 不增加 deaths，等到真正死亡时才增加
    this.falling = false;
    this.fallenAngle = 90;  // 倒地姿势
    this.moveLeft = false;
    this.moveRight = false;
    this.shooting = false;
    this.crouching = false;
    this.isRescuing = false;
    this.rescueTarget = null;
    this.rescueProgress = 0;
    
    // 记录最后攻击者（用于倒地超时死亡时统计）
    this.lastAttacker = killer;
  }
  
  // 开始救援
  startRescue(target) {
    if (!this.alive || this.isRescuing || !target || !target.isDowned) return;
    
    this.isRescuing = true;
    this.rescueTarget = target;
    this.rescueProgress = 0;
    this.moveLeft = false;
    this.moveRight = false;
    this.shooting = false;
  }
  
  // 取消救援
  cancelRescue() {
    this.isRescuing = false;
    this.rescueTarget = null;
    this.rescueProgress = 0;
  }
  
  // 完成救援
  _completeRescue() {
    if (this.rescueTarget && this.rescueTarget.isDowned) {
      // 恢复目标 25 HP
      this.rescueTarget.health = 25;
      this.rescueTarget.isDowned = false;
      // alive 已经为 true，不需要再设置
      this.rescueTarget.invincible = true;
      this.rescueTarget.invincibleTime = 2000;  // 2 秒无敌时间
      this.rescueTarget.downedTime = 0;
      this.rescueTarget.fallenAngle = 0;
      this.rescueTarget.falling = false;
    }
    
    // 重置救援状态
    this.isRescuing = false;
    this.rescueTarget = null;
    this.rescueProgress = 0;
  }

  // 重生
  respawn(x, y) {
    this.x = x;
    this.y = y;
    
    this.maxHealth = 100;
    this.health = this.maxHealth;
    
    this.alive = true;
    this.isDowned = false;
    this.vx = 0;
    this.vy = 0;
    this.reloading = false;
    this.falling = false;
    this.fallenAngle = 0;
    this.deadTime = 0;
    this.downedTime = 0;
    this.lastAttacker = null;
    
    // 复活时无敌时间
    this.invincible = true;
    this.invincibleTime = this.invincibleDuration;
    
    // 调试模式：永久无敌
    const isDebugMode = window.game && window.game.settings && window.game.settings.debugGodMode && this.isControlled;
    if (isDebugMode) {
      this.invincible = true;
    }
    
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
