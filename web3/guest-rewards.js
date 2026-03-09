/**
 * Tower of Fate - Web4.0 Guest Rewards System
 * 游客奖励系统
 */

const { ethers } = require('ethers');

// 本地存储键名
const STORAGE_KEYS = {
  GUEST_POINTS: 'toweroffate_guest_points',
  GUEST_REWARDS: 'toweroffate_guest_rewards',
  GUEST_STATS: 'toweroffate_guest_stats',
  GUEST_INVITES: 'toweroffate_guest_invites',
  DEVICE_ID: 'toweroffate_device_id'
};

// 邀请奖励配置
const INVITE_CONFIG = {
  REWARD_PER_INVITE: 50,      // 每邀请一人奖励50积分
  MAX_INVITE_REWARD: 500,     // 邀请奖励上限
  INVITE_BONUS_FATE: 10       // 连接钱包后每个邀请转换为10 $FATE
};

class GuestRewardsSystem {
  constructor() {
    this.isBrowser = typeof window !== 'undefined';
    this.deviceId = this.getOrCreateDeviceId();
    this.pendingSync = new Map(); // 待同步数据
  }

  /**
   * 获取或创建设备ID
   * @returns {string} 设备ID
   */
  getOrCreateDeviceId() {
    if (!this.isBrowser) return 'server_' + Date.now();

    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }

  // ==================== 本地积分存储 ====================

  /**
   * 获取游客积分
   * @returns {Object} 积分详情
   */
  getGuestPoints() {
    if (!this.isBrowser) {
      return { points: 0, history: [] };
    }

    const data = localStorage.getItem(STORAGE_KEYS.GUEST_POINTS);
    if (!data) {
      return { points: 0, history: [] };
    }

    try {
      return JSON.parse(data);
    } catch {
      return { points: 0, history: [] };
    }
  }

