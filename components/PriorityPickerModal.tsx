import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { IssuePriority } from '../types/database';

interface PriorityPickerModalProps {
  visible: boolean;
  currentPriority: IssuePriority;
  onSelect: (priority: IssuePriority) => void;
  onClose: () => void;
}

const priorityConfig: Record<IssuePriority, { color: string; icon: string; label: string }> = {
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

const getExclamationMarks = (priority: IssuePriority): string | null => {
  if (priority === 'normal') return '!';
  if (priority === 'high') return '!!';
  if (priority === 'critical') return '!!!';
  return null;
};

export function PriorityPickerModal({ visible, currentPriority, onSelect, onClose }: PriorityPickerModalProps) {
  const priorities: IssuePriority[] = ['idea', 'normal', 'high', 'critical', 'urgent'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Vyberte prioritu</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
              {priorities.map((priority) => {
                const config = priorityConfig[priority];
                const isSelected = currentPriority === priority;
                const exclamationMarks = getExclamationMarks(priority);
                const isBubble = priority === 'normal' || priority === 'high' || priority === 'critical';

                return (
                  <TouchableOpacity
                    key={priority}
                    style={[styles.priorityOption, isSelected && styles.priorityOptionSelected]}
                    onPress={() => {
                      onSelect(priority);
                      onClose();
                    }}
                  >
                    <View style={[styles.priorityIconContainer, { backgroundColor: isSelected ? config.color : 'transparent' }]}>
                      {isBubble ? (
                        <View style={[styles.priorityBubble, { borderColor: config.color }]}>
                          <Text style={[styles.priorityExclamation, { color: config.color }]}>
                            {exclamationMarks}
                          </Text>
                        </View>
                      ) : (
                        <Ionicons name={config.icon as any} size={24} color={config.color} />
                      )}
                    </View>
                    <Text style={[styles.priorityLabel, isSelected && styles.priorityLabelSelected]}>
                      {config.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={config.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg || 20,
    borderTopRightRadius: borderRadius.lg || 20,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    paddingHorizontal: spacing.xl,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md || 12,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  priorityOptionSelected: {
    backgroundColor: colors.backgroundDark,
  },
  priorityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  priorityExclamation: {
    fontWeight: fontWeight.bold,
    fontSize: 12,
    lineHeight: 14,
  },
  priorityLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  priorityLabelSelected: {
    fontWeight: fontWeight.semibold,
  },
});

