import React from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeleteButtonProps {
  onDelete: () => void;
  size?: number;
  style?: any;
  confirmationTitle?: string;
  confirmationMessage?: string;
}

export function DeleteButton({ 
  onDelete, 
  size = 14, 
  style,
  confirmationTitle = 'Smazat',
  confirmationMessage = 'Opravdu chcete smazat tuto položku?'
}: DeleteButtonProps) {
  const handlePress = () => {
    Alert.alert(
      confirmationTitle,
      confirmationMessage,
      [
        {
          text: 'Zrušit',
          style: 'cancel',
        },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.button, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="trash" size={size} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#0009',
    borderRadius: 12,
    padding: 4,
  },
});

