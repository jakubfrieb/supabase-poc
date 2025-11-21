import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { AuthProvider } from './contexts/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';
import { createSessionFromUrl } from './lib/deepLinking';
import './lib/i18n';

export default function App() {
  // Handle deep links for OAuth callbacks and magic links
  const url = Linking.useURL();
  
  useEffect(() => {
    if (Platform.OS === 'web' || !url) return;
    
    // Check if it's an auth callback
    if (url.includes('access_token') || url.includes('code=') || url.includes('auth')) {
      createSessionFromUrl(url).catch((error) => {
        console.error('Error creating session from deep link:', error);
      });
    }
  }, [url]);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
