// 通用对象池 - 用于子弹和粒子，减少 GC 压力

class ObjectPool {
  constructor(createFn, resetFn, initialSize = 50) {
    this.createFn = createFn;  // 创建对象的函数
    this.resetFn = resetFn;    // 重置对象的函数
    this.pool = [];
    this.active = [];
    
    // 预分配对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  // 获取一个对象
  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      // 池子空了，创建新对象
      obj = this.createFn();
    }
    obj.active = true;
    this.active.push(obj);
    return obj;
  }

  // 回收一个对象
  release(obj) {
    if (!obj.active) return;
    
    obj.active = false;
    this.resetFn(obj);
    
    // 从 active 数组移除
    const index = this.active.indexOf(obj);
    if (index > -1) {
      this.active.splice(index, 1);
    }
    
    // 放回池子
    this.pool.push(obj);
  }

  // 回收所有对象
  releaseAll() {
    while (this.active.length > 0) {
      this.release(this.active[0]);
    }
  }

  // 更新所有活动对象
  update(dt, updateFn) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (obj.active && updateFn) {
        updateFn(obj, dt);
      }
      if (!obj.active) {
        this.release(obj);
      }
    }
  }

  // 绘制所有活动对象
  draw(ctx, drawFn) {
    for (const obj of this.active) {
      if (obj.active && drawFn) {
        drawFn(obj, ctx);
      }
    }
  }

  // 获取活动对象数量
  getActiveCount() {
    return this.active.length;
  }

  // 获取池子大小
  getPoolSize() {
    return this.pool.length + this.active.length;
  }
}

// 导出
window.ObjectPool = ObjectPool;
