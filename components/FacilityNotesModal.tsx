import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Dimensions, Easing, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';
import { Button } from './Button';

interface FacilityNotesModalProps {
    visible: boolean;
    initialNotes: string;
    onSave: (notes: string) => Promise<void>;
    onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function FacilityNotesModal({ visible, initialNotes, onSave, onClose }: FacilityNotesModalProps) {
    const [showModal, setShowModal] = useState(visible);
    const [notes, setNotes] = useState(initialNotes);
    const [isFocused, setIsFocused] = useState(false);
    const [saving, setSaving] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

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

    const handleSave = async () => {
        try {
            setSaving(true);
            await onSave(notes);
            handleClose();
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            setSaving(false);
        }
    };

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
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ width: '100%' }}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Poznámky k nemovitosti</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.body}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.textArea,
                                        isFocused && styles.inputFocused
                                    ]}
                                    placeholder="Zde můžete psát poznámky k nemovitosti..."
                                    placeholderTextColor={colors.placeholder}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={8}
                                    textAlignVertical="top"
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                />

                                <View style={styles.footer}>
                                    <Button
                                        title="Uložit"
                                        onPress={handleSave}
                                        loading={saving}
                                        style={styles.saveButton}
                                    />
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
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
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.lg || 20,
        borderTopRightRadius: borderRadius.lg || 20,
        paddingBottom: spacing.xl, // Extra padding for bottom safe area
        maxHeight: SCREEN_HEIGHT * 0.8,
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
    body: {
        padding: spacing.xl,
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
    },
    textArea: {
        minHeight: 150,
    },
    footer: {
        marginTop: spacing.sm,
    },
    saveButton: {
        width: '100%',
    }
});
