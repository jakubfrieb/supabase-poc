import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, TextInput, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIssues } from '../hooks/useIssues';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { DeleteButton } from '../components/DeleteButton';
import { IssuePriority } from '../types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'CreateIssue'>;

// Status/priority are defaulted in DB (open/medium)

export function CreateIssueScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { facilityId } = route.params;
  const { createIssue } = useIssues(facilityId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('normal');
  const [requiresCooperation, setRequiresCooperation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ uri: string; base64: string | null }[]>([]);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an issue title');
      return;
    }

    try {
      setLoading(true);
      const { user } = await supabase.auth.getUser();
      const created = await createIssue({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority,
        facility_id: facilityId,
        requires_cooperation: requiresCooperation,
        cooperation_user_id: requiresCooperation && user.data.user ? user.data.user.id : undefined,
      });
      // After creating the issue, upload any attachments into issue_attachments
      if (created?.id && attachments.length > 0) {
        for (const att of attachments) {
          try {
            let uint8Array: Uint8Array | null = null;
            // Prefer base64 if available (camera often provides it)
            if (att.base64) {
              const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
              const bytes: number[] = [];
              let base64 = att.base64.replace(/[^A-Za-z0-9\+\/]/g, '').replace(/=+$/, '');
              for (let i = 0; i < base64.length; i += 4) {
                const e1 = base64Chars.indexOf(base64.charAt(i));
                const e2 = base64Chars.indexOf(base64.charAt(i + 1));
                const e3 = base64Chars.indexOf(base64.charAt(i + 2));
                const e4 = base64Chars.indexOf(base64.charAt(i + 3));
                if (e1 === -1 || e2 === -1) break;
                const bitmap = (e1 << 18) | (e2 << 12) | ((e3 !== -1 ? e3 : 64) << 6) | (e4 !== -1 ? e4 : 64);
                bytes.push((bitmap >> 16) & 255);
                if (e3 !== -1) bytes.push((bitmap >> 8) & 255);
                if (e4 !== -1) bytes.push(bitmap & 255);
              }
              uint8Array = new Uint8Array(bytes);
            } else {
              // Fallback: read the file bytes from URI
              const res = await fetch(att.uri);
              const ab = await res.arrayBuffer();
              uint8Array = new Uint8Array(ab);
            }
            if (!uint8Array) continue;

            const fileExtGuess = att.uri.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
            const fileExt = fileExtGuess && fileExtGuess.length <= 4 ? fileExtGuess : 'jpg';
            let contentType = 'image/jpeg';
            if (fileExt === 'png') contentType = 'image/png';
            else if (fileExt === 'gif') contentType = 'image/gif';
            else if (fileExt === 'webp') contentType = 'image/webp';

            const path = `issues/${created.id}/${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
            const { error: upErr } = await supabase.storage
              .from('issue-attachments')
              .upload(path, uint8Array, { cacheControl: '3600', upsert: false, contentType });
            if (upErr) continue;
            const { data } = supabase.storage.from('issue-attachments').getPublicUrl(path);
            await supabase
              .from('issue_attachments')
              .insert([{
                issue_id: created.id,
                uploaded_by: (await supabase.auth.getUser()).data.user?.id,
                file_name: `photo.${fileExt}`,
                content_type: contentType,
                file_size: uint8Array.byteLength,
                url: data.publicUrl,
              }]);
          } catch {}
        }
      }
      setAttachments([]);
      Alert.alert('Success', 'Issue created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../assets/background/theme_1.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('issues.createTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={`${t('issues.title')} *`}
              placeholder={t('issues.title')}
              value={title}
              onChangeText={setTitle}
              autoCapitalize="sentences"
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Priorita</Text>
              <View style={styles.priorityContainer}>
                {(['idea', 'normal', 'high', 'critical', 'urgent'] as IssuePriority[]).map((prio) => {
                  const config = getPriorityConfig(prio);
                  const isSelected = priority === prio;
                  const isBubble = prio === 'normal' || prio === 'high' || prio === 'critical';
                  const exclamationMarks = prio === 'normal' ? '!' : prio === 'high' ? '!!' : prio === 'critical' ? '!!!' : null;
                  
                  return (
                    <TouchableOpacity
                      key={prio}
                      style={styles.priorityOption}
                      onPress={() => setPriority(prio)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.priorityIconContainer,
                        isSelected && { borderColor: config.color, borderWidth: 2, backgroundColor: `${config.color}20` }
                      ]}>
                        {isBubble ? (
                          <View style={[styles.priorityBubble, { borderColor: config.color }]}>
                            <Text style={[styles.priorityExclamation, { color: config.color }]}>
                              {exclamationMarks}
                            </Text>
                          </View>
                        ) : (
                          <Ionicons name={config.icon as any} size={28} color={config.color} />
                        )}
                      </View>
                      <Text style={[
                        styles.priorityLabel,
                        isSelected && { color: config.color, fontWeight: fontWeight.semibold }
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('issues.description')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    isDescriptionFocused && styles.inputFocused
                  ]}
                  placeholder={t('issues.description')}
                  placeholderTextColor={colors.placeholder}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  onFocus={() => setIsDescriptionFocused(true)}
                  onBlur={() => setIsDescriptionFocused(false)}
                />
                <View style={styles.inputIcons}>
                  <TouchableOpacity
                    style={styles.attachButtonInline}
                    onPress={async () => {
                      const ok = await ensureMediaLibraryPermission();
                      if (!ok) return;
                      const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: false,
                        quality: 0.8,
                        base64: true,
                        selectionLimit: 0,
                      });
                      if (!res.canceled) {
                        const next = res.assets.map((as) => ({ uri: as.uri, base64: as.base64 ?? null }));
                        setAttachments((prev) => [...prev, ...next]);
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
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: false,
                        quality: 0.8,
                        base64: true,
                      });
                      if (!res.canceled) {
                        const as = res.assets[0];
                        setAttachments((prev) => [...prev, { uri: as.uri, base64: as.base64 ?? null }]);
                      }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="camera-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {loading ? (
                      <Ionicons name="hourglass-outline" size={20} color={colors.textOnPrimary} />
                    ) : (
                      <Ionicons name="paper-plane" size={20} color={colors.textOnPrimary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRequiresCooperation(!requiresCooperation)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, requiresCooperation && styles.checkboxChecked]}>
                  {requiresCooperation && (
                    <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
                  )}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>Nutná moje součinnost při opravě</Text>
                  <Text style={styles.checkboxHint}>
                    (např. přístup do bytu, přítomnost při opravě)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {attachments.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.sectionLabel}>{t('issues.attachments')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {attachments.map((att, idx) => (
                    <View key={`${att.uri}-${idx}`} style={{ marginRight: 8, marginBottom: 8 }}>
                      <View style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                        <Image source={{ uri: att.uri }} style={{ width: '100%', height: '100%' }} />
                      </View>
                      <DeleteButton
                        onDelete={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        size={14}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    gap: spacing.xs,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 10,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    paddingRight: 80, // space for icons
    paddingBottom: 45, // space for icons at bottom
    minHeight: 120,
    maxHeight: 240,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
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
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  priorityOption: {
    alignItems: 'center',
    flex: 1,
  },
  priorityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  priorityBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  priorityExclamation: {
    fontWeight: fontWeight.bold,
    fontSize: 14,
    lineHeight: 16,
  },
  priorityLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  checkboxHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

// Priority configuration matching PriorityBadge
const getPriorityConfig = (prio: IssuePriority) => {
  const configs: Record<IssuePriority, { color: string; icon: string; label: string }> = {
    idea: {
      color: '#FFD700',
      icon: 'bulb-outline',
      label: 'Nápad',
    },
    normal: {
      color: '#81C784',
      icon: 'chatbubble-outline',
      label: 'Normální',
    },
    high: {
      color: '#FFB74D',
      icon: 'chatbubble-outline',
      label: 'Vysoká',
    },
    critical: {
      color: '#EF5350',
      icon: 'chatbubble-outline',
      label: 'Kritická',
    },
    urgent: {
      color: '#C62828',
      icon: 'ban-outline',
      label: 'Urgentní',
    },
  };
  return configs[prio];
};
