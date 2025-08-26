/**
 * Basic multiplayer server for spin.io
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Room, GamePhase, GAME_CONFIG } from './types';
import { generateRoomCode, generateId } from './utils';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory storage for rooms
const rooms = new Map<string, Room>();

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

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // TODO: Handle player leaving rooms
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 spin.io server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});

export { io, rooms };