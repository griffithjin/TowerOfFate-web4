/**
 * 命运塔·首登者 - 游戏核心模块入口
 * Tower of Fate: First Ascender - Core Module Entry
 */

const { GameEngine, Deck, Card, Guardian, SUITS, RANKS, RANK_VALUES } = require('./game-engine');
const { Tower, TowerLevel } = require('./tower');
const { Player, PlayerManager } = require('./player');
const {
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
} = require('./ai');

module.exports = {
  // 游戏引擎
  GameEngine,
  Deck,
  Card,
  Guardian,
  SUITS,
  RANKS,
  RANK_VALUES,

  // 塔楼系统
  Tower,
  TowerLevel,

  // 玩家系统
  Player,
  PlayerManager,

  // AI系统
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
