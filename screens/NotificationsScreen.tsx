import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { notifications, loading, markAsRead, markAllRead } = useNotifications();

  const handlePress = useCallback(async (id: string, type: string, data: any) => {
    await markAsRead(id);
    if (type === 'issue_created' && data?.issueId && data?.facilityId) {
      navigation.navigate('IssueDetail', { issueId: data.issueId, facilityId: data.facilityId });
    }
  }, [markAsRead, navigation]);

  return (
    <ImageBackground 
      source={require('../assets/background/theme_1.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handlePress(item.id, item.type, item.data)}>
              <View style={[styles.item, !item.read_at ? styles.unread : undefined]}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body} numberOfLines={2}>{item.body}</Text> : null}
                <Text style={styles.meta}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Žádné notifikace</Text>
            </View>
          }
        />
      )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.xl,
  },
  item: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: {
    borderColor: colors.primary,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});


