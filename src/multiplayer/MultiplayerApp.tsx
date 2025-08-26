/**
 * Main multiplayer app component
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { NetworkManager, MultiplayerPlayerData } from './NetworkManager';
import { LobbyScreen } from './LobbyScreen';
import { MultiplayerGameContainer } from './MultiplayerGameContainer';

type AppState = 'connecting' | 'lobby' | 'playing' | 'game_over';

interface MultiplayerAppProps {
  onReturnToMainMenu?: () => void;
}

export const MultiplayerApp: React.FC<MultiplayerAppProps> = ({ 
  onReturnToMainMenu 
}) => {
  const [appState, setAppState] = useState<AppState>('connecting');
  const [winner, setWinner] = useState<MultiplayerPlayerData | null>(null);
  const networkManager = useRef(new NetworkManager());

  useEffect(() => {
    // Connect to server on app start
    const connectToServer = async () => {
      try {
        console.log('🔗 Connecting to multiplayer server...');
        await networkManager.current.connect();
        console.log('✅ Connected successfully');
        setAppState('lobby');
      } catch (error) {
        console.error('❌ Failed to connect:', error);
        Alert.alert(
          'Connection Failed',
          'Could not connect to the multiplayer server. Please check if the server is running.',
          [
            { text: 'Back to Menu', onPress: () => onReturnToMainMenu?.() },
            { text: 'Retry', onPress: connectToServer }
          ]
        );
      }
    };

    connectToServer();

    // Cleanup on unmount
    return () => {
      networkManager.current.disconnect();
    };
  }, []);

  const handleGameStarted = () => {
    console.log('🎮 Game started, switching to playing state');
    setAppState('playing');
  };

  const handleGameOver = (gameWinner: MultiplayerPlayerData | null) => {
    console.log('🏁 Game over, winner:', gameWinner?.name || 'None');
    setWinner(gameWinner);
    setAppState('game_over');
  };

  const handleReturnToLobby = () => {
    console.log('🏠 Returning to lobby');
    setWinner(null);
    setAppState('lobby');
  };

  const handleBackToMainMenu = () => {
    console.log('🏠 Returning to main menu');
    networkManager.current.disconnect();
    onReturnToMainMenu?.();
  };

  const renderCurrentScreen = () => {
    switch (appState) {
      case 'connecting':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.title}>Connecting to Server...</Text>
          </View>
        );

      case 'lobby':
        return (
          <LobbyScreen
            networkManager={networkManager.current}
            onGameStarted={handleGameStarted}
            onBackToMainMenu={handleBackToMainMenu}
          />
        );

      case 'playing':
        return (
          <MultiplayerGameContainer
            networkManager={networkManager.current}
            onGameOver={handleGameOver}
            onReturnToLobby={handleReturnToLobby}
          />
        );

      case 'game_over':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.title}>Game Over!</Text>
            {winner ? (
              <Text style={styles.winnerText}>Winner: {winner.name}</Text>
            ) : (
              <Text style={styles.winnerText}>No Winner</Text>
            )}
            <Text style={styles.subtitle}>Returning to lobby...</Text>
          </View>
        );

      default:
        return null;
    }
  };

  // Auto return to lobby after game over
  useEffect(() => {
    if (appState === 'game_over') {
      const timer = setTimeout(() => {
        handleReturnToLobby();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [appState]);

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    marginTop: 20,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});