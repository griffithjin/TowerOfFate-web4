const { v4: uuidv4 } = require('uuid');

class GameServer {
    constructor(io) {
        this.io = io;
        this.games = new Map();
        this.playerTimeouts = new Map();
    }

    startGame(roomId, players) {
        const gameId = uuidv4();

        const gameState = {
            id: gameId,
            roomId: roomId,
            players: players.map((p, index) => ({
                ...p,
                index: index,
                health: 100,
                maxHealth: 100,
                mana: 3,
                maxMana: 10,
                hand: [],
                deck: this.generateDeck(),
                discard: [],
                buffs: [],
                debuffs: [],
                isDead: false,
                turnOrder: index
            })),
            currentTurn: 0,
            turnNumber: 1,
            phase: 'draw',
            status: 'playing',
            startedAt: Date.now(),
            lastActionAt: Date.now(),
            log: [],
            effects: [],
            turnTimer: null,
            turnTimeLeft: 60
        };

        for (const player of gameState.players) {
            this.drawCards(gameState, player.id, 5);
        }

        this.games.set(roomId, gameState);

        this.startTurnTimer(roomId);

        this.broadcastGameState(roomId);

        console.log(`Game started: ${gameId} in room ${roomId}`);

        return gameState;
    }

    generateDeck() {
        const cards = [];
        const cardTypes = ['attack', 'defense', 'magic', 'special'];

        for (let i = 0; i < 30; i++) {
            const type = cardTypes[Math.floor(Math.random() * cardTypes.length)];
            cards.push({
                id: `card_${uuidv4().slice(0, 8)}`,
                type: type,
                name: this.getCardName(type),
                cost: Math.floor(Math.random() * 3) + 1,
                value: Math.floor(Math.random() * 10) + 5,
                description: this.getCardDescription(type)
            });
        }

        return this.shuffleDeck(cards);
    }

    getCardName(type) {
        const names = {
            attack: ['Strike', 'Slash', 'Pierce', 'Crush', 'Bite'],
            defense: ['Block', 'Shield', 'Dodge', 'Parry', 'Barrier'],
            magic: ['Fireball', 'Ice Shard', 'Lightning', 'Heal', 'Curse'],
            special: ['Trap', 'Steal', 'Counter', 'Rage', 'Focus']
        };
        const typeNames = names[type] || names.attack;
        return typeNames[Math.floor(Math.random() * typeNames.length)];
    }

    getCardDescription(type) {
        const descriptions = {
            attack: 'Deal damage to target enemy',
            defense: 'Reduce incoming damage',
            magic: 'Cast a magical effect',
            special: 'Use a special ability'
        };
        return descriptions[type] || 'Unknown effect';
    }

    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    drawCards(gameState, playerId, count) {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return;

        for (let i = 0; i < count; i++) {
            if (player.deck.length === 0) {
                if (player.discard.length === 0) break;
                player.deck = this.shuffleDeck(player.discard);
                player.discard = [];
            }

            if (player.deck.length > 0) {
                const card = player.deck.pop();
                if (player.hand.length < 10) {
                    player.hand.push(card);
                } else {
                    player.discard.push(card);
                }
            }
        }
    }

    handlePlayCard(roomId, playerId, cardId, targetId) {
        const gameState = this.games.get(roomId);
        if (!gameState) return;

        if (gameState.status !== 'playing') return;

        const currentPlayer = gameState.players[gameState.currentTurn];
        if (currentPlayer.id !== playerId) {
            this.io.to(roomId).emit('game_error', {
                playerId,
                error: 'Not your turn'
            });
            return;
        }

        const player = gameState.players.find(p => p.id === playerId);
        if (!player || player.isDead) return;

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) {
            this.io.to(roomId).emit('game_error', {
                playerId,
                error: 'Card not in hand'
            });
            return;
        }

        const card = player.hand[cardIndex];

        if (player.mana < card.cost) {
            this.io.to(roomId).emit('game_error', {
                playerId,
                error: 'Not enough mana'
            });
            return;
        }

        player.mana -= card.cost;
        player.hand.splice(cardIndex, 1);
        player.discard.push(card);

        this.executeCardEffect(gameState, player, card, targetId);

