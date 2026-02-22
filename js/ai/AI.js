// AI 系统 - 寻敌、射击、撤退行为

class AIController {
  constructor(player, game) {
    this.player = player;
    this.game = game;
    this.state = 'idle';  // idle, patrol, chase, attack, retreat, reload
    this.target = null;
    this.stateTime = 0;
    this.moveDirection = 1;
    this.patrolStart = player.x;
    this.patrolRange = 200;
    
    // 行为参数
    this.detectionRange = 500;
    this.attackRange = 300;
    this.retreatHealth = 30;
    this.updateInterval = 33;  // 30 FPS 更新
    this.lastUpdateTime = 0;
  }

  // AI 更新（30 FPS）
  update(gameTime, dt) {
    // 如果玩家控制此角色，跳过 AI 更新
    if (this.player.isControlled) {
      return;
    }
    
    if (!this.player.alive) {
      this.state = 'idle';
      this.target = null;
      return;
    }

    // 限制更新频率
    if (gameTime - this.lastUpdateTime < this.updateInterval) {
      this._continueCurrentState();
      return;
    }
    this.lastUpdateTime = gameTime;

    // 寻找目标
    this._findTarget();

    // 状态机
    this._updateState(gameTime);

    // 应用行为
    this._applyBehavior();
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
        // 检查视线
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

  // 更新状态
  _updateState(gameTime) {
    const prevState = this.state;

    // 低血量撤退
    if (this.player.health < this.retreatHealth && this.target) {
      this.state = 'retreat';
    }
    // 有目标且可攻击
    else if (this.target && this._canAttack()) {
      this.state = 'attack';
    }
    // 有目标但太远
    else if (this.target) {
      this.state = 'chase';
    }
    // 需要换弹
    else if (this.player.weapon && this.player.weapon.ammo <= 0) {
      this.state = 'reload';
    }
    // 待机/巡逻
    else {
      this.state = 'patrol';
    }

    // 状态改变时重置时间
    if (prevState !== this.state) {
      this.stateTime = gameTime;
    }
  }

  // 继续当前状态
  _continueCurrentState() {
    if (this.state === 'attack') {
      this._attackBehavior();
    } else if (this.state === 'chase') {
      this._chaseBehavior();
    } else if (this.state === 'retreat') {
      this._retreatBehavior();
    }
  }

  // 应用行为
  _applyBehavior() {
    switch (this.state) {
      case 'idle':
        this._idleBehavior();
        break;
      case 'patrol':
        this._patrolBehavior();
        break;
      case 'chase':
        this._chaseBehavior();
        break;
      case 'attack':
        this._attackBehavior();
        break;
      case 'retreat':
        this._retreatBehavior();
        break;
      case 'reload':
        this._reloadBehavior();
        break;
    }
  }

  // 待机行为
  _idleBehavior() {
    this.player.moveLeft = false;
    this.player.moveRight = false;
    this.player.shooting = false;
  }

  // 巡逻行为
  _patrolBehavior() {
    const patrolEnd = this.patrolStart + this.patrolRange * this.moveDirection;
    
    // 检查是否到达巡逻终点或接近地图边界
    const mapBounds = this.game.map.getSize();
    const safeMargin = 100;
    
    if (Math.abs(this.player.x - patrolEnd) < 10 ||
        this.player.x < safeMargin ||
        this.player.x > mapBounds.width - safeMargin) {
      this.moveDirection *= -1;
    }

    if (this.moveDirection > 0) {
      this.player.moveRight = true;
      this.player.moveLeft = false;
      this.player.facingLeft = false;
    } else {
      this.player.moveLeft = true;
      this.player.moveRight = false;
      this.player.facingLeft = true;
    }

    this.player.shooting = false;
  }

  // 追击行为
  _chaseBehavior() {
    if (!this.target) return;

    const dx = this.target.x - this.player.x;
    const dist = Utils.distance(
      this.player.getCenterX(),
      this.player.getCenterY(),
      this.target.getCenterX(),
      this.target.getCenterY()
    );

    // 检查地图边界
    const mapBounds = this.game.map.getSize();
    const safeMargin = 100;
    
    // 接近目标
    if (dist > this.attackRange) {
      if (dx > 0) {
        // 检查是否在右边界
        if (this.player.x < mapBounds.width - safeMargin) {
          this.player.moveRight = true;
          this.player.moveLeft = false;
          this.player.facingLeft = false;
        } else {
          this.moveDirection = -1;
        }
      } else {
        // 检查是否在左边界
        if (this.player.x > safeMargin) {
          this.player.moveLeft = true;
          this.player.moveRight = false;
          this.player.facingLeft = true;
        } else {
          this.moveDirection = 1;
        }
      }
    }

    // 瞄准目标
    this._aimAtTarget();
    this.player.shooting = false;
  }

  // 攻击行为
  _attackBehavior() {
    if (!this.target) return;

    // 瞄准目标
    this._aimAtTarget();

    // 射击
    this.player.shooting = true;

    // 保持距离
    const dist = Utils.distance(
      this.player.getCenterX(),
      this.player.getCenterY(),
      this.target.getCenterX(),
      this.target.getCenterY()
    );

    // 检查地图边界
    const mapBounds = this.game.map.getSize();
    const safeMargin = 100;

    if (dist < this.attackRange * 0.5) {
      // 太近了，后退
      const dx = this.player.x - this.target.x;
      if (dx > 0) {
        if (this.player.x < mapBounds.width - safeMargin) {
          this.player.moveRight = true;
          this.player.moveLeft = false;
        }
      } else {
        if (this.player.x > safeMargin) {
          this.player.moveLeft = true;
          this.player.moveRight = false;
        }
      }
    }
  }

  // 撤退行为
  _retreatBehavior() {
    if (!this.target) return;

    const dx = this.player.x - this.target.x;
    
    // 检查地图边界
    const mapBounds = this.game.map.getSize();
    const safeMargin = 100;

    // 远离目标
    if (dx > 0) {
      if (this.player.x < mapBounds.width - safeMargin) {
        this.player.moveRight = true;
        this.player.moveLeft = false;
        this.player.facingLeft = false;
      }
    } else {
      if (this.player.x > safeMargin) {
        this.player.moveLeft = true;
        this.player.moveRight = false;
        this.player.facingLeft = true;
      }
    }

    // 向后瞄准
    this._aimAtTarget();
  }

  // 换弹行为
  _reloadBehavior() {
    this.player.startReload();
    this.player.shooting = false;
    // 换弹时继续巡逻移动
    this._patrolBehavior();
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

  // 设置巡逻起点
  setPatrolPoint(x) {
    this.patrolStart = x;
  }
}

window.AIController = AIController;
