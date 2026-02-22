// 实体基类

class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.active = true;
    this.mapWidth = 2000;
    this.mapHeight = 1200;
  }

  // 更新实体
  update(dt) {
    // 由子类实现
  }

  // 绘制实体
  draw(renderer, camera) {
    // 由子类实现
  }

  // 获取中心点
  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }

  // 设置地图边界
  setMapBounds(width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
  }
}

window.Entity = Entity;
