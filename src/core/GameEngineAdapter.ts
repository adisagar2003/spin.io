/**
 * Game Engine Adapter - Compatibility layer between old and new architectures
 * Allows gradual migration from monolithic GameEngine to modular ECS architecture
 */

import { ModularGameEngine } from './ModularGameEngine';
import { GameEngine } from '../features/game/GameEngine';
import { GameState, MultiplayerGameState, GamePhase, Vector2 } from '../types';
import { GameStateManager } from '../features/game/GameStateManager';

export enum EngineType {
  LEGACY = 'legacy',
  MODULAR = 'modular'
}

/**
 * Adapter that provides a unified interface for both engine types
 */
export class GameEngineAdapter {
  private legacyEngine: GameEngine | null = null;
  private modularEngine: ModularGameEngine | null = null;
  private currentEngineType: EngineType;

  constructor(engineType: EngineType = EngineType.MODULAR) {
    this.currentEngineType = engineType;
    this.initializeEngine();
  }

  private initializeEngine(): void {
    if (this.currentEngineType === EngineType.LEGACY) {
      this.legacyEngine = new GameEngine();
      console.log('🔄 Initialized Legacy GameEngine');
    } else {
      this.modularEngine = new ModularGameEngine();
      console.log('🚀 Initialized Modular GameEngine with ECS');
    }
  }

  /**
   * Switch between engine types (for A/B testing or gradual rollout)
   */
  public switchEngine(engineType: EngineType): void {
    if (this.currentEngineType === engineType) return;

    const currentState = this.getGameState();
    this.currentEngineType = engineType;
    this.initializeEngine();

    // If switching during gameplay, try to preserve state
    if (currentState.phase === GamePhase.PLAYING) {
      console.log('⚠️ Engine switched during gameplay - state may be lost');
    }

    console.log(`🔄 Switched to ${engineType} engine`);
  }

  // Unified Interface Methods

  public startGame(): void {
    if (this.modularEngine) {
      this.modularEngine.startGame();
    } else if (this.legacyEngine) {
      this.legacyEngine.startGame();
    }
  }

  public update(deltaTime: number): void {
    if (this.modularEngine) {
      this.modularEngine.update(deltaTime);
    } else if (this.legacyEngine) {
      this.legacyEngine.update(deltaTime);
    }
  }

  public getGameState(): Readonly<GameState> {
    if (this.modularEngine) {
      return this.modularEngine.getGameState();
    } else if (this.legacyEngine) {
      return this.legacyEngine.getGameState();
    }
    throw new Error('No engine initialized');
  }

  public setSpinnerDirection(direction: Vector2): void {
    if (this.modularEngine) {
      this.modularEngine.setSpinnerDirection(direction);
    } else if (this.legacyEngine) {
      this.legacyEngine.setSpinnerDirection(direction);
    }
  }

  public stopSpinner(): void {
    if (this.modularEngine) {
      this.modularEngine.stopSpinner();
    } else if (this.legacyEngine) {
      this.legacyEngine.stopSpinner();
    }
  }

  public resetToMenu(): void {
    if (this.modularEngine) {
      this.modularEngine.resetToMenu();
    } else if (this.legacyEngine) {
      this.legacyEngine.resetToMenu();
    }
  }

  public getFinalScore(): number {
    if (this.modularEngine) {
      return this.modularEngine.getFinalScore();
    } else if (this.legacyEngine) {
      return this.legacyEngine.getFinalScore();
    }
    return 0;
  }

  public getTimeElapsed(): number {
    if (this.modularEngine) {
      return this.modularEngine.getTimeElapsed();
    } else if (this.legacyEngine) {
      return this.legacyEngine.getTimeElapsed();
    }
    return 0;
  }

  public getStateManager(): GameStateManager {
    if (this.modularEngine) {
      return this.modularEngine.getStateManager();
    } else if (this.legacyEngine) {
      return this.legacyEngine.getStateManager();
    }
    throw new Error('No engine initialized');
  }

  // Modular Engine Specific Methods

  public getMultiplayerGameState(): Readonly<MultiplayerGameState> {
    if (this.modularEngine) {
      return this.modularEngine.getMultiplayerGameState();
    }
    throw new Error('Multiplayer state only available in modular engine');
  }

  public startMultiplayerGame(players: Array<{id: string, name: string, position: Vector2, isHost: boolean}>): void {
    if (this.modularEngine) {
      this.modularEngine.startMultiplayerGame(players);
    } else {
      throw new Error('Multiplayer only supported in modular engine');
    }
  }

  public processServerUpdate(
    playerId: string, 
    serverPosition: Vector2, 
    serverVelocity: Vector2, 
    acknowledgedSequence: number
  ): void {
    if (this.modularEngine) {
      this.modularEngine.processServerUpdate(playerId, serverPosition, serverVelocity, acknowledgedSequence);
    } else {
      console.warn('Server updates only supported in modular engine');
    }
  }

  public setPlayerDirection(playerId: string, direction: Vector2): void {
    if (this.modularEngine) {
      this.modularEngine.setSpinnerDirection(direction, playerId);
    } else {
      // For legacy engine, only support local player
      if (playerId === 'local_player') {
        this.legacyEngine?.setSpinnerDirection(direction);
      }
    }
  }

  // Legacy Engine Specific Methods (for backward compatibility)

  public setGameState(newState: GameState): void {
    if (this.legacyEngine) {
      this.legacyEngine.setGameState(newState);
    } else {
      console.warn('setGameState only supported in legacy engine');
    }
  }

  // Getters

  public get engineType(): EngineType {
    return this.currentEngineType;
  }

  public get isModular(): boolean {
    return this.currentEngineType === EngineType.MODULAR;
  }

  public get isLegacy(): boolean {
    return this.currentEngineType === EngineType.LEGACY;
  }

  /**
   * Get performance metrics for comparison
   */
  public getPerformanceMetrics(): {
    engineType: EngineType;
    entityCount?: number;
    systemCount?: number;
    memoryUsage: number;
  } {
    const baseMetrics = {
      engineType: this.currentEngineType,
      memoryUsage: process.memoryUsage?.()?.heapUsed || 0
    };

    if (this.modularEngine) {
      return {
        ...baseMetrics,
        entityCount: this.modularEngine.getMultiplayerGameState().players.length + 
                    this.modularEngine.getMultiplayerGameState().dots.length,
        systemCount: 3 // Physics, Collision, Network
      };
    }

    return baseMetrics;
  }

  /**
   * Enable feature flags for gradual rollout
   */
  public static createWithFeatureFlags(featureFlags: {
    useModularEngine?: boolean;
    enableClientPrediction?: boolean;
    enableSpatialOptimization?: boolean;
  }): GameEngineAdapter {
    const engineType = featureFlags.useModularEngine ? EngineType.MODULAR : EngineType.LEGACY;
    const adapter = new GameEngineAdapter(engineType);
    
    console.log('🚀 GameEngineAdapter created with feature flags:', {
      engineType,
      ...featureFlags
    });
    
    return adapter;
  }
}