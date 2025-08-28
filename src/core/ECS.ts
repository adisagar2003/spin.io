/**
 * Entity-Component-System (ECS) Architecture
 * Modern, performant game architecture for spin.io
 */

export type EntityId = number;
export type ComponentType = string;

/**
 * Entity - Just a unique ID
 */
export class Entity {
  constructor(public readonly id: EntityId) {}
}

/**
 * Component - Pure data container
 */
export abstract class Component {
  abstract readonly type: ComponentType;
}

/**
 * System - Logic processor
 */
export abstract class System {
  abstract readonly requiredComponents: ComponentType[];
  abstract update(deltaTime: number): void;
  
  protected world: World;
  
  constructor(world: World) {
    this.world = world;
  }
}

/**
 * World - ECS container
 */
export class World {
  private entities = new Map<EntityId, Entity>();
  private components = new Map<EntityId, Map<ComponentType, Component>>();
  private systems: System[] = [];
  private nextEntityId = 1;

  /**
   * Create a new entity
   */
  createEntity(): Entity {
    const entity = new Entity(this.nextEntityId++);
    this.entities.set(entity.id, entity);
    this.components.set(entity.id, new Map());
    return entity;
  }

  /**
   * Remove an entity and all its components
   */
  removeEntity(entityId: EntityId): void {
    this.entities.delete(entityId);
    this.components.delete(entityId);
  }

  /**
   * Add a component to an entity
   */
  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const entityComponents = this.components.get(entityId);
    if (entityComponents) {
      entityComponents.set(component.type, component);
    }
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | null {
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) return null;
    return (entityComponents.get(componentType) as T) || null;
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    const entityComponents = this.components.get(entityId);
    if (entityComponents) {
      entityComponents.delete(componentType);
    }
  }

  /**
   * Check if entity has a component
   */
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const entityComponents = this.components.get(entityId);
    return entityComponents ? entityComponents.has(componentType) : false;
  }

  /**
   * Get all entities with specific components
   */
  getEntitiesWithComponents(componentTypes: ComponentType[]): EntityId[] {
    const matchingEntities: EntityId[] = [];
    
    for (const [entityId, entityComponents] of this.components) {
      const hasAllComponents = componentTypes.every(type => 
        entityComponents.has(type)
      );
      
      if (hasAllComponents) {
        matchingEntities.push(entityId);
      }
    }
    
    return matchingEntities;
  }

  /**
   * Add a system to the world
   */
  addSystem(system: System): void {
    this.systems.push(system);
  }

  /**
   * Update all systems
   */
  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }

  /**
   * Get all entities (for debugging)
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Clear all entities and components
   */
  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.nextEntityId = 1;
  }
}