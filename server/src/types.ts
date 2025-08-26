/**
 * Core game types for multiplayer spin.io server
 */

/** 2D Vector for position, velocity, etc. */
export interface Vector2 {
  x: number;
  y: number;
}

/** Player's fidget spinner entity */
export interface Spinner {
  position: Vector2;
  velocity: Vector2;
  targetDirection: Vector2;
  size: number;
  spinSpeed: number;
  rotation: number;
  maxSpeed: number;
}

/** Collectible dots scattered in arena */
export interface Dot {
  id: string;
  position: Vector2;
  size: number;
  value: number;
}

/** Game phases */
export enum GamePhase {
  LOBBY = 'lobby',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

/** Multiplayer game state */
export interface MultiplayerGameState {
  phase: GamePhase;
  players: Map<string, PlayerData>;
  dots: Dot[];
  timeElapsed: number;
  arena: {
    width: number;
    height: number;
  };
}

/** Player data for multiplayer */
export interface PlayerData {
  id: string;
  name: string;
  spinner: Spinner;
  score: number;
  isAlive: boolean;
  isHost: boolean;
}

/** Room information */
export interface Room {
  id: string;
  code: string;
  host: string;
  players: Map<string, PlayerData>;
  gameState: MultiplayerGameState;
  isPlaying: boolean;
  createdAt: Date;
}

/** Network message types */
export interface NetworkMessages {
  // Client to Server
  CREATE_ROOM: { playerName: string };
  JOIN_ROOM: { roomCode: string; playerName: string };
  LEAVE_ROOM: {};
  START_GAME: {};
  PLAYER_INPUT: { direction: Vector2; timestamp: number };

  // Server to Client  
  ROOM_CREATED: { roomCode: string; playerId: string };
  ROOM_JOINED: { roomCode: string; playerId: string; players: PlayerData[] };
  PLAYER_JOINED: { player: PlayerData };
  PLAYER_LEFT: { playerId: string };
  GAME_STARTED: {};
  GAME_STATE: { players: PlayerData[]; dots: Dot[]; timeElapsed: number };
  PLAYER_ELIMINATED: { playerId: string };
  GAME_OVER: { winner: PlayerData | null };
  ERROR: { message: string };
}

/** Game configuration constants */
export const GAME_CONFIG = {
  ARENA_WIDTH: 800,
  ARENA_HEIGHT: 600,
  
  SPINNER_INITIAL_SIZE: 25,
  SPINNER_MAX_SIZE: 120,
  SPINNER_INITIAL_SPEED: 200,
  SPINNER_INITIAL_SPIN_SPEED: Math.PI * 2,
  
  DOT_COUNT: 25,
  DOT_MIN_SIZE: 8,
  DOT_MAX_SIZE: 15,
  DOT_GROWTH_MIN: 1,
  DOT_GROWTH_MAX: 5,
  DOT_RESPAWN_MARGIN: 50,
  
  MOVEMENT_DAMPING: 0.95,
  ACCELERATION: 800,
  
  TARGET_FPS: 60,
  MAX_PLAYERS_PER_ROOM: 4,
  ROOM_EXPIRY_MINUTES: 30,
} as const;

/** Collision detection result */
export interface CollisionResult {
  hasCollision: boolean;
  distance: number;
  normal?: Vector2;
}