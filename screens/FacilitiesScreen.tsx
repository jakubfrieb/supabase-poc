import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ImageBackground, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFacilities } from '../hooks/useFacilities';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MetroFAB } from '../components/MetroFAB';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { useUnreadNotificationsCount } from '../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../lib/supabase';
import { useServiceProvider } from '../hooks/useServiceProvider';
import { useServiceRegistrations } from '../hooks/useServiceRegistrations';
import { useProviderIssues } from '../hooks/useProviderIssues';
import { useOpenServiceRequests } from '../hooks/useOpenServiceRequests';
import { useProviderServiceRequests } from '../hooks/useProviderServiceRequests';
import { PriorityBadge } from '../components/PriorityBadge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function FacilitiesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { facilities, loading, fetchFacilities } = useFacilities();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { count } = useUnreadNotificationsCount();
  const [openIssuesCounts, setOpenIssuesCounts] = useState<Record<string, number>>({});
  const { provider } = useServiceProvider();
  const { registrations } = useServiceRegistrations();
  const { issues: providerIssues, loading: providerIssuesLoading, refetch: refetchProviderIssues } = useProviderIssues();
  const { requests: openRequests, loading: openRequestsLoading, refetch: refetchOpenRequests } = useOpenServiceRequests();
  const { requests: providerRequests, loading: providerRequestsLoading, refetch: refetchProviderRequests } = useProviderServiceRequests();

  // Unified loading state
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const checkLoading = async () => {
      // If any of the critical data is still loading, keep isInitialLoading true
      if (loading || providerIssuesLoading || openRequestsLoading || providerRequestsLoading) {
        return;
      }

      // Add a small delay to ensure the skeleton is visible for at least a moment (smoother transition)
      // and to wait for any potential rapid state updates
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 800);

      return () => clearTimeout(timer);
    };

    checkLoading();
  }, [loading, providerIssuesLoading, openRequestsLoading, providerRequestsLoading]);

  // Check if user has any facilities (is manager/owner/requester)
  const hasFacilities = facilities.length > 0;

  // Check if user has active services
  const hasActiveServices = registrations.filter(
    reg => reg.status === 'active' &&
      (!reg.paid_until || new Date(reg.paid_until) > new Date())
  ).length > 0;

  // State for fetching issue titles that are missing
  const [issueTitles, setIssueTitles] = useState<Record<string, string>>({});

  // State for application counts per issue
  const [issueApplicationCounts, setIssueApplicationCounts] = useState<Record<string, number>>({});

  // State for facility names per issue
  const [issueFacilityNames, setIssueFacilityNames] = useState<Record<string, string>>({});

  // State for facility names per request (for provider requests)
  const [requestFacilityNames, setRequestFacilityNames] = useState<Record<string, string>>({});

  // Split provider requests into applied and available
  // Applied requests are those where provider has application_status (pending or selected)
  const appliedRequests = useMemo(() =>
    providerRequests.filter((req: any) => req.application_status),
    [providerRequests]
  );

  // Available requests are those where provider has no application yet
  // Also filter out issues where provider has applied (even if through a different service)
  const availableRequests = useMemo(() => {
    const appliedIssueIds = new Set(
      appliedRequests.map((req: any) => req.issue_id).filter(Boolean)
    );

    return providerRequests.filter((req: any) => {
      // Exclude if provider has application_status for this request
      if (req.application_status) return false;
      // Exclude if provider has applied to this issue (even through a different service)
      if (appliedIssueIds.has(req.issue_id)) return false;
      return true;
    });
  }, [providerRequests, appliedRequests]);

  // Fetch missing issue titles using RPC
  useEffect(() => {
    const fetchMissingTitles = async () => {
      if (!provider || !user) return;

      // Get all issue IDs that need titles (from all provider requests)
      const issueIdsNeedingTitles = new Set<string>();
      providerRequests.forEach((req: any) => {
        if (req.issue_id && !req.issues?.title) {
          issueIdsNeedingTitles.add(req.issue_id);
        }
      });

      if (issueIdsNeedingTitles.size === 0) return;

      // Fetch titles using RPC function
      const titles: Record<string, string> = {};
      await Promise.all(
        Array.from(issueIdsNeedingTitles).map(async (issueId) => {
          try {
            const { data, error } = await supabase
              .rpc('get_issue_for_provider', { issue_uuid: issueId });

            if (!error && data && data.length > 0) {
              titles[issueId] = data[0].title || 'Závada';
            }
          } catch (err) {
            console.error(`Error fetching title for issue ${issueId}:`, err);
          }
        })
      );

      if (Object.keys(titles).length > 0) {
        setIssueTitles(prev => {
          // Only update if there are new titles
          const hasNewTitles = Object.keys(titles).some(id => prev[id] !== titles[id]);
          return hasNewTitles ? { ...prev, ...titles } : prev;
        });
      }
    };

    fetchMissingTitles();
  }, [provider, user, providerRequests]);

  // Fetch application counts for issues (for providerIssues)
  useEffect(() => {
    const fetchIssueApplicationCounts = async () => {
      if (!provider || !user || providerIssues.length === 0) return;

      const issueIds = providerIssues.map(issue => issue.id);

      // Get all requests for these issues
      const { data: requests } = await supabase
        .from('issue_service_requests')
        .select('id, issue_id')
        .in('issue_id', issueIds)
        .eq('status', 'open');

      if (!requests || requests.length === 0) return;

      const requestIds = requests.map(r => r.id);

      // Get application counts
      const { data: applications } = await supabase
        .from('service_applications')
        .select('request_id')
        .in('request_id', requestIds)
        .in('status', ['pending', 'selected']);

      // Count applications per issue
      const counts: Record<string, number> = {};
      requests.forEach(req => {
        if (!counts[req.issue_id]) {
          counts[req.issue_id] = 0;
        }
      });

      applications?.forEach(app => {
        const req = requests.find(r => r.id === app.request_id);
        if (req) {
          counts[req.issue_id] = (counts[req.issue_id] || 0) + 1;
        }
      });

      setIssueApplicationCounts(counts);
    };

    fetchIssueApplicationCounts();
  }, [provider, user, providerIssues]);

  // Fetch facility names for providerIssues
  useEffect(() => {
    const fetchFacilityNames = async () => {
      if (!provider || !user || providerIssues.length === 0) return;

      const facilityIds = providerIssues
        .map(issue => issue.facility_id)
        .filter(Boolean) as string[];

      if (facilityIds.length === 0) return;

      const { data: facilities } = await supabase
        .from('facilities')
        .select('id, name')
        .in('id', facilityIds);

      if (facilities) {
        const names: Record<string, string> = {};
        providerIssues.forEach(issue => {
          if (issue.facility_id) {
            const facility = facilities.find(f => f.id === issue.facility_id);
            if (facility) {
              names[issue.id] = facility.name;
            }
          }
        });
        setIssueFacilityNames(names);
      }
    };

    fetchFacilityNames();
  }, [provider, user, providerIssues]);

  // Fetch facility names for provider requests (applied and available)
  // Use RPC function to get facility_id if not available due to RLS
  useEffect(() => {
    const fetchRequestFacilityNames = async () => {
      if (!provider || !user || providerRequests.length === 0) return;

      // Get all unique issue IDs from requests
      const issueIds = new Set<string>();
      providerRequests.forEach((req: any) => {
        if (req.issue_id) {
          issueIds.add(req.issue_id);
        }
      });

      if (issueIds.size === 0) return;

      // Fetch facility_ids using RPC function for each issue
      const facilityIdMap: Record<string, string> = {};
      await Promise.all(
        Array.from(issueIds).map(async (issueId) => {
          try {
            // First try to get from request.issues if available
            const req = providerRequests.find((r: any) => r.issue_id === issueId);
            if (req?.issues?.facility_id) {
              facilityIdMap[issueId] = req.issues.facility_id;
              return;
            }

            // If not available, use RPC function
            const { data, error } = await supabase
              .rpc('get_issue_facility_id_for_provider', {
                issue_uuid: issueId
              });

            if (!error && data) {
              facilityIdMap[issueId] = data;
            }
          } catch (err) {
            console.error(`Error fetching facility_id for issue ${issueId}:`, err);
          }
        })
      );

      // Get all unique facility IDs
      const facilityIds = Array.from(new Set(Object.values(facilityIdMap).filter(Boolean)));

      if (facilityIds.length === 0) return;

      // Fetch facility names from database
      const { data: facilities } = await supabase
        .from('facilities')
        .select('id, name')
        .in('id', facilityIds);

      if (!facilities) return;

      // Create map of facility_id -> facility_name
      const facilityNameMap: Record<string, string> = {};
      facilities.forEach(facility => {
        facilityNameMap[facility.id] = facility.name;
      });

      // Map facility names to request IDs
      const requestNames: Record<string, string> = {};
      providerRequests.forEach((req: any) => {
        const issueId = req.issue_id;
        if (issueId && facilityIdMap[issueId]) {
          const facilityId = facilityIdMap[issueId];
          if (facilityNameMap[facilityId]) {
            requestNames[req.id] = facilityNameMap[facilityId];
          }
        }
      });

      setRequestFacilityNames(requestNames);
    };

    fetchRequestFacilityNames();
  }, [provider, user, providerRequests]);

  // Deduplicate open requests by issue_id - group multiple services for same issue
  const deduplicatedOpenRequests = useMemo(() => {
    const groupedByIssue = new Map<string, any[]>();

    openRequests.forEach((req: any) => {
      const issueId = req.issue_id;
      if (!groupedByIssue.has(issueId)) {
        groupedByIssue.set(issueId, []);
      }
      groupedByIssue.get(issueId)!.push(req);
    });

    // Convert grouped requests to single entries
    return Array.from(groupedByIssue.values()).map((requests) => {
      if (requests.length === 1) {
        return requests[0];
      } else {
        // Multiple services for same issue - create combined entry
        const firstRequest = requests[0];
        // Sum application counts from all requests for this issue
        const totalApplicationCount = requests.reduce((sum, r) => sum + (r.application_count || 0), 0);
        return {
          ...firstRequest,
          _isCombined: true,
          _serviceCount: requests.length,
          _allServices: requests.map((r: any) => r.services?.name).filter(Boolean),
          application_count: totalApplicationCount,
        };
      }
    });
  }, [openRequests]);

  // Deduplicate available requests by issue_id - group multiple services for same issue
  const deduplicatedAvailableRequests = useMemo(() => {
    const groupedByIssue = new Map<string, any[]>();

    availableRequests.forEach((req: any) => {
      const issueId = req.issue_id;
      if (!groupedByIssue.has(issueId)) {
        groupedByIssue.set(issueId, []);
      }
      groupedByIssue.get(issueId)!.push(req);
    });

    // Convert grouped requests to single entries
    return Array.from(groupedByIssue.values()).map((requests) => {
      if (requests.length === 1) {
        return requests[0];
      } else {
        // Multiple services for same issue - create combined entry
        const firstRequest = requests[0];
        return {
          ...firstRequest,
          _isCombined: true,
          _serviceCount: requests.length,
          _allServices: requests.map((r: any) => r.services?.name).filter(Boolean),
        };
      }
    });
  }, [availableRequests]);

  // Pagination for available requests (5 per page)
  const [availableRequestsPage, setAvailableRequestsPage] = useState(0);
  const AVAILABLE_REQUESTS_PER_PAGE = 5;
  const availableRequestsStart = availableRequestsPage * AVAILABLE_REQUESTS_PER_PAGE;
  const availableRequestsEnd = availableRequestsStart + AVAILABLE_REQUESTS_PER_PAGE;
  const paginatedAvailableRequests = deduplicatedAvailableRequests.slice(availableRequestsStart, availableRequestsEnd);
  const hasMoreAvailableRequests = deduplicatedAvailableRequests.length > availableRequestsEnd;

  // Debug logging
  useEffect(() => {
    if (provider) {
      console.log('Provider issues count:', providerIssues.length);
      console.log('Applied requests count:', appliedRequests.length);
      console.log('Available requests count:', availableRequests.length);
      console.log('Provider issues:', providerIssues.map(i => ({ id: i.id, title: i.title })));
      console.log('Applied requests:', appliedRequests.map((r: any) => ({ id: r.id, issue_id: r.issue_id, application_status: r.application_status })));
      console.log('Available requests issue IDs:', availableRequests.map((r: any) => r.issue_id));
    }
  }, [provider, providerIssues, appliedRequests, availableRequests]);

  // Refetch when the screen gains focus so newly created facilities appear immediately
  useFocusEffect(
    useCallback(() => {
      fetchFacilities();
      refetchProviderRequests();
      refetchOpenRequests();
      refetchProviderIssues();
    }, [fetchFacilities, refetchProviderRequests, refetchOpenRequests, refetchProviderIssues])
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
    navigation.navigate('ServiceRegistration' as never);
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
        {isInitialLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{t('common.dashboard')}</Text>
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
                    refetchOpenRequests();
                    refetchProviderRequests();
                  }}
                />
              }
              ListHeaderComponent={
                <View>
                  {/* Otevřené poptávky - pro vlastníky */}
                  {hasFacilities && deduplicatedOpenRequests.length > 0 && (
                    <Card style={styles.requestsCard}>
                      <View style={styles.requestsHeader}>
                        <View style={styles.requestsHeaderLeft}>
                          <Ionicons name="clipboard-outline" size={24} color={colors.primary} />
                          <View style={styles.requestsHeaderText}>
                            <Text style={styles.requestsTitle}>{t('serviceRequest.openRequests')}</Text>
                            <Text style={styles.requestsSubtitle}>
                              {deduplicatedOpenRequests.length} {deduplicatedOpenRequests.length === 1 ? 'poptávka' : deduplicatedOpenRequests.length < 5 ? 'poptávky' : 'poptávek'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.requestsList}>
                        {deduplicatedOpenRequests.slice(0, 5).map((request) => {
                          if (!request.issues) return null;

                          // Determine workflow step icon
                          const getWorkflowIcon = () => {
                            const issue = request.issues;
                            if (issue.status === 'resolved' || issue.status === 'closed') {
                              return 'checkmark-circle-outline';
                            }
                            if (issue.selected_appointment_id) {
                              return 'construct-outline';
                            }
                            if (issue.assigned_provider_id) {
                              return 'calendar-outline';
                            }
                            if (request.application_count && request.application_count > 0) {
                              return 'people-outline';
                            }
                            return 'document-text-outline';
                          };

                          // For combined requests, show service count or list
                          const serviceName = request._isCombined
                            ? (request._serviceCount > 1 ? `${request._serviceCount} služeb` : request.services?.name || 'Neznámá služba')
                            : (request.services?.name || 'Neznámá služba');

                          return (
                            <TouchableOpacity
                              key={request.issue_id}
                              onPress={() => navigation.navigate('IssueDetail', {
                                issueId: request.issue_id,
                                facilityId: request.issues.facility_id,
                              })}
                              style={styles.requestItem}
                            >
                              <View style={styles.requestItemLeft}>
                                <View style={styles.requestItemText}>
                                  <Text style={styles.requestItemTitle} numberOfLines={1}>
                                    {request.issues.title}
                                  </Text>
                                  <Text style={styles.requestItemSubtitle} numberOfLines={1}>
                                    {request.facilities?.name || 'Neznámá nemovitost'} • {serviceName}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.providerRequestRight}>
                                <View style={styles.workflowIconContainer}>
                                  <Ionicons
                                    name={getWorkflowIcon() as any}
                                    size={20}
                                    color={colors.primary}
                                  />
                                </View>
                                <View style={styles.applicantIconContainer}>
                                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                                  <Text style={styles.applicantCountNumber}>
                                    {request.application_count || 0}/3
                                  </Text>
                                </View>
                                {request.application_count !== undefined && request.application_count >= 3 && (
                                  <View style={styles.fullBadge}>
                                    <Text style={styles.fullBadgeText}>Plná</Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        {deduplicatedOpenRequests.length > 5 && (
                          <Text style={styles.requestsMore}>
                            {t('common.andMore', { count: deduplicatedOpenRequests.length - 5 })}
                          </Text>
                        )}
                      </View>
                    </Card>
                  )}

                  {/* Přihlášené poptávky - pro dodavatele (kde je přiřazen nebo má application) */}
                  {provider && (providerIssues.length > 0 || appliedRequests.length > 0) && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Přihlášené poptávky</Text>
                        <Text style={styles.sectionSubtitle}>
                          {providerIssues.length + appliedRequests.length} {(providerIssues.length + appliedRequests.length) === 1 ? 'poptávka' : (providerIssues.length + appliedRequests.length) < 5 ? 'poptávky' : 'poptávek'}
                        </Text>
                      </View>
                      {/* Issues where provider is assigned */}
                      {providerIssues.length > 0 && providerIssues.slice(0, 5).map((issue) => {
                        const getWorkflowIcon = () => {
                          if (issue.status === 'resolved' || issue.status === 'closed') {
                            return 'checkmark-circle-outline';
                          }
                          if (issue.selected_appointment_id) {
                            return 'construct-outline';
                          }
                          if (issue.assigned_provider_id) {
                            return 'calendar-outline';
                          }
                          return 'document-text-outline';
                        };

                        return (
                          <Pressable
                            key={issue.id}
                            onPress={async () => {
                              let finalFacilityId = issue.facility_id;

                              // If facilityId is not available, use RPC function to get it
                              if (!finalFacilityId && issue.id) {
                                try {
                                  const { data, error: rpcError } = await supabase
                                    .rpc('get_issue_facility_id_for_provider', {
                                      issue_uuid: issue.id
                                    });

                                  if (!rpcError && data) {
                                    finalFacilityId = data;
                                  } else {
                                    console.error('Error fetching facility_id via RPC:', rpcError);
                                  }
                                } catch (error) {
                                  console.error('Error calling RPC function:', error);
                                }
                              }

                              if (finalFacilityId) {
                                navigation.navigate('IssueDetail', {
                                  issueId: issue.id,
                                  facilityId: finalFacilityId,
                                });
                              } else {
                                Alert.alert('Chyba', 'Nepodařilo se načíst informace o závadě. Zkuste to prosím znovu.');
                              }
                            }}
                            style={styles.cardWrapper}
                          >
                            {({ pressed }) => (
                              <Card pressed={pressed} style={styles.requestCard}>
                                <View style={styles.requestHeader}>
                                  <View style={styles.requestInfo}>
                                    <Text style={styles.requestTitle}>{issue.title}</Text>
                                    <Text style={styles.requestSubtitle}>Vybran</Text>
                                    <Text style={styles.requestDate}>
                                      Vytvořeno: {new Date(issue.created_at).toLocaleDateString('cs-CZ')}
                                    </Text>
                                  </View>
                                  <View style={styles.requestHeaderRight}>
                                    <View style={[
                                      styles.providerRequestStatus,
                                      { backgroundColor: colors.statusInProgress }
                                    ]}>
                                      <Text style={styles.providerRequestStatusText}>
                                        Vybran
                                      </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                  </View>
                                </View>
                                <View style={styles.requestFooter}>
                                  <View style={styles.priorityIconContainer}>
                                    <PriorityBadge
                                      priority={issue.priority || 'normal'}
                                      showText={false}
                                      size="small"
                                    />
                                  </View>
                                  <View style={styles.applicantIconContainer}>
                                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                                    <Text style={styles.applicantCountNumber}>
                                      {issueApplicationCounts[issue.id] || 0}/3
                                    </Text>
                                  </View>
                                </View>
                              </Card>
                            )}
                          </Pressable>
                        );
                      })}
                      {/* Requests where provider has applied */}
                      {appliedRequests.length > 0 && appliedRequests.slice(0, Math.max(0, 5 - providerIssues.length)).map((request: any) => {
                        const issueId = request.issue_id;

                        if (!issueId) {
                          console.warn('Missing issueId for request:', request);
                          return null;
                        }

                        // Get issue data - use cached title if available, or fetch via RPC
                        const facilityId = request.issues?.facility_id;
                        const issueTitle = request.issues?.title || issueTitles[issueId] || 'Načítání...';
                        const serviceName = request.services?.name || 'Neznámá služba';

                        // If issues is null, we'll fetch it when needed (via RPC in onPress)
                        // But we can still display the card with available data

                        const getWorkflowIcon = () => {
                          const issue = request.issues;
                          if (issue?.status === 'resolved' || issue?.status === 'closed') {
                            return 'checkmark-circle-outline';
                          }
                          if (issue?.selected_appointment_id) {
                            return 'construct-outline';
                          }
                          if (issue?.assigned_provider_id) {
                            return 'calendar-outline';
                          }
                          if (request.application_count && request.application_count > 0) {
                            return 'people-outline';
                          }
                          return 'document-text-outline';
                        };

                        return (
                          <Pressable
                            key={request.id}
                            onPress={async () => {
                              let finalFacilityId = facilityId;

                              // If facilityId is not available, use RPC function to get it
                              if (!finalFacilityId && issueId) {
                                try {
                                  const { data, error: rpcError } = await supabase
                                    .rpc('get_issue_facility_id_for_provider', {
                                      issue_uuid: issueId
                                    });

                                  if (!rpcError && data) {
                                    finalFacilityId = data;
                                  } else {
                                    console.error('Error fetching facility_id via RPC:', rpcError);
                                  }
                                } catch (error) {
                                  console.error('Error calling RPC function:', error);
                                }
                              }

                              if (finalFacilityId) {
                                navigation.navigate('IssueDetail', {
                                  issueId,
                                  facilityId: finalFacilityId,
                                });
                              } else {
                                Alert.alert('Chyba', 'Nepodařilo se načíst informace o závadě. Zkuste to prosím znovu.');
                              }
                            }}
                            style={styles.cardWrapper}
                          >
                            {({ pressed }) => (
                              <Card pressed={pressed} style={styles.requestCard}>
                                <View style={styles.requestHeader}>
                                  <View style={styles.requestInfo}>
                                    <Text style={styles.requestTitle}>{issueTitle}</Text>
                                    <Text style={styles.requestSubtitle}>{serviceName}</Text>
                                    <Text style={styles.requestDate}>
                                      Vytvořeno: {new Date(request.created_at).toLocaleDateString('cs-CZ')}
                                    </Text>
                                  </View>
                                  <View style={styles.requestHeaderRight}>
                                    <View style={[
                                      styles.providerRequestStatus,
                                      { backgroundColor: request.application_status === 'selected' ? colors.statusInProgress : colors.statusOpen }
                                    ]}>
                                      <Text style={styles.providerRequestStatusText}>
                                        {request.application_status === 'selected' ? 'Vybrán' : 'Čeká'}
                                      </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                  </View>
                                </View>
                                <View style={styles.requestFooter}>
                                  <View style={styles.priorityIconContainer}>
                                    <PriorityBadge
                                      priority={request.issues?.priority || 'normal'}
                                      showText={false}
                                      size="small"
                                    />
                                  </View>
                                  <View style={styles.applicantIconContainer}>
                                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                                    <Text style={styles.applicantCountNumber}>
                                      {request.application_count || 0}/3
                                    </Text>
                                  </View>
                                </View>
                              </Card>
                            )}
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                  {/* Sekce Vaše nemovitosti */}
                  {hasFacilities && (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{t('facilities.yourFacilities')}</Text>
                      <Text style={styles.sectionSubtitle}>
                        {facilities.length} {facilities.length === 1 ? 'nemovitost' : facilities.length < 5 ? 'nemovitosti' : 'nemovitostí'}
                      </Text>
                    </View>
                  )}
                </View>
              }
              ListFooterComponent={
                <View>
                  {/* Dostupné poptávky - pro dodavatele (stránkované po 5ti) */}
                  {provider && deduplicatedAvailableRequests.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Dostupné poptávky</Text>
                        <Text style={styles.sectionSubtitle}>
                          {deduplicatedAvailableRequests.length} {deduplicatedAvailableRequests.length === 1 ? 'poptávka' : deduplicatedAvailableRequests.length < 5 ? 'poptávky' : 'poptávek'}
                        </Text>
                      </View>
                      {paginatedAvailableRequests.map((request: any) => {
                        const service = request.services;
                        // If combined, show "Kombinované", otherwise show service name
                        const serviceName = request._isCombined
                          ? 'Kombinované'
                          : (service?.name || 'Neznámá služba');
                        const issue = request.issues;
                        const issueId = request.issue_id;
                        // If issues is null (due to RLS), we'll fetch facility_id separately
                        const facilityId = issue?.facility_id;
                        // Use issue title if available, otherwise use cached title or fallback
                        const issueTitle = issue?.title || issueTitles[issueId] || 'Závada';
                        const getIcon = (name: string) => {
                          // For combined services, use a generic icon
                          if (name === 'Kombinované') {
                            return 'build-outline';
                          }
                          const icons: Record<string, string> = {
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
                          return icons[name] || 'build-outline';
                        };

                        if (!issueId) {
                          console.warn('Missing issueId for request:', request);
                          return null;
                        }

                        // If facilityId is not available, we'll fetch it when user clicks
                        // For now, we'll show the card and fetch facility_id on click if needed

                        return (
                          <Pressable
                            key={request.id}
                            onPress={async () => {
                              let finalFacilityId = facilityId;

                              // If facilityId is not available, use RPC function to get it
                              if (!finalFacilityId && issueId) {
                                try {
                                  const { data, error: rpcError } = await supabase
                                    .rpc('get_issue_facility_id_for_provider', {
                                      issue_uuid: issueId
                                    });

                                  if (!rpcError && data) {
                                    finalFacilityId = data;
                                  } else {
                                    console.error('Error fetching facility_id via RPC:', rpcError);
                                  }
                                } catch (error) {
                                  console.error('Error calling RPC function:', error);
                                }
                              }

                              if (finalFacilityId) {
                                navigation.navigate('IssueDetail', {
                                  issueId,
                                  facilityId: finalFacilityId,
                                });
                              } else {
                                Alert.alert('Chyba', 'Nepodařilo se načíst informace o závadě. Zkuste to prosím znovu.');
                              }
                            }}
                            style={styles.cardWrapper}
                          >
                            {({ pressed }) => (
                              <Card pressed={pressed} style={styles.requestCard}>
                                <View style={styles.requestHeader}>
                                  <View style={styles.requestInfo}>
                                    <Text style={styles.requestTitle}>{issueTitle}</Text>
                                    <Text style={styles.requestSubtitle}>{serviceName}</Text>
                                    <Text style={styles.requestDate}>
                                      Vytvořeno: {new Date(request.created_at).toLocaleDateString('cs-CZ')}
                                    </Text>
                                  </View>
                                  <View style={styles.requestHeaderRight}>
                                    {/* Workflow icon */}
                                    {(() => {
                                      const getWorkflowIcon = () => {
                                        if (issue?.status === 'resolved' || issue?.status === 'closed') {
                                          return 'checkmark-circle-outline';
                                        }
                                        if (issue?.selected_appointment_id) {
                                          return 'construct-outline';
                                        }
                                        if (issue?.assigned_provider_id) {
                                          return 'calendar-outline';
                                        }
                                        if (request.application_count && request.application_count > 0) {
                                          return 'people-outline';
                                        }
                                        return 'document-text-outline';
                                      };
                                      return (
                                        <View style={styles.workflowIconContainer}>
                                          <Ionicons
                                            name={getWorkflowIcon() as any}
                                            size={20}
                                            color={colors.primary}
                                          />
                                        </View>
                                      );
                                    })()}
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                  </View>
                                </View>
                                <View style={styles.requestFooter}>
                                  <View style={styles.priorityIconContainer}>
                                    <PriorityBadge
                                      priority={issue?.priority || 'normal'}
                                      showText={false}
                                      size="small"
                                    />
                                  </View>
                                  <View style={styles.applicantIconContainer}>
                                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                                    <Text style={styles.applicantCountNumber}>
                                      {request.application_count || 0}/3
                                    </Text>
                                  </View>
                                </View>
                              </Card>
                            )}
                          </Pressable>
                        );
                      })}
                      {/* Pagination controls */}
                      <View style={styles.paginationContainer}>
                        {availableRequestsPage > 0 && (
                          <TouchableOpacity
                            onPress={() => setAvailableRequestsPage(availableRequestsPage - 1)}
                            style={styles.paginationButton}
                          >
                            <Ionicons name="chevron-back" size={20} color={colors.primary} />
                            <Text style={styles.paginationButtonText}>Předchozí</Text>
                          </TouchableOpacity>
                        )}
                        {hasMoreAvailableRequests && (
                          <TouchableOpacity
                            onPress={() => setAvailableRequestsPage(availableRequestsPage + 1)}
                            style={[styles.paginationButton, styles.paginationButtonRight]}
                          >
                            <Text style={styles.paginationButtonText}>Další</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </View>
              }
              renderItem={({ item }) => {
                const openCount = openIssuesCounts[item.id] ?? 0;
                return (
                  <Pressable
                    onPress={() => handleFacilityPress(item.id)}
                    style={styles.cardWrapper}
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
                !hasFacilities && !hasActiveServices ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🏢</Text>
                    <Text style={styles.emptyTitle}>{t('facilities.noFacilities')}</Text>
                    <Text style={styles.emptyText}>{t('facilities.noFacilitiesHint')}</Text>
                  </View>
                ) : null
              }
            />

            <MetroFAB
              onAddPress={handleCreateFacility}
              onLinkPress={() => navigation.navigate('JoinFacility' as never)}
              onAddServicePress={handleAddService}
            />
          </>
        )}
      </SafeAreaView>
    </ImageBackground >
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
    marginBottom: 5, // spacing.xs (4px) + 20% = ~5px
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
  providerInfoCard: {
    marginBottom: spacing.md,
  },
  providerInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerInfoText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  providerInfoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerInfoSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  providerInfoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  providerInfoButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  providerIssuesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  providerIssuesTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  providerIssueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  providerIssueText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  providerIssueStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  providerIssueStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  providerIssuesMore: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  providerIssuesMoreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  requestsCard: {
    marginBottom: spacing.md,
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestsHeaderText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  requestsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requestsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  requestsList: {
    marginTop: spacing.sm,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  requestItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestItemText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  requestItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 2,
  },
  requestItemSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  requestBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  requestBadgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  requestsMore: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  providerRequestsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  providerRequestsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  providerRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  providerRequestItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerRequestIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  providerRequestItemText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  providerRequestItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 2,
  },
  providerRequestItemSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  providerRequestStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  providerRequestStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  providerRequestsMore: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  providerRequestsMoreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  providerRequestRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workflowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  applicantCountText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  fullBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
  },
  fullBadgeText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  requestIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  paginationButtonRight: {
    marginLeft: 'auto',
  },
  paginationButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  requestHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestCard: {
    marginBottom: 0,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    marginBottom: -spacing.lg,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applicantIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  applicantCountNumber: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  priorityIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requestSubtitle: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  requestDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  facilityLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: 2,
    marginBottom: spacing.xs,
    textDecorationLine: 'underline',
  },
});

