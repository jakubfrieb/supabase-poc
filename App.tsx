import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Linking } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';
import { supabase } from './lib/supabase';
import './lib/i18n';

export default function App() {
  useEffect(() => {
    // Handle deep links for OAuth callbacks
    if (Platform.OS !== 'web') {
      const handleDeepLink = async (url: string) => {
        if (url.includes('auth/callback')) {
          // Parse the callback URL
          const hashMatch = url.match(/#(.+)/);
          const queryMatch = url.match(/\?(.+)/);
          
          if (hashMatch) {
            // Handle hash-based tokens (implicit flow)
            const params = new URLSearchParams(hashMatch[1]);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            
            if (access_token && refresh_token) {
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
            }
          } else if (queryMatch) {
            // Handle query-based code (authorization code flow)
            const params = new URLSearchParams(queryMatch[1]);
            const code = params.get('code');
            
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            }
          }
        }
      };

      // Handle initial URL if app was opened via deep link
      Linking.getInitialURL().then((url) => {
        if (url) {
          handleDeepLink(url);
        }
      });

      // Listen for deep links while app is running
      const subscription = Linking.addEventListener('url', (event) => {
        handleDeepLink(event.url);
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
