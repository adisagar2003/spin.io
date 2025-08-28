/**
 * Modular Game Engine using ECS Architecture
 * High-performance, maintainable replacement for the monolithic GameEngine
 */

import { World, EntityId } from './ECS';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { NetworkSystem } from './systems/NetworkSystem';
import { GameStateManager } from '../features/game/GameStateManager';

import { 
  COMPONENT_TYPES,
  PositionComponent,
  VelocityComponent,
  PhysicsComponent,
  SpinnerComponent,
  CollectibleComponent,
  NetworkComponent,
  CollisionComponent,
  HealthComponent,
  PlayerComponent,
  VisualComponent
} from './components';

import { GameState, GamePhase, Vector2, Dot, MultiplayerGameState, GAME_CONFIG } from '../types';
import { createVector2, randomFloat, generateId } from '../utils/math';

/**
 * Factory for creating game entities
 */
export class EntityFactory {
  constructor(private world: World) {}

  /**
   * Create a player spinner entity
   */
  createPlayerSpinner(
    playerId: string,
    playerName: string,
    position: Vector2,
    isCurrentPlayer: boolean = false,
    isHost: boolean = false
  ): EntityId {
    const entity = this.world.createEntity();
    const entityId = entity.id;

    // Core components
    this.world.addComponent(entityId, new PositionComponent(position));
    this.world.addComponent(entityId, new VelocityComponent(
      createVector2(0, 0),
      createVector2(0, 0),
      GAME_CONFIG.SPINNER_INITIAL_SPEED
    ));
    this.world.addComponent(entityId, new PhysicsComponent(
      GAME_CONFIG.SPINNER_INITIAL_SIZE, // mass = size
      0.8, // restitution
      0.1  // friction
    ));

    // Spinner-specific components
    this.world.addComponent(entityId, new SpinnerComponent(
      GAME_CONFIG.SPINNER_INITIAL_SIZE,
      GAME_CONFIG.SPINNER_INITIAL_SPIN_SPEED
    ));

    // Collision
    this.world.addComponent(entityId, new CollisionComponent(
      GAME_CONFIG.SPINNER_INITIAL_SIZE / 2, // radius = size / 2
      0, // player collision layer
      0xFFFFFFFF // collides with everything
    ));

    // Health
    this.world.addComponent(entityId, new HealthComponent(100, 100, true));

    // Player info
    this.world.addComponent(entityId, new PlayerComponent(
      playerName,
      GAME_CONFIG.SPINNER_INITIAL_SIZE,
      isHost,
      isCurrentPlayer
    ));

    // Network (for multiplayer)
    this.world.addComponent(entityId, new NetworkComponent(playerId));

    // Visual
    this.world.addComponent(entityId, new VisualComponent('#00FF88', 1, true, 1));

    return entityId;
  }

  /**
   * Create a collectible dot entity
   */
  createCollectibleDot(position: Vector2): EntityId {
    const entity = this.world.createEntity();
    const entityId = entity.id;

    const size = randomFloat(GAME_CONFIG.DOT_MIN_SIZE, GAME_CONFIG.DOT_MAX_SIZE);
    const value = randomFloat(GAME_CONFIG.DOT_GROWTH_MIN, GAME_CONFIG.DOT_GROWTH_MAX);

    // Core components
    this.world.addComponent(entityId, new PositionComponent(position));
    this.world.addComponent(entityId, new CollectibleComponent(value, size));
    this.world.addComponent(entityId, new CollisionComponent(
      size / 2,
      1, // collectible collision layer
      0x1 // only collides with layer 0 (players)
    ));

    // Visual
    this.world.addComponent(entityId, new VisualComponent('#FF0000', 1, true, 0));

    return entityId;
  }
}

/**
 * Modular Game Engine with ECS Architecture
 */
export class ModularGameEngine {
  private world: World;
  private stateManager: GameStateManager;
  private entityFactory: EntityFactory;
  
  // Systems
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private networkSystem: NetworkSystem;
  
  // Entity tracking
  private playerEntities = new Map<string, EntityId>(); // playerId -> entityId
  private collectibleEntities = new Set<EntityId>();
  private currentPlayerEntity: EntityId | null = null;

  // Game state
  private timeElapsed: number = 0;
  private lastUpdateTime: number = 0;

  constructor() {
    // Initialize ECS world
    this.world = new World();
    this.stateManager = new GameStateManager(GamePhase.MENU);
    this.entityFactory = new EntityFactory(this.world);

    // Initialize systems
    this.physicsSystem = new PhysicsSystem(this.world);
    this.collisionSystem = new CollisionSystem(this.world);
    this.networkSystem = new NetworkSystem(this.world);

    // Add systems to world
    this.world.addSystem(this.physicsSystem);
    this.world.addSystem(this.collisionSystem);
    this.world.addSystem(this.networkSystem);

    console.log('🚀 ModularGameEngine initialized with ECS architecture');
  }

