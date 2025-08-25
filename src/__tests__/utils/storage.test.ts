/**
 * Tests for storage utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveHighScores,
  loadHighScores,
  addHighScore,
  isHighScore,
  saveSettings,
  loadSettings,
  updateSetting,
  clearAllData,
} from '@utils/storage';
import { HighScore, StorageKeys } from '@types';

// Mock AsyncStorage
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Storage Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('High Scores', () => {
    const sampleScores: HighScore[] = [
      { score: 100, date: '2024-01-01', timeElapsed: 120 },
      { score: 80, date: '2024-01-02', timeElapsed: 90 },
      { score: 60, date: '2024-01-03', timeElapsed: 60 },
    ];

    test('saveHighScores stores data correctly', async () => {
      await saveHighScores(sampleScores);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        StorageKeys.HIGH_SCORES,
        JSON.stringify(sampleScores)
      );
    });

    test('loadHighScores retrieves data correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sampleScores));
      
      const scores = await loadHighScores();
      
      expect(scores).toEqual(sampleScores);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(StorageKeys.HIGH_SCORES);
    });

    test('loadHighScores returns empty array when no data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const scores = await loadHighScores();
      
      expect(scores).toEqual([]);
    });

    test('addHighScore inserts and sorts correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sampleScores));
      
      const newScore: HighScore = { score: 90, date: '2024-01-04', timeElapsed: 75 };
      const result = await addHighScore(newScore);
      
      expect(result).toHaveLength(4);
      expect(result[0].score).toBe(100); // Highest score first
      expect(result[1].score).toBe(90);  // New score in correct position
      expect(result[2].score).toBe(80);
      expect(result[3].score).toBe(60);
    });

    test('addHighScore limits to max scores', async () => {
      const manyScores = Array.from({ length: 15 }, (_, i) => ({
        score: i * 10,
        date: `2024-01-${i + 1}`,
        timeElapsed: 60,
      }));
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(manyScores));
      
      const newScore: HighScore = { score: 200, date: '2024-02-01', timeElapsed: 120 };
      const result = await addHighScore(newScore, 10);
      
      expect(result).toHaveLength(10);
      expect(result[0].score).toBe(200);
    });

    test('isHighScore correctly identifies high scores', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sampleScores));
      
      expect(await isHighScore(150)).toBe(true);  // Higher than highest
      expect(await isHighScore(70)).toBe(true);   // Middle score
      expect(await isHighScore(50)).toBe(false);  // Lower than lowest
    });

    test('isHighScore returns true when fewer than max scores', async () => {
      const fewScores = sampleScores.slice(0, 2);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(fewScores));
      
      expect(await isHighScore(10, 10)).toBe(true);
    });
  });

  describe('Settings', () => {
    test('saveSettings stores settings correctly', async () => {
      const settings = {
        soundEnabled: true,
        vibrationEnabled: false,
        adRemovalPurchased: true,
      };
      
      await saveSettings(settings);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        StorageKeys.SETTINGS,
        JSON.stringify(settings)
      );
    });

    test('loadSettings retrieves settings correctly', async () => {
      const settings = {
        soundEnabled: false,
        vibrationEnabled: true,
        adRemovalPurchased: false,
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));
      
      const result = await loadSettings();
      
      expect(result).toEqual(settings);
    });

    test('loadSettings returns defaults when no data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await loadSettings();
      
      expect(result.soundEnabled).toBe(true);
      expect(result.vibrationEnabled).toBe(true);
      expect(result.adRemovalPurchased).toBe(false);
    });

    test('updateSetting modifies specific setting', async () => {
      const existingSettings = {
        soundEnabled: true,
        vibrationEnabled: true,
        adRemovalPurchased: false,
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));
      
      await updateSetting('soundEnabled', false);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        StorageKeys.SETTINGS,
        JSON.stringify({
          ...existingSettings,
          soundEnabled: false,
        })
      );
    });
  });

  describe('Data Management', () => {
    test('clearAllData removes all stored data', async () => {
      await clearAllData();
      
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        StorageKeys.HIGH_SCORES,
        StorageKeys.SETTINGS,
      ]);
    });
  });

  describe('Error Handling', () => {
    test('handles storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw, should return defaults
      const scores = await loadHighScores();
      expect(scores).toEqual([]);
      
      const settings = await loadSettings();
      expect(settings.soundEnabled).toBe(true);
    });

    test('handles save errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      await expect(saveHighScores([])).resolves.toBeUndefined();
      await expect(saveSettings({ soundEnabled: true, vibrationEnabled: true, adRemovalPurchased: false })).resolves.toBeUndefined();
    });
  });
});