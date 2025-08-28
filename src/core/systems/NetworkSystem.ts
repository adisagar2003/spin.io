/**
 * Network System - Client prediction, server reconciliation, and lag compensation
 */

import { System } from '../ECS';
import { 
  COMPONENT_TYPES, 
  NetworkComponent, 
  PositionComponent, 
  VelocityComponent 
} from '../components';
import { Vector2 } from '../../types';

interface InputFrame {
  sequenceNumber: number;
  timestamp: number;
  direction: Vector2;
  position: Vector2;
  velocity: Vector2;
}

interface ServerUpdate {
  sequenceNumber: number;
  timestamp: number;
  position: Vector2;
  velocity: Vector2;
}

export class NetworkSystem extends System {
  readonly requiredComponents = [COMPONENT_TYPES.NETWORK];

  private inputBuffer: Map<number, InputFrame[]> = new Map(); // entityId -> inputs
  private serverUpdates: Map<number, ServerUpdate[]> = new Map(); // entityId -> updates
  private clientPredictionEnabled = true;
  private reconciliationEnabled = true;

  update(deltaTime: number): void {
    if (!this.clientPredictionEnabled) return;

    const entities = this.world.getEntitiesWithComponents(this.requiredComponents);
    
    for (const entityId of entities) {
      this.processNetworkEntity(entityId, deltaTime);
    }
  }

  private processNetworkEntity(entityId: number, deltaTime: number): void {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    if (!network || !network.clientPredicted) return;

    // Process server reconciliation
    if (this.reconciliationEnabled) {
      this.reconcileWithServer(entityId);
    }

    // Clean old inputs and updates
    this.cleanOldData(entityId);
  }

  /**
   * Record player input for client prediction
   */
  recordInput(entityId: number, direction: Vector2, deltaTime: number = 0.016): number {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    
    if (!network || !position || !velocity) return 0;

    // Increment sequence number
    network.sequenceNumber++;
    
    const inputFrame: InputFrame = {
      sequenceNumber: network.sequenceNumber,
      timestamp: Date.now(),
      direction: { ...direction },
      position: { ...position.position },
      velocity: { ...velocity.velocity }
    };

    // Store input in buffer
    if (!this.inputBuffer.has(entityId)) {
      this.inputBuffer.set(entityId, []);
    }
    
    const buffer = this.inputBuffer.get(entityId)!;
    buffer.push(inputFrame);

    // Limit buffer size
    if (buffer.length > 100) {
      buffer.shift();
    }

    return network.sequenceNumber;
  }

  /**
   * Process server update and perform reconciliation
   */
  processServerUpdate(
    entityId: number, 
    serverPosition: Vector2, 
    serverVelocity: Vector2, 
    acknowledgedSequence: number,
    timestamp: number
  ): void {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    if (!network) return;

    // Update last acknowledged sequence
    network.lastAcknowledged = acknowledgedSequence;

    // Store server update
    const serverUpdate: ServerUpdate = {
      sequenceNumber: acknowledgedSequence,
      timestamp,
      position: { ...serverPosition },
      velocity: { ...serverVelocity }
    };

    if (!this.serverUpdates.has(entityId)) {
      this.serverUpdates.set(entityId, []);
    }
    
    const updates = this.serverUpdates.get(entityId)!;
    updates.push(serverUpdate);

    // Limit update buffer size
    if (updates.length > 50) {
      updates.shift();
    }

    // Trigger reconciliation
    if (this.reconciliationEnabled && network.clientPredicted) {
      this.reconcileWithServer(entityId);
    }
  }

