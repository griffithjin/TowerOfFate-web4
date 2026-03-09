/**
 * 命运塔·首登者 - 玩家系统
 * Tower of Fate: First Ascender - Player System
 */

const { Card } = require('./game-engine');

/**
 * 玩家类
 * 管理玩家状态、手牌、层数等
 */
class Player {
  constructor(id, name = null) {
    this.id = id;
    this.name = name || `Player ${id + 1}`;

    // 游戏状态
    this.currentLevel = 0;        // 当前所在层数 (0 = 地面)
    this.hand = [];               // 手牌
    this.isFirstAscender = false; // 是否为首登者
    this.isActive = true;         // 是否仍在游戏中

    // 游戏统计
    this.stats = {
      wins: 0,                    // 获胜次数
      promotions: 0,              // 晋升次数
      demotions: 0,               // 回退次数
      enrageTriggers: 0,          // 激怒触发次数
      cardsPlayed: 0,             // 出牌总数
      perfectMatches: 0,          // 完美匹配次数(点数花色一致)
      partialMatches: 0,          // 部分匹配次数
      turnsTaken: 0               // 行动回合数
    };

    // 历史记录
    this.playHistory = [];        // 出牌历史
    this.levelHistory = [];       // 层数变化历史
    this.matchHistory = [];       // 匹配历史

    // AI相关
    this.isAI = false;            // 是否为AI玩家
    this.aiStrategy = null;       // AI策略类型
    this.memory = {               // AI记忆(记牌用)
      playedCards: new Set(),     // 已出过的牌
      remainingCards: new Map()   // 剩余牌概率
    };
  }

