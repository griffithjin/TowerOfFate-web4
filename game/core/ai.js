/**
 * 命运塔·首登者 - AI系统
 * Tower of Fate: First Ascender - AI System
 *
 * 18种AI策略实现
 */

const { Card, RANK_VALUES } = require('./game-engine');

/**
 * AI策略基类
 */
class AIStrategy {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
  }

  /**
   * 选择要出的牌
   * @param {Player} player - AI玩家
   * @param {Object} gameState - 游戏状态
   * @param {Object} guardianInfo - 守卫信息
   * @returns {number} 手牌索引
   */
  selectCard(player, gameState, guardianInfo) {
    throw new Error('Must implement selectCard method');
  }

  /**
   * 获取策略信息
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description
    };
  }
}

// ==================== 基础策略 (1-5) ====================

/**
 * 策略1: 随机策略
 * 完全随机选择手牌
 */
class RandomStrategy extends AIStrategy {
  constructor() {
    super('random', '完全随机选择手牌');
  }

  selectCard(player, gameState, guardianInfo) {
    return Math.floor(Math.random() * player.hand.length);
  }
}

/**
 * 策略2: 记牌策略
 * 记住已出的牌，计算剩余牌的概率
 */
class CardCountingStrategy extends AIStrategy {
  constructor() {
    super('card_counting', '记牌策略，计算剩余牌概率');
    this.seenCards = new Set();
  }

  selectCard(player, gameState, guardianInfo) {
    // 更新已见牌
    if (gameState.history) {
      for (const record of gameState.history) {
        if (record.playerCard) {
          const key = `${record.playerCard.suit}-${record.playerCard.rank}`;
          this.seenCards.add(key);
        }
        if (record.guardianCard) {
          const key = `${record.guardianCard.suit}-${record.guardianCard.rank}`;
          this.seenCards.add(key);
        }
      }
    }

    // 如果没有守卫信息，随机出
    if (!guardianInfo) {
      return Math.floor(Math.random() * player.hand.length);
    }

    // 计算每张手牌匹配守卫的概率
    const probabilities = player.hand.map((card, index) => {
      const cardKey = `${card.suit}-${card.rank}`;
      const seenCount = this.getSeenCount(card.suit, card.rank);
      // 4副牌中该牌总数为4，剩余概率 = (4 - seenCount) / (208 - totalSeen)
      const remainingProb = (4 - seenCount) / Math.max(1, 208 - this.seenCards.size);
      return { index, probability: remainingProb, card };
    });

    // 选择概率最高的牌
    probabilities.sort((a, b) => b.probability - a.probability);
    return probabilities[0].index;
  }

  getSeenCount(suit, rank) {
    let count = 0;
    for (const key of this.seenCards) {
      if (key.startsWith(`${suit}-${rank}`)) {
        count++;
      }
    }
    return count;
  }
}

/**
 * 策略3: 激进策略
 * 优先出高价值牌，追求快速晋升
 */
class AggressiveStrategy extends AIStrategy {
  constructor() {
    super('aggressive', '激进策略，优先出高价值牌');
  }

  selectCard(player, gameState, guardianInfo) {
    // 按点数排序，优先出高点数
    const sorted = player.hand
      .map((card, index) => ({ card, index }))
      .sort((a, b) => RANK_VALUES[b.card.rank] - RANK_VALUES[a.card.rank]);

    return sorted[0].index;
  }
}

/**
 * 策略4: 保守策略
 * 保留高价值牌，优先出低价值牌
 */
class ConservativeStrategy extends AIStrategy {
  constructor() {
    super('conservative', '保守策略，保留高价值牌');
  }

  selectCard(player, gameState, guardianInfo) {
    // 按点数排序，优先出低点数
    const sorted = player.hand
      .map((card, index) => ({ card, index }))
      .sort((a, b) => RANK_VALUES[a.card.rank] - RANK_VALUES[b.card.rank]);

    return sorted[0].index;
  }
}

