// AI 系统 - 团队配合版：小队配合、集火、掩护、救援、撤退、追击

class AIController {
  constructor(player, game, squadId = 0) {
    this.player = player;
    this.game = game;
    this.squadId = squadId;
    this.squadMembers = [];  // 同小队 AI 控制器引用
    
    // 小队共享状态
    this.squadTarget = null;   // 小队集火目标
    this.squadState = 'normal'; // normal, retreating, pursuing, rescuing
    
    // 配合参数
    this.supportRange = 300;    // 支援范围
    this.separationDist = 200;  // 与队友保持距离
    this.rescueRange = 50;      // 救援距离
    
    // 基础移动
    this.moveDirection = 1;  // 1=向右，-1=向左
    this.moveSpeedFactor = 0.65;  // AI 移动速度是玩家的 65%
    
    // 瞄准参数
    this.aimSpeed = 0.06;    // 瞄准角速度（弧度/帧）
    
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
    
    // 救援状态
    this.rescueTarget = null;
    this.rescueProgress = 0;
    this.rescueTime = 5000;  // 5 秒救援时间
    
    // 撤退/追击状态
    this.retreatDirection = 0;
    this.pursueTarget = null;
    
    // 冷却
    this.updateInterval = 33;  // 30 FPS
    this.edgeCheckCooldown = 0;
    this.lastUpdateTime = 0;
    this.squadUpdateCooldown = 0;
  }

  // AI 更新（30 FPS）
  update(gameTime, dt) {
    // 被玩家控制或倒地时不能行动
    if (this.player.isControlled || !this.player.alive || this.player.isDowned) {
      return;
    }
    
    // 限制更新频率
    if (gameTime - this.lastUpdateTime < this.updateInterval) {
      this._continueCurrentState();
      return;
    }
    this.lastUpdateTime = gameTime;
    
    // 1. 更新小队信息（每 10 帧更新一次）
    if (this.squadUpdateCooldown <= 0) {
      this._updateSquadInfo();
      this.squadUpdateCooldown = 10;
    } else {
      this.squadUpdateCooldown--;
    }
    
    // 2. 检测受击
    this._checkAttacked();
    
    // 3. 寻找目标
    this._findTarget();
    
    // 4. 更新危险状态
    this._updateDangerState();
    
    // 5. 平台边缘跳跃
    this._checkPlatformEdgeJump();
    
    // 6. 应用行为（优先级：自卫 > 锁敌攻击 > 撤退 > 救援 > 追击 > 动态巡逻）
    this._applyBehavior();
  }
  
  // 更新小队信息
  _updateSquadInfo() {
    // 获取小队存活成员
    const aliveMembers = this.squadMembers.filter(ai => ai.player.alive && !ai.player.isDowned);
    const downedMembers = this.squadMembers.filter(ai => ai.player.isDowned);
    
    // 获取敌方小队（同队伍的其他小队）
    const sameTeamAIs = this.game.aiControllers.filter(ai => 
      ai.player.team === this.player.team && ai.squadId !== this.squadId
    );
    const aliveOtherSquad = sameTeamAIs.filter(ai => ai.player.alive && !ai.player.isDowned);
    
    // 计算小队总血量
    const totalHealth = aliveMembers.reduce((sum, ai) => sum + ai.player.health, 0);
    const maxHealth = aliveMembers.length * 100;
    const healthRatio = aliveMembers.length > 0 ? totalHealth / maxHealth : 0;
    
    // 计算敌方小队状态
    const enemyTotalHealth = aliveOtherSquad.reduce((sum, ai) => sum + ai.player.health, 0);
    const enemyMaxHealth = aliveOtherSquad.length * 100;
    const enemyHealthRatio = aliveOtherSquad.length > 0 ? enemyTotalHealth / enemyMaxHealth : 0;
    
    // 判断小队优劣势
    const numAdvantage = aliveMembers.length - aliveOtherSquad.length;
    
    // 更新小队状态（仅用于撤退和追击判断）
    // 救援不再是小队状态，而是条件行为（安全时才会救援）
    if (numAdvantage <= -2 || healthRatio < 0.4) {
      this.squadState = 'retreating';
    } else if (numAdvantage >= 1 && enemyHealthRatio < 0.6) {
      this.squadState = 'pursuing';
    } else {
      this.squadState = 'normal';
    }
    
    // 更新小队集火目标（优先集火正在攻击队友的敌人）
    this._updateSquadTarget(aliveMembers);
  }
  
