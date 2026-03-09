/**
 * Tower of Fate - Web4.0 NFT Drop System
 * NFT掉落系统
 */

const { ethers } = require('ethers');

// NFT稀有度配置
const RARITY_LEVELS = {
  COMMON: {
    name: '普通',
    probability: 0.60,
    color: '#9E9E9E',
    minPower: 10,
    maxPower: 30
  },
  UNCOMMON: {
    name: '优秀',
    probability: 0.25,
    color: '#4CAF50',
    minPower: 30,
    maxPower: 60
  },
  RARE: {
    name: '稀有',
    probability: 0.10,
    color: '#2196F3',
    minPower: 60,
    maxPower: 100
  },
  EPIC: {
    name: '史诗',
    probability: 0.04,
    color: '#9C27B0',
    minPower: 100,
    maxPower: 150
  },
  LEGENDARY: {
    name: '传说',
    probability: 0.01,
    color: '#FF9800',
    minPower: 150,
    maxPower: 250
  }
};

// NFT类型定义
const NFT_TYPES = {
  // 首次胜利纪念NFT
  COMMEMORATIVE: {
    id: 'commemorative',
    name: '命运塔首胜纪念',
    description: '纪念你在命运塔中的首场胜利',
    image: 'ipfs://QmFirstWin',
    rarity: 'UNCOMMON',
    category: 'memorial',
    attributes: [
      { trait_type: '类型', value: '纪念' },
      { trait_type: '获得方式', value: '首次胜利' }
    ]
  },

  // 连胜奖励NFT
  STREAK_3: {
    id: 'streak_3',
    name: '三连冠徽章',
    description: '连续赢得3场比赛的证明',
    image: 'ipfs://QmStreak3',
    rarity: 'RARE',
    category: 'badge',
    attributes: [
      { trait_type: '类型', value: '徽章' },
      { trait_type: '连胜', value: '3' }
    ]
  },

  STREAK_5: {
    id: 'streak_5',
    name: '五连胜勋章',
    description: '连续赢得5场比赛的传奇证明',
    image: 'ipfs://QmStreak5',
    rarity: 'EPIC',
    category: 'badge',
    attributes: [
      { trait_type: '类型', value: '勋章' },
      { trait_type: '连胜', value: '5' }
    ]
  },

  // 锦标赛奖励NFT
  TOURNAMENT_BRONZE: {
    id: 'tournament_bronze',
    name: '锦标赛铜杯',
    description: '锦标赛第三名的荣耀',
    image: 'ipfs://QmTournamentBronze',
    rarity: 'RARE',
    category: 'trophy',
    attributes: [
      { trait_type: '类型', value: '奖杯' },
      { trait_type: '等级', value: '铜牌' }
    ]
  },

  TOURNAMENT_SILVER: {
    id: 'tournament_silver',
    name: '锦标赛银杯',
    description: '锦标赛第二名的荣耀',
    image: 'ipfs://QmTournamentSilver',
    rarity: 'EPIC',
    category: 'trophy',
    attributes: [
      { trait_type: '类型', value: '奖杯' },
      { trait_type: '等级', value: '银牌' }
    ]
  },

  TOURNAMENT_GOLD: {
    id: 'tournament_gold',
    name: '锦标赛金杯',
    description: '锦标赛冠军的至高荣耀',
    image: 'ipfs://QmTournamentGold',
    rarity: 'LEGENDARY',
    category: 'trophy',
    attributes: [
      { trait_type: '类型', value: '奖杯' },
      { trait_type: '等级', value: '金牌' }
    ]
  },

  // 随机掉落NFT集合
  RANDOM_COLLECTION: [
    { id: 'fate_card_1', name: '命运卡牌·初', rarity: 'COMMON' },
    { id: 'fate_card_2', name: '命运卡牌·进', rarity: 'UNCOMMON' },
    { id: 'fate_card_3', name: '命运卡牌·精', rarity: 'RARE' },
    { id: 'fate_card_4', name: '命运卡牌·极', rarity: 'EPIC' },
    { id: 'fate_card_5', name: '命运卡牌·终', rarity: 'LEGENDARY' },
    { id: 'tower_key_bronze', name: '青铜塔钥', rarity: 'COMMON' },
    { id: 'tower_key_silver', name: '白银塔钥', rarity: 'UNCOMMON' },
    { id: 'tower_key_gold', name: '黄金塔钥', rarity: 'RARE' },
    { id: 'guardian_spirit', name: '守护灵', rarity: 'EPIC' },
    { id: 'fate_master', name: '命运主宰', rarity: 'LEGENDARY' }
  ]
};

