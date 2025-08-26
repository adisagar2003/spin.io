/**
 * Core game engine handling game state, physics, and update logic
 */

import { 
  GameState, 
  GamePhase, 
  Spinner, 
  Dot, 
  Vector2,
  GAME_CONFIG 
} from '../../types';
import { 
  createVector2, 
  distance, 
  normalize, 
  scale, 
  add, 
  clamp, 
  circleCollision,
  randomFloat,
  generateId 
} from '../../utils/math';

export class GameEngine {
  private gameState: GameState;
  private lastUpdateTime: number = 0;

  constructor() {
    this.gameState = this.createInitialState();
  }

  /**
   * Creates initial game state
   * @returns Initial game state
   */
  private createInitialState(): GameState {
    const spinner: Spinner = {
      position: createVector2(GAME_CONFIG.ARENA_WIDTH / 2, GAME_CONFIG.ARENA_HEIGHT / 2),
      velocity: createVector2(0, 0),
      targetDirection: createVector2(0, 0),
      size: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      spinSpeed: GAME_CONFIG.SPINNER_INITIAL_SPIN_SPEED,
      rotation: 0,
      maxSpeed: GAME_CONFIG.SPINNER_INITIAL_SPEED,
    };

    return {
      phase: GamePhase.MENU,
      spinner,
      dots: [],
      score: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      timeElapsed: 0,
      arena: {
        width: GAME_CONFIG.ARENA_WIDTH,
        height: GAME_CONFIG.ARENA_HEIGHT,
      },
    };
  }

  /**
   * Gets current game state (immutable)
   * @returns Current game state
   */
  public getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  /**
   * Starts a new game
   */
  public startGame(): void {
    this.gameState = this.createInitialState();
    this.gameState.phase = GamePhase.PLAYING;
    this.gameState.dots = this.generateDots();
    console.log('🎮 Game started - Generated dots:', this.gameState.dots.length);
    console.log('🎯 First few dots:', this.gameState.dots.slice(0, 3));
    this.lastUpdateTime = Date.now();
  }

  /**
   * Updates game state
   * @param deltaTime - Time elapsed since last update (seconds)
   */
  public update(deltaTime: number): void {
    if (this.gameState.phase !== GamePhase.PLAYING) return;

    this.updateSpinner(deltaTime);
    this.checkCollisions();
    this.updateDots();
    this.checkGameOver();
    
    this.gameState.timeElapsed += deltaTime;
  }

  /**
   * Updates spinner physics and movement
   * @param deltaTime - Time elapsed since last update
   */
  private updateSpinner(deltaTime: number): void {
    const { spinner } = this.gameState;
    
    // Update rotation (visual spinning)
    spinner.rotation += spinner.spinSpeed * deltaTime;
    if (spinner.rotation > Math.PI * 2) {
      spinner.rotation -= Math.PI * 2;
    }

    // Apply acceleration towards target direction
    if (spinner.targetDirection.x !== 0 || spinner.targetDirection.y !== 0) {
      const acceleration = scale(
        normalize(spinner.targetDirection), 
        GAME_CONFIG.ACCELERATION * deltaTime
      );
      spinner.velocity = add(spinner.velocity, acceleration);
    }

    // Apply damping
    spinner.velocity = scale(spinner.velocity, GAME_CONFIG.MOVEMENT_DAMPING);

    // Limit speed based on spinner size (larger = slower)
    const speedMultiplier = Math.max(0.3, 1 - (spinner.size - GAME_CONFIG.SPINNER_INITIAL_SIZE) / GAME_CONFIG.SPINNER_MAX_SIZE);
    const maxSpeed = spinner.maxSpeed * speedMultiplier;
    const maxSpeedSquared = maxSpeed ** 2;
    
    const currentSpeedSquared = spinner.velocity.x ** 2 + spinner.velocity.y ** 2;
    if (currentSpeedSquared > maxSpeedSquared) {
      const currentSpeed = Math.sqrt(currentSpeedSquared);
      spinner.velocity = scale(normalize(spinner.velocity), maxSpeed);
    }

    // Update position
    spinner.position = add(spinner.position, scale(spinner.velocity, deltaTime));
  }

  /**
   * Checks for collisions between spinner and dots, and arena boundaries
   */
  private checkCollisions(): void {
    const { spinner, dots } = this.gameState;

    // Check arena boundary collisions
    const margin = spinner.size;
    if (
      spinner.position.x - margin <= 0 ||
      spinner.position.x + margin >= this.gameState.arena.width ||
      spinner.position.y - margin <= 0 ||
      spinner.position.y + margin >= this.gameState.arena.height
    ) {
      this.gameState.phase = GamePhase.GAME_OVER;
      return;
    }

    // Check dot collisions
    for (let i = dots.length - 1; i >= 0; i--) {
      const dot = dots[i];
      const collision = circleCollision(
        spinner.position,
        spinner.size,
        dot.position,
        dot.size
      );

      if (collision.hasCollision) {
        // Consume dot
        this.consumeDot(i);
      }
    }
  }

