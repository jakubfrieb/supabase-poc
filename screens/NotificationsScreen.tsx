import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { useNotifications, useUnreadNotificationsCount } from '../hooks/useNotifications';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { Facility, Issue } from '../types/database';
import { PriorityBadge } from '../components/PriorityBadge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notifications, loading, markAsRead: originalMarkAsRead, markAllRead, refresh } = useNotifications();
  const { decrementCount, refresh: refreshCount } = useUnreadNotificationsCount();
  const [facilities, setFacilities] = useState<Map<string, Facility>>(new Map());
  const [issues, setIssues] = useState<Map<string, Issue>>(new Map());
  const [loadingData, setLoadingData] = useState(false);

  // Refresh notifikací když se obrazovka zobrazí (např. při návratu z detailu)
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshCount();
    }, [refresh, refreshCount])
  );

  // Wrapper pro markAsRead, který také aktualizuje badge count
  const markAsRead = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    // Pokud byla notifikace nepřečtená, dekrementuj count
    if (notification && !notification.read_at) {
      decrementCount();
    }
    await originalMarkAsRead(id);
  }, [originalMarkAsRead, notifications, decrementCount]);

  // Načti facilities a issues pro všechny notifikace
  useEffect(() => {
    if (notifications.length === 0) return;

    const loadRelatedData = async () => {
      setLoadingData(true);
      try {
        // Získej unikátní facilityId a issueId z notifikací
        const facilityIds = new Set<string>();
        const issueIds = new Set<string>();

        notifications.forEach(notif => {
          if (notif.data?.facilityId) {
            facilityIds.add(notif.data.facilityId);
          }
          if (notif.data?.issueId) {
            issueIds.add(notif.data.issueId);
          }
        });

        // Načti facilities
        if (facilityIds.size > 0) {
          const { data: facilitiesData, error: facilitiesError } = await supabase
            .from('facilities')
            .select('*')
            .in('id', Array.from(facilityIds));

          if (!facilitiesError && facilitiesData) {
            const facilitiesMap = new Map<string, Facility>();
            facilitiesData.forEach(f => facilitiesMap.set(f.id, f));
            setFacilities(facilitiesMap);
          }
        }

        // Načti issues
        if (issueIds.size > 0) {
          const { data: issuesData, error: issuesError } = await supabase
            .from('issues')
            .select('*')
            .in('id', Array.from(issueIds));

          if (!issuesError && issuesData) {
            const issuesMap = new Map<string, Issue>();
            issuesData.forEach(i => issuesMap.set(i.id, i));
            setIssues(issuesMap);
          }
        }
      } catch (error) {
        console.error('Error loading related data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadRelatedData();
  }, [notifications]);

  const handlePress = useCallback(async (id: string, type: string, data: any) => {
    await markAsRead(id);
    if (type === 'issue_created' && data?.issueId && data?.facilityId) {
      navigation.navigate('IssueDetail', { issueId: data.issueId, facilityId: data.facilityId });
    }
  }, [markAsRead, navigation]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'právě teď';
    if (diffMins < 60) return `před ${diffMins} min`;
    if (diffHours < 24) return `před ${diffHours} h`;
    if (diffDays < 7) return `před ${diffDays} d`;
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  }, []);

  return (
    <ImageBackground 
      source={require('../assets/background/theme_1.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
      {loading || loadingData ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const facility = item.data?.facilityId ? facilities.get(item.data.facilityId) : null;
            const issue = item.data?.issueId ? issues.get(item.data.issueId) : null;
            const facilityName = facility?.name || 'Neznámá nemovitost';
            const issueTitle = issue?.title || item.title;
            const priority = issue?.priority;

            return (
              <TouchableOpacity onPress={() => handlePress(item.id, item.type, item.data)}>
                <View style={[styles.item, !item.read_at ? styles.unread : undefined]}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemMain}>
                      <Text style={styles.facilityName} numberOfLines={1}>{facilityName}</Text>
                      <Text style={styles.issueTitle} numberOfLines={1}>{issueTitle}</Text>
                    </View>
                    {priority && (
                      <PriorityBadge priority={priority} showText={false} size="small" />
                    )}
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
                    {!item.read_at && <View style={styles.unreadDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Žádné notifikace</Text>
            </View>
          }
        />
      )}
      </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.xl,
  },
  item: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  itemMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  facilityName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  issueTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});


