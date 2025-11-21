import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, Modal, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useIssues } from '../hooks/useIssues';
import { Issue, IssueStatus } from '../types/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import { useIssueMessages } from '../hooks/useIssueMessages';
import { useTranslation } from 'react-i18next';
import { useIssueAttachments } from '../hooks/useIssueAttachments';
import { AttachmentsGrid } from '../components/AttachmentsGrid';
import { useAuth } from '../contexts/AuthContext';
import ImageViewing from 'react-native-image-viewing';
import { PriorityBadge } from '../components/PriorityBadge';
import { UserAvatar } from '../components/UserAvatar';
import { useFacilityRole } from '../hooks/useFacilityRole';
import { PriorityPickerModal } from '../components/PriorityPickerModal';
import { IssuePriority } from '../types/database';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { useAppointments } from '../hooks/useAppointments';
import { useServiceProvider } from '../hooks/useServiceProvider';
import { useServiceRegistrations } from '../hooks/useServiceRegistrations';
import { useServiceApplications } from '../hooks/useServiceApplications';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { ServiceProviderCard } from '../components/ServiceProviderCard';
import { StatusPickerModal } from '../components/StatusPickerModal';
import { IssueDetailSkeleton } from '../components/IssueDetailSkeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'IssueDetail'>;

const statusColors = {
  open: colors.statusOpen,
  in_progress: colors.statusInProgress,
  resolved: colors.statusResolved,
  closed: colors.statusClosed,
};

// Priority colors are now handled by PriorityBadge component

const statusTransitions: Record<IssueStatus, IssueStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'open'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

