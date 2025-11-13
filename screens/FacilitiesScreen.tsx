import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ImageBackground, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFacilities } from '../hooks/useFacilities';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MetroFAB } from '../components/MetroFAB';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { useUnreadNotificationsCount } from '../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../lib/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function FacilitiesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { facilities, loading, fetchFacilities } = useFacilities();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { count } = useUnreadNotificationsCount();
  const [openIssuesCounts, setOpenIssuesCounts] = useState<Record<string, number>>({});

  // Refetch when the screen gains focus so newly created facilities appear immediately
  useFocusEffect(
    useCallback(() => {
      fetchFacilities();
    }, [fetchFacilities])
  );

  // Fetch open issues counts for all facilities
  const fetchOpenIssuesCounts = useCallback(async () => {
    if (facilities.length === 0) {
      setOpenIssuesCounts({});
      return;
    }

    try {
      const facilityIds = facilities.map(f => f.id);
      
      const { data, error } = await supabase
        .from('issues')
        .select('facility_id')
        .in('facility_id', facilityIds)
        .in('status', ['open', 'in_progress']);

      if (error) throw error;

      // Count issues per facility
      const counts: Record<string, number> = {};
      facilityIds.forEach(id => {
        counts[id] = 0;
      });

      data?.forEach(issue => {
        if (issue.facility_id) {
          counts[issue.facility_id] = (counts[issue.facility_id] || 0) + 1;
        }
      });

      console.log('Open issues counts:', counts);
      setOpenIssuesCounts(counts);
    } catch (err) {
      console.error('Error fetching open issues counts:', err);
    }
  }, [facilities]);

  useEffect(() => {
    fetchOpenIssuesCounts();
  }, [fetchOpenIssuesCounts]);

  // Refetch counts when screen regains focus
  useFocusEffect(
    useCallback(() => {
      fetchOpenIssuesCounts();
    }, [fetchOpenIssuesCounts])
  );

  const handleCreateFacility = () => {
    navigation.navigate('CreateFacility');
  };

  const handleAddService = () => {
    // TODO: Implementovat navigaci na přidání služby
    // navigation.navigate('CreateService' as never);
    console.log('Add service pressed');
  };

  const handleFacilityPress = (facilityId: string) => {
    navigation.navigate('FacilityDetail', { facilityId });
  };

  return (
    <ImageBackground 
      source={require('../assets/background/theme_1.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('facilities.yourFacilities')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications' as never)} style={styles.bell}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            {count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)}>
            <UserAvatar userId={user?.id || null} size="medium" showName={false} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={facilities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={() => {
              fetchFacilities();
              fetchOpenIssuesCounts();
            }} 
          />
        }
        renderItem={({ item }) => {
          const openCount = openIssuesCounts[item.id] ?? 0;
          return (
            <Pressable
              onPress={() => handleFacilityPress(item.id)}
              style={styles.cardWrapper}
              delayPressIn={100}
            >
              {({ pressed }) => (
                <Card pressed={pressed}>
                <View style={styles.facilityHeader}>
                  <Text style={styles.facilityName}>{item.name}</Text>
                  <View style={styles.facilityHeaderRight}>
                    {(item as any).notes && (
                      <View style={styles.notesIconContainer}>
                        <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={[
                      styles.openIssuesBadge,
                      openCount === 0 && styles.openIssuesBadgeEmpty
                    ]}>
                      <Text style={[
                        styles.openIssuesText,
                        openCount === 0 && styles.openIssuesTextEmpty
                      ]}>
                        {openCount}
                      </Text>
                    </View>
                  </View>
                </View>
                {item.description && (
                  <Text style={styles.facilityDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                {item.address && (
                  <View style={styles.addressContainer}>
                    <Text style={styles.addressIcon}>📍</Text>
                    <Text style={styles.address} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}
                </Card>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>{t('facilities.noFacilities')}</Text>
            <Text style={styles.emptyText}>{t('facilities.noFacilitiesHint')}</Text>
          </View>
        }
      />

      <MetroFAB
        onAddPress={handleCreateFacility}
        onLinkPress={() => navigation.navigate('JoinFacility' as never)}
        onAddServicePress={handleAddService}
      />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bell: {
    position: 'relative',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  signOutButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: spacing.md,
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  facilityName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  facilityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesIconContainer: {
    marginRight: spacing.xs,
  },
  openIssuesBadge: {
    backgroundColor: colors.statusOpen,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  openIssuesBadgeEmpty: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  openIssuesText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  openIssuesTextEmpty: {
    color: colors.textSecondary,
  },
  facilityDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addressIcon: {
    fontSize: fontSize.sm,
    marginRight: 6,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
