import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SkeletonItem } from './SkeletonLoader';
import { colors, spacing, borderRadius } from '../theme/colors';

export const IssueDetailSkeleton = () => {
    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Main Card */}
            <View style={styles.card}>
                {/* Header: Priority + Title */}
                <View style={styles.headerRow}>
                    <SkeletonItem width={24} height={24} borderRadius={12} style={{ marginRight: 12 }} />
                    <SkeletonItem width="70%" height={24} />
                </View>

                {/* Status Badge */}
                <View style={styles.badgeRow}>
                    <SkeletonItem width={100} height={28} borderRadius={14} />
                </View>

                {/* Description Section */}
                <View style={styles.section}>
                    <SkeletonItem width={120} height={16} style={{ marginBottom: 8 }} />
                    <SkeletonItem width="100%" height={16} style={{ marginBottom: 4 }} />
                    <SkeletonItem width="90%" height={16} style={{ marginBottom: 4 }} />
                    <SkeletonItem width="60%" height={16} />
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <SkeletonItem width={100} height={16} style={{ marginBottom: 12 }} />
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.detailRow}>
                            <SkeletonItem width={80} height={14} />
                            <SkeletonItem width={120} height={14} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Messages Card */}
            <View style={styles.card}>
                <SkeletonItem width={100} height={16} style={{ marginBottom: 16 }} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.messageRow}>
                        <SkeletonItem
                            width="80%"
                            height={60}
                            borderRadius={12}
                            style={{
                                alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                                backgroundColor: i % 2 === 0 ? colors.surface : colors.primaryLight + '20'
                            }}
                        />
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent background
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        // Remove shadows for cleaner look on transparent background
        // shadowColor: colors.shadow,
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.05,
        // shadowRadius: 8,
        // elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    badgeRow: {
        marginBottom: spacing.lg,
    },
    section: {
        marginTop: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '40',
    },
    messageRow: {
        marginBottom: spacing.md,
        width: '100%',
    },
});
