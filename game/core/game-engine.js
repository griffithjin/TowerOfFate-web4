/**
 * 命运塔·首登者 - 游戏核心引擎
 * Tower of Fate: First Ascender - Game Core Engine
 */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// 点数映射
const RANK_VALUES = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

/**
 * 卡牌类
 */
class Card {
  constructor(suit, rank, deckId = 1) {
    this.suit = suit;      // 花色
    this.rank = rank;      // 点数
    this.deckId = deckId;  // 所属牌组编号(1-4)
    this.isEnrage = false; // 是否为激怒牌
  }

  /**
   * 获取点数数值
   */
  getValue() {
    return RANK_VALUES[this.rank];
  }

  /**
   * 转换为字符串
   */
  toString() {
    const suitSymbols = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return `${this.rank}${suitSymbols[this.suit]}`;
  }

  /**
   * 创建激怒牌
   */
  static createEnrageCard(level) {
    const card = new Card('none', 'enrage', 0);
    card.isEnrage = true;
    card.enrageLevel = level;
    return card;
  }
}

/**
 * 牌组类 - 管理4副牌
 */
class Deck {
  constructor() {
    this.cards = [];
    this.discarded = [];
    this.init();
  }

  /**
   * 初始化4副牌
   */
  init() {
    this.cards = [];
    for (let deckId = 1; deckId <= 4; deckId++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(suit, rank, deckId));
        }
      }
    }
  }

  /**
   * 洗牌算法 (Fisher-Yates)
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * 发牌
   */
  draw(count = 1) {
    const drawn = [];
    for (let i = 0; i < count && this.cards.length > 0; i++) {
      drawn.push(this.cards.pop());
    }
    return drawn;
  }

  /**
   * 弃牌
   */
  discard(cards) {
    if (Array.isArray(cards)) {
      this.discarded.push(...cards);
    } else {
      this.discarded.push(cards);
    }
  }

  /**
   * 获取剩余牌数
   */
  remaining() {
    return this.cards.length;
  }
}

/**
 * 守卫类
 */
class Guardian {
  constructor(level) {
    this.level = level;           // 守卫所在层数 (1-13)
    this.cards = [];              // 守卫牌 (13张)
    this.enrageCards = [];        // 激怒牌 (3张)
    this.isDefeated = false;      // 是否被击败
    this.hasUsedEnrage = false;   // 是否使用过激怒牌
  }

  /**
   * 初始化守卫牌
   */
  init(cards) {
    this.cards = cards.slice(0, 13);
    // 创建3张激怒牌
    this.enrageCards = [
      Card.createEnrageCard(this.level),
      Card.createEnrageCard(this.level),
      Card.createEnrageCard(this.level)
    ];
  }

  /**
   * 获取当前可用的守卫牌
   */
  getAvailableCards() {
    return this.cards.filter(c => !c.played);
  }

  /**
   * 打出一张守卫牌
   */
  playCard(cardIndex) {
    if (cardIndex >= 0 && cardIndex < this.cards.length) {
      const card = this.cards[cardIndex];
      card.played = true;
      return card;
    }
    return null;
  }

  /**
   * 使用激怒牌
   */
  useEnrageCard() {
    if (this.enrageCards.length > 0 && !this.hasUsedEnrage) {
      this.hasUsedEnrage = true;
      return this.enrageCards.pop();
    }
    return null;
  }

  /**
   * 检查是否还有牌
   */
  hasCards() {
    return this.getAvailableCards().length > 0;
  }
}

/**
 * 游戏引擎类
 */
class GameEngine {
  constructor(playerCount = 4) {
    this.deck = new Deck();
    this.players = [];
    this.guardians = [];          // 13名守卫
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting';   // waiting, playing, ended
    this.firstAscender = null;    // 首登者
    this.turnCount = 0;
    this.history = [];            // 游戏历史记录
    this.playerCount = playerCount;
  }

