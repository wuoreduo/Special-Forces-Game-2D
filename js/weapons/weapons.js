// 武器配置数据

const WEAPONS = {
  // 手枪 - 平衡型（副武器）
  pistol: {
    name: 'pistol',
    displayName: '手枪',
    damage: 25,
    fireRate: 3,
    magazineSize: 12,
    reloadTime: 1000,
    bulletSpeed: 90,
    maxRange: 600,
    spread: 2,
    bulletCount: 1,
    damageFalloff: 0.0003,
    spreadIncrease: 0.4
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
    maxRange: 1000,
    spread: 5,
    bulletCount: 1,
    damageFalloff: 0.0005,
    spreadIncrease: 0.8
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
    maxRange: 1000,
    spread: 1.5,
    bulletCount: 1,
    damageFalloff: 0.0005,
    spreadIncrease: 0.3
  },

  // 狙击枪 - 高伤害（爆头一击必杀，身体两枪击杀）
  sniper: {
    name: 'sniper',
    displayName: '狙击枪',
    damage: 60,
    fireRate: 0.8,        // 射速提高（发射间隔缩短）
    magazineSize: 5,
    reloadTime: 1800,     // 装弹时间缩短（3000→1800ms）
    bulletSpeed: 175,
    maxRange: 1500,
    spread: 0,
    bulletCount: 1,
    damageFalloff: 0,
    spreadIncrease: 0
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
    bulletCount: 8,
    damageFalloff: 0,
    spreadIncrease: 0.6
  }
};

// 武器数据数组（用于 UI）
const WEAPONS_LIST = Object.values(WEAPONS);

window.WEAPONS = WEAPONS;
window.WEAPONS_LIST = WEAPONS_LIST;