  /**
   * Start a new single-player game
   */
  public startGame(): void {
    console.log('🚀 ModularGameEngine.startGame() called');
    
    const success = this.stateManager.transitionTo(GamePhase.PLAYING, 'StartGame called');
    if (!success) {
      console.error('❌ Failed to start game - invalid state transition');
      return;
    }

    // Clear previous game state
    this.clearGameState();

    // Create player spinner
    const playerPosition = createVector2(
      GAME_CONFIG.ARENA_WIDTH / 2, 
      GAME_CONFIG.ARENA_HEIGHT / 2
    );
    
    const playerEntityId = this.entityFactory.createPlayerSpinner(
      'local_player',
      'Player',
      playerPosition,
      true, // isCurrentPlayer
      true  // isHost
    );

    this.currentPlayerEntity = playerEntityId;
    this.playerEntities.set('local_player', playerEntityId);

    // Enable client prediction for local player
    this.networkSystem.enableClientPrediction(playerEntityId);

    // Generate collectible dots
    this.generateInitialDots();

    this.timeElapsed = 0;
    this.lastUpdateTime = Date.now();

    console.log('✅ Game started with ECS architecture');
  }

  /**
   * Start multiplayer game with multiple players
   */
  public startMultiplayerGame(players: Array<{id: string, name: string, position: Vector2, isHost: boolean}>): void {
    const success = this.stateManager.transitionTo(GamePhase.PLAYING, 'Multiplayer game start');
    if (!success) {
      console.error('❌ Failed to start multiplayer game');
      return;
    }

    this.clearGameState();

    // Create player entities
    for (const playerData of players) {
      const entityId = this.entityFactory.createPlayerSpinner(
        playerData.id,
        playerData.name,
        playerData.position,
        playerData.id === 'local_player', // isCurrentPlayer
        playerData.isHost
      );

      this.playerEntities.set(playerData.id, entityId);
      
      if (playerData.id === 'local_player') {
        this.currentPlayerEntity = entityId;
        this.networkSystem.enableClientPrediction(entityId);
      }
    }

    this.generateInitialDots();
    this.timeElapsed = 0;
    this.lastUpdateTime = Date.now();

    console.log(`✅ Multiplayer game started with ${players.length} players`);
  }

  /**
   * Update game systems
   */
  public update(deltaTime: number): void {
    if (this.stateManager.getCurrentPhase() !== GamePhase.PLAYING) return;

    // Update time
    this.timeElapsed += deltaTime;

    // Update all ECS systems
    this.world.update(deltaTime);

    // Maintain collectible count
    this.maintainCollectibles();

    // Check game over conditions
    this.checkGameOver();
  }

  /**
   * Handle player input
   */
  public setSpinnerDirection(direction: Vector2, playerId?: string): void {
    if (this.stateManager.getCurrentPhase() !== GamePhase.PLAYING) return;

    const entityId = playerId 
      ? this.playerEntities.get(playerId) 
      : this.currentPlayerEntity;

    if (!entityId) return;

    // For local player, record input for client prediction
    if (entityId === this.currentPlayerEntity) {
      const sequenceNumber = this.networkSystem.recordInput(entityId, direction);
      console.log(`🎯 Input recorded: seq ${sequenceNumber}, direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)})`);
    }

    // Apply input through physics system
    this.physicsSystem.setTargetDirection(entityId, direction);
  }

  /**
   * Stop spinner movement
   */
  public stopSpinner(playerId?: string): void {
    const entityId = playerId 
      ? this.playerEntities.get(playerId) 
      : this.currentPlayerEntity;

    if (!entityId) return;

    this.physicsSystem.stopEntity(entityId);
  }

