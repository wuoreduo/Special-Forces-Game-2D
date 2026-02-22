// 游戏主类 - 游戏循环、状态管理

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 调整画布大小
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
    
    // 游戏系统
    this.renderer = new Renderer(this.canvas);
    this.physics = new PhysicsSystem();
    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.camera.defaultZoom = 3;  // 视野缩小为 1/3（放大 3 倍）
    this.camera.zoom = 3;
    this.map = new GameMap();
    this.ui = new UIManager(this);
    this.audio = window.AudioSystem;
    
    // 游戏状态
    this.state = 'menu';  // menu, playing, gameover
    this.gameTime = 0;
    this.timeLeft = 300;
    this.lastFrameTime = 0;
    this.lastAIUpdate = 0;
    
    // 游戏设置
    this.settings = {
      playerTeam: 'blue',
      playerWeapon: 'pistol',
      gameDuration: 300,
      targetKills: 50,
      debugGodMode: false
    };
    
    // 实体
    this.players = [];
    this.bullets = [];
    this.particles = [];
    
    // 对象池
    Game.bulletPool = new ObjectPool(
      () => new Projectile(),
      (b) => b.reset(),
      100
    );
    
    Game.particlePool = new ObjectPool(
      () => new Particle(),
      (p) => p.reset(),
      200
    );
    
    this.bulletPool = Game.bulletPool;
    this.particlePool = Game.particlePool;
    
    // 计分
    this.scores = {
      blue: 0,
      red: 0
    };
    
    // 击杀信息
    this.killFeed = [];
    this.killFeedDuration = 3000;
    
    // 当前控制玩家
    this.currentPlayer = null;
    this.playerIndex = 0;
    
    // AI 控制器
    this.aiControllers = [];
    
    // 平台
    this.platforms = this.map.getPlatforms();
    
    // 开始游戏循环
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // 调整画布大小
  _resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    if (this.renderer) {
      this.renderer.resize(this.canvas.width, this.canvas.height);
    }
    if (this.camera) {
      this.camera.resize(this.canvas.width, this.canvas.height);
    }
  }

  // 游戏主循环
  gameLoop(timestamp) {
    const dt = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    if (this.state === 'playing') {
      this.gameTime = timestamp;
      
      // 更新游戏时间
      this._updateGameTime(dt);
      
      // AI 更新（30 FPS）
      if (timestamp - this.lastAIUpdate > 33) {
        this._updateAI(timestamp, dt);
        this.lastAIUpdate = timestamp;
      }
      
      // 更新实体
      this._update(dt);
      
      // 渲染
      this._render();
      
      // 更新 UI
      this.ui.updateHUD();
    } else if (this.state === 'paused') {
      // 暂停时继续渲染游戏画面
      this._render();
    } else if (this.state === 'menu') {
      this._render();
    }
    
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // 更新游戏时间
  _updateGameTime(dt) {
    this.timeLeft -= dt / 1000;
    
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this._endGame();
    }
  }

  // 更新 AI
  _updateAI(timestamp, dt) {
    for (const ai of this.aiControllers) {
      ai.update(timestamp, dt);
    }
  }

  // 处理射击
  _handleShooting() {
    for (const player of this.players) {
      if (!player.alive || !player.weapon) continue;
      
      // 玩家控制或 AI 射击
      if (player.shooting) {
        player.shoot(this.gameTime);
      }
    }
  }

  // 更新实体
  _update(dt) {
    // 处理射击
    this._handleShooting();
    
    // 更新玩家
    for (const player of this.players) {
      player.update(dt, this.platforms);
    }
    
    // 物理更新
    this.physics.update(this.players, this.platforms, dt);
    
    // 更新子弹
    this.bulletPool.update(dt / 1000, (bullet) => bullet.update(dt / 1000));
    
    // 更新粒子
    this.particlePool.update(dt / 1000, (particle) => particle.update(dt / 1000));
    
    // 子弹碰撞检测
    this._checkBulletCollisions();
    
    // 近战检测
    this._checkMeleeCollisions();
    
    // 检查重生
    this._checkRespawns();
    
    // 更新击杀信息
    this._updateKillFeed(dt);
    
    // 更新摄像机
    if (this.currentPlayer && this.currentPlayer.alive) {
      this.camera.setTarget(this.currentPlayer);
    }
    this.camera.update(this.map.width, this.map.height);
    
    // 检查胜利条件
    this._checkVictory();
  }

  // 子弹碰撞检测
  _checkBulletCollisions() {
    for (const bullet of this.bulletPool.active) {
      if (!bullet.active || bullet.isVisualOnly) continue;
      
      for (const player of this.players) {
        if (!player.alive || player.team === bullet.team) continue;
        
        const hitResult = player.checkBulletHit(bullet);
        
        if (hitResult.hit) {
          const wasAlive = player.health > 0;
          
          let damage = bullet.getDamage();
          
          if (hitResult.isHead) {
            damage *= 2.5;
            this._createHeadshotText(player.x, player.y);
          }
          
          player.takeDamage(damage, bullet.owner);
          
          this._createHitEffect(bullet.x, bullet.y);
          
          if (!player.alive && wasAlive) {
            this._createBloodSplatter(player.x + player.width/2, player.y + player.height/2);
            if (bullet.owner) {
              this._createKillFeed(bullet.owner, player);
            }
          }
          
          if (this.audio) {
            this.audio.playHit();
          }
          
          this.bulletPool.release(bullet);
          
          if (!player.alive) {
            this.scores[bullet.team]++;
          }
          
          break;
        }
      }
    }
  }

  // 近战碰撞检测
  _checkMeleeCollisions() {
    for (const player of this.players) {
      if (!player.meleeAttacking) continue;
      
      const meleeRange = player.getMeleeRange();
      const enemyTeam = player.team === 'blue' ? 'red' : 'blue';
      
      for (const enemy of this.players) {
        if (!enemy.alive || enemy.team !== enemyTeam) continue;
        
        if (Utils.rectIntersect(meleeRange, enemy)) {
          const wasAlive = enemy.alive;
          enemy.takeDamage(50, player);
          
          if (!enemy.alive && wasAlive) {
            this.scores[player.team]++;
            this._createKillFeed(player, enemy);
          }
        }
      }
    }
  }

  // 创建命中效果
  _createHitEffect(x, y) {
    const particle = this.particlePool.get();
    particle.spawn(x, y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 4, 15, '#ff6b6b', 0);
  }

  _createBloodSplatter(x, y) {
    const count = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const particle = this.particlePool.get();
      particle.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        3 + Math.random() * 4,
        30 + Math.random() * 20,
        '#8b0000',
        0.3
      );
    }
  }

  _createHeadshotText(x, y) {
    const particle = this.particlePool.get();
    particle.spawnHeadshotText(x, y);
  }

  // 创建击杀信息
  _createKillFeed(killer, victim) {
    const entry = {
      killerName: killer.name,
      killerTeam: killer.team,
      victimName: victim.name,
      victimTeam: victim.team,
      time: this.gameTime,
      alpha: 1
    };
    this.killFeed.unshift(entry);
    
    // 限制最大显示数量
    if (this.killFeed.length > 5) {
      this.killFeed.pop();
    }
    
    // 播放击杀音效
    if (this.audio) {
      this.audio.playKill();
    }
  }

  // 更新击杀信息
  _updateKillFeed(dt) {
    for (let i = this.killFeed.length - 1; i >= 0; i--) {
      const entry = this.killFeed[i];
      const elapsed = this.gameTime - entry.time;
      
      if (elapsed > this.killFeedDuration) {
        this.killFeed.splice(i, 1);
      } else if (elapsed > this.killFeedDuration - 500) {
        entry.alpha = (this.killFeedDuration - elapsed) / 500;
      }
    }
  }


  // 检查重生
  _checkRespawns() {
    const spawnDelay = 3000;  // 3 秒重生
    
    for (const player of this.players) {
      if (!player.alive && player.deadTime > spawnDelay) {
        const spawnPoints = this.map.getSpawnPoints(player.team);
        const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        player.respawn(spawnPoint.x, spawnPoint.y);
      }
    }
  }

  // 检查胜利条件
  _checkVictory() {
    // 检查是否达到目标击杀数
    if (this.scores.blue >= this.settings.targetKills) {
      this._endGame('blue');
    } else if (this.scores.red >= this.settings.targetKills) {
      this._endGame('red');
    }
  }

  // 结束游戏
  _endGame(winner) {
    this.state = 'gameover';
    this.ui.showGameOver(winner, this.scores.blue, this.scores.red);
  }

  // 渲染
  _render() {
    // 清除
    this.renderer.clear();
    this.renderer.drawBackground();
    
    // 应用摄像机
    this.ctx.save();
    this.camera.apply(this.ctx);
    
    // 绘制地图（在摄像机变换后绘制）
    this.renderer.drawMap(this.camera, this.map.platforms);
    
    // 绘制玩家
    for (const player of this.players) {
      this.renderer.drawPlayer(player, this.camera);
    }
    
    // 绘制子弹
    this.bulletPool.draw(this.ctx, (bullet, ctx) => {
      this.renderer.drawBullet(bullet, this.camera);
    });
    
    // 绘制粒子
    this.particlePool.draw(this.ctx, (particle, ctx) => {
      particle.draw(ctx, this.camera);
    });
    
    this.ctx.restore();
    
    // 绘制击杀信息（屏幕固定位置，不受摄像机影响）
    if (this.killFeed.length > 0) {
      this.renderer.drawKillFeed(this.killFeed);
    }
  }

  // 开始游戏
  start(settings) {
    // 初始化音频
    if (this.audio) {
      this.audio.init();
    }
    
    // 保存设置
    this.settings = { ...this.settings, ...settings };
    this.timeLeft = this.settings.gameDuration;
    
    // 重置计分
    this.scores = { blue: 0, red: 0 };
    
    // 重置击杀信息
    this.killFeed = [];
    
    // 隐藏排行榜面板
    if (this.ui.leaderboardPanel) {
      this.ui.leaderboardPanel.classList.add('hidden');
    }
    
    // 缓存地图
    this.renderer.cacheMap(this.map.platforms);
    
    // 创建玩家
    this._createPlayers();
    
    // 设置当前玩家
    this._updateCurrentPlayer();
    
    // 更新 UI
    this.ui.showGameHUD();
    
    // 游戏状态
    this.state = 'playing';
    this.gameTime = performance.now();
    this.lastFrameTime = this.gameTime;
  }

  // 创建玩家
  _createPlayers() {
    this.players = [];
    this.aiControllers = [];
    
    const blueSpawns = this.map.getSpawnPoints('blue');
    const redSpawns = this.map.getSpawnPoints('red');
    
    // 主武器列表（不含手枪）
    const mainWeapons = ['rifle', 'smg', 'sniper', 'shotgun'];
    
    // 创建蓝队
    for (let i = 0; i < 5; i++) {
      const spawn = blueSpawns[i];
      const isPlayer = (i === 0 && this.settings.playerTeam === 'blue');
      const player = new Player(spawn.x, spawn.y, 'blue', isPlayer);
      
      // 设置武器
      if (isPlayer) {
        player.setWeapon(WEAPONS[this.settings.playerWeapon]);
      } else {
        const randomWeapon = mainWeapons[Math.floor(Math.random() * mainWeapons.length)];
        player.setWeapon(WEAPONS[randomWeapon]);
      }
      
      // 设置副武器（手枪）
      player.setSecondaryWeapon(WEAPONS.pistol);
      
      player.setMapBounds(this.map.width, this.map.height);
      player.setPlatforms(this.platforms);
      this.players.push(player);
      
      // 创建 AI
      if (!isPlayer) {
        const ai = new AIController(player, this);
        ai.setPatrolPoint(spawn.x);
        this.aiControllers.push(ai);
      }
    }
    
    // 创建红队
    for (let i = 0; i < 5; i++) {
      const spawn = redSpawns[i];
      const isPlayer = (i === 0 && this.settings.playerTeam === 'red');
      const player = new Player(spawn.x, spawn.y, 'red', isPlayer);
      
      // 设置武器
      if (isPlayer) {
        player.setWeapon(WEAPONS[this.settings.playerWeapon]);
      } else {
        const randomWeapon = mainWeapons[Math.floor(Math.random() * mainWeapons.length)];
        player.setWeapon(WEAPONS[randomWeapon]);
      }
      
      // 设置副武器（手枪）
      player.setSecondaryWeapon(WEAPONS.pistol);
      
      player.setMapBounds(this.map.width, this.map.height);
      player.setPlatforms(this.platforms);
      this.players.push(player);
      
      // 创建 AI
      if (!isPlayer) {
        const ai = new AIController(player, this);
        ai.setPatrolPoint(spawn.x);
        this.aiControllers.push(ai);
      }
    }
  }

  // 更新当前控制玩家
  _updateCurrentPlayer() {
    const teamPlayers = this.players.filter(p => p.team === this.settings.playerTeam);
    
    const prevControlledPlayer = teamPlayers.find(p => p.isControlled);
    
    for (const player of teamPlayers) {
      player.isControlled = (player === teamPlayers[this.playerIndex]);
    }
    
    if (prevControlledPlayer && prevControlledPlayer !== teamPlayers[this.playerIndex]) {
      const existingAI = this.aiControllers.find(ai => ai.player === prevControlledPlayer);
      if (!existingAI) {
        const newAI = new AIController(prevControlledPlayer, this);
        const spawnPoints = this.map.getSpawnPoints(prevControlledPlayer.team);
        const spawnPoint = spawnPoints[0];
        newAI.setPatrolPoint(spawnPoint ? spawnPoint.x : prevControlledPlayer.x);
        this.aiControllers.push(newAI);
      }
      
      if (prevControlledPlayer.maxHealth === 1000) {
        prevControlledPlayer.maxHealth = 100;
        prevControlledPlayer.health = Math.min(prevControlledPlayer.health, 100);
      }
    }
    
    this.currentPlayer = teamPlayers[this.playerIndex] || teamPlayers[0];
    
    if (this.settings.debugGodMode && this.currentPlayer.maxHealth === 100) {
      this.currentPlayer.maxHealth = 1000;
      this.currentPlayer.health = Math.max(this.currentPlayer.health, 1000);
    }
    
    this.camera.setTarget(this.currentPlayer);
  }

  // 切换到下一个队友
  switchTeammate() {
    const teamPlayers = this.players.filter(p => p.team === this.settings.playerTeam && p.alive);
    if (teamPlayers.length <= 1) return;
    
    this.playerIndex = (this.playerIndex + 1) % teamPlayers.length;
    this._updateCurrentPlayer();
  }

  // 切换到指定队友
  switchToTeammate(index) {
    const teamPlayers = this.players.filter(p => p.team === this.settings.playerTeam && p.alive);
    if (index >= 0 && index < teamPlayers.length) {
      this.playerIndex = index;
      this._updateCurrentPlayer();
    }
  }

  // 重新开始
  restart() {
    this.start(this.settings);
  }
}

window.Game = Game;
