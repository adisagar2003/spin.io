/**
 * Core game components for ECS architecture
 */

import { Component } from '../ECS';
import { Vector2 } from '../../types';

// Component Type Constants
export const COMPONENT_TYPES = {
  POSITION: 'Position',
  VELOCITY: 'Velocity',
  PHYSICS: 'Physics',
  SPINNER: 'Spinner',
  COLLECTIBLE: 'Collectible',
  NETWORK: 'Network',
  COLLISION: 'Collision',
  HEALTH: 'Health',
  PLAYER: 'Player',
  VISUAL: 'Visual'
} as const;

/**
 * Position component - Entity's location in world space
 */
export class PositionComponent extends Component {
  readonly type = COMPONENT_TYPES.POSITION;
  
  constructor(
    public position: Vector2,
    public previousPosition?: Vector2
  ) {
    super();
    this.previousPosition = previousPosition || { ...position };
  }
}

/**
 * Velocity component - Entity's movement speed and direction
 */
export class VelocityComponent extends Component {
  readonly type = COMPONENT_TYPES.VELOCITY;
  
  constructor(
    public velocity: Vector2,
    public targetDirection: Vector2 = { x: 0, y: 0 },
    public maxSpeed: number = 200,
    public acceleration: number = 800,
    public damping: number = 0.95
  ) {
    super();
  }
}

/**
 * Physics component - Physical properties
 */
export class PhysicsComponent extends Component {
  readonly type = COMPONENT_TYPES.PHYSICS;
  
  constructor(
    public mass: number = 1,
    public restitution: number = 0.8, // Bounciness
    public friction: number = 0.1,
    public isStatic: boolean = false
  ) {
    super();
  }
}

/**
 * Spinner component - Fidget spinner specific properties
 */
export class SpinnerComponent extends Component {
  readonly type = COMPONENT_TYPES.SPINNER;
  
  constructor(
    public size: number,
    public spinSpeed: number = Math.PI * 2,
    public rotation: number = 0,
    public growthRate: number = 1
  ) {
    super();
  }
}

/**
 * Collectible component - Items that can be picked up
 */
export class CollectibleComponent extends Component {
  readonly type = COMPONENT_TYPES.COLLECTIBLE;
  
  constructor(
    public value: number,
    public size: number = 10,
    public collected: boolean = false
  ) {
    super();
  }
}

/**
 * Network component - Multiplayer synchronization data
 */
export class NetworkComponent extends Component {
  readonly type = COMPONENT_TYPES.NETWORK;
  
  constructor(
    public playerId: string,
    public sequenceNumber: number = 0,
    public lastAcknowledged: number = 0,
    public clientPredicted: boolean = false,
    public needsSync: boolean = false
  ) {
    super();
  }
}

/**
 * Collision component - Collision detection properties
 */
export class CollisionComponent extends Component {
  readonly type = COMPONENT_TYPES.COLLISION;
  
  constructor(
    public radius: number,
    public layer: number = 0, // Collision layers
    public mask: number = 0xFFFFFFFF, // What layers this can collide with
    public isTrigger: boolean = false
  ) {
    super();
  }
}

/**
 * Health component - Entity lifespan and damage
 */
export class HealthComponent extends Component {
  readonly type = COMPONENT_TYPES.HEALTH;
  
  constructor(
    public current: number,
    public maximum: number = current,
    public isAlive: boolean = true,
    public invulnerable: boolean = false
  ) {
    super();
  }
}

/**
 * Player component - Player-specific data
 */
export class PlayerComponent extends Component {
  readonly type = COMPONENT_TYPES.PLAYER;
  
  constructor(
    public name: string,
    public score: number = 0,
    public isHost: boolean = false,
    public isCurrentPlayer: boolean = false
  ) {
    super();
  }
}

/**
 * Visual component - Rendering properties
 */
export class VisualComponent extends Component {
  readonly type = COMPONENT_TYPES.VISUAL;
  
  constructor(
    public color: string = '#00FF88',
    public opacity: number = 1,
    public visible: boolean = true,
    public renderOrder: number = 0
  ) {
    super();
  }
}