  /**
   * Get current game state for rendering
   */
  public getGameState(): Readonly<GameState> {
    const currentPlayerEntity = this.currentPlayerEntity;
    if (!currentPlayerEntity) {
      // Return default state if no current player
      return this.createDefaultGameState();
    }

    // Get current player data
    const position = this.world.getComponent<PositionComponent>(currentPlayerEntity, COMPONENT_TYPES.POSITION);
    const velocity = this.world.getComponent<VelocityComponent>(currentPlayerEntity, COMPONENT_TYPES.VELOCITY);
    const spinner = this.world.getComponent<SpinnerComponent>(currentPlayerEntity, COMPONENT_TYPES.SPINNER);
    const player = this.world.getComponent<PlayerComponent>(currentPlayerEntity, COMPONENT_TYPES.PLAYER);

    if (!position || !velocity || !spinner || !player) {
      return this.createDefaultGameState();
    }

    // Build spinner data
    const spinnerData = {
      position: position.position,
      velocity: velocity.velocity,
      targetDirection: velocity.targetDirection,
      size: spinner.size,
      spinSpeed: spinner.spinSpeed,
      rotation: spinner.rotation,
      maxSpeed: velocity.maxSpeed
    };

    // Build dots data
    const dots: Dot[] = [];
    for (const entityId of this.collectibleEntities) {
      const dotPosition = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
      const collectible = this.world.getComponent<CollectibleComponent>(entityId, COMPONENT_TYPES.COLLECTIBLE);
      
      if (dotPosition && collectible && !collectible.collected) {
        dots.push({
          id: entityId.toString(),
          position: dotPosition.position,
          size: collectible.size,
          value: collectible.value
        });
      }
    }

    return {
      phase: this.stateManager.getCurrentPhase(),
      spinner: spinnerData,
      dots,
      score: player.score,
      timeElapsed: this.timeElapsed,
      arena: {
        width: GAME_CONFIG.ARENA_WIDTH,
        height: GAME_CONFIG.ARENA_HEIGHT
      }
    };
  }

  /**
   * Get multiplayer game state
   */
  public getMultiplayerGameState(): Readonly<MultiplayerGameState> {
    const players = [];
    
    // Build player data
    for (const [playerId, entityId] of this.playerEntities) {
      const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
      const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
      const spinner = this.world.getComponent<SpinnerComponent>(entityId, COMPONENT_TYPES.SPINNER);
      const player = this.world.getComponent<PlayerComponent>(entityId, COMPONENT_TYPES.PLAYER);
      const health = this.world.getComponent<HealthComponent>(entityId, COMPONENT_TYPES.HEALTH);
      
      if (position && velocity && spinner && player) {
        players.push({
          id: playerId,
          name: player.name,
          spinner: {
            position: position.position,
            velocity: velocity.velocity,
            targetDirection: velocity.targetDirection,
            size: spinner.size,
            spinSpeed: spinner.spinSpeed,
            rotation: spinner.rotation,
            maxSpeed: velocity.maxSpeed
          },
          score: player.score,
          isAlive: health?.isAlive ?? true,
          isCurrentPlayer: player.isCurrentPlayer
        });
      }
    }

    // Build dots data
    const dots = [];
    for (const entityId of this.collectibleEntities) {
      const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
      const collectible = this.world.getComponent<CollectibleComponent>(entityId, COMPONENT_TYPES.COLLECTIBLE);
      
      if (position && collectible && !collectible.collected) {
        dots.push({
          id: entityId.toString(),
          position: position.position,
          size: collectible.size,
          value: collectible.value
        });
      }
    }

    const currentPlayer = this.currentPlayerEntity ? this.world.getComponent<PlayerComponent>(this.currentPlayerEntity, COMPONENT_TYPES.PLAYER) : null;

    return {
      phase: this.stateManager.getCurrentPhase(),
      players,
      dots,
      score: currentPlayer?.score || 0,
      timeElapsed: this.timeElapsed,
      arena: {
        width: GAME_CONFIG.ARENA_WIDTH,
        height: GAME_CONFIG.ARENA_HEIGHT
      }
    };
  }

  /**
   * Process server update for multiplayer reconciliation
   */
  public processServerUpdate(
    playerId: string, 
    serverPosition: Vector2, 
    serverVelocity: Vector2, 
    acknowledgedSequence: number
  ): void {
    const entityId = this.playerEntities.get(playerId);
    if (!entityId) return;

    this.networkSystem.processServerUpdate(
      entityId,
      serverPosition,
      serverVelocity,
      acknowledgedSequence,
      Date.now()
    );
  }

  /**
   * Reset game to menu state
   */
  public resetToMenu(): void {
    console.log('🔄 ModularGameEngine.resetToMenu() called');
    this.stateManager.forceTransition(GamePhase.MENU, 'Manual reset to menu');
    this.clearGameState();
  }

  /**
   * Get final score for game over
   */
  public getFinalScore(): number {
    if (!this.currentPlayerEntity) return 0;
    const player = this.world.getComponent<PlayerComponent>(this.currentPlayerEntity, COMPONENT_TYPES.PLAYER);
    return player?.score || 0;
  }

  /**
   * Get time elapsed
   */
  public getTimeElapsed(): number {
    return this.timeElapsed;
  }

