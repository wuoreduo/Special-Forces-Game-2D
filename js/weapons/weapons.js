// 武器配置数据

const WEAPONS = {
  // 手枪 - 平衡型
  pistol: {
    name: 'pistol',
    displayName: '手枪',
    damage: 25,
    fireRate: 3,
    magazineSize: 12,
    reloadTime: 1500,
    bulletSpeed: 90,
    maxRange: 600,
    spread: 2,
    bulletCount: 1
  },

  // 冲锋枪 - 高射速
  smg: {
    name: 'smg',
    displayName: '冲锋枪',
    damage: 15,
    fireRate: 10,
    magazineSize: 30,
    reloadTime: 2000,
    bulletSpeed: 100,
    maxRange: 400,
    spread: 5,
    bulletCount: 1
  },

  // 步枪 - 中距离
  rifle: {
    name: 'rifle',
    displayName: '步枪',
    damage: 30,
    fireRate: 5,
    magazineSize: 20,
    reloadTime: 2000,
    bulletSpeed: 110,
    maxRange: 800,
    spread: 3,
    bulletCount: 1
  },

  // 狙击枪 - 高伤害
  sniper: {
    name: 'sniper',
    displayName: '狙击枪',
    damage: 100,
    fireRate: 0.5,
    magazineSize: 5,
    reloadTime: 3000,
    bulletSpeed: 175,
    maxRange: 1500,
    spread: 0.5,
    bulletCount: 1
  },

  // 霰弹枪 - 近战散射
  shotgun: {
    name: 'shotgun',
    displayName: '霰弹枪',
    damage: 20,
    fireRate: 1,
    magazineSize: 6,
    reloadTime: 2500,
    bulletSpeed: 75,
    maxRange: 250,
    spread: 15,
    bulletCount: 8
  }
};

// 武器数据数组（用于 UI）
const WEAPONS_LIST = Object.values(WEAPONS);

window.WEAPONS = WEAPONS;
window.WEAPONS_LIST = WEAPONS_LIST;
