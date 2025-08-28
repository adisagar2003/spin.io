/**
 * Lag Compensation System for Server
 * Implements server-side rewind and hit validation
 */

import { Vector2, PlayerData } from './types';

interface PlayerSnapshot {
  playerId: string;
  timestamp: number;
  position: Vector2;
  velocity: Vector2;
  size: number;
  isAlive: boolean;
}

interface WorldSnapshot {
  timestamp: number;
  players: PlayerSnapshot[];
}

interface InputEvent {
  playerId: string;
  timestamp: number;
  sequenceNumber: number;
  direction: Vector2;
  clientTimestamp: number;
}

/**
 * Lag Compensation Manager
 * Handles server-side rewind for fair hit detection
 */
export class LagCompensationManager {
  private worldHistory: WorldSnapshot[] = [];
  private maxHistoryDuration = 1000; // 1 second of history
  private inputBuffer: InputEvent[] = [];

  /**
   * Store world state snapshot
   */
  takeSnapshot(gameState: any): void {
    const timestamp = Date.now();
    
    const players: PlayerSnapshot[] = [];
    for (const [playerId, playerData] of gameState.players) {
      players.push({
        playerId,
        timestamp,
        position: { ...playerData.spinner.position },
        velocity: { ...playerData.spinner.velocity },
        size: playerData.spinner.size,
        isAlive: playerData.isAlive
      });
    }

    const snapshot: WorldSnapshot = {
      timestamp,
      players
    };

    this.worldHistory.push(snapshot);
    this.cleanOldSnapshots();
  }

  /**
   * Record player input with timestamp
   */
  recordInput(
    playerId: string, 
    direction: Vector2, 
    sequenceNumber: number, 
    clientTimestamp: number,
    serverTimestamp: number = Date.now()
  ): void {
    const inputEvent: InputEvent = {
      playerId,
      timestamp: serverTimestamp,
      sequenceNumber,
      direction: { ...direction },
      clientTimestamp
    };

    this.inputBuffer.push(inputEvent);
    
    // Keep buffer size manageable
    if (this.inputBuffer.length > 1000) {
      this.inputBuffer.shift();
    }
  }

  /**
   * Validate hit with lag compensation
   * Rewinds world state to when the attacking player saw the target
   */
  validateHit(
    attackerPlayerId: string,
    targetPlayerId: string,
    clientTimestamp: number,
    estimatedLatency: number = 50
  ): {
    isValid: boolean;
    rewindTime: number;
    attackerState?: PlayerSnapshot;
    targetState?: PlayerSnapshot;
  } {
    // Calculate when the attacker saw the game world
    const rewindTime = clientTimestamp - estimatedLatency;
    
    // Find the world state at that time
    const rewindSnapshot = this.getSnapshotAtTime(rewindTime);
    
    if (!rewindSnapshot) {
      return { 
        isValid: false, 
        rewindTime,
        attackerState: undefined,
        targetState: undefined
      };
    }

    // Get player states at rewind time
    const attackerState = rewindSnapshot.players.find(p => p.playerId === attackerPlayerId);
    const targetState = rewindSnapshot.players.find(p => p.playerId === targetPlayerId);

    if (!attackerState || !targetState || !attackerState.isAlive || !targetState.isAlive) {
      return { 
        isValid: false, 
        rewindTime,
        attackerState,
        targetState
      };
    }

    // Check if hit was valid at that time
    const distance = this.calculateDistance(attackerState.position, targetState.position);
    const hitRange = (attackerState.size + targetState.size) / 2;
    const isValid = distance <= hitRange;

    console.log(`🎯 Lag compensation validation:`, {
      attackerPlayerId,
      targetPlayerId,
      rewindTime: rewindTime - Date.now(),
      distance: distance.toFixed(1),
      hitRange: hitRange.toFixed(1),
      isValid,
      latency: estimatedLatency
    });

    return {
      isValid,
      rewindTime,
      attackerState,
      targetState
    };
  }

  /**
   * Get interpolated player state at specific time
   */
  getPlayerStateAtTime(playerId: string, timestamp: number): PlayerSnapshot | null {
    const snapshot = this.getSnapshotAtTime(timestamp);
    if (!snapshot) return null;

    return snapshot.players.find(p => p.playerId === playerId) || null;
  }

