const { v4: uuidv4 } = require('uuid');

class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerToRoom = new Map();
        this.maxPlayersPerRoom = 4;
        this.disconnectedPlayers = new Map();
    }

    createRoom(creator, options = {}) {
        const roomId = options.roomId || uuidv4().slice(0, 8);

        if (this.rooms.has(roomId)) {
            return { success: false, error: 'Room already exists' };
        }

        const room = {
            id: roomId,
            players: [],
            status: 'waiting',
            gameData: {},
            createdAt: Date.now(),
            isPublic: options.isPublic !== false,
            maxPlayers: options.maxPlayers || this.maxPlayersPerRoom,
            creatorId: creator.id,
            gameMode: options.gameMode || 'standard',
            turnTimeLimit: options.turnTimeLimit || 60
        };

        this.rooms.set(roomId, room);
        console.log(`Room created: ${roomId} by ${creator.name}`);

        return { success: true, room };
    }

    joinRoom(roomId, player) {
        let room = this.rooms.get(roomId);

        if (!room) {
            const createResult = this.createRoom(player, { roomId });
            if (!createResult.success) {
                return createResult;
            }
            room = createResult.room;
        }

        if (room.status === 'playing') {
            return { success: false, error: 'Game already in progress' };
        }

        if (room.status === 'ended') {
            return { success: false, error: 'Game has ended' };
        }

        if (room.players.length >= room.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        const existingPlayer = room.players.find(p => p.id === player.id);
        if (existingPlayer) {
            existingPlayer.socketId = player.socketId;
            existingPlayer.isDisconnected = false;
            return { success: true, room };
        }

        room.players.push({
            ...player,
            joinedAt: Date.now()
        });

        this.playerToRoom.set(player.id, roomId);

        return { success: true, room };
    }

    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not in room' };
        }

        room.players.splice(playerIndex, 1);
        this.playerToRoom.delete(playerId);

        const roomEmpty = room.players.length === 0;
        if (roomEmpty) {
            this.rooms.delete(roomId);
            console.log(`Room deleted: ${roomId}`);
        } else if (room.creatorId === playerId && room.players.length > 0) {
            room.creatorId = room.players[0].id;
        }

        return { success: true, room, roomEmpty };
    }

    setPlayerReady(roomId, playerId, isReady) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        const player = room.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, error: 'Player not in room' };
        }

        player.isReady = isReady;

        const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);

        return {
            success: true,
            room,
            canStart: allReady
        };
    }

    canStartGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        if (room.status !== 'waiting') return false;

        const humanPlayers = room.players.filter(p => !p.isAI);
        if (humanPlayers.length < 1) return false;

        const allReady = room.players.every(p => p.isReady);
        if (!allReady) return false;

        return room.players.length >= 2;
    }

    setRoomStatus(roomId, status) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.status = status;
            room.statusChangedAt = Date.now();
        }
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getRoomByPlayerId(playerId) {
        const roomId = this.playerToRoom.get(playerId);
        return roomId ? this.rooms.get(roomId) : null;
    }

    getPublicRooms() {
        const publicRooms = [];
        for (const room of this.rooms.values()) {
            if (room.isPublic && room.status === 'waiting') {
                publicRooms.push({
                    id: room.id,
                    playerCount: room.players.length,
                    maxPlayers: room.maxPlayers,
                    status: room.status,
                    gameMode: room.gameMode
                });
            }
        }
        return publicRooms;
    }

    getRoomCount() {
        return this.rooms.size;
    }

    getPlayerCount() {
        let count = 0;
        for (const room of this.rooms.values()) {
            count += room.players.length;
        }
        return count;
    }

    markPlayerDisconnected(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.isDisconnected = true;
            player.disconnectedAt = Date.now();

            this.disconnectedPlayers.set(playerId, {
                roomId,
                disconnectedAt: Date.now()
            });
        }
    }

    markPlayerReconnected(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.isDisconnected = false;
            delete player.disconnectedAt;
        }

        this.disconnectedPlayers.delete(playerId);
    }

    isPlayerReconnected(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const player = room.players.find(p => p.id === playerId);
        return player && !player.isDisconnected;
    }

    addAIPlayer(roomId, aiConfig = {}) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.players.length >= room.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        const aiId = `ai_${uuidv4().slice(0, 6)}`;
        const aiPlayer = {
            id: aiId,
            name: aiConfig.name || `AI_${room.players.length + 1}`,
            socketId: null,
            isAI: true,
            isReady: true,
            difficulty: aiConfig.difficulty || 'normal',
            joinedAt: Date.now()
        };

        room.players.push(aiPlayer);

        return { success: true, player: aiPlayer, room };
    }

    removeAIPlayer(roomId, aiId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        const aiIndex = room.players.findIndex(p => p.id === aiId && p.isAI);
        if (aiIndex === -1) {
            return { success: false, error: 'AI player not found' };
        }

        room.players.splice(aiIndex, 1);

        return { success: true, room };
    }

    fillWithAI(roomId, difficulty = 'normal') {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        const needed = room.maxPlayers - room.players.length;
        const added = [];

        for (let i = 0; i < needed; i++) {
            const result = this.addAIPlayer(roomId, {
                name: `AI_${i + 1}`,
                difficulty
            });
            if (result.success) {
                added.push(result.player);
            }
        }

        return { success: true, added, room };
    }

    updateGameData(roomId, gameData) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.gameData = { ...room.gameData, ...gameData };
        }
    }

    destroyRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            for (const player of room.players) {
                this.playerToRoom.delete(player.id);
                this.disconnectedPlayers.delete(player.id);
            }
            this.rooms.delete(roomId);
        }
    }
}

module.exports = RoomManager;
