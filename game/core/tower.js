/**
 * 命运塔·首登者 - 塔楼系统
 * Tower of Fate: First Ascender - Tower System
 */

/**
 * 塔楼层类
 * 代表命运塔的每一层
 */
class TowerLevel {
  constructor(level, guardian) {
    this.level = level;              // 层数 (1-13)
    this.guardian = guardian;        // 该层的守卫
    this.occupants = new Set();      // 当前在该层的玩家ID
    this.isLocked = false;           // 是否被锁定
    this.firstToReach = null;        // 首位到达该层的玩家
    this.visitHistory = [];          // 访问历史
  }

  /**
   * 玩家进入该层
   * @param {number} playerId - 玩家ID
   * @param {number} turn - 回合数
   * @returns {Object} 进入结果
   */
  enter(playerId, turn) {
    // 记录首位到达者
    if (this.firstToReach === null) {
      this.firstToReach = playerId;
    }

    // 添加到当前 occupants
    this.occupants.add(playerId);

    // 记录访问历史
    this.visitHistory.push({
      playerId,
      turn,
      type: 'enter',
      timestamp: Date.now()
    });

    return {
      level: this.level,
      playerId,
      isFirstToReach: this.firstToReach === playerId,
      guardianDefeated: this.guardian ? this.guardian.isDefeated : false
    };
  }

  /**
   * 玩家离开该层
   * @param {number} playerId - 玩家ID
   * @param {number} turn - 回合数
   */
  leave(playerId, turn) {
    this.occupants.delete(playerId);
    this.visitHistory.push({
      playerId,
      turn,
      type: 'leave',
      timestamp: Date.now()
    });
  }

  /**
   * 获取当前在该层的玩家列表
   */
  getOccupants() {
    return Array.from(this.occupants);
  }

  /**
   * 检查该层是否为空
   */
  isEmpty() {
    return this.occupants.size === 0;
  }

  /**
   * 获取该层状态
   */
  getStatus() {
    return {
      level: this.level,
      occupantCount: this.occupants.size,
      occupants: this.getOccupants(),
      firstToReach: this.firstToReach,
      isLocked: this.isLocked,
      guardianDefeated: this.guardian ? this.guardian.isDefeated : false,
      guardianCardsLeft: this.guardian ? this.guardian.getAvailableCards().length : 0
    };
  }
}

/**
 * 塔楼系统类
 * 管理13层塔楼的整体状态
 */
class Tower {
  constructor() {
    this.levels = [];           // 13层塔楼
    this.totalLevels = 13;      // 总层数
    this.topReached = false;    // 是否有人到达顶层
    this.firstAscender = null;  // 首登者ID
    this.levelHistory = [];     // 层数变化历史
  }

  /**
   * 初始化塔楼
   * @param {Array} guardians - 13名守卫数组
   */
  init(guardians) {
    this.levels = [];
    for (let i = 0; i < this.totalLevels; i++) {
      const level = new TowerLevel(i + 1, guardians[i]);
      this.levels.push(level);
    }
    this.topReached = false;
    this.firstAscender = null;
    this.levelHistory = [];
  }

  /**
   * 获取指定层
   * @param {number} level - 层数 (1-13)
   */
  getLevel(level) {
    if (level >= 1 && level <= this.totalLevels) {
      return this.levels[level - 1];
    }
    return null;
  }

  /**
   * 玩家移动层数
   * @param {number} playerId - 玩家ID
   * @param {number} fromLevel - 起始层
   * @param {number} toLevel - 目标层
   * @param {number} turn - 当前回合
   * @returns {Object} 移动结果
   */
  movePlayer(playerId, fromLevel, toLevel, turn) {
    // 确保层数在有效范围内
    toLevel = Math.max(0, Math.min(this.totalLevels, toLevel));

    // 离开原层
    if (fromLevel >= 1 && fromLevel <= this.totalLevels) {
      const oldLevel = this.getLevel(fromLevel);
      if (oldLevel) {
        oldLevel.leave(playerId, turn);
      }
    }

    // 进入新层
    let enterResult = null;
    if (toLevel >= 1 && toLevel <= this.totalLevels) {
      const newLevel = this.getLevel(toLevel);
      if (newLevel) {
        enterResult = newLevel.enter(playerId, turn);
      }
    }

    // 检查是否到达顶层
    if (toLevel === this.totalLevels && !this.topReached) {
      this.topReached = true;
      this.firstAscender = playerId;
    }

    // 记录历史
    this.levelHistory.push({
      turn,
      playerId,
      fromLevel,
      toLevel,
      timestamp: Date.now()
    });

    return {
      success: true,
      playerId,
      fromLevel,
      toLevel,
      isFirstToLevel: enterResult ? enterResult.isFirstToReach : false,
      isTopReached: toLevel === this.totalLevels
    };
  }

