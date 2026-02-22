// 物理系统 - AABB 碰撞检测 + 空间网格哈希优化

class PhysicsSystem {
  constructor() {
    this.gravity = 0.6;
    this.friction = 0.85;
    this.gridSize = 100;  // 空间网格大小
    this.spatialGrid = new Map();
  }

  // 更新物理
  update(entities, platforms, dt) {
    // 应用重力
    for (const entity of entities) {
      if (entity.active === false) continue;
      
      // 应用重力
      entity.vy += this.gravity;
      
      // 应用速度
      entity.x += entity.vx;
      entity.y += entity.vy;
      
      // 摩擦力
      entity.vx *= this.friction;
      
      // 限制最大速度
      entity.vx = Utils.clamp(entity.vx, -15, 15);
      entity.vy = Utils.clamp(entity.vy, -20, 20);
    }

    // 碰撞检测
    this._checkCollisions(entities, platforms);
  }

  // 碰撞检测
  _checkCollisions(entities, platforms) {
    // 构建空间网格
    this._buildSpatialGrid(entities);

    for (const entity of entities) {
      if (entity.active === false) continue;

      // 与平台碰撞
      this._checkPlatformCollisions(entity, platforms);

      // 实体间碰撞（可选，用于推开）
      this._checkEntityCollisions(entity, entities);
    }
  }

  // 构建空间网格
  _buildSpatialGrid(entities) {
    this.spatialGrid.clear();

    for (const entity of entities) {
      if (entity.active === false) continue;

      const gridX = Math.floor(entity.x / this.gridSize);
      const gridY = Math.floor(entity.y / this.gridSize);
      const key = `${gridX},${gridY}`;

      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key).push(entity);
    }
  }

  // 获取附近的实体
  _getNearbyEntities(entity) {
    const gridX = Math.floor(entity.x / this.gridSize);
    const gridY = Math.floor(entity.y / this.gridSize);
    const nearby = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }

    return nearby;
  }

  // 平台碰撞检测
  _checkPlatformCollisions(entity, platforms) {
    for (const platform of platforms) {
      if (this._rectIntersect(entity, platform)) {
        this._resolvePlatformCollision(entity, platform);
      }
    }

    // 地图边界
    this._checkMapBounds(entity);
  }

  // 解析平台碰撞
  _resolvePlatformCollision(entity, platform) {
    // 计算重叠量
    const overlapX = Math.min(
      entity.x + entity.width - platform.x,
      platform.x + platform.width - entity.x
    );
    const overlapY = Math.min(
      entity.y + entity.height - platform.y,
      platform.y + platform.height - entity.y
    );

    // 选择最小的重叠方向
    if (overlapX < overlapY) {
      // 水平碰撞
      if (entity.x < platform.x) {
        entity.x = platform.x - entity.width;
      } else {
        entity.x = platform.x + platform.width;
      }
      entity.vx = 0;
    } else {
      // 垂直碰撞
      if (entity.y < platform.y) {
        entity.y = platform.y - entity.height;
        entity.vy = 0;
        entity.onGround = true;
      } else {
        entity.y = platform.y + platform.height;
        entity.vy = 0;
        entity.onGround = false;
      }
    }
  }

  // 地图边界检测
  _checkMapBounds(entity) {
    // 左边界
    if (entity.x < 0) {
      entity.x = 0;
      entity.vx = 0;
    }
    // 右边界（由地图设置）
    if (entity.x > entity.mapWidth - entity.width) {
      entity.x = entity.mapWidth - entity.width;
      entity.vx = 0;
    }
    // 上边界
    if (entity.y < 0) {
      entity.y = 0;
      entity.vy = 0;
    }
    // 下边界（地面）
    if (entity.y > entity.mapHeight - entity.height) {
      entity.y = entity.mapHeight - entity.height;
      entity.vy = 0;
      entity.onGround = true;
    }
  }

  // 实体间碰撞（简单推开）
  _checkEntityCollisions(entity, entities) {
    const nearby = this._getNearbyEntities(entity);

    for (const other of nearby) {
      if (other === entity || other.active === false) continue;

      if (this._rectIntersect(entity, other)) {
        this._resolveEntityCollision(entity, other);
      }
    }
  }

  // 解析实体间碰撞
  _resolveEntityCollision(e1, e2) {
    const cx = (e1.x + e1.width / 2 + e2.x + e2.width / 2) / 2;
    const cy = (e1.y + e1.height / 2 + e2.y + e2.height / 2) / 2;

    const pushX = (e1.x + e1.width / 2 - cx) * 0.1;
    const pushY = (e1.y + e1.height / 2 - cy) * 0.1;

    e1.x += pushX;
    e1.y += pushY;
    e2.x -= pushX;
    e2.y -= pushY;
  }

  // AABB 矩形碰撞
  _rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
             r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
  }

  // 射线检测（用于 AI 视线）
  raycast(startX, startY, endX, endY, platforms) {
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = dist / 10;
    const stepX = dx / steps;
    const stepY = dy / steps;

    let x = startX;
    let y = startY;

    for (let i = 0; i < steps; i++) {
      x += stepX;
      y += stepY;

      for (const platform of platforms) {
        if (x >= platform.x && x <= platform.x + platform.width &&
            y >= platform.y && y <= platform.y + platform.height) {
          return {
            hit: true,
            x: x,
            y: y,
            distance: i * 10
          };
        }
      }
    }

    return { hit: false, distance: dist };
  }
}

window.PhysicsSystem = PhysicsSystem;
