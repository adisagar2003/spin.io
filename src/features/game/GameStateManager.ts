/**
 * Game State Manager with controlled state transitions
 * Prevents race conditions and invalid state changes
 */

import { GamePhase } from '../../types';

interface StateTransition {
  from: GamePhase;
  to: GamePhase;
  reason: string;
}

/**
 * Manages game state transitions with strict rules
 */
export class GameStateManager {
  private currentPhase: GamePhase;
  private transitionHistory: StateTransition[] = [];
  
  // Define allowed transitions
  private readonly allowedTransitions: Map<GamePhase, GamePhase[]> = new Map([
    [GamePhase.MENU, [GamePhase.PLAYING]], // Menu can only go to Playing
    [GamePhase.PLAYING, [GamePhase.GAME_OVER]], // Playing can only go to Game Over
    [GamePhase.GAME_OVER, [GamePhase.MENU, GamePhase.PLAYING]], // Game Over can go to Menu or Playing (restart)
  ]);

  constructor(initialPhase: GamePhase = GamePhase.MENU) {
    this.currentPhase = initialPhase;
    console.log('🎮 GameStateManager initialized:', { phase: this.currentPhase });
  }

  /**
   * Get current game phase
   */
  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  /**
   * Attempt to transition to a new phase
   * @param newPhase - Target phase
   * @param reason - Reason for transition
   * @returns Success of transition
   */
  public transitionTo(newPhase: GamePhase, reason: string = 'Unknown'): boolean {
    const fromPhase = this.currentPhase;
    
    // Check if same phase (no-op)
    if (fromPhase === newPhase) {
      console.log(`🔄 GameState: No-op transition ${fromPhase} -> ${newPhase} (${reason})`);
      return true;
    }

    // Check if transition is allowed
    const allowedTargets = this.allowedTransitions.get(fromPhase) || [];
    const isAllowed = allowedTargets.includes(newPhase);
    
    if (!isAllowed) {
      console.error(`❌ GameState: BLOCKED transition ${fromPhase} -> ${newPhase} (${reason})`);
      console.error(`🚫 Allowed transitions from ${fromPhase}:`, allowedTargets);
      return false;
    }

    // Perform transition
    this.currentPhase = newPhase;
    
    // Record transition
    const transition: StateTransition = {
      from: fromPhase,
      to: newPhase,
      reason
    };
    this.transitionHistory.push(transition);
    
    // Keep history size manageable
    if (this.transitionHistory.length > 10) {
      this.transitionHistory.shift();
    }

    console.log(`✅ GameState: SUCCESS transition ${fromPhase} -> ${newPhase} (${reason})`);
    
    return true;
  }

  /**
   * Force transition (bypass rules) - use with extreme caution
   * @param newPhase - Target phase
   * @param reason - Reason for forced transition
   */
  public forceTransition(newPhase: GamePhase, reason: string = 'Forced'): void {
    const fromPhase = this.currentPhase;
    this.currentPhase = newPhase;
    
    const transition: StateTransition = {
      from: fromPhase,
      to: newPhase,
      reason: `FORCED: ${reason}`
    };
    this.transitionHistory.push(transition);
    
    console.warn(`⚠️ GameState: FORCED transition ${fromPhase} -> ${newPhase} (${reason})`);
  }

  /**
   * Get transition history for debugging
   */
  public getTransitionHistory(): StateTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Check if a transition is valid
   * @param targetPhase - Target phase to check
   * @returns Whether transition is valid
   */
  public canTransitionTo(targetPhase: GamePhase): boolean {
    const allowedTargets = this.allowedTransitions.get(this.currentPhase) || [];
    return allowedTargets.includes(targetPhase);
  }

  /**
   * Get allowed transitions from current state
   */
  public getAllowedTransitions(): GamePhase[] {
    return this.allowedTransitions.get(this.currentPhase) || [];
  }

  /**
   * Reset to initial state
   */
  public reset(): void {
    this.transitionTo(GamePhase.MENU, 'Reset to initial state');
  }
}