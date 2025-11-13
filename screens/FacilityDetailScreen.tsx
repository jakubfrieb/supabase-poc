import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useIssues } from '../hooks/useIssues';
import { Facility, IssuePriority } from '../types/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme/colors';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { PriorityBadge } from '../components/PriorityBadge';
import { UserAvatar } from '../components/UserAvatar';
import { useFacilityRole } from '../hooks/useFacilityRole';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'FacilityDetail'>;

const statusColors = {
  open: colors.statusOpen,
  in_progress: colors.statusInProgress,
  resolved: colors.statusResolved,
  closed: colors.statusClosed,
};

// Priority colors are now handled by PriorityBadge component

export function FacilityDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { facilityId } = route.params;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [loadingFacility, setLoadingFacility] = useState(true);
  const [voucher, setVoucher] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { issues, loading, fetchIssues } = useIssues(facilityId);
  const { role, isAdminOrOwner } = useFacilityRole(facilityId);

  useEffect(() => {
    fetchFacility();
  }, [facilityId]);

  // Refetch issues when screen regains focus so new issues appear without manual refresh
  useFocusEffect(
    useCallback(() => {
      fetchIssues();
    }, [fetchIssues])
  );

  const fetchFacility = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .single();

      if (error) throw error;
      setFacility(data);
      
      // Fetch or create invite code
      await fetchInviteCode();
    } catch (error) {
      Alert.alert('Error', 'Failed to load facility');
      navigation.goBack();
    } finally {
      setLoadingFacility(false);
    }
  };

  const fetchInviteCode = async () => {
    try {
      // Try to get existing invite code
      const { data: existing, error: fetchError } = await supabase
        .from('facility_invites')
        .select('code')
        .eq('facility_id', facilityId)
        .eq('role', 'member')
        .is('expires_at', null)
        .single();

      if (existing && !fetchError) {
        setInviteCode(existing.code);
        return;
      }

      // Generate new invite code in format xxx-xxx
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
          if (i === 2) code += '-';
        }
        return code;
      };

      const newCode = generateCode();

      // Insert new invite code
      const { error: insertError } = await supabase
        .from('facility_invites')
        .insert({
          facility_id: facilityId,
          code: newCode,
          role: 'member',
          max_uses: null, // Unlimited uses
          expires_at: null, // Never expires
        });

      if (insertError) throw insertError;
      setInviteCode(newCode);
    } catch (error) {
      console.error('Error managing invite code:', error);
    }
  };

  const handleShowInvite = () => {
    if (inviteCode) {
      setShowInviteModal(true);
    } else {
      Alert.alert('Chyba', 'Nepodařilo se načíst kód pro pozvání.');
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
        <Text style={styles.badgeText}>{t(`issues.statusNames.${status}`)}</Text>
      </View>
    );
  };

  const getPriorityBadge = (priority: string) => {
    return (
      <PriorityBadge 
        priority={priority as any}
        showText={true}
        size="small"
      />
    );
  };

  // Count open issues by priority
  const getOpenIssuesByPriority = () => {
    const openIssues = issues.filter(
      issue => issue.status === 'open' || issue.status === 'in_progress'
    );
    
    const priorities: IssuePriority[] = ['idea', 'normal', 'high', 'critical', 'urgent'];
    const counts: Record<IssuePriority, number> = {
      idea: 0,
      normal: 0,
      high: 0,
      critical: 0,
      urgent: 0,
    };

    openIssues.forEach(issue => {
      const priority = issue.priority as IssuePriority;
      if (priority && counts.hasOwnProperty(priority)) {
        counts[priority]++;
      }
    });

    return counts;
  };

  if (loadingFacility) {
    return (
      <ImageBackground 
        source={require('../assets/background/theme_1.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text>Loading...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground 
      source={require('../assets/background/theme_1.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.facilityInfo}>
        <View style={styles.facilityHeader}>
          <View style={styles.facilityTitleContainer}>
            <Text style={styles.facilityName}>{facility?.name}</Text>
            {isAdminOrOwner && (
              <TouchableOpacity onPress={handleShowInvite} style={styles.eyeButton}>
                <Ionicons name="eye-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {facility?.description && (
          <Text style={styles.facilityDescription}>{facility.description}</Text>
        )}
        {facility?.address && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.address}>{facility.address}</Text>
          </View>
        )}
        <View style={styles.subscriptionRow}>
          <Text style={styles.subscriptionLabel}>{t('facility.subscription')}:</Text>
          <Text style={styles.subscriptionValue}>
            {(facility as any)?.subscription_status === 'active' && (facility as any)?.paid_until
              ? `${t('facility.activeUntil')} ${new Date((facility as any).paid_until).toLocaleDateString()}`
              : t(`profile.statuses.${(facility as any)?.subscription_status ?? 'pending'}`)}
          </Text>
        </View>
        
        {/* Open issues by priority */}
        {(() => {
          const counts = getOpenIssuesByPriority();
          const totalOpen = Object.values(counts).reduce((sum, count) => sum + count, 0);
          const priorities: IssuePriority[] = ['idea', 'normal', 'high', 'critical', 'urgent'];
          const priorityItems = priorities
            .map(priority => ({ priority, count: counts[priority] }))
            .filter(item => item.count > 0);

          if (totalOpen === 0) return null;

          return (
            <View style={styles.issuesByPriorityContainer}>
              <Text style={styles.issuesByPriorityTitle}>Otevřené závady:</Text>
              <View style={styles.issuesByPriorityRow}>
                {priorityItems.map(({ priority, count }) => (
                  <View key={priority} style={styles.priorityCountItem}>
                    <PriorityBadge 
                      priority={priority}
                      showText={false}
                      size="small"
                    />
                    <Text style={styles.priorityCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </View>

      <View style={styles.issuesHeader}>
        <Text style={styles.issuesTitle}>{t('issues.createTitle')}</Text>
        <Text style={styles.issuesCount}>{issues.length}</Text>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchIssues} />
        }
        ListHeaderComponent={
          (facility as any)?.subscription_status !== 'active' ? (
            role === 'owner' ? (
              <View style={styles.paymentCard}>
                <Text style={styles.payTitle}>Symbolický poplatek 20 Kč/rok</Text>
                <Text style={styles.payDesc}>
                  Poplatek je nevratný a zajišťuje bezpečné používání služby.
                </Text>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={JSON.stringify({
                      facilityId,
                      amountCZK: 20,
                      message:
                        'Symbolický, nevratný poplatek 20 Kč/rok, zajišťuje bezpečné používání služby.',
                    })}
                    size={140}
                  />
                </View>
                <View style={styles.voucherRow}>
                  <TextInput
                    style={styles.voucherInput}
                    value={voucher}
                    onChangeText={setVoucher}
                    placeholder="Voucher kód"
                    autoCapitalize="characters"
                  />
                  <Button
                    title="Uplatnit"
                    onPress={async () => {
                      try {
                        if (!voucher.trim()) return;
                        const { data: v, error: verr } = await supabase
                          .from('vouchers')
                          .select('months, active, expires_at')
                          .eq('code', voucher.trim())
                          .single();
                        if (verr || !v) throw new Error('Neplatný voucher');
                        if (v.active === false) throw new Error('Voucher je neaktivní');
                        if (v.expires_at && new Date(v.expires_at) < new Date()) throw new Error('Voucher vypršel');

                        const current = (facility as any)?.paid_until
                          ? new Date((facility as any).paid_until)
                          : new Date();
                        const newPaid = new Date(current);
                        newPaid.setMonth(newPaid.getMonth() + (v.months ?? 12));

                        const { data: upd, error: uerr } = await supabase
                          .from('facilities')
                          .update({ subscription_status: 'active', paid_until: newPaid.toISOString() })
                          .eq('id', facilityId)
                          .select()
                          .single();
                        if (uerr) throw uerr;
                        setFacility(upd as any);
                        setVoucher('');
                        Alert.alert('Hotovo', 'Předplatné bylo aktivováno.');
                      } catch (e: any) {
                        Alert.alert('Chyba', e.message ?? 'Voucher se nepodařilo uplatnit.');
                      }
                    }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.paymentCard}>
                <Text style={styles.demoModeText}>Tento dům je v ukázkovém režimu</Text>
              </View>
            )
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleIssuePress(item.id)}>
            <Card>
              <View style={styles.issueHeader}>
                <View style={styles.titleRow}>
                  <PriorityBadge 
                    priority={item.priority as any}
                    showText={false}
                    size="small"
                    showTooltip={false}
                  />
                  <Text style={styles.issueTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.badges}>
                  {getStatusBadge(item.status)}
                </View>
              </View>
              <View style={styles.reportedByRow}>
                <Text style={styles.reportedByLabel}>{t('issues.reportedBy')}</Text>
                <UserAvatar userId={item.created_by} size="small" showName={true} />
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
            <Text style={styles.emptyTitle}>{t('issues.noIssues')}</Text>
            <Text style={styles.emptyText}>{t('issues.noIssuesHint')}</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Button
          title={t('issues.createIssue')}
          onPress={handleCreateIssue}
        />
      </View>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pozvat do nemovitosti</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Sdílejte tento kód nebo QR kód s ostatními uživateli pro připojení k nemovitosti jako členové.
            </Text>
            
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeLabel}>Kód pro připojení:</Text>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
            </View>
            
            <View style={styles.qrCodeContainer}>
              {inviteCode && (
                <QRCode
                  value={inviteCode}
                  size={200}
                />
              )}
            </View>
            
            <Button
              title="Zavřít"
              onPress={() => setShowInviteModal(false)}
              style={styles.closeButton}
            />
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityInfo: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  facilityHeader: {
    marginBottom: spacing.sm,
  },
  facilityTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facilityName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  eyeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
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
  issuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 20,
    paddingBottom: spacing.md,
  },
  issuesTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  issuesCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  paymentCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  payDesc: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  demoModeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  issueTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  reportedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  reportedByLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  issueDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subscriptionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  subscriptionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  subscriptionValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  issuesByPriorityContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  issuesByPriorityTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  issuesByPriorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  priorityCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priorityCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  inviteCodeContainer: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  inviteCodeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inviteCode: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  closeButton: {
    width: '100%',
  },
});