/**
 * 策略5: 概率计算策略
 * 基于数学概率选择最优牌
 */
class ProbabilityStrategy extends AIStrategy {
  constructor() {
    super('probability', '概率计算策略');
  }

  selectCard(player, gameState, guardianInfo) {
    if (!guardianInfo || !guardianInfo.remainingCards) {
      return Math.floor(Math.random() * player.hand.length);
    }

    // 计算每张手牌的期望收益
    const expectations = player.hand.map((card, index) => {
      // 假设守卫牌均匀分布
      const suitMatchProb = 0.25; // 1/4 花色匹配
      const rankMatchProb = 1 / 13; // 1/13 点数匹配
      const perfectMatchProb = suitMatchProb * rankMatchProb;

      // 期望层数变化 = 完美匹配*2 + 部分匹配*1
      const expectedValue = perfectMatchProb * 2 +
                           (suitMatchProb + rankMatchProb - 2 * perfectMatchProb) * 1;

      return { index, expectedValue, card };
    });

    // 选择期望收益最高的牌
    expectations.sort((a, b) => b.expectedValue - a.expectedValue);
    return expectations[0].index;
  }
}

// ==================== 进阶策略 (6-10) ====================

/**
 * 策略6: 均衡策略
 * 平衡各花色和点数的出牌
 */
class BalancedStrategy extends AIStrategy {
  constructor() {
    super('balanced', '均衡策略，平衡各花色出牌');
    this.suitCount = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
  }

  selectCard(player, gameState, guardianInfo) {
    // 统计已出花色
    if (gameState.history) {
      for (const record of gameState.history) {
        if (record.playerCard && record.playerId === player.id) {
          this.suitCount[record.playerCard.suit]++;
        }
      }
    }

    // 找出最少出的花色
    const minSuit = Object.entries(this.suitCount)
      .sort((a, b) => a[1] - b[1])[0][0];

    // 优先出最少的花色
    const suitCards = player.hand
      .map((card, index) => ({ card, index }))
      .filter(item => item.card.suit === minSuit);

    if (suitCards.length > 0) {
      return suitCards[0].index;
    }

    return Math.floor(Math.random() * player.hand.length);
  }
}

/**
 * 策略7: 追踪策略
 * 追踪守卫剩余牌，针对性出牌
 */
class TrackingStrategy extends AIStrategy {
  constructor() {
    super('tracking', '追踪策略，针对性出牌');
    this.guardianCards = new Map(); // level -> Set of seen cards
  }

  selectCard(player, gameState, guardianInfo) {
    const currentLevel = player.currentLevel;

    // 初始化该层追踪
    if (!this.guardianCards.has(currentLevel)) {
      this.guardianCards.set(currentLevel, new Set());
    }

    // 更新已见守卫牌
    if (gameState.history) {
      for (const record of gameState.history) {
        if (record.guardianCard && record.newLevel === currentLevel) {
          const key = `${record.guardianCard.suit}-${record.guardianCard.rank}`;
          this.guardianCards.get(currentLevel).add(key);
        }
      }
    }

    const seenGuardianCards = this.guardianCards.get(currentLevel);

    // 优先出与已见守卫牌匹配的手牌
    const matchScores = player.hand.map((card, index) => {
      let score = 0;
      for (const seenKey of seenGuardianCards) {
        const [seenSuit, seenRank] = seenKey.split('-');
        if (card.suit === seenSuit) score += 1;
        if (card.rank === seenRank) score += 1;
        if (card.suit === seenSuit && card.rank === seenRank) score += 2;
      }
      return { index, score, card };
    });

    matchScores.sort((a, b) => b.score - a.score);
    return matchScores[0].index;
  }
}

/**
 * 策略8: 风险规避策略
 * 避免激怒牌触发，谨慎出牌
 */
