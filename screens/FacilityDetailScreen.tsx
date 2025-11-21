import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, ImageBackground, Pressable, Linking, Share } from 'react-native';
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
import { useFacilities } from '../hooks/useFacilities';
// Import expo-print with error handling for native module
let Print: typeof import('expo-print') | null = null;
try {
  Print = require('expo-print');
} catch (e) {
  console.warn('expo-print not available:', e);
}

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
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [isVoucherInputFocused, setIsVoucherInputFocused] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [isNotesInputFocused, setIsNotesInputFocused] = useState(false);
  const [addressDescriptionExpanded, setAddressDescriptionExpanded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'open' | 'all'>('open');
  const [filterPriority, setFilterPriority] = useState<IssuePriority | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [openRequestsMap, setOpenRequestsMap] = useState<Record<string, boolean>>({});

  const { issues, loading, fetchIssues } = useIssues(facilityId);
  const { role, isAdminOrOwner } = useFacilityRole(facilityId);
  const { updateFacility } = useFacilities();

  useEffect(() => {
    fetchFacility();
  }, [facilityId]);

  // Fetch open requests for all issues to show hammer icon
  const fetchOpenRequests = useCallback(async (issueIds: string[]) => {
    if (!facilityId || issueIds.length === 0) return;
    
    try {
      const { data: requests } = await supabase
        .from('issue_service_requests')
        .select('issue_id')
        .in('issue_id', issueIds)
        .eq('status', 'open');
      
      const map: Record<string, boolean> = {};
      requests?.forEach(req => {
        if (req.issue_id) {
          map[req.issue_id] = true;
        }
      });
      setOpenRequestsMap(map);
    } catch (error) {
      console.error('Error fetching open requests:', error);
    }
  }, [facilityId]);

  // Get issue IDs as string array for dependency
  const issueIds = useMemo(() => issues.map(i => i.id), [issues]);

  useEffect(() => {
    if (issueIds.length > 0) {
      fetchOpenRequests(issueIds);
    } else {
      setOpenRequestsMap({});
    }
  }, [issueIds, fetchOpenRequests]);

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


  const handleCreateIssue = () => {
    navigation.navigate('CreateIssue', { facilityId });
  };

  const handleIssuePress = (issueId: string) => {
    navigation.navigate('IssueDetail', { issueId, facilityId });
  };

  const handleEditNotes = () => {
    if (!facility) return;
    setEditingNotes((facility as any).notes || '');
    setNotesModalVisible(true);
  };

  const handleSaveNotes = async () => {
    if (!facility) return;
    try {
      await updateFacility(facility.id, {
        notes: editingNotes.trim() || null,
      } as any);
      await fetchFacility();
      setNotesModalVisible(false);
      setEditingNotes('');
      Alert.alert('Hotovo', 'Poznámky byly uloženy.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se uložit poznámky.');
    }
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

  // Filter issues based on filterStatus and filterPriority
  const filteredIssues = useMemo(() => {
    let filtered = issues;
    
    // Filter by status
    if (filterStatus === 'open') {
      filtered = filtered.filter(issue => issue.status !== 'closed');
    }
    
    // Filter by priority if set
    if (filterPriority) {
      filtered = filtered.filter(issue => issue.priority === filterPriority);
    }
    
    return filtered;
  }, [issues, filterStatus, filterPriority]);

  // Get subscription info
  const getSubscriptionInfo = () => {
    const subscriptionStatus = (facility as any)?.subscription_status;
    const paidUntil = (facility as any)?.paid_until;
    
    // Žlutá/oranžová: pozastaveno
    if (subscriptionStatus === 'paused') {
      return { 
        text: 'Pozastaveno', 
        isDemo: false,
        iconColor: colors.warning // žlutá/oranžová
      };
    }
    
    // Zelená: zaplaceno (active a paid_until v budoucnosti)
    if (subscriptionStatus === 'active' && paidUntil) {
      const paidUntilDate = new Date(paidUntil);
      const now = new Date();
      // Kontrola, zda je paid_until v budoucnosti
      if (paidUntilDate > now) {
        const daysLeft = Math.ceil((paidUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { 
          text: `${daysLeft} dní`, 
          isDemo: false,
          iconColor: colors.success // zelená
        };
      }
    }
    
    // Červená: nezaplaceno nebo DEMO (pending, nebo active s vypršeným/chybějícím paid_until)
    return { 
      text: 'DEMO', 
      isDemo: true,
      iconColor: colors.error // červená
    };
  };

  const handleAddressPress = () => {
    if (facility?.address) {
      const url = `https://mapy.cz/zakladni?q=${encodeURIComponent(facility.address)}`;
      Linking.openURL(url).catch(err => {
        console.error('Error opening mapy.cz:', err);
        Alert.alert('Chyba', 'Nepodařilo se otevřít mapy.cz');
      });
    }
  };

  const handlePrintInvite = async () => {
    if (!inviteCode || !facility) return;

    try {
      // Get QR code as base64 image
      let qrCodeBase64 = '';
      if (qrCodeRef.current) {
        try {
          qrCodeBase64 = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout'));
            }, 2000);
            qrCodeRef.current?.toDataURL((data: string) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });
        } catch (err) {
          console.warn('Could not get QR code as image:', err);
        }
      }

      // Create HTML content for printing
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Pozvánka k připojení k nemovitosti</title>
            <style>
              * {
                box-sizing: border-box;
              }
              @page {
                size: A4;
                margin: 20mm;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 20px;
                  font-size: 24px !important;
                }
                h1 {
                  font-size: 36px !important;
                }
                h2 {
                  font-size: 30px !important;
                }
                .code {
                  font-size: 48px !important;
                }
                .instructions {
                  font-size: 24px !important;
                }
                .instructions p {
                  font-size: 24px !important;
                }
                .instructions p strong {
                  font-size: 28px !important;
                }
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 24px !important;
                padding: 40px;
                text-align: center;
                max-width: 800px;
                margin: 0 auto;
              }
              h1 {
                color: #333;
                margin-bottom: 10px;
                font-size: 36px !important;
              }
              h2 {
                color: #666;
                margin-bottom: 30px;
                font-size: 30px !important;
              }
              .code {
                font-size: 48px !important;
                font-weight: bold;
                color: #007AFF;
                letter-spacing: 8px;
                margin: 30px 0;
                padding: 20px;
                border: 2px dashed #007AFF;
                display: inline-block;
              }
              .qr-code {
                margin: 30px auto;
                text-align: center;
              }
              .qr-code img {
                width: 300px;
                height: 300px;
                border: 2px solid #ccc;
              }
              .instructions {
                margin-top: 30px;
                color: #666;
                font-size: 24px !important;
                line-height: 1.8;
                text-align: left;
                max-width: 500px;
                margin-left: auto;
                margin-right: auto;
              }
              .instructions p {
                margin: 10px 0;
                font-size: 24px !important;
              }
              .instructions p strong {
                font-size: 28px !important;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1 style="color: #333; margin-bottom: 10px; font-size: 36px; font-weight: bold;">Pozvánka k připojení</h1>
            <h2 style="color: #666; margin-bottom: 30px; font-size: 30px; font-weight: bold;">${facility.name}</h2>
            ${facility.address ? `<p style="color: #666; margin-bottom: 20px; font-size: 24px;">${facility.address}</p>` : ''}
            <div style="font-size: 48px; font-weight: bold; color: #007AFF; letter-spacing: 8px; margin: 30px 0; padding: 20px; border: 2px dashed #007AFF; display: inline-block;">${inviteCode}</div>
            ${qrCodeBase64 ? `
              <div style="margin: 30px auto; text-align: center;">
                <img src="${qrCodeBase64}" alt="QR kód" style="width: 300px; height: 300px; border: 2px solid #ccc;" />
              </div>
            ` : ''}
            <div style="margin-top: 30px; color: #666; font-size: 24px; line-height: 1.8; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
              <p style="margin: 10px 0; font-size: 24px;"><strong style="font-size: 28px; font-weight: bold;">Jak se připojit:</strong></p>
              <p style="margin: 10px 0; font-size: 24px;">1. Otevřete aplikaci</p>
              <p style="margin: 10px 0; font-size: 24px;">2. Přejděte na "Připojit se k nemovitosti"</p>
              <p style="margin: 10px 0; font-size: 24px;">3. Zadejte kód výše nebo naskenujte QR kód</p>
            </div>
          </body>
        </html>
      `;

      // Print using expo-print if available, otherwise use Share API
      if (Print) {
        try {
          await Print.printAsync({
            html: htmlContent,
            base64: false,
          });
          return;
        } catch (printError) {
          console.warn('Print failed, falling back to Share:', printError);
        }
      }
      
      // Fallback to Share API
      await Share.share({
        message: `Pozvánka k připojení k nemovitosti ${facility.name}\n\nKód: ${inviteCode}\n\nPro připojení použijte tento kód v aplikaci nebo naskenujte QR kód.`,
        title: 'Pozvánka k připojení',
      });
    } catch (error: any) {
      console.error('Error printing invite:', error);
      Alert.alert('Chyba', 'Nepodařilo se vytisknout pozvánku.');
    }
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
          {(facility?.address || facility?.description) && (
            <TouchableOpacity
              onPress={() => setAddressDescriptionExpanded(!addressDescriptionExpanded)}
              style={styles.expandButton}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={addressDescriptionExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          )}
          <Text style={styles.facilityName}>{facility?.name}</Text>
          {isAdminOrOwner && (
            <View style={styles.headerIcons}>
              {(() => {
                const subInfo = getSubscriptionInfo();
                return (
                  <View style={styles.subscriptionIconContainer}>
                    <Ionicons 
                      name="cash-outline" 
                      size={22} 
                      color={subInfo.iconColor} 
                    />
                    <Text style={[styles.subscriptionIconText, { color: subInfo.iconColor }]}>
                      {subInfo.text}
                    </Text>
                  </View>
                );
              })()}
              <TouchableOpacity
                onPress={handleEditNotes}
                style={styles.notesButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="document-text-outline" 
                  size={22} 
                  color={(facility as any)?.notes ? colors.primary : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {addressDescriptionExpanded && (facility?.address || facility?.description) && (
          <View style={styles.addressDescriptionContent}>
            {facility?.address && (
              <View style={styles.addressContainer}>
                <Text style={styles.addressIcon}>📍</Text>
                <TouchableOpacity 
                  onPress={handleAddressPress}
                  activeOpacity={0.7}
                  style={styles.addressTextContainer}
                >
                  <Text style={styles.address}>{facility.address}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.primary} style={styles.addressLinkIcon} />
                </TouchableOpacity>
              </View>
            )}
            {facility?.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.facilityDescription}>
                  {facility.description}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Open issues by priority */}
        {(() => {
          const counts = getOpenIssuesByPriority();
          const totalOpen = Object.values(counts).reduce((sum, count) => sum + count, 0);
          const priorities: IssuePriority[] = ['idea', 'normal', 'high', 'critical', 'urgent'];
          const priorityItems = priorities
            .map(priority => ({ priority, count: counts[priority] }))
            .filter(item => item.count > 0);

          return (
            <View style={styles.issuesByPriorityContainer}>
              <Text style={styles.issuesByPriorityTitle}>Otevřené závady:</Text>
              <View style={styles.issuesByPriorityRow}>
                {totalOpen > 0 && priorityItems.map(({ priority, count }) => (
                  <TouchableOpacity
                    key={priority}
                    style={styles.priorityCountItem}
                    onPress={() => {
                      if (filterPriority === priority) {
                        setFilterPriority(null);
                      } else {
                        setFilterPriority(priority);
                        setFilterStatus('open');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View pointerEvents="none">
                      <PriorityBadge 
                        priority={priority}
                        showText={false}
                        size="small"
                      />
                    </View>
                    <Text style={[styles.priorityCount, filterPriority === priority && styles.priorityCountActive]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.filterContainer}>
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(true)}
                    style={styles.filterButton}
                  >
                    <Ionicons name="filter-outline" size={24} color={colors.primary} />
                    <Text style={styles.filterCount}>{filteredIssues.length}</Text>
                  </TouchableOpacity>
                  {(filterPriority !== null || filterStatus === 'all') && (
                    <TouchableOpacity
                      onPress={() => {
                        setFilterPriority(null);
                        setFilterStatus('open');
                      }}
                      style={styles.resetFilterButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })()}
      </View>

      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchIssues} />
        }
        ListHeaderComponent={
          (facility as any)?.subscription_status !== 'active' ? (
            role === 'owner' ? (
              <View style={styles.paymentCardWrapper}>
                <Card>
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
                  <TouchableOpacity onPress={() => setShowVoucherInput(!showVoucherInput)}>
                    <Text style={styles.voucherToggleText}>Máte voucher?</Text>
                  </TouchableOpacity>
                  {showVoucherInput && (
                    <View style={styles.voucherRow}>
                      <TextInput
                        style={[
                          styles.voucherInput,
                          isVoucherInputFocused && styles.voucherInputFocused,
                        ]}
                        value={voucher}
                        onChangeText={setVoucher}
                        placeholder="Voucher kód"
                        autoCapitalize="characters"
                        placeholderTextColor={colors.placeholder}
                        onFocus={() => setIsVoucherInputFocused(true)}
                        onBlur={() => setIsVoucherInputFocused(false)}
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
                            setShowVoucherInput(false);
                            Alert.alert('Hotovo', 'Předplatné bylo aktivováno.');
                          } catch (e: any) {
                            Alert.alert('Chyba', e.message ?? 'Voucher se nepodařilo uplatnit.');
                          }
                        }}
                      />
                    </View>
                  )}
                </Card>
              </View>
            ) : (
              <View style={styles.paymentCardWrapper}>
                <Card>
                  <Text style={styles.demoModeText}>Tento dům je v ukázkovém režimu</Text>
                </Card>
              </View>
            )
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleIssuePress(item.id)}
            style={styles.cardWrapper}
            delayPressIn={100}
          >
            {({ pressed }) => (
              <Card pressed={pressed}>
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
                    {openRequestsMap[item.id] && (
                      <Ionicons 
                        name="hammer-outline" 
                        size={20} 
                        color={colors.primary} 
                        style={styles.hammerIcon}
                      />
                    )}
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
            )}
          </Pressable>
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

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setNotesModalVisible(false);
          setEditingNotes('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>Poznámky k nemovitosti</Text>
              <TouchableOpacity onPress={() => {
                setNotesModalVisible(false);
                setEditingNotes('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                isNotesInputFocused && styles.inputFocused
              ]}
              placeholder="Zde můžete psát poznámky k nemovitosti..."
              placeholderTextColor={colors.placeholder}
              value={editingNotes}
              onChangeText={setEditingNotes}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              onFocus={() => setIsNotesInputFocused(true)}
              onBlur={() => setIsNotesInputFocused(false)}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Uložit"
                onPress={handleSaveNotes}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

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
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Pozvat do:</Text>
                <Text style={styles.modalFacilityName}>{facility?.name}</Text>
                {facility?.address && (
                  <View style={styles.modalAddressRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.modalAddress}>{facility.address}</Text>
                  </View>
                )}
              </View>
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
                  getRef={(ref) => {
                    if (ref) {
                      qrCodeRef.current = ref;
                    }
                  }}
                />
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handlePrintInvite}
                style={styles.printButton}
              >
                <Ionicons name="print-outline" size={24} color="#FFFFFF" />
                <Text style={styles.printButtonText}>Vytisknout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>Filtr závad</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.filterOption, filterStatus === 'open' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('open');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'open' && styles.filterOptionTextActive]}>
                Otevřené ({issues.filter(i => i.status !== 'closed').length})
              </Text>
              {filterStatus === 'open' && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, filterStatus === 'all' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'all' && styles.filterOptionTextActive]}>
                Všechny ({issues.length})
              </Text>
              {filterStatus === 'all' && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  facilityName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.xs,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subscriptionIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  subscriptionIconText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  notesButton: {
    padding: spacing.xs,
  },
  expandButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  addressDescriptionContent: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  descriptionContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  facilityDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  addressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressLinkIcon: {
    marginLeft: spacing.xs,
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  resetFilterButton: {
    padding: spacing.xs,
  },
  paymentCardWrapper: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
  voucherToggleText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.md,
    color: colors.text,
  },
  voucherInputFocused: {
    borderColor: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  cardWrapper: {
    marginBottom: spacing.md,
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
  hammerIcon: {
    marginLeft: spacing.xs,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
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
  priorityCountActive: {
    color: colors.primary,
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  printIconButton: {
    padding: spacing.xs,
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modalFacilityName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  modalAddress: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
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
  modalButtons: {
    marginTop: spacing.md,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flex: 1,
    minHeight: 48,
  },
  printButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  textArea: {
    minHeight: 120,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundDark,
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
