const { v4: uuidv4 } = require('uuid');

class Matchmaking {
    constructor(roomManager) {
        this.roomManager = roomManager;
        this.quickMatchQueue = [];
        this.rankedQueues = new Map();
        this.rankRanges = [
            { min: 0, max: 999, name: 'Bronze' },
            { min: 1000, max: 1999, name: 'Silver' },
            { min: 2000, max: 2999, name: 'Gold' },
            { min: 3000, max: 3999, name: 'Platinum' },
            { min: 4000, max: 4999, name: 'Diamond' },
            { min: 5000, max: Infinity, name: 'Master' }
        ];
        this.matchCheckInterval = null;
        this.startMatchCheck();
    }

    startMatchCheck() {
        this.matchCheckInterval = setInterval(() => {
            this.processQueues();
        }, 2000);
    }

    stopMatchCheck() {
        if (this.matchCheckInterval) {
            clearInterval(this.matchCheckInterval);
            this.matchCheckInterval = null;
        }
    }

    findQuickMatch(player) {
        const existingRoom = this.findAvailableRoom();

        if (existingRoom) {
            const joinResult = this.roomManager.joinRoom(existingRoom.id, player);
            if (joinResult.success) {
                const isFull = joinResult.room.players.length >= joinResult.room.maxPlayers;

                if (isFull) {
                    this.fillRemainingSlotsWithAI(joinResult.room);
                }

                return {
                    roomId: existingRoom.id,
                    room: joinResult.room,
                    isFull: isFull
                };
            }
        }

        const newRoomId = uuidv4().slice(0, 8);
        const createResult = this.roomManager.createRoom(player, {
            roomId: newRoomId,
            isPublic: true,
            maxPlayers: 4
        });

        if (createResult.success) {
            this.roomManager.joinRoom(newRoomId, player);

            return {
                roomId: newRoomId,
                room: createResult.room,
                isFull: false
            };
        }

        return { roomId: null, room: null, isFull: false };
    }

    findRankedMatch(player) {
        const playerRank = player.rank || 0;
        const rankTier = this.getRankTier(playerRank);

        if (!this.rankedQueues.has(rankTier)) {
            this.rankedQueues.set(rankTier, []);
        }

        const queue = this.rankedQueues.get(rankTier);

        const existingEntry = queue.find(q => q.player.id === player.id);
        if (existingEntry) {
            existingEntry.player.socketId = player.socketId;
            existingEntry.joinedAt = Date.now();
        } else {
            queue.push({
                player: player,
                rank: playerRank,
                joinedAt: Date.now(),
                expandedRange: 0
            });
        }

        const match = this.tryCreateRankedMatch(rankTier);
        if (match) {
            return match;
        }

        const newRoomId = uuidv4().slice(0, 8);
        const createResult = this.roomManager.createRoom(player, {
            roomId: newRoomId,
            isPublic: false,
            maxPlayers: 4,
            gameMode: 'ranked'
        });

        if (createResult.success) {
            this.roomManager.joinRoom(newRoomId, player);

            setTimeout(() => {
                this.fillRankedRoomWithAI(newRoomId);
            }, 30000);

            return {
                roomId: newRoomId,
                room: createResult.room,
                isFull: false
            };
        }

        return { roomId: null, room: null, isFull: false };
    }

    tryCreateRankedMatch(rankTier) {
        const queue = this.rankedQueues.get(rankTier);
        if (!queue || queue.length < 2) return null;

        queue.sort((a, b) => a.joinedAt - b.joinedAt);

        const players = queue.splice(0, 4);
        const roomId = uuidv4().slice(0, 8);

        const creator = players[0].player;
        const createResult = this.roomManager.createRoom(creator, {
            roomId: roomId,
            isPublic: false,
            maxPlayers: 4,
            gameMode: 'ranked'
        });

        if (!createResult.success) {
            queue.unshift(...players);
            return null;
        }

        for (const entry of players) {
            this.roomManager.joinRoom(roomId, entry.player);
        }

        if (players.length < 4) {
            this.fillRemainingSlotsWithAI(createResult.room);
        }

        return {
            roomId: roomId,
            room: createResult.room,
            isFull: true
        };
    }

    findAvailableRoom() {
        const publicRooms = this.roomManager.getPublicRooms();
        return publicRooms.find(room =>
            room.status === 'waiting' &&
            room.playerCount < room.maxPlayers
        );
    }

    fillRemainingSlotsWithAI(room) {
        const needed = room.maxPlayers - room.players.length;
        if (needed > 0) {
            this.roomManager.fillWithAI(room.id, 'normal');
        }
    }

