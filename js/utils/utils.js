// 工具函数

const Utils = {
  // 线性插值
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // 限制范围
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  // 随机数范围
  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  },

  // 随机整数
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // 角度转弧度
  degToRad(degrees) {
    return degrees * Math.PI / 180;
  },

  // 弧度转角度
  radToDeg(radians) {
    return radians * 180 / Math.PI;
  },

  // 计算两点间角度
  angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  // 计算两点间距离
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // 计算两点间距离平方（避免开方，性能更好）
  distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  // 规范化向量
  normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  },

  // 矩形碰撞检测（AABB）
  rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
             r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
  },

  // 圆形碰撞检测
  circleIntersect(c1, c2) {
    const dist = this.distance(c1.x, c1.y, c2.x, c2.y);
    return dist < c1.radius + c2.radius;
  },

  // 点是否在矩形内
  pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
  },

  // 格式化时间（秒 -> MM:SS）
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // 深度克隆
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
};

// 向量工具
const Vec2 = {
  add(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  },

  subtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  },

  multiply(v, scalar) {
    return { x: v.x * scalar, y: v.y * scalar };
  },

  length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  normalize(v) {
    const len = this.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }
};
