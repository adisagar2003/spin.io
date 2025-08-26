/**
 * Game UI components including menus, overlays, and HUD
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { GamePhase, HighScore, COLORS } from '../types';

interface GameUIProps {
  /** Current game phase */
  gamePhase: GamePhase;
  /** Current score */
  score: number;
  /** Time elapsed in current game */
  timeElapsed: number;
  /** High scores array */
  highScores: HighScore[];
  /** Whether UI should be hidden */
  hidden?: boolean;
  /** Whether ad removal is purchased - COMMENTED OUT */
  // hasAdRemoval: boolean;
  /** Callbacks */
  onStartGame: () => void;
  onStartMultiplayer: () => void;
  onRestartGame: () => void;
  onMainMenu: () => void;
  onShowHighScores: () => void;
  // COMMENTED OUT - WILL IMPLEMENT LATER
  // onPurchaseAdRemoval: () => void;
  // onRestorePurchases: () => void;
}

/**
 * Main game UI component
 * Handles all UI states and overlays
 */
export const GameUI: React.FC<GameUIProps> = ({
  gamePhase,
  score,
  timeElapsed,
  highScores,
  hidden = false,
  // hasAdRemoval,
  onStartGame,
  onStartMultiplayer,
  onRestartGame,
  onMainMenu,
  onShowHighScores,
  // onPurchaseAdRemoval,
  // onRestorePurchases,
}) => {
  const [showHighScores, setShowHighScores] = useState(false);
  // COMMENTED OUT - WILL IMPLEMENT LATER
  // const [showPurchase, setShowPurchase] = useState(false);
  // const [purchaseLoading, setPurchaseLoading] = useState(false);

  const handleShowHighScores = useCallback(() => {
    setShowHighScores(true);
    onShowHighScores();
  }, [onShowHighScores]);

  // COMMENTED OUT - WILL IMPLEMENT LATER
  /*
  const handlePurchase = useCallback(async () => {
    setPurchaseLoading(true);
    setShowPurchase(false);
    
    try {
      await onPurchaseAdRemoval();
    } finally {
      setPurchaseLoading(false);
    }
  }, [onPurchaseAdRemoval]);

  const handleRestore = useCallback(async () => {
    setPurchaseLoading(true);
    
    try {
      await onRestorePurchases();
    } finally {
      setPurchaseLoading(false);
    }
  }, [onRestorePurchases]);
  */

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Allow game over screen to show even when UI is hidden
  if (hidden && gamePhase !== GamePhase.GAME_OVER) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* When UI is hidden, only show game over screen */}
      {hidden ? (
        <>
          {gamePhase === GamePhase.GAME_OVER && (
            <GameOverScreen
              finalScore={score}
              timeElapsed={timeElapsed}
              highScores={highScores}
              onRestartGame={onRestartGame}
              onMainMenu={onMainMenu}
              onShowHighScores={handleShowHighScores}
            />
          )}
          <HighScoresModal
            visible={showHighScores}
            highScores={highScores}
            onClose={() => setShowHighScores(false)}
          />
        </>
      ) : (
        <>
          {gamePhase === GamePhase.PLAYING && (
            <GameHUD score={score} timeElapsed={timeElapsed} />
          )}
          
          {/* Keyboard controls hint for web (subtle overlay) */}
          {gamePhase === GamePhase.PLAYING && Platform.OS === 'web' && (
            <View style={styles.keyboardHint}>
              <Text style={styles.keyboardHintText}>WASD</Text>
            </View>
          )}

          {gamePhase === GamePhase.MENU && (
            <MainMenu
              onStartGame={onStartGame}
              onShowHighScores={handleShowHighScores}
            />
          )}

          {gamePhase === GamePhase.GAME_OVER && (
            <GameOverScreen
              finalScore={score}
              timeElapsed={timeElapsed}
              highScores={highScores}
              onRestartGame={onRestartGame}
              onMainMenu={onMainMenu}
              onShowHighScores={handleShowHighScores}
            />
          )}

          <HighScoresModal
            visible={showHighScores}
            highScores={highScores}
            onClose={() => setShowHighScores(false)}
          />
        </>
      )}
    </View>
  );
};

/**
 * Game HUD component showing score and time
 */
