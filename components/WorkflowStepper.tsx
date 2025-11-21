import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight } from '../theme/colors';

type WorkflowStep = 'request' | 'selection' | 'appointment' | 'repair' | 'completed';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
}

const steps: { key: WorkflowStep; label: string; icon: string }[] = [
  { key: 'request', label: 'Poptávka', icon: 'document-text-outline' },
  { key: 'selection', label: 'Výběr dodavatele', icon: 'people-outline' },
  { key: 'appointment', label: 'Termín', icon: 'calendar-outline' },
  { key: 'repair', label: 'Oprava', icon: 'construct-outline' },
  { key: 'completed', label: 'Hotovo', icon: 'checkmark-circle-outline' },
];

export function WorkflowStepper({ currentStep }: WorkflowStepperProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const currentStepData = steps[currentStepIndex];

  if (!isExpanded) {
    // Zabaleno - zobrazit jen aktuální krok s podbarvením
    return (
      <View style={styles.collapsedContainer}>
        <View style={styles.collapsedContent}>
          <View
            style={[
              styles.iconContainer,
              styles.iconContainerActive,
              styles.iconContainerCurrent,
            ]}
          >
            <Ionicons
              name={currentStepIndex > 0 ? 'checkmark' : (currentStepData.icon as any)}
              size={24}
              color={colors.textOnPrimary}
            />
          </View>
          <View style={styles.collapsedTextContainer}>
            <Text style={styles.collapsedLabel}>{currentStepData.label}</Text>
            <Text style={styles.collapsedDescription}>
              {currentStepIndex === 0 && 'Vytvořte poptávku na službu'}
              {currentStepIndex === 1 && 'Vyberte dodavatele z přihlášek'}
              {currentStepIndex === 2 && 'Navrhněte a potvrďte termín'}
              {currentStepIndex === 3 && 'Probíhá oprava'}
              {currentStepIndex === 4 && 'Služba je dokončena'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setIsExpanded(true)}
          style={styles.expandButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  // Rozbaleno - zobrazit všechny kroky vertikálně
  return (
    <View style={styles.expandedContainer}>
      <View style={styles.expandedHeader}>
        <Text style={styles.expandedTitle}>Průběh služby</Text>
        <TouchableOpacity
          onPress={() => setIsExpanded(false)}
          style={styles.collapseButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {steps.map((step, index) => {
        const isActive = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <View key={step.key} style={styles.expandedStepRow}>
            <View
              style={[
                styles.expandedIconContainer,
                isActive && styles.iconContainerActive,
                isCurrent && styles.iconContainerCurrent,
              ]}
            >
              <Ionicons
                name={isCompleted ? 'checkmark' : (step.icon as any)}
                size={20}
                color={isActive ? colors.textOnPrimary : colors.textSecondary}
              />
            </View>
            <View style={styles.expandedTextContainer}>
              <Text
                style={[
                  styles.expandedStepLabel,
                  isActive && styles.stepLabelActive,
                  isCurrent && styles.stepLabelCurrent,
                ]}
              >
                {step.label}
              </Text>
              <Text style={styles.expandedStepDescription}>
                {index === 0 && 'Vytvořte poptávku na službu'}
                {index === 1 && 'Vyberte dodavatele z přihlášek'}
                {index === 2 && 'Navrhněte a potvrďte termín'}
                {index === 3 && 'Probíhá oprava'}
                {index === 4 && 'Služba je dokončena'}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.expandedConnector,
                  isActive && styles.connectorActive,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: 12,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collapsedTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  collapsedLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  collapsedDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandButton: {
    padding: spacing.xs,
  },
  expandedContainer: {
    paddingVertical: spacing.md,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  expandedTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  collapseButton: {
    padding: spacing.xs,
  },
  expandedStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  expandedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconContainerActive: {
    backgroundColor: colors.primary,
  },
  iconContainerCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  expandedTextContainer: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  expandedStepLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  expandedStepDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  stepLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  expandedConnector: {
    position: 'absolute',
    left: spacing.md + 20,
    top: 40,
    width: 2,
    height: spacing.lg + spacing.md,
    backgroundColor: colors.border,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
    marginBottom: 24,
  },
  connectorActive: {
    backgroundColor: colors.primary,
  },
});

