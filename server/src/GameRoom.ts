/**
 * Game room handling lobby and multiplayer game session
 */

import { Room, PlayerData, MultiplayerGameState, GamePhase, GAME_CONFIG, Dot, Spinner, Vector2 } from './types';
import { generateId, generateRoomCode, createVector2, randomFloat, circleCollision, add, scale, clamp } from './utils';
import { Server, Socket } from 'socket.io';

export class GameRoom {
  private room: Room;
  private io: Server;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;

  constructor(hostName: string, io: Server) {
    this.io = io;
    
    // Create initial game state
    const gameState: MultiplayerGameState = {
      phase: GamePhase.LOBBY,
      players: new Map(),
      dots: [],
      timeElapsed: 0,
      arena: {
        width: GAME_CONFIG.ARENA_WIDTH,
        height: GAME_CONFIG.ARENA_HEIGHT
      }
    };

    this.room = {
      id: generateId(),
      code: generateRoomCode(),
      host: '',
      players: new Map(),
      gameState,
      isPlaying: false,
      createdAt: new Date()
    };
  }

  /**
   * Add a player to the room
   */
  addPlayer(socket: Socket, playerName: string, providedPlayerId?: string): { success: boolean; playerId?: string; error?: string } {
    // Check room capacity
    if (this.room.players.size >= GAME_CONFIG.MAX_PLAYERS_PER_ROOM) {
      return { success: false, error: 'Room is full' };
    }

    // Check if game is already in progress
    if (this.room.isPlaying) {
      return { success: false, error: 'Game already in progress' };
    }

    const playerId = providedPlayerId || socket.id;
    const isHost = this.room.players.size === 0;
    
    console.log(`🎮 Adding player to room ${this.room.code}:`, {
      playerName,
      providedPlayerId,
      socketId: socket.id,
      finalPlayerId: playerId,
      isHost,
      currentPlayerCount: this.room.players.size
    });

    // Create player spinner with unique spawn position
    const spawnAngle = (this.room.players.size * 2 * Math.PI) / GAME_CONFIG.MAX_PLAYERS_PER_ROOM;
    const spawnRadius = 150; // Distance from center (increased for safety)
    const centerX = GAME_CONFIG.ARENA_WIDTH / 2;
    const centerY = GAME_CONFIG.ARENA_HEIGHT / 2;
    
    let spawnX = centerX + Math.cos(spawnAngle) * spawnRadius + randomFloat(-30, 30);
    let spawnY = centerY + Math.sin(spawnAngle) * spawnRadius + randomFloat(-30, 30);
    
    // Ensure spawn position is within safe bounds
    const safeMargin = GAME_CONFIG.SPINNER_INITIAL_SIZE + 20;
    spawnX = Math.max(safeMargin, Math.min(GAME_CONFIG.ARENA_WIDTH - safeMargin, spawnX));
    spawnY = Math.max(safeMargin, Math.min(GAME_CONFIG.ARENA_HEIGHT - safeMargin, spawnY));
    
    const spinner: Spinner = {
      position: createVector2(spawnX, spawnY),
      velocity: createVector2(0, 0),
      targetDirection: createVector2(0, 0),
      size: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      spinSpeed: GAME_CONFIG.SPINNER_INITIAL_SPIN_SPEED,
      rotation: 0,
      maxSpeed: GAME_CONFIG.SPINNER_INITIAL_SPEED
    };
    
    console.log(`🎯 Player ${playerName} spawned at:`, {
      playerId,
      spawnAngle: (spawnAngle * 180 / Math.PI).toFixed(1) + '°',
      spawnRadius,
      position: { x: spawnX.toFixed(1), y: spawnY.toFixed(1) },
      playerCount: this.room.players.size + 1
    });

    const playerData: PlayerData = {
      id: playerId,
      name: playerName,
      spinner,
      score: GAME_CONFIG.SPINNER_INITIAL_SIZE,
      isAlive: true,
      isHost
    };

    // Set host if first player
    if (isHost) {
      this.room.host = playerId;
      console.log(`👑 ${playerName} (${playerId}) is now the host of room ${this.room.code}`);
    }
    
    console.log(`🎮 Room ${this.room.code} host assignment:`, {
      currentHost: this.room.host,
      newPlayerId: playerId,
      newPlayerIsHost: isHost,
      totalPlayers: this.room.players.size + 1
    });

    this.room.players.set(playerId, playerData);
    this.room.gameState.players.set(playerId, playerData);

    // Join socket room
    socket.join(this.room.code);

    console.log(`Player ${playerName} (${playerId}) joined room ${this.room.code}`);
    
    return { success: true, playerId };
  }

