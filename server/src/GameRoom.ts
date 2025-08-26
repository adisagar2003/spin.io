/**
 * Game room handling lobby and multiplayer game session
 */

import { Room, PlayerData, MultiplayerGameState, GamePhase, GAME_CONFIG, Dot, Spinner } from './types';
import { generateId, generateRoomCode, createVector2, randomFloat } from './utils';
import { Server, Socket } from 'socket.io';

export class GameRoom {
  private room: Room;
  private io: Server;

  constructor(hostName: string, io: Server) {
    this.io = io;
    
    // Create initial game state
    const gameState: MultiplayerGameState = {
      phase: GamePhase.LOBBY,
      players: new Map(),
      dots: [],
      timeElapsed: 0,
      arena: {
        width: GAME_CONFIG.ARENA_WIDTH,
        height: GAME_CONFIG.ARENA_HEIGHT
      }
    };

    this.room = {
      id: generateId(),
      code: generateRoomCode(),
      host: '',
      players: new Map(),
      gameState,
      isPlaying: false,
      createdAt: new Date()
    };
  }

  /**
   * Add a player to the room
   */
  addPlayer(socket: Socket, playerName: string): { success: boolean; playerId?: string; error?: string } {
    // Check room capacity
    if (this.room.players.size >= GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
      return { success: false, error: 'Room is full' };
    }

    // Check if game is already in progress
    if (this.room.isPlaying) {
      return { success: false, error: 'Game already in progress' };
    }

    const playerId = socket.id;
    const isHost = this.room.players.size === 0;

    // Create player spinner
    const spinner: Spinner = {
      position: createVector2(
        GAME_CONFIG.ARENA_WIDTH / 2 + randomFloat(-50, 50),
        GAME_CONFIG.ARENA_HEIGHT / 2 + randomFloat(-50, 50)
      ),
      velocity: createVector2(0, 0),
      targetDirection: createVector2(0, 0),
      size: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      spinSpeed: GAME_CONFIG.SPINNER_INITIAL_SPIN_SPEED,
      rotation: 0,
      maxSpeed: GAME_CONFIG.SPINNER_INITIAL_SPEED
    };

    const playerData: PlayerData = {
      id: playerId,
      name: playerName,
      spinner,
      score: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      isAlive: true,
      isHost
    };

    // Set host if first player
    if (isHost) {
      this.room.host = playerId;
    }

    this.room.players.set(playerId, playerData);
    this.room.gameState.players.set(playerId, playerData);

    // Join socket room
    socket.join(this.room.code);

    console.log(`Player ${playerName} (${playerId}) joined room ${this.room.code}`);
    
    return { success: true, playerId };
  }

  /**
   * Remove a player from the room
   */
  removePlayer(playerId: string): boolean {
    if (!this.room.players.has(playerId)) {
      return false;
    }

    const wasHost = this.room.host === playerId;
    
    this.room.players.delete(playerId);
    this.room.gameState.players.delete(playerId);

    // Transfer host to another player if needed
    if (wasHost && this.room.players.size > 0) {
      const newHost = this.room.players.keys().next().value;
      this.room.host = newHost;
      const newHostPlayer = this.room.players.get(newHost)!;
      newHostPlayer.isHost = true;
      this.room.players.set(newHost, newHostPlayer);
    }

    console.log(`Player ${playerId} left room ${this.room.code}`);
    return true;
  }

  /**
   * Start the game (host only)
   */
  startGame(playerId: string): { success: boolean; error?: string } {
    if (playerId !== this.room.host) {
      return { success: false, error: 'Only host can start the game' };
    }

    if (this.room.players.size < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    if (this.room.isPlaying) {
      return { success: false, error: 'Game already started' };
    }

    // Initialize game state
    this.room.gameState.phase = GamePhase.PLAYING;
    this.room.gameState.dots = this.generateDots();
    this.room.gameState.timeElapsed = 0;
    this.room.isPlaying = true;

    console.log(`Game started in room ${this.room.code} by host ${playerId}`);
    return { success: true };
  }

  /**
   * Generate dots for the game
   */
  private generateDots(): Dot[] {
    const dots: Dot[] = [];
    
    for (let i = 0; i < GAME_CONFIG.DOT_COUNT; i++) {
      dots.push({
        id: generateId(),
        position: createVector2(
          randomFloat(GAME_CONFIG.DOT_RESPAWN_MARGIN, GAME_CONFIG.ARENA_WIDTH - GAME_CONFIG.DOT_RESPAWN_MARGIN),
          randomFloat(GAME_CONFIG.DOT_RESPAWN_MARGIN, GAME_CONFIG.ARENA_HEIGHT - GAME_CONFIG.DOT_RESPAWN_MARGIN)
        ),
        size: randomFloat(GAME_CONFIG.DOT_MIN_SIZE, GAME_CONFIG.DOT_MAX_SIZE),
        value: randomFloat(GAME_CONFIG.DOT_GROWTH_MIN, GAME_CONFIG.DOT_GROWTH_MAX)
      });
    }
    
    return dots;
  }

  /**
   * Broadcast room state to all players
   */
  broadcastRoomState(): void {
    const playersArray = Array.from(this.room.players.values());
    
    this.io.to(this.room.code).emit('ROOM_STATE', {
      roomCode: this.room.code,
      players: playersArray,
      isPlaying: this.room.isPlaying,
      phase: this.room.gameState.phase
    });
  }

  /**
   * Broadcast game state to all players (during gameplay)
   */
  broadcastGameState(): void {
    if (!this.room.isPlaying) return;

    const playersArray = Array.from(this.room.gameState.players.values());
    
    this.io.to(this.room.code).emit('GAME_STATE', {
      players: playersArray,
      dots: this.room.gameState.dots,
      timeElapsed: this.room.gameState.timeElapsed
    });
  }

  // Getters
  get code(): string { return this.room.code; }
  get playerCount(): number { return this.room.players.size; }
  get isPlaying(): boolean { return this.room.isPlaying; }
  get isEmpty(): boolean { return this.room.players.size === 0; }
  get createdAt(): Date { return this.room.createdAt; }
}