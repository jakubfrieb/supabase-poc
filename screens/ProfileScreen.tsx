import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useFacilities } from '../hooks/useFacilities';
import { colors, spacing, fontSize, fontWeight } from '../theme/colors';
import { useTranslation } from 'react-i18next';

export function ProfileScreen() {
  const { user } = useAuth();
  const { facilities } = useFacilities();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('profile.myFacilities')}</Text>
      <FlatList
        data={facilities}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.facilityName}>{item.name}</Text>
            {item.description ? <Text style={styles.facilityDesc}>{item.description}</Text> : null}
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.status')}:</Text>
              <Text style={styles.value}>
                {/* Placeholder until schema adds subscription state */}
                {t('profile.statuses.active')}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('profile.paidUntil')}:</Text>
              <Text style={styles.value}>—</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  facilityName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 6,
  },
  facilityDesc: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
});


