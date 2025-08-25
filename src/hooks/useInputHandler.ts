/**
 * Cross-platform input handler for touch, mouse, and keyboard controls
 */

import { useRef, useCallback, useEffect } from 'react';
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

// Keyboard control mapping for WASD keys
const KEYBOARD_CONTROLS = {
  KeyW: { x: 0, y: -1 },   // Up
  KeyA: { x: -1, y: 0 },   // Left
  KeyS: { x: 0, y: 1 },    // Down
  KeyD: { x: 1, y: 0 },    // Right
} as const;

/**
 * Hook for handling cross-platform input (touch/mouse/keyboard)
 * Converts screen coordinates and key presses to normalized direction vectors
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

  // Track pressed keys for keyboard input
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const keyboardActiveRef = useRef<boolean>(false);

  const centerRef = useRef<Vector2>(createVector2(canvasWidth / 2, canvasHeight / 2));

  // Update center when canvas size changes
  centerRef.current = createVector2(canvasWidth / 2, canvasHeight / 2);

  /**
   * Calculates direction from pressed keyboard keys
   * @returns Normalized direction vector from keyboard input
   */
  const calculateKeyboardDirection = useCallback((): Vector2 => {
    let direction = createVector2(0, 0);
    
    // Accumulate directions from all pressed keys
    pressedKeysRef.current.forEach(key => {
      if (key in KEYBOARD_CONTROLS) {
        const keyDirection = KEYBOARD_CONTROLS[key as keyof typeof KEYBOARD_CONTROLS];
        direction.x += keyDirection.x;
        direction.y += keyDirection.y;
      }
    });
    
    // Normalize for consistent speed regardless of key combinations
    if (direction.x !== 0 || direction.y !== 0) {
      return normalize(direction);
    }
    
    return createVector2(0, 0);
  }, []);

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
    // Only stop input if keyboard is also inactive
    if (!keyboardActiveRef.current) {
      onInputStop();
    }
  }, [onInputStop]);

  /**
   * Handles keyboard key down
   * @param event - Keyboard event
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code in KEYBOARD_CONTROLS) {
      event.preventDefault();
      
      const wasEmpty = pressedKeysRef.current.size === 0;
      pressedKeysRef.current.add(event.code);
      keyboardActiveRef.current = true;
      
      // Update input state to indicate keyboard is active
      inputStateRef.current = {
        isActive: true,
        position: centerRef.current, // Use center for keyboard
        type: 'keyboard',
      };
      
      const direction = calculateKeyboardDirection();
      onDirectionChange(direction);
    }
  }, [calculateKeyboardDirection, onDirectionChange]);

  /**
   * Handles keyboard key up
   * @param event - Keyboard event
   */
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code in KEYBOARD_CONTROLS) {
      pressedKeysRef.current.delete(event.code);
      
      if (pressedKeysRef.current.size === 0) {
        keyboardActiveRef.current = false;
        inputStateRef.current.isActive = false;
        
        // Only stop if touch/mouse is also inactive
        if (!inputStateRef.current.isActive) {
          onInputStop();
        }
      } else {
        // Still have keys pressed, update direction
        const direction = calculateKeyboardDirection();
        onDirectionChange(direction);
      }
    }
  }, [calculateKeyboardDirection, onDirectionChange, onInputStop]);

  // Set up keyboard event listeners on web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Add event listeners to document for global keyboard handling
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      
      // Cleanup on unmount
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        // Clear pressed keys on cleanup
        pressedKeysRef.current.clear();
        keyboardActiveRef.current = false;
      };
    }
  }, [handleKeyDown, handleKeyUp]);

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