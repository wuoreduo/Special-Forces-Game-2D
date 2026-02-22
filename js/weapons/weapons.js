// 武器配置数据

const WEAPONS = {
  // 手枪 - 平衡型
  pistol: {
    name: 'pistol',
    displayName: '手枪',
    damage: 25,
    fireRate: 3,        // 每秒 3 发
    magazineSize: 12,
    reloadTime: 1500,   // 1.5 秒换弹
    bulletSpeed: 18,
    maxRange: 600,
    spread: 2,          // 2 度散布
    bulletCount: 1
  },

  // 冲锋枪 - 高射速
  smg: {
    name: 'smg',
    displayName: '冲锋枪',
    damage: 15,
    fireRate: 10,       // 每秒 10 发
    magazineSize: 30,
    reloadTime: 2000,   // 2 秒换弹
    bulletSpeed: 20,
    maxRange: 400,
    spread: 5,
    bulletCount: 1
  },

  // 步枪 - 中距离
  rifle: {
    name: 'rifle',
    displayName: '步枪',
    damage: 30,
    fireRate: 5,        // 每秒 5 发
    magazineSize: 20,
    reloadTime: 2000,
    bulletSpeed: 22,
    maxRange: 800,
    spread: 3,
    bulletCount: 1
  },

  // 狙击枪 - 高伤害
  sniper: {
    name: 'sniper',
    displayName: '狙击枪',
    damage: 100,
    fireRate: 0.5,      // 2 秒 1 发
    magazineSize: 5,
    reloadTime: 3000,   // 3 秒换弹
    bulletSpeed: 35,
    maxRange: 1500,
    spread: 0.5,        // 非常精准
    bulletCount: 1
  },

  // 霰弹枪 - 近战散射
  shotgun: {
    name: 'shotgun',
    displayName: '霰弹枪',
    damage: 20,
    fireRate: 1,        // 每秒 1 发
    magazineSize: 6,
    reloadTime: 2500,
    bulletSpeed: 15,
    maxRange: 250,
    spread: 15,         // 大散布
    bulletCount: 8      // 8 发弹丸
  }
};

// 武器数据数组（用于 UI）
const WEAPONS_LIST = Object.values(WEAPONS);

window.WEAPONS = WEAPONS;
window.WEAPONS_LIST = WEAPONS_LIST;
