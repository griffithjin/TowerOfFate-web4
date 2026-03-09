const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./room-manager');
const GameServer = require('./game-server');
const Matchmaking = require('./matchmaking');

class TowerOfFateServer {
    constructor(port = 3001) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.roomManager = new RoomManager();
        this.gameServer = new GameServer(this.io);
        this.matchmaking = new Matchmaking(this.roomManager);

        this.setupMiddleware();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(cors({
            origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
            credentials: true
        }));
        this.app.use(express.json());

        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                rooms: this.roomManager.getRoomCount(),
                players: this.roomManager.getPlayerCount(),
                timestamp: Date.now()
            });
        });

        this.app.get('/rooms', (req, res) => {
            res.json(this.roomManager.getPublicRooms());
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);

            socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
            socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
            socket.on('player_ready', (data) => this.handlePlayerReady(socket, data));
            socket.on('start_game', (data) => this.handleStartGame(socket, data));
            socket.on('play_card', (data) => this.handlePlayCard(socket, data));
            socket.on('quick_match', (data) => this.handleQuickMatch(socket, data));
            socket.on('ranked_match', (data) => this.handleRankedMatch(socket, data));
            socket.on('disconnect', () => this.handleDisconnect(socket));
            socket.on('reconnect_attempt', (data) => this.handleReconnect(socket, data));
        });
    }

    handleJoinRoom(socket, data) {
        const { roomId, playerName, playerId } = data;
        const player = {
            id: playerId || socket.id,
            name: playerName || `Player_${socket.id.slice(0, 6)}`,
            socketId: socket.id,
            isAI: false,
            isReady: false
        };

        const result = this.roomManager.joinRoom(roomId, player);
        if (result.success) {
            socket.join(roomId);
            socket.roomId = roomId;
            socket.playerId = player.id;

            socket.to(roomId).emit('player_joined', {
                player: player,
                room: result.room
            });

            socket.emit('room_joined', {
                success: true,
                room: result.room,
                playerId: player.id
            });

            console.log(`Player ${player.name} joined room ${roomId}`);
        } else {
            socket.emit('room_joined', {
                success: false,
                error: result.error
            });
        }
    }

    handleLeaveRoom(socket, data) {
        const { roomId } = data;
        const playerId = socket.playerId;

        if (!roomId || !playerId) return;

        const result = this.roomManager.leaveRoom(roomId, playerId);
        if (result.success) {
            socket.leave(roomId);
            socket.to(roomId).emit('player_left', {
                playerId: playerId,
                room: result.room
            });

            if (result.roomEmpty) {
                this.gameServer.endGame(roomId);
            }

            delete socket.roomId;
            delete socket.playerId;
        }
    }

    handlePlayerReady(socket, data) {
        const { roomId, isReady } = data;
        const playerId = socket.playerId;

        if (!roomId || !playerId) return;

        const result = this.roomManager.setPlayerReady(roomId, playerId, isReady);
        if (result.success) {
            this.io.to(roomId).emit('player_ready_changed', {
                playerId: playerId,
                isReady: isReady,
                room: result.room
            });

            if (result.canStart) {
                this.io.to(roomId).emit('can_start_game', {
                    message: 'All players are ready'
                });
            }
        }
    }

    handleStartGame(socket, data) {
        const { roomId } = data;
        const playerId = socket.playerId;

        if (!roomId || !playerId) return;

        const room = this.roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('game_error', { error: 'Room not found' });
            return;
        }

        if (!this.roomManager.canStartGame(roomId)) {
            socket.emit('game_error', { error: 'Cannot start game' });
            return;
        }

        this.roomManager.setRoomStatus(roomId, 'playing');
        this.gameServer.startGame(roomId, room.players);

        this.io.to(roomId).emit('game_started', {
            roomId: roomId,
            players: room.players,
            timestamp: Date.now()
        });
    }

    handlePlayCard(socket, data) {
        const { roomId, cardId, targetId } = data;
        const playerId = socket.playerId;

        if (!roomId || !playerId) return;

        this.gameServer.handlePlayCard(roomId, playerId, cardId, targetId);
    }

    handleQuickMatch(socket, data) {
        const { playerName, playerId } = data;
        const player = {
            id: playerId || socket.id,
            name: playerName || `Player_${socket.id.slice(0, 6)}`,
            socketId: socket.id,
            isAI: false,
            isReady: true
        };

        const match = this.matchmaking.findQuickMatch(player);
        if (match.roomId) {
            socket.join(match.roomId);
            socket.roomId = match.roomId;
            socket.playerId = player.id;

            socket.emit('match_found', {
                roomId: match.roomId,
                room: match.room
            });

            if (match.isFull) {
                this.io.to(match.roomId).emit('match_ready', {
                    roomId: match.roomId,
                    countdown: 5
                });

                setTimeout(() => {
                    this.roomManager.setRoomStatus(match.roomId, 'playing');
                    this.gameServer.startGame(match.roomId, match.room.players);
                    this.io.to(match.roomId).emit('game_started', {
                        roomId: match.roomId,
                        players: match.room.players,
                        timestamp: Date.now()
                    });
                }, 5000);
            }
        }
    }

    handleRankedMatch(socket, data) {
        const { playerName, playerId, rank } = data;
        const player = {
            id: playerId || socket.id,
            name: playerName || `Player_${socket.id.slice(0, 6)}`,
            socketId: socket.id,
            isAI: false,
            isReady: true,
            rank: rank || 0
        };

        const match = this.matchmaking.findRankedMatch(player);
        if (match.roomId) {
            socket.join(match.roomId);
            socket.roomId = match.roomId;
            socket.playerId = player.id;

            socket.emit('match_found', {
                roomId: match.roomId,
                room: match.room,
                ranked: true
            });

            if (match.isFull) {
                this.io.to(match.roomId).emit('match_ready', {
                    roomId: match.roomId,
                    countdown: 5,
                    ranked: true
                });

                setTimeout(() => {
                    this.roomManager.setRoomStatus(match.roomId, 'playing');
                    this.gameServer.startGame(match.roomId, match.room.players);
                    this.io.to(match.roomId).emit('game_started', {
                        roomId: match.roomId,
                        players: match.room.players,
                        ranked: true,
                        timestamp: Date.now()
                    });
                }, 5000);
            }
        }
    }

    handleDisconnect(socket) {
        console.log(`Player disconnected: ${socket.id}`);

        const { roomId, playerId } = socket;
        if (roomId && playerId) {
            this.roomManager.markPlayerDisconnected(roomId, playerId);
            socket.to(roomId).emit('player_disconnect', {
                playerId: playerId,
                timestamp: Date.now()
            });

            setTimeout(() => {
                const isReconnected = this.roomManager.isPlayerReconnected(roomId, playerId);
                if (!isReconnected) {
                    const result = this.roomManager.leaveRoom(roomId, playerId);
                    if (result.success) {
                        this.io.to(roomId).emit('player_left', {
                            playerId: playerId,
                            disconnected: true
                        });

                        if (result.roomEmpty) {
                            this.gameServer.endGame(roomId);
                        } else if (result.room.status === 'playing') {
                            this.gameServer.handlePlayerDisconnect(roomId, playerId);
                        }
                    }
                }
            }, 30000);
        }
    }

    handleReconnect(socket, data) {
        const { roomId, playerId } = data;

        const room = this.roomManager.getRoom(roomId);
        if (!room) {
            socket.emit('reconnect_failed', { error: 'Room not found' });
            return;
        }

        const player = room.players.find(p => p.id === playerId);
        if (!player) {
            socket.emit('reconnect_failed', { error: 'Player not found in room' });
            return;
        }

        player.socketId = socket.id;
        this.roomManager.markPlayerReconnected(roomId, playerId);

        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerId = playerId;

        const gameState = this.gameServer.getGameState(roomId);
        socket.emit('reconnect_success', {
            room: room,
            gameState: gameState,
            timestamp: Date.now()
        });

        socket.to(roomId).emit('player_reconnected', {
            playerId: playerId,
            timestamp: Date.now()
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Tower of Fate Server running on port ${this.port}`);
        });
    }
}

const port = process.env.PORT || 3001;
const server = new TowerOfFateServer(port);
server.start();

module.exports = TowerOfFateServer;