  /**
   * Calculate optimal input delay for smooth gameplay
   */
  calculateOptimalInputDelay(playerLatencies: Map<string, number>): number {
    if (playerLatencies.size === 0) return 0;

    const latencies = Array.from(playerLatencies.values());
    const maxLatency = Math.max(...latencies);
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    // Use average latency with a buffer for stability
    const optimalDelay = Math.min(maxLatency * 0.8, averageLatency + 20);
    
    console.log(`📊 Optimal input delay calculated:`, {
      playerCount: playerLatencies.size,
      maxLatency,
      averageLatency: averageLatency.toFixed(1),
      optimalDelay: optimalDelay.toFixed(1)
    });

    return optimalDelay;
  }

  /**
   * Predict player position based on current velocity
   */
  predictPlayerPosition(
    currentPosition: Vector2, 
    velocity: Vector2, 
    deltaTime: number
  ): Vector2 {
    return {
      x: currentPosition.x + velocity.x * deltaTime,
      y: currentPosition.y + velocity.y * deltaTime
    };
  }

  /**
   * Get latest input for a player
   */
  getLatestInput(playerId: string): InputEvent | null {
    for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
      if (this.inputBuffer[i].playerId === playerId) {
        return this.inputBuffer[i];
      }
    }
    return null;
  }

  /**
   * Get all inputs since a sequence number
   */
  getInputsSince(playerId: string, sequenceNumber: number): InputEvent[] {
    return this.inputBuffer.filter(
      input => input.playerId === playerId && input.sequenceNumber > sequenceNumber
    );
  }

  /**
   * Estimate player latency based on input timestamps
   */
  estimatePlayerLatency(playerId: string, sampleSize: number = 10): number {
    const recentInputs = this.inputBuffer
      .filter(input => input.playerId === playerId)
      .slice(-sampleSize);

    if (recentInputs.length === 0) return 50; // Default 50ms

    const latencies = recentInputs.map(input => 
      input.timestamp - input.clientTimestamp
    );

    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    
    // Clamp latency to reasonable bounds
    return Math.max(10, Math.min(500, averageLatency));
  }

  // Private methods

  private getSnapshotAtTime(timestamp: number): WorldSnapshot | null {
    if (this.worldHistory.length === 0) return null;

    // Find the snapshot closest to the requested time
    let bestSnapshot = this.worldHistory[0];
    let bestTimeDiff = Math.abs(bestSnapshot.timestamp - timestamp);

    for (const snapshot of this.worldHistory) {
      const timeDiff = Math.abs(snapshot.timestamp - timestamp);
      if (timeDiff < bestTimeDiff) {
        bestSnapshot = snapshot;
        bestTimeDiff = timeDiff;
      }
    }

    // If the time difference is too large, consider the snapshot invalid
    if (bestTimeDiff > this.maxHistoryDuration) {
      return null;
    }

    return bestSnapshot;
  }

  private calculateDistance(pos1: Vector2, pos2: Vector2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private cleanOldSnapshots(): void {
    const cutoffTime = Date.now() - this.maxHistoryDuration;
    this.worldHistory = this.worldHistory.filter(
      snapshot => snapshot.timestamp > cutoffTime
    );

    // Clean old inputs too
    this.inputBuffer = this.inputBuffer.filter(
      input => input.timestamp > cutoffTime
    );
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    historySize: number;
    inputBufferSize: number;
    oldestSnapshot: number;
    newestSnapshot: number;
  } {
    return {
      historySize: this.worldHistory.length,
      inputBufferSize: this.inputBuffer.length,
      oldestSnapshot: this.worldHistory.length > 0 ? 
        Date.now() - this.worldHistory[0].timestamp : 0,
      newestSnapshot: this.worldHistory.length > 0 ? 
        Date.now() - this.worldHistory[this.worldHistory.length - 1].timestamp : 0
    };
  }

  /**
   * Clear all history (for debugging or reset)
   */
  clear(): void {
    this.worldHistory = [];
    this.inputBuffer = [];
    console.log('🧹 Lag compensation history cleared');
  }
}