  /**
   * Remove a player from the room
   */
  removePlayer(playerId: string): boolean {
    if (!this.room.players.has(playerId)) {
      return false;
    }

    const wasHost = this.room.host === playerId;
    
    this.room.players.delete(playerId);
    this.room.gameState.players.delete(playerId);

    // Transfer host to another player if needed
    if (wasHost && this.room.players.size > 0) {
      const newHostId = Array.from(this.room.players.keys())[0];
      this.room.host = newHostId;
      const newHostPlayer = this.room.players.get(newHostId)!;
      newHostPlayer.isHost = true;
      this.room.players.set(newHostId, newHostPlayer);
    }

    console.log(`Player ${playerId} left room ${this.room.code}`);
    return true;
  }

  /**
   * Start the game (host only)
   */
  startGame(playerId: string): { success: boolean; error?: string } {
    if (playerId !== this.room.host) {
      return { success: false, error: 'Only host can start the game' };
    }

    if (this.room.players.size < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    if (this.room.isPlaying) {
      return { success: false, error: 'Game already started' };
    }

    // Initialize game state
    this.room.gameState.phase = GamePhase.PLAYING;
    this.room.gameState.dots = this.generateDots();
    this.room.gameState.timeElapsed = 0;
    this.room.isPlaying = true;
    
    // Reset all players to alive state and respawn them with collision avoidance
    const spawnPositions = this.generateSafeSpawnPositions(this.room.gameState.players.size);
    let spawnIndex = 0;
    
    for (const player of this.room.gameState.players.values()) {
      player.isAlive = true;
      player.score = GAME_CONFIG.SPINNER_INITIAL_SIZE;
      
      const spawnPosition = spawnPositions[spawnIndex++];
      
      player.spinner.position = spawnPosition;
      player.spinner.velocity = createVector2(0, 0);
      player.spinner.targetDirection = createVector2(0, 0);
      player.spinner.size = GAME_CONFIG.SPINNER_INITIAL_SIZE;
      player.spinner.maxSpeed = GAME_CONFIG.SPINNER_INITIAL_SPEED;
      
      console.log(`🎮 Respawned player ${player.name} at:`, { 
        x: spawnPosition.x.toFixed(1), 
        y: spawnPosition.y.toFixed(1) 
      });
    }

    console.log(`Game started in room ${this.room.code} by host ${playerId}`);
    
    // Start game loop
    this.startGameLoop();
    
    return { success: true };
  }

  /**
   * Generate safe spawn positions for all players with collision avoidance
   */
  private generateSafeSpawnPositions(playerCount: number): Vector2[] {
    const positions: Vector2[] = [];
    const minDistance = GAME_CONFIG.SPINNER_INITIAL_SIZE * 4; // Minimum distance between players
    const safeMargin = GAME_CONFIG.SPINNER_INITIAL_SIZE + 30; // Distance from arena edges
    const centerX = GAME_CONFIG.ARENA_WIDTH / 2;
    const centerY = GAME_CONFIG.ARENA_HEIGHT / 2;
    const maxAttempts = 100;
    
    console.log(`🎯 Generating ${playerCount} safe spawn positions with minDistance: ${minDistance}, safeMargin: ${safeMargin}`);
    
    for (let i = 0; i < playerCount; i++) {
      let validPosition = false;
      let attempts = 0;
      let spawnX: number, spawnY: number;
      
      while (!validPosition && attempts < maxAttempts) {
        attempts++;
        
        // Try evenly distributed angles first, then add randomization
        if (attempts <= 1 && playerCount <= 4) {
          // Use predefined positions for up to 4 players
          const angle = (i * 2 * Math.PI) / playerCount + (Math.PI / 4); // Start at 45 degrees
          const radius = Math.min(150, (Math.min(GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT) / 2) - safeMargin - 50);
          spawnX = centerX + Math.cos(angle) * radius;
          spawnY = centerY + Math.sin(angle) * radius;
        } else {
          // Random position within safe bounds
          spawnX = safeMargin + Math.random() * (GAME_CONFIG.ARENA_WIDTH - 2 * safeMargin);
          spawnY = safeMargin + Math.random() * (GAME_CONFIG.ARENA_HEIGHT - 2 * safeMargin);
        }
        
        // Check distance from all existing positions
        validPosition = true;
        for (const existingPos of positions) {
          const distance = Math.sqrt(
            Math.pow(spawnX - existingPos.x, 2) + 
            Math.pow(spawnY - existingPos.y, 2)
          );
          
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }
        
        // Ensure position is within safe bounds (double-check)
        if (validPosition) {
          validPosition = spawnX >= safeMargin && 
                         spawnX <= GAME_CONFIG.ARENA_WIDTH - safeMargin &&
                         spawnY >= safeMargin && 
                         spawnY <= GAME_CONFIG.ARENA_HEIGHT - safeMargin;
        }
      }
      
      if (!validPosition) {
        // Fallback to a safe position if we couldn't find one
        console.warn(`⚠️ Could not find safe spawn position for player ${i} after ${maxAttempts} attempts, using fallback`);
        const fallbackAngle = (i * 2 * Math.PI) / playerCount;
        const fallbackRadius = 100;
        spawnX = centerX + Math.cos(fallbackAngle) * fallbackRadius;
        spawnY = centerY + Math.sin(fallbackAngle) * fallbackRadius;
      }
      
      const position = createVector2(spawnX, spawnY);
      positions.push(position);
      
      console.log(`✅ Player ${i + 1} spawn position: (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) after ${attempts} attempts`);
    }
    
    return positions;
  }

  /**
   * Generate dots for the game
   */
  private generateDots(): Dot[] {
    const dots: Dot[] = [];
    
    for (let i = 0; i < GAME_CONFIG.DOT_COUNT; i++) {
      dots.push({
        id: generateId(),
        position: createVector2(
          randomFloat(GAME_CONFIG.DOT_RESPAWN_MARGIN, GAME_CONFIG.ARENA_WIDTH - GAME_CONFIG.DOT_RESPAWN_MARGIN),
          randomFloat(GAME_CONFIG.DOT_RESPAWN_MARGIN, GAME_CONFIG.ARENA_HEIGHT - GAME_CONFIG.DOT_RESPAWN_MARGIN)
        ),
        size: randomFloat(GAME_CONFIG.DOT_MIN_SIZE, GAME_CONFIG.DOT_MAX_SIZE),
        value: randomFloat(GAME_CONFIG.DOT_GROWTH_MIN, GAME_CONFIG.DOT_GROWTH_MAX)
      });
    }
    
    return dots;
  }

  /**
   * Broadcast room state to all players
   */
  broadcastRoomState(): void {
    const playersArray = Array.from(this.room.players.values());
    
    const roomState = {
      roomCode: this.room.code,
      players: playersArray,
      isPlaying: this.room.isPlaying,
      phase: this.room.gameState.phase
    };
    
    console.log(`📡 Broadcasting room state for ${this.room.code}:`, {
      players: playersArray.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
      currentHost: this.room.host,
      isPlaying: this.room.isPlaying
    });
    
    this.io.to(this.room.code).emit('ROOM_STATE', roomState);
  }

  /**
   * Broadcast game state to all players (during gameplay)
   */
  broadcastGameState(): void {
    if (!this.room.isPlaying) return;

    const playersArray = Array.from(this.room.gameState.players.values());
    
    this.io.to(this.room.code).emit('GAME_STATE', {
      players: playersArray,
      dots: this.room.gameState.dots,
      timeElapsed: this.room.gameState.timeElapsed
    });
  }

  /**
   * Handle player input for movement
   */
  handlePlayerInput(playerId: string, direction: Vector2): void {
    if (!this.room.isPlaying) return;
    
    const player = this.room.gameState.players.get(playerId);
    if (!player || !player.isAlive) return;
    
    player.spinner.targetDirection = direction;
  }

  /**
   * Start the game loop
   */
  private startGameLoop(): void {
    this.lastUpdateTime = Date.now();
    
    this.gameLoopInterval = setInterval(() => {
      this.updateGame();
      this.broadcastGameState();
    }, 1000 / GAME_CONFIG.TARGET_FPS);
  }

  /**
   * Stop the game loop
   */
  private stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  /**
   * Update game physics and state
   */
  private updateGame(): void {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    // Update time elapsed
    this.room.gameState.timeElapsed += deltaTime;

    // Update all players
    for (const player of this.room.gameState.players.values()) {
      if (!player.isAlive) continue;
      
      this.updatePlayerSpinner(player.spinner, deltaTime);
      this.checkDotCollisions(player);
      this.checkBoundaryCollisions(player);
    }

    // Check for game over
    this.checkGameOver();
  }

  /**
   * Update spinner physics
   */
  private updatePlayerSpinner(spinner: Spinner, deltaTime: number): void {
    // Update movement
    const targetVelocity = scale(spinner.targetDirection, spinner.maxSpeed);
    const velocityDiff = scale(
      createVector2(
        targetVelocity.x - spinner.velocity.x,
        targetVelocity.y - spinner.velocity.y
      ),
      GAME_CONFIG.ACCELERATION * deltaTime
    );

    spinner.velocity = add(spinner.velocity, velocityDiff);

    // Apply damping
    spinner.velocity = scale(spinner.velocity, GAME_CONFIG.MOVEMENT_DAMPING);

    // Update position
    const movement = scale(spinner.velocity, deltaTime);
    spinner.position = add(spinner.position, movement);

    // Update rotation
    spinner.rotation += spinner.spinSpeed * deltaTime;
  }

  /**
   * Check collisions with dots
   */
  private checkDotCollisions(player: PlayerData): void {
    const spinner = player.spinner;
    
    for (let i = this.room.gameState.dots.length - 1; i >= 0; i--) {
      const dot = this.room.gameState.dots[i];
      const collision = circleCollision(
        spinner.position,
        spinner.size,
        dot.position,
        dot.size
      );

      if (collision.hasCollision) {
        // Remove dot and grow spinner
        this.room.gameState.dots.splice(i, 1);
        
        // Increase spinner size and score
        spinner.size += dot.value;
        player.score = spinner.size;
        
        // Decrease max speed as spinner grows (like original game)
        spinner.maxSpeed = GAME_CONFIG.SPINNER_INITIAL_SPEED * 
          (GAME_CONFIG.SPINNER_INITIAL_SIZE / spinner.size);
        
        // Spawn new dot
        this.spawnNewDot();
        
        console.log(`Player ${player.name} collected dot, new size: ${spinner.size}`);
      }
    }
  }

  /**
   * Check boundary collisions (bounce off walls instead of elimination)
   */
  private checkBoundaryCollisions(player: PlayerData): void {
    const spinner = player.spinner;
    const radius = spinner.size / 2; // Use radius instead of full size
    const bounceBoost = 0.8; // Energy retained after bounce
    let correctedPosition = false;

    // Left boundary
    if (spinner.position.x - radius < 0) {
      spinner.position.x = radius;
      spinner.velocity.x = Math.abs(spinner.velocity.x) * bounceBoost;
      correctedPosition = true;
    }
    
    // Right boundary
    if (spinner.position.x + radius > GAME_CONFIG.ARENA_WIDTH) {
      spinner.position.x = GAME_CONFIG.ARENA_WIDTH - radius;
      spinner.velocity.x = -Math.abs(spinner.velocity.x) * bounceBoost;
      correctedPosition = true;
    }
    
    // Top boundary
    if (spinner.position.y - radius < 0) {
      spinner.position.y = radius;
      spinner.velocity.y = Math.abs(spinner.velocity.y) * bounceBoost;
      correctedPosition = true;
    }
    
    // Bottom boundary
    if (spinner.position.y + radius > GAME_CONFIG.ARENA_HEIGHT) {
      spinner.position.y = GAME_CONFIG.ARENA_HEIGHT - radius;
      spinner.velocity.y = -Math.abs(spinner.velocity.y) * bounceBoost;
      correctedPosition = true;
    }

    if (correctedPosition) {
      console.log(`🏀 Player ${player.name} bounced off boundary:`, {
        newPosition: { x: spinner.position.x.toFixed(1), y: spinner.position.y.toFixed(1) },
        newVelocity: { x: spinner.velocity.x.toFixed(1), y: spinner.velocity.y.toFixed(1) },
        radius
      });
    }
  }

  /**
   * Spawn a new dot to replace collected ones
   */
  private spawnNewDot(): void {
    this.room.gameState.dots.push({
      id: generateId(),
      position: createVector2(
        randomFloat(GAME_CONFIG.DOT_RESPAWN_MARGIN, GAME_CONFIG.ARENA_WIDTH - GAME_CONFIG.DOT_RESPAWN_MARGIN),
        randomFloat(GAME_CONFIG.DOT_RESPAWN_MARGIN, GAME_CONFIG.ARENA_HEIGHT - GAME_CONFIG.DOT_RESPAWN_MARGIN)
      ),
      size: randomFloat(GAME_CONFIG.DOT_MIN_SIZE, GAME_CONFIG.DOT_MAX_SIZE),
      value: randomFloat(GAME_CONFIG.DOT_GROWTH_MIN, GAME_CONFIG.DOT_GROWTH_MAX)
    });
  }

  /**
   * Check if game should end
   */
  private checkGameOver(): void {
    const alivePlayers = Array.from(this.room.gameState.players.values()).filter(p => p.isAlive);
    const totalPlayers = this.room.gameState.players.size;
    
    console.log(`🏁 Game over check - Alive: ${alivePlayers.length}/${totalPlayers}`, 
      alivePlayers.map(p => `${p.name}(${p.isAlive ? 'alive' : 'dead'})`));
    
    if (alivePlayers.length <= 1) {
      // Game over
      this.room.gameState.phase = GamePhase.GAME_OVER;
      this.room.isPlaying = false;
      this.stopGameLoop();
      
      const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
      
      console.log(`🏆 Game over in room ${this.room.code}, winner: ${winner?.name || 'None'}`);
      
      this.io.to(this.room.code).emit('GAME_OVER', { winner });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopGameLoop();
  }

  // Getters
  get code(): string { return this.room.code; }
  get playerCount(): number { return this.room.players.size; }
  get isPlaying(): boolean { return this.room.isPlaying; }
  get isEmpty(): boolean { return this.room.players.size === 0; }
  get createdAt(): Date { return this.room.createdAt; }
}