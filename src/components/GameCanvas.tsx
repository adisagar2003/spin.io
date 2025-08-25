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
  Defs,
  RadialGradient,
  Stop 
} from 'react-native-svg';
import { GameState, Spinner, Dot, COLORS, GAME_CONFIG } from '../types';

interface GameCanvasProps {
  /** Current game state */
  gameState: GameState;
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
export const GameCanvas: React.FC<GameCanvasProps> = React.memo(({
  gameState,
  width,
  height,
  cameraOffset = { x: 0, y: 0 }
}) => {
  // Debug logging for canvas rendering
  console.log('🖼️ Canvas render - Dots to render:', gameState.dots?.length || 0);
  if (gameState.dots?.length > 0) {
    console.log('📍 First dot position:', gameState.dots[0].position, 'size:', gameState.dots[0].size);
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

        {/* DEBUG: Arena corners for visibility testing */}
        <Circle
          cx={viewportOffset.x + 10}
          cy={viewportOffset.y + 10}
          r={5}
          fill="#00FFFF"
        />
        <Circle
          cx={viewportOffset.x + GAME_CONFIG.ARENA_WIDTH * scale - 10}
          cy={viewportOffset.y + 10}
          r={5}
          fill="#00FFFF"
        />
        <Circle
          cx={viewportOffset.x + 10}
          cy={viewportOffset.y + GAME_CONFIG.ARENA_HEIGHT * scale - 10}
          r={5}
          fill="#00FFFF"
        />
        <Circle
          cx={viewportOffset.x + GAME_CONFIG.ARENA_WIDTH * scale - 10}
          cy={viewportOffset.y + GAME_CONFIG.ARENA_HEIGHT * scale - 10}
          r={5}
          fill="#00FFFF"
        />

        {/* DEBUG: Center point marker */}
        <Circle
          cx={viewportOffset.x + (GAME_CONFIG.ARENA_WIDTH * scale) / 2}
          cy={viewportOffset.y + (GAME_CONFIG.ARENA_HEIGHT * scale) / 2}
          r={8}
          fill="#FFFF00"
          stroke="#000000"
          strokeWidth={2}
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

        {/* Render spinner */}
        <SpinnerComponent
          spinner={gameState.spinner}
          scale={scale}
          worldToScreen={worldToScreen}
        />
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
}> = React.memo(({ spinner, scale, worldToScreen }) => {
  const screenPos = worldToScreen(spinner.position.x, spinner.position.y);
  const screenSize = spinner.size * scale;
  
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
    <G>
      {/* Main body */}
      <Circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={screenSize * 0.4}
        fill="url(#spinnerGradient)"
        stroke={COLORS.SPINNER}
        strokeWidth={2}
      />
      
      {/* Three spinner lobes */}
      {spinnerPoints.map((lobe, index) => (
        <Circle
          key={index}
          cx={lobe.x}
          cy={lobe.y}
          r={screenSize * 0.35}
          fill="url(#spinnerGradient)"
          stroke={COLORS.SPINNER}
          strokeWidth={1}
          opacity={0.8}
        />
      ))}
      
      {/* Center hub */}
      <Circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={screenSize * 0.15}
        fill={COLORS.BACKGROUND}
        stroke={COLORS.SPINNER}
        strokeWidth={2}
      />
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
  
  // DEBUG: Log first few dot renders
  if (Math.random() < 0.01) { // Only log 1% to avoid spam
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