const GameHUD: React.FC<{ score: number; timeElapsed: number }> = React.memo(({
  score,
  timeElapsed
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.hud}>
      <View style={styles.hudLeft}>
        <Text style={styles.hudLabel}>SIZE</Text>
        <Text style={styles.hudValue}>{Math.floor(score)}</Text>
      </View>
      <View style={styles.hudRight}>
        <Text style={styles.hudLabel}>TIME</Text>
        <Text style={styles.hudValue}>{formatTime(timeElapsed)}</Text>
      </View>
    </View>
  );
});

GameHUD.displayName = 'GameHUD';

/**
 * Main menu component
 */
const MainMenu: React.FC<{
  onStartGame: () => void;
  onShowHighScores: () => void;
  // onShowPurchase: () => void;
  // hasAdRemoval: boolean;
}> = ({ onStartGame, onShowHighScores /*, onShowPurchase, hasAdRemoval*/ }) => (
  <View style={styles.menu}>
    <Text style={styles.title}>GoGoGoGo</Text>
    <Text style={styles.subtitle}>Fidget Spinner Chaos</Text>
    
    <View style={styles.menuButtons}>
      <MenuButton title="SINGLE PLAYER" onPress={onStartGame} primary />
      <MenuButton title="MULTIPLAYER" onPress={onStartMultiplayer} />
      <MenuButton title="HIGH SCORES" onPress={onShowHighScores} />
      
      {/* COMMENTED OUT - WILL IMPLEMENT LATER */}
      {/*
      {!hasAdRemoval && (
        <MenuButton 
          title="REMOVE ADS - $2.99" 
          onPress={onShowPurchase}
          style={styles.purchaseButton}
        />
      )}
      */}
    </View>
    
    <Text style={styles.instructions}>
      {Platform.OS === 'web' ? (
        <>
          Use WASD keys or touch and drag to steer!{'\n'}
          Collect yellow dots to grow larger.{'\n'}
          Avoid the arena edges!
        </>
      ) : (
        <>
          Touch and drag to steer your fidget spinner!{'\n'}
          Collect yellow dots to grow larger.{'\n'}
          Avoid the arena edges!
        </>
      )}
    </Text>
  </View>
);

/**
 * Game over screen component
 */
const GameOverScreen: React.FC<{
  finalScore: number;
  timeElapsed: number;
  highScores: HighScore[];
  onRestartGame: () => void;
  onMainMenu: () => void;
  onShowHighScores: () => void;
}> = ({ finalScore, timeElapsed, highScores, onRestartGame, onMainMenu, onShowHighScores }) => {
  const isNewHighScore = highScores.length > 0 && finalScore > highScores[highScores.length - 1].score;
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.gameOver}>
      <View style={styles.gameOverContent}>
        <Text style={styles.gameOverTitle}>GAME OVER</Text>
        
        {isNewHighScore && (
          <Text style={styles.newHighScore}>🎉 NEW HIGH SCORE! 🎉</Text>
        )}
        
        <View style={styles.finalStats}>
          <Text style={styles.finalScore}>Final Size: {Math.floor(finalScore)}</Text>
          <Text style={styles.finalTime}>Time: {formatTime(timeElapsed)}</Text>
        </View>
        
        <View style={styles.gameOverButtons}>
          <MenuButton title="PLAY AGAIN" onPress={onRestartGame} primary />
          <MenuButton 
            title="MAIN MENU" 
            onPress={() => {
              console.log('🏠 Main Menu button pressed in GameOverScreen');
              onMainMenu();
            }} 
          />
          <MenuButton title="HIGH SCORES" onPress={onShowHighScores} />
        </View>
      </View>
    </View>
  );
};

/**
 * Reusable menu button component
 */
const MenuButton: React.FC<{
  title: string;
  onPress: () => void;
  primary?: boolean;
  style?: any;
}> = ({ title, onPress, primary = false, style }) => (
  <TouchableOpacity
    style={[
      styles.menuButton,
      primary && styles.primaryButton,
      style
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.menuButtonText, primary && styles.primaryButtonText]}>
      {title}
    </Text>
  </TouchableOpacity>
);

/**
 * High scores modal
 */
