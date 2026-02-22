// 地图系统 - 三层平台结构

class GameMap {
  constructor() {
    this.width = 2000;
    this.height = 1200;
    this.platforms = [];
    this.spawnPoints = {
      blue: [],
      red: []
    };
    
    this._generateMap();
  }

  // 生成地图
  _generateMap() {
    // 地面
    this.platforms.push({
      x: 0,
      y: this.height - 30,
      width: this.width,
      height: 30
    });

    // 第一层平台（底层）- 完整长平台
    this.platforms.push({
      x: 200,
      y: this.height - 150,
      width: 1600,
      height: 25
    });

    // 第二层平台（中层）- 分成两段
    this.platforms.push({
      x: 200,
      y: this.height - 280,
      width: 700,
      height: 25
    });
    this.platforms.push({
      x: 1100,
      y: this.height - 280,
      width: 700,
      height: 25
    });

    // 第三层平台（顶层）- 分成三段
    this.platforms.push({
      x: 200,
      y: this.height - 410,
      width: 450,
      height: 25
    });
    this.platforms.push({
      x: 775,
      y: this.height - 410,
      width: 450,
      height: 25
    });
    this.platforms.push({
      x: 1350,
      y: this.height - 410,
      width: 450,
      height: 25
    });

    // 边界墙（防止掉出）
    this.platforms.push({
      x: -30,
      y: 0,
      width: 30,
      height: this.height
    });
    this.platforms.push({
      x: this.width,
      y: 0,
      width: 30,
      height: this.height
    });

    // 生成点
    this._generateSpawnPoints();
  }

  // 生成队伍出生点
  _generateSpawnPoints() {
    // 蓝队出生点（左侧）
    this.spawnPoints.blue = [
      { x: 100, y: this.height - 100 },
      { x: 150, y: this.height - 200 },
      { x: 250, y: this.height - 330 },
      { x: 300, y: this.height - 460 },
      { x: 400, y: this.height - 200 }
    ];

    // 红队出生点（右侧）
    this.spawnPoints.red = [
      { x: this.width - 100, y: this.height - 100 },
      { x: this.width - 150, y: this.height - 200 },
      { x: this.width - 250, y: this.height - 330 },
      { x: this.width - 300, y: this.height - 460 },
      { x: this.width - 400, y: this.height - 200 }
    ];
  }

  // 获取平台
  getPlatforms() {
    return this.platforms;
  }

  // 获取队伍出生点
  getSpawnPoints(team) {
    return this.spawnPoints[team] || [];
  }

  // 获取地图尺寸
  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }

  // 绘制地图（调试用）
  draw(ctx, camera) {
    for (const platform of this.platforms) {
      if (camera.isInView(platform, 0)) {
        const gradient = ctx.createLinearGradient(
          platform.x, platform.y,
          platform.x, platform.y + platform.height
        );
        gradient.addColorStop(0, '#4a5568');
        gradient.addColorStop(1, '#2d3748');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // 顶部高光
        ctx.fillStyle = '#718096';
        ctx.fillRect(platform.x, platform.y, platform.width, 3);
      }
    }
  }
}

window.GameMap = GameMap;
