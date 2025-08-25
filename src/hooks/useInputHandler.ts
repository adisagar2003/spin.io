/**
 * Cross-platform input handler for touch and mouse controls
 */

import { useRef, useCallback } from 'react';
import { Platform, GestureResponderEvent, PanResponder } from 'react-native';
import { Vector2, InputState } from '../types';
import { createVector2, normalize, distance } from '@utils/math';

interface UseInputHandlerProps {
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Callback when input direction changes */
  onDirectionChange: (direction: Vector2) => void;
  /** Callback when input stops */
  onInputStop: () => void;
  /** Minimum distance for direction detection */
  deadZone?: number;
}

/**
 * Hook for handling cross-platform input (touch/mouse)
 * Converts screen coordinates to normalized direction vectors
 */
export const useInputHandler = ({
  canvasWidth,
  canvasHeight,
  onDirectionChange,
  onInputStop,
  deadZone = 20,
}: UseInputHandlerProps) => {
  const inputStateRef = useRef<InputState>({
    isActive: false,
    position: createVector2(0, 0),
    type: Platform.OS === 'web' ? 'mouse' : 'touch',
  });

  const centerRef = useRef<Vector2>(createVector2(canvasWidth / 2, canvasHeight / 2));

  // Update center when canvas size changes
  centerRef.current = createVector2(canvasWidth / 2, canvasHeight / 2);

  /**
   * Calculates direction from center to input position
   * @param inputPos - Current input position
   * @returns Normalized direction vector
   */
  const calculateDirection = useCallback((inputPos: Vector2): Vector2 => {
    const center = centerRef.current;
    const deltaX = inputPos.x - center.x;
    const deltaY = inputPos.y - center.y;
    const dist = distance(inputPos, center);
    
    // Apply dead zone
    if (dist < deadZone) {
      return createVector2(0, 0);
    }
    
    return normalize(createVector2(deltaX, deltaY));
  }, [deadZone]);

  /**
   * Handles input start (touch/mouse down)
   * @param event - Gesture event
   */
  const handleInputStart = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const inputPos = createVector2(locationX || 0, locationY || 0);
    
    inputStateRef.current = {
      isActive: true,
      position: inputPos,
      type: Platform.OS === 'web' ? 'mouse' : 'touch',
    };

    const direction = calculateDirection(inputPos);
    onDirectionChange(direction);
  }, [calculateDirection, onDirectionChange]);

  /**
   * Handles input movement (touch/mouse move)
   * @param event - Gesture event
   */
  const handleInputMove = useCallback((event: GestureResponderEvent) => {
    if (!inputStateRef.current.isActive) return;

    const { locationX, locationY } = event.nativeEvent;
    const inputPos = createVector2(locationX || 0, locationY || 0);
    
    inputStateRef.current.position = inputPos;

    const direction = calculateDirection(inputPos);
    onDirectionChange(direction);
  }, [calculateDirection, onDirectionChange]);

  /**
   * Handles input end (touch/mouse up)
   */
  const handleInputEnd = useCallback(() => {
    inputStateRef.current.isActive = false;
    onInputStop();
  }, [onInputStop]);

  // Create PanResponder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleInputStart,
      onPanResponderMove: handleInputMove,
      onPanResponderRelease: handleInputEnd,
      onPanResponderTerminate: handleInputEnd,
    })
  ).current;

  // Web-specific mouse event handlers
  const webEventHandlers = Platform.OS === 'web' ? {
    onMouseDown: handleInputStart,
    onMouseMove: handleInputMove,
    onMouseUp: handleInputEnd,
    onMouseLeave: handleInputEnd,
  } : {};

  return {
    // Pan responder for React Native touch handling
    panHandlers: panResponder.panHandlers,
    
    // Web mouse event handlers
    webEventHandlers,
    
    // Current input state (for debugging)
    inputState: inputStateRef.current,
    
    // Combined event handlers for universal use
    eventHandlers: {
      ...panResponder.panHandlers,
      ...webEventHandlers,
    },
  };
};