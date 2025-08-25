/**
 * Local storage utilities using AsyncStorage
 * Handles persistent data like high scores and settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HighScore, GameSettings, StorageKeys } from '../types';

/**
 * Default game settings
 */
const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  adRemovalPurchased: false,
};

/**
 * Save high scores to local storage
 * @param scores - Array of high scores
 */
export const saveHighScores = async (scores: HighScore[]): Promise<void> => {
  try {
    const data = JSON.stringify(scores);
    await AsyncStorage.setItem(StorageKeys.HIGH_SCORES, data);
  } catch (error) {
    console.error('Failed to save high scores:', error);
  }
};

/**
 * Load high scores from local storage
 * @returns Array of high scores
 */
export const loadHighScores = async (): Promise<HighScore[]> => {
  try {
    const data = await AsyncStorage.getItem(StorageKeys.HIGH_SCORES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load high scores:', error);
    return [];
  }
};

/**
 * Add a new high score
 * @param newScore - New score to add
 * @param maxScores - Maximum number of scores to keep (default: 10)
 */
export const addHighScore = async (
  newScore: HighScore, 
  maxScores: number = 10
): Promise<HighScore[]> => {
  try {
    const existingScores = await loadHighScores();
    
    // Add new score and sort by score (descending)
    const allScores = [...existingScores, newScore];
    allScores.sort((a, b) => b.score - a.score);
    
    // Keep only top scores
    const topScores = allScores.slice(0, maxScores);
    
    await saveHighScores(topScores);
    return topScores;
  } catch (error) {
    console.error('Failed to add high score:', error);
    return [];
  }
};

/**
 * Check if a score qualifies as a high score
 * @param score - Score to check
 * @param maxScores - Maximum number of high scores to keep
 * @returns True if score is a new high score
 */
export const isHighScore = async (
  score: number, 
  maxScores: number = 10
): Promise<boolean> => {
  try {
    const highScores = await loadHighScores();
    
    // If we have fewer than max scores, it's always a high score
    if (highScores.length < maxScores) {
      return true;
    }
    
    // Check if score is higher than the lowest high score
    const lowestHighScore = highScores[highScores.length - 1];
    return score > lowestHighScore.score;
  } catch (error) {
    console.error('Failed to check high score:', error);
    return false;
  }
};

/**
 * Save game settings to local storage
 * @param settings - Game settings to save
 */
export const saveSettings = async (settings: GameSettings): Promise<void> => {
  try {
    const data = JSON.stringify(settings);
    await AsyncStorage.setItem(StorageKeys.SETTINGS, data);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

/**
 * Load game settings from local storage
 * @returns Game settings
 */
export const loadSettings = async (): Promise<GameSettings> => {
  try {
    const data = await AsyncStorage.getItem(StorageKeys.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Update specific setting
 * @param key - Setting key to update
 * @param value - New value
 */
export const updateSetting = async <K extends keyof GameSettings>(
  key: K, 
  value: GameSettings[K]
): Promise<void> => {
  try {
    const settings = await loadSettings();
    settings[key] = value;
    await saveSettings(settings);
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
};

/**
 * Clear all stored data (for testing/reset)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([StorageKeys.HIGH_SCORES, StorageKeys.SETTINGS]);
    console.log('All data cleared');
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
};

/**
 * Get storage usage info
 * @returns Storage info object
 */
export const getStorageInfo = async (): Promise<{
  highScoreCount: number;
  hasSettings: boolean;
  totalKeys: number;
}> => {
  try {
    const [highScores, settings, allKeys] = await Promise.all([
      loadHighScores(),
      AsyncStorage.getItem(StorageKeys.SETTINGS),
      AsyncStorage.getAllKeys(),
    ]);
    
    return {
      highScoreCount: highScores.length,
      hasSettings: settings !== null,
      totalKeys: allKeys.length,
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return {
      highScoreCount: 0,
      hasSettings: false,
      totalKeys: 0,
    };
  }
};