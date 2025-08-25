/**
 * Mathematical utility functions for game physics and calculations
 */

import { Vector2, CollisionResult } from '../types';

/**
 * Creates a new Vector2
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns New Vector2 instance
 */
export const createVector2 = (x: number = 0, y: number = 0): Vector2 => ({ x, y });

/**
 * Calculates distance between two points
 * @param a - First point
 * @param b - Second point
 * @returns Distance between points
 */
export const distance = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculates squared distance (faster for comparison operations)
 * @param a - First point
 * @param b - Second point
 * @returns Squared distance between points
 */
export const distanceSquared = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

/**
 * Normalizes a vector to unit length
 * @param vector - Vector to normalize
 * @returns Normalized vector
 */
export const normalize = (vector: Vector2): Vector2 => {
  const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (mag === 0) return createVector2(0, 0);
  return createVector2(vector.x / mag, vector.y / mag);
};

/**
 * Calculates vector magnitude
 * @param vector - Vector to measure
 * @returns Magnitude of vector
 */
export const magnitude = (vector: Vector2): number => {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
};

/**
 * Scales a vector by a scalar value
 * @param vector - Vector to scale
 * @param scalar - Scale factor
 * @returns Scaled vector
 */
export const scale = (vector: Vector2, scalar: number): Vector2 => {
  return createVector2(vector.x * scalar, vector.y * scalar);
};

/**
 * Adds two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Sum of vectors
 */
export const add = (a: Vector2, b: Vector2): Vector2 => {
  return createVector2(a.x + b.x, a.y + b.y);
};

/**
 * Subtracts vector b from vector a
 * @param a - First vector
 * @param b - Second vector
 * @returns Difference of vectors
 */
export const subtract = (a: Vector2, b: Vector2): Vector2 => {
  return createVector2(a.x - b.x, a.y - b.y);
};

/**
 * Linear interpolation between two vectors
 * @param a - Start vector
 * @param b - End vector
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated vector
 */
export const lerp = (a: Vector2, b: Vector2, t: number): Vector2 => {
  return createVector2(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t
  );
};

/**
 * Clamps a number between min and max values
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Detects collision between two circles
 * @param pos1 - Position of first circle
 * @param radius1 - Radius of first circle
 * @param pos2 - Position of second circle
 * @param radius2 - Radius of second circle
 * @returns Collision result
 */
export const circleCollision = (
  pos1: Vector2,
  radius1: number,
  pos2: Vector2,
  radius2: number
): CollisionResult => {
  const dist = distance(pos1, pos2);
  const totalRadius = radius1 + radius2;
  const hasCollision = dist < totalRadius;
  
  let normal: Vector2 | undefined;
  if (hasCollision && dist > 0) {
    normal = normalize(subtract(pos2, pos1));
  }
  
  return {
    hasCollision,
    distance: dist,
    normal
  };
};

/**
 * Checks if a point is inside a rectangle
 * @param point - Point to check
 * @param rectPos - Rectangle position (top-left)
 * @param rectSize - Rectangle size
 * @returns True if point is inside rectangle
 */
export const pointInRect = (
  point: Vector2,
  rectPos: Vector2,
  rectSize: Vector2
): boolean => {
  return point.x >= rectPos.x && 
         point.x <= rectPos.x + rectSize.x &&
         point.y >= rectPos.y && 
         point.y <= rectPos.y + rectSize.y;
};

/**
 * Generates a random float between min and max
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random float
 */
export const randomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Generates a random integer between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generates a unique ID string
 * @returns Unique identifier
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};