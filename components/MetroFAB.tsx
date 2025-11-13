import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text } from 'react-native';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '../theme/colors';

interface MetroFABProps {
  onAddPress: () => void;
  onLinkPress: () => void;
  onAddServicePress: () => void;
}

export function MetroFAB({ onAddPress, onLinkPress, onAddServicePress }: MetroFABProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [addAnimation] = useState(new Animated.Value(0));
  const [linkAnimation] = useState(new Animated.Value(0));
  const [serviceAnimation] = useState(new Animated.Value(0));
  const [rotateAnimation] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(addAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(linkAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 100,
      }),
      Animated.spring(serviceAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 50,
      }),
      Animated.spring(rotateAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
    
    setIsExpanded(!isExpanded);
  };

  const handleAddPress = () => {
    toggleExpanded();
    onAddPress();
  };

  const handleLinkPress = () => {
    toggleExpanded();
    onLinkPress();
  };

  const handleAddServicePress = () => {
    toggleExpanded();
    onAddServicePress();
  };

  const addTranslateY = addAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -90],
  });

  const serviceTranslateY = serviceAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -190],
  });

  const linkTranslateY = linkAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -290],
  });

  const addOpacity = addAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const serviceOpacity = serviceAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const linkOpacity = linkAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const rotate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container}>
      {/* Link action - propojit nemovitost */}
      <Animated.View
        style={[
          styles.actionButton,
          styles.linkButton,
          {
            transform: [{ translateY: linkTranslateY }],
            opacity: linkOpacity,
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={handleLinkPress}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="link" size={20} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.actionLabel}>{t('facilities.linkFacility')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Add service action - přidat službu */}
      <Animated.View
        style={[
          styles.actionButton,
          styles.serviceButton,
          {
            transform: [{ translateY: serviceTranslateY }],
            opacity: serviceOpacity,
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={handleAddServicePress}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="construct" size={20} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.actionLabel}>{t('facilities.addService')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Add action - přidat nemovitost */}
      <Animated.View
        style={[
          styles.actionButton,
          styles.addButton,
          {
            transform: [{ translateY: addTranslateY }],
            opacity: addOpacity,
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={handleAddPress}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="home" size={20} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.actionLabel}>{t('facilities.addFacility')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main button */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.mainButtonContent}>
          <Image 
            source={require('../assets/logo_small.png')} 
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Animated.View
            style={[
              styles.plusBadge,
              {
                transform: [{ rotate }],
              },
            ]}
          >
            <Text style={styles.plusText}>+</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Overlay to close when tapping outside */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleExpanded}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 10,
  },
  mainButtonContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
  },
  plusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  plusText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  actionButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    marginBottom: 8,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    width: 130,
    ...shadows.md,
  },
  addButton: {
    // Will be positioned by animation
  },
  linkButton: {
    // Will be positioned by animation
  },
  serviceButton: {
    // Will be positioned by animation
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionLabel: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

