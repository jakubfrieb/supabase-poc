import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ImageBackground, Image, ActionSheetIOS, Platform, Share, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useFacilities } from '../hooks/useFacilities';
import { useUserProfile } from '../hooks/useUserProfile';
import { useFacilityRole } from '../hooks/useFacilityRole';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { FacilityMembersModal } from '../components/FacilityMembersModal';
import { Facility } from '../types/database';
import { supabase } from '../lib/supabase';
import QRCode from 'react-native-qrcode-svg';
import { useServiceProvider } from '../hooks/useServiceProvider';
import { useServiceRegistrations } from '../hooks/useServiceRegistrations';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
// Import expo-print with error handling for native module
let Print: typeof import('expo-print') | null = null;
try {
  Print = require('expo-print');
} catch (e) {
  console.warn('expo-print not available:', e);
}

// House role options
const houseRoleOptions = [
  'Člen výboru',
  'Předseda',
  'Místopředseda',
  'Kontrolní komise',
  'Pokladník',
  'Správce',
  'Jiné',
];

// Component for facility card with role check
function FacilityCard({
  item,
  onEdit,
  onUsers,
  onNotes,
  onDelete,
  onLeave,
  onShare
}: {
  item: Facility;
  onEdit: (f: Facility) => void;
  onUsers: (id: string) => void;
  onNotes: (f: Facility) => void;
  onDelete: (id: string) => void;
  onLeave: (id: string) => void;
  onShare: (f: Facility) => void;
}) {
  const { role } = useFacilityRole(item.id);
  const { t } = useTranslation();
  const isOwner = role === 'owner';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.facilityName}>{item.name}</Text>
        <View style={styles.actionButtons}>
          {isOwner && (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.usersButton}
                onPress={() => onUsers(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="people-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => onShare(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="eye-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash" size={22} color="#E53935" />
              </TouchableOpacity>
            </>
          )}
          {!isOwner && (
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={() => onLeave(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#E53935" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {item.description ? <Text style={styles.facilityDesc}>{item.description}</Text> : null}
      {item.address ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.label}>{t('profile.status')}:</Text>
        <Text style={styles.value}>
          {t(`profile.statuses.${item.subscription_status || 'pending'}`)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{t('profile.paidUntil')}:</Text>
        <Text style={styles.value}>
          {item.paid_until ? new Date(item.paid_until).toLocaleDateString('cs-CZ') : '—'}
        </Text>
      </View>
      {(item as any).notes && (
        <View style={styles.notesPreview}>
          <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.notesPreviewText} numberOfLines={2}>
            {(item as any).notes}
          </Text>
        </View>
      )}
    </View>
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const { facilities, updateFacility, deleteFacility, leaveFacility } = useFacilities();
  const { profile, updateProfile, uploadAvatar } = useUserProfile();
  const { provider, refetch: refetchProvider } = useServiceProvider();
  const { registrations, refetch: refetchRegistrations } = useServiceRegistrations();
  const { t, ready } = useTranslation();

  // Count active services
  const activeServicesCount = registrations.filter(
    reg => reg.status === 'active' &&
      (!reg.paid_until || new Date(reg.paid_until) > new Date())
  ).length;

  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHouseRole, setEditHouseRole] = useState('');
  const [houseRolePickerVisible, setHouseRolePickerVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [facilityForNotes, setFacilityForNotes] = useState<Facility | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [facilityForInvite, setFacilityForInvite] = useState<Facility | null>(null);
  const qrCodeRef = useRef<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      refetchProvider();
      refetchRegistrations();
    }, [refetchProvider, refetchRegistrations])
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setEditName(facility.name);
    setEditDescription(facility.description || '');
    setEditAddress(facility.address || '');
  };

  const handleEditNotes = (facility: Facility) => {
    setFacilityForNotes(facility);
    setEditingNotes((facility as any).notes || '');
    setNotesModalVisible(true);
  };

  const handleShare = async (facility: Facility) => {
    setFacilityForInvite(facility);
    try {
      // Try to get existing invite code
      const { data: existing, error: fetchError } = await supabase
        .from('facility_invites')
        .select('code')
        .eq('facility_id', facility.id)
        .eq('role', 'member')
        .is('expires_at', null)
        .single();

      if (existing && !fetchError) {
        setInviteCode(existing.code);
        setInviteModalVisible(true);
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
          facility_id: facility.id,
          code: newCode,
          role: 'member',
          max_uses: null, // Unlimited uses
          expires_at: null, // Never expires
        });

      if (insertError) throw insertError;
      setInviteCode(newCode);
      setInviteModalVisible(true);
    } catch (error) {
      console.error('Error managing invite code:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst kód pro pozvání.');
    }
  };

  const handlePrintInvite = async () => {
    if (!inviteCode || !facilityForInvite) return;

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

      // Load logo as base64
      let logoBase64 = '';
      try {
        const asset = Asset.fromModule(require('../assets/logo_print.webp'));
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        if (uri) {
          console.log('Loading logo from URI:', uri);
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          logoBase64 = `data:image/webp;base64,${base64}`;
          console.log('Logo loaded, base64 length:', logoBase64.length);
        } else {
          console.warn('No URI available for logo');
        }
      } catch (err) {
        console.error('Could not load logo:', err);
      }

      // Create HTML content for printing
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Pozvánka k připojení</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 10mm;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                * {
                  page-break-inside: avoid;
                }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 10px;
                max-width: 600px;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
              }
              .header {
                text-align: left;
                margin-bottom: 10px;
              }
              .header h1 {
                color: #333;
                margin: 0 0 5px 0;
                font-size: 20px;
              }
              .header img {
                max-width: 120px;
                height: auto;
                margin-bottom: 5px;
              }
              .content {
                flex: 1;
              }
              .content h2 {
                font-size: 18px;
                margin-bottom: 8px;
                text-align: center;
              }
              .address {
                color: #666;
                margin-bottom: 10px;
                text-align: center;
                font-size: 12px;
              }
              .code {
                font-size: 24px;
                font-weight: bold;
                color: #007AFF;
                letter-spacing: 2px;
                text-align: center;
                margin: 10px 0;
                padding: 10px;
                background: #f5f5f5;
                border-radius: 8px;
              }
              .qr-code {
                text-align: center;
                margin: 10px 0;
              }
              .qr-code img {
                max-width: 150px;
                height: auto;
              }
              .instructions {
                color: #666;
                line-height: 1.4;
                margin-top: 10px;
                font-size: 11px;
              }
              .instructions p {
                margin: 5px 0;
              }
              .instructions ol {
                margin: 5px 0;
                padding-left: 18px;
              }
              .instructions li {
                margin: 3px 0;
              }
              .signature-section {
                margin-top: 15px;
                text-align: right;
              }
              .signature-text {
                color: #666;
                font-size: 11px;
                margin-bottom: 30px;
              }
              .signature-line {
                border-top: 1px solid #333;
                width: 150px;
                margin-left: auto;
                margin-top: 5px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Altrano" />` : '<h1>Altrano</h1>'}
            </div>
            <div class="content">
              <h2 style="color: #333;">Pozvánka k připojení k nemovitosti</h2>
              <div class="address">
                <strong>${facilityForInvite.name}</strong><br>
                ${facilityForInvite.address || ''}
              </div>
              <div class="code">${inviteCode}</div>
              ${qrCodeBase64 ? `<div class="qr-code"><img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code" /></div>` : ''}
              <div class="instructions">
                <p><strong>Jak se připojit:</strong></p>
                <ol>
                  <li>Otevřete aplikaci Altrano</li>
                  <li>Přejděte do sekce "Moje nemovitosti"</li>
                  <li>Klikněte na tlačítko "Připojit se"</li>
                  <li>Zadejte výše uvedený kód nebo naskenujte QR kód</li>
                </ol>
              </div>
              <div class="signature-section">
                <div class="signature-text">
                  K tomuto domu vás zve a těší se<br>
                  ${profile?.first_name || ''} ${profile?.last_name || ''}
                </div>
                <div class="signature-line"></div>
              </div>
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
        message: `Pozvánka k připojení k nemovitosti ${facilityForInvite.name}\n\nKód: ${inviteCode}\n\nPro připojení použijte tento kód v aplikaci nebo naskenujte QR kód.`,
        title: 'Pozvánka k připojení',
      });
    } catch (error: any) {
      console.error('Error printing invite:', error);
      Alert.alert('Chyba', 'Nepodařilo se vytisknout pozvánku.');
    }
  };

  const handleSaveNotes = async () => {
    if (!facilityForNotes) return;
    try {
      await updateFacility(facilityForNotes.id, {
        notes: editingNotes.trim() || null,
      } as any);
      setNotesModalVisible(false);
      setFacilityForNotes(null);
      setEditingNotes('');
      Alert.alert('Hotovo', 'Poznámky byly uloženy.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se uložit poznámky.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingFacility) return;
    try {
      await updateFacility(editingFacility.id, {
        name: editName,
        description: editDescription || null,
        address: editAddress || null,
      });
      setEditingFacility(null);
      Alert.alert('Hotovo', 'Nemovitost byla upravena.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se upravit nemovitost.');
    }
  };

  const handleDeleteFacility = (facilityId: string) => {
    setFacilityToDelete(facilityId);
    setDeleteDialogVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (facilityToDelete) {
      try {
        await deleteFacility(facilityToDelete);
        setDeleteDialogVisible(false);
        setFacilityToDelete(null);
        Alert.alert('Hotovo', 'Nemovitost byla smazána.');
      } catch (error) {
        Alert.alert('Chyba', 'Nepodařilo se smazat nemovitost.');
        setDeleteDialogVisible(false);
        setFacilityToDelete(null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogVisible(false);
    setFacilityToDelete(null);
  };

  const handleLeaveFacility = (facilityId: string) => {
    Alert.alert(
      'Opustit nemovitost',
      'Opravdu chcete opustit tuto nemovitost?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Opustit',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFacility(facilityId);
              Alert.alert('Hotovo', 'Opustili jste nemovitost.');
            } catch (error: any) {
              Alert.alert('Chyba', error.message || 'Nepodařilo se opustit nemovitost.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setEditFirstName(profile?.first_name || '');
    setEditLastName(profile?.last_name || '');
    setEditTitle(profile?.title || '');
    setEditPhone(profile?.phone || '');
    setEditHouseRole(profile?.house_role || '');
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        title: editTitle.trim() || null,
        phone: editPhone.trim() || null,
        house_role: editHouseRole.trim() || null,
      });
      setEditingProfile(false);
      Alert.alert('Hotovo', 'Profil byl upraven.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se upravit profil.');
    }
  };

  const showHouseRolePicker = () => {
    if (Platform.OS === 'ios') {
      const options = [...houseRoleOptions, 'Zrušit'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < houseRoleOptions.length) {
            const selectedRole = houseRoleOptions[buttonIndex];
            if (selectedRole === 'Jiné') {
              // If "Jiné" is selected, allow custom input
              setEditHouseRole('');
              setFocusedInput('houseRole');
            } else {
              setEditHouseRole(selectedRole);
            }
          }
        }
      );
    } else {
      setHouseRolePickerVisible(true);
    }
  };

  const handleHouseRoleSelect = (role: string) => {
    if (role === 'Jiné') {
      // If "Jiné" is selected, allow custom input
      setEditHouseRole('');
      setFocusedInput('houseRole');
    } else {
      setEditHouseRole(role);
    }
    setHouseRolePickerVisible(false);
  };

  const ensureMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Přístup zamítnut', 'Pro výběr obrázku povolte přístup ke galerii.');
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

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Zrušit', 'Vybrat z galerie', 'Pořídit fotografii'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await pickImageFromGallery();
          } else if (buttonIndex === 2) {
            await takePhoto();
          }
        }
      );
    } else {
      Alert.alert(
        'Vybrat avatar',
        'Jak chcete vybrat obrázek?',
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Vybrat z galerie', onPress: pickImageFromGallery },
          { text: 'Pořídit fotografii', onPress: takePhoto },
        ]
      );
    }
  };

  const pickImageFromGallery = async () => {
    const ok = await ensureMediaLibraryPermission();
    if (!ok) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        await uploadAvatar(result.assets[0].uri);
        Alert.alert('Hotovo', 'Avatar byl aktualizován.');
      }
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se nahrát avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const takePhoto = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        await uploadAvatar(result.assets[0].uri);
        Alert.alert('Hotovo', 'Avatar byl aktualizován.');
      }
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se nahrát avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.first_name || profile?.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user?.email;
    }
    return user?.email || 'Uživatel';
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  // Calculate sticky header indices
  const stickyHeaderIndices = useMemo(() => {
    const indices: number[] = [];
    let index = 0;

    // Header (not sticky) - index 0
    index++; // header View

    // Profile Info Section (if exists)
    if (profile?.first_name || profile?.last_name || profile?.title || profile?.phone) {
      index++; // profileInfoCard
    }

    // Services Section header
    if (provider && activeServicesCount > 0) {
      indices.push(index); // stickySectionHeader for Services
      index++; // stickySectionHeader
      index++; // servicesSection content
    } else if (!provider) {
      indices.push(index); // stickySectionHeader for Services
      index++; // stickySectionHeader
      index++; // servicesSection content
    }

    // My Facilities Section header
    indices.push(index); // stickySectionHeader for My Facilities

    return indices;
  }, [profile, provider, activeServicesCount]);

  if (!ready) {
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
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          stickyHeaderIndices={stickyHeaderIndices}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <Ionicons name="hourglass-outline" size={24} color={colors.textOnPrimary} />
                </View>
              )}
              <View style={styles.avatarEditIcon}>
                <Ionicons name="camera" size={16} color={colors.textOnPrimary} />
              </View>
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>{getDisplayName()}</Text>
              {profile?.title && <Text style={styles.subtitle}>{profile.title}</Text>}
              {user?.email && <Text style={styles.email}>{user.email}</Text>}
              {profile?.phone && <Text style={styles.phone}>{profile.phone}</Text>}
            </View>
            <TouchableOpacity onPress={handleEditProfile} style={styles.editProfileButton}>
              <Ionicons name="pencil-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Profile Info Section */}
          {(profile?.first_name || profile?.last_name || profile?.title || profile?.phone || profile?.house_role) && (
            <View style={styles.profileInfoCard}>
              {profile.first_name && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Jméno:</Text>
                  <Text style={styles.profileValue}>{profile.first_name}</Text>
                </View>
              )}
              {profile.last_name && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Příjmení:</Text>
                  <Text style={styles.profileValue}>{profile.last_name}</Text>
                </View>
              )}
              {profile.title && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Titul:</Text>
                  <Text style={styles.profileValue}>{profile.title}</Text>
                </View>
              )}
              {profile.phone && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Telefon:</Text>
                  <Text style={styles.profileValue}>{profile.phone}</Text>
                </View>
              )}
              {profile.house_role && (
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Role v domě:</Text>
                  <Text style={styles.profileValue}>{profile.house_role}</Text>
                </View>
              )}
            </View>
          )}

          {/* Services Section */}
          {(provider && activeServicesCount > 0) || !provider ? (
            <View style={[styles.stickySectionHeader, { marginLeft: spacing.xl * 0.7 }]}>
              <Text style={styles.sectionTitle}>Služby</Text>
            </View>
          ) : null}
          {provider && activeServicesCount > 0 && (
            <View style={styles.servicesSection}>
              <Card style={styles.providerInfoCard}>
                <View style={styles.providerInfoHeader}>
                  <View style={styles.providerInfoLeft}>
                    <Ionicons name="construct" size={24} color={colors.primary} />
                    <View style={styles.providerInfoText}>
                      <Text style={styles.providerInfoTitle}>Aktivní služby</Text>
                      <Text style={styles.providerInfoSubtitle}>
                        {activeServicesCount} {activeServicesCount === 1 ? 'služba' : activeServicesCount < 5 ? 'služby' : 'služeb'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('MyServices' as never)}
                    style={styles.providerInfoButton}
                  >
                    <Text style={styles.providerInfoButtonText}>Zobrazit</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}
          {!provider && (
            <View style={styles.servicesSection}>
              <TouchableOpacity
                style={styles.serviceButton}
                onPress={() => navigation.navigate('ServiceRegistration')}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                <Text style={styles.serviceButtonText}>Registrovat jako dodavatel</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.stickySectionHeader, { marginLeft: spacing.xl * 0.7 }]}>
            <Text style={styles.sectionTitle}>{t('profile.myFacilities')}</Text>
          </View>
          <View style={{ marginTop: spacing.md }}>
            {facilities.map((item) => (
              <View key={item.id} style={{ paddingHorizontal: spacing.xl }}>
                <FacilityCard
                  item={item}
                  onEdit={handleEditFacility}
                  onUsers={(id) => {
                    setSelectedFacilityId(id);
                    setMembersModalVisible(true);
                  }}
                  onNotes={handleEditNotes}
                  onDelete={handleDeleteFacility}
                  onLeave={handleLeaveFacility}
                  onShare={handleShare}
                />
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Edit Modal */}
        <Modal
          visible={!!editingFacility}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingFacility(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upravit nemovitost</Text>
                <TouchableOpacity onPress={() => setEditingFacility(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'facilityName' && styles.inputFocused
                ]}
                placeholder="Název nemovitosti"
                placeholderTextColor={colors.placeholder}
                value={editName}
                onChangeText={setEditName}
                onFocus={() => setFocusedInput('facilityName')}
                onBlur={() => setFocusedInput(null)}
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  focusedInput === 'facilityDescription' && styles.inputFocused
                ]}
                placeholder="Popis"
                placeholderTextColor={colors.placeholder}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={() => setFocusedInput('facilityDescription')}
                onBlur={() => setFocusedInput(null)}
              />

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'facilityAddress' && styles.inputFocused
                ]}
                placeholder="Adresa"
                placeholderTextColor={colors.placeholder}
                value={editAddress}
                onChangeText={setEditAddress}
                onFocus={() => setFocusedInput('facilityAddress')}
                onBlur={() => setFocusedInput(null)}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Uložit"
                  onPress={handleSaveEdit}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          visible={editingProfile}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingProfile(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upravit profil</Text>
                <TouchableOpacity onPress={() => setEditingProfile(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'firstName' && styles.inputFocused
                ]}
                placeholder="Jméno"
                placeholderTextColor={colors.placeholder}
                value={editFirstName}
                onChangeText={setEditFirstName}
                onFocus={() => setFocusedInput('firstName')}
                onBlur={() => setFocusedInput(null)}
              />

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'lastName' && styles.inputFocused
                ]}
                placeholder="Příjmení"
                placeholderTextColor={colors.placeholder}
                value={editLastName}
                onChangeText={setEditLastName}
                onFocus={() => setFocusedInput('lastName')}
                onBlur={() => setFocusedInput(null)}
              />

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'title' && styles.inputFocused
                ]}
                placeholder="Titul"
                placeholderTextColor={colors.placeholder}
                value={editTitle}
                onChangeText={setEditTitle}
                onFocus={() => setFocusedInput('title')}
                onBlur={() => setFocusedInput(null)}
              />

              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'phone' && styles.inputFocused
                ]}
                placeholder="Telefon"
                placeholderTextColor={colors.placeholder}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                onFocus={() => setFocusedInput('phone')}
                onBlur={() => setFocusedInput(null)}
              />

              {focusedInput === 'houseRole' ? (
                <TextInput
                  style={[
                    styles.input,
                    styles.inputFocused
                  ]}
                  placeholder="Zadejte vlastní roli v domě"
                  placeholderTextColor={colors.placeholder}
                  value={editHouseRole}
                  onChangeText={setEditHouseRole}
                  onBlur={() => setFocusedInput(null)}
                />
              ) : (
                <TouchableOpacity
                  style={styles.houseRoleButton}
                  onPress={showHouseRolePicker}
                >
                  <Text style={[styles.houseRoleButtonText, !editHouseRole && styles.houseRoleButtonTextPlaceholder]}>
                    {editHouseRole || 'Vyberte roli v domě'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              <View style={styles.modalButtons}>
                <Button
                  title="Uložit"
                  onPress={handleSaveProfile}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        <ConfirmDeleteDialog
          visible={deleteDialogVisible}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title={t('profile.deleteFacilityTitle')}
          message={t('profile.deleteFacilityMessage')}
          confirmText={t('common.delete')}
          confirmationWord="SMAZAT"
        />

        {selectedFacilityId && (
          <FacilityMembersModal
            visible={membersModalVisible}
            facilityId={selectedFacilityId}
            onClose={() => {
              setMembersModalVisible(false);
              setSelectedFacilityId(null);
            }}
          />
        )}

        {/* House Role Picker Modal for Android */}
        {Platform.OS === 'android' && (
          <Modal
            visible={houseRolePickerVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setHouseRolePickerVisible(false)}
          >
            <TouchableOpacity
              style={styles.rolePickerOverlay}
              activeOpacity={1}
              onPress={() => setHouseRolePickerVisible(false)}
            >
              <View style={styles.rolePickerContent}>
                <Text style={styles.rolePickerTitle}>Vyberte roli v domě</Text>
                {houseRoleOptions.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.rolePickerOption,
                      editHouseRole === role && styles.rolePickerOptionSelected,
                    ]}
                    onPress={() => handleHouseRoleSelect(role)}
                  >
                    <Text
                      style={[
                        styles.rolePickerOptionText,
                        editHouseRole === role && styles.rolePickerOptionTextSelected,
                      ]}
                    >
                      {role}
                    </Text>
                    {editHouseRole === role && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.rolePickerCancel}
                  onPress={() => setHouseRolePickerVisible(false)}
                >
                  <Text style={styles.rolePickerCancelText}>Zrušit</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Notes Modal */}
        <Modal
          visible={notesModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setNotesModalVisible(false);
            setFacilityForNotes(null);
            setEditingNotes('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Poznámky k nemovitosti</Text>
                <TouchableOpacity onPress={() => {
                  setNotesModalVisible(false);
                  setFacilityForNotes(null);
                  setEditingNotes('');
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  focusedInput === 'notes' && styles.inputFocused
                ]}
                placeholder="Zde můžete psát poznámky k nemovitosti..."
                placeholderTextColor={colors.placeholder}
                value={editingNotes}
                onChangeText={setEditingNotes}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                onFocus={() => setFocusedInput('notes')}
                onBlur={() => setFocusedInput(null)}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Zrušit"
                  onPress={() => {
                    setNotesModalVisible(false);
                    setFacilityForNotes(null);
                    setEditingNotes('');
                  }}
                  variant="outline"
                  style={styles.modalButton}
                />
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
          visible={inviteModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setInviteModalVisible(false);
            setFacilityForInvite(null);
            setInviteCode(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Pozvat do:</Text>
                  <Text style={styles.modalFacilityName}>{facilityForInvite?.name}</Text>
                  {facilityForInvite?.address && (
                    <View style={styles.modalAddressRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.modalAddress}>{facilityForInvite.address}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => {
                  setInviteModalVisible(false);
                  setFacilityForInvite(null);
                  setInviteCode(null);
                }}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerText: {
    flex: 1,
  },
  editProfileButton: {
    padding: 4,
  },
  email: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  phone: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  profileInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  profileLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  profileValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  stickySectionHeader: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    marginTop: spacing.sm,
    marginRight: spacing.xl,
    borderRadius: 12,
    zIndex: 10,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  servicesSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  serviceButtonText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  editButton: {
    padding: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usersButton: {
    padding: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    padding: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesButton: {
    padding: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    padding: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  facilityDesc: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  addressText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  signOutText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
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
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 80,
  },
  modalButtons: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalButton: {
    flex: 1,
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
    minHeight: 48,
  },
  printButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: '#FFFFFF',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesPreviewText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
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
  providerInfoCard: {
    marginHorizontal: spacing.xl,
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
  houseRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
  houseRoleButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  houseRoleButtonTextPlaceholder: {
    color: colors.placeholder,
  },
  rolePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  rolePickerContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  rolePickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  rolePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rolePickerOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  rolePickerOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  rolePickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  rolePickerCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  rolePickerCancelText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