        gameState.lastActionAt = Date.now();
        this.addGameLog(gameState, `${player.name} played ${card.name}`);

        this.checkWinCondition(gameState);

        this.broadcastGameState(roomId);
    }

    executeCardEffect(gameState, player, card, targetId) {
        const target = gameState.players.find(p => p.id === targetId);

        switch (card.type) {
            case 'attack':
                if (target && !target.isDead) {
                    let damage = card.value;
                    target.health = Math.max(0, target.health - damage);
                    if (target.health === 0) {
                        target.isDead = true;
                        this.addGameLog(gameState, `${target.name} has been defeated!`);
                    }
                }
                break;

            case 'defense':
                player.buffs.push({
                    type: 'defense',
                    value: card.value,
                    duration: 1
                });
                break;

            case 'magic':
                if (target && !target.isDead) {
                    if (card.name === 'Heal') {
                        target.health = Math.min(target.maxHealth, target.health + card.value);
                    } else {
                        let damage = card.value;
                        target.health = Math.max(0, target.health - damage);
                        if (target.health === 0) {
                            target.isDead = true;
                            this.addGameLog(gameState, `${target.name} has been defeated!`);
                        }
                    }
                }
                break;

            case 'special':
                player.buffs.push({
                    type: 'special',
                    value: card.value,
                    duration: 2
                });
                break;
        }
    }

    nextTurn(roomId) {
        const gameState = this.games.get(roomId);
        if (!gameState || gameState.status !== 'playing') return;

        const currentPlayer = gameState.players[gameState.currentTurn];

        this.processEndOfTurnEffects(gameState, currentPlayer);

        do {
            gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
            if (gameState.currentTurn === 0) {
                gameState.turnNumber++;
            }
        } while (gameState.players[gameState.currentTurn].isDead);

        const nextPlayer = gameState.players[gameState.currentTurn];

        nextPlayer.mana = Math.min(nextPlayer.maxMana, 3 + Math.floor(gameState.turnNumber / 3));
        this.drawCards(gameState, nextPlayer.id, 2);

        this.processStartOfTurnEffects(gameState, nextPlayer);

        this.resetTurnTimer(roomId);

        this.addGameLog(gameState, `Turn ${gameState.turnNumber}: ${nextPlayer.name}'s turn`);

        this.broadcastGameState(roomId);

        if (nextPlayer.isAI) {
            this.handleAITurn(roomId, nextPlayer);
        }
    }

    processEndOfTurnEffects(gameState, player) {
        player.buffs = player.buffs.filter(buff => {
            buff.duration--;
            return buff.duration > 0;
        });
        player.debuffs = player.debuffs.filter(debuff => {
            debuff.duration--;
            return debuff.duration > 0;
        });
    }

    processStartOfTurnEffects(gameState, player) {
        for (const debuff of player.debuffs) {
            if (debuff.type === 'poison') {
                player.health = Math.max(0, player.health - debuff.value);
            }
        }
    }

    handleAITurn(roomId, aiPlayer) {
        setTimeout(() => {
            const gameState = this.games.get(roomId);
            if (!gameState || gameState.status !== 'playing') return;

            const currentPlayer = gameState.players[gameState.currentTurn];
            if (currentPlayer.id !== aiPlayer.id) return;

            const playableCards = aiPlayer.hand.filter(c => c.cost <= aiPlayer.mana);

            if (playableCards.length > 0) {
                const card = playableCards[Math.floor(Math.random() * playableCards.length)];

                const targets = gameState.players.filter(p =>
                    p.id !== aiPlayer.id && !p.isDead
                );

                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    this.handlePlayCard(roomId, aiPlayer.id, card.id, target.id);
                }
            }

            setTimeout(() => {
                this.nextTurn(roomId);
            }, 1500);
        }, 2000);
    }

    startTurnTimer(roomId) {
        const gameState = this.games.get(roomId);
        if (!gameState) return;

        gameState.turnTimeLeft = 60;

        if (gameState.turnTimer) {
            clearInterval(gameState.turnTimer);
        }

        gameState.turnTimer = setInterval(() => {
            gameState.turnTimeLeft--;

            if (gameState.turnTimeLeft <= 0) {
                this.nextTurn(roomId);
            } else if (gameState.turnTimeLeft <= 10) {
                this.io.to(roomId).emit('turn_warning', {
                    timeLeft: gameState.turnTimeLeft
                });
            }
        }, 1000);
    }

    resetTurnTimer(roomId) {
        this.startTurnTimer(roomId);
    }

    checkWinCondition(gameState) {
        const alivePlayers = gameState.players.filter(p => !p.isDead);

        if (alivePlayers.length <= 1) {
            gameState.status = 'ended';
            gameState.endedAt = Date.now();

            if (gameState.turnTimer) {
                clearInterval(gameState.turnTimer);
                gameState.turnTimer = null;
            }

            const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;

            this.io.to(gameState.roomId).emit('game_ended', {
                winner: winner ? {
                    id: winner.id,
                    name: winner.name
                } : null,
                players: gameState.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    isDead: p.isDead,
                    health: p.health
                })),
                turnNumber: gameState.turnNumber,
                duration: Date.now() - gameState.startedAt
            });

            console.log(`Game ended: ${gameState.id}, Winner: ${winner ? winner.name : 'None'}`);
        }
    }

    handlePlayerDisconnect(roomId, playerId) {
        const gameState = this.games.get(roomId);
        if (!gameState) return;

        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
            player.isDisconnected = true;

            this.addGameLog(gameState, `${player.name} disconnected`);
            this.broadcastGameState(roomId);

            this.playerTimeouts.set(playerId, setTimeout(() => {
                player.isDead = true;
                this.addGameLog(gameState, `${player.name} forfeited due to disconnect`);
                this.checkWinCondition(gameState);
                this.broadcastGameState(roomId);
            }, 120000));
        }
    }

    endGame(roomId) {
        const gameState = this.games.get(roomId);
        if (gameState) {
            if (gameState.turnTimer) {
                clearInterval(gameState.turnTimer);
            }

            for (const player of gameState.players) {
                if (this.playerTimeouts.has(player.id)) {
                    clearTimeout(this.playerTimeouts.get(player.id));
                    this.playerTimeouts.delete(player.id);
                }
            }

            this.games.delete(roomId);
            console.log(`Game ended and cleaned up: ${roomId}`);
        }
    }

    getGameState(roomId) {
        const gameState = this.games.get(roomId);
        if (!gameState) return null;

        return this.sanitizeGameState(gameState);
    }

    sanitizeGameState(gameState) {
        return {
            id: gameState.id,
            roomId: gameState.roomId,
            players: gameState.players.map(p => ({
                id: p.id,
                name: p.name,
                index: p.index,
                health: p.health,
                maxHealth: p.maxHealth,
                mana: p.mana,
                maxMana: p.maxMana,
                handSize: p.hand.length,
                deckSize: p.deck.length,
                discardSize: p.discard.length,
                buffs: p.buffs,
                debuffs: p.debuffs,
                isDead: p.isDead,
                isAI: p.isAI,
                isDisconnected: p.isDisconnected,
                turnOrder: p.turnOrder
            })),
            currentTurn: gameState.currentTurn,
            turnNumber: gameState.turnNumber,
            phase: gameState.phase,
            status: gameState.status,
            startedAt: gameState.startedAt,
            turnTimeLeft: gameState.turnTimeLeft,
            log: gameState.log.slice(-20)
        };
    }

    broadcastGameState(roomId) {
        const gameState = this.games.get(roomId);
        if (!gameState) return;

        const sanitized = this.sanitizeGameState(gameState);

        for (const player of gameState.players) {
            const playerSocket = this.io.sockets.sockets.get(player.socketId);
            if (playerSocket) {
                const playerState = {
                    ...sanitized,
                    yourHand: player.hand,
                    yourDeckSize: player.deck.length,
                    yourDiscard: player.discard
                };
                playerSocket.emit('game_update', playerState);
            }
        }

        this.io.to(roomId).emit('game_state', sanitized);
    }

    addGameLog(gameState, message) {
        gameState.log.push({
            timestamp: Date.now(),
            turn: gameState.turnNumber,
            message: message
        });

        if (gameState.log.length > 100) {
            gameState.log.shift();
        }
    }
}

module.exports = GameServer;
