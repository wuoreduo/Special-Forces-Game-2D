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
  },

  // 射线与矩形相交检测（SLAB 方法）
  // 返回 { hit: boolean, point: {x, y}, distance: number }
  raycastRect(originX, originY, dirX, dirY, rectX, rectY, rectW, rectH) {
    const invDirX = 1 / dirX;
    const invDirY = 1 / dirY;
    
    let tmin = (rectX - originX) * invDirX;
    let tmax = (rectX + rectW - originX) * invDirX;
    
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    
    let tymin = (rectY - originY) * invDirY;
    let tymax = (rectY + rectH - originY) * invDirY;
    
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    
    if (tmin > tymax || tymin > tmax) {
      return { hit: false };
    }
    
    const tEnter = Math.max(tmin, tymin);
    const tExit = Math.min(tmax, tymax);
    
    if (tEnter < 0 && tExit < 0) {
      return { hit: false };
    }
    
    const tHit = tEnter < 0 ? tExit : tEnter;
    
    if (tHit < 0) {
      return { hit: false };
    }
    
    return {
      hit: true,
      point: {
        x: originX + dirX * tHit,
        y: originY + dirY * tHit
      },
      distance: tHit
    };
  },

  // 射线与线段相交（用于墙壁检测）
  raycastSegment(originX, originY, dirX, dirY, segX1, segY1, segX2, segY2) {
    const v1X = originX - segX1;
    const v1Y = originY - segY1;
    const v2X = segX2 - segX1;
    const v2Y = segY2 - segY1;
    
    const dot = dirX * v2Y - dirY * v2X;
    if (dot === 0) return { hit: false };
    
    const t = (v1X * v2Y - v1Y * v2X) / dot;
    const u = (v1X * dirY - v1Y * dirX) / dot;
    
    if (t >= 0 && u >= 0 && u <= 1) {
      return {
        hit: true,
        point: {
          x: originX + dirX * t,
          y: originY + dirY * t
        },
        distance: t
      };
    }
    
    return { hit: false };
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