class RiskAverseStrategy extends AIStrategy {
  constructor() {
    super('risk_averse', '风险规避策略，避免激怒牌');
  }

  selectCard(player, gameState, guardianInfo) {
    const currentLevel = player.currentLevel + 1;

    // 检查是否在激怒层
    const isEnrageLevel = [3, 6, 9].includes(currentLevel);

    if (!isEnrageLevel) {
      // 非激怒层，正常出牌
      return Math.floor(Math.random() * player.hand.length);
    }

    // 激怒层：尽量出与守卫已出牌不匹配的花色和点数
    // 保守起见，出低点数牌
    const sorted = player.hand
      .map((card, index) => ({ card, index }))
      .sort((a, b) => RANK_VALUES[a.card.rank] - RANK_VALUES[b.card.rank]);

    return sorted[0].index;
  }
}

/**
 * 策略9: 激怒利用策略
 * 主动利用激怒牌机制
 */
class EnrageExploitStrategy extends AIStrategy {
  constructor() {
    super('enrage_exploit', '激怒利用策略，主动利用激怒机制');
  }

  selectCard(player, gameState, guardianInfo) {
    const currentLevel = player.currentLevel + 1;
    const isEnrageLevel = [3, 6, 9].includes(currentLevel);

    if (!isEnrageLevel || !guardianInfo || guardianInfo.hasUsedEnrage) {
      // 非激怒层或已使用激怒牌，正常出牌
      return Math.floor(Math.random() * player.hand.length);
    }

    // 激怒层且守卫未使用激怒牌
    // 策略：出与守卫最不可能匹配的牌，避免回退
    // 选择出现频率最低的花色和点数组合

    // 简化为随机选择（因为无法预知守卫牌）
    return Math.floor(Math.random() * player.hand.length);
  }
}

/**
 * 策略10: 层数优先策略
 * 根据当前层数调整策略
 */
class LevelPriorityStrategy extends AIStrategy {
  constructor() {
    super('level_priority', '层数优先策略，根据层数调整');
  }

  selectCard(player, gameState, guardianInfo) {
    const level = player.currentLevel;

    if (level < 4) {
      // 低层：激进策略
      const sorted = player.hand
        .map((card, index) => ({ card, index }))
        .sort((a, b) => RANK_VALUES[b.card.rank] - RANK_VALUES[a.card.rank]);
      return sorted[0].index;
    } else if (level < 8) {
      // 中层：均衡策略
      return Math.floor(Math.random() * player.hand.length);
    } else {
      // 高层：保守策略，保留好牌
      const sorted = player.hand
        .map((card, index) => ({ card, index }))
        .sort((a, b) => RANK_VALUES[a.card.rank] - RANK_VALUES[b.card.rank]);
      return sorted[0].index;
    }
  }
}

// ==================== 高级策略 (11-15) ====================

/**
 * 策略11: 对手分析策略
 * 分析对手行为，针对性调整
 */
class OpponentAnalysisStrategy extends AIStrategy {
  constructor() {
    super('opponent_analysis', '对手分析策略');
    this.opponentStats = new Map();
  }

  selectCard(player, gameState, guardianInfo) {
    // 分析其他玩家的层数
    const otherPlayers = gameState.players?.filter(p => p.id !== player.id) || [];
    const avgLevel = otherPlayers.reduce((sum, p) => sum + p.currentLevel, 0) /
                     Math.max(1, otherPlayers.length);

    if (player.currentLevel < avgLevel) {
      // 落后时激进
      const sorted = player.hand
        .map((card, index) => ({ card, index }))
        .sort((a, b) => RANK_VALUES[b.card.rank] - RANK_VALUES[a.card.rank]);
      return sorted[0].index;
    } else {
      // 领先时保守
      return Math.floor(Math.random() * player.hand.length);
    }
  }
}

/**
 * 策略12: 完美匹配优先策略
 * 优先追求点数花色完全匹配
 */