  /**
   * Consumes a dot and grows the spinner
   * @param dotIndex - Index of dot to consume
   */
  private consumeDot(dotIndex: number): void {
    const dot = this.gameState.dots[dotIndex];
    const { spinner } = this.gameState;

    // Grow spinner
    spinner.size = Math.min(
      GAME_CONFIG.SPINNER_MAX_SIZE,
      spinner.size + dot.value
    );

    // Increase spin speed
    spinner.spinSpeed *= (1 + GAME_CONFIG.SPINNER_SPIN_SPEED_INCREASE);

    // Update score
    this.gameState.score = spinner.size;

    // Remove consumed dot
    this.gameState.dots.splice(dotIndex, 1);
  }

  /**
   * Updates dot positions and spawns new ones if needed
   */
  private updateDots(): void {
    const initialCount = this.gameState.dots.length;
    
    // Respawn dots if below target count
    while (this.gameState.dots.length < GAME_CONFIG.DOT_COUNT) {
      const newDot = this.createRandomDot();
      this.gameState.dots.push(newDot);
    }
    
    // Log if dots were spawned
    if (this.gameState.dots.length > initialCount) {
      console.log('🔄 Respawned dots:', this.gameState.dots.length - initialCount, 'Total:', this.gameState.dots.length);
    }
  }

  /**
   * Generates initial set of dots
   * @returns Array of dots
   */
  private generateDots(): Dot[] {
    const dots: Dot[] = [];
    for (let i = 0; i < GAME_CONFIG.DOT_COUNT; i++) {
      dots.push(this.createRandomDot());
    }
    return dots;
  }

  /**
   * Creates a randomly positioned dot
   * @returns New dot
   */
  private createRandomDot(): Dot {
    const { spinner } = this.gameState;
    const margin = GAME_CONFIG.DOT_RESPAWN_MARGIN;
    
    let position: Vector2;
    let attempts = 0;
    const maxAttempts = 50; // Increased from 10
    const minDistance = spinner.size + 30; // Reduced from spinner.size + margin
    
    // Try to spawn away from spinner
    do {
      position = createVector2(
        randomFloat(margin, this.gameState.arena.width - margin),
        randomFloat(margin, this.gameState.arena.height - margin)
      );
      attempts++;
      
      // Log every 10 attempts for debugging
      if (attempts % 10 === 0) {
        console.log(`🎯 Dot placement attempt ${attempts}: distance from spinner = ${distance(position, spinner.position).toFixed(1)}, required = ${minDistance}`);
      }
    } while (
      attempts < maxAttempts && 
      distance(position, spinner.position) < minDistance
    );

    // Log if we couldn't find a good position
    if (attempts >= maxAttempts) {
      console.log('⚠️ Dot placed after max attempts, might be close to spinner');
    }

    return {
      id: generateId(),
      position,
      size: randomFloat(GAME_CONFIG.DOT_MIN_SIZE, GAME_CONFIG.DOT_MAX_SIZE),
      value: randomFloat(GAME_CONFIG.DOT_GROWTH_MIN, GAME_CONFIG.DOT_GROWTH_MAX),
    };
  }

  /**
   * Checks if game should end
   */
  private checkGameOver(): void {
    // Game over logic is handled in collision detection
    // Could add additional conditions here (time limits, etc.)
  }

  /**
   * Sets spinner target direction
   * @param direction - Normalized direction vector
   */
  public setSpinnerDirection(direction: Vector2): void {
    if (this.gameState.phase === GamePhase.PLAYING) {
      this.gameState.spinner.targetDirection = direction;
    }
  }

  /**
   * Stops spinner movement
   */
  public stopSpinner(): void {
    this.gameState.spinner.targetDirection = createVector2(0, 0);
  }

  /**
   * Resets game to menu state
   */
  public resetToMenu(): void {
    this.gameState.phase = GamePhase.MENU;
  }

  /**
   * Gets final score for game over
   * @returns Final score
   */
  public getFinalScore(): number {
    return this.gameState.score;
  }

  /**
   * Gets time survived
   * @returns Time elapsed in seconds
   */
  public getTimeElapsed(): number {
    return this.gameState.timeElapsed;
  }
}