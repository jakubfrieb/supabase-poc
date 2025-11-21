import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { IssueStatus } from '../types/database';
import { useTranslation } from 'react-i18next';

interface StatusPickerModalProps {
    visible: boolean;
    currentStatus: IssueStatus;
    availableStatuses: IssueStatus[];
    onSelect: (status: IssueStatus) => void;
    onClose: () => void;
}

const statusColors = {
    open: colors.statusOpen,
    in_progress: colors.statusInProgress,
    resolved: colors.statusResolved,
    closed: colors.statusClosed,
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function StatusPickerModal({ visible, currentStatus, availableStatuses, onSelect, onClose }: StatusPickerModalProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(visible);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            setShowModal(true);
            // Start animations
            Animated.parallel([
                // Background fade in - slower (approx 80% of slide time)
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 320, // 80% of 400ms
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                // Content slide up
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400, // Standard slide duration
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
            ]).start();
        } else {
            // Close animations
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowModal(false);
            });
        }
    }, [visible]);

    const handleClose = () => {
        onClose();
    };

    // Combine current status with available statuses
    const statusesToShow = [currentStatus, ...availableStatuses];
    const uniqueStatuses = Array.from(new Set(statusesToShow));

    if (!showModal) return null;

    return (
        <Modal visible={showModal} transparent animationType="none" onRequestClose={handleClose}>
            <View style={styles.overlayContainer}>
                {/* Animated Background Overlay */}
                <Animated.View
                    style={[
                        styles.overlayBackground,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} activeOpacity={1} />
                </Animated.View>

                {/* Animated Content */}
                <Animated.View
                    style={[
                        styles.contentContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
                        <View style={styles.modalContent}>
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('issues.changeStatus')}</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.scrollView}>
                                {uniqueStatuses.map((status) => {
                                    const isSelected = currentStatus === status;
                                    const color = statusColors[status];
                                    const label = t(`issues.statusNames.${status}`);

                                    return (
                                        <TouchableOpacity
                                            key={status}
                                            style={[styles.option, isSelected && styles.optionSelected]}
                                            onPress={() => {
                                                if (status !== currentStatus) {
                                                    onSelect(status);
                                                }
                                                handleClose();
                                            }}
                                        >
                                            <View style={[styles.iconContainer, { backgroundColor: isSelected ? color : 'transparent', borderColor: color }]}>
                                                {isSelected ? (
                                                    <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
                                                ) : (
                                                    <View style={[styles.dot, { backgroundColor: color }]} />
                                                )}
                                            </View>
                                            <Text style={[styles.label, isSelected && styles.labelSelected]}>
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlayBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlayTouch: {
        flex: 1,
    },
    contentContainer: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    safeArea: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.lg || 20,
        borderTopRightRadius: borderRadius.lg || 20,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.lg || 20,
        borderTopRightRadius: borderRadius.lg || 20,
        maxHeight: SCREEN_HEIGHT * 0.7,
        paddingBottom: spacing.md,
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
        paddingTop: spacing.md,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md || 12,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    optionSelected: {
        backgroundColor: colors.backgroundDark,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    label: {
        flex: 1,
        fontSize: fontSize.md,
        color: colors.text,
        fontWeight: fontWeight.medium,
    },
    labelSelected: {
        fontWeight: fontWeight.semibold,
    },
});
