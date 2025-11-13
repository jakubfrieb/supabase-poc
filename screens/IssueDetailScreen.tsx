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

  const { updateIssue, deleteIssue } = useIssues(facilityId);
  const { messages, sendMessage, fetchMessages, loading: messagesLoading } = useIssueMessages(issueId);
  const { attachments, loading: attachmentsLoading, deleteAttachment } = useIssueAttachments(issueId);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdminOrOwner, loading: roleLoading } = useFacilityRole(facilityId);
  const scrollViewRef = useRef<ScrollView>(null);

  // Check if user can edit priority (author or admin/owner)
  const canEditPriority = issue && user && (issue.created_by === user.id || isAdminOrOwner);

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
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();

      if (error) throw error;
      setIssue(data);
    } catch (error) {
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
          <View style={styles.loadingContainer}>
            <Text>Loading...</Text>
          </View>
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
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteIconButton}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
          <View style={styles.badges}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusColors[issue.status] },
                ]}
              >
                <Text style={styles.badgeText}>{t(`issues.statusNames.${issue.status}`)}</Text>
              </View>
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
        <Card>
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
        
        {availableStatuses.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={styles.actionsLabel}>{t('issues.changeStatus')}</Text>
            <View style={styles.statusButtons}>
              {availableStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    { backgroundColor: statusColors[status] },
                  ]}
                  onPress={() => handleStatusChange(status)}
                  disabled={updating}
                >
                  <Text style={styles.statusButtonText}>{t(`issues.statusNames.${status}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
                  try {
                    await sendMessage(`[Smazáno] ${deleteReason.trim()}`, null);
                  } catch {}
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
    padding: spacing.xl,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 32,
    flex: 1,
  },
  deleteIconButton: {
    padding: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  actionsSection: {
    marginTop: spacing.xl,
  },
  actionsLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  dangerZone: {
    marginTop: 40,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  messageRow: {
    marginBottom: spacing.md,
  },
  messageBubble: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  messageText: {
    color: colors.text,
    marginBottom: 6,
  },
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageMetaLeft: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  messageMetaRight: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  messageBubbleMine: {
    backgroundColor: '#e7f8ee',
    borderColor: '#bfead1',
  },
  messageTime: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  messageImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  composer: {
    paddingVertical: spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  keyboardAvoid: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: 80, // Space for icons
    paddingBottom: 45, // Space for icons at bottom
    minHeight: 100,
    maxHeight: 200,
  },
  inputIcons: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attachButtonInline: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    marginTop: spacing.xl,
  },
  preview: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removePreview: {
    color: colors.error,
    marginTop: 6,
  },
  messagesLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  emptyMessages: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyMessagesText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
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
});

// Delete reason & image preview modals
// (placed after styles to minimize code movement)
// NOTE: Keeping simple inline JSX above for modals would be messy; implement here by augmenting return.
