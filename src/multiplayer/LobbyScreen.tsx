/**
 * Lobby screen for multiplayer room management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { NetworkManager, MultiplayerPlayerData, RoomState } from './NetworkManager';

interface LobbyScreenProps {
  networkManager: NetworkManager;
  onGameStarted: () => void;
  onBackToMainMenu?: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ 
  networkManager, 
  onGameStarted,
  onBackToMainMenu 
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Set up network event listeners
    const handleRoomCreated = (data: { roomCode: string; playerId: string }) => {
      console.log('Room created:', data.roomCode);
      setIsConnecting(false);
    };

    const handleRoomJoined = (data: { roomCode: string; playerId: string; players: MultiplayerPlayerData[] }) => {
      console.log('Joined room:', data.roomCode);
      setIsConnecting(false);
      setCurrentRoom({
        roomCode: data.roomCode,
        players: data.players,
        isPlaying: false,
        phase: 'lobby' as any
      });
    };

    const handleRoomState = (data: RoomState) => {
      setCurrentRoom(data);
    };

    const handlePlayerJoined = (data: { player: MultiplayerPlayerData }) => {
      setCurrentRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          players: [...prev.players, data.player]
        };
      });
    };

    const handlePlayerLeft = (data: { playerId: string }) => {
      setCurrentRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.filter(p => p.id !== data.playerId)
        };
      });
    };

    const handleGameStarted = () => {
      console.log('Game started!');
      onGameStarted();
    };

    const handleError = (data: { message: string }) => {
      Alert.alert('Error', data.message);
      setIsConnecting(false);
    };

    networkManager.on('ROOM_CREATED', handleRoomCreated);
    networkManager.on('ROOM_JOINED', handleRoomJoined);
    networkManager.on('ROOM_STATE', handleRoomState);
    networkManager.on('PLAYER_JOINED', handlePlayerJoined);
    networkManager.on('PLAYER_LEFT', handlePlayerLeft);
    networkManager.on('GAME_STARTED', handleGameStarted);
    networkManager.on('ERROR', handleError);

    return () => {
      networkManager.off('ROOM_CREATED', handleRoomCreated);
      networkManager.off('ROOM_JOINED', handleRoomJoined);
      networkManager.off('ROOM_STATE', handleRoomState);
      networkManager.off('PLAYER_JOINED', handlePlayerJoined);
      networkManager.off('PLAYER_LEFT', handlePlayerLeft);
      networkManager.off('GAME_STARTED', handleGameStarted);
      networkManager.off('ERROR', handleError);
    };
  }, [networkManager, onGameStarted]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsConnecting(true);
    networkManager.createRoom(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit room code');
      return;
    }

    setIsConnecting(true);
    networkManager.joinRoom(roomCode.trim(), playerName.trim());
  };

  const handleStartGame = () => {
    networkManager.startGame();
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    networkManager.disconnect();
    // Reconnect for new session
    networkManager.connect().catch(console.error);
  };

  if (currentRoom) {
    // In room - show lobby
    const currentPlayer = currentRoom.players.find(p => p.isHost);
    const isHost = currentPlayer?.isHost || false;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Room: {currentRoom.roomCode}</Text>
        
        <Text style={styles.subtitle}>Players ({currentRoom.players.length}/4):</Text>
        
        {currentRoom.players.map((player, index) => (
          <View key={player.id} style={styles.playerItem}>
            <Text style={styles.playerName}>
              {player.name} {player.isHost ? '👑' : ''}
            </Text>
          </View>
        ))}

        {isHost && currentRoom.players.length >= 2 && (
          <TouchableOpacity 
            style={styles.button}
            onPress={handleStartGame}
          >
            <Text style={styles.buttonText}>START GAME</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.leaveButton}
          onPress={handleLeaveRoom}
        >
          <Text style={styles.buttonText}>LEAVE ROOM</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Not in room - show join/create options
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Multiplayer Lobby</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={playerName}
        onChangeText={setPlayerName}
        maxLength={20}
      />

      <TouchableOpacity 
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={handleCreateRoom}
        disabled={isConnecting}
      >
        <Text style={styles.buttonText}>
          {isConnecting ? 'CREATING...' : 'CREATE ROOM'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TextInput
        style={styles.input}
        placeholder="Enter room code"
        value={roomCode}
        onChangeText={setRoomCode}
        maxLength={4}
        keyboardType="numeric"
      />

      <TouchableOpacity 
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={handleJoinRoom}
        disabled={isConnecting}
      >
        <Text style={styles.buttonText}>
          {isConnecting ? 'JOINING...' : 'JOIN ROOM'}
        </Text>
      </TouchableOpacity>

      {onBackToMainMenu && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBackToMainMenu}
        >
          <Text style={styles.buttonText}>BACK TO MAIN MENU</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#333',
    color: '#FFF',
    paddingHorizontal: 15,
    marginBottom: 15,
    borderRadius: 5,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaveButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 20,
  },
  backButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  playerItem: {
    width: '100%',
    padding: 10,
    backgroundColor: '#222',
    marginBottom: 5,
    borderRadius: 5,
  },
  playerName: {
    color: '#FFF',
    fontSize: 16,
  },
});