/**
 * Tests for the game engine
 */

import { GameEngine } from '@features/game/GameEngine';
import { GamePhase, GAME_CONFIG } from '../../../types';
import { createVector2 } from '@utils/math';

describe('GameEngine', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
  });

  describe('Initial State', () => {
    test('starts in menu phase', () => {
      const state = gameEngine.getGameState();
      expect(state.phase).toBe(GamePhase.MENU);
    });

    test('has correct initial spinner properties', () => {
      const state = gameEngine.getGameState();
      const { spinner } = state;
      
      expect(spinner.size).toBe(GAME_CONFIG.SPINNER_INITIAL_SIZE);
      expect(spinner.position.x).toBe(GAME_CONFIG.ARENA_WIDTH / 2);
      expect(spinner.position.y).toBe(GAME_CONFIG.ARENA_HEIGHT / 2);
      expect(spinner.spinSpeed).toBe(GAME_CONFIG.SPINNER_INITIAL_SPIN_SPEED);
    });

    test('has empty dots array initially', () => {
      const state = gameEngine.getGameState();
      expect(state.dots).toHaveLength(0);
    });
  });

  describe('Game Flow', () => {
    test('startGame changes phase and spawns dots', () => {
      gameEngine.startGame();
      const state = gameEngine.getGameState();
      
      expect(state.phase).toBe(GamePhase.PLAYING);
      expect(state.dots.length).toBe(GAME_CONFIG.DOT_COUNT);
    });

    test('update does nothing when not playing', () => {
      const initialState = gameEngine.getGameState();
      gameEngine.update(0.016); // ~60fps frame
      const newState = gameEngine.getGameState();
      
      expect(newState).toEqual(initialState);
    });

    test('update advances time when playing', () => {
      gameEngine.startGame();
      const initialTime = gameEngine.getGameState().timeElapsed;
      
      gameEngine.update(1.0); // 1 second
      
      expect(gameEngine.getGameState().timeElapsed).toBeCloseTo(initialTime + 1.0);
    });

    test('resetToMenu changes phase back to menu', () => {
      gameEngine.startGame();
      gameEngine.resetToMenu();
      
      expect(gameEngine.getGameState().phase).toBe(GamePhase.MENU);
    });
  });

  describe('Spinner Movement', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('setSpinnerDirection updates target direction', () => {
      const direction = createVector2(1, 0);
      gameEngine.setSpinnerDirection(direction);
      
      // Direction is internal, but we can test by updating and checking position change
      const initialPos = gameEngine.getGameState().spinner.position;
      gameEngine.update(0.1);
      const newPos = gameEngine.getGameState().spinner.position;
      
      expect(newPos.x).toBeGreaterThan(initialPos.x);
    });

    test('stopSpinner sets direction to zero', () => {
      gameEngine.setSpinnerDirection(createVector2(1, 0));
      gameEngine.update(0.1);
      const posAfterMovement = gameEngine.getGameState().spinner.position;
      
      gameEngine.stopSpinner();
      gameEngine.update(0.5); // Let damping take effect
      const finalPos = gameEngine.getGameState().spinner.position;
      
      // Position should be closer to starting position due to damping
      const centerX = GAME_CONFIG.ARENA_WIDTH / 2;
      expect(Math.abs(finalPos.x - centerX)).toBeLessThan(Math.abs(posAfterMovement.x - centerX));
    });
  });

  describe('Game Over Conditions', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('spinner hitting left edge causes game over', () => {
      // Move spinner to left edge
      const state = gameEngine.getGameState();
      state.spinner.position.x = 0;
      
      gameEngine.update(0.016);
      
      expect(gameEngine.getGameState().phase).toBe(GamePhase.GAME_OVER);
    });

    test('spinner hitting right edge causes game over', () => {
      const state = gameEngine.getGameState();
      state.spinner.position.x = GAME_CONFIG.ARENA_WIDTH;
      
      gameEngine.update(0.016);
      
      expect(gameEngine.getGameState().phase).toBe(GamePhase.GAME_OVER);
    });
  });

  describe('Scoring', () => {
    test('getFinalScore returns current score', () => {
      gameEngine.startGame();
      const score = gameEngine.getFinalScore();
      expect(score).toBe(GAME_CONFIG.SPINNER_INITIAL_SIZE);
    });

    test('getTimeElapsed returns elapsed time', () => {
      gameEngine.startGame();
      gameEngine.update(5.0);
      
      expect(gameEngine.getTimeElapsed()).toBeCloseTo(5.0);
    });
  });

  describe('Dot Management', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('maintains correct number of dots', () => {
      const state = gameEngine.getGameState();
      expect(state.dots.length).toBe(GAME_CONFIG.DOT_COUNT);
    });

    test('dots have valid properties', () => {
      const state = gameEngine.getGameState();
      const dot = state.dots[0];
      
      expect(dot.id).toBeDefined();
      expect(dot.position.x).toBeGreaterThanOrEqual(0);
      expect(dot.position.x).toBeLessThanOrEqual(GAME_CONFIG.ARENA_WIDTH);
      expect(dot.position.y).toBeGreaterThanOrEqual(0);
      expect(dot.position.y).toBeLessThanOrEqual(GAME_CONFIG.ARENA_HEIGHT);
      expect(dot.size).toBeGreaterThanOrEqual(GAME_CONFIG.DOT_MIN_SIZE);
      expect(dot.size).toBeLessThanOrEqual(GAME_CONFIG.DOT_MAX_SIZE);
      expect(dot.value).toBeGreaterThanOrEqual(GAME_CONFIG.DOT_GROWTH_MIN);
      expect(dot.value).toBeLessThanOrEqual(GAME_CONFIG.DOT_GROWTH_MAX);
    });
  });
});