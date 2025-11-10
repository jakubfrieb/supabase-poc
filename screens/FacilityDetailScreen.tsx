import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useIssues } from '../hooks/useIssues';
import { Facility } from '../types/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'FacilityDetail'>;

const statusColors = {
  open: '#FF9500',
  in_progress: '#007AFF',
  resolved: '#34C759',
  closed: '#8E8E93',
};

const priorityColors = {
  low: '#34C759',
  medium: '#FF9500',
  high: '#FF3B30',
  urgent: '#AF52DE',
};

export function FacilityDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { facilityId } = route.params;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [loadingFacility, setLoadingFacility] = useState(true);

  const { issues, loading, fetchIssues } = useIssues(facilityId);

  useEffect(() => {
    fetchFacility();
  }, [facilityId]);

  const fetchFacility = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .single();

      if (error) throw error;
      setFacility(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load facility');
      navigation.goBack();
    } finally {
      setLoadingFacility(false);
    }
  };

  const handleCreateIssue = () => {
    navigation.navigate('CreateIssue', { facilityId });
  };

  const handleIssuePress = (issueId: string) => {
    navigation.navigate('IssueDetail', { issueId, facilityId });
  };

  const getStatusBadge = (status: string) => {
    return (
      <View style={[styles.badge, { backgroundColor: statusColors[status as keyof typeof statusColors] }]}>
        <Text style={styles.badgeText}>{status.replace('_', ' ')}</Text>
      </View>
    );
  };

  const getPriorityBadge = (priority: string) => {
    return (
      <View style={[styles.badge, { backgroundColor: priorityColors[priority as keyof typeof priorityColors] }]}>
        <Text style={styles.badgeText}>{priority}</Text>
      </View>
    );
  };

  if (loadingFacility) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.facilityInfo}>
        <Text style={styles.facilityName}>{facility?.name}</Text>
        {facility?.description && (
          <Text style={styles.facilityDescription}>{facility.description}</Text>
        )}
        {facility?.address && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.address}>{facility.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.issuesHeader}>
        <Text style={styles.issuesTitle}>Issues</Text>
        <Text style={styles.issuesCount}>{issues.length}</Text>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchIssues} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleIssuePress(item.id)}>
            <Card>
              <View style={styles.issueHeader}>
                <Text style={styles.issueTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.badges}>
                  {getPriorityBadge(item.priority)}
                  {getStatusBadge(item.status)}
                </View>
              </View>
              {item.description && (
                <Text style={styles.issueDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No issues yet</Text>
            <Text style={styles.emptyText}>
              Create your first issue to start tracking
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Button
          title="Create Issue"
          onPress={handleCreateIssue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityInfo: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  facilityName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  facilityDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addressIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  address: {
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  issuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  issuesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  issuesCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  issueHeader: {
    marginBottom: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  issueDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
});