    fillRankedRoomWithAI(roomId) {
        const room = this.roomManager.getRoom(roomId);
        if (!room || room.status !== 'waiting') return;

        const needed = room.maxPlayers - room.players.length;
        if (needed > 0) {
            this.roomManager.fillWithAI(roomId, 'hard');

            setTimeout(() => {
                const updatedRoom = this.roomManager.getRoom(roomId);
                if (updatedRoom && updatedRoom.status === 'waiting') {
                    this.roomManager.setRoomStatus(roomId, 'playing');
                }
            }, 5000);
        }
    }

    processQueues() {
        this.processQuickMatchQueue();
        this.processRankedQueues();
    }

    processQuickMatchQueue() {
        const now = Date.now();
        const timeout = 60000;

        this.quickMatchQueue = this.quickMatchQueue.filter(entry => {
            if (now - entry.joinedAt > timeout) {
                return false;
            }

            const room = this.roomManager.getRoomByPlayerId(entry.player.id);
            if (room) {
                return false;
            }

            return true;
        });

        while (this.quickMatchQueue.length >= 4) {
            const group = this.quickMatchQueue.splice(0, 4);
            this.createMatchFromQueue(group, 'quick');
        }

        if (this.quickMatchQueue.length >= 2) {
            const waitTime = now - this.quickMatchQueue[0].joinedAt;
            if (waitTime > 10000) {
                const group = this.quickMatchQueue.splice(0, Math.min(4, this.quickMatchQueue.length));
                this.createMatchFromQueue(group, 'quick');
            }
        }
    }

    processRankedQueues() {
        const now = Date.now();

        for (const [tier, queue] of this.rankedQueues.entries()) {
            this.rankedQueues.set(tier, queue.filter(entry => {
                if (now - entry.joinedAt > 120000) return false;
                const room = this.roomManager.getRoomByPlayerId(entry.player.id);
                return !room;
            }));
        }

        for (const [tier, queue] of this.rankedQueues.entries()) {
            if (queue.length >= 2) {
                this.tryCreateRankedMatch(tier);
            }
        }
    }

    createMatchFromQueue(group, matchType) {
        const roomId = uuidv4().slice(0, 8);
        const creator = group[0].player;

        const createResult = this.roomManager.createRoom(creator, {
            roomId: roomId,
            isPublic: matchType === 'quick',
            maxPlayers: 4,
            gameMode: matchType
        });

        if (!createResult.success) return;

        for (const entry of group) {
            this.roomManager.joinRoom(roomId, entry.player);
        }

        if (group.length < 4) {
            this.fillRemainingSlotsWithAI(createResult.room);
        }
    }

    getRankTier(rank) {
        for (const range of this.rankRanges) {
            if (rank >= range.min && rank <= range.max) {
                return range.name;
            }
        }
        return 'Bronze';
    }

    getQueueStatus(playerId) {
        const quickEntry = this.quickMatchQueue.find(q => q.player.id === playerId);
        if (quickEntry) {
            return {
                inQueue: true,
                type: 'quick',
                waitTime: Date.now() - quickEntry.joinedAt
            };
        }

        for (const [tier, queue] of this.rankedQueues.entries()) {
            const rankedEntry = queue.find(q => q.player.id === playerId);
            if (rankedEntry) {
                return {
                    inQueue: true,
                    type: 'ranked',
                    tier: tier,
                    waitTime: Date.now() - rankedEntry.joinedAt
                };
            }
        }

        return { inQueue: false };
    }

    cancelMatchmaking(playerId) {
        const quickIndex = this.quickMatchQueue.findIndex(q => q.player.id === playerId);
        if (quickIndex !== -1) {
            this.quickMatchQueue.splice(quickIndex, 1);
            return { success: true, type: 'quick' };
        }

        for (const [tier, queue] of this.rankedQueues.entries()) {
            const rankedIndex = queue.findIndex(q => q.player.id === playerId);
            if (rankedIndex !== -1) {
                queue.splice(rankedIndex, 1);
                return { success: true, type: 'ranked', tier };
            }
        }

        return { success: false, error: 'Not in queue' };
    }

    getStats() {
        let totalInRankedQueues = 0;
        for (const queue of this.rankedQueues.values()) {
            totalInRankedQueues += queue.length;
        }

        return {
            quickMatchQueue: this.quickMatchQueue.length,
            rankedQueues: Object.fromEntries(
                Array.from(this.rankedQueues.entries()).map(([k, v]) => [k, v.length])
            ),
            totalInQueues: this.quickMatchQueue.length + totalInRankedQueues
        };
    }
}

module.exports = Matchmaking;
