/**
 * Tower of Fate V2.0 - 商城数据
 * 复用V1.0资产 + Web4.0增强
 * 目标：1000万美元收入 = 游戏内购(40%) + NFT交易(35%) + 锦标赛(15%) + 广告(10%)
 */

// 商品数据 - 从V1.0整合并增强
const SHOP_DATA = [
    // ===== VIP通行证 (高ARPU核心) =====
    {
        id: 'vip_monthly',
        name: '月度VIP',
        desc: '30天特权 + 每日100 $FATE',
        category: 'vip',
        icon: '🥉',
        price: 9.99,
        currency: 'usdt',
        isHot: true,
        benefits: ['每日领取100 $FATE', '经验加成20%', '优先匹配', '专属头像框']
    },
    {
        id: 'vip_quarterly',
        name: '季度VIP',
        desc: '90天特权 + 每日150 $FATE',
        category: 'vip',
        icon: '🥈',
        price: 24.99,
        currency: 'usdt',
        isHot: false,
        benefits: ['每日领取150 $FATE', '经验加成30%', '优先匹配', '专属头像框', 'NFT掉落率+5%']
    },
    {
        id: 'vip_yearly',
        name: '年度至尊VIP',
        desc: '365天特权 + 每日300 $FATE',
        category: 'vip',
        icon: '🥇',
        price: 79.99,
        currency: 'usdt',
        isHot: true,
        benefits: ['每日领取300 $FATE', '经验加成50%', '专属客服', '限定NFT空投', ' tournament报名8折']
    },

    // ===== 卡牌皮肤 (高频消费) =====
    {
        id: 'skin_gold',
        name: '黄金皮肤',
        desc: '尊贵金色外观，出牌金光特效',
        category: 'skin',
        icon: '✨',
        price: 188,
        currency: 'fate',
        isHot: true
    },
    {
        id: 'skin_crystal',
        name: '水晶皮肤',
        desc: '晶莹剔透，出牌冰晶特效',
        category: 'skin',
        icon: '💎',
        price: 168,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'skin_wood',
        name: '木质皮肤',
        desc: '古朴典雅，出牌木纹特效',
        category: 'skin',
        icon: '🪵',
        price: 88,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'skin_forest',
        name: '森林皮肤',
        desc: '绿意盎然，出牌叶落特效',
        category: 'skin',
        icon: '🌲',
        price: 128,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'skin_dragon',
        name: '龙纹皮肤',
        desc: '霸气龙纹，出牌龙吟特效',
        category: 'skin',
        icon: '🐉',
        price: 288,
        currency: 'fate',
        isHot: true
    },
    {
        id: 'skin_phoenix',
        name: '凤凰皮肤',
        desc: '华丽凤凰，出牌涅槃特效',
        category: 'skin',
        icon: '🦅',
        price: 288,
        currency: 'fate',
        isHot: false
    },

    // ===== 出牌特效 (视觉付费) =====
    {
        id: 'effect_fire',
        name: '火焰特效',
        desc: '出牌燃烧效果',
        category: 'effect',
        icon: '🔥',
        price: 128,
        currency: 'fate',
        isHot: true
    },
    {
        id: 'effect_ice',
        name: '冰霜特效',
        desc: '出牌冰霜效果',
        category: 'effect',
        icon: '❄️',
        price: 128,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'effect_lightning',
        name: '闪电特效',
        desc: '出牌雷电效果',
        category: 'effect',
        icon: '⚡',
        price: 158,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'effect_rainbow',
        name: '彩虹特效',
        desc: '出牌彩虹效果',
        category: 'effect',
        icon: '🌈',
        price: 188,
        currency: 'fate',
        isHot: true
    },
    {
        id: 'effect_necro',
        name: '暗影特效',
        desc: '出牌暗影效果',
        category: 'effect',
        icon: '💀',
        price: 168,
        currency: 'fate',
        isHot: false
    },

    // ===== 卡背样式 (收集付费) =====
    {
        id: 'back_dragon',
        name: '龙纹卡背',
        desc: '霸气龙纹设计',
        category: 'cardback',
        icon: '🐉',
        price: 98,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'back_phoenix',
        name: '凤凰卡背',
        desc: '华丽凤凰设计',
        category: 'cardback',
        icon: '🦅',
        price: 98,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'back_gold',
        name: '黄金卡背',
        desc: '尊贵黄金设计',
        category: 'cardback',
        icon: '🌟',
        price: 68,
        currency: 'fate',
        isHot: true
    },
    {
        id: 'back_cyber',
        name: '赛博卡背',
        desc: '科技感设计',
        category: 'cardback',
        icon: '🤖',
        price: 88,
        currency: 'fate',
        isHot: true
    },

    // ===== 头像框 (身份象征) =====
    {
        id: 'frame_king',
        name: '王者框',
        desc: '尊贵王者头像框',
        category: 'frame',
        icon: '👑',
        price: 68,
        currency: 'fate',
        isHot: true
    },
    {
        id: 'frame_star',
        name: '星辰框',
        desc: '闪耀星辰头像框',
        category: 'frame',
        icon: '⭐',
        price: 48,
        currency: 'fate',
        isHot: false
    },
    {
        id: 'frame_legend',
        name: '传说框',
        desc: '传说级头像框',
        category: 'frame',
        icon: '💫',
        price: 128,
        currency: 'fate',
        isHot: true
    },

    // ===== 增益道具 (消耗品复购) =====
    {
        id: 'booster_xp2',
        name: '双倍经验卡',
        desc: '24小时双倍经验',
        category: 'booster',
        icon: '⬆️',
        price: 5.99,
        currency: 'usdt',
        isHot: false
    },
    {
        id: 'booster_luck',
        name: '幸运符',
        desc: 'NFT掉落率+10% (24h)',
        category: 'booster',
        icon: '🍀',
        price: 3.99,
        currency: 'usdt',
        isHot: true
    },
    {
        id: 'booster_shield',
        name: '守护盾',
        desc: '失败不掉连胜 (1次)',
        category: 'booster',
        icon: '🛡️',
        price: 1.99,
        currency: 'usdt',
        isHot: true
    },
    {
        id: 'booster_revive',
        name: '复活币',
        desc: '锦标赛复活 (1次)',
        category: 'booster',
        icon: '💊',
        price: 4.99,
        currency: 'usdt',
        isHot: false
    },
    {
        id: 'pack_starter',
        name: '新手礼包',
        desc: '超值新手套装',
        category: 'booster',
        icon: '🎁',
        price: 0.99,
        currency: 'usdt',
        isHot: true
    }
];