  // 更新小队集火目标
  _updateSquadTarget(aliveMembers) {
    // 检查小队成员是否有共同目标
    let priorityTarget = null;
    
    // 查找正在攻击小队成员的敌人
    for (const member of aliveMembers) {
      if (member.attackedCooldown > 0 && member.target) {
        priorityTarget = member.target;
        break;
      }
    }
    
    // 如果没有优先目标，使用最近敌人的共同目标
    if (!priorityTarget) {
      for (const member of this.squadMembers) {
        if (member.player.alive && member.target) {
          priorityTarget = member.target;
          break;
        }
      }
    }
    
    this.squadTarget = priorityTarget;
  }
  
  // 检查救援
  _checkRescue() {
    if (!this.player.alive || this.player.isDowned) return null;
    
    // 查找倒地的队友
    const downedTeammates = this.game.players.filter(p => 
      p.team === this.player.team && 
      p.isDowned &&
      p !== this.player
    );
    
    if (downedTeammates.length === 0) return null;
    
    // 找最近的倒地队友，且该队友没有被其他 AI 救援
    let nearestDowned = null;
    let nearestDist = this.rescueRange * 2;
    
    for (const downed of downedTeammates) {
      // 检查是否已经有其他 AI 在救援这个倒地者
      const isBeingRescued = this.game.aiControllers.some(ai => 
        ai.rescueTarget === downed && ai !== this
      );
      
      // 如果已经有人在救援，跳过这个倒地者
      if (isBeingRescued) continue;
      
      const dist = Utils.distance(
        this.player.getCenterX(),
        this.player.getCenterY(),
        downed.getCenterX(),
        downed.getCenterY()
      );
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestDowned = downed;
      }
    }
    