class PerfectMatchStrategy extends AIStrategy {
  constructor() {
    super('perfect_match', '完美匹配优先策略');
  }

  selectCard(player, gameState, guardianInfo) {
    // 统计手牌中各花色和点数的数量
    const suitCount = {};
    const rankCount = {};

    for (const card of player.hand) {
      suitCount[card.suit] = (suitCount[card.suit] || 0) + 1;
      rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    }

    // 选择同时拥有最多花色和点数的牌
    const scores = player.hand.map((card, index) => {
      const score = (suitCount[card.suit] || 0) + (rankCount[card.rank] || 0);
      return { index, score, card };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].index;
  }
}

/**
 * 策略13: 激怒防御策略
 * 专门针对激怒牌的防御策略
 */
class EnrageDefenseStrategy extends AIStrategy {
  constructor() {
    super('enrage_defense', '激怒防御策略');
  }

  selectCard(player, gameState, guardianInfo) {
    const currentLevel = player.currentLevel + 1;

    // 只在激怒层使用特殊策略
    if (![3, 6, 9].includes(currentLevel)) {
      return Math.floor(Math.random() * player.hand.length);
    }

    // 激怒层：选择最"独特"的牌（出现次数最少的花色和点数）
    const suitCount = {};
    const rankCount = {};

    for (const card of player.hand) {
      suitCount[card.suit] = (suitCount[card.suit] || 0) + 1;
      rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
    }

    // 选择最独特的牌（出现次数最少的组合）
    const uniqueness = player.hand.map((card, index) => {
      const score = 1 / ((suitCount[card.suit] || 1) * (rankCount[card.rank] || 1));
      return { index, score, card };
    });

    uniqueness.sort((a, b) => b.score - a.score);
    return uniqueness[0].index;
  }
}

/**
 * 策略14: 记忆强化策略
 * 强化版记牌策略，记忆更多历史信息
 */
class EnhancedMemoryStrategy extends AIStrategy {
  constructor() {
    super('enhanced_memory', '记忆强化策略');
    this.fullHistory = [];
    this.cardFrequency = new Map();
  }

  selectCard(player, gameState, guardianInfo) {
    // 记录完整历史
    if (gameState.history) {
      this.fullHistory = [...this.fullHistory, ...gameState.history];
    }

    // 统计每张牌的出现频率
    for (const record of this.fullHistory) {
      if (record.playerCard) {
        const key = `${record.playerCard.suit}-${record.playerCard.rank}`;
        this.cardFrequency.set(key, (this.cardFrequency.get(key) || 0) + 1);
      }
      if (record.guardianCard) {
        const key = `${record.guardianCard.suit}-${record.guardianCard.rank}`;
        this.cardFrequency.set(key, (this.cardFrequency.get(key) || 0) + 1);
      }
    }

    // 选择频率最低的牌（剩余概率最高）
    const scores = player.hand.map((card, index) => {
      const key = `${card.suit}-${card.rank}`;
      const frequency = this.cardFrequency.get(key) || 0;
      return { index, score: -frequency, card }; // 负频率 = 选择最少见的
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].index;
  }
}

/**
 * 策略15: 终局策略
 * 根据游戏终局情况调整
 */
class EndgameStrategy extends AIStrategy {
  constructor() {
    super('endgame', '终局策略');
  }

