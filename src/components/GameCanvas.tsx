/**
 * Game canvas component for rendering the game world
 * Uses React Native SVG for cross-platform 2D rendering
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { 
  Circle, 
  Polygon, 
  Rect, 
  G,
  Text,
  Defs,
  RadialGradient,
  Stop 
} from 'react-native-svg';
import { GameState, MultiplayerGameState, Spinner, Dot, COLORS, GAME_CONFIG } from '../types';

interface GameCanvasProps {
  /** Current game state (single or multiplayer) */
  gameState: GameState | MultiplayerGameState;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Camera offset for viewport */
  cameraOffset?: { x: number; y: number };
}

/**
 * Main game canvas component
 * Renders all game objects including spinner, dots, and arena
 */
// Type guard to check if gameState is multiplayer
const isMultiplayerGameState = (state: GameState | MultiplayerGameState): state is MultiplayerGameState => {
  return 'players' in state;
};

export const GameCanvas: React.FC<GameCanvasProps> = React.memo(({
  gameState,
  width,
  height,
  cameraOffset = { x: 0, y: 0 }
}) => {
  const isMultiplayer = isMultiplayerGameState(gameState);
  
  // Debug logging for canvas rendering
  if (Math.random() < 0.1) { // Log 10% of renders to avoid spam
    if (isMultiplayer) {
      console.log('🖼️ Canvas render (MP) - Phase:', gameState.phase, 'Dots:', gameState.dots?.length || 0, 'Players:', gameState.players?.length || 0);
    } else {
      console.log('🖼️ Canvas render (SP) - Phase:', gameState.phase, 'Dots:', gameState.dots?.length || 0, 'Spinner pos:', gameState.spinner?.position);
    }
  }

  // Calculate scale to fit arena in viewport
  const scale = useMemo(() => {
    const scaleX = width / GAME_CONFIG.ARENA_WIDTH;
    const scaleY = height / GAME_CONFIG.ARENA_HEIGHT;
    const calculatedScale = Math.min(scaleX, scaleY, 1);
    console.log('📏 Canvas scale calculation:', { scaleX, scaleY, finalScale: calculatedScale });
    return calculatedScale;
  }, [width, height]);

  // Calculate viewport offset to center arena
  const viewportOffset = useMemo(() => ({
    x: (width - GAME_CONFIG.ARENA_WIDTH * scale) / 2,
    y: (height - GAME_CONFIG.ARENA_HEIGHT * scale) / 2,
  }), [width, height, scale]);

  /**
   * Transforms game world coordinates to screen coordinates
   * @param x - World X coordinate
   * @param y - World Y coordinate
   * @returns Screen coordinates
   */
  const worldToScreen = (x: number, y: number) => ({
    x: (x - cameraOffset.x) * scale + viewportOffset.x,
    y: (y - cameraOffset.y) * scale + viewportOffset.y,
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Spinner gradient */}
          <RadialGradient id="spinnerGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={COLORS.SPINNER} stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.SPINNER} stopOpacity="0.7" />
          </RadialGradient>
          
          {/* Dot gradient */}
          <RadialGradient id="dotGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={COLORS.DOT} stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.DOT} stopOpacity="0.8" />
          </RadialGradient>
        </Defs>

        {/* Arena background */}
        <Rect
          x={viewportOffset.x}
          y={viewportOffset.y}
          width={GAME_CONFIG.ARENA_WIDTH * scale}
          height={GAME_CONFIG.ARENA_HEIGHT * scale}
          fill={COLORS.BACKGROUND}
          stroke={COLORS.UI_TEXT}
          strokeWidth={2}
          strokeOpacity={0.3}
        />


        {/* Render dots */}
        {gameState.dots.map((dot: Dot) => (
          <DotComponent
            key={dot.id}
            dot={dot}
            scale={scale}
            worldToScreen={worldToScreen}
          />
        ))}

        {/* Render spinner(s) */}
        {isMultiplayer ? (
          // Multiplayer: render all players' spinners
          gameState.players.map((player) => (
            <SpinnerComponent
              key={player.id}
              spinner={player.spinner}
              scale={scale}
              worldToScreen={worldToScreen}
              isCurrentPlayer={player.isCurrentPlayer}
              playerName={player.name}
              isAlive={player.isAlive}
            />
          ))
        ) : (
          // Single player: render only the main spinner
          <SpinnerComponent
            spinner={gameState.spinner}
            scale={scale}
            worldToScreen={worldToScreen}
            isCurrentPlayer={true}
            playerName=""
            isAlive={true}
          />
        )}
      </Svg>
    </View>
  );
});

