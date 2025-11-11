import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useFacilities } from '../hooks/useFacilities';
import { colors, spacing, fontSize, fontWeight } from '../theme/colors';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { Facility } from '../types/database';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { facilities, updateFacility, deleteFacility } = useFacilities();
  const { t, ready } = useTranslation();
  
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<string | null>(null);

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

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('profile.myFacilities')}</Text>
      <FlatList
        data={facilities}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.facilityName}>{item.name}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditFacility(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="pencil-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFacility(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash" size={22} color="#E53935" />
                </TouchableOpacity>
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
          </View>
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
              style={styles.input}
              placeholder="Název nemovitosti"
              value={editName}
              onChangeText={setEditName}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Popis"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Adresa"
              value={editAddress}
              onChangeText={setEditAddress}
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

      <ConfirmDeleteDialog
        visible={deleteDialogVisible}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('profile.deleteFacilityTitle')}
        message={t('profile.deleteFacilityMessage')}
        confirmText={t('common.delete')}
        confirmationWord="SMAZAT"
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
  deleteButton: {
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
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
});
