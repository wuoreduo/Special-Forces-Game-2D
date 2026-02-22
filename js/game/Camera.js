// 摄像机系统 - 跟随玩家，支持视锥剔除

class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.target = null;
    this.smooth = 0.1;
    this.zoom = 1;
    this.globalView = false;
    this.defaultZoom = 3;
  }

  // 设置跟随目标
  setTarget(target) {
    this.target = target;
  }

  // 更新摄像机位置
  update(mapWidth, mapHeight) {
    if (this.globalView) {
      this.zoom = 1;
      this.x = 0;
      this.y = 0;
      return;
    }

    if (!this.target) return;

    // 考虑缩放后的视野范围
    const viewWidth = this.width / this.zoom;
    const viewHeight = this.height / this.zoom;

    const targetX = this.target.x + this.target.width / 2 - viewWidth / 2;
    const targetY = this.target.y + this.target.height / 2 - viewHeight / 2;

    // 平滑跟随
    this.x = Utils.lerp(this.x, targetX, this.smooth);
    this.y = Utils.lerp(this.y, targetY, this.smooth);

    // 限制在地图范围内
    this.x = Utils.clamp(this.x, 0, Math.max(0, mapWidth - viewWidth));
    this.y = Utils.clamp(this.y, 0, Math.max(0, mapHeight - viewHeight));
  }

  // 切换全局/局部视角
  toggleGlobalView() {
    this.globalView = !this.globalView;
    if (this.globalView) {
      this.zoom = 1;
    } else {
      this.zoom = this.defaultZoom;
    }
  }

  // 设置全局视角
  setGlobalView(enabled) {
    this.globalView = enabled;
    this.zoom = enabled ? 1 : this.defaultZoom;
  }

  // 应用摄像机变换（用于渲染）
  apply(ctx) {
    // Canvas 变换是反向应用的（后调用的先应用）
    // 我们需要：先平移世界，再缩放
    // 所以代码顺序是：先 scale，再 translate
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  // 恢复摄像机变换
  reset(ctx) {
    // 反向变换
    ctx.translate(this.x, this.y);
    ctx.scale(1 / this.zoom, 1 / this.zoom);
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
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y
    };
  }

  // 转换世界坐标到屏幕坐标
  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom
    };
  }

  // 设置视口大小
  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}

window.Camera = Camera;