  /**
   * Reconcile client prediction with server state
   */
  private reconcileWithServer(entityId: number): void {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    
    if (!network || !position || !velocity) return;

    const inputBuffer = this.inputBuffer.get(entityId);
    const serverUpdates = this.serverUpdates.get(entityId);
    
    if (!inputBuffer || !serverUpdates || serverUpdates.length === 0) return;

    // Get latest server update
    const latestUpdate = serverUpdates[serverUpdates.length - 1];
    
    // Find the input that corresponds to this server update
    const acknowledgedInputIndex = inputBuffer.findIndex(
      input => input.sequenceNumber === latestUpdate.sequenceNumber
    );
    
    if (acknowledgedInputIndex === -1) return;

    // Calculate prediction error
    const acknowledgedInput = inputBuffer[acknowledgedInputIndex];
    const positionError = {
      x: latestUpdate.position.x - acknowledgedInput.position.x,
      y: latestUpdate.position.y - acknowledgedInput.position.y
    };
    
    const errorMagnitude = Math.sqrt(positionError.x ** 2 + positionError.y ** 2);
    const errorThreshold = 5; // pixels

    if (errorMagnitude > errorThreshold) {
      console.log(`Reconciling entity ${entityId}: error = ${errorMagnitude.toFixed(2)}px`);
      
      // Apply server correction
      position.position = { ...latestUpdate.position };
      velocity.velocity = { ...latestUpdate.velocity };

      // Re-apply unacknowledged inputs
      const unacknowledgedInputs = inputBuffer.slice(acknowledgedInputIndex + 1);
      this.reapplyInputs(entityId, unacknowledgedInputs);
    }

    // Remove acknowledged inputs
    this.inputBuffer.set(entityId, inputBuffer.slice(acknowledgedInputIndex + 1));
  }

  /**
   * Re-apply unacknowledged inputs for client prediction
   */
  private reapplyInputs(entityId: number, inputs: InputFrame[]): void {
    const position = this.world.getComponent<PositionComponent>(entityId, COMPONENT_TYPES.POSITION);
    const velocity = this.world.getComponent<VelocityComponent>(entityId, COMPONENT_TYPES.VELOCITY);
    
    if (!position || !velocity) return;

    for (const input of inputs) {
      // Simple physics step (should match server physics)
      const deltaTime = 0.016; // Assume 60 FPS
      
      // Apply input direction
      velocity.targetDirection = { ...input.direction };
      
      // Apply acceleration (simplified)
      if (input.direction.x !== 0 || input.direction.y !== 0) {
        const magnitude = Math.sqrt(input.direction.x ** 2 + input.direction.y ** 2);
        const normalized = {
          x: input.direction.x / magnitude,
          y: input.direction.y / magnitude
        };
        
        const acceleration = 800; // Should match server config
        velocity.velocity.x += normalized.x * acceleration * deltaTime;
        velocity.velocity.y += normalized.y * acceleration * deltaTime;
      }
      
      // Apply damping
      const damping = 0.95;
      velocity.velocity.x *= damping;
      velocity.velocity.y *= damping;
      
      // Update position
      position.position.x += velocity.velocity.x * deltaTime;
      position.position.y += velocity.velocity.y * deltaTime;
    }
  }

  /**
   * Clean old input and server update data
   */
  private cleanOldData(entityId: number): void {
    const currentTime = Date.now();
    const maxAge = 1000; // 1 second

    // Clean old inputs
    const inputBuffer = this.inputBuffer.get(entityId);
    if (inputBuffer) {
      const filteredInputs = inputBuffer.filter(
        input => currentTime - input.timestamp < maxAge
      );
      this.inputBuffer.set(entityId, filteredInputs);
    }

    // Clean old server updates
    const serverUpdates = this.serverUpdates.get(entityId);
    if (serverUpdates) {
      const filteredUpdates = serverUpdates.filter(
        update => currentTime - update.timestamp < maxAge
      );
      this.serverUpdates.set(entityId, filteredUpdates);
    }
  }

  /**
   * Enable/disable client prediction
   */
  setClientPrediction(enabled: boolean): void {
    this.clientPredictionEnabled = enabled;
    console.log(`Client prediction ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable server reconciliation
   */
  setReconciliation(enabled: boolean): void {
    this.reconciliationEnabled = enabled;
    console.log(`Server reconciliation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get network statistics for debugging
   */
  getNetworkStats(entityId: number): {
    inputBufferSize: number;
    serverUpdateCount: number;
    lastSequence: number;
    lastAcknowledged: number;
  } | null {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    if (!network) return null;

    return {
      inputBufferSize: this.inputBuffer.get(entityId)?.length || 0,
      serverUpdateCount: this.serverUpdates.get(entityId)?.length || 0,
      lastSequence: network.sequenceNumber,
      lastAcknowledged: network.lastAcknowledged
    };
  }

  /**
   * Enable client prediction for an entity
   */
  enableClientPrediction(entityId: number): void {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    if (network) {
      network.clientPredicted = true;
    }
  }

  /**
   * Disable client prediction for an entity
   */
  disableClientPrediction(entityId: number): void {
    const network = this.world.getComponent<NetworkComponent>(entityId, COMPONENT_TYPES.NETWORK);
    if (network) {
      network.clientPredicted = false;
    }
  }
}