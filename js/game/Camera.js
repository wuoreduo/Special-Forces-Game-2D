// 摄像机系统 - 跟随玩家，支持视锥剔除

class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.target = null;
    this.smooth = 0.1;  // 平滑系数
    this.zoom = 1;  // 缩放比例
  }

  // 设置跟随目标
  setTarget(target) {
    this.target = target;
  }

  // 更新摄像机位置
  update(mapWidth, mapHeight) {
    if (!this.target) return;

    const targetX = this.target.x - this.width / 2;
    const targetY = this.target.y - this.height / 2;

    // 平滑跟随
    this.x = Utils.lerp(this.x, targetX, this.smooth);
    this.y = Utils.lerp(this.y, targetY, this.smooth);

    // 限制在地图范围内
    this.x = Utils.clamp(this.x, 0, Math.max(0, mapWidth - this.width));
    this.y = Utils.clamp(this.y, 0, Math.max(0, mapHeight - this.height));
  }

  // 应用摄像机变换（用于渲染）
  apply(ctx) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    
    // 平移到屏幕中心
    ctx.translate(cx, cy);
    // 缩放
    ctx.scale(this.zoom, this.zoom);
    // 平移回并应用摄像机偏移
    ctx.translate(-cx - this.x, -cy - this.y);
  }

  // 恢复摄像机变换
  reset(ctx) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    
    // 反向变换：与 apply 相反
    ctx.translate(cx + this.x, cy + this.y);
    ctx.scale(1 / this.zoom, 1 / this.zoom);
    ctx.translate(-cx, -cy);
  }

  // 检查对象是否在视野内（视锥剔除）
  isInView(obj, margin = 0) {
    const viewLeft = this.x - margin;
    const viewRight = this.x + this.width + margin;
    const viewTop = this.y - margin;
    const viewBottom = this.y + this.height + margin;

    // 简单的 AABB 检测
    if (obj.x + obj.width < viewLeft) return false;
    if (obj.x > viewRight) return false;
    if (obj.y + obj.height < viewTop) return false;
    if (obj.y > viewBottom) return false;

    return true;
  }

  // 检查圆形对象是否在视野内
  isCircleInView(obj, margin = 0) {
    const viewLeft = this.x - margin;
    const viewRight = this.x + this.width + margin;
    const viewTop = this.y - margin;
    const viewBottom = this.y + this.height + margin;

    // 圆形与矩形检测
    const closestX = Utils.clamp(obj.x, viewLeft, viewRight);
    const closestY = Utils.clamp(obj.y, viewTop, viewBottom);

    const dx = obj.x - closestX;
    const dy = obj.y - closestY;

    return (dx * dx + dy * dy) <= (obj.radius * obj.radius);
  }

  // 转换屏幕坐标到世界坐标
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y
    };
  }

  // 转换世界坐标到屏幕坐标
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y
    };
  }

  // 设置视口大小
  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}

window.Camera = Camera;