const HighScoresModal: React.FC<{
  visible: boolean;
  highScores: HighScore[];
  onClose: () => void;
}> = ({ visible, highScores, onClose }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>HIGH SCORES</Text>
        
        <ScrollView style={styles.scoreList}>
          {highScores.length > 0 ? (
            highScores.map((score, index) => (
              <View key={index} style={styles.scoreItem}>
                <Text style={styles.scoreRank}>#{index + 1}</Text>
                <Text style={styles.scoreValue}>{Math.floor(score.score)}</Text>
                <Text style={styles.scoreDate}>
                  {new Date(score.date).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noScores}>No high scores yet!</Text>
          )}
        </ScrollView>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

/**
 * Purchase modal - COMMENTED OUT - WILL IMPLEMENT LATER
 */
/*
const PurchaseModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  loading: boolean;
}> = ({ visible, onClose, onPurchase, onRestore, loading }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>REMOVE ADS</Text>
        
        <Text style={styles.purchaseDescription}>
          Remove all advertisements and support the game development!
        </Text>
        
        <Text style={styles.purchasePrice}>$2.99</Text>
        
        <View style={styles.purchaseButtons}>
          <TouchableOpacity 
            style={styles.purchaseButton} 
            onPress={onPurchase}
            disabled={loading}
          >
            <Text style={styles.purchaseButtonText}>PURCHASE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.restoreButton} 
            onPress={onRestore}
            disabled={loading}
          >
            <Text style={styles.restoreButtonText}>RESTORE</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
*/

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  
  // HUD Styles
  hud: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  hudLeft: {
    alignItems: 'flex-start',
  },
  hudRight: {
    alignItems: 'flex-end',
  },
  hudLabel: {
    color: COLORS.UI_TEXT,
    fontSize: 12,
    opacity: 0.8,
    fontWeight: 'bold',
  },
  hudValue: {
    color: COLORS.UI_TEXT,
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Menu Styles
  menu: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.SPINNER,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,255,136,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.UI_TEXT,
    textAlign: 'center',
    marginBottom: 50,
    opacity: 0.8,
  },
  menuButtons: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  menuButton: {
    backgroundColor: COLORS.UI_BUTTON,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginVertical: 8,
    minWidth: 200,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  primaryButton: {
    backgroundColor: COLORS.SPINNER,
    borderColor: COLORS.SPINNER,
  },
  menuButtonText: {
    color: COLORS.UI_BUTTON_TEXT,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  primaryButtonText: {
    color: COLORS.BACKGROUND,
  },
  purchaseButton: {
    backgroundColor: COLORS.DOT,
    borderColor: COLORS.DOT,
  },
  instructions: {
    color: COLORS.UI_TEXT,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },
  
  // Game Over Styles
  gameOver: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it appears above canvas
    pointerEvents: 'auto', // Enable touch events
  },
  gameOverContent: {
    backgroundColor: COLORS.UI_BUTTON,
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 30,
    maxWidth: '90%',
    alignItems: 'center',
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  newHighScore: {
    fontSize: 20,
    color: COLORS.DOT,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  finalStats: {
    alignItems: 'center',
    marginBottom: 40,
  },
  finalScore: {
    fontSize: 28,
    color: COLORS.UI_TEXT,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  finalTime: {
    fontSize: 18,
    color: COLORS.UI_TEXT,
    opacity: 0.8,
  },
  gameOverButtons: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.UI_BUTTON,
    borderRadius: 20,
    padding: 30,
    minWidth: 300,
    maxWidth: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.UI_TEXT,
    marginBottom: 20,
  },
  
  // High Scores Modal
  scoreList: {
    maxHeight: 300,
    width: '100%',
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  scoreRank: {
    color: COLORS.UI_TEXT,
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  scoreValue: {
    color: COLORS.SPINNER,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scoreDate: {
    color: COLORS.UI_TEXT,
    fontSize: 12,
    opacity: 0.7,
    width: 80,
    textAlign: 'right',
  },
  noScores: {
    color: COLORS.UI_TEXT,
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
    paddingVertical: 40,
  },
  
  // Purchase Modal
  purchaseDescription: {
    color: COLORS.UI_TEXT,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  purchasePrice: {
    color: COLORS.DOT,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  purchaseButtons: {
    width: '100%',
    marginBottom: 20,
  },
  purchaseButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.UI_TEXT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  restoreButtonText: {
    color: COLORS.UI_TEXT,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Common
  closeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: COLORS.UI_TEXT,
    fontSize: 16,
    opacity: 0.7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.UI_TEXT,
    fontSize: 16,
    marginTop: 10,
  },
  
  // Keyboard Hint Styles
  keyboardHint: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  keyboardHintText: {
    color: COLORS.UI_TEXT,
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
    textAlign: 'center',
  },
});