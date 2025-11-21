import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { useFacilityMembers, FacilityMember } from '../hooks/useFacilityMembers';
import { FacilityRole } from '../hooks/useFacilityRole';
import { UserAvatar } from './UserAvatar';

interface FacilityMembersModalProps {
  visible: boolean;
  facilityId: string;
  onClose: () => void;
}

const roleLabels: Record<FacilityRole, string> = {
  owner: 'Vlastník',
  admin: 'Správce',
  member: 'Uživatel',
  viewer: 'Dodavatel',
  null: '',
};

const roleOptions: FacilityRole[] = ['admin', 'member', 'viewer'];

export function FacilityMembersModal({ visible, facilityId, onClose }: FacilityMembersModalProps) {
  const { members, loading, updateMemberRole, removeMember } = useFacilityMembers(facilityId);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FacilityMember | null>(null);

  const handleRoleChange = async (userId: string, newRole: FacilityRole) => {
    if (!newRole) return;

    try {
      setChangingRole(userId);
      await updateMemberRole(userId, newRole);
      setRolePickerVisible(false);
      setSelectedMember(null);
      Alert.alert('Hotovo', 'Role byla změněna.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se změnit roli.');
    } finally {
      setChangingRole(null);
    }
  };

  const showRolePicker = (member: FacilityMember) => {
    if (Platform.OS === 'ios') {
      const options = [...roleOptions.map(r => roleLabels[r]), 'Zrušit'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < roleOptions.length) {
            handleRoleChange(member.user_id, roleOptions[buttonIndex]);
          }
        }
      );
    } else {
      setSelectedMember(member);
      setRolePickerVisible(true);
    }
  };

  const handleRemoveMember = (member: FacilityMember) => {
    if (member.role === 'owner') {
      Alert.alert('Chyba', 'Vlastníka nemovitosti nelze odstranit.');
      return;
    }

    Alert.alert(
      'Odstranit člena',
      `Opravdu chcete odstranit ${getMemberDisplayName(member)} z nemovitosti?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odstranit',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.user_id);
              Alert.alert('Hotovo', 'Člen byl odstraněn.');
            } catch (error) {
              Alert.alert('Chyba', 'Nepodařilo se odstranit člena.');
            }
          },
        },
      ]
    );
  };

  const getMemberDisplayName = (member: FacilityMember): string => {
    if (member.first_name || member.last_name) {
      return [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Uživatel';
    }
    return member.email || 'Uživatel';
  };

  const renderMember = ({ item }: { item: FacilityMember }) => {
    const isOwner = item.role === 'owner';
    const isChanging = changingRole === item.user_id;

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <UserAvatar userId={item.user_id} size="medium" showName={false} />
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{getMemberDisplayName(item)}</Text>
              {item.phone && (
                <View style={styles.memberRow}>
                  <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.memberText}>{item.phone}</Text>
                </View>
              )}
              {item.email && (
                <View style={styles.memberRow}>
                  <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.memberText}>{item.email}</Text>
                </View>
              )}
            </View>
          </View>
          {!isOwner && (
            <TouchableOpacity
              onPress={() => handleRemoveMember(item)}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color="#E53935" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Role:</Text>
          {isOwner ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabels.owner}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => showRolePicker(item)}
              disabled={isChanging}
            >
              {isChanging ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.roleButtonText}>{roleLabels[item.role] || 'Vybrat'}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Členové nemovitosti</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.user_id}
              renderItem={renderMember}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Žádní členové</Text>
                </View>
              }
            />
          )}
        </View>
      </View>

      {/* Role Picker Modal for Android */}
      <Modal
        visible={rolePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setRolePickerVisible(false);
          setSelectedMember(null);
        }}
      >
        <TouchableOpacity
          style={styles.rolePickerOverlay}
          activeOpacity={1}
          onPress={() => {
            setRolePickerVisible(false);
            setSelectedMember(null);
          }}
        >
          <View style={styles.rolePickerContent}>
            <Text style={styles.rolePickerTitle}>Vyberte roli</Text>
            {roleOptions.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.rolePickerOption,
                  selectedMember?.role === role && styles.rolePickerOptionSelected,
                ]}
                onPress={() => {
                  if (selectedMember) {
                    handleRoleChange(selectedMember.user_id, role);
                  }
                }}
              >
                <Text
                  style={[
                    styles.rolePickerOptionText,
                    selectedMember?.role === role && styles.rolePickerOptionTextSelected,
                  ]}
                >
                  {roleLabels[role]}
                </Text>
                {selectedMember?.role === role && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.rolePickerCancel}
              onPress={() => {
                setRolePickerVisible(false);
                setSelectedMember(null);
              }}
            >
              <Text style={styles.rolePickerCancelText}>Zrušit</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  listContent: {
    padding: spacing.xl,
  },
  memberCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.sm,
  },
  memberDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  memberText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roleLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  roleButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  rolePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  rolePickerContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  rolePickerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  rolePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  rolePickerOptionSelected: {
    backgroundColor: colors.background,
  },
  rolePickerOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  rolePickerOptionTextSelected: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  rolePickerCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rolePickerCancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

