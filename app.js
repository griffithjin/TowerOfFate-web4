// 🏰 命运塔·首登者 V2.0 - 主应用入口
// Tower of Fate: First Ascender - Web4.0 Edition

import { GameEngine, Tower, PlayerManager, AI } from './game/core/index.js';
import { TowerOfFate3D } from './3d/index.js';
import { RewardsSystem, NFTDropSystem, GuestRewardsSystem } from './web3/index.js';

class TowerOfFateApp {
    constructor() {
        this.game = null;
        this.renderer3d = null;
        this.rewards = null;
        this.playerManager = null;
        this.currentMode = 'guest';
        this.wallet = null;

        this.init();
    }

    async init() {
        console.log('🏰 Tower of Fate V2.0 Initializing...');

        // Check for saved wallet
        this.loadWallet();

        // Initialize rewards system
        this.rewards = new GuestRewardsSystem();

        // Initialize 3D renderer if container exists
        const container = document.getElementById('tower-3d');
        if (container) {
            this.renderer3d = new TowerOfFate3D('#tower-3d', {
                onLayerClick: this.onLayerClick.bind(this),
                onCardPlay: this.onCardPlay.bind(this)
            });
        }

        // Bind UI events
        this.bindEvents();

        console.log('✅ App initialized');
    }

    loadWallet() {
        try {
            const saved = localStorage.getItem('towerOfFate_wallet');
            if (saved) {
                const data = JSON.parse(saved);
                this.wallet = data;
                this.updateWalletUI(data.wallet, data.address);
            }
        } catch (e) {
            console.log('No saved wallet');
        }
    }

    bindEvents() {
        // Game mode buttons
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.startGame(mode);
            });
        });
    }

    async startGame(mode) {
        this.currentMode = mode;

        // Check if wallet required for tournament prizes
        if (mode === 'tournament' && !this.wallet) {
            const go = confirm('锦标赛可以游玩，但领奖需要连接钱包\n是否继续以游客身份游玩？');
            if (!go) return;
        }

        // Show loading
        showToast('🎮 正在启动游戏...');

        // Initialize game engine
        this.game = new GameEngine({
            mode: mode,
            playerCount: this.getPlayerCount(mode),
            aiCount: this.getAICount(mode)
        });

        // Generate player name
        let playerName = '游客' + Math.floor(Math.random() * 9999);
        if (this.wallet) {
            playerName = this.wallet.address.slice(0, 6) + '...' + this.wallet.address.slice(-4);
        }

        // Add player
        this.playerManager = new PlayerManager();
        this.playerManager.addPlayer({
            id: 'player1',
            name: playerName,
            isAI: false,
            isGuest: !this.wallet
        });

        // Add AI players
        const aiStrategies = ['balanced', 'aggressive', 'conservative', 'probability'];
        for (let i = 0; i < this.getAICount(mode); i++) {
            const strategy = aiStrategies[Math.floor(Math.random() * aiStrategies.length)];
            this.playerManager.addPlayer({
                id: 'ai' + (i + 1),
                name: 'AI ' + (i + 1),
                isAI: true,
                strategy: strategy
            });
        }

        // Navigate to game page
        const gameUrls = {
            solo: 'game-solo.html',
            team: 'game-team.html',
            streak: 'game-streak.html',
            tournament: 'game-tournament.html'
        };

        setTimeout(() => {
            window.location.href = gameUrls[mode] || 'game.html';
        }, 500);
    }

    getPlayerCount(mode) {
        switch (mode) {
            case 'solo': return 4;
            case 'team': return 6;
            case 'streak': return 1;
            case 'tournament': return 4;
            default: return 4;
        }
    }

    getAICount(mode) {
        switch (mode) {
            case 'solo': return 3;
            case 'team': return 5;
            case 'streak': return 0;
            case 'tournament': return 3;
            default: return 3;
        }
    }

    onLayerClick(index, config) {
        console.log('Layer clicked:', index, config);
    }

    onCardPlay(card) {
        console.log('Card played:', card);
        if (this.game) {
            this.game.playCard('player1', card);
        }
    }

    updateWalletUI(walletName, address) {
        const btn = document.getElementById('walletBtn');
        if (btn) {
            btn.textContent = '✅ ' + walletName;
            btn.classList.add('connected');
        }

        const status = document.getElementById('walletStatus');
        if (status) {
            status.textContent = walletName + ' 已连接';
            status.classList.add('connected');
        }

        // Update balances
        const fate = document.getElementById('fateBalance');
        const usdt = document.getElementById('usdtBalance');
        const nft = document.getElementById('nftCount');
        const score = document.getElementById('score');

        if (fate) fate.textContent = '1,250';
        if (usdt) usdt.textContent = '500';
        if (nft) nft.textContent = '3';
        if (score) score.textContent = '8,520';
    }
}

// Initialize app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.towerApp = new TowerOfFateApp();
});

// Export for use in other modules
export default TowerOfFateApp;
