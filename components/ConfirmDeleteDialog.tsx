import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { Input } from './Input';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface ConfirmDeleteDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmationWord: string;
}

export function ConfirmDeleteDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmationWord,
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const { t } = useTranslation();
  const isConfirmEnabled = inputValue === confirmationWord;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setInputValue('');
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.confirmationSection}>
              <Text style={styles.confirmationLabel}>
                {t('profile.deleteConfirmationLabel', { word: confirmationWord })}
              </Text>
              <Input
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={confirmationWord}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>

            <View style={styles.buttons}>
              <Button
                title={t('common.cancel')}
                onPress={handleClose}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title={confirmText}
                onPress={handleConfirm}
                variant="danger"
                disabled={!isConfirmEnabled}
                style={styles.confirmButton}
              />
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg || 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  confirmationSection: {
    marginBottom: spacing.xl,
  },
  confirmationLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: 0,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});