  /**
   * 初始化游戏
   */
  initGame() {
    // 重置牌组并洗牌
    this.deck.init();
    this.deck.shuffle();

    // 初始化13名守卫
    this.initGuardians();

    // 初始化玩家
    this.initPlayers();

    // 发牌给玩家
    this.dealToPlayers();

    this.gameState = 'playing';
    this.turnCount = 0;
    this.history = [];
    this.firstAscender = null;

    return this.getGameState();
  }

  /**
   * 初始化13名守卫
   */
  initGuardians() {
    this.guardians = [];
    for (let level = 1; level <= 13; level++) {
      const guardian = new Guardian(level);
      // 每名守卫发13张牌
      const cards = this.deck.draw(13);
      guardian.init(cards);
      this.guardians.push(guardian);
    }
  }

  /**
   * 初始化玩家
   */
  initPlayers() {
    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push({
        id: i,
        name: `Player ${i + 1}`,
        hand: [],
        currentLevel: 0,      // 当前所在层数 (0 = 地面)
        isFirstAscender: false,
        playHistory: [],
        stats: {
          wins: 0,
          promotions: 0,
          demotions: 0,
          enrageTriggers: 0
        }
      });
    }
  }

  /**
   * 给玩家发牌
   */
  dealToPlayers() {
    // 每人52张牌
    for (const player of this.players) {
      player.hand = this.deck.draw(52);
    }
  }

  /**
   * 卡牌对比 - 判断晋升/回退
   * @param {Card} playerCard - 玩家出的牌
   * @param {Card} guardianCard - 守卫出的牌
   * @returns {Object} 结果对象 { type: 'promote'|'demote'|'none', levels: number }
   */
  compareCards(playerCard, guardianCard) {
    const sameSuit = playerCard.suit === guardianCard.suit;
    const sameRank = playerCard.rank === guardianCard.rank;

    if (sameSuit && sameRank) {
      // 点数花色完全一致
      return { type: 'promote', levels: 2, reason: 'perfect_match' };
    } else if (sameSuit || sameRank) {
      // 点数或花色一致
      return { type: 'promote', levels: 1, reason: 'partial_match' };
    }

    return { type: 'none', levels: 0, reason: 'no_match' };
  }

  /**
   * 激怒牌对比 - 判断回退
   * @param {Card} playerCard - 玩家出的牌
   * @param {Card} enrageCard - 激怒牌
   * @returns {Object} 结果对象 { type: 'demote'|'none', levels: number }
   */
  compareEnrage(playerCard, enrageCard) {
    // 激怒牌效果：与守卫当前层数对应的卡牌进行对比
    const guardian = this.guardians[enrageCard.enrageLevel - 1];
    if (!guardian) return { type: 'none', levels: 0 };

    // 激怒牌触发时，使用守卫的第一张可用牌作为对比基准
    const availableCards = guardian.getAvailableCards();
    if (availableCards.length === 0) return { type: 'none', levels: 0 };

    const guardianCard = availableCards[0];
    const sameSuit = playerCard.suit === guardianCard.suit;
    const sameRank = playerCard.rank === guardianCard.rank;

    if (sameSuit && sameRank) {
      return { type: 'demote', levels: 2, reason: 'enrage_perfect_match' };
    } else if (sameSuit || sameRank) {
      return { type: 'demote', levels: 1, reason: 'enrage_partial_match' };
    }

    return { type: 'none', levels: 0, reason: 'enrage_no_match' };
  }

  /**
   * 玩家出牌
   * @param {number} playerId - 玩家ID
   * @param {number} cardIndex - 手牌索引
   * @returns {Object} 出牌结果
   */
  playCard(playerId, cardIndex) {
    const player = this.players[playerId];
    if (!player || player.hand.length <= cardIndex) {
      return { success: false, error: 'Invalid player or card' };
    }

    // 获取当前层数的守卫
    const currentLevel = player.currentLevel;
    const guardian = this.guardians[currentLevel];

    if (!guardian || guardian.isDefeated) {
      // 当前层守卫已被击败，自动晋升到下一层
      if (currentLevel < 13) {
        player.currentLevel++;
        return this.playCard(playerId, cardIndex);
      }
      return { success: false, error: 'All guardians defeated' };
    }

    // 玩家出牌
    const playerCard = player.hand.splice(cardIndex, 1)[0];
    player.playHistory.push({
      card: playerCard,
      level: currentLevel,
      turn: this.turnCount
    });

    // 守卫出牌
    const guardianCard = guardian.playCard(0);
    if (!guardianCard) {
      // 守卫无牌，被击败
      guardian.isDefeated = true;
      player.currentLevel++;
      this.checkFirstAscender(player);
      return {
        success: true,
        playerCard,
        guardianCard: null,
        result: { type: 'defeat_guardian', levels: 1 },
        newLevel: player.currentLevel
      };
    }

    // 对比卡牌
    let result = this.compareCards(playerCard, guardianCard);

    // 检查激怒牌触发 (3/6/9层守卫)
    let enrageResult = null;
    if ([3, 6, 9].includes(currentLevel + 1) && !guardian.hasUsedEnrage) {
      const enrageCard = guardian.useEnrageCard();
      if (enrageCard) {
        enrageResult = this.compareEnrage(playerCard, enrageCard);
        if (enrageResult.type === 'demote') {
          player.stats.enrageTriggers++;
        }
      }
    }

    // 应用结果
    let levelChange = 0;
    if (result.type === 'promote') {
      levelChange += result.levels;
      player.stats.promotions++;
    }
    if (enrageResult && enrageResult.type === 'demote') {
      levelChange -= enrageResult.levels;
      player.stats.demotions++;
    }

    // 更新玩家层数
    const oldLevel = player.currentLevel;
    player.currentLevel = Math.max(0, Math.min(13, player.currentLevel + levelChange));

    // 检查首登者
    this.checkFirstAscender(player);

    // 记录历史
    this.history.push({
      turn: this.turnCount,
      playerId,
      playerCard,
      guardianCard,
      result,
      enrageResult,
      oldLevel,
      newLevel: player.currentLevel
    });

    this.turnCount++;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    return {
      success: true,
      playerCard,
      guardianCard,
      result,
      enrageResult,
      oldLevel,
      newLevel: player.currentLevel,
      isFirstAscender: player.isFirstAscender
    };
  }

  /**
   * 检查首登者
   */
  checkFirstAscender(player) {
    if (!this.firstAscender && player.currentLevel >= 13) {
      this.firstAscender = player.id;
      player.isFirstAscender = true;
      player.stats.wins++;
      this.gameState = 'ended';
      return true;
    }
    return false;
  }

  /**
   * 获取游戏状态
   */
  getGameState() {
    return {
      gameState: this.gameState,
      currentPlayer: this.currentPlayerIndex,
      turnCount: this.turnCount,
      firstAscender: this.firstAscender,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        currentLevel: p.currentLevel,
        handSize: p.hand.length,
        isFirstAscender: p.isFirstAscender,
        stats: p.stats
      })),
      guardians: this.guardians.map(g => ({
        level: g.level,
        isDefeated: g.isDefeated,
        remainingCards: g.getAvailableCards().length,
        hasUsedEnrage: g.hasUsedEnrage
      }))
    };
  }

  /**
   * 获取玩家手牌
   */
  getPlayerHand(playerId) {
    const player = this.players[playerId];
    return player ? player.hand : [];
  }

  /**
   * 获取当前守卫信息
   */
  getCurrentGuardian(playerId) {
    const player = this.players[playerId];
    if (!player) return null;
    const guardian = this.guardians[player.currentLevel];
    if (!guardian) return null;
    return {
      level: guardian.level,
      remainingCards: guardian.getAvailableCards().length,
      hasUsedEnrage: guardian.hasUsedEnrage,
      enrageCardsLeft: guardian.enrageCards.length
    };
  }

  /**
   * 检查游戏是否结束
   */
  isGameOver() {
    return this.gameState === 'ended' || this.firstAscender !== null;
  }

  /**
   * 获取获胜者
   */
  getWinner() {
    if (this.firstAscender !== null) {
      return this.players[this.firstAscender];
    }
    return null;
  }
}

module.exports = {
  GameEngine,
  Deck,
  Card,
  Guardian,
  SUITS,
  RANKS,
  RANK_VALUES
};
