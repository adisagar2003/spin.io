/**
 * Multiplayer game container that integrates network state with local rendering
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GameContainer } from '../features/game/GameContainer';
import { GameEngine } from '../features/game/GameEngine';
import { NetworkManager, MultiplayerGameState, MultiplayerPlayerData } from './NetworkManager';
import { Vector2, GameState, Spinner, Dot, GamePhase } from '../types';
import { createVector2 } from '../utils/math';
import { GameContainerRef } from '../types/game-refs';

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
  const gameEngineRef = useRef<GameEngine | null>(null);
  const currentPlayerIdRef = useRef<string>('');

  // Convert multiplayer state to local game state format
  const convertToLocalGameState = useCallback((
    multiplayerState: MultiplayerGameState,
    currentPlayerId: string
  ): GameState => {
    // Find current player
    const currentPlayer = multiplayerState.players.find(p => p.id === currentPlayerId);
    
    if (!currentPlayer) {
      throw new Error('Current player not found in multiplayer state');
    }

    // Convert spinner format
    const spinner: Spinner = {
      position: currentPlayer.spinner.position,
      velocity: currentPlayer.spinner.velocity,
      targetDirection: currentPlayer.spinner.targetDirection,
      size: currentPlayer.spinner.size,
      spinSpeed: currentPlayer.spinner.spinSpeed,
      rotation: currentPlayer.spinner.rotation,
      maxSpeed: currentPlayer.spinner.maxSpeed
    };

    // Convert dots format
    const dots: Dot[] = multiplayerState.dots.map(dot => ({
      id: dot.id,
      position: dot.position,
      size: dot.size,
      value: dot.value
    }));

    return {
      phase: GamePhase.PLAYING,
      spinner,
      dots,
      score: currentPlayer.score,
      timeElapsed: multiplayerState.timeElapsed,
      arena: {
        width: 800,
        height: 600
      }
    };
  }, []);

  // Handle multiplayer game state updates
  useEffect(() => {
    const handleGameState = (data: MultiplayerGameState) => {
      if (!gameEngineRef.current || !currentPlayerIdRef.current) return;

      try {
        // Convert to local format and update engine
        const localState = convertToLocalGameState(data, currentPlayerIdRef.current);
        
        // Update the local game engine with server state
        // This overrides client prediction with authoritative server state
        gameEngineRef.current.setGameState(localState);
        
      } catch (error) {
        console.error('Error updating game state:', error);
      }
    };

    const handlePlayerEliminated = (data: { playerId: string }) => {
      console.log(`Player ${data.playerId} was eliminated`);
      // Visual feedback could be added here
    };

    const handleGameOver = (data: { winner: MultiplayerPlayerData | null }) => {
      console.log('Game over, winner:', data.winner?.name || 'None');
      onGameOver(data.winner);
    };

    const handleDisconnected = () => {
      console.log('Disconnected from server');
      onReturnToLobby();
    };

    // Store current player ID when we receive it
    const handleRoomJoined = (data: { playerId: string }) => {
      currentPlayerIdRef.current = data.playerId;
    };

    const handleRoomCreated = (data: { playerId: string }) => {
      currentPlayerIdRef.current = data.playerId;
    };

    networkManager.on('GAME_STATE', handleGameState);
    networkManager.on('PLAYER_ELIMINATED', handlePlayerEliminated);
    networkManager.on('GAME_OVER', handleGameOver);
    networkManager.on('disconnected', handleDisconnected);
    networkManager.on('ROOM_JOINED', handleRoomJoined);
    networkManager.on('ROOM_CREATED', handleRoomCreated);

    return () => {
      networkManager.off('GAME_STATE', handleGameState);
      networkManager.off('PLAYER_ELIMINATED', handlePlayerEliminated);
      networkManager.off('GAME_OVER', handleGameOver);
      networkManager.off('disconnected', handleDisconnected);
      networkManager.off('ROOM_JOINED', handleRoomJoined);
      networkManager.off('ROOM_CREATED', handleRoomCreated);
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
    console.log('Multiplayer game engine ready');
  }, []);

  return (
    <View style={styles.container}>
      <GameContainer
        ref={gameContainerRef}
        gameEngineRef={{ current: null }} // We manage the engine ourselves
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