    return nearestDowned;
  }
  
  // 执行救援
  _performRescue(dt) {
    if (!this.rescueTarget || !this.rescueTarget.alive || !this.rescueTarget.isDowned) {
      this.rescueTarget = null;
      this.rescueProgress = 0;
      return;
    }
    
    // 移动到救援目标身边
    const dist = Utils.distance(
      this.player.getCenterX(),
      this.player.getCenterY(),
      this.rescueTarget.getCenterX(),
      this.rescueTarget.getCenterY()
    );
    
    if (dist > this.rescueRange) {
      // 还没到达，继续移动
      this._moveToPosition(this.rescueTarget.x, this.rescueTarget.y);
      this.rescueProgress = 0;
    } else {
      // 到达救援位置，开始救援
      this.player.moveLeft = false;
      this.player.moveRight = false;
      this.player.shooting = false;
      
      // 更新救援进度
      this.rescueProgress += dt;
      
      if (this.rescueProgress >= this.rescueTime) {
        // 救援完成
        this._completeRescue();
      }
    }
  }
  
  // 完成救援
  _completeRescue() {
    if (this.rescueTarget && this.rescueTarget.isDowned) {
      // 恢复目标 25 HP
      this.rescueTarget.health = 25;
      this.rescueTarget.isDowned = false;
      this.rescueTarget.invincible = true;
      this.rescueTarget.invincibleTime = 2000;  // 2 秒无敌时间
      this.rescueTarget.downedTime = 0;
      this.rescueTarget.fallenAngle = 0;
      this.rescueTarget.falling = false;
    }
    
    // 重置救援者状态
    this.rescueTarget = null;
    this.rescueProgress = 0;
  }
  
  // 检查撤退条件
  _checkRetreat() {
    const aliveMembers = this.squadMembers.filter(ai => ai.player.alive && !ai.player.isDowned);
    const enemyTeam = this.player.team === 'blue' ? 'red' : 'blue';
    const enemyCount = this.game.players.filter(p => p.team === enemyTeam && p.alive && !p.isDowned).length;
    
    // 人数劣势 ≥2 或 血量 <40%
    const numDisadvantage = aliveMembers.length - enemyCount;
    const healthRatio = this.player.health / 100;
    
    return numDisadvantage <= -2 || healthRatio < 0.4;
  }
  
  // 执行撤退
  _performRetreat() {
    // 计算威胁方向（敌方位置的平均方向）
    const enemyTeam = this.player.team === 'blue' ? 'red' : 'blue';
    let enemyCenterX = 0;
    let enemyCount = 0;
    
    for (const enemy of this.game.players) {
      if (enemy.team === enemyTeam && enemy.alive) {
        enemyCenterX += enemy.getCenterX();
        enemyCount++;
      }
    }
    
    if (enemyCount > 0) {
      enemyCenterX /= enemyCount;
      
      // 撤退方向：远离敌人的方向
      this.retreatDirection = this.player.getCenterX() < enemyCenterX ? -1 : 1;
      
      // 应用撤退移动
      if (this.retreatDirection > 0) {
        this.player.moveRight = true;
        this.player.moveLeft = false;
        this.player.facingLeft = false;
      } else {
        this.player.moveLeft = true;
        this.player.moveRight = false;
        this.player.facingLeft = true;
      }
      
      // 撤退时保持射击（自卫）
      if (this.target && this._canAttack()) {
        this._aimAtTargetSlowly(this.target, 16);
        this.player.shooting = true;
      }
    }
  }
  
  // 检查追击条件
  _checkPursue() {
    const aliveMembers = this.squadMembers.filter(ai => ai.player.alive && !ai.player.isDowned);
    const enemyTeam = this.player.team === 'blue' ? 'red' : 'blue';
    
    let enemyAliveCount = 0;
    let enemyTotalHealth = 0;
    
    for (const enemy of this.game.players) {
      if (enemy.team === enemyTeam && enemy.alive) {
        enemyAliveCount++;
        enemyTotalHealth += enemy.health;
      }
    }
    
    // 人数优势 ≥1 且 敌方总血量 <60%
    const numAdvantage = aliveMembers.length - enemyAliveCount;
    const enemyHealthRatio = enemyAliveCount > 0 ? enemyTotalHealth / (enemyAliveCount * 100) : 0;
    
    return numAdvantage >= 1 && enemyHealthRatio < 0.6;
  }
  
  // 执行追击
  _performPursue() {
    // 寻找血量最低的敌人
    const enemyTeam = this.player.team === 'blue' ? 'red' : 'blue';
    let weakestEnemy = null;
    let weakestHealth = 100;
    
    for (const enemy of this.game.players) {
      if (enemy.team === enemyTeam && enemy.alive && !enemy.isDowned) {
        const healthRatio = enemy.health / enemy.maxHealth;
        if (healthRatio < weakestHealth) {
          weakestHealth = healthRatio;
          weakestEnemy = enemy;
        }
      }
    }
    
    if (weakestEnemy) {
      this.pursueTarget = weakestEnemy;
      
      // 向追击目标移动
      this._moveToPosition(weakestEnemy.x, weakestEnemy.y);
      
      // 集火追击目标
      if (this._canAttack()) {
        this._aimAtTargetSlowly(weakestEnemy, 16);
        this.player.shooting = true;
      }
    }
  }
  
  // 移动到指定位置
  _moveToPosition(targetX, targetY) {
    const dx = targetX - this.player.x;
    const threshold = 20;
    
    if (Math.abs(dx) > threshold) {
      if (dx > 0) {
        this.player.moveRight = true;
        this.player.moveLeft = false;
        this.player.facingLeft = false;
      } else {
        this.player.moveLeft = true;
        this.player.moveRight = false;
        this.player.facingLeft = true;
      }
    } else {
      this.player.moveLeft = false;
      this.player.moveRight = false;
    }
  }
  
  // 应用队形/分散站位
  _applyFormation() {
    // 检查与小队成员的距离
    let tooClose = false;
    let moveAwayDir = 0;
    
    for (const member of this.squadMembers) {
      if (member.player === this.player || !member.player.alive || member.player.isDowned) continue;
      
      const dist = Utils.distance(
        this.player.getCenterX(),
        this.player.getCenterY(),
        member.player.getCenterX(),
        member.player.getCenterY()
      );
      
      // 如果太近，稍微远离
      if (dist < this.separationDist * 0.5) {
        tooClose = true;
        const dx = this.player.getCenterX() - member.player.getCenterX();
        moveAwayDir = dx > 0 ? 1 : -1;
      }
    }
    
    // 如果太近，远离队友
    if (tooClose) {
      if (moveAwayDir > 0) {
        this.player.moveRight = true;
        this.player.moveLeft = false;
      } else {
        this.player.moveLeft = true;
        this.player.moveRight = false;
      }
    }
    // 否则保持当前移动状态
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
      if (enemy.team !== enemyTeam || !enemy.alive || enemy.isDowned) continue;

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

  // 应用基础移动（速度降低）
  _applyBaseMovement() {
    // 应用移动速度系数
    const baseSpeed = 5 * this.moveSpeedFactor;
    
    // 边界保护（防止走出地图）
    const mapBounds = this.game.map.getSize();
    const margin = 80;
    
    if (this.player.x < margin) {
      this.moveDirection = 1;  // 强制向右
    } else if (this.player.x > mapBounds.width - margin - this.player.width) {
      this.moveDirection = -1;  // 强制向左
    }
    
    if (this.moveDirection > 0) {
      this.player.moveRight = true;
      this.player.moveLeft = false;
      this.player.facingLeft = false;
      // 限制 AI 速度
      this.player.vx = Math.min(this.player.vx, baseSpeed);
    } else {
      this.player.moveLeft = true;
      this.player.moveRight = false;
      this.player.facingLeft = true;
      // 限制 AI 速度
      this.player.vx = Math.max(this.player.vx, -baseSpeed);
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

  // 应用行为（优先级系统）
  _applyBehavior() {
    // 重置移动状态
    this.player.crouching = false;
    
    // 1. 自卫（自己被攻击）- 最高优先级
    if (this.isInDanger && this.attackedCooldown > 0) {
      this._handleDangerResponse();
      if (this.target) {
        this._aimAtTargetSlowly(this.target, 16);
        this.player.shooting = true;
      }
      return;
    }
    
    // 2. 锁敌攻击（有敌人在视线内）- 高优先级
    if (this.target && this._canAttack()) {
      this._applyBaseMovement();
      this._aimAtTargetSlowly(this.target, 16);
      this.player.shooting = true;
      // 应用队形
      this._applyFormation();
      return;
    }
    
    // 3. 撤退（小队劣势）- 中高优先级
    if (this.squadState === 'retreating' || this._checkRetreat()) {
      this.squadState = 'retreating';
      this._performRetreat();
      return;
    }
    
    // 4. 救援（仅在安全时）- 中优先级
    // 危险时不救援，保命要紧
    if (!this.isInDanger && this.attackedCooldown <= 0) {
      if (this.squadState === 'rescuing' || this._checkRescue()) {
        if (!this.rescueTarget) {
          this.rescueTarget = this._checkRescue();
        }
        if (this.rescueTarget) {
          this._performRescue(16);
          return;
        }
      }
    }
    
    // 5. 追击（小队优势）- 中低优先级
    if (this.squadState === 'pursuing' || this._checkPursue()) {
      this.squadState = 'pursuing';
      this._performPursue();
      return;
    }
    
    // 6. 动态巡逻（无敌人时）- 最低优先级
    // 不再使用固定路径，改为动态移动
    this._applyDynamicPatrol();
    this.player.shooting = false;
  }

  // 继续当前状态（非更新帧）
  _continueCurrentState() {
    this._checkPlatformEdgeJump();
    
    // 继续救援
    if (this.rescueTarget && this.rescueTarget.alive && this.rescueTarget.isDowned) {
      this._performRescue(16);
      return;
    }
    
    if (this.isInDanger) {
      this._handleDangerResponse();
      if (this.target) {
        this._aimAtTargetSlowly(this.target, 16);
        this.player.shooting = true;
      }
    } else {
      this._applyBaseMovement();
    }
  }
  
  // 动态巡逻（无敌人时的移动行为）
  _applyDynamicPatrol() {
    // 不再使用固定路径巡逻
    // 改为：根据小队成员位置动态移动，保持队形
    
    // 1. 如果附近有小队成员，保持分散站位
    const nearbyMembers = this._getNearbySquadMembers(300);
    
    if (nearbyMembers.length > 0) {
      // 有小队在附近，保持当前区域，小范围移动
      this._applyFormation();
      
      // 50% 概率保持移动，50% 概率停下观察
      if (Math.random() < 0.5) {
        this._applyBaseMovement();
      } else {
        // 停下，面向前方
        this.player.moveLeft = false;
        this.player.moveRight = false;
      }
    } else {
      // 没有小队成员在附近，主动靠拢
      const nearestMember = this._getNearestSquadMember();
      if (nearestMember) {
        this._moveToPosition(nearestMember.player.x, nearestMember.player.y);
        this._applyBaseMovement();
      } else {
        // 孤独一人，小范围随机移动
        this._applyBaseMovement();
        
        // 每 30 帧改变一次方向
        if (this.game.gameTime % 30 === 0) {
          this.moveDirection = Math.random() < 0.5 ? -1 : 1;
        }
      }
    }
  }
  
  // 获取附近的小队成员
  _getNearbySquadMembers(range) {
    return this.squadMembers.filter(ai => {
      if (!ai.player.alive || ai.player.isDowned) return false;
      const dist = Utils.distance(
        this.player.getCenterX(),
        this.player.getCenterY(),
        ai.player.getCenterX(),
        ai.player.getCenterY()
      );
      return dist < range;
    });
  }
  
  // 获取最近的小队成员
  _getNearestSquadMember() {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const ai of this.squadMembers) {
      if (!ai.player.alive || ai.player.isDowned) continue;
      
      const dist = Utils.distance(
        this.player.getCenterX(),
        this.player.getCenterY(),
        ai.player.getCenterX(),
        ai.player.getCenterY()
      );
      
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = ai;
      }
    }
    
    return nearest;
  }

  // 缓慢瞄准目标（替代原有的瞬间瞄准）
  _aimAtTargetSlowly(target, dt) {
    if (!target) return;

    const targetAngle = Utils.angleBetween(
      this.player.getCenterX(),
      this.player.getCenterY(),
      target.getCenterX(),
      target.getCenterY()
    );

    // 角度插值（平滑转向）
    let angleDiff = targetAngle - this.player.aimAngle;
    
    // 处理角度环绕（-PI 到 PI）
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // 限制每帧转动角度
    const maxRotation = this.aimSpeed * (dt / 16);  // 根据帧时间调整
    if (Math.abs(angleDiff) > maxRotation) {
      angleDiff = Math.sign(angleDiff) * maxRotation;
    }
    
    this.player.aimAngle += angleDiff;
    this.player.facingLeft = Math.cos(this.player.aimAngle) < 0;
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
