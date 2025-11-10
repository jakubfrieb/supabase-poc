import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useIssues } from '../hooks/useIssues';
import { Issue, IssueStatus } from '../types/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import { useIssueMessages } from '../hooks/useIssueMessages';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'IssueDetail'>;

const statusColors = {
  open: colors.statusOpen,
  in_progress: colors.statusInProgress,
  resolved: colors.statusResolved,
  closed: colors.statusClosed,
};

const priorityColors = {
  low: colors.priorityLow,
  medium: colors.priorityMedium,
  high: colors.priorityHigh,
  urgent: colors.priorityUrgent,
};

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

  const { updateIssue, deleteIssue } = useIssues(facilityId);
  const { messages, sendMessage } = useIssueMessages(issueId);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

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
      Alert.alert('Success', 'Issue status updated');
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

  if (loading || !issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const availableStatuses = statusTransitions[issue.status];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <View style={styles.header}>
            <Text style={styles.title}>{issue.title}</Text>
            <View style={styles.badges}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: priorityColors[issue.priority] },
                ]}
              >
                <Text style={styles.badgeText}>{issue.priority}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusColors[issue.status] },
                ]}
              >
                <Text style={styles.badgeText}>
                  {issue.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          {issue.description && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.description}>{issue.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {new Date(issue.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>
                {new Date(issue.updated_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Messages */}
        <Card>
          <Text style={styles.sectionLabel}>Komunikace</Text>
          {messages.map((m) => (
            <View key={m.id} style={styles.messageRow}>
              <View style={styles.messageBubble}>
                {m.attachment_url ? (
                  <Image source={{ uri: m.attachment_url }} style={styles.messageImage} />
                ) : null}
                {m.content ? <Text style={styles.messageText}>{m.content}</Text> : null}
                <Text style={styles.messageTime}>
                  {new Date(m.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {localImage ? (
          <View style={styles.preview}>
            <Image source={{ uri: localImage }} style={styles.previewImage} />
            <TouchableOpacity onPress={() => setLocalImage(null)}>
              <Text style={styles.removePreview}>Odebrat</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: false,
                quality: 0.8,
              });
              if (!res.canceled) {
                setLocalImage(res.assets[0].uri);
              }
            }}
          >
            <Text style={styles.attachText}>Foto</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Napište zprávu…"
            value={messageText}
            onChangeText={setMessageText}
          />
          <Button
            title="Odeslat"
            onPress={async () => {
              let attachmentUrl: string | null = null;
              try {
                if (localImage) {
                  const resp = await fetch(localImage);
                  const blob = await resp.blob();
                  const fileExt = localImage.split('.').pop() || 'jpg';
                  const path = `issues/${issueId}/${Date.now()}.${fileExt}`;
                  const { error: upErr } = await supabase.storage
                    .from('issue-attachments')
                    .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: blob.type || 'image/jpeg' });
                  if (upErr) throw upErr;
                  const { data } = supabase.storage.from('issue-attachments').getPublicUrl(path);
                  attachmentUrl = data.publicUrl;
                }
                await sendMessage(messageText.trim() || null, attachmentUrl);
                setMessageText('');
                setLocalImage(null);
              } catch (e: any) {
                Alert.alert('Chyba', e.message ?? 'Zprávu se nepodařilo odeslat.');
              }
            }}
          />
        </View>

        {availableStatuses.length > 0 && (
          <View style={styles.actionsSection}>
            <Text style={styles.actionsLabel}>Change Status</Text>
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
                  <Text style={styles.statusButtonText}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() +
                      status.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.dangerZone}>
          <Button
            title="Delete Issue"
            onPress={handleDelete}
            variant="danger"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 32,
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
  },
  messageText: {
    color: colors.text,
    marginBottom: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  attachButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
});
