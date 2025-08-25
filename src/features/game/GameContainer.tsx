/**
 * Main game container that orchestrates all game components
 * Handles game state, input, and rendering coordination
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GameEngine } from './GameEngine';
import { GameCanvas } from '@components/GameCanvas';
import { useGameLoop } from '@hooks/useGameLoop';
import { useInputHandler } from '@hooks/useInputHandler';
import { GameState, GamePhase, Vector2 } from '../../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GameContainerProps {
  /** Callback when game state changes */
  onGameStateChange?: (gameState: GameState) => void;
  /** Callback when score changes */
  onScoreChange?: (score: number) => void;
  /** Callback when game ends */
  onGameEnd?: (finalScore: number, timeElapsed: number) => void;
}

/**
 * Main game container component
 * Manages game engine, input handling, and rendering
 */
export const GameContainer: React.FC<GameContainerProps> = ({
  onGameStateChange,
  onScoreChange,
  onGameEnd,
}) => {
  // Game engine instance
  const gameEngineRef = useRef<GameEngine>(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(() => 
    gameEngineRef.current.getGameState()
  );

  // Previous score for change detection
  const previousScoreRef = useRef<number>(gameState.score);

  // Canvas dimensions (leave some space for UI)
  const canvasWidth = screenWidth;
  const canvasHeight = screenHeight * 0.8; // 80% for game, 20% for UI

  /**
   * Game loop update handler
   * @param deltaTime - Time elapsed since last frame
   */
  const handleGameUpdate = useCallback((deltaTime: number) => {
    const engine = gameEngineRef.current;
    engine.update(deltaTime);
    
    const newGameState = engine.getGameState();
    
    // DEBUG: Log game state flow
    console.log('🎯 GameContainer update - Dots in engine state:', newGameState.dots?.length || 0);
    
    setGameState(newGameState);

    // Notify parent of state changes
    onGameStateChange?.(newGameState);

    // Check for score changes
    if (newGameState.score !== previousScoreRef.current) {
      previousScoreRef.current = newGameState.score;
      onScoreChange?.(newGameState.score);
    }

    // Check for game end
    if (newGameState.phase === GamePhase.GAME_OVER) {
      const finalScore = engine.getFinalScore();
      const timeElapsed = engine.getTimeElapsed();
      onGameEnd?.(finalScore, timeElapsed);
    }
  }, [onGameStateChange, onScoreChange, onGameEnd]);

  // Game loop hook
  const isGameActive = gameState.phase === GamePhase.PLAYING;
  useGameLoop({
    onUpdate: handleGameUpdate,
    isActive: isGameActive,
  });

  /**
   * Handles input direction changes
   * @param direction - Normalized direction vector
   */
  const handleDirectionChange = useCallback((direction: Vector2) => {
    gameEngineRef.current.setSpinnerDirection(direction);
  }, []);

  /**
   * Handles input stop
   */
  const handleInputStop = useCallback(() => {
    gameEngineRef.current.stopSpinner();
  }, []);

  // Input handler hook
  const { eventHandlers } = useInputHandler({
    canvasWidth,
    canvasHeight,
    onDirectionChange: handleDirectionChange,
    onInputStop: handleInputStop,
    deadZone: 30, // Larger dead zone for easier control
  });

  /**
   * Starts a new game
   */
  const startGame = useCallback(() => {
    console.log('🚀 GameContainer.startGame() called');
    gameEngineRef.current.startGame();
    const newGameState = gameEngineRef.current.getGameState();
    console.log('🎮 After startGame - Game phase:', newGameState.phase, 'Dots:', newGameState.dots?.length);
    setGameState(newGameState);
    previousScoreRef.current = newGameState.score;
  }, []);

  /**
   * Returns to menu
   */
  const returnToMenu = useCallback(() => {
    gameEngineRef.current.resetToMenu();
    const newGameState = gameEngineRef.current.getGameState();
    setGameState(newGameState);
  }, []);

  // Camera offset for following spinner (optional enhancement)
  const cameraOffset = useMemo(() => {
    // For now, keep camera static. Could add smooth following later
    return { x: 0, y: 0 };
  }, []);

  return (
    <View style={styles.container}>
      {/* Game Canvas */}
      <View style={[styles.canvasContainer, { width: canvasWidth, height: canvasHeight }]}>
        <View style={StyleSheet.absoluteFill} {...eventHandlers}>
          <GameCanvas
            gameState={gameState}
            width={canvasWidth}
            height={canvasHeight}
            cameraOffset={cameraOffset}
          />
        </View>
      </View>

      {/* Game controls overlay (invisible but handles input) */}
      {gameState.phase === GamePhase.PLAYING && (
        <View style={[StyleSheet.absoluteFill, styles.inputOverlay]} {...eventHandlers} />
      )}
    </View>
  );
};

// Export methods for parent components to control game
export const useGameContainerControls = (gameContainerRef: React.RefObject<{
  startGame: () => void;
  returnToMenu: () => void;
}>) => {
  const startGame = useCallback(() => {
    gameContainerRef.current?.startGame();
  }, [gameContainerRef]);

  const returnToMenu = useCallback(() => {
    gameContainerRef.current?.returnToMenu();
  }, [gameContainerRef]);

  return { startGame, returnToMenu };
};

// Expose methods via ref
export interface GameContainerRef {
  startGame: () => void;
  returnToMenu: () => void;
}

// Forward ref version for external control
export const GameContainerWithRef = React.forwardRef<GameContainerRef, GameContainerProps>(
  (props, ref) => {
    const gameEngineRef = useRef<GameEngine>(new GameEngine());
    const [gameState, setGameState] = useState<GameState>(() => 
      gameEngineRef.current.getGameState()
    );

    const startGame = useCallback(() => {
      gameEngineRef.current.startGame();
      const newGameState = gameEngineRef.current.getGameState();
      setGameState(newGameState);
    }, []);

    const returnToMenu = useCallback(() => {
      gameEngineRef.current.resetToMenu();
      const newGameState = gameEngineRef.current.getGameState();
      setGameState(newGameState);
    }, []);

    React.useImperativeHandle(ref, () => ({
      startGame,
      returnToMenu,
    }));

    return <GameContainer {...props} />;
  }
);

GameContainerWithRef.displayName = 'GameContainerWithRef';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  canvasContainer: {
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  inputOverlay: {
    backgroundColor: 'transparent',
  },
});