  /**
   * Get state manager
   */
  public getStateManager(): GameStateManager {
    return this.stateManager;
  }

  // Private helper methods

  private clearGameState(): void {
    this.world.clear();
    this.playerEntities.clear();
    this.collectibleEntities.clear();
    this.currentPlayerEntity = null;
    this.timeElapsed = 0;
  }

  private generateInitialDots(): void {
    for (let i = 0; i < GAME_CONFIG.DOT_COUNT; i++) {
      const position = this.generateSafeDotPosition();
      const entityId = this.entityFactory.createCollectibleDot(position);
      this.collectibleEntities.add(entityId);
    }
    console.log(`✅ Generated ${GAME_CONFIG.DOT_COUNT} collectible dots`);
  }

  private generateSafeDotPosition(): Vector2 {
    const margin = GAME_CONFIG.DOT_RESPAWN_MARGIN;
    let position: Vector2;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
      position = createVector2(
        randomFloat(margin, GAME_CONFIG.ARENA_WIDTH - margin),
        randomFloat(margin, GAME_CONFIG.ARENA_HEIGHT - margin)
      );
      attempts++;
    } while (attempts < maxAttempts && this.isPositionTooCloseToPlayers(position, 60));

    return position;
  }

  private isPositionTooCloseToPlayers(position: Vector2, minDistance: number): boolean {
    for (const entityId of this.playerEntities.values()) {
      const playerPos = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
      if (playerPos) {
        const distance = Math.sqrt(
          (position.x - playerPos.position.x) ** 2 + 
          (position.y - playerPos.position.y) ** 2
        );
        if (distance < minDistance) {
          return true;
        }
      }
    }
    return false;
  }

  private maintainCollectibles(): void {
    // Remove collected dots
    for (const entityId of this.collectibleEntities) {
      const collectible = this.world.getComponent<CollectibleComponent>(entityId, COMPONENT_TYPES.COLLECTIBLE);
      if (collectible && collectible.collected) {
        this.world.removeEntity(entityId);
        this.collectibleEntities.delete(entityId);
      }
    }

    // Add new dots if needed
    while (this.collectibleEntities.size < GAME_CONFIG.DOT_COUNT) {
      const position = this.generateSafeDotPosition();
      const entityId = this.entityFactory.createCollectibleDot(position);
      this.collectibleEntities.add(entityId);
    }
  }

  private checkGameOver(): void {
    const alivePlayers = Array.from(this.playerEntities.values())
      .filter(entityId => {
        const health = this.world.getComponent<HealthComponent>(entityId, COMPONENT_TYPES.HEALTH);
        return health?.isAlive !== false;
      });

    // Single player: check boundary collision
    if (this.playerEntities.size === 1 && this.currentPlayerEntity) {
      const position = this.world.getComponent<PositionComponent>(this.currentPlayerEntity, COMPONENT_TYPES.POSITION);
      const spinner = this.world.getComponent<SpinnerComponent>(this.currentPlayerEntity, COMPONENT_TYPES.SPINNER);
      
      if (position && spinner) {
        const margin = spinner.size / 2;
        if (
          position.position.x - margin <= 0 ||
          position.position.x + margin >= GAME_CONFIG.ARENA_WIDTH ||
          position.position.y - margin <= 0 ||
          position.position.y + margin >= GAME_CONFIG.ARENA_HEIGHT
        ) {
          this.stateManager.transitionTo(GamePhase.GAME_OVER, 'Hit arena boundary');
        }
      }
    }
    // Multiplayer: check if only one player remains
    else if (this.playerEntities.size > 1 && alivePlayers.length <= 1) {
      this.stateManager.transitionTo(GamePhase.GAME_OVER, 'Only one player remaining');
    }
  }

  private createDefaultGameState(): GameState {
    return {
      phase: this.stateManager.getCurrentPhase(),
      spinner: {
        position: createVector2(GAME_CONFIG.ARENA_WIDTH / 2, GAME_CONFIG.ARENA_HEIGHT / 2),
        velocity: createVector2(0, 0),
        targetDirection: createVector2(0, 0),
        size: GAME_CONFIG.SPINNER_INITIAL_SIZE,
        spinSpeed: GAME_CONFIG.SPINNER_INITIAL_SPIN_SPEED,
        rotation: 0,
        maxSpeed: GAME_CONFIG.SPINNER_INITIAL_SPEED
      },
      dots: [],
      score: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      timeElapsed: this.timeElapsed,
      arena: {
        width: GAME_CONFIG.ARENA_WIDTH,
        height: GAME_CONFIG.ARENA_HEIGHT
      }
    };
  }
}