  selectCard(player, gameState, guardianInfo) {
    const currentLevel = player.currentLevel;
    const highestLevel = Math.max(...(gameState.players || []).map(p => p.currentLevel));

    // 接近终局（10层以上）或有人接近胜利
    if (currentLevel >= 10 || highestLevel >= 11) {
      // 终局：全力冲刺，出高点数
      const sorted = player.hand
        .map((card, index) => ({ card, index }))
        .sort((a, b) => RANK_VALUES[b.card.rank] - RANK_VALUES[a.card.rank]);
      return sorted[0].index;
    }

    // 非终局：保守策略
    const sorted = player.hand
      .map((card, index) => ({ card, index }))
      .sort((a, b) => RANK_VALUES[a.card.rank] - RANK_VALUES[b.card.rank]);
    return sorted[0].index;
  }
}

// ==================== 专家策略 (16-18) ====================

/**
 * 策略16: 自适应策略
 * 根据游戏进程动态调整策略
 */
class AdaptiveStrategy extends AIStrategy {
  constructor() {
    super('adaptive', '自适应策略，动态调整');
    this.subStrategies = [
      new AggressiveStrategy(),
      new ConservativeStrategy(),
      new BalancedStrategy()
    ];
    this.currentStrategyIndex = 0;
    this.performanceHistory = [];
  }

  selectCard(player, gameState, guardianInfo) {
    // 根据最近表现切换策略
    if (this.performanceHistory.length > 5) {
      const recent = this.performanceHistory.slice(-5);
      const avgChange = recent.reduce((sum, r) => sum + r.levelChange, 0) / recent.length;

      if (avgChange < 0) {
        // 表现差，切换到保守
        this.currentStrategyIndex = 1;
      } else if (avgChange > 0.5) {
        // 表现好，保持激进
        this.currentStrategyIndex = 0;
      } else {
        // 表现一般，均衡
        this.currentStrategyIndex = 2;
      }
    }

    const result = this.subStrategies[this.currentStrategyIndex].selectCard(
      player, gameState, guardianInfo
    );

    // 记录表现（这里简化处理，实际应该记录结果）
    this.performanceHistory.push({ levelChange: 0 });

    return result;
  }
}

/**
 * 策略17: 混合策略
 * 结合多种策略的加权混合
 */
class HybridStrategy extends AIStrategy {
  constructor() {
    super('hybrid', '混合策略，多策略加权');
    this.strategies = [
      { strategy: new AggressiveStrategy(), weight: 0.3 },
      { strategy: new ConservativeStrategy(), weight: 0.3 },
      { strategy: new CardCountingStrategy(), weight: 0.4 }
    ];
  }

  selectCard(player, gameState, guardianInfo) {
    // 收集各策略的投票
    const votes = new Map();

    for (const { strategy, weight } of this.strategies) {
      const selectedIndex = strategy.selectCard(player, gameState, guardianInfo);
      votes.set(selectedIndex, (votes.get(selectedIndex) || 0) + weight);
    }

    // 选择加权得分最高的
    let bestIndex = 0;
    let bestScore = 0;
    for (const [index, score] of votes) {
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    return bestIndex;
  }
}

/**
 * 策略18: 专家策略
 * 综合所有策略优点的顶级AI
 */
class ExpertStrategy extends AIStrategy {
  constructor() {
    super('expert', '专家策略，综合所有优点');
    this.seenCards = new Set();
    this.levelHistory = [];
  }

