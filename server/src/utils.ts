/**
 * Mathematical utility functions for game physics and calculations
 */

import { Vector2, CollisionResult } from './types';

/**
 * Creates a new Vector2
 */
export const createVector2 = (x: number = 0, y: number = 0): Vector2 => ({ x, y });

/**
 * Calculates distance between two points
 */
export const distance = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Normalizes a vector to unit length
 */
export const normalize = (vector: Vector2): Vector2 => {
  const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (mag === 0) return createVector2(0, 0);
  return createVector2(vector.x / mag, vector.y / mag);
};

/**
 * Scales a vector by a scalar value
 */
export const scale = (vector: Vector2, scalar: number): Vector2 => {
  return createVector2(vector.x * scalar, vector.y * scalar);
};

/**
 * Adds two vectors
 */
export const add = (a: Vector2, b: Vector2): Vector2 => {
  return createVector2(a.x + b.x, a.y + b.y);
};

/**
 * Subtracts vector b from vector a
 */
export const subtract = (a: Vector2, b: Vector2): Vector2 => {
  return createVector2(a.x - b.x, a.y - b.y);
};

/**
 * Clamps a number between min and max values
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Detects collision between two circles
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
 * Generates a random float between min and max
 */
export const randomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Generates a unique ID string
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Generates a 4-digit room code
 */
export const generateRoomCode = (): string => {
  return Math.floor(Math.random() * 9000 + 1000).toString();
};