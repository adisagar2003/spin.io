/**
 * Tests for mathematical utility functions
 */

import {
  createVector2,
  distance,
  distanceSquared,
  normalize,
  magnitude,
  scale,
  add,
  subtract,
  lerp,
  clamp,
  circleCollision,
  pointInRect,
  randomFloat,
  randomInt,
} from '@utils/math';

describe('Math Utils', () => {
  describe('Vector2 Operations', () => {
    test('createVector2 creates correct vector', () => {
      const vec = createVector2(5, 10);
      expect(vec.x).toBe(5);
      expect(vec.y).toBe(10);
    });

    test('createVector2 defaults to zero', () => {
      const vec = createVector2();
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
    });

    test('distance calculates correctly', () => {
      const a = createVector2(0, 0);
      const b = createVector2(3, 4);
      expect(distance(a, b)).toBe(5);
    });

    test('distanceSquared calculates correctly', () => {
      const a = createVector2(0, 0);
      const b = createVector2(3, 4);
      expect(distanceSquared(a, b)).toBe(25);
    });

    test('normalize creates unit vector', () => {
      const vec = createVector2(3, 4);
      const normalized = normalize(vec);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(magnitude(normalized)).toBeCloseTo(1);
    });

    test('normalize handles zero vector', () => {
      const vec = createVector2(0, 0);
      const normalized = normalize(vec);
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    test('magnitude calculates correctly', () => {
      const vec = createVector2(3, 4);
      expect(magnitude(vec)).toBe(5);
    });

    test('scale multiplies vector', () => {
      const vec = createVector2(2, 3);
      const scaled = scale(vec, 2.5);
      expect(scaled.x).toBe(5);
      expect(scaled.y).toBe(7.5);
    });

    test('add combines vectors', () => {
      const a = createVector2(1, 2);
      const b = createVector2(3, 4);
      const result = add(a, b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    test('subtract calculates difference', () => {
      const a = createVector2(5, 7);
      const b = createVector2(2, 3);
      const result = subtract(a, b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    test('lerp interpolates correctly', () => {
      const a = createVector2(0, 0);
      const b = createVector2(10, 20);
      const mid = lerp(a, b, 0.5);
      expect(mid.x).toBe(5);
      expect(mid.y).toBe(10);
    });
  });

  describe('Utility Functions', () => {
    test('clamp restricts values to range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    test('circleCollision detects collision', () => {
      const pos1 = createVector2(0, 0);
      const pos2 = createVector2(3, 0);
      
      // Overlapping circles
      const collision1 = circleCollision(pos1, 2, pos2, 2);
      expect(collision1.hasCollision).toBe(true);
      
      // Non-overlapping circles
      const collision2 = circleCollision(pos1, 1, pos2, 1);
      expect(collision2.hasCollision).toBe(false);
    });

    test('pointInRect detects point inside rectangle', () => {
      const point = createVector2(5, 5);
      const rectPos = createVector2(0, 0);
      const rectSize = createVector2(10, 10);
      
      expect(pointInRect(point, rectPos, rectSize)).toBe(true);
      
      const outsidePoint = createVector2(15, 5);
      expect(pointInRect(outsidePoint, rectPos, rectSize)).toBe(false);
    });

    test('randomFloat generates value in range', () => {
      const value = randomFloat(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    });

    test('randomInt generates integer in range', () => {
      const value = randomInt(1, 5);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
    });
  });
});