  selectCard(player, gameState, guardianInfo) {
    // 更新历史
    this.levelHistory.push(player.currentLevel);

    // 更新已见牌
    if (gameState.history) {
      for (const record of gameState.history) {
        if (record.playerCard) {
          this.seenCards.add(`${record.playerCard.suit}-${record.playerCard.rank}`);
        }
        if (record.guardianCard) {
          this.seenCards.add(`${record.guardianCard.suit}-${record.guardianCard.rank}`);
        }
      }
    }

    const currentLevel = player.currentLevel + 1;
    const isEnrageLevel = [3, 6, 9].includes(currentLevel);
    const highestLevel = Math.max(...(gameState.players || []).map(p => p.currentLevel));
    const isEndgame = player.currentLevel >= 10 || highestLevel >= 11;

    // 计算每张手牌的综合得分
    const scores = player.hand.map((card, index) => {
      let score = 0;

      // 1. 牌值因素
      const cardValue = RANK_VALUES[card.rank];
      score += cardValue * 0.5;

      // 2. 剩余概率因素（记牌）
      const seenCount = this.getSeenCount(card.suit, card.rank);
      const remainingProb = (4 - seenCount) / Math.max(1, 208 - this.seenCards.size);
      score += remainingProb * 10;

      // 3. 激怒层调整
      if (isEnrageLevel) {
        // 激怒层降低高点数牌权重
        score -= cardValue * 0.3;
      }

      // 4. 终局调整
      if (isEndgame) {
        // 终局增加高点数牌权重
        score += cardValue * 0.5;
      }

      // 5. 落后追赶
      if (player.currentLevel < highestLevel - 2) {
        score += cardValue * 0.3;
      }

      return { index, score, card };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].index;
  }

  getSeenCount(suit, rank) {
    let count = 0;
    for (const key of this.seenCards) {
      if (key.startsWith(`${suit}-${rank}`)) {
        count++;
      }
    }
    return count;
  }
}

// ==================== AI管理器 ====================

/**
 * AI策略管理器
 */
class AIStrategyManager {
  constructor() {
    this.strategies = new Map();
    this.registerAllStrategies();
  }

  /**
   * 注册所有策略
   */
  registerAllStrategies() {
    // 基础策略
    this.register('random', RandomStrategy);
    this.register('card_counting', CardCountingStrategy);
    this.register('aggressive', AggressiveStrategy);
    this.register('conservative', ConservativeStrategy);
    this.register('probability', ProbabilityStrategy);

    // 进阶策略
    this.register('balanced', BalancedStrategy);
    this.register('tracking', TrackingStrategy);
    this.register('risk_averse', RiskAverseStrategy);
    this.register('enrage_exploit', EnrageExploitStrategy);
    this.register('level_priority', LevelPriorityStrategy);

    // 高级策略
    this.register('opponent_analysis', OpponentAnalysisStrategy);
    this.register('perfect_match', PerfectMatchStrategy);
    this.register('enrage_defense', EnrageDefenseStrategy);
    this.register('enhanced_memory', EnhancedMemoryStrategy);
    this.register('endgame', EndgameStrategy);

    // 专家策略
    this.register('adaptive', AdaptiveStrategy);
    this.register('hybrid', HybridStrategy);
    this.register('expert', ExpertStrategy);
  }

  /**
   * 注册策略
   */
  register(name, StrategyClass) {
    this.strategies.set(name, StrategyClass);
  }

  /**
   * 获取策略实例
   */
  getStrategy(name) {
    const StrategyClass = this.strategies.get(name);
    if (StrategyClass) {
      return new StrategyClass();
    }
    return new RandomStrategy(); // 默认返回随机策略
  }

  /**
   * 获取所有策略名称
   */
  getAllStrategyNames() {
    return Array.from(this.strategies.keys());
  }

  /**
   * 获取所有策略信息
   */
  getAllStrategiesInfo() {
    const info = [];
    for (const [name, StrategyClass] of this.strategies) {
      const instance = new StrategyClass();
      info.push(instance.getInfo());
    }
    return info;
  }

  /**
   * 随机获取策略
   */
  getRandomStrategy() {
    const names = this.getAllStrategyNames();
    const randomName = names[Math.floor(Math.random() * names.length)];
    return this.getStrategy(randomName);
  }
}

// 导出
module.exports = {
  AIStrategy,
  RandomStrategy,
  CardCountingStrategy,
  AggressiveStrategy,
  ConservativeStrategy,
  ProbabilityStrategy,
  BalancedStrategy,
  TrackingStrategy,
  RiskAverseStrategy,
  EnrageExploitStrategy,
  LevelPriorityStrategy,
  OpponentAnalysisStrategy,
  PerfectMatchStrategy,
  EnrageDefenseStrategy,
  EnhancedMemoryStrategy,
  EndgameStrategy,
  AdaptiveStrategy,
  HybridStrategy,
  ExpertStrategy,
  AIStrategyManager
};