  /**
   * 添加游客积分
   * @param {number} points - 积分数量
   * @param {string} source - 积分来源
   * @returns {Object} 更新后的积分
   */
  addGuestPoints(points, source = 'game') {
    const current = this.getGuestPoints();
    const newPoints = current.points + points;

    const entry = {
      points,
      source,
      timestamp: Date.now(),
      balance: newPoints
    };

    const updated = {
      points: newPoints,
      history: [...current.history, entry]
    };

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.GUEST_POINTS, JSON.stringify(updated));
    }

    return updated;
  }

  /**
   * 扣除游客积分
   * @param {number} points - 积分数量
   * @param {string} reason - 扣除原因
   * @returns {Object} 扣除结果
   */
  deductGuestPoints(points, reason = 'spend') {
    const current = this.getGuestPoints();

    if (current.points < points) {
      return {
        success: false,
        error: '积分不足',
        current: current.points,
        required: points
      };
    }

    const newPoints = current.points - points;
    const entry = {
      points: -points,
      source: reason,
      timestamp: Date.now(),
      balance: newPoints
    };

    const updated = {
      points: newPoints,
      history: [...current.history, entry]
    };

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.GUEST_POINTS, JSON.stringify(updated));
    }

    return {
      success: true,
      remaining: newPoints,
      deducted: points
    };
  }

  // ==================== 奖励存储 ====================

  /**
   * 获取游客奖励记录
   * @returns {Array} 奖励列表
   */
  getGuestRewards() {
    if (!this.isBrowser) return [];

    const data = localStorage.getItem(STORAGE_KEYS.GUEST_REWARDS);
    return data ? JSON.parse(data) : [];
  }

  /**
   * 添加游客奖励
   * @param {Object} reward - 奖励详情
   */
  addGuestReward(reward) {
    const rewards = this.getGuestRewards();
    const entry = {
      ...reward,
      id: 'reward_' + Date.now(),
      timestamp: Date.now(),
      synced: false
    };

    rewards.push(entry);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.GUEST_REWARDS, JSON.stringify(rewards));
    }

    return entry;
  }

  // ==================== 游戏统计 ====================

  /**
   * 获取游客游戏统计
   * @returns {Object} 统计数据
   */
  getGuestStats() {
    if (!this.isBrowser) {
      return this.getDefaultStats();
    }

    const data = localStorage.getItem(STORAGE_KEYS.GUEST_STATS);
    return data ? JSON.parse(data) : this.getDefaultStats();
  }

  /**
   * 获取默认统计
   * @returns {Object} 默认统计
   */
  getDefaultStats() {
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winStreak: 0,
      maxWinStreak: 0,
      firstAscensions: 0,
      totalPlayTime: 0,
      lastPlayed: null
    };
  }

  /**
   * 更新游戏统计
   * @param {Object} update - 更新数据
   * @returns {Object} 更新后的统计
   */
  updateGuestStats(update) {
    const stats = this.getGuestStats();
    const updated = { ...stats, ...update };

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.GUEST_STATS, JSON.stringify(updated));
    }

    return updated;
  }

  /**
   * 记录游戏结果
   * @param {string} result - 结果 (win/loss)
   * @param {Object} details - 详情
   */
  recordGameResult(result, details = {}) {
    const stats = this.getGuestStats();

    const update = {
      gamesPlayed: stats.gamesPlayed + 1,
      lastPlayed: Date.now()
    };

    if (result === 'win') {
      update.wins = stats.wins + 1;
      update.winStreak = stats.winStreak + 1;
      update.maxWinStreak = Math.max(stats.maxWinStreak, update.winStreak);

      if (details.isFirstAscender) {
        update.firstAscensions = stats.firstAscensions + 1;
      }
    } else {
      update.losses = stats.losses + 1;
      update.winStreak = 0;
    }

    return this.updateGuestStats(update);
  }

  // ==================== 邀请奖励 ====================

  /**
   * 获取邀请数据
   * @returns {Object} 邀请数据
   */
  getInviteData() {
    if (!this.isBrowser) {
      return { inviteCode: null, invitedCount: 0, invitedUsers: [], rewards: 0 };
    }

    const data = localStorage.getItem(STORAGE_KEYS.GUEST_INVITES);
    if (!data) {
      const newData = {
        inviteCode: this.generateInviteCode(),
        invitedCount: 0,
        invitedUsers: [],
        rewards: 0
      };
      localStorage.setItem(STORAGE_KEYS.GUEST_INVITES, JSON.stringify(newData));
      return newData;
    }

    return JSON.parse(data);
  }

  /**
   * 生成邀请码
   * @returns {string} 邀请码
   */
  generateInviteCode() {
    return 'FATE' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  /**
   * 记录邀请
   * @param {string} invitedUser - 被邀请用户ID
   * @returns {Object} 邀请结果
   */
  recordInvite(invitedUser) {
    const data = this.getInviteData();

    if (data.invitedUsers.includes(invitedUser)) {
      return { success: false, error: '用户已被邀请' };
    }

    if (data.rewards >= INVITE_CONFIG.MAX_INVITE_REWARD) {
      return { success: false, error: '已达到邀请奖励上限' };
    }

    const reward = Math.min(
      INVITE_CONFIG.REWARD_PER_INVITE,
      INVITE_CONFIG.MAX_INVITE_REWARD - data.rewards
    );

    data.invitedCount += 1;
    data.invitedUsers.push(invitedUser);
    data.rewards += reward;

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.GUEST_INVITES, JSON.stringify(data));
    }

    // 添加积分奖励
    this.addGuestPoints(reward, 'invite');

    return {
      success: true,
      invitedCount: data.invitedCount,
      reward,
      totalRewards: data.rewards
    };
  }

  /**
   * 使用邀请码
   * @param {string} inviteCode - 邀请码
   * @returns {Object} 使用结果
   */
  useInviteCode(inviteCode) {
    // 验证邀请码格式
    if (!inviteCode || !inviteCode.startsWith('FATE')) {
      return { success: false, error: '无效的邀请码' };
    }

    const data = this.getInviteData();
    if (data.inviteCode === inviteCode) {
      return { success: false, error: '不能使用自己的邀请码' };
    }

    // 标记已使用邀请码
    if (this.isBrowser) {
      localStorage.setItem('toweroffate_used_invite', inviteCode);
    }

    // 新用户奖励
    const bonus = 20;
    this.addGuestPoints(bonus, 'invite_bonus');

    return {
      success: true,
      bonus,
      message: '邀请码使用成功，获得20积分奖励'
    };
  }

  // ==================== 钱包连接同步 ====================

  /**
   * 准备同步数据
   * @param {string} walletAddress - 钱包地址
   * @returns {Object} 同步数据包
   */
  prepareSyncData(walletAddress) {
    const points = this.getGuestPoints();
    const rewards = this.getGuestRewards();
    const stats = this.getGuestStats();
    const invites = this.getInviteData();

    // 计算可转换的$FATE
    const fateConversion = this.calculateFateConversion(points.points, invites.rewards);

    const syncPackage = {
      walletAddress,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      data: {
        points: points.points,
        pointsHistory: points.history,
        rewards: rewards.filter(r => !r.synced),
        stats,
        invites: {
          count: invites.invitedCount,
          reward: invites.rewards
        }
      },
      conversion: fateConversion,
      signature: null // 需要签名验证
    };

    this.pendingSync.set(walletAddress, syncPackage);
    return syncPackage;
  }

  /**
   * 计算$FATE转换
   * @param {number} points - 积分
   * @param {number} inviteRewards - 邀请奖励
   * @returns {Object} 转换结果
   */
  calculateFateConversion(points, inviteRewards) {
    // 积分转换比率: 100积分 = 1 $FATE
    const pointsToFate = Math.floor(points / 100);
    const remainingPoints = points % 100;

    // 邀请奖励转换
    const inviteToFate = Math.floor(inviteRewards / INVITE_CONFIG.INVITE_BONUS_FATE);

    return {
      pointsToFate,
      remainingPoints,
      inviteToFate,
      totalFate: pointsToFate + inviteToFate,
      breakdown: {
        fromPoints: pointsToFate,
        fromInvites: inviteToFate
      }
    };
  }

  /**
   * 执行同步
   * @param {string} walletAddress - 钱包地址
   * @param {Object} contractInteractor - 合约交互实例
   * @returns {Promise<Object>} 同步结果
   */
  async syncToWallet(walletAddress, contractInteractor) {
    const syncData = this.pendingSync.get(walletAddress);
    if (!syncData) {
      return { success: false, error: '没有待同步数据' };
    }

    const results = {
      success: true,
      walletAddress,
      conversions: [],
      errors: []
    };

    try {
      // 1. 转换积分为$FATE
      if (syncData.conversion.totalFate > 0) {
        const fateResult = await contractInteractor.claimFateReward(
          walletAddress,
          syncData.conversion.totalFate
        );

        if (fateResult.success) {
          results.conversions.push({
            type: 'fate',
            amount: syncData.conversion.totalFate,
            transactionHash: fateResult.transactionHash
          });
        } else {
          results.errors.push({ type: 'fate', error: fateResult.error });
        }
      }

      // 2. 同步未领取的NFT奖励
      const unsyncedRewards = syncData.data.rewards.filter(r => r.type === 'nft');
      if (unsyncedRewards.length > 0) {
        const nftResult = await contractInteractor.batchMintNFT(
          walletAddress,
          unsyncedRewards.map(r => r.metadata)
        );

        if (nftResult.success) {
          results.conversions.push({
            type: 'nft',
            count: unsyncedRewards.length,
            transactionHash: nftResult.transactionHash
          });
        } else {
          results.errors.push({ type: 'nft', error: nftResult.error });
        }
      }

      // 3. 标记已同步
      if (results.errors.length === 0) {
        this.markAsSynced();
        this.pendingSync.delete(walletAddress);
      }

      return results;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        partial: results
      };
    }
  }

  /**
   * 标记数据为已同步
   */
  markAsSynced() {
    if (!this.isBrowser) return;

    // 标记奖励为已同步
    const rewards = this.getGuestRewards();
    const updatedRewards = rewards.map(r => ({ ...r, synced: true }));
    localStorage.setItem(STORAGE_KEYS.GUEST_REWARDS, JSON.stringify(updatedRewards));

    // 清空积分（已转换）
    localStorage.setItem(STORAGE_KEYS.GUEST_POINTS, JSON.stringify({ points: 0, history: [] }));

    // 标记同步时间
    localStorage.setItem('toweroffate_last_sync', Date.now().toString());
  }

  /**
   * 获取同步状态
   * @returns {Object} 同步状态
   */
  getSyncStatus() {
    if (!this.isBrowser) {
      return { canSync: false, reason: 'Server environment' };
    }

    const points = this.getGuestPoints();
    const rewards = this.getGuestRewards();
    const lastSync = localStorage.getItem('toweroffate_last_sync');

    const unsyncedRewards = rewards.filter(r => !r.synced);

    return {
      canSync: points.points > 0 || unsyncedRewards.length > 0,
      points: points.points,
      unsyncedRewards: unsyncedRewards.length,
      lastSync: lastSync ? parseInt(lastSync) : null,
      deviceId: this.deviceId
    };
  }

  /**
   * 清空游客数据
   * @param {boolean} force - 强制清空
   */
  clearGuestData(force = false) {
    if (!this.isBrowser) return;

    if (!force) {
      const status = this.getSyncStatus();
      if (status.canSync) {
        throw new Error('还有未同步的数据，请先连接钱包同步');
      }
    }

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('toweroffate_last_sync');
    localStorage.removeItem('toweroffate_used_invite');
  }
}

module.exports = {
  GuestRewardsSystem,
  STORAGE_KEYS,
  INVITE_CONFIG
};
