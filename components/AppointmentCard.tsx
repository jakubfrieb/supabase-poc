import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { ServiceAppointment } from '../types/database';

interface AppointmentCardProps {
  appointment: ServiceAppointment;
  proposedByName?: string;
  confirmedByName?: string;
  canConfirm?: boolean;
  canReject?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
}

export function AppointmentCard({
  appointment,
  proposedByName,
  confirmedByName,
  canConfirm = false,
  canReject = false,
  onConfirm,
  onReject,
}: AppointmentCardProps) {
  const statusColors = {
    proposed: colors.info,
    confirmed: colors.success,
    rejected: colors.error,
    completed: colors.statusClosed,
  };

  const statusLabels = {
    proposed: 'Navrženo',
    confirmed: 'Potvrzeno',
    rejected: 'Zamítnuto',
    completed: 'Dokončeno',
  };

  const formatDate = (dateStr: string) => {
    try {
      // Handle YYYY-MM-DD format
      const [year, month, day] = dateStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('cs-CZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateText}>{formatDate(appointment.proposed_date)}</Text>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.timeText}>{formatTime(appointment.proposed_time)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[appointment.status] }]}>
          <Text style={styles.statusText}>{statusLabels[appointment.status]}</Text>
        </View>
      </View>

      <View style={styles.info}>
        {proposedByName && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>Navrhl/a: {proposedByName}</Text>
          </View>
        )}
        {confirmedByName && (
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={styles.infoText}>Potvrdil/a: {confirmedByName}</Text>
          </View>
        )}
        {appointment.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Poznámka:</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}
      </View>

      {(canConfirm || canReject) && appointment.status === 'proposed' && (
        <View style={styles.actions}>
          {canConfirm && onConfirm && (
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Ionicons name="checkmark-circle" size={18} color={colors.textOnPrimary} />
              <Text style={styles.confirmButtonText}>Potvrdit</Text>
            </TouchableOpacity>
          )}
          {canReject && onReject && (
            <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
              <Ionicons name="close-circle" size={18} color={colors.textOnPrimary} />
              <Text style={styles.rejectButtonText}>Zamítnout</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  info: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.sm,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  rejectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