  /**
   * 初始化玩家
   * @param {Array} cards - 初始手牌
   */
  init(cards) {
    this.hand = cards || [];
    this.currentLevel = 0;
    this.isFirstAscender = false;
    this.isActive = true;
    this.playHistory = [];
    this.levelHistory = [];
    this.matchHistory = [];
    this.resetStats();
    this.resetMemory();
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      wins: 0,
      promotions: 0,
      demotions: 0,
      enrageTriggers: 0,
      cardsPlayed: 0,
      perfectMatches: 0,
      partialMatches: 0,
      turnsTaken: 0
    };
  }

  /**
   * 重置AI记忆
   */
  resetMemory() {
    this.memory = {
      playedCards: new Set(),
      remainingCards: new Map()
    };
  }

  /**
   * 添加手牌
   * @param {Array|Card} cards - 要添加的牌
   */
  addCards(cards) {
    if (Array.isArray(cards)) {
      this.hand.push(...cards);
    } else {
      this.hand.push(cards);
    }
  }

  /**
   * 移除手牌
   * @param {number} index - 手牌索引
   * @returns {Card|null} 被移除的牌
   */
  removeCard(index) {
    if (index >= 0 && index < this.hand.length) {
      return this.hand.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * 根据条件移除手牌
   * @param {Function} predicate - 条件函数
   * @returns {Card|null} 被移除的牌
   */
  removeCardBy(predicate) {
    const index = this.hand.findIndex(predicate);
    if (index !== -1) {
      return this.hand.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * 获取手牌数量
   */
  getHandSize() {
    return this.hand.length;
  }

  /**
   * 检查是否有手牌
   */
  hasCards() {
    return this.hand.length > 0;
  }

  /**
   * 获取指定花色的手牌
   * @param {string} suit - 花色
   */
  getCardsBySuit(suit) {
    return this.hand.filter(card => card.suit === suit);
  }

  /**
   * 获取指定点数的手牌
   * @param {string} rank - 点数
   */
  getCardsByRank(rank) {
    return this.hand.filter(card => card.rank === rank);
  }

  /**
   * 获取手牌统计
   */
  getHandStats() {
    const suitCount = {};
    const rankCount = {};

    for (const card of this.hand) {
      suitCount[card.suit] = (suitCount[card.suit] || 0) + 1;
      rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    }

    return {
      totalCards: this.hand.length,
      suitDistribution: suitCount,
      rankDistribution: rankCount
    };
  }

  /**
   * 更新层数
   * @param {number} newLevel - 新层数
   * @param {number} turn - 当前回合
   * @param {string} reason - 变化原因
   */
  updateLevel(newLevel, turn, reason = '') {
    const oldLevel = this.currentLevel;
    this.currentLevel = Math.max(0, Math.min(13, newLevel));

    // 记录层数变化
    this.levelHistory.push({
      turn,
      fromLevel: oldLevel,
      toLevel: this.currentLevel,
      change: this.currentLevel - oldLevel,
      reason,
      timestamp: Date.now()
    });

    // 更新统计
    if (this.currentLevel > oldLevel) {
      this.stats.promotions += this.currentLevel - oldLevel;
    } else if (this.currentLevel < oldLevel) {
      this.stats.demotions += oldLevel - this.currentLevel;
    }

    return {
      oldLevel,
      newLevel: this.currentLevel,
      change: this.currentLevel - oldLevel
    };
  }

  /**
   * 记录出牌
   * @param {Card} card - 出的牌
   * @param {number} turn - 回合数
   * @param {Object} result - 出牌结果
   */
  recordPlay(card, turn, result) {
    this.playHistory.push({
      card,
      turn,
      level: this.currentLevel,
      result,
      timestamp: Date.now()
    });

    this.stats.cardsPlayed++;
    this.stats.turnsTaken++;

    // 记录匹配情况
    if (result) {
      if (result.reason === 'perfect_match') {
        this.stats.perfectMatches++;
      } else if (result.reason === 'partial_match') {
        this.stats.partialMatches++;
      }
    }

    // 更新AI记忆
    this.updateMemory(card);
  }

  /**
   * 更新AI记忆
   * @param {Card} card - 已出的牌
   */
  updateMemory(card) {
    const cardKey = `${card.suit}-${card.rank}-${card.deckId}`;
    this.memory.playedCards.add(cardKey);
  }

  /**
   * 记录激怒触发
   */
  recordEnrageTrigger() {
    this.stats.enrageTriggers++;
  }

  /**
   * 设置为首登者
   */
  setFirstAscender() {
    this.isFirstAscender = true;
    this.stats.wins++;
  }

  /**
   * 获取玩家状态
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      currentLevel: this.currentLevel,
      handSize: this.hand.length,
      isFirstAscender: this.isFirstAscender,
      isActive: this.isActive,
      isAI: this.isAI,
      aiStrategy: this.aiStrategy,
      stats: { ...this.stats }
    };
  }

  /**
   * 获取详细状态(包含手牌)
   */
  getDetailedStatus() {
    return {
      ...this.getStatus(),
      hand: this.hand.map(card => card.toString()),
      handStats: this.getHandStats()
    };
  }

  /**
   * 获取出牌历史
   */
  getPlayHistory() {
    return this.playHistory;
  }

  /**
   * 获取层数变化历史
   */
  getLevelHistory() {
    return this.levelHistory;
  }

  /**
   * 获取最近N次出牌
   * @param {number} n - 数量
   */
  getRecentPlays(n = 5) {
    return this.playHistory.slice(-n);
  }

  /**
   * 设置AI
   * @param {string} strategy - AI策略
   */
  setAI(strategy) {
    this.isAI = true;
    this.aiStrategy = strategy;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      currentLevel: this.currentLevel,
      handSize: this.hand.length,
      isFirstAscender: this.isFirstAscender,
      isActive: this.isActive,
      isAI: this.isAI,
      aiStrategy: this.aiStrategy,
      stats: this.stats,
      playHistory: this.playHistory,
      levelHistory: this.levelHistory
    };
  }

  /**
   * 从JSON恢复
   * @param {Object} data - JSON数据
   */
  static fromJSON(data) {
    const player = new Player(data.id, data.name);
    player.currentLevel = data.currentLevel;
    player.isFirstAscender = data.isFirstAscender;
    player.isActive = data.isActive;
    player.isAI = data.isAI;
    player.aiStrategy = data.aiStrategy;
    player.stats = data.stats;
    player.playHistory = data.playHistory || [];
    player.levelHistory = data.levelHistory || [];
    return player;
  }
}

/**
 * 玩家管理器
 * 管理所有玩家
 */
class PlayerManager {
  constructor() {
    this.players = new Map();
    this.playerCount = 0;
  }

  /**
   * 创建玩家
   * @param {number} count - 玩家数量
   */
  createPlayers(count) {
    this.players.clear();
    this.playerCount = count;

    for (let i = 0; i < count; i++) {
      const player = new Player(i, `Player ${i + 1}`);
      this.players.set(i, player);
    }

    return Array.from(this.players.values());
  }

  /**
   * 获取玩家
   * @param {number} id - 玩家ID
   */
  getPlayer(id) {
    return this.players.get(id);
  }

  /**
   * 获取所有玩家
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * 获取活跃玩家
   */
  getActivePlayers() {
    return this.getAllPlayers().filter(p => p.isActive);
  }

  /**
   * 获取首登者
   */
  getFirstAscender() {
    return this.getAllPlayers().find(p => p.isFirstAscender);
  }

  /**
   * 获取领先玩家(层数最高)
   */
  getLeadingPlayer() {
    return this.getAllPlayers().reduce((highest, player) => {
      return player.currentLevel > highest.currentLevel ? player : highest;
    }, this.getPlayer(0));
  }

  /**
   * 获取玩家排名
   */
  getRankings() {
    return this.getAllPlayers()
      .sort((a, b) => b.currentLevel - a.currentLevel)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.id,
        name: p.name,
        level: p.currentLevel,
        isFirstAscender: p.isFirstAscender
      }));
  }

  /**
   * 分发手牌
   * @param {Array} cards - 所有手牌
   * @param {number} cardsPerPlayer - 每人牌数
   */
  dealCards(cards, cardsPerPlayer = 52) {
    let cardIndex = 0;
    for (const player of this.players.values()) {
      const playerCards = cards.slice(cardIndex, cardIndex + cardsPerPlayer);
      player.init(playerCards);
      cardIndex += cardsPerPlayer;
    }
  }

  /**
   * 重置所有玩家
   */
  resetAll() {
    for (const player of this.players.values()) {
      player.init([]);
    }
  }

  /**
   * 获取游戏统计
   */
  getGameStats() {
    const stats = {
      totalPlayers: this.playerCount,
      activePlayers: this.getActivePlayers().length,
      firstAscender: null,
      highestLevel: 0,
      averageLevel: 0,
      totalCardsPlayed: 0,
      totalPromotions: 0,
      totalDemotions: 0
    };

    let totalLevel = 0;
    for (const player of this.players.values()) {
      if (player.isFirstAscender) {
        stats.firstAscender = player.id;
      }
      stats.highestLevel = Math.max(stats.highestLevel, player.currentLevel);
      totalLevel += player.currentLevel;
      stats.totalCardsPlayed += player.stats.cardsPlayed;
      stats.totalPromotions += player.stats.promotions;
      stats.totalDemotions += player.stats.demotions;
    }

    stats.averageLevel = totalLevel / this.playerCount;
    return stats;
  }
}

module.exports = {
  Player,
  PlayerManager
};
