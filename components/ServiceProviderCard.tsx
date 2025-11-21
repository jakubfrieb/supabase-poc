import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { ServiceProvider } from '../types/database';

interface ServiceProviderCardProps {
  provider: ServiceProvider & { user_id: string };
  onSelect?: () => void;
  onContact?: () => void;
  showSelectButton?: boolean;
  showContactButton?: boolean;
}

export function ServiceProviderCard({
  provider,
  onSelect,
  onContact,
  showSelectButton = false,
  showContactButton = true,
}: ServiceProviderCardProps) {
  const handlePhonePress = () => {
    if (provider.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    }
  };

  const handleEmailPress = () => {
    if (provider.billing_email) {
      Linking.openURL(`mailto:${provider.billing_email}`);
    }
  };

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.companyName}>{provider.company_name}</Text>
          <View style={styles.idRow}>
            {provider.ico && (
              <Text style={styles.detail}>IČO: {provider.ico}</Text>
            )}
            {provider.dic && (
              <Text style={[styles.detail, styles.dicText]}>DIČ: {provider.dic}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.details}>
        {provider.address && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailText}>{provider.address}</Text>
          </View>
        )}
        {provider.phone && (
          <TouchableOpacity style={styles.detailRow} onPress={handlePhonePress}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={[styles.detailText, styles.linkText]}>{provider.phone}</Text>
          </TouchableOpacity>
        )}
        {provider.billing_email && (
          <TouchableOpacity style={styles.detailRow} onPress={handleEmailPress}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={[styles.detailText, styles.linkText]}>{provider.billing_email}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actions}>
        {showContactButton && (
          <TouchableOpacity style={styles.contactButton} onPress={onContact || handlePhonePress}>
            <Ionicons name="call" size={18} color={colors.textOnPrimary} />
            <Text style={styles.contactButtonText}>Kontaktovat</Text>
          </TouchableOpacity>
        )}
        {showSelectButton && onSelect && (
          <TouchableOpacity style={styles.selectButton} onPress={onSelect}>
            <Ionicons name="checkmark-circle" size={18} color={colors.textOnPrimary} />
            <Text style={styles.selectButtonText}>Vybrat</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  companyName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  idRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  dicText: {
    marginLeft: 0,
  },
  details: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  contactButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  selectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  selectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

