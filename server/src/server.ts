/**
 * Basic multiplayer server for spin.io
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameRoom } from './GameRoom';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory storage for rooms
const rooms = new Map<string, GameRoom>();
const playerRooms = new Map<string, string>(); // playerId -> roomCode

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Test connection
  socket.emit('connected', { 
    message: 'Connected to spin.io server',
    playerId: socket.id
  });

  // Create room
  socket.on('CREATE_ROOM', (data: { playerName: string }) => {
    const gameRoom = new GameRoom(data.playerName, io);
    const result = gameRoom.addPlayer(socket, data.playerName);

    if (result.success) {
      rooms.set(gameRoom.code, gameRoom);
      playerRooms.set(socket.id, gameRoom.code);
      
      socket.emit('ROOM_CREATED', { 
        roomCode: gameRoom.code, 
        playerId: socket.id 
      });
      
      gameRoom.broadcastRoomState();
    } else {
      socket.emit('ERROR', { message: result.error });
    }
  });

  // Join room
  socket.on('JOIN_ROOM', (data: { roomCode: string; playerName: string }) => {
    const gameRoom = rooms.get(data.roomCode);
    
    if (!gameRoom) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    const result = gameRoom.addPlayer(socket, data.playerName);
    
    if (result.success) {
      playerRooms.set(socket.id, data.roomCode);
      
      socket.emit('ROOM_JOINED', { 
        roomCode: data.roomCode, 
        playerId: socket.id,
        players: Array.from(gameRoom['room'].players.values())
      });
      
      // Notify other players
      socket.to(data.roomCode).emit('PLAYER_JOINED', { 
        player: gameRoom['room'].players.get(socket.id)
      });
      
      gameRoom.broadcastRoomState();
    } else {
      socket.emit('ERROR', { message: result.error });
    }
  });

  // Start game
  socket.on('START_GAME', () => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) {
      socket.emit('ERROR', { message: 'Not in a room' });
      return;
    }

    const gameRoom = rooms.get(roomCode);
    if (!gameRoom) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    const result = gameRoom.startGame(socket.id);
    
    if (result.success) {
      io.to(roomCode).emit('GAME_STARTED', {});
      gameRoom.broadcastGameState();
    } else {
      socket.emit('ERROR', { message: result.error });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const roomCode = playerRooms.get(socket.id);
    if (roomCode) {
      const gameRoom = rooms.get(roomCode);
      if (gameRoom) {
        gameRoom.removePlayer(socket.id);
        
        // Notify other players
        socket.to(roomCode).emit('PLAYER_LEFT', { playerId: socket.id });
        
        // Clean up empty room
        if (gameRoom.isEmpty) {
          rooms.delete(roomCode);
          console.log(`Empty room ${roomCode} cleaned up`);
        } else {
          gameRoom.broadcastRoomState();
        }
      }
      
      playerRooms.delete(socket.id);
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 spin.io server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});

export { io, rooms };