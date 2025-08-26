/**
 * Main App component for GoGoGoGo fidget spinner game
 * Orchestrates game state, UI, and services
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import { GameContainerWithRef } from './src/features/game/GameContainer';
import { GameUI } from './src/components/GameUI';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { 
  GameState, 
  GamePhase, 
  HighScore, 
  GameSettings, 
  COLORS 
} from './src/types';
import { GameEngineRef } from './src/types/game-refs';
import { GameContainerRef } from './src/features/game/GameContainer';
import {
  loadHighScores,
  addHighScore,
  loadSettings,
  updateSetting,
} from './src/utils/storage';
import { handleError, safeAsync } from './src/utils/error-handler';
// COMMENTED OUT - WILL IMPLEMENT LATER
/*
import {
  initializePurchases,
  getCustomerInfo,
  mockPurchaseAdRemoval,
  restorePurchases,
} from './src/utils/purchases';
*/

/**
 * Main application component
 */
export default function App(): JSX.Element {
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUIHidden, setIsUIHidden] = useState(false);

  // Refs for game container control
  const gameContainerRef = useRef<GameContainerRef>(null);

  /**
   * Initialize app services and load data
   */
  const initializeApp = useCallback(async () => {
    try {
      // Initialize RevenueCat (non-blocking) - COMMENTED OUT
      /*
      safeAsync(
        () => initializePurchases(),
        { component: 'App', action: 'initializePurchases' }
      );
      */

      // Load saved data
      const [savedHighScores, savedSettings] = await Promise.all([
        safeAsync(
          () => loadHighScores(),
          { component: 'App', action: 'loadHighScores' },
          []
        ),
        safeAsync(
          () => loadSettings(),
          { component: 'App', action: 'loadSettings' },
          { soundEnabled: true, vibrationEnabled: true, adRemovalPurchased: false }
        ),
      ]);

      setHighScores(savedHighScores || []);
      setSettings(savedSettings || { soundEnabled: true, vibrationEnabled: true, adRemovalPurchased: false });

      // Check purchase status - COMMENTED OUT
      /*
      const customerInfo = await safeAsync(
        () => getCustomerInfo(),
        { component: 'App', action: 'getCustomerInfo' }
      );
      
      if (customerInfo && savedSettings) {
        const { hasAdRemoval } = customerInfo;
        if (hasAdRemoval !== savedSettings.adRemovalPurchased) {
          await safeAsync(
            () => updateSetting('adRemovalPurchased', hasAdRemoval),
            { component: 'App', action: 'updateSetting' }
          );
          setSettings(prev => prev ? { ...prev, adRemovalPurchased: hasAdRemoval } : null);
        }
      }
      */

      setIsInitialized(true);
    } catch (error) {
      handleError(error, { component: 'App', action: 'initializeApp' }, false);
      setIsInitialized(true); // Still show the app
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  /**
   * Handles game state changes
   */
  const handleGameStateChange = useCallback((newGameState: GameState) => {
    setGameState(newGameState);
  }, []);

  /**
   * Handles score changes during gameplay
   */
  const handleScoreChange = useCallback((score: number) => {
    // Could add score-based achievements or effects here
  }, []);

  /**
   * Handles game end and high score processing
   */
  const handleGameEnd = useCallback(async (finalScore: number, timeElapsed: number) => {
    const newScore: HighScore = {
      score: finalScore,
      date: new Date().toISOString(),
      timeElapsed,
    };

    try {
      const updatedHighScores = await addHighScore(newScore);
      setHighScores(updatedHighScores);
    } catch (error) {
      console.error('Failed to save high score:', error);
    }
  }, []);

  // Game engine ref to control game directly
  const gameEngineRef = useRef<GameEngineRef>(null);

  /**
   * Starts a new game
   */
  const startGame = useCallback(() => {
    console.log('📱 App.startGame() called');
    // Hide the UI
    setIsUIHidden(true);
    // Actually start the game engine via GameContainer
    gameContainerRef.current?.startGame();
  }, []);

  /**
   * Restarts the current game
   */
  const restartGame = useCallback(() => {
    console.log('🔄 App.restartGame() called');
    // Use proper restart method that handles state machine flow
    gameContainerRef.current?.restartGame();
  }, []);

  /**
   * Shows high scores (handled by UI state)
   */
  const showHighScores = useCallback(() => {
    // High scores modal is handled by GameUI component
  }, []);

  /**
   * Handles ad removal purchase - COMMENTED OUT
   */
  /*
  const handlePurchaseAdRemoval = useCallback(async () => {
    try {
      // For demo purposes, use mock purchase
      // In production, replace with: const result = await purchaseProduct('ad_removal');
      const result = await mockPurchaseAdRemoval();
      
      if (result.success && result.hasAdRemoval) {
        await updateSetting('adRemovalPurchased', true);
        setSettings(prev => prev ? { ...prev, adRemovalPurchased: true } : null);
        
        Alert.alert(
          'Purchase Successful!',
          'Ads have been removed. Thank you for your support!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Purchase Failed',
          'The purchase could not be completed. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Error',
        'An error occurred during purchase. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, []);
  */

  /**
   * Handles purchase restoration - COMMENTED OUT
   */
  /*
  const handleRestorePurchases = useCallback(async () => {
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        await updateSetting('adRemovalPurchased', result.hasAdRemoval);
        setSettings(prev => prev ? { ...prev, adRemovalPurchased: result.hasAdRemoval } : null);
        
        if (result.hasAdRemoval) {
          Alert.alert(
            'Restore Successful!',
            'Your ad removal purchase has been restored.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'No Purchases Found',
            'No previous purchases were found to restore.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Restore Failed',
          result.error || 'Could not restore purchases.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert(
        'Restore Error',
        'An error occurred while restoring purchases.',
        [{ text: 'OK' }]
      );
    }
  }, []);
  */

  // Don't render until initialized
  if (!isInitialized || !settings) {
    return <View style={styles.loading} />;
  }

  return (
    <ErrorBoundary>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />
      
      <View style={styles.container}>
        {/* Game Container */}
        <GameContainerWithRef
          ref={gameContainerRef}
          onGameStateChange={handleGameStateChange}
          onScoreChange={handleScoreChange}
          onGameEnd={handleGameEnd}
        />

        {/* Game UI Overlay */}
        <GameUI
          gamePhase={gameState?.phase || GamePhase.MENU}
          score={gameState?.score || 0}
          timeElapsed={gameState?.timeElapsed || 0}
          highScores={highScores}
          hidden={isUIHidden}
          // hasAdRemoval={settings.adRemovalPurchased}
          onStartGame={startGame}
          onRestartGame={restartGame}
          onShowHighScores={showHighScores}
          // onPurchaseAdRemoval={handlePurchaseAdRemoval}
          // onRestorePurchases={handleRestorePurchases}
        />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loading: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
});