export function IssueDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { issueId, facilityId } = route.params;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [localImageBase64, setLocalImageBase64] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Image preview & delete reason modals state
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationComment, setApplicationComment] = useState('');
  const [showCancelProviderModal, setShowCancelProviderModal] = useState(false);
  const [cancelProviderReason, setCancelProviderReason] = useState('');
  const [cancellingProvider, setCancellingProvider] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const { updateIssue, deleteIssue } = useIssues(facilityId);
  const { messages, sendMessage, fetchMessages, loading: messagesLoading } = useIssueMessages(issueId);
  const { attachments, loading: attachmentsLoading, deleteAttachment } = useIssueAttachments(issueId);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdminOrOwner, loading: roleLoading } = useFacilityRole(facilityId);
  const { requests, loading: requestsLoading, refetch: refetchRequests } = useServiceRequests(issueId);
  const { appointments, loading: appointmentsLoading } = useAppointments(issueId);
  const { provider: assignedProvider } = useServiceProvider(issue?.assigned_provider_id || undefined);
  const { provider: currentProvider } = useServiceProvider();
  const { registrations } = useServiceRegistrations();
  const scrollViewRef = useRef<ScrollView>(null);

  // Get open request for provider application
  const openRequest = requests.find(r => r.status === 'open');
  const { applications, createApplication, loading: applicationsLoading, refetch: refetchApplications } = useServiceApplications(openRequest?.id || '');

  // Check if current provider has already applied to this request
  const hasApplied = currentProvider && openRequest && user && applications.some(app => app.provider_id === user.id);

  // Refetch applications when openRequest changes
  useEffect(() => {
    if (openRequest?.id) {
      refetchApplications();
    }
  }, [openRequest?.id, refetchApplications]);

  // Check if user can edit priority (author or admin/owner)
  const canEditPriority = issue && user && (issue.created_by === user.id || isAdminOrOwner);

  // Check if current user is a provider (not admin/owner)
  const isProviderView = currentProvider && !isAdminOrOwner;

  // Provider can comment only if they have applied
  const canProviderComment = isProviderView && hasApplied;

  // Check if provider selection was cancelled (by checking messages)
  const isProviderSelectionCancelled = React.useMemo(() => {
    return messages.some(m =>
      m.content && m.content.includes('[Zrušeno výběr dodavatele]')
    );
  }, [messages]);

  // Collect all images for preview (attachments + message attachments)
  const allImages = React.useMemo(() => {
    const imageList: { uri: string }[] = [];
    // Add attachment images
    attachments.forEach(a => {
      if (a.content_type?.startsWith('image/')) {
        imageList.push({ uri: a.url });
      }
    });
    // Add message attachment images
    messages.forEach(m => {
      if (m.attachment_url) {
        imageList.push({ uri: m.attachment_url });
      }
    });
    return imageList;
  }, [attachments, messages]);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const fetchIssue = async () => {
    try {
      // First try normal access
      let { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();

      // If that fails (e.g., due to RLS for providers), try RPC function
      // PGRST116 = no rows returned, 42501 = insufficient privilege
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.code === '42501')) {
        console.log('Normal access failed, trying RPC function for provider access');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_issue_for_provider', { issue_uuid: issueId });

        if (rpcError) {
          console.error('RPC error:', rpcError);
          throw rpcError;
        }

        if (rpcData && rpcData.length > 0) {
          data = rpcData[0];
          error = null;
        } else {
          console.log('RPC returned no data');
          throw new Error('Issue not found or access denied');
        }
      }

      if (error) throw error;
      setIssue(data);
    } catch (error) {
      console.error('Error fetching issue:', error);
      Alert.alert('Error', 'Failed to load issue');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    try {
      setUpdating(true);
      await updateIssue(issueId, { status: newStatus });
      setIssue((prev) => (prev ? { ...prev, status: newStatus } : null));
      Alert.alert(t('common.success'), t('issues.statusUpdated'));
    } catch (error) {
      Alert.alert('Error', 'Failed to update issue status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!isAdminOrOwner) {
      Alert.alert('Chyba', 'Nemáte oprávnění smazat závadu. Pouze vlastník nebo správce nemovitosti může mazat závady.');
      return;
    }
    Alert.alert(
      'Delete Issue',
      'Are you sure you want to delete this issue? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIssue(issueId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete issue');
            }
          },
        },
      ]
    );
  };

  const handleCancelProviderSelection = async () => {
    if (!cancelProviderReason.trim()) {
      Alert.alert('Chyba', 'Prosím uveďte odůvodnění zrušení výběru dodavatele.');
      return;
    }

    try {
      setCancellingProvider(true);

      // Send message with cancellation reason
      await sendMessage(
        `[Zrušeno výběr dodavatele] ${cancelProviderReason.trim()}`,
        null
      );

      // Close all open requests for this issue
      const openRequests = requests.filter(r => r.status === 'open');
      if (openRequests.length > 0) {
        const requestIds = openRequests.map(r => r.id);
        const { error: closeError } = await supabase
          .from('issue_service_requests')
          .update({ status: 'closed' })
          .in('id', requestIds);

        if (closeError) {
          console.error('Error closing requests:', closeError);
          throw closeError;
        }
      }

      // Update issue - remove assigned provider and reset status
      await updateIssue(issueId, {
        assigned_provider_id: null,
        selected_appointment_id: null,
        status: 'open',
      });

      // Update local state
      setIssue((prev) =>
        prev ? {
          ...prev,
          assigned_provider_id: null,
          selected_appointment_id: null,
          status: 'open'
        } : null
      );

      // Refresh requests to reflect closed status
      await refetchRequests();

      // Close modal and reset form
      setShowCancelProviderModal(false);
      setCancelProviderReason('');

      Alert.alert('Hotovo', 'Výběr dodavatele byl zrušen.');
    } catch (error: any) {
      console.error('Error cancelling provider selection:', error);
      Alert.alert('Chyba', error.message || 'Nepodařilo se zrušit výběr dodavatele.');
    } finally {
      setCancellingProvider(false);
    }
  };

  const handleSendMessage = async () => {
    if (sendingMessage) return;

    let attachmentUrl: string | null = null;
    try {
      setSendingMessage(true);

      if (localImage && localImageBase64) {
        // Convert base64 to Uint8Array (React Native compatible)
        // Base64 decode function that works everywhere
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const bytes: number[] = [];
        let base64 = localImageBase64;

        // Remove any whitespace and padding
        base64 = base64.replace(/[^A-Za-z0-9\+\/]/g, '').replace(/=+$/, '');

        for (let i = 0; i < base64.length; i += 4) {
          const encoded1 = base64Chars.indexOf(base64.charAt(i));
          const encoded2 = base64Chars.indexOf(base64.charAt(i + 1));
          const encoded3 = base64Chars.indexOf(base64.charAt(i + 2));
          const encoded4 = base64Chars.indexOf(base64.charAt(i + 3));

          if (encoded1 === -1 || encoded2 === -1) break;

          const bitmap = (encoded1 << 18) | (encoded2 << 12) |
            ((encoded3 !== -1 ? encoded3 : 64) << 6) |
            (encoded4 !== -1 ? encoded4 : 64);

          bytes.push((bitmap >> 16) & 255);
          if (encoded3 !== -1) bytes.push((bitmap >> 8) & 255);
          if (encoded4 !== -1) bytes.push(bitmap & 255);
        }

        const uint8Array = new Uint8Array(bytes);

        // Determine file extension and content type
        const fileExt = localImage.split('.').pop()?.toLowerCase() || 'jpg';
        const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'gif' ? 'image/gif' : 'image/jpeg';

        const path = `issues/${issueId}/${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from('issue-attachments')
          .upload(path, uint8Array, {
            cacheControl: '3600',
            upsert: false,
            contentType
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('issue-attachments').getPublicUrl(path);
        attachmentUrl = data.publicUrl;
      }

      await sendMessage(messageText.trim() || null, attachmentUrl);

      // Clear form immediately
      setMessageText('');
      setLocalImage(null);
      setLocalImageBase64(null);

      // Message is already added via optimistic update in sendMessage
      // Real-time subscription will update it with the real ID when it arrives
    } catch (e: any) {
      Alert.alert('Chyba', e.message ?? 'Zprávu se nepodařilo odeslat.');
    } finally {
      setSendingMessage(false);
    }
  };

  const ensureMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Přístup zamítnut', 'Pro přidání fotky povolte přístup ke galerii.');
      return false;
    }
    return true;
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Přístup zamítnut', 'Pro pořízení fotky povolte přístup ke kameře.');
      return false;
    }
    return true;
  };

  if (loading || !issue) {
    return (
      <ImageBackground
        source={require('../assets/background/theme_1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.container}>
          <IssueDetailSkeleton />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  const availableStatuses = statusTransitions[issue.status];

  return (
    <ImageBackground
      source={require('../assets/background/theme_1.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
          >
            <Card>
              <View style={styles.headerTop}>
                <View style={styles.titleRow}>
                  <PriorityBadge
                    priority={issue.priority as any}
                    showText={false}
                    size="small"
                    showTooltip={!canEditPriority}
                    onPress={canEditPriority ? () => setShowPriorityPicker(true) : undefined}
                  />
                  <Text style={styles.title}>{issue.title}</Text>
                </View>
                {isAdminOrOwner && (
                  <TouchableOpacity
                    onPress={() => setShowDeleteModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteIconButton}
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.badges}>
                <TouchableOpacity
                  style={[
                    styles.badge,
                    { backgroundColor: statusColors[issue.status] },
                    !isProviderView && availableStatuses.length > 0 && { paddingRight: 8 }
                  ]}
                  onPress={() => {
                    if (!isProviderView && availableStatuses.length > 0) {
                      setShowStatusPicker(true);
                    }
                  }}
                  disabled={isProviderView || availableStatuses.length === 0}
                >
                  <Text style={styles.badgeText}>{t(`issues.statusNames.${issue.status}`)}</Text>
                  {!isProviderView && availableStatuses.length > 0 && (
                    <Ionicons name="chevron-down" size={16} color={colors.textOnPrimary} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              </View>

              {issue.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{t('issues.descriptionLabel')}</Text>
                  <Text style={styles.description}>{issue.description}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('issues.details')}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('issues.reportedBy')}</Text>
                  <UserAvatar userId={issue.created_by} size="small" showName={true} />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('issues.created')}</Text>
                  <Text style={styles.detailValue}>
                    {new Date(issue.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('issues.lastUpdated')}</Text>
                  <Text style={styles.detailValue}>
                    {new Date(issue.updated_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              {/* Attachments inside details card (read-only list) */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('issues.attachments')}</Text>
                {attachmentsLoading ? (
                  <View style={styles.messagesLoading}>
                    <Text style={styles.loadingText}>Načítání příloh...</Text>
                  </View>
                ) : (
                  <AttachmentsGrid
                    items={attachments.map(a => ({ id: a.id, uri: a.url, url: a.url, fileName: a.file_name, contentType: a.content_type }))}
                    onPreview={(idx) => {
                      const a = attachments[idx];
                      if (!a || !a.content_type?.startsWith('image/')) return;
                      // Find index in allImages
                      const imageIndex = allImages.findIndex(img => img.uri === a.url);
                      if (imageIndex >= 0) {
                        setPreviewIndex(imageIndex);
                        setShowPreview(true);
                      }
                    }}
                    onRemove={(idx) => {
                      const a = attachments[idx];
                      if (!a) return;
                      deleteAttachment(a.id);
                    }}
                  />
                )}
              </View>
            </Card>

            {/* Messages */}
            <Card style={styles.cardSpacing}>
              <Text style={styles.sectionLabel}>Komunikace</Text>
              {messagesLoading ? (
                <View style={styles.messagesLoading}>
                  <Text style={styles.loadingText}>Načítání zpráv...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyMessages}>
                  <Text style={styles.emptyMessagesText}>Zatím žádné zprávy</Text>
                </View>
              ) : (
                messages.map((m) => {
                  const isMine = user && m.user_id === user.id;
                  return (
                    <View key={m.id} style={[styles.messageRow, { alignItems: 'flex-start' }]}>
                      <View style={[styles.messageBubble, isMine && styles.messageBubbleMine, isMine ? { marginLeft: 15, marginRight: 0 } : { marginRight: 15, marginLeft: 0 }]}>
                        {m.attachment_url ? (
                          <TouchableOpacity onPress={() => {
                            const imageIndex = allImages.findIndex(img => img.uri === m.attachment_url);
                            if (imageIndex >= 0) {
                              setPreviewIndex(imageIndex);
                              setShowPreview(true);
                            }
                          }}>
                            <Image source={{ uri: m.attachment_url }} style={styles.messageImage} />
                          </TouchableOpacity>
                        ) : null}
                        {m.content ? <Text style={styles.messageText}>{m.content}</Text> : null}
                        <View style={styles.messageMetaRow}>
                          <Text style={styles.messageMetaLeft}>
                            od: {isMine ? 'já' : 'uživatel'}
                          </Text>
                          <Text style={styles.messageMetaRight}>
                            {new Date(m.created_at).toLocaleTimeString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </Card>

            {localImage ? (
              <View style={styles.preview}>
                <Image source={{ uri: localImage }} style={styles.previewImage} />
                <TouchableOpacity onPress={() => {
                  setLocalImage(null);
                  setLocalImageBase64(null);
                }}>
                  <Text style={styles.removePreview}>Odebrat</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Only show composer if user is not a provider, or if provider has applied */}
            {(!isProviderView || canProviderComment) && (
              <View style={styles.composer}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Napište zprávu…"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.inputIcons}>
                    <TouchableOpacity
                      style={styles.attachButtonInline}
                      onPress={async () => {
                        const ok = await ensureMediaLibraryPermission();
                        if (!ok) return;
                        const res = await ImagePicker.launchImageLibraryAsync({
                          allowsEditing: false,
                          quality: 0.8,
                          base64: true,
                        });
                        if (!res.canceled) {
                          setLocalImage(res.assets[0].uri);
                          setLocalImageBase64(res.assets[0].base64 || null);
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="image-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachButtonInline}
                      onPress={async () => {
                        const ok = await ensureCameraPermission();
                        if (!ok) return;
                        const res = await ImagePicker.launchCameraAsync({
                          allowsEditing: false,
                          quality: 0.8,
                          base64: true,
                        });
                        if (!res.canceled) {
                          setLocalImage(res.assets[0].uri);
                          setLocalImageBase64(res.assets[0].base64 || null);
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="camera-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendButton, sendingMessage && styles.sendButtonDisabled]}
                      onPress={handleSendMessage}
                      disabled={sendingMessage || (!messageText.trim() && !localImage)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {sendingMessage ? (
                        <Ionicons name="hourglass-outline" size={20} color={colors.textOnPrimary} />
                      ) : (
                        <Ionicons name="paper-plane" size={20} color={colors.textOnPrimary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Status buttons removed - moved to header dropdown */}

            {/* Service Provider Section */}
            {issue && (
              <Card style={styles.cardSpacing}>
                {/* Only show title and WorkflowStepper for admins/owners, not for providers */}
                {!isProviderView && !isProviderSelectionCancelled && (
                  <>
                    <Text style={styles.sectionLabel}>Dodavatel a termín</Text>
                    <WorkflowStepper
                      currentStep={
                        issue.status === 'resolved' || issue.status === 'closed' ? 'completed' :
                          issue.selected_appointment_id ? 'repair' :
                            issue.assigned_provider_id ? 'appointment' :
                              requests.length > 0 ? 'selection' : 'request'
                      }
                    />
                  </>
                )}

                {!issue.assigned_provider_id && isAdminOrOwner && !isProviderSelectionCancelled && (
                  <>
                    {requests.length === 0 && (
                      <Button
                        title="Poptat dodavatele"
                        onPress={() => navigation.navigate('ServiceRequest', { issueId })}
                        style={styles.button}
                      />
                    )}

                    {requests.length > 0 && (
                      <View style={styles.requestInfo}>
                        {(() => {
                          const openRequests = requests.filter(r => r.status === 'open');
                          const closedRequests = requests.filter(r => r.status === 'closed');
                          const requestToShow = openRequests[0] || closedRequests[0];

                          // Get unique service names from open requests
                          const serviceNames = openRequests
                            .map(r => (r as any).services?.name)
                            .filter(Boolean)
                            .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates

                          return (
                            <>
                              {openRequests.length > 0 && (
                                <View style={styles.servicesList}>
                                  <Text style={styles.requestInfoLabel}>Poptávané služby:</Text>
                                  <View style={styles.servicesTags}>
                                    {serviceNames.map((serviceName, index) => (
                                      <View key={index} style={styles.serviceTag}>
                                        <Text style={styles.serviceTagText}>{serviceName}</Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              )}
                              {closedRequests.length > 0 && openRequests.length === 0 && (
                                <Text style={styles.requestInfoText}>
                                  Poptávka byla uzavřena. Zobrazte přihlášky pro pokračování.
                                </Text>
                              )}
                              {requestToShow && (
                                <Button
                                  title={openRequests.length > 0 ? "Zobrazit přihlášky" : "Pokračovat s výběrem"}
                                  onPress={() => {
                                    navigation.navigate('ServiceApplications', {
                                      requestId: requestToShow.id,
                                      issueId,
                                    });
                                  }}
                                  variant="outline"
                                  style={styles.button}
                                />
                              )}
                              <Button
                                title="Přidat další službu"
                                onPress={() => navigation.navigate('ServiceRequest', { issueId })}
                                variant="outline"
                                style={styles.button}
                              />
                              <Button
                                title="Zrušit výběr dodavatele"
                                onPress={() => setShowCancelProviderModal(true)}
                                variant="outline"
                                style={styles.button}
                              />
                            </>
                          );
                        })()}
                      </View>
                    )}
                  </>
                )}

                {/* Only show assigned provider section if:
                1. User is admin/owner (not provider view), OR
                2. Provider is viewing and they are the assigned provider (for this issue) */}
                {issue.assigned_provider_id && assignedProvider && (
                  (!isProviderView || (isProviderView && issue.assigned_provider_id === user?.id)) && (
                    <View style={styles.providerSection}>
                      <ServiceProviderCard
                        provider={assignedProvider}
                        showSelectButton={false}
                        showContactButton={true}
                      />
                      {!issue.selected_appointment_id && issue.assigned_provider_id === user?.id && (
                        <Button
                          title="Navrhnout termín"
                          onPress={() => navigation.navigate('AppointmentSelection', {
                            issueId,
                            providerId: issue.assigned_provider_id!,
                          })}
                          style={styles.button}
                        />
                      )}
                      {isAdminOrOwner && (
                        <Button
                          title="Zrušit výběr dodavatele"
                          onPress={() => setShowCancelProviderModal(true)}
                          variant="outline"
                          style={styles.button}
                        />
                      )}
                    </View>
                  )
                )}

                {/* Show message if provider selection was cancelled */}
                {isProviderSelectionCancelled && !issue.assigned_provider_id && isAdminOrOwner && (
                  <View style={styles.cancelledInfo}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.cancelledInfoText}>
                      Výběr dodavatele byl zrušen. Pro tuto závadu již není možné znovu vybrat dodavatele.
                    </Text>
                  </View>
                )}

                {/* Provider Application Section */}
                {currentProvider && openRequest && !issue.assigned_provider_id && (
                  <View style={styles.providerApplicationSection}>
                    {(openRequest as any).services && (
                      <View style={styles.requestInfoCard}>
                        <View style={styles.requestInfoRow}>
                          <Ionicons name="construct-outline" size={20} color={colors.primary} />
                          <Text style={styles.requestServiceName}>
                            {(openRequest as any).services.name}
                          </Text>
                        </View>
                        {(() => {
                          const hasActiveService = registrations.some(
                            reg => reg.service_id === openRequest.service_id &&
                              reg.status === 'active' &&
                              (!reg.paid_until || new Date(reg.paid_until) > new Date())
                          );

                          if (!hasActiveService) {
                            return (
                              <View style={styles.warningBox}>
                                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                                <Text style={styles.warningText}>
                                  Nemáte aktivní registraci pro tuto službu. Zaregistrujte se nejprve v sekci "Moje služby".
                                </Text>
                              </View>
                            );
                          }

                          if (hasApplied) {
                            return (
                              <View style={styles.appliedBox}>
                                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                                <Text style={styles.appliedText}>
                                  Již jste se k této poptávce přihlásili. Čekáte na rozhodnutí.
                                </Text>
                              </View>
                            );
                          }

                          return (
                            <>
                              <Button
                                title="Přihlásit se k poptávce"
                                onPress={() => {
                                  setShowApplicationModal(true);
                                }}
                                loading={applicationsLoading}
                                style={styles.button}
                              />
                            </>
                          );
                        })()}
                      </View>
                    )}
                  </View>
                )}

                {appointments.length > 0 && (
                  <View style={styles.appointmentsSection}>
                    <Text style={styles.sectionLabel}>Termíny</Text>
                    {appointments.slice(0, 3).map((appointment) => (
                      <TouchableOpacity
                        key={appointment.id}
                        onPress={() => navigation.navigate('AppointmentSelection', {
                          issueId,
                          providerId: appointment.provider_id,
                        })}
                      >
                        <Text style={styles.appointmentText}>
                          {appointment.proposed_date} {appointment.proposed_time}
                          {appointment.status === 'confirmed' && ' ✓'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {appointments.length > 3 && (
                      <Button
                        title="Zobrazit všechny termíny"
                        onPress={() => navigation.navigate('AppointmentSelection', {
                          issueId,
                          providerId: issue.assigned_provider_id || undefined,
                        })}
                        variant="outline"
                        style={styles.button}
                      />
                    )}
                  </View>
                )}
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {/* Image preview modal with zoom */}
        {allImages.length > 0 && (
          <ImageViewing
            images={allImages}
            imageIndex={previewIndex ?? 0}
            visible={showPreview && previewIndex !== null}
            onRequestClose={() => {
              setShowPreview(false);
              setPreviewIndex(null);
            }}
            swipeToCloseEnabled={true}
            doubleTapToZoomEnabled={true}
          />
        )}

        {/* Priority picker modal */}
        {issue && (
          <PriorityPickerModal
            visible={showPriorityPicker}
            currentPriority={issue.priority as IssuePriority}
            onSelect={async (priority: IssuePriority) => {
              try {
                setUpdating(true);
                const updated = await updateIssue(issueId, { priority });
                if (updated) {
                  // Update local state immediately
                  setIssue((prev) => (prev ? { ...prev, priority } : null));
                  // Close the modal
                  setShowPriorityPicker(false);
                  // Refresh the issue to ensure we have the latest data from DB
                  await fetchIssue();
                }
              } catch (error: any) {
                console.error('Error updating priority:', error);
                Alert.alert('Chyba', error?.message || 'Nepodařilo se změnit prioritu.');
              } finally {
                setUpdating(false);
              }
            }}
            onClose={() => setShowPriorityPicker(false)}
          />
        )}

        {/* Application modal */}
        <Modal visible={showApplicationModal} transparent animationType="slide" onRequestClose={() => setShowApplicationModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Přihláška k poptávce</Text>
                <TouchableOpacity onPress={() => {
                  setShowApplicationModal(false);
                  setApplicationComment('');
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>
                Chcete přidat komentář k vaší přihlášce? (volitelné)
              </Text>
              <TextInput
                style={styles.inputReason}
                placeholder="Komentář k přihlášce..."
                value={applicationComment}
                onChangeText={setApplicationComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Přihlásit"
                  onPress={async () => {
                    if (!openRequest) return;
                    try {
                      await createApplication({
                        request_id: openRequest.id,
                        message: applicationComment.trim() || undefined,
                      });
                      setShowApplicationModal(false);
                      setApplicationComment('');
                      Alert.alert(
                        'Hotovo',
                        'Vaše přihláška byla úspěšně odeslána!',
                        [{ text: 'OK' }]
                      );
                      refetchApplications();
                    } catch (error: any) {
                      Alert.alert('Chyba', error.message || 'Nepodařilo se přihlásit k poptávce.');
                    }
                  }}
                  style={styles.modalButton}
                  loading={applicationsLoading}
                  disabled={applicationsLoading}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete reason modal */}
        <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Smazat závadu</Text>
                <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>Uveďte prosím důvod zrušení. Důvod se uloží do komunikace.</Text>
              <TextInput
                style={styles.inputReason}
                placeholder="Důvod zrušení"
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.modalButtons}>
                <Button title="Zrušit" variant="outline" onPress={() => setShowDeleteModal(false)} style={styles.modalButton} />
                <Button
                  title="Smazat"
                  variant="danger"
                  onPress={async () => {
                    if (!deleteReason.trim()) return;
                    if (!isAdminOrOwner) {
                      Alert.alert('Chyba', 'Nemáte oprávnění smazat závadu. Pouze vlastník nebo správce nemovitosti může mazat závady.');
                      return;
                    }
                    try {
                      await sendMessage(`[Smazáno] ${deleteReason.trim()}`, null);
                    } catch { }
                    try {
                      await deleteIssue(issueId);
                      setShowDeleteModal(false);
                      navigation.goBack();
                    } catch (e) {
                      Alert.alert('Chyba', 'Nepodařilo se smazat závadu.');
                    }
                  }}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Cancel provider selection modal */}
        <Modal visible={showCancelProviderModal} transparent animationType="slide" onRequestClose={() => {
          setShowCancelProviderModal(false);
          setCancelProviderReason('');
        }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Zrušit výběr dodavatele</Text>
                <TouchableOpacity onPress={() => {
                  setShowCancelProviderModal(false);
                  setCancelProviderReason('');
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>
                Uveďte prosím odůvodnění zrušení výběru dodavatele. Odůvodnění se uloží do komunikace a pro tuto závadu již nebude možné znovu vybrat dodavatele.
              </Text>
              <TextInput
                style={styles.inputReason}
                placeholder="Odůvodnění zrušení výběru..."
                value={cancelProviderReason}
                onChangeText={setCancelProviderReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Zrušit výběr"
                  variant="danger"
                  onPress={handleCancelProviderSelection}
                  style={styles.modalButton}
                  loading={cancellingProvider}
                  disabled={cancellingProvider || !cancelProviderReason.trim()}
                />
              </View>
            </View>
          </View>
        </Modal>
        <StatusPickerModal
          visible={showStatusPicker}
          currentStatus={issue.status}
          availableStatuses={availableStatuses}
          onSelect={handleStatusChange}
          onClose={() => setShowStatusPicker(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  deleteIconButton: {
    padding: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  actionsSection: {
    marginTop: spacing.xl,
  },
  actionsLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  statusButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  dangerZone: {
    marginTop: 40,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  messageRow: {
    marginBottom: spacing.md,
    width: '100%',
  },
  messageBubble: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageMetaLeft: {
    fontSize: 10,
    color: colors.textSecondary,
    marginRight: 8,
  },
  messageMetaRight: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  messageBubbleMine: {
    backgroundColor: colors.primaryLight,
    borderColor: 'transparent',
    alignSelf: 'flex-end',
  },
  messageTime: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  composer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  keyboardAvoid: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 100, // space for icons
    minHeight: 40,
    maxHeight: 100,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputIcons: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attachButtonInline: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  attachButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardSpacing: {
    marginTop: spacing.md,
  },
  preview: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  removePreview: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  messagesLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
  },
  emptyMessages: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyMessagesText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  previewCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewImageLarge: {
    width: '100%',
    height: '70%',
    resizeMode: 'contain',
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  previewCloseButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 560,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  inputReason: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  button: {
    marginTop: spacing.md,
  },
  requestInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  requestInfoText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  requestInfoLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  servicesList: {
    marginBottom: spacing.md,
  },
  servicesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  serviceTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  serviceTagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  providerSection: {
    marginTop: spacing.md,
  },
  providerApplicationSection: {
    marginTop: spacing.md,
  },
  requestInfoCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
  },
  requestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestServiceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  appliedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  appliedText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  appointmentsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  appointmentText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.sm,
  },
  cancelButton: {
    borderColor: colors.error,
  },
  cancelledInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cancelledInfoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

// Delete reason & image preview modals
// (placed after styles to minimize code movement)
// NOTE: Keeping simple inline JSX above for modals would be messy; implement here by augmenting return.
