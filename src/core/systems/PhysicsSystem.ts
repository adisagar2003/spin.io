/**
 * Physics System - Handles movement, forces, and physical simulation
 */

import { System } from '../ECS';
import { COMPONENT_TYPES, PositionComponent, VelocityComponent, PhysicsComponent, SpinnerComponent } from '../components';
import { add, scale, normalize, createVector2 } from '../../utils/math';
import { GAME_CONFIG } from '../../types';

export class PhysicsSystem extends System {
  readonly requiredComponents = [
    COMPONENT_TYPES.POSITION,
    COMPONENT_TYPES.VELOCITY
  ];

  update(deltaTime: number): void {
    const entities = this.world.getEntitiesWithComponents(this.requiredComponents);
    
    for (const entityId of entities) {
      this.updateEntityPhysics(entityId, deltaTime);
    }
  }

  private updateEntityPhysics(entityId: number, deltaTime: number): void {
    const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    const physics = this.world.getComponent<PhysicsComponent>(entityId, COMPONENT_TYPES.PHYSICS);
    const spinner = this.world.getComponent<SpinnerComponent>(entityId, COMPONENT_TYPES.SPINNER);
    
    if (!position || !velocity) return;

    // Store previous position for interpolation
    position.previousPosition = { ...position.position };

    // Skip physics for static objects
    if (physics?.isStatic) return;

    // Apply acceleration towards target direction
    if (velocity.targetDirection.x !== 0 || velocity.targetDirection.y !== 0) {
      const acceleration = scale(
        normalize(velocity.targetDirection), 
        velocity.acceleration * deltaTime
      );
      velocity.velocity = add(velocity.velocity, acceleration);
    }

    // Apply damping
    velocity.velocity = scale(velocity.velocity, velocity.damping);

    // Limit speed based on spinner size (if applicable)
    if (spinner) {
      const speedMultiplier = Math.max(
        0.3, 
        1 - (spinner.size - GAME_CONFIG.SPINNER_INITIAL_SIZE) / GAME_CONFIG.SPINNER_MAX_SIZE
      );
      const maxSpeed = velocity.maxSpeed * speedMultiplier;
      const currentSpeedSquared = velocity.velocity.x ** 2 + velocity.velocity.y ** 2;
      
      if (currentSpeedSquared > maxSpeed ** 2) {
        velocity.velocity = scale(normalize(velocity.velocity), maxSpeed);
      }
    } else {
      // Standard speed limiting
      const currentSpeedSquared = velocity.velocity.x ** 2 + velocity.velocity.y ** 2;
      if (currentSpeedSquared > velocity.maxSpeed ** 2) {
        velocity.velocity = scale(normalize(velocity.velocity), velocity.maxSpeed);
      }
    }

    // Update position
    const movement = scale(velocity.velocity, deltaTime);
    position.position = add(position.position, movement);

    // Update spinner rotation if applicable
    if (spinner) {
      spinner.rotation += spinner.spinSpeed * deltaTime;
      if (spinner.rotation > Math.PI * 2) {
        spinner.rotation -= Math.PI * 2;
      }
    }
  }

  /**
   * Apply impulse to an entity
   */
  applyImpulse(entityId: number, impulse: { x: number; y: number }): void {
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    const physics = this.world.getComponent<PhysicsComponent>(entityId, COMPONENT_TYPES.PHYSICS);
    
    if (!velocity || !physics || physics.isStatic) return;

    // F = ma, so a = F/m, and Δv = a * Δt
    // For impulse, we assume Δt = 1 for instant application
    const accelerationX = impulse.x / physics.mass;
    const accelerationY = impulse.y / physics.mass;
    
    velocity.velocity.x += accelerationX;
    velocity.velocity.y += accelerationY;
  }

  /**
   * Apply continuous force to an entity
   */
  applyForce(entityId: number, force: { x: number; y: number }, deltaTime: number): void {
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    const physics = this.world.getComponent<PhysicsComponent>(entityId, COMPONENT_TYPES.PHYSICS);
    
    if (!velocity || !physics || physics.isStatic) return;

    // F = ma, so a = F/m
    const accelerationX = force.x / physics.mass;
    const accelerationY = force.y / physics.mass;
    
    velocity.velocity.x += accelerationX * deltaTime;
    velocity.velocity.y += accelerationY * deltaTime;
  }

  /**
   * Set target direction for an entity
   */
  setTargetDirection(entityId: number, direction: { x: number; y: number }): void {
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    if (velocity) {
      velocity.targetDirection = { ...direction };
    }
  }

  /**
   * Stop entity movement
   */
  stopEntity(entityId: number): void {
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    if (velocity) {
      velocity.targetDirection = createVector2(0, 0);
    }
  }
}