// NFT塔楼资产数据 (Web4.0核心收入)
const NFT_TOWER_DATA = [
    {
        id: 'tower_01',
        name: '青铜塔楼',
        rarity: 'common',
        icon: '🏛️',
        price: 100,
        power: 100,
        desc: '基础塔楼，战力+100'
    },
    {
        id: 'tower_02',
        name: '白银塔楼',
        rarity: 'rare',
        icon: '🏰',
        price: 500,
        power: 500,
        desc: '进阶塔楼，战力+500'
    },
    {
        id: 'tower_03',
        name: '黄金塔楼',
        rarity: 'epic',
        icon: '👑',
        price: 2000,
        power: 2000,
        desc: '稀有塔楼，战力+2000'
    },
    {
        id: 'tower_04',
        name: '水晶塔楼',
        rarity: 'legendary',
        icon: '💎',
        price: 10000,
        power: 10000,
        desc: '传说塔楼，战力+10000'
    },
    {
        id: 'tower_05',
        name: '虚空塔楼',
        rarity: 'mythic',
        icon: '🌌',
        price: 50000,
        power: 50000,
        desc: '神话级，战力+50000'
    }
];

// 礼包数据 (促销收入)
const GIFT_PACK_DATA = [
    {
        id: 'pack_fate_1000',
        name: '1000 $FATE',
        desc: '基础代币包',
        price: 9.99,
        currency: 'usdt',
        bonus: 0,
        icon: '🏛️'
    },
    {
        id: 'pack_fate_5000',
        name: '5000 $FATE',
        desc: '超值代币包 +10%',
        price: 44.99,
        currency: 'usdt',
        bonus: 500,
        icon: '🏛️'
    },
    {
        id: 'pack_fate_10000',
        name: '10000 $FATE',
        desc: '豪华代币包 +20%',
        price: 79.99,
        currency: 'usdt',
        bonus: 2000,
        icon: '🏛️',
        isHot: true
    },
    {
        id: 'pack_fate_50000',
        name: '50000 $FATE',
        desc: '至尊代币包 +30%',
        price: 349.99,
        currency: 'usdt',
        bonus: 15000,
        icon: '🏛️'
    }
];

// 导出数据
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHOP_DATA, NFT_TOWER_DATA, GIFT_PACK_DATA };
}
