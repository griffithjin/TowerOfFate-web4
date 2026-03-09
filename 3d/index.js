/**
 * Tower of Fate 3D Visualization System
 * 命运塔3D可视化系统入口
 */

import { SceneManager } from './scene.js';
import { Tower3D } from './tower3d.js';
import { Cards3D } from './cards3d.js';
import { Effects } from './effects.js';

/**
 * TowerOfFate3D - 主控制器类
 */
export class TowerOfFate3D {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            throw new Error('Container not found');
        }

        this.options = {
            showCards: true,
            autoRotate: true,
            onLayerClick: () => {},
            onCardClick: () => {},
            onCardPlay: () => {},
            ...options
        };

        this.isRunning = false;
        this.lastTime = 0;

        this.init();
    }

    /**
     * 初始化3D系统
     */
    init() {
        // 1. 场景管理
        this.sceneManager = new SceneManager(this.container);

        // 2. 塔楼系统
        this.tower = new Tower3D(this.sceneManager, {
            onLayerClick: this.handleLayerClick.bind(this)
        });

        // 3. 特效系统
        this.effects = new Effects(this.sceneManager);

        // 4. 卡牌系统（可选）
        if (this.options.showCards) {
            this.cards = new Cards3D(this.sceneManager, {
                onCardClick: this.handleCardClick.bind(this),
                onCardPlay: this.handleCardPlay.bind(this)
            });
        }

        // 开始渲染循环
        this.start();
    }

    /**
     * 开始渲染循环
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    /**
     * 停止渲染循环
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * 渲染循环
     */
    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        const elapsedTime = currentTime / 1000;
        this.lastTime = currentTime;

        // 更新各系统
        this.sceneManager.update(deltaTime, elapsedTime);
        this.tower.update(deltaTime, elapsedTime);
        this.effects.update(deltaTime, elapsedTime);

        if (this.cards) {
            this.cards.update(deltaTime, elapsedTime);
        }

        // 渲染
        this.sceneManager.render();

        requestAnimationFrame(() => this.animate());
    }

    /**
     * 处理层点击
     */
    handleLayerClick(layerIndex, config) {
        console.log(`Layer ${layerIndex + 1} clicked:`, config.name);
        this.options.onLayerClick(layerIndex, config);
    }

    /**
     * 处理卡牌点击
     */
    handleCardClick(cardData) {
        console.log('Card clicked:', cardData.name);
        this.options.onCardClick(cardData);
    }

    /**
     * 处理卡牌打出
     */
    handleCardPlay(cardData) {
        console.log('Card played:', cardData.name);
        this.options.onCardPlay(cardData);
    }

    // ==================== 塔楼API ====================

    /**
     * 添加玩家到指定层
     */
    addPlayer(playerId, layerIndex, options = {}) {
        return this.tower.addPlayerToLayer(playerId, layerIndex, options);
    }

    /**
     * 移除玩家
     */
    removePlayer(playerId) {
        this.tower.removePlayer(playerId);
    }

    /**
     * 移动玩家到指定层
     */
    movePlayer(playerId, targetLayerIndex) {
        return this.tower.movePlayerToLayer(playerId, targetLayerIndex);
    }

    /**
     * 添加守卫到层
     */
    addGuard(layerIndex, options = {}) {
        return this.tower.addGuardToLayer(layerIndex, options);
    }

    /**
     * 移除守卫
     */
    removeGuard(layerIndex) {
        this.tower.removeGuard(layerIndex);
    }

    /**
     * 选择层
     */
    selectLayer(layerIndex) {
        this.tower.selectLayer(layerIndex);
    }

    /**
     * 重置视角
     */
    resetView() {
        this.tower.resetView();
    }

    // ==================== 卡牌API ====================

    /**
     * 添加卡牌到手牌
     */
    addCard(cardData) {
        if (!this.cards) return null;
        return this.cards.addCard(cardData);
    }

    /**
     * 移除卡牌
     */
    removeCard(cardId) {
        if (!this.cards) return;
        this.cards.removeCard(cardId);
    }

    /**
     * 清空手牌
     */
    clearHand() {
        if (!this.cards) return;
        this.cards.clearHand();
    }

    /**
     * 选中卡牌
     */
    selectCard(cardId) {
        if (!this.cards) return;
        this.cards.selectCard(cardId);
    }

    /**
     * 打出卡牌
     */
    playCard(cardId) {
        if (!this.cards) return;
        const playPosition = new THREE.Vector3(0, 5, 8);
        this.cards.playCard(cardId, playPosition);
    }

    // ==================== 特效API ====================

    /**
     * 播放晋升特效
     */
    playPromotionEffect(layerIndex) {
        const layer = this.tower.getLayerInfo(layerIndex);
        if (layer) {
            this.effects.createPromotionEffect(layer.mesh.position);
        }
    }

    /**
     * 播放回退特效
     */
    playDemotionEffect(layerIndex) {
        const layer = this.tower.getLayerInfo(layerIndex);
        if (layer) {
            this.effects.createDemotionEffect(layer.mesh.position);
        }
    }

    /**
     * 播放激怒特效
     */
    playEnrageEffect(layerIndex) {
        const layer = this.tower.getLayerInfo(layerIndex);
        if (layer) {
            this.effects.createEnrageEffect(layer.mesh.position);
        }
    }

    /**
     * 播放首登者特效
     */
    playFirstAscenderEffect(layerIndex) {
        const layer = this.tower.getLayerInfo(layerIndex);
        if (layer) {
            this.effects.createFirstAscenderEffect(layer.mesh.position);
        }
    }

    /**
     * 清除所有特效
     */
    clearEffects() {
        this.effects.clearAllEffects();
    }

    // ==================== 工具方法 ====================

    /**
     * 调整大小
     */
    resize() {
        this.sceneManager.resizeHandler();
    }

    /**
     * 销毁
     */
    dispose() {
        this.stop();

        if (this.cards) {
            this.cards.dispose();
        }

        this.effects.dispose();
        this.tower.dispose();
        this.sceneManager.dispose();
    }
}

// 导出所有模块
export { SceneManager } from './scene.js';
export { Tower3D } from './tower3d.js';
export { Cards3D } from './cards3d.js';
export { Effects } from './effects.js';

// 默认导出
export default TowerOfFate3D;