class NFTDropSystem {
  constructor(provider, nftContractAddress, abi) {
    this.provider = provider;
    this.contract = new ethers.Contract(nftContractAddress, abi, provider);
    this.dropHistory = new Map();
    this.playerCollection = new Map();
  }

  /**
   * 计算稀有度
   * @returns {string} 稀有度等级
   */
  calculateRarity() {
    const random = Math.random();
    let cumulative = 0;

    for (const [level, config] of Object.entries(RARITY_LEVELS)) {
      cumulative += config.probability;
      if (random <= cumulative) {
        return level;
      }
    }

    return 'COMMON';
  }

  /**
   * 加权随机选择
   * @param {Array} items - 物品列表
   * @param {string} weightField - 权重字段名
   * @returns {Object} 选中的物品
   */
  weightedRandom(items, weightField = 'rarity') {
    const weights = items.map(item => {
      const rarity = RARITY_LEVELS[item[weightField]] || RARITY_LEVELS.COMMON;
      return rarity.probability * 100;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[0];
  }

  /**
   * 生成随机NFT
   * @param {string} playerAddress - 玩家地址
   * @param {string} dropType - 掉落类型
   * @returns {Object} NFT详情
   */
  generateRandomNFT(playerAddress, dropType = 'random') {
    const rarity = this.calculateRarity();
    const baseNFT = this.weightedRandom(NFT_TYPES.RANDOM_COLLECTION);

    const nft = {
      tokenId: this.generateTokenId(),
      name: baseNFT.name,
      description: `从命运塔中获得的${RARITY_LEVELS[rarity].name}级NFT`,
      image: `ipfs://Qm${baseNFT.id}_${rarity}`,
      rarity: rarity,
      rarityConfig: RARITY_LEVELS[rarity],
      category: 'random_drop',
      power: this.generatePower(rarity),
      attributes: [
        { trait_type: '稀有度', value: RARITY_LEVELS[rarity].name },
        { trait_type: '类型', value: '随机掉落' },
        { trait_type: '战力', value: 0, display_type: 'number' }
      ],
      dropType,
      droppedAt: Date.now(),
      owner: playerAddress
    };

    // 更新战力属性
    nft.attributes[2].value = nft.power;

    // 记录掉落
    this.recordDrop(playerAddress, nft);

    return nft;
  }

  /**
   * 生成战力值
   * @param {string} rarity - 稀有度
   * @returns {number} 战力值
   */
  generatePower(rarity) {
    const config = RARITY_LEVELS[rarity];
    return Math.floor(
      Math.random() * (config.maxPower - config.minPower + 1) + config.minPower
    );
  }

  /**
   * 生成唯一Token ID
   * @returns {string} Token ID
   */
  generateTokenId() {
    return `FATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取首次胜利NFT
   * @param {string} playerAddress - 玩家地址
   * @returns {Object} NFT详情
   */
  getFirstWinNFT(playerAddress) {
    const template = NFT_TYPES.COMMEMORATIVE;
    const nft = {
      tokenId: this.generateTokenId(),
      ...template,
      rarityConfig: RARITY_LEVELS[template.rarity],
      power: this.generatePower(template.rarity),
      droppedAt: Date.now(),
      owner: playerAddress,
      isFirstWin: true
    };

    this.recordDrop(playerAddress, nft);
    return nft;
  }

  /**
   * 获取连胜NFT
   * @param {string} playerAddress - 玩家地址
   * @param {number} streak - 连胜场次
   * @returns {Object|null} NFT详情
   */
  getStreakNFT(playerAddress, streak) {
    let template = null;

    if (streak === 3) {
      template = NFT_TYPES.STREAK_3;
    } else if (streak === 5) {
      template = NFT_TYPES.STREAK_5;
    }

    if (!template) return null;

    const nft = {
      tokenId: this.generateTokenId(),
      ...template,
      rarityConfig: RARITY_LEVELS[template.rarity],
      power: this.generatePower(template.rarity),
      droppedAt: Date.now(),
      owner: playerAddress,
      streak: streak
    };

    this.recordDrop(playerAddress, nft);
    return nft;
  }

  /**
   * 获取锦标赛奖励NFT
   * @param {string} playerAddress - 玩家地址
   * @param {number} rank - 排名 (1, 2, 3)
   * @returns {Object} NFT详情
   */
  getTournamentNFT(playerAddress, rank) {
    let template;
    switch (rank) {
      case 1:
        template = NFT_TYPES.TOURNAMENT_GOLD;
        break;
      case 2:
        template = NFT_TYPES.TOURNAMENT_SILVER;
        break;
      case 3:
        template = NFT_TYPES.TOURNAMENT_BRONZE;
        break;
      default:
        return null;
    }

    const nft = {
      tokenId: this.generateTokenId(),
      ...template,
      rarityConfig: RARITY_LEVELS[template.rarity],
      power: this.generatePower(template.rarity) * rank,
      droppedAt: Date.now(),
      owner: playerAddress,
      tournamentRank: rank
    };

    this.recordDrop(playerAddress, nft);
    return nft;
  }

  /**
   * 记录NFT掉落
   * @param {string} playerAddress - 玩家地址
   * @param {Object} nft - NFT详情
   */
  recordDrop(playerAddress, nft) {
    if (!this.dropHistory.has(playerAddress)) {
      this.dropHistory.set(playerAddress, []);
    }
    this.dropHistory.get(playerAddress).push(nft);

    if (!this.playerCollection.has(playerAddress)) {
      this.playerCollection.set(playerAddress, []);
    }
    this.playerCollection.get(playerAddress).push(nft.tokenId);
  }

  /**
   * 获取玩家掉落历史
   * @param {string} playerAddress - 玩家地址
   * @returns {Array} 掉落历史
   */
  getPlayerDrops(playerAddress) {
    return this.dropHistory.get(playerAddress) || [];
  }

  /**
   * 获取玩家NFT收藏
   * @param {string} playerAddress - 玩家地址
   * @returns {Array} NFT收藏列表
   */
  getPlayerCollection(playerAddress) {
    return this.playerCollection.get(playerAddress) || [];
  }

  /**
   * 获取稀有度统计
   * @param {string} playerAddress - 玩家地址
   * @returns {Object} 稀有度统计
   */
  getRarityStats(playerAddress) {
    const drops = this.getPlayerDrops(playerAddress);
    const stats = {};

    for (const level of Object.keys(RARITY_LEVELS)) {
      stats[level] = drops.filter(nft => nft.rarity === level).length;
    }

    return stats;
  }

  /**
   * 批量铸造NFT（用于合约交互）
   * @param {string} playerAddress - 玩家地址
   * @param {Array} nfts - NFT列表
   * @returns {Promise} 交易结果
   */
  async batchMint(playerAddress, nfts) {
    const tokenURIs = nfts.map(nft => this.generateTokenURI(nft));

    try {
      const tx = await this.contract.batchMint(playerAddress, tokenURIs);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        tokenIds: nfts.map(nft => nft.tokenId),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成Token URI元数据
   * @param {Object} nft - NFT详情
   * @returns {string} Token URI
   */
  generateTokenURI(nft) {
    const metadata = {
      name: nft.name,
      description: nft.description,
      image: nft.image,
      attributes: nft.attributes,
      rarity: nft.rarity
    };

    // 实际项目中应上传到IPFS
    return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
  }

  /**
   * 处理完整掉落流程
   * @param {string} playerAddress - 玩家地址
   * @param {Object} context - 掉落上下文
   * @returns {Object} 掉落结果
   */
  async processDrop(playerAddress, context = {}) {
    const { isFirstWin, streak, tournamentRank, isRandom } = context;
    const drops = [];

    // 首次胜利NFT
    if (isFirstWin) {
      drops.push(this.getFirstWinNFT(playerAddress));
    }

    // 连胜NFT
    if (streak && (streak === 3 || streak === 5)) {
      const streakNFT = this.getStreakNFT(playerAddress, streak);
      if (streakNFT) drops.push(streakNFT);
    }

    // 锦标赛NFT
    if (tournamentRank && tournamentRank <= 3) {
      drops.push(this.getTournamentNFT(playerAddress, tournamentRank));
    }

    // 随机掉落
    if (isRandom) {
      drops.push(this.generateRandomNFT(playerAddress, 'victory_bonus'));
    }

    return {
      playerAddress,
      drops,
      totalDrops: drops.length,
      timestamp: Date.now()
    };
  }
}

module.exports = {
  NFTDropSystem,
  RARITY_LEVELS,
  NFT_TYPES
};