GameCanvas.displayName = 'GameCanvas';

/**
 * Spinner component with rotation animation
 */
const SpinnerComponent: React.FC<{
  spinner: Spinner;
  scale: number;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  isCurrentPlayer: boolean;
  playerName: string;
  isAlive: boolean;
}> = React.memo(({ spinner, scale, worldToScreen, isCurrentPlayer, playerName, isAlive }) => {
  const screenPos = worldToScreen(spinner.position.x, spinner.position.y);
  const screenSize = spinner.size * scale;
  
  // DEBUG: Log spinner rendering details
  if (Math.random() < 0.1) { // Log 10% of renders to avoid spam
    console.log('🌀 Rendering spinner:', {
      worldPos: spinner.position,
      screenPos,
      worldSize: spinner.size,
      screenSize,
      scale,
      rotation: spinner.rotation.toFixed(2)
    });
  }
  
  // Determine colors based on player type
  const spinnerColor = isCurrentPlayer ? COLORS.SPINNER : (isAlive ? '#00AAFF' : '#666666'); // Current = green, others = blue, dead = gray
  const opacity = isAlive ? 1 : 0.5;
  
  // Create fidget spinner shape (tri-lobed)
  const spinnerPoints = useMemo(() => {
    const centerX = screenPos.x;
    const centerY = screenPos.y;
    const radius = screenSize;
    const angleOffset = spinner.rotation;
    
    // Create three circles in triangle formation
    const lobePositions = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2 / 3) + angleOffset;
      const lobeDistance = radius * 0.6;
      lobePositions.push({
        x: centerX + Math.cos(angle) * lobeDistance,
        y: centerY + Math.sin(angle) * lobeDistance,
      });
    }
    
    return lobePositions;
  }, [screenPos.x, screenPos.y, screenSize, spinner.rotation]);

  return (
    <G opacity={opacity}>
      {/* Main body */}
      <Circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={screenSize * 0.4}
        fill={spinnerColor}
        stroke={spinnerColor}
        strokeWidth={2}
        opacity={0.8}
      />
      
      {/* Three spinner lobes */}
      {spinnerPoints.map((lobe, index) => (
        <Circle
          key={index}
          cx={lobe.x}
          cy={lobe.y}
          r={screenSize * 0.35}
          fill={spinnerColor}
          stroke={spinnerColor}
          strokeWidth={1}
          opacity={0.6}
        />
      ))}
      
      {/* Center hub */}
      <Circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={screenSize * 0.15}
        fill={COLORS.BACKGROUND}
        stroke={spinnerColor}
        strokeWidth={2}
      />
      
      {/* Player name label (for multiplayer) */}
      {playerName && (
        <Text
          x={screenPos.x}
          y={screenPos.y - screenSize - 10}
          textAnchor="middle"
          fill={spinnerColor}
          fontSize={12}
          fontWeight="bold"
        >
          {playerName}
        </Text>
      )}
    </G>
  );
});

SpinnerComponent.displayName = 'SpinnerComponent';

/**
 * Dot component with pulsing effect
 */
const DotComponent: React.FC<{
  dot: Dot;
  scale: number;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}> = React.memo(({ dot, scale, worldToScreen }) => {
  const screenPos = worldToScreen(dot.position.x, dot.position.y);
  const screenSize = dot.size * scale;
  
  // DEBUG: Log first few dot renders (reduced logging)
  if (Math.random() < 0.001) { // Only log 0.1% to avoid spam
    console.log('🔴 Rendering dot:', {
      id: dot.id,
      worldPos: dot.position,
      screenPos,
      worldSize: dot.size,
      screenSize,
      scale
    });
  }
  
  return (
    <G>
      {/* Outer glow */}
      <Circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={screenSize * 1.2}
        fill={COLORS.DOT}
        opacity={0.3}
      />
      
      {/* Main dot */}
      <Circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={screenSize}
        fill="url(#dotGradient)"
        stroke={COLORS.DOT}
        strokeWidth={1}
      />
      
      {/* Inner highlight */}
      <Circle
        cx={screenPos.x - screenSize * 0.3}
        cy={screenPos.y - screenSize * 0.3}
        r={screenSize * 0.3}
        fill={COLORS.DOT}
        opacity={0.6}
      />
    </G>
  );
});

DotComponent.displayName = 'DotComponent';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND,
    overflow: 'hidden',
  },
});