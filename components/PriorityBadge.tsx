import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight } from '../theme/colors';

export type PriorityType = 'idea' | 'normal' | 'high' | 'critical' | 'urgent';
type LegacyPriorityType = 'low' | 'medium' | PriorityType;

interface PriorityBadgeProps {
  priority: LegacyPriorityType | string;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onPress?: () => void;
}

// Map old priority values to new ones
const mapLegacyPriority = (priority: string): PriorityType => {
  if (!priority) return 'normal';
  
  // Normalize to lowercase for comparison
  const normalized = priority.toLowerCase().trim();
  
  // If it's already a valid new priority value, return it as is
  const validPriorities: PriorityType[] = ['idea', 'normal', 'high', 'critical', 'urgent'];
  if (validPriorities.includes(normalized as PriorityType)) {
    return normalized as PriorityType;
  }
  
  // Map legacy values to new ones
  const mapping: Record<string, PriorityType> = {
    'low': 'idea',
    'medium': 'normal',
    'high': 'high',
    'urgent': 'urgent',
  };
  return mapping[normalized] || 'normal';
};

const priorityConfig: Record<PriorityType, { color: string; icon: string; label: string }> = {
  idea: {
    color: '#FFD700', // Gold/Yellow for idea
    icon: 'bulb-outline',
    label: 'Nápad',
  },
  normal: {
    color: '#81C784', // Green
    icon: 'chatbubble-outline',
    label: 'Normální',
  },
  high: {
    color: '#FFB74D', // Orange
    icon: 'chatbubble-outline',
    label: 'Vysoká',
  },
  critical: {
    color: '#EF5350', // Red
    icon: 'chatbubble-outline',
    label: 'Kritická',
  },
  urgent: {
    color: '#C62828', // Dark red
    icon: 'ban-outline',
    label: 'Urgentní',
  },
};

export function PriorityBadge({ priority, showText = true, size = 'medium', showTooltip = false, onPress }: PriorityBadgeProps) {
  // Map legacy priority values to new ones
  const normalizedPriority = mapLegacyPriority(priority);
  const config = priorityConfig[normalizedPriority] || priorityConfig.normal;
  
  // Base icon sizes
  const baseIconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  // For idea and urgent, increase icon size by 20%
  const isIconOnlyPriority = normalizedPriority === 'idea' || normalizedPriority === 'urgent';
  const iconSize = isIconOnlyPriority ? Math.round(baseIconSize * 1.2) : baseIconSize;
  
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  // For normal, high, critical - show exclamation marks in bubble
  const getExclamationMarks = () => {
    if (normalizedPriority === 'normal') return '!';
    if (normalizedPriority === 'high') return '!!';
    if (normalizedPriority === 'critical') return '!!!';
    return null;
  };

  const exclamationMarks = getExclamationMarks();
  const isBubble = normalizedPriority === 'normal' || normalizedPriority === 'high' || normalizedPriority === 'critical';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (showTooltip) {
      Alert.alert('Priorita', config.label);
    }
  };

  // If showText is false, show only the icon without badge container
  if (!showText) {
    const iconContent = isBubble ? (
      <View style={[styles.iconOnly, { borderColor: config.color }]}>
        <Text style={[styles.exclamationTextIconOnly, { color: config.color }]}>
          {exclamationMarks}
        </Text>
      </View>
    ) : (
      <Ionicons name={config.icon as any} size={iconSize} color={config.color} />
    );

    if (onPress || showTooltip) {
      return (
        <TouchableOpacity onPress={handlePress} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
          {iconContent}
        </TouchableOpacity>
      );
    }
    return iconContent;
  }

  // Full badge with text
  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      {isBubble ? (
        <View style={[styles.bubble, { borderColor: '#fff' }]}>
          <Text style={styles.exclamationText}>
            {exclamationMarks}
          </Text>
        </View>
      ) : (
        <Ionicons name={config.icon as any} size={iconSize} color="#fff" />
      )}
      <Text style={[styles.badgeText, { fontSize }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
  bubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  exclamationText: {
    color: '#fff',
    fontWeight: fontWeight.bold,
    fontSize: 12,
    lineHeight: 14,
  },
  iconOnly: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  exclamationTextIconOnly: {
    fontWeight: fontWeight.bold,
    fontSize: 10,
    lineHeight: 12,
  },
});

