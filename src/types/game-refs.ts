/**
 * Type definitions for game component references
 */

import { GameState, Vector2 } from './index';

/**
 * Game engine reference interface
 */
export interface GameEngineRef {
  /** Start a new game */
  startGame: () => void;
  
  /** Update game state */
  update: (deltaTime: number) => void;
  
  /** Get current game state (immutable) */
  getGameState: () => Readonly<GameState>;
  
  /** Set spinner movement direction */
  setSpinnerDirection: (direction: Vector2) => void;
  
  /** Stop spinner movement */
  stopSpinner: () => void;
  
  /** Reset to menu state */
  resetToMenu: () => void;
  
  /** Get final score */
  getFinalScore: () => number;
  
  /** Get time elapsed */
  getTimeElapsed: () => number;
}

/**
 * Game container reference interface
 */
export interface GameContainerRef {
  /** Get game engine reference */
  getGameEngine: () => GameEngineRef | null;
  
  /** Force game loop update */
  forceUpdate: () => void;
  
  /** Pause/resume game loop */
  setPaused: (paused: boolean) => void;
}

/**
 * Game canvas reference interface
 */
export interface GameCanvasRef {
  /** Get canvas dimensions */
  getDimensions: () => { width: number; height: number };
  
  /** Force canvas redraw */
  redraw: () => void;
}