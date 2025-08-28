/**
 * Collision System - Optimized collision detection with spatial partitioning
 */

import { System } from '../ECS';
import { 
  COMPONENT_TYPES, 
  PositionComponent, 
  CollisionComponent, 
  VelocityComponent,
  PhysicsComponent,
  SpinnerComponent,
  CollectibleComponent,
  HealthComponent
} from '../components';
import { circleCollision, distance } from '../../utils/math';
import { GAME_CONFIG } from '../../types';

interface CollisionEvent {
  entityA: number;
  entityB: number;
  distance: number;
  normal: { x: number; y: number };
}

/**
 * Spatial grid for efficient collision detection
 */
class SpatialGrid {
  private grid: Map<string, Set<number>> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  addEntity(entityId: number, x: number, y: number, radius: number): void {
    // Add entity to all cells it might overlap
    const minX = x - radius;
    const maxX = x + radius;
    const minY = y - radius;
    const maxY = y + radius;

    const startGridX = Math.floor(minX / this.cellSize);
    const endGridX = Math.floor(maxX / this.cellSize);
    const startGridY = Math.floor(minY / this.cellSize);
    const endGridY = Math.floor(maxY / this.cellSize);

    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        const key = `${gridX},${gridY}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, new Set());
        }
        this.grid.get(key)!.add(entityId);
      }
    }
  }

  getNearbyEntities(x: number, y: number, radius: number): Set<number> {
    const nearby = new Set<number>();
    
    const minX = x - radius;
    const maxX = x + radius;
    const minY = y - radius;
    const maxY = y + radius;

    const startGridX = Math.floor(minX / this.cellSize);
    const endGridX = Math.floor(maxX / this.cellSize);
    const startGridY = Math.floor(minY / this.cellSize);
    const endGridY = Math.floor(maxY / this.cellSize);

    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        const key = `${gridX},${gridY}`;
        const cell = this.grid.get(key);
        if (cell) {
          cell.forEach(entityId => nearby.add(entityId));
        }
      }
    }

    return nearby;
  }
}

export class CollisionSystem extends System {
  readonly requiredComponents = [
    COMPONENT_TYPES.POSITION,
    COMPONENT_TYPES.COLLISION
  ];

  private spatialGrid = new SpatialGrid(150); // 150px grid cells
  private collisionEvents: CollisionEvent[] = [];

  update(deltaTime: number): void {
    // Clear spatial grid
    this.spatialGrid.clear();
    
    // Get all entities with collision
    const entities = this.world.getEntitiesWithComponents(this.requiredComponents);
    
    // Populate spatial grid
    for (const entityId of entities) {
      const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
      const collision = this.world.getComponent<CollisionComponent>(entityId, COMPONENT_TYPES.COLLISION);
      
      if (position && collision) {
        this.spatialGrid.addEntity(
          entityId, 
          position.position.x, 
          position.position.y, 
          collision.radius
        );
      }
    }

    // Clear previous collision events
    this.collisionEvents = [];

    // Check collisions
    for (const entityId of entities) {
      this.checkEntityCollisions(entityId);
    }

    // Process collision events
    this.processCollisionEvents();

    // Check boundary collisions
    this.checkBoundaryCollisions();
  }

  private checkEntityCollisions(entityId: number): void {
    const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
    const collision = this.world.getComponent<CollisionComponent>(entityId, COMPONENT_TYPES.COLLISION);
    
    if (!position || !collision) return;

    // Get nearby entities from spatial grid
    const nearbyEntities = this.spatialGrid.getNearbyEntities(
      position.position.x,
      position.position.y,
      collision.radius * 2 // Double radius for safety
    );

    // Check collision with each nearby entity
    for (const otherEntityId of nearbyEntities) {
      if (entityId === otherEntityId) continue;

      const otherPosition = this.world.getComponent<PositionComponent>(otherEntityId, COMPONENT_TYPES.POSITION);
      const otherCollision = this.world.getComponent<CollisionComponent>(otherEntityId, COMPONENT_TYPES.COLLISION);
      
      if (!otherPosition || !otherCollision) continue;

      // Check collision layers
      if ((collision.mask & (1 << otherCollision.layer)) === 0) continue;

      // Perform collision test
      const collisionResult = circleCollision(
        position.position,
        collision.radius,
        otherPosition.position,
        otherCollision.radius
      );

      if (collisionResult.hasCollision) {
        const dx = otherPosition.position.x - position.position.x;
        const dy = otherPosition.position.y - position.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.collisionEvents.push({
          entityA: entityId,
          entityB: otherEntityId,
          distance: dist,
          normal: dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 }
        });
      }
    }
  }

  private processCollisionEvents(): void {
    for (const event of this.collisionEvents) {
      this.handleCollision(event);
    }
  }

  private handleCollision(event: CollisionEvent): void {
    const { entityA, entityB } = event;
    
    // Get components
    const spinnerA = this.world.getComponent<SpinnerComponent>(entityA, COMPONENT_TYPES.SPINNER);
    const spinnerB = this.world.getComponent<SpinnerComponent>(entityB, COMPONENT_TYPES.SPINNER);
    const collectibleA = this.world.getComponent<CollectibleComponent>(entityA, COMPONENT_TYPES.COLLECTIBLE);
    const collectibleB = this.world.getComponent<CollectibleComponent>(entityB, COMPONENT_TYPES.COLLECTIBLE);

    // Spinner vs Collectible collision
    if (spinnerA && collectibleB && !collectibleB.collected) {
      this.handleSpinnerCollectibleCollision(entityA, entityB);
    } else if (spinnerB && collectibleA && !collectibleA.collected) {
      this.handleSpinnerCollectibleCollision(entityB, entityA);
    }
    // Spinner vs Spinner collision
    else if (spinnerA && spinnerB) {
      this.handleSpinnerSpinnerCollision(entityA, entityB, event);
    }
  }

  private handleSpinnerCollectibleCollision(spinnerId: number, collectibleId: number): void {
    const spinner = this.world.getComponent<SpinnerComponent>(spinnerId, COMPONENT_TYPES.SPINNER);
    const collectible = this.world.getComponent<CollectibleComponent>(collectibleId, COMPONENT_TYPES.COLLECTIBLE);
    
    if (!spinner || !collectible || collectible.collected) return;

    // Mark collectible as collected
    collectible.collected = true;

    // Grow spinner
    spinner.size = Math.min(GAME_CONFIG.SPINNER_MAX_SIZE, spinner.size + collectible.value);
    
    // Increase spin speed
    spinner.spinSpeed *= (1 + GAME_CONFIG.SPINNER_SPIN_SPEED_INCREASE);

    // Update score (if player component exists)
    const player = this.world.getComponent<PlayerComponent>(spinnerId, COMPONENT_TYPES.PLAYER);
    if (player) {
      player.score = spinner.size;
    }

    console.log(`Collectible consumed! Spinner grew to ${spinner.size}`);
  }

  private handleSpinnerSpinnerCollision(entityA: number, entityB: number, event: CollisionEvent): void {
    const spinnerA = this.world.getComponent<SpinnerComponent>(entityA, COMPONENT_TYPES.SPINNER);
    const spinnerB = this.world.getComponent<SpinnerComponent>(entityB, COMPONENT_TYPES.SPINNER);
    const healthA = this.world.getComponent<HealthComponent>(entityA, COMPONENT_TYPES.HEALTH);
    const healthB = this.world.getComponent<HealthComponent>(entityB, COMPONENT_TYPES.HEALTH);
    
    if (!spinnerA || !spinnerB) return;
    if (healthA && !healthA.isAlive) return;
    if (healthB && !healthB.isAlive) return;

    const sizeRatio = Math.max(spinnerA.size, spinnerB.size) / Math.min(spinnerA.size, spinnerB.size);
    const eliminationThreshold = 1.3; // 30% size advantage needed

    if (sizeRatio >= eliminationThreshold) {
      // Eliminate smaller spinner
      let victor: number, victim: number;
      if (spinnerA.size > spinnerB.size) {
        victor = entityA;
        victim = entityB;
      } else {
        victor = entityB;
        victim = entityA;
      }

      this.eliminateSpinner(victim, victor);
    } else {
      // Bounce apart
      this.bounceSpinners(entityA, entityB, event);
    }
  }

  private eliminateSpinner(victimId: number, victorId: number): void {
    const victimSpinner = this.world.getComponent<SpinnerComponent>(victimId, COMPONENT_TYPES.SPINNER);
    const victorSpinner = this.world.getComponent<SpinnerComponent>(victorId, COMPONENT_TYPES.SPINNER);
    const victimHealth = this.world.getComponent<HealthComponent>(victimId, COMPONENT_TYPES.HEALTH);
    
    if (!victimSpinner || !victorSpinner) return;

    // Eliminate victim
    if (victimHealth) {
      victimHealth.isAlive = false;
    }

    // Grow victor (50% of victim's size)
    const growthAmount = victimSpinner.size * 0.5;
    victorSpinner.size += growthAmount;

    // Update victor's max speed
    const velocity = this.world.getComponent<VelocityComponent>(victorId, COMPONENT_TYPES.VELOCITY);
    if (velocity) {
      velocity.maxSpeed = GAME_CONFIG.SPINNER_INITIAL_SPEED * 
        (GAME_CONFIG.SPINNER_INITIAL_SIZE / victorSpinner.size);
    }

    console.log(`Spinner eliminated! Victor grew to ${victorSpinner.size}`);
  }

  private bounceSpinners(entityA: number, entityB: number, event: CollisionEvent): void {
    const posA = this.world.getComponent<PositionComponent>(entityA, COMPONENT_TYPES.POSITION);
    const posB = this.world.getComponent<PositionComponent>(entityB, COMPONENT_TYPES.POSITION);
    const velA = this.world.getComponent<VelocityComponent>(entityA, COMPONENT_TYPES.VELOCITY);
    const velB = this.world.getComponent<VelocityComponent>(entityB, COMPONENT_TYPES.VELOCITY);
    const physicsA = this.world.getComponent<PhysicsComponent>(entityA, COMPONENT_TYPES.PHYSICS);
    const physicsB = this.world.getComponent<PhysicsComponent>(entityB, COMPONENT_TYPES.PHYSICS);
    const collisionA = this.world.getComponent<CollisionComponent>(entityA, COMPONENT_TYPES.COLLISION);
    const collisionB = this.world.getComponent<CollisionComponent>(entityB, COMPONENT_TYPES.COLLISION);
    
    if (!posA || !posB || !velA || !velB || !collisionA || !collisionB) return;

    // Separate overlapping entities
    const totalRadius = collisionA.radius + collisionB.radius;
    const overlap = totalRadius - event.distance;
    
    if (overlap > 0) {
      const separationX = event.normal.x * overlap * 0.5;
      const separationY = event.normal.y * overlap * 0.5;
      
      posA.position.x -= separationX;
      posA.position.y -= separationY;
      posB.position.x += separationX;
      posB.position.y += separationY;
    }

    // Apply elastic collision response
    const mass1 = physicsA?.mass || 1;
    const mass2 = physicsB?.mass || 1;
    const restitution = Math.min(physicsA?.restitution || 0.8, physicsB?.restitution || 0.8);

    const relativeVelocityX = velA.velocity.x - velB.velocity.x;
    const relativeVelocityY = velA.velocity.y - velB.velocity.y;
    const velocityAlongNormal = relativeVelocityX * event.normal.x + relativeVelocityY * event.normal.y;

    if (velocityAlongNormal > 0) return; // Objects separating

    const impulse = -(1 + restitution) * velocityAlongNormal / (1/mass1 + 1/mass2);
    
    velA.velocity.x += (impulse / mass1) * event.normal.x;
    velA.velocity.y += (impulse / mass1) * event.normal.y;
    velB.velocity.x -= (impulse / mass2) * event.normal.x;
    velB.velocity.y -= (impulse / mass2) * event.normal.y;
  }

  private checkBoundaryCollisions(): void {
    const entities = this.world.getEntitiesWithComponents([
      COMPONENT_TYPES.POSITION,
      COMPONENT_TYPES.COLLISION,
      COMPONENT_TYPES.VELOCITY
    ]);

    for (const entityId of entities) {
      const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
      const collision = this.world.getComponent<CollisionComponent>(entityId, COMPONENT_TYPES.COLLISION);
      const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
      const physics = this.world.getComponent<PhysicsComponent>(entityId, COMPONENT_TYPES.PHYSICS);
      
      if (!position || !collision || !velocity) continue;

      const radius = collision.radius;
      const bounceBoost = physics?.restitution || 0.8;
      let corrected = false;

      // Left boundary
      if (position.position.x - radius < 0) {
        position.position.x = radius;
        velocity.velocity.x = Math.abs(velocity.velocity.x) * bounceBoost;
        corrected = true;
      }
      
      // Right boundary
      if (position.position.x + radius > GAME_CONFIG.ARENA_WIDTH) {
        position.position.x = GAME_CONFIG.ARENA_WIDTH - radius;
        velocity.velocity.x = -Math.abs(velocity.velocity.x) * bounceBoost;
        corrected = true;
      }
      
      // Top boundary
      if (position.position.y - radius < 0) {
        position.position.y = radius;
        velocity.velocity.y = Math.abs(velocity.velocity.y) * bounceBoost;
        corrected = true;
      }
      
      // Bottom boundary
      if (position.position.y + radius > GAME_CONFIG.ARENA_HEIGHT) {
        position.position.y = GAME_CONFIG.ARENA_HEIGHT - radius;
        velocity.velocity.y = -Math.abs(velocity.velocity.y) * bounceBoost;
        corrected = true;
      }

      if (corrected) {
        console.log(`Entity ${entityId} bounced off boundary`);
      }
    }
  }

  /**
   * Get collision events for external systems
   */
  getCollisionEvents(): CollisionEvent[] {
    return [...this.collisionEvents];
  }
}