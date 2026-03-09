/**
 * Tower of Fate - Web4.0 Rewards System
 * 游戏奖励系统
 */

const { ethers } = require('ethers');

// 奖励配置
const REWARD_CONFIG = {
  // 基础奖励
  SOLO_WIN: 100,           // 个人赛胜利
  FIRST_ASCENDER_BONUS: 500, // 首登者额外奖励

  // 连胜奖励
  STREAK_3: {
    fate: 200,
    nft: 'random'
  },
  STREAK_5: {
    fate: 500,
    nft: 'rare'
  },

  // 首次胜利
  FIRST_WIN: {
    nft: 'commemorative'
  },

  // 积分转换比率 (积分 : $FATE)
  POINTS_TO_FATE_RATIO: 10
};

// 奖励记录存储
class RewardsSystem {
  constructor(provider, contractAddress, abi) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, abi, provider);
    this.playerRewards = new Map(); // 玩家奖励记录
    this.winStreaks = new Map();    // 连胜记录
    this.firstWinners = new Set();  // 已领取首次胜利奖励的玩家
    this.firstAscenders = new Set(); // 首登者记录
  }

  /**
   * 计算胜利奖励
   * @param {string} playerAddress - 玩家钱包地址
   * @param {boolean} isFirstAscender - 是否为首登者
   * @returns {Object} 奖励详情
   */
  calculateVictoryReward(playerAddress, isFirstAscender = false) {
    let totalFate = REWARD_CONFIG.SOLO_WIN;
    const bonuses = [];

    // 基础胜利奖励
    bonuses.push({
      type: 'base',
      name: '个人赛胜利',
      amount: REWARD_CONFIG.SOLO_WIN
    });

    // 首登者额外奖励
    if (isFirstAscender && !this.firstAscenders.has(playerAddress)) {
      totalFate += REWARD_CONFIG.FIRST_ASCENDER_BONUS;
      bonuses.push({
        type: 'first_ascender',
        name: '首登者特别奖励',
        amount: REWARD_CONFIG.FIRST_ASCENDER_BONUS
      });
      this.firstAscenders.add(playerAddress);
    }

    return {
      totalFate,
      bonuses,
      timestamp: Date.now()
    };
  }

  /**
   * 更新连胜记录并计算奖励
   * @param {string} playerAddress - 玩家钱包地址
   * @returns {Object} 连胜奖励详情
   */
  calculateStreakReward(playerAddress) {
    const currentStreak = (this.winStreaks.get(playerAddress) || 0) + 1;
    this.winStreaks.set(playerAddress, currentStreak);

    const rewards = {
      streak: currentStreak,
      fateBonus: 0,
      nftReward: null,
      achievements: []
    };

    // 连胜3场奖励
    if (currentStreak === 3) {
      rewards.fateBonus = REWARD_CONFIG.STREAK_3.fate;
      rewards.nftReward = REWARD_CONFIG.STREAK_3.nft;
      rewards.achievements.push({
        name: '三连冠',
        description: '连续赢得3场比赛'
      });
    }

    // 连胜5场奖励
    if (currentStreak === 5) {
      rewards.fateBonus = REWARD_CONFIG.STREAK_5.fate;
      rewards.nftReward = REWARD_CONFIG.STREAK_5.nft;
      rewards.achievements.push({
        name: '五连胜',
        description: '连续赢得5场比赛'
      });
    }

    // 更高连胜记录
    if (currentStreak > 5) {
      rewards.achievements.push({
        name: `${currentStreak}连胜`,
        description: `连续赢得${currentStreak}场比赛，传奇！`
      });
    }

    return rewards;
  }

  /**
   * 重置连胜记录
   * @param {string} playerAddress - 玩家钱包地址
   */
  resetStreak(playerAddress) {
    const previousStreak = this.winStreaks.get(playerAddress) || 0;
    this.winStreaks.set(playerAddress, 0);
    return { previousStreak, reset: true };
  }

  /**
   * 检查并发放首次胜利奖励
   * @param {string} playerAddress - 玩家钱包地址
   * @returns {Object|null} 首次胜利奖励
   */
  checkFirstWinReward(playerAddress) {
    if (this.firstWinners.has(playerAddress)) {
      return null;
    }

    this.firstWinners.add(playerAddress);
    return {
      type: 'first_win',
      nft: REWARD_CONFIG.FIRST_WIN.nft,
      name: '首次胜利纪念NFT',
      description: '恭喜你在命运塔中获得首场胜利！'
    };
  }

  /**
   * 积分转换为$FATE
   * @param {number} points - 游戏积分
   * @returns {Object} 转换结果
   */
  convertPointsToFate(points) {
    const fateAmount = Math.floor(points / REWARD_CONFIG.POINTS_TO_FATE_RATIO);
    return {
      points,
      fateAmount,
      ratio: REWARD_CONFIG.POINTS_TO_FATE_RATIO,
      remainingPoints: points % REWARD_CONFIG.POINTS_TO_FATE_RATIO
    };
  }

  /**
   * 记录玩家奖励
   * @param {string} playerAddress - 玩家钱包地址
   * @param {Object} reward - 奖励详情
   */
  recordReward(playerAddress, reward) {
    if (!this.playerRewards.has(playerAddress)) {
      this.playerRewards.set(playerAddress, []);
    }
    this.playerRewards.get(playerAddress).push({
      ...reward,
      recordedAt: Date.now()
    });
  }

  /**
   * 获取玩家奖励历史
   * @param {string} playerAddress - 玩家钱包地址
   * @returns {Array} 奖励历史
   */
  getPlayerRewardHistory(playerAddress) {
    return this.playerRewards.get(playerAddress) || [];
  }

  /**
   * 获取玩家连胜记录
   * @param {string} playerAddress - 玩家钱包地址
   * @returns {number} 当前连胜场次
   */
  getPlayerStreak(playerAddress) {
    return this.winStreaks.get(playerAddress) || 0;
  }

  /**
   * 处理游戏胜利完整流程
   * @param {string} playerAddress - 玩家钱包地址
   * @param {boolean} isFirstAscender - 是否为首登者
   * @returns {Object} 完整奖励包
   */
  async processVictory(playerAddress, isFirstAscender = false) {
    const victoryReward = this.calculateVictoryReward(playerAddress, isFirstAscender);
    const streakReward = this.calculateStreakReward(playerAddress);
    const firstWinReward = this.checkFirstWinReward(playerAddress);

    const totalFate = victoryReward.totalFate + streakReward.fateBonus;

    const rewardPackage = {
      playerAddress,
      baseReward: victoryReward,
      streakReward,
      firstWinReward,
      totalFate,
      nfts: []
    };

    // 收集NFT奖励
    if (streakReward.nftReward) {
      rewardPackage.nfts.push({
        type: streakReward.nftReward,
        source: 'streak'
      });
    }

    if (firstWinReward) {
      rewardPackage.nfts.push({
        type: firstWinReward.nft,
        source: 'first_win'
      });
    }

    // 记录奖励
    this.recordReward(playerAddress, rewardPackage);

    return rewardPackage;
  }

  /**
   * 处理游戏失败
   * @param {string} playerAddress - 玩家钱包地址
   * @returns {Object} 失败处理结果
   */
  processDefeat(playerAddress) {
    const streakInfo = this.resetStreak(playerAddress);
    return {
      playerAddress,
      result: 'defeat',
      streakReset: true,
      previousStreak: streakInfo.previousStreak,
      consolationPoints: Math.min(streakInfo.previousStreak * 5, 50)
    };
  }
}

// 导出模块
module.exports = {
  RewardsSystem,
  REWARD_CONFIG
};
