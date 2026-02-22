// AI 系统 - 简化版：持续移动 + 边界反弹 + 平台跳跃 + 危险反应

class AIController {
  constructor(player, game) {
    this.player = player;
    this.game = game;
    
    // 基础移动
    this.moveDirection = 1;  // 1=向右，-1=向左
    
    // 检测范围
    this.detectionRange = 600;
    this.attackRange = 400;
    this.dangerDistance = 250;
    
    // 危险反应参数
    this.freezeChance = 0.3;
    this.crouchChance = 0.3;
    this.randomJumpChance = 0.5;
    
    // 状态追踪
    this.target = null;
    this.lastHealth = player.health;
    this.attackedCooldown = 0;
    this.isInDanger = false;
    this.dangerFreeze = false;
    this.dangerCrouch = false;
    
    // 冷却
    this.updateInterval = 33;  // 30 FPS
    this.edgeCheckCooldown = 0;
    this.lastUpdateTime = 0;
  }

  // AI 更新（30 FPS）
  update(gameTime, dt) {
    if (this.player.isControlled || !this.player.alive) {
      return;
    }
    
    // 限制更新频率
    if (gameTime - this.lastUpdateTime < this.updateInterval) {
      this._continueCurrentState();
      return;
    }
    this.lastUpdateTime = gameTime;
    
    // 1. 检测受击
    this._checkAttacked();
    
    // 2. 寻找目标
    this._findTarget();
    
    // 3. 更新危险状态
    this._updateDangerState();
    
    // 4. 边界反弹
    this._checkBoundaryBounce();
    
    // 5. 平台边缘跳跃
    this._checkPlatformEdgeJump();
    
    // 6. 应用行为
    this._applyBehavior();
  }

  // 检测受击（血量减少）
  _checkAttacked() {
    if (this.player.health < this.lastHealth) {
      this.attackedCooldown = 60;  // 2 秒危险期
    }
    this.lastHealth = this.player.health;
    if (this.attackedCooldown > 0) {
      this.attackedCooldown--;
    }
  }

