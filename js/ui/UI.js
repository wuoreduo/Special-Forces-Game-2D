// UI 系统 - 菜单、HUD、游戏结束界面

class UIManager {
  constructor(game) {
    this.game = game;
    
    // UI 元素
    this.mainMenu = document.getElementById('mainMenu');
    this.gameHUD = document.getElementById('gameHUD');
    this.gameOver = document.getElementById('gameOver');
    
    // HUD 元素
    this.blueScoreEl = document.getElementById('blueScore');
    this.redScoreEl = document.getElementById('redScore');
    this.gameTimerEl = document.getElementById('gameTimer');
    this.playerHealthEl = document.getElementById('playerHealth');
    this.healthValueEl = document.getElementById('healthValue');
    this.ammoDotsEl = document.getElementById('ammoDots');
    this.ammoCountTextEl = document.getElementById('ammoCountText');
    this.reloadHintEl = document.getElementById('reloadHint');
    this.weaponNameEl = document.getElementById('weaponName');
    this.secondaryWeaponNameEl = document.getElementById('secondaryWeaponName');
    this.teammatesEl = document.getElementById('teammates');
    this.debugIndicatorEl = document.getElementById('debugIndicator');
    
    // 游戏结束元素
    this.winnerTextEl = document.getElementById('winnerText');
    this.finalBlueScoreEl = document.getElementById('finalBlueScore');
    this.finalRedScoreEl = document.getElementById('finalRedScore');
    
    // 排行榜元素
    this.leaderboardPanel = document.getElementById('leaderboardPanel');
    this.blueTeamList = document.getElementById('blueTeamList');
    this.redTeamList = document.getElementById('redTeamList');
    
    // 按钮
    this.startBtn = document.getElementById('startBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.menuBtn = document.getElementById('menuBtn');
    
    // 选择器
    this.teamBtns = document.querySelectorAll('.team-btn');
    this.weaponBtns = document.querySelectorAll('.weapon-btn');
    this.durationSelect = document.getElementById('gameDuration');
    this.targetKillsSelect = document.getElementById('targetKills');
    
    // 当前选择
    this.selectedTeam = 'blue';
    this.selectedWeapon = 'rifle';
    
    this._bindEvents();
  }

  // 绑定事件
  _bindEvents() {
    // 开始按钮
    this.startBtn.addEventListener('click', () => {
      this._startGame();
    });

    // 重新开始
    this.restartBtn.addEventListener('click', () => {
      this.game.restart();
    });

    // 返回菜单
    this.menuBtn.addEventListener('click', () => {
      this.showMainMenu();
    });

    // 队伍选择
    this.teamBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.teamBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTeam = btn.dataset.team;
      });
    });

    // 武器选择
    this.weaponBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.weaponBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedWeapon = btn.dataset.weapon;
      });
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      this._handleKeyDown(e);
    });

    document.addEventListener('keyup', (e) => {
      this._handleKeyUp(e);
    });

    // 鼠标事件
    document.addEventListener('mousemove', (e) => {
      this._handleMouseMove(e);
    });

    document.addEventListener('mousedown', (e) => {
      this._handleMouseDown(e);
    });

    document.addEventListener('mouseup', (e) => {
      this._handleMouseUp(e);
    });
  }

  // 开始游戏
  _startGame() {
    const duration = parseInt(this.durationSelect.value);
    const targetKills = parseInt(this.targetKillsSelect.value);
    
    this.game.start({
      playerTeam: this.selectedTeam,
      playerWeapon: this.selectedWeapon,
      gameDuration: duration,
      targetKills: targetKills
    });
  }

  // 显示主菜单
  showMainMenu() {
    this.mainMenu.classList.remove('hidden');
    this.gameHUD.classList.add('hidden');
    this.gameOver.classList.add('hidden');
    this.game.state = 'menu';
  }

  // 显示游戏 HUD
  showGameHUD() {
    this.mainMenu.classList.add('hidden');
    this.gameHUD.classList.remove('hidden');
    this.gameOver.classList.add('hidden');
  }

  // 显示游戏结束
  showGameOver(winner, blueScore, redScore) {
    this.mainMenu.classList.add('hidden');
    this.gameHUD.classList.add('hidden');
    this.gameOver.classList.remove('hidden');
    
    if (winner === 'blue') {
      this.winnerTextEl.textContent = '🔵 蓝队获胜!';
      this.winnerTextEl.style.color = '#4299e1';
    } else if (winner === 'red') {
      this.winnerTextEl.textContent = '🔴 红队获胜!';
      this.winnerTextEl.style.color = '#f56565';
    } else {
      this.winnerTextEl.textContent = '平局!';
      this.winnerTextEl.style.color = '#a0aec0';
    }
    
    this.finalBlueScoreEl.textContent = blueScore;
    this.finalRedScoreEl.textContent = redScore;
  }

  // 更新 HUD
  updateHUD() {
    if (!this.game.currentPlayer) return;
    
    // 分数
    this.blueScoreEl.textContent = this.game.scores.blue;
    this.redScoreEl.textContent = this.game.scores.red;
    
    // 时间
    const timeLeft = this.game.timeLeft;
    const mins = Math.floor(timeLeft / 60);
    const secs = Math.floor(timeLeft % 60);
    this.gameTimerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // 血量
    const player = this.game.currentPlayer;
    const healthPercent = (player.health / player.maxHealth) * 100;
    this.playerHealthEl.style.width = `${healthPercent}%`;
    
    // HP 数值（整数）
    const currentHP = Math.floor(player.health);
    const maxHP = Math.floor(player.maxHealth);
    this.healthValueEl.textContent = `${currentHP}/${maxHP}`;
    
    if (healthPercent < 30) {
      this.playerHealthEl.classList.add('low');
    } else {
      this.playerHealthEl.classList.remove('low');
    }
    
    // 弹药圆点
    if (player.weapon) {
      this._drawAmmoDots(player);
      this.weaponNameEl.textContent = player.weapon.config.displayName;
      
      // 换弹提示
      if (player.weapon.ammo === 0 && !player.reloading) {
        this.reloadHintEl.classList.remove('hidden');
      } else {
        this.reloadHintEl.classList.add('hidden');
      }
    }
    
    // 副武器显示
    if (player.secondaryWeapon) {
      this.secondaryWeaponNameEl.textContent = `| 副武器: ${player.secondaryWeapon.config.displayName}`;
    } else {
      this.secondaryWeaponNameEl.textContent = '';
    }
    
    // 队友状态
    this._updateTeammates();
    
    if (this.game.settings.debugGodMode) {
      this.debugIndicatorEl.classList.remove('hidden');
    } else {
      this.debugIndicatorEl.classList.add('hidden');
    }
  }

  // 绘制弹药圆点
  _drawAmmoDots(player) {
    if (!player.weapon || !player.weapon.magazineSize) {
      this.ammoDotsEl.innerHTML = '';
      this.ammoCountTextEl.textContent = '';
      return;
    }
    
    const currentAmmo = player.weapon.ammo;
    const maxAmmo = player.weapon.magazineSize;
    
    this.ammoDotsEl.innerHTML = '';
    
    for (let i = 0; i < maxAmmo; i++) {
      const dot = document.createElement('div');
      dot.className = 'ammo-dot';
      if (i >= currentAmmo) {
        dot.classList.add('empty');
      }
      this.ammoDotsEl.appendChild(dot);
    }
    
    this.ammoCountTextEl.textContent = `${currentAmmo}/${maxAmmo}`;
  }

  // 更新队友状态
  _updateTeammateIcons() {
    this.teammatesEl.innerHTML = '';
    
    const player = this.game.currentPlayer;
    if (!player) return;
    
    const teammates = this.game.players.filter(p => 
      p.team === player.team && p !== player
    );
    
    for (const teammate of teammates) {
      const icon = document.createElement('div');
      icon.className = 'teammate-icon';
      
      if (!teammate.alive) {
        icon.classList.add('dead');
        icon.textContent = '💀';
      } else {
        icon.classList.add('alive');
        icon.textContent = '👤';
      }
      
      if (teammate === player) {
        icon.classList.add('current');
      }
      
      this.teammatesEl.appendChild(icon);
    }
  }
  
  // 寻找最近的倒地队友
  _findNearestDownedTeammate(player) {
    const rescueRange = 50;
    const teammates = this.game.players.filter(p => 
      p.team === player.team && 
      p.isDowned && 
      p.alive &&
      p !== player
    );
    
    if (teammates.length === 0) return null;
    
    let nearestDowned = null;
    let nearestDist = rescueRange * 2;
    
    for (const downed of teammates) {
      const dist = Utils.distance(
        player.getCenterX(),
        player.getCenterY(),
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
      
      if (teammate === player) {
        icon.classList.add('current');
      }
      
      this.teammatesEl.appendChild(icon);
    }
  }

  // 键盘按下
  _handleKeyDown(e) {
    // P 键暂停处理
    if (e.code === 'KeyP') {
      if (this.game.state === 'playing') {
        this.game.state = 'paused';
        this._updateLeaderboard();
        this.leaderboardPanel.classList.remove('hidden');
      } else if (this.game.state === 'paused') {
        this.game.state = 'playing';
        this.leaderboardPanel.classList.add('hidden');
      }
      return;
    }
    
    if (this.game.state !== 'playing') return;
    
    const player = this.game.currentPlayer;
    if (!player) return;
    
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        break;
      case 'KeyA':
      case 'ArrowLeft':
        player.moveLeft = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        player.crouching = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        player.moveRight = true;
        break;
      case 'Space':
        player.jumpHeld = true;
        break;
      case 'KeyR':
        player.startReload();
        break;
      case 'KeyF':
        player.melee(this.game.gameTime);
        break;
      case 'KeyE':
        // 救援队友
        if (player.isRescuing) {
          player.cancelRescue();
        } else {
          const downedTeammate = this._findNearestDownedTeammate(player);
          if (downedTeammate) {
            player.startRescue(downedTeammate);
          }
        }
        break;
      case 'KeyV':
        this.game.camera.toggleGlobalView();
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.game.camera.zoomIn();
        break;
      case 'Minus':
      case 'NumpadSubtract':
        this.game.camera.zoomOut();
        break;
      case 'KeyQ':
        player.swapWeapon();
        break;
      case 'KeyU':
        this.game.settings.debugGodMode = !this.game.settings.debugGodMode;
        
        const teamPlayers = this.game.players.filter(p => p.team === this.game.settings.playerTeam);
        
        for (const p of teamPlayers) {
          if (p.isControlled) {
            p.invincible = this.game.settings.debugGodMode;
            p.maxHealth = 100;
            p.health = 100;
          }
        }
        
        if (this.game.audio) {
          this.game.audio.playHit();
        }
        break;
      case 'Tab':
        e.preventDefault();
        this.game.switchTeammate();
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        this.game.switchToTeammate(parseInt(e.code.replace('Digit', '')) - 1);
        break;
    }
  }

  // 键盘抬起
  _handleKeyUp(e) {
    if (this.game.state !== 'playing') return;
    
    const player = this.game.currentPlayer;
    if (!player) return;
    
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        player.moveLeft = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        player.crouching = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        player.moveRight = false;
        break;
      case 'Space':
        player.jumpHeld = false;
        break;
    }
  }

  // 鼠标移动
  _handleMouseMove(e) {
    if (this.game.state !== 'playing') return;
    
    const player = this.game.currentPlayer;
    if (!player || !player.alive) return;
    
    const rect = this.game.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 转换屏幕坐标到世界坐标
    const worldPos = this.game.camera.screenToWorld(mouseX, mouseY);
    
    // 计算瞄准角度
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    player.aimAngle = Utils.angleBetween(
      playerCenterX, playerCenterY,
      worldPos.x, worldPos.y
    );
    
    // 设置朝向
    player.facingLeft = Math.cos(player.aimAngle) < 0;
  }

  // 鼠标按下
  _handleMouseDown(e) {
    if (this.game.state !== 'playing') return;
    if (e.button !== 0) return;  // 只处理左键
    
    const player = this.game.currentPlayer;
    if (!player || !player.alive) return;
    
    player.shooting = true;
  }

  // 鼠标抬起
  _handleMouseUp(e) {
    if (this.game.state !== 'playing') return;
    if (e.button !== 0) return;
    
    const player = this.game.currentPlayer;
    if (!player) return;
    
    player.shooting = false;
  }

  // 更新排行榜
  _updateLeaderboard() {
    const bluePlayers = this.game.players
      .filter(p => p.team === 'blue')
      .sort((a, b) => b.kills - a.kills);
    
    const redPlayers = this.game.players
      .filter(p => p.team === 'red')
      .sort((a, b) => b.kills - a.kills);
    
    this.blueTeamList.innerHTML = '';
    for (const p of bluePlayers) {
      const entry = document.createElement('div');
      entry.className = 'leaderboard-entry' + (p.isControlled ? ' player' : '');
      entry.innerHTML = `
        <span class="name">${p.name}</span>
        <div class="stats">
          <span class="kills">${p.kills} 杀</span>
          <span class="deaths">${p.deaths} 死</span>
        </div>
      `;
      this.blueTeamList.appendChild(entry);
    }
    
    this.redTeamList.innerHTML = '';
    for (const p of redPlayers) {
      const entry = document.createElement('div');
      entry.className = 'leaderboard-entry' + (p.isControlled ? ' player' : '');
      entry.innerHTML = `
        <span class="name">${p.name}</span>
        <div class="stats">
          <span class="kills">${p.kills} 杀</span>
          <span class="deaths">${p.deaths} 死</span>
        </div>
      `;
      this.redTeamList.appendChild(entry);
    }
  }
}

window.UIManager = UIManager;
