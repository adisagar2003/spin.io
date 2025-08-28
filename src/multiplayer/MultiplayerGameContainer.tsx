/**
 * Multiplayer game container that integrates network state with local rendering
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GameContainerWithRef } from '../features/game/GameContainer';
import { GameEngine } from '../features/game/GameEngine';
import { NetworkManager, MultiplayerGameState as NetworkMultiplayerGameState, MultiplayerPlayerData } from './NetworkManager';
import { Vector2, GameState, Spinner, Dot, GamePhase, MultiplayerGameState, MultiplayerPlayer } from '../types';
import { createVector2 } from '../utils/math';
import { GameContainerRef } from '../features/game/GameContainer';
import { playerStateManager } from './PlayerStateManager';

interface MultiplayerGameContainerProps {
  networkManager: NetworkManager;
  onGameOver: (winner: MultiplayerPlayerData | null) => void;
  onReturnToLobby: () => void;
}

export const MultiplayerGameContainer: React.FC<MultiplayerGameContainerProps> = ({
  networkManager,
  onGameOver,
  onReturnToLobby
}) => {
  const gameContainerRef = useRef<GameContainerRef>(null);
  const gameEngineRef = useRef<GameEngine>(new GameEngine());

  // Convert multiplayer state to local game state format with all players
  const convertToLocalGameState = useCallback((
    networkState: NetworkMultiplayerGameState,
    currentPlayerId: string
  ): MultiplayerGameState => {
    // Find current player
    const currentPlayer = networkState.players.find(p => p.id === currentPlayerId);
    
    if (!currentPlayer) {
      throw new Error('Current player not found in multiplayer state');
    }

    // Convert all players to local format
    const players: MultiplayerPlayer[] = networkState.players.map(player => ({
      id: player.id,
      name: player.name,
      spinner: {
        position: player.spinner.position,
        velocity: player.spinner.velocity,
        targetDirection: player.spinner.targetDirection,
        size: player.spinner.size,
        spinSpeed: player.spinner.spinSpeed,
        rotation: player.spinner.rotation,
        maxSpeed: player.spinner.maxSpeed
      },
      score: player.score,
      isAlive: player.isAlive,
      isCurrentPlayer: player.id === currentPlayerId
    }));

    // Convert dots format
    const dots: Dot[] = networkState.dots.map(dot => ({
      id: dot.id,
      position: dot.position,
      size: dot.size,
      value: dot.value
    }));

    return {
      phase: GamePhase.PLAYING,
      players,
      dots,
      score: currentPlayer.score,
      timeElapsed: networkState.timeElapsed,
      arena: {
        width: 800,
        height: 600
      }
    };
  }, []);

  // Handle multiplayer game state updates
  useEffect(() => {
    const handleGameState = (data: NetworkMultiplayerGameState) => {
      const currentPlayerId = playerStateManager.getPlayerId();
      console.log('📡 Received game state:', {
        hasGameEngine: !!gameEngineRef.current,
        currentPlayerId: currentPlayerId,
        playersCount: data.players.length,
        dotsCount: data.dots.length,
        timeElapsed: data.timeElapsed
      });

      if (!gameEngineRef.current) {
        console.warn('⚠️ Game engine not ready, skipping game state update');
        return;
      }

      if (!currentPlayerId) {
        console.warn('⚠️ Current player ID not set, skipping game state update');
        return;
      }

      try {
        // Convert to local format and update engine
        const localState = convertToLocalGameState(data, currentPlayerId);
        
        // Update the local game engine with server state
        // This overrides client prediction with authoritative server state
        gameEngineRef.current.setGameState(localState);
        
        console.log('✅ Game state updated successfully');
        
      } catch (error) {
        console.error('❌ Error updating game state:', error);
      }
    };

    const handlePlayerEliminated = (data: { playerId: string }) => {
      console.log(`Player ${data.playerId} was eliminated`);
      // Visual feedback could be added here
    };

    const handleGameOver = (data: { winner: MultiplayerPlayerData | null }) => {
      const currentPlayerId = playerStateManager.getPlayerId();
      console.log('🏆 Game over received:', {
        winner: data.winner ? { id: data.winner.id, name: data.winner.name } : null,
        currentPlayerId: currentPlayerId,
        isCurrentPlayerWinner: data.winner?.id === currentPlayerId
      });
      onGameOver(data.winner);
    };

    const handleDisconnected = () => {
      console.log('Disconnected from server');
      onReturnToLobby();
    };

    // Store current player ID when we receive it
    const handleRoomJoined = (data: { playerId: string }) => {
      playerStateManager.setPlayerId(data.playerId);
    };

    const handleRoomCreated = (data: { playerId: string }) => {
      playerStateManager.setPlayerId(data.playerId);
    };

    const handleConnected = (data: { message: string; playerId: string }) => {
      console.log('🎯 MultiplayerGameContainer received connected event:', data);
      playerStateManager.setPlayerId(data.playerId);
      console.log('🆔 Player ID set in MultiplayerGameContainer:', data.playerId);
    };

    const handleGameStarted = () => {
      console.log('🎮 Game started event received in MultiplayerGameContainer');
      // Ensure game engine is in playing state
      if (gameEngineRef.current) {
        gameEngineRef.current.startGame();
        console.log('🎮 Game engine started');
      }
    };

    networkManager.on('GAME_STATE', handleGameState);
    networkManager.on('GAME_STARTED', handleGameStarted);
    networkManager.on('PLAYER_ELIMINATED', handlePlayerEliminated);
    networkManager.on('GAME_OVER', handleGameOver);
    networkManager.on('disconnected', handleDisconnected);
    networkManager.on('ROOM_JOINED', handleRoomJoined);
    networkManager.on('ROOM_CREATED', handleRoomCreated);
    networkManager.on('connected', handleConnected);

    return () => {
      networkManager.off('GAME_STATE', handleGameState);
      networkManager.off('GAME_STARTED', handleGameStarted);
      networkManager.off('PLAYER_ELIMINATED', handlePlayerEliminated);
      networkManager.off('GAME_OVER', handleGameOver);
      networkManager.off('disconnected', handleDisconnected);
      networkManager.off('ROOM_JOINED', handleRoomJoined);
      networkManager.off('ROOM_CREATED', handleRoomCreated);
      networkManager.off('connected', handleConnected);
    };
  }, [networkManager, convertToLocalGameState, onGameOver, onReturnToLobby]);

  // Handle input and send to server
  const handleInput = useCallback((direction: Vector2) => {
    // Send input to server for authoritative processing
    networkManager.sendInput(direction);
    
    // Also apply to local engine for client-side prediction
    if (gameEngineRef.current) {
      gameEngineRef.current.setSpinnerDirection(direction);
    }
  }, [networkManager]);

  const handleGameEngineReady = useCallback((engine: GameEngine) => {
    gameEngineRef.current = engine;
    console.log('🎮 Multiplayer game engine ready');
  }, []);

  return (
    <View style={styles.container}>
      <GameContainerWithRef
        ref={gameContainerRef}
        gameEngineRef={gameEngineRef}
        onGameStateChange={() => {}} // Server manages state changes
        onInputUpdate={handleInput}
        onGameEngineReady={handleGameEngineReady}
        isMultiplayer={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});