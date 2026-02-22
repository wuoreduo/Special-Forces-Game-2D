// 游戏入口

let game = null;

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
  // 创建游戏实例
  game = new Game();
  
  // 全局访问（用于调试）
  window.game = game;
  
  console.log('特战队射击游戏 2D 已加载');
  console.log('控制说明:');
  console.log('  WASD - 移动');
  console.log('  空格 - 跳跃');
  console.log('  Shift - 蹲下');
  console.log('  鼠标 - 瞄准');
  console.log('  左键 - 射击');
  console.log('  R - 换弹');
  console.log('  F - 近战');
  console.log('  Tab - 切换队友');
  console.log('  1-5 - 切换到指定队友');
});