  // 寻找目标
  _findTarget() {
    const enemyTeam = this.player.team === 'blue' ? 'red' : 'blue';
    let closestEnemy = null;
    let closestDist = this.detectionRange;

    for (const enemy of this.game.players) {
      if (enemy.team !== enemyTeam || !enemy.alive) continue;

      const dist = Utils.distance(
        this.player.getCenterX(),
        this.player.getCenterY(),
        enemy.getCenterX(),
        enemy.getCenterY()
      );

      if (dist < closestDist) {
        if (this._hasLineOfSight(enemy)) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
    }

    this.target = closestEnemy;
  }

  // 检查视线
  _hasLineOfSight(target) {
    const result = this.game.physics.raycast(
      this.player.getCenterX(),
      this.player.getCenterY(),
      target.getCenterX(),
      target.getCenterY(),
      this.game.map.platforms
    );
    return !result.hit;
  }

  // 更新危险状态
  _updateDangerState() {
    const enemyNearby = this.target && 
      Utils.distance(
        this.player.getCenterX(),
        this.player.getCenterY(),
        this.target.getCenterX(),
        this.target.getCenterY()
      ) < this.dangerDistance;
    
    // 危险条件：敌人靠近 或 刚被攻击
    const wasInDanger = this.isInDanger;
    this.isInDanger = enemyNearby || this.attackedCooldown > 0;
    
    // 危险解除时重置反应
    if (!this.isInDanger) {
      this.dangerFreeze = false;
      this.dangerCrouch = false;
    } else if (!wasInDanger && this.isInDanger) {
      // 刚进入危险，随机选择反应
      const lowHealthFactor = (this.player.health < 30) ? 0.5 : 0;
      const roll = Math.random();
      const adjustedFreeze = this.freezeChance + lowHealthFactor;
      const adjustedCrouch = this.crouchChance + lowHealthFactor;
      
      if (roll < adjustedFreeze) {
        this.dangerFreeze = true;
      } else if (roll < adjustedFreeze + adjustedCrouch) {
        this.dangerCrouch = true;
      }
    }
  }

  // 边界反弹
  _checkBoundaryBounce() {
    const mapBounds = this.game.map.getSize();
    const margin = 50;
    
    if (this.player.x < margin) {
      this.moveDirection = 1;
    } else if (this.player.x > mapBounds.width - margin - this.player.width) {
      this.moveDirection = -1;
    }
  }

  // 平台边缘跳跃
  _checkPlatformEdgeJump() {
    if (this.edgeCheckCooldown > 0 || !this.player.onGround) {
      if (this.edgeCheckCooldown > 0) this.edgeCheckCooldown--;
      return;
    }
    
    const hasPlatform = this._hasPlatformInFront();
    
    if (!hasPlatform) {
      // 前方悬空，50% 反向，50% 继续（可能掉下去）
      if (Math.random() < 0.5) {
        this.moveDirection *= -1;
      }
      this.edgeCheckCooldown = 20;
    } else {
      // 前方有平台，50% 跳跃，50% 继续走
      if (Math.random() < this.randomJumpChance) {
        this.player.jump();
      }
      this.edgeCheckCooldown = 20;
    }
  }

  // 检测前方是否有平台
  _hasPlatformInFront() {
    const checkDist = 40;
    const platforms = this.game.map.platforms;
    
    const checkX = this.player.facingLeft ?
      this.player.x - checkDist : this.player.x + this.player.width + checkDist;
    const checkY = this.player.y + this.player.height + 10;
    
    for (const platform of platforms) {
      if (checkX >= platform.x && checkX <= platform.x + platform.width &&
          Math.abs(checkY - platform.y) < 20) {
        return true;
      }
    }
    return false;
  }

  // 应用基础移动
  _applyBaseMovement() {
    if (this.moveDirection > 0) {
      this.player.moveRight = true;
      this.player.moveLeft = false;
      this.player.facingLeft = false;
    } else {
      this.player.moveLeft = true;
      this.player.moveRight = false;
      this.player.facingLeft = true;
    }
  }

  // 危险反应处理
  _handleDangerResponse() {
    if (this.dangerFreeze) {
      this.player.moveLeft = false;
      this.player.moveRight = false;
      this.player.crouching = false;
    } else if (this.dangerCrouch) {
      this.player.crouching = true;
      this._applyBaseMovement();
    } else {
      this._applyBaseMovement();
    }
  }

  // 应用行为
  _applyBehavior() {
    // 重置移动状态
    this.player.crouching = false;
    
    if (this.isInDanger) {
      // 危险中：反应 + 瞄准射击
      this._handleDangerResponse();
      if (this.target) {
        this._aimAtTarget();
        this.player.shooting = true;
      }
    } else {
      // 安全：正常移动
      this._applyBaseMovement();
      
      // 有目标且可攻击时瞄准射击
      if (this.target && this._canAttack()) {
        this._aimAtTarget();
        this.player.shooting = true;
      } else {
        this.player.shooting = false;
      }
    }
  }

  // 继续当前状态（非更新帧）
  _continueCurrentState() {
    this._checkBoundaryBounce();
    this._checkPlatformEdgeJump();
    
    if (this.isInDanger) {
      this._handleDangerResponse();
      if (this.target) {
        this._aimAtTarget();
        this.player.shooting = true;
      }
    } else {
      this._applyBaseMovement();
    }
  }

  // 瞄准目标
  _aimAtTarget() {
    if (!this.target) return;

    const angle = Utils.angleBetween(
      this.player.getCenterX(),
      this.player.getCenterY(),
      this.target.getCenterX(),
      this.target.getCenterY()
    );

    this.player.aimAngle = angle;
    this.player.facingLeft = Math.cos(angle) < 0;
  }

  // 检查是否可以攻击
  _canAttack() {
    if (!this.target || !this.player.weapon) return false;
    if (this.player.weapon.ammo <= 0) return false;

    const dist = Utils.distance(
      this.player.getCenterX(),
      this.player.getCenterY(),
      this.target.getCenterX(),
      this.target.getCenterY()
    );

    return dist <= this.attackRange;
  }

  // 设置巡逻起点（保留接口）
  setPatrolPoint(x) {
    this.patrolStart = x;
  }
}

window.AIController = AIController;
