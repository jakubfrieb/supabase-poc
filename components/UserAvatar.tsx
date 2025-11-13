import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../theme/colors';
import { useUser } from '../hooks/useUser';

interface UserAvatarProps {
  userId: string | null;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

const sizeMap = {
  small: { avatar: 24, fontSize: 12 },
  medium: { avatar: 32, fontSize: 14 },
  large: { avatar: 40, fontSize: 16 },
};

export function UserAvatar({ userId, size = 'medium', showName = true }: UserAvatarProps) {
  const { userInfo, loading } = useUser(userId);
  const [cacheBust, setCacheBust] = useState(Date.now());
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Update cache bust when avatar_url changes
  useEffect(() => {
    if (userInfo?.avatar_url) {
      setCacheBust(Date.now());
      setImageError(false); // Reset error when URL changes
      setImageLoading(true); // Start loading when URL changes
    }
  }, [userInfo?.avatar_url]);

  if (loading || !userInfo) {
    return (
      <View style={styles.container}>
        <View style={[styles.avatar, { 
          width: sizeMap[size].avatar, 
          height: sizeMap[size].avatar, 
          borderRadius: sizeMap[size].avatar / 2 
        }]}>
          <Text style={[styles.avatarText, { fontSize: sizeMap[size].fontSize }]}>U</Text>
        </View>
        {showName && <Text style={styles.name}>Načítání...</Text>}
      </View>
    );
  }

  const displayName = userInfo.name || userInfo.email?.split('@')[0] || 'uživatel';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarSize = sizeMap[size].avatar;

  // Add cache busting query parameter to force image reload when avatar changes
  const avatarUrlWithCacheBust = userInfo.avatar_url 
    ? `${userInfo.avatar_url}${userInfo.avatar_url.includes('?') ? '&' : '?'}t=${cacheBust}`
    : null;

  // Show fallback if no avatar URL or if image failed to load
  const showFallback = !avatarUrlWithCacheBust || imageError;

  return (
    <View style={styles.container}>
      {showFallback ? (
        <View style={[styles.avatar, { 
          width: avatarSize, 
          height: avatarSize, 
          borderRadius: avatarSize / 2 
        }]}>
          <Text style={[styles.avatarText, { fontSize: sizeMap[size].fontSize }]}>{initial}</Text>
        </View>
      ) : (
        <View style={{ position: 'relative' }}>
          {imageLoading && (
            <View style={[styles.avatar, { 
              width: avatarSize, 
              height: avatarSize, 
              borderRadius: avatarSize / 2,
              position: 'absolute',
            }]}>
              <Text style={[styles.avatarText, { fontSize: sizeMap[size].fontSize }]}>{initial}</Text>
            </View>
          )}
          <Image 
            key={userInfo.avatar_url} // Force re-render when URL changes
            source={{ uri: avatarUrlWithCacheBust }} 
            style={[styles.avatarImage, { 
              width: avatarSize, 
              height: avatarSize, 
              borderRadius: avatarSize / 2 
            }]}
            onError={(e) => {
              console.log('Avatar image error:', e.nativeEvent.error, 'URL:', avatarUrlWithCacheBust);
              setImageError(true);
              setImageLoading(false);
            }}
            onLoad={() => {
              setImageError(false);
              setImageLoading(false);
            }}
            onLoadStart={() => {
              setImageLoading(true);
            }}
          />
        </View>
      )}
      {showName && <Text style={styles.name}>{displayName}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  name: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
});