  /**
   * 检查指定层的守卫是否被击败
   * @param {number} level - 层数
   */
  isGuardianDefeated(level) {
    const towerLevel = this.getLevel(level);
    if (towerLevel && towerLevel.guardian) {
      return towerLevel.guardian.isDefeated;
    }
    return false;
  }

  /**
   * 获取所有被击败的守卫
   */
  getDefeatedGuardians() {
    return this.levels
      .filter(l => l.guardian && l.guardian.isDefeated)
      .map(l => ({
        level: l.level,
        defeatedBy: l.firstToReach
      }));
  }

  /**
   * 获取指定层的守卫状态
   * @param {number} level - 层数
   */
  getGuardianStatus(level) {
    const towerLevel = this.getLevel(level);
    if (!towerLevel || !towerLevel.guardian) {
      return null;
    }

    const guardian = towerLevel.guardian;
    return {
      level: guardian.level,
      isDefeated: guardian.isDefeated,
      remainingCards: guardian.getAvailableCards().length,
      totalCards: guardian.cards.length,
      hasUsedEnrage: guardian.hasUsedEnrage,
      enrageCardsLeft: guardian.enrageCards.length,
      firstDefeatedBy: towerLevel.firstToReach
    };
  }

  /**
   * 获取所有层的守卫状态
   */
  getAllGuardianStatus() {
    return this.levels.map(level => this.getGuardianStatus(level.level));
  }

  /**
   * 获取当前各层玩家分布
   */
  getPlayerDistribution() {
    const distribution = {};
    for (const level of this.levels) {
      distribution[level.level] = {
        occupantCount: level.occupants.size,
        occupants: level.getOccupants()
      };
    }
    return distribution;
  }

  /**
   * 获取玩家当前所在层
   * @param {number} playerId - 玩家ID
   */
  getPlayerLevel(playerId) {
    for (const level of this.levels) {
      if (level.occupants.has(playerId)) {
        return level.level;
      }
    }
    return 0; // 地面
  }

  /**
   * 获取塔楼整体状态
   */
  getTowerStatus() {
    return {
      totalLevels: this.totalLevels,
      topReached: this.topReached,
      firstAscender: this.firstAscender,
      defeatedGuardians: this.getDefeatedGuardians().length,
      levelStatus: this.levels.map(l => l.getStatus())
    };
  }

  /**
   * 获取层数变化统计
   */
  getLevelChangeStats() {
    const stats = {
      totalMoves: this.levelHistory.length,
      promotions: 0,
      demotions: 0,
      levelReached: new Set()
    };

    for (const record of this.levelHistory) {
      if (record.toLevel > record.fromLevel) {
        stats.promotions++;
      } else if (record.toLevel < record.fromLevel) {
        stats.demotions++;
      }
      stats.levelReached.add(record.toLevel);
    }

    stats.uniqueLevelsReached = stats.levelReached.size;
    return stats;
  }

  /**
   * 获取指定玩家的层数变化历史
   * @param {number} playerId - 玩家ID
   */
  getPlayerLevelHistory(playerId) {
    return this.levelHistory.filter(h => h.playerId === playerId);
  }

  /**
   * 检查是否有玩家可以跳过某层
   * @param {number} level - 层数
   */
  canSkipLevel(level) {
    const towerLevel = this.getLevel(level);
    if (!towerLevel || !towerLevel.guardian) {
      return false;
    }
    // 守卫被击败后可以跳过
    return towerLevel.guardian.isDefeated;
  }

  /**
   * 重置塔楼
   */
  reset() {
    this.levels = [];
    this.topReached = false;
    this.firstAscender = null;
    this.levelHistory = [];
  }
}

module.exports = {
  Tower,
  TowerLevel
};
