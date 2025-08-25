/**
 * Cross-platform input handler for touch, mouse, and keyboard controls
 */

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Platform, GestureResponderEvent, PanResponder } from 'react-native';
import { Vector2, InputState, KeyboardControlMap, KeyboardControlKey } from '../types';
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
const KEYBOARD_CONTROLS: KeyboardControlMap = {
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
  const pressedKeysRef = useRef<Set<KeyboardControlKey>>(new Set());
  const keyboardActiveRef = useRef<boolean>(false);
  
  // Throttle keyboard input to prevent excessive updates
  const lastKeyboardUpdateRef = useRef<number>(0);
  const KEYBOARD_THROTTLE_MS = 16; // ~60fps

  // Memoize center calculation for performance
  const center = useMemo(() => 
    createVector2(canvasWidth / 2, canvasHeight / 2),
    [canvasWidth, canvasHeight]
  );

  /**
   * Calculates direction from pressed keyboard keys
   * @returns Normalized direction vector from keyboard input
   */
  const calculateKeyboardDirection = useCallback((): Vector2 => {
    let direction = createVector2(0, 0);
    
    // Accumulate directions from all pressed keys
    pressedKeysRef.current.forEach(key => {
      const keyDirection = KEYBOARD_CONTROLS[key];
      direction.x += keyDirection.x;
      direction.y += keyDirection.y;
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
    const deltaX = inputPos.x - center.x;
    const deltaY = inputPos.y - center.y;
    const dist = distance(inputPos, center);
    
    // Apply dead zone
    if (dist < deadZone) {
      return createVector2(0, 0);
    }
    
    return normalize(createVector2(deltaX, deltaY));
  }, [center, deadZone]);

  /**
   * Combines keyboard and touch/mouse directions with priority system
   * @param touchDirection - Direction from touch/mouse input
   * @returns Final direction vector (keyboard takes priority)
   */
  const combineInputDirections = useCallback((touchDirection: Vector2): Vector2 => {
    const keyboardDirection = calculateKeyboardDirection();
    
    // Keyboard takes priority when active
    if (keyboardActiveRef.current && (keyboardDirection.x !== 0 || keyboardDirection.y !== 0)) {
      return keyboardDirection;
    }
    
    // Fall back to touch/mouse input
    return touchDirection;
  }, [calculateKeyboardDirection]);

  /**
   * Handles input start (touch/mouse down)
   * @param event - Gesture event
   */
  const handleInputStart = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const inputPos = createVector2(locationX || 0, locationY || 0);
    
    // Update touch/mouse state (but don't override keyboard state)
    if (!keyboardActiveRef.current) {
      inputStateRef.current = {
        isActive: true,
        position: inputPos,
        type: Platform.OS === 'web' ? 'mouse' : 'touch',
      };
    }

    const touchDirection = calculateDirection(inputPos);
    const finalDirection = combineInputDirections(touchDirection);
    onDirectionChange(finalDirection);
  }, [calculateDirection, combineInputDirections, onDirectionChange]);

  /**
   * Handles input movement (touch/mouse move)
   * @param event - Gesture event
   */
  const handleInputMove = useCallback((event: GestureResponderEvent) => {
    // Skip if keyboard is active (keyboard takes priority)
    if (keyboardActiveRef.current) return;
    
    if (!inputStateRef.current.isActive) return;

    const { locationX, locationY } = event.nativeEvent;
    const inputPos = createVector2(locationX || 0, locationY || 0);
    
    inputStateRef.current.position = inputPos;

    const touchDirection = calculateDirection(inputPos);
    const finalDirection = combineInputDirections(touchDirection);
    onDirectionChange(finalDirection);
  }, [calculateDirection, combineInputDirections, onDirectionChange]);

  /**
   * Handles input end (touch/mouse up)
   */
  const handleInputEnd = useCallback(() => {
    // Mark touch/mouse as inactive
    if (inputStateRef.current.type !== 'keyboard') {
      inputStateRef.current.isActive = false;
    }
    
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
      
      const now = Date.now();
      const key = event.code as KeyboardControlKey;
      
      // Add key to pressed set
      const wasPressed = pressedKeysRef.current.has(key);
      pressedKeysRef.current.add(key);
      keyboardActiveRef.current = true;
      
      // Throttle updates for performance (skip if key already pressed and within throttle window)
      if (wasPressed && now - lastKeyboardUpdateRef.current < KEYBOARD_THROTTLE_MS) {
        return;
      }
      
      lastKeyboardUpdateRef.current = now;
      
      // Update input state to indicate keyboard is active
      inputStateRef.current = {
        isActive: true,
        position: center, // Use center for keyboard
        type: 'keyboard',
        pressedKeys: new Set(pressedKeysRef.current),
        keyboardPriority: true,
      };
      
      // Use combined input system (keyboard will take priority)
      const finalDirection = combineInputDirections(createVector2(0, 0));
      onDirectionChange(finalDirection);
    }
  }, [center, combineInputDirections, onDirectionChange]);

  /**
   * Handles keyboard key up
   * @param event - Keyboard event
   */
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code in KEYBOARD_CONTROLS) {
      const key = event.code as KeyboardControlKey;
      pressedKeysRef.current.delete(key);
      
      if (pressedKeysRef.current.size === 0) {
        keyboardActiveRef.current = false;
        
        // If no touch/mouse input is active, stop completely
        const isTouchActive = inputStateRef.current.isActive && inputStateRef.current.type !== 'keyboard';
        if (!isTouchActive) {
          inputStateRef.current.isActive = false;
          onInputStop();
        } else {
          // Fall back to touch/mouse input
          const touchDirection = calculateDirection(inputStateRef.current.position);
          const finalDirection = combineInputDirections(touchDirection);
          onDirectionChange(finalDirection);
        }
      } else {
        // Still have keys pressed, update direction and input state
        inputStateRef.current.pressedKeys = new Set(pressedKeysRef.current);
        const finalDirection = combineInputDirections(createVector2(0, 0));
        onDirectionChange(finalDirection);
      }
    }
  }, [combineInputDirections, calculateDirection, onDirectionChange, onInputStop]);

  // Clear keyboard state when losing focus
  const handleWindowBlur = useCallback(() => {
    if (keyboardActiveRef.current && pressedKeysRef.current.size > 0) {
      // Clear all pressed keys and stop input
      pressedKeysRef.current.clear();
      keyboardActiveRef.current = false;
      inputStateRef.current.isActive = false;
      onInputStop();
    }
  }, [onInputStop]);

  // Set up keyboard event listeners on web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Add event listeners to document for global keyboard handling
      document.addEventListener('keydown', handleKeyDown, { passive: false });
      document.addEventListener('keyup', handleKeyUp, { passive: false });
      
      // Handle window blur to prevent stuck keys
      window.addEventListener('blur', handleWindowBlur);
      
      // Also handle visibility change for mobile web
      document.addEventListener('visibilitychange', handleWindowBlur);
      
      // Cleanup on unmount
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleWindowBlur);
        document.removeEventListener('visibilitychange', handleWindowBlur);
        
        // Clear pressed keys on cleanup
        pressedKeysRef.current.clear();
        keyboardActiveRef.current = false;
      };
    }
  }, [handleKeyDown, handleKeyUp, handleWindowBlur]);

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