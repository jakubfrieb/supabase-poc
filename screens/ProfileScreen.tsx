import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ImageBackground, Image, ActionSheetIOS, Platform } from 'react-native';
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

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { facilities, updateFacility, deleteFacility, leaveFacility } = useFacilities();
  const { profile, updateProfile, uploadAvatar } = useUserProfile();
  const { t, ready } = useTranslation();
  
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
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        title: editTitle.trim() || null,
        phone: editPhone.trim() || null,
      });
      setEditingProfile(false);
      Alert.alert('Hotovo', 'Profil byl upraven.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se upravit profil.');
    }
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
      {(profile?.first_name || profile?.last_name || profile?.title || profile?.phone) && (
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
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('profile.myFacilities')}</Text>
      <FlatList
        data={facilities}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
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
        )}
      />
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </View>

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
                title="Zrušit"
                onPress={() => setEditingFacility(null)}
                variant="outline"
                style={styles.modalButton}
              />
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
            
            <View style={styles.modalButtons}>
              <Button
                title="Zrušit"
                onPress={() => setEditingProfile(false)}
                variant="outline"
                style={styles.modalButton}
              />
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
                />
              )}
            </View>
            
            <Button
              title="Zavřít"
              onPress={() => {
                setInviteModalVisible(false);
                setFacilityForInvite(null);
                setInviteCode(null);
              }}
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
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
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
});
