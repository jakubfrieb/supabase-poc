import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface SkeletonItemProps {
    width?: number | string;
    height?: number;
    style?: ViewStyle;
    borderRadius?: number;
}

export const SkeletonItem = ({
    width = '100%',
    height = 20,
    style,
    borderRadius = 4
}: SkeletonItemProps) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnimation = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        startAnimation();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 0.9],
    });

    return (
        <Animated.View
            style={[
                styles.skeletonItem,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

export const DashboardSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <View>
                    <SkeletonItem width={120} height={32} style={{ marginBottom: 8 }} />
                </View>
                <View style={styles.headerActions}>
                    <SkeletonItem width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
                    <SkeletonItem width={40} height={40} borderRadius={20} />
                </View>
            </View>

            {/* Requests Card Skeleton */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <SkeletonItem width={24} height={24} borderRadius={12} style={{ marginRight: 12 }} />
                    <View>
                        <SkeletonItem width={150} height={20} style={{ marginBottom: 4 }} />
                        <SkeletonItem width={100} height={14} />
                    </View>
                </View>
                <View style={styles.cardContent}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.requestItem}>
                            <View style={{ flex: 1 }}>
                                <SkeletonItem width="80%" height={16} style={{ marginBottom: 8 }} />
                                <SkeletonItem width="60%" height={14} />
                            </View>
                            <SkeletonItem width={24} height={24} borderRadius={12} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Facilities Section Header Skeleton */}
            <View style={styles.sectionHeader}>
                <SkeletonItem width={140} height={24} style={{ marginBottom: 4 }} />
                <SkeletonItem width={100} height={14} />
            </View>

            {/* Facilities List Skeleton */}
            {[1, 2].map((i) => (
                <View key={i} style={styles.facilityCard}>
                    <SkeletonItem width="100%" height={150} borderRadius={12} style={{ marginBottom: 12 }} />
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                        <SkeletonItem width="70%" height={20} style={{ marginBottom: 8 }} />
                        <SkeletonItem width="40%" height={16} />
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    skeletonItem: {
        backgroundColor: '#E1E9EE',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    headerActions: {
        flexDirection: 'row',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardContent: {
        gap: 16,
    },
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    facilityCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
});
