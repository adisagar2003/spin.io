/**
 * Core game types and interfaces for GoGoGoGo fidget spinner game
 */

/** 2D Vector for position, velocity, etc. */
export interface Vector2 {
  x: number;
  y: number;
}

/** Player's fidget spinner entity */
export interface Spinner {
  /** Current position in game world */
  position: Vector2;
  /** Movement velocity */
  velocity: Vector2;
  /** Target direction for movement */
  targetDirection: Vector2;
  /** Current size/radius */
  size: number;
  /** Visual rotation speed (radians per second) */
  spinSpeed: number;
  /** Current rotation angle */
  rotation: number;
  /** Maximum movement speed */
  maxSpeed: number;
}

/** Collectible dots scattered in arena */
export interface Dot {
  /** Unique identifier */
  id: string;
  /** Position in game world */
  position: Vector2;
  /** Size/radius */
  size: number;
  /** Growth value when collected */
  value: number;
}

/** Current game state */
export interface GameState {
  /** Current game phase */
  phase: GamePhase;
  /** Player's spinner */
  spinner: Spinner;
  /** Array of collectible dots */
  dots: Dot[];
  /** Current score (spinner size) */
  score: number;
  /** Time elapsed in seconds */
  timeElapsed: number;
  /** Arena boundaries */
  arena: {
    width: number;
    height: number;
  };
}

/** Game phases */
export enum GamePhase {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

/** Keyboard control keys */
export type KeyboardControlKey = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD';

/** Keyboard control mapping */
export type KeyboardControlMap = {
  readonly [K in KeyboardControlKey]: Vector2;
};

/** Input state for controls */
export interface InputState {
  /** Is input currently active */
  isActive: boolean;
  /** Current input position (touch/mouse) */
  position: Vector2;
  /** Input type */
  type: 'touch' | 'mouse' | 'keyboard';
  /** Currently pressed keys (keyboard only) */
  pressedKeys?: Set<KeyboardControlKey>;
  /** Keyboard input priority (when both keyboard and touch/mouse active) */
  keyboardPriority?: boolean;
}

/** High score entry */
export interface HighScore {
  /** Final score/size achieved */
  score: number;
  /** Date/time of achievement */
  date: string;
  /** Time survived in seconds */
  timeElapsed: number;
}

/** Storage keys for AsyncStorage */
export enum StorageKeys {
  HIGH_SCORES = 'high_scores',
  SETTINGS = 'game_settings',
}

/** Game settings */
export interface GameSettings {
  /** Sound effects enabled */
  soundEnabled: boolean;
  /** Vibration enabled */
  vibrationEnabled: boolean;
  /** Has purchased ad removal */
  adRemovalPurchased: boolean;
}

/** RevenueCat product configuration */
export interface PurchaseProduct {
  /** Product identifier */
  identifier: string;
  /** Display price */
  price: string;
  /** Product title */
  title: string;
  /** Product description */
  description: string;
}

/** Collision detection result */
export interface CollisionResult {
  /** Did collision occur */
  hasCollision: boolean;
  /** Distance between objects */
  distance: number;
  /** Collision normal vector */
  normal?: Vector2;
}

/** Game configuration constants */
export const GAME_CONFIG = {
  /** Arena dimensions */
  ARENA_WIDTH: 800,
  ARENA_HEIGHT: 600,
  
  /** Spinner settings */
  SPINNER_INITIAL_SIZE: 15,
  SPINNER_MAX_SIZE: 100,
  SPINNER_INITIAL_SPEED: 200,
  SPINNER_INITIAL_SPIN_SPEED: Math.PI * 2, // 1 rotation per second
  SPINNER_SPIN_SPEED_INCREASE: 0.05, // 5% increase per dot
  
  /** Dot settings */
  DOT_COUNT: 25,  // Reduced for smaller arena
  DOT_MIN_SIZE: 8,   // Restored to reasonable size
  DOT_MAX_SIZE: 15,  // Restored to reasonable size
  DOT_GROWTH_MIN: 1,
  DOT_GROWTH_MAX: 5,
  DOT_RESPAWN_MARGIN: 50,
  
  /** Physics */
  MOVEMENT_DAMPING: 0.95,
  ACCELERATION: 800,
  
  /** Rendering */
  TARGET_FPS: 60,
  CANVAS_SCALE: 1,
} as const;

/** Color constants */
export const COLORS = {
  BACKGROUND: '#000000',
  SPINNER: '#00FF88',
  DOT: '#FF0000',  // Changed to bright red for debugging visibility
  UI_TEXT: '#FFFFFF',
  UI_BUTTON: '#333333',
  UI_BUTTON_TEXT: '#FFFFFF',
} as const