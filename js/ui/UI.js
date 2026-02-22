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
    this.ammoCountEl = document.getElementById('ammoCount');
    this.reloadHintEl = document.getElementById('reloadHint');
    this.weaponNameEl = document.getElementById('weaponName');
    this.teammatesEl = document.getElementById('teammates');
    this.debugIndicatorEl = document.getElementById('debugIndicator');
    
    // 游戏结束元素
    this.winnerTextEl = document.getElementById('winnerText');
    this.finalBlueScoreEl = document.getElementById('finalBlueScore');
    this.finalRedScoreEl = document.getElementById('finalRedScore');
    
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
    this.selectedWeapon = 'pistol';
    
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
    
    if (healthPercent < 30) {
      this.playerHealthEl.classList.add('low');
    } else {
      this.playerHealthEl.classList.remove('low');
    }
    
    // 弹药
    if (player.weapon) {
      this.ammoCountEl.textContent = `${player.weapon.ammo}/${player.weapon.magazineSize}`;
      this.weaponNameEl.textContent = player.weapon.config.displayName;
      
      // 换弹提示
      if (player.weapon.ammo === 0 && !player.reloading) {
        this.reloadHintEl.classList.remove('hidden');
      } else {
        this.reloadHintEl.classList.add('hidden');
      }
    }
    
    // 队友状态
    this._updateTeammates();
    
    if (this.game.settings.debugGodMode) {
      this.debugIndicatorEl.classList.remove('hidden');
    } else {
      this.debugIndicatorEl.classList.add('hidden');
    }
  }

  // 更新队友状态
  _updateTeammates() {
    const player = this.game.currentPlayer;
    if (!player) return;
    
    const teammates = this.game.players.filter(p => 
      p.team === player.team && p !== player
    );
    
    this.teammatesEl.innerHTML = '';
    
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

  // 键盘按下
  _handleKeyDown(e) {
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
      case 'KeyV':
        this.game.camera.toggleGlobalView();
        break;
      case 'KeyU':
        this.game.settings.debugGodMode = !this.game.settings.debugGodMode;
        
        const teamPlayers = this.game.players.filter(p => p.team === this.game.settings.playerTeam);
        
        if (this.game.settings.debugGodMode) {
          for (const p of teamPlayers) {
            if (p.isControlled) {
              p.maxHealth = 1000;
              p.health = 1000;
            }
          }
        } else {
          for (const p of teamPlayers) {
            if (p.maxHealth === 1000) {
              p.maxHealth = 100;
              p.health = Math.min(p.health, 100);
            }
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
}

window.UIManager = UIManager;
