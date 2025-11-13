import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Call Supabase Edge Function to send push notification
 * This is called from client-side after creating an issue
 */
export async function sendIssueNotification(
  issueId: string,
  issueTitle: string,
  facilityId: string,
  facilityName: string,
  ownerId: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: {
        issueId,
        issueTitle,
        facilityId,
        facilityName,
        ownerId,
      },
    });

    if (error) {
      console.error('Error calling notification function:', error);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Register device push token for the current user
 * Uses expo-notifications to obtain Expo push token
 * 
 * Note: For Android standalone builds, Firebase Cloud Messaging (FCM) is required.
 * If FCM is not configured, this will fail gracefully and return null.
 * The app will still work, but push notifications won't be available.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return null;
    }

    // Android: ensure default channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // Try to get Expo push token
    // This will fail on Android standalone builds if FCM is not configured
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      // For Android standalone builds, FCM is required
      // If not configured, this will throw an error which we catch below
    });
    const token = tokenResponse.data;
    if (!token) return null;
    return token;
  } catch (error: any) {
    // Check if it's the FCM error
    if (error?.code === 'E_REGISTRATION_FAILED' || error?.message?.includes('Firebase')) {
      console.warn(
        'Push notifications not available: Firebase Cloud Messaging (FCM) is not configured. ' +
        'To enable push notifications on Android, configure FCM credentials. ' +
        'See: https://docs.expo.dev/push-notifications/push-notifications-setup/'
      );
      // Return null gracefully - app will work without push notifications
      return null;
    }
    console.error('Error registering push token:', error);
    return null;
  }
}

/**
 * Save push token to database
 */
export async function savePushToken(token: string, userId: string, deviceType: 'ios' | 'android' | 'web'): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          device_type: deviceType,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      );

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Show local notification when Supabase Realtime detects a new notification
 * This works WITHOUT FCM - local notifications don't require Firebase!
 */
export async function showLocalNotification(title: string, body: string, data?: any): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error showing local notification:', error);
  }
}

/**
 * Setup Supabase Realtime listener for notifications
 * When a new notification is created in DB, show local notification
 * This completely bypasses the need for FCM/push tokens!
 */
export function setupNotificationListener(userId: string, onNotification?: (notification: any) => void) {
  const channel = supabase
    .channel(`notifications-realtime:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const notification = payload.new as any;
        
        // Show local notification (works without FCM!)
        await showLocalNotification(
          notification.title,
          notification.body || '',
          notification.data
        );
        
        // Call optional callback
        if (onNotification) {
          onNotification(notification);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Create a test notification directly in the database
 * Note: This requires RLS policy that allows users to insert their own notifications
 * For production, use Edge Function instead
 */
export async function createTestNotification(
  userId: string,
  type: string = 'issue_created',
  title: string,
  body: string | null = null,
  data?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data: data || {},
      });

    if (error) {
      console.error('Error creating test notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating test notification:', error);
    return { success: false, error: error.message };
  }
}

