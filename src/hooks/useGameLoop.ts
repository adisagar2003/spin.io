/**
 * Custom hook for managing game loop with requestAnimationFrame
 */

import { useRef, useEffect, useCallback } from 'react';
import { GAME_CONFIG } from '../types';

interface UseGameLoopProps {
  /** Callback for each frame update */
  onUpdate: (deltaTime: number) => void;
  /** Whether the game loop should be running */
  isActive: boolean;
}

/**
 * Hook that manages the game loop using requestAnimationFrame
 * Provides consistent deltaTime updates for smooth gameplay
 * 
 * @param props - Game loop configuration
 */
export const useGameLoop = ({ onUpdate, isActive }: UseGameLoopProps): void => {
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const accumulatedTimeRef = useRef<number>(0);
  
  const targetFrameTime = 1000 / GAME_CONFIG.TARGET_FPS; // 60 FPS = ~16.67ms

  const tick = useCallback((currentTime: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = currentTime - lastTimeRef.current;
      accumulatedTimeRef.current += deltaTime;
      
      // Fixed timestep updates for consistent physics
      while (accumulatedTimeRef.current >= targetFrameTime) {
        onUpdate(targetFrameTime / 1000); // Convert to seconds
        accumulatedTimeRef.current -= targetFrameTime;
      }
    }
    
    lastTimeRef.current = currentTime;
    
    if (isActive) {
      requestRef.current = requestAnimationFrame(tick);
    }
  }, [onUpdate, isActive, targetFrameTime]);

  useEffect(() => {
    if (isActive) {
      // Reset timing when starting
      lastTimeRef.current = undefined;
      accumulatedTimeRef.current = 0;
      requestRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, tick]);
};