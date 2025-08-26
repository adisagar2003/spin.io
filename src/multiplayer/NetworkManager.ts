/**
 * Network manager for multiplayer communication
 */

import io, { Socket } from 'socket.io-client';
import { Vector2, GamePhase } from '../types';

export interface MultiplayerPlayerData {
  id: string;
  name: string;
  spinner: {
    position: Vector2;
    velocity: Vector2;
    targetDirection: Vector2;
    size: number;
    spinSpeed: number;
    rotation: number;
    maxSpeed: number;
  };
  score: number;
  isAlive: boolean;
  isHost: boolean;
}

export interface MultiplayerGameState {
  players: MultiplayerPlayerData[];
  dots: Array<{
    id: string;
    position: Vector2;
    size: number;
    value: number;
  }>;
  timeElapsed: number;
}

export interface RoomState {
  roomCode: string;
  players: MultiplayerPlayerData[];
  isPlaying: boolean;
  phase: GamePhase;
}

type NetworkEventHandler = (...args: any[]) => void;

export class NetworkManager {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, NetworkEventHandler[]> = new Map();
  private isConnected: boolean = false;

  /**
   * Connect to the server
   */
  async connect(serverUrl: string = 'http://localhost:3001'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl);

      this.socket.on('connect', () => {
        console.log('🔗 Connected to multiplayer server');
        this.isConnected = true;
        resolve(true);
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('❌ Failed to connect to server:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
        this.isConnected = false;
        this.emit('disconnected');
      });

      // Forward all server messages to event handlers
      this.socket.onAny((eventName: string, ...args: any[]) => {
        this.emit(eventName, ...args);
      });

      // Set connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Create a room
   */
  createRoom(playerName: string): void {
    if (!this.socket) return;
    this.socket.emit('CREATE_ROOM', { playerName });
  }

  /**
   * Join a room by code
   */
  joinRoom(roomCode: string, playerName: string): void {
    if (!this.socket) return;
    this.socket.emit('JOIN_ROOM', { roomCode, playerName });
  }

  /**
   * Start the game (host only)
   */
  startGame(): void {
    if (!this.socket) return;
    this.socket.emit('START_GAME');
  }

  /**
   * Send player input
   */
  sendInput(direction: Vector2): void {
    if (!this.socket) return;
    this.socket.emit('PLAYER_INPUT', { direction, timestamp: Date.now() });
  }

  /**
   * Add event listener
   */
  on(event: string, handler: NetworkEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: NetworkEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Test connection with ping/pong
   */
  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const startTime = Date.now();
      
      this.socket.once('pong', () => {
        resolve(Date.now() - startTime);
      });

      this.socket.emit('ping');

      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }

  // Getters
  get connected(): boolean { return this.isConnected; }
}