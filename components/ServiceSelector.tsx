import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { Service } from '../types/database';

interface ServiceSelectorProps {
  services: Service[];
  selectedServiceIds: string[];
  onToggle: (serviceId: string) => void;
  disabledServiceIds?: string[];
}

const serviceIcons: Record<string, string> = {
  'Instalatérství': 'water-outline',
  'Elektrikář': 'flash-outline',
  'Zedník': 'hammer-outline',
  'Malíř': 'brush-outline',
  'Truhlář': 'cube-outline',
  'Sklenář': 'albums-outline',
  'Zámečník': 'lock-closed-outline',
  'Obkladač': 'grid-outline',
  'Podlahář': 'layers-outline',
  'Topenář': 'flame-outline',
  'Klimatizace': 'snow-outline',
  'Revize elektro': 'checkmark-circle-outline',
  'Revize plyn': 'checkmark-circle-outline',
  'Tesař': 'home-outline',
  'Klempíř': 'construct-outline',
  'Zahradník': 'leaf-outline',
  'Úklid': 'sparkles-outline',
  'Skládka': 'trash-outline',
};

export function ServiceSelector({ services, selectedServiceIds, onToggle, disabledServiceIds = [] }: ServiceSelectorProps) {
  const getIcon = (serviceName: string) => {
    return serviceIcons[serviceName] || 'build-outline';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {services.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);
          const isDisabled = disabledServiceIds.includes(service.id);
          return (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                isSelected && styles.serviceCardSelected,
                isDisabled && styles.serviceCardDisabled
              ]}
              onPress={() => !isDisabled && onToggle(service.id)}
              activeOpacity={isDisabled ? 1 : 0.7}
              disabled={isDisabled}
            >
              <View style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
                isDisabled && styles.iconContainerDisabled
              ]}>
                <Ionicons
                  name={getIcon(service.name) as any}
                  size={32}
                  color={
                    isSelected ? colors.textOnPrimary :
                    isDisabled ? colors.textSecondary :
                    colors.primary
                  }
                />
              </View>
              <Text style={[
                styles.serviceName,
                isSelected && styles.serviceNameSelected,
                isDisabled && styles.serviceNameDisabled
              ]}>
                {service.name}
              </Text>
              <Text style={[styles.servicePrice, isDisabled && styles.servicePriceDisabled]}>
                {service.default_price} Kč/rok
              </Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
              )}
              {isDisabled && (
                <View style={styles.disabledBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.disabledBadgeText}>Aktivní</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundDark,
  },
  serviceCardDisabled: {
    opacity: 0.6,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  iconContainerDisabled: {
    backgroundColor: colors.backgroundDark,
    opacity: 0.5,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  serviceNameSelected: {
    color: colors.primary,
  },
  serviceNameDisabled: {
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  servicePriceDisabled: {
    opacity: 0.6,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  disabledBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  disabledBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

