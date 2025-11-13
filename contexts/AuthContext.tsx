import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseUrl } from '../lib/supabase';
import { registerPushToken, savePushToken, setupNotificationListener } from '../lib/notifications';
import { Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Register push token when a valid session with user exists (optional, for push notifications)
      if (session?.user) {
        registerPushToken()
          .then((token) => token ? savePushToken(token, session.user!.id, Platform.OS as 'ios' | 'android' | 'web') : undefined)
          .catch((e) => console.log('Push token registration failed:', e));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Setup Supabase Realtime listener for local notifications (works WITHOUT FCM!)
  useEffect(() => {
    if (!user) return;

    // Setup Realtime listener - when notification is created in DB, show local notification
    const cleanup = setupNotificationListener(user.id);
    
    return cleanup;
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      // For mobile apps, we need to use Supabase's callback URL first,
      // then redirect to our deep link. For web, use the current origin.
      let redirectUrl: string;
      
      if (Platform.OS === 'web') {
        // For web, use current origin
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          redirectUrl = `${window.location.origin}/auth/callback`;
        } else {
          // Fallback for web if window is not available
          redirectUrl = 'http://localhost:8081/auth/callback';
        }
      } else {
        // For mobile (Expo Go or native), use deep link
        // IMPORTANT: In Supabase Dashboard → Authentication → URL Configuration,
        // set "Site URL" to: myapp:// (or your app scheme)
        // This allows Supabase to redirect back to your app
        redirectUrl = `${Constants.expoConfig?.scheme || 'myapp'}://auth/callback`;
      }

      if (!redirectUrl) {
        throw new Error('Unable to determine redirect URL');
      }

      // Start OAuth flow
      // For mobile, we need to pass redirectTo in queryParams to force Supabase to use it
      // instead of the Site URL from configuration
      const oauthOptions: any = {
        skipBrowserRedirect: Platform.OS !== 'web', // Skip browser redirect on mobile, we'll handle it manually
      };
      
      if (Platform.OS !== 'web') {
        // For mobile, add redirectTo as query param to override Site URL
        oauthOptions.queryParams = {
          redirect_to: redirectUrl,
        };
        // Also set redirectTo in options (some Supabase versions use this)
        oauthOptions.redirectTo = redirectUrl;
      } else {
        oauthOptions.redirectTo = redirectUrl;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: oauthOptions,
      });

      if (error) throw error;

      // On web, Supabase handles the redirect automatically
      if (Platform.OS === 'web') {
        return; // Browser will handle the redirect
      }

      // On mobile, open the OAuth URL in browser
      if (data?.url) {
        // Use Supabase callback URL as the redirect target
        // Supabase will process OAuth and redirect to this URL with tokens
        const supabaseCallbackUrl = `${supabaseUrl}/auth/v1/callback`;
        
        // Use openAuthSessionAsync with our deep link as the expected redirect
        // Even if Supabase redirects to localhost:3000 first, it should eventually redirect to our deep link
        // If that doesn't work, we'll fall back to polling
        const deepLinkUrl = `${Constants.expoConfig?.scheme || 'myapp'}://auth/callback`;
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          deepLinkUrl
        );

        // If dismissed (usually because redirect went to localhost:3000 instead of deep link),
        // fall back to polling for session
        if (result.type === 'dismiss' || (result.type === 'cancel' && Platform.OS === 'android')) {
          console.log('OAuth was dismissed, falling back to polling for session...');
          // User completed OAuth in browser, but redirect went to localhost:3000
          // Supabase should have created the session, so we'll poll for it
          let attempts = 0;
          const maxAttempts = 20; // 20 seconds max
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('Error checking session:', sessionError);
              throw sessionError;
            }
            
            if (session) {
              console.log('Session found after OAuth (polling), user:', session.user?.email);
              setSession(session);
              setUser(session.user);
              return;
            }
            
            attempts++;
            if (attempts % 5 === 0) {
              console.log(`Still waiting for session... (${attempts}/${maxAttempts})`);
            }
          }
          
          throw new Error('OAuth completed but no session was created. Please check Supabase Site URL configuration.');
        }

        if (result.type === 'success' && result.url) {
          // The callback URL from Supabase should contain tokens or code
          const callbackUrl = result.url;
          console.log('OAuth callback URL:', callbackUrl);
          
          // Extract parameters from Supabase callback URL
          // Supabase callback format: https://...supabase.co/auth/v1/callback#access_token=...&refresh_token=...
          // or: https://...supabase.co/auth/v1/callback?code=...
          const hashMatch = callbackUrl.match(/#(.+)/);
          const queryMatch = callbackUrl.match(/\?(.+)/);
          
          let sessionSet = false;
          
          if (hashMatch) {
            // Handle hash-based tokens
            const params = new URLSearchParams(hashMatch[1]);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            const code = params.get('code');
            
            console.log('Found hash params:', { hasCode: !!code, hasTokens: !!(access_token && refresh_token) });
            
            if (code) {
              // Exchange code for session
              console.log('Exchanging code for session...');
              const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionError) {
                console.error('Error exchanging code:', sessionError);
                throw sessionError;
              }
              console.log('Session exchanged successfully:', !!sessionData.session);
              sessionSet = true;
            } else if (access_token && refresh_token) {
              // Set session directly
              console.log('Setting session directly...');
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (sessionError) {
                console.error('Error setting session:', sessionError);
                throw sessionError;
              }
              console.log('Session set successfully:', !!sessionData.session);
              sessionSet = true;
            }
          } else if (queryMatch) {
            // Handle query-based code
            const params = new URLSearchParams(queryMatch[1]);
            const code = params.get('code');
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            
            console.log('Found query params:', { hasCode: !!code, hasTokens: !!(access_token && refresh_token) });
            
            if (code) {
              console.log('Exchanging code for session...');
              const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionError) {
                console.error('Error exchanging code:', sessionError);
                throw sessionError;
              }
              console.log('Session exchanged successfully:', !!sessionData.session);
              sessionSet = true;
            } else if (access_token && refresh_token) {
              console.log('Setting session directly...');
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (sessionError) {
                console.error('Error setting session:', sessionError);
                throw sessionError;
              }
              console.log('Session set successfully:', !!sessionData.session);
              sessionSet = true;
            }
          }
          
          // If we didn't set session from URL params, check if it was set automatically
          if (!sessionSet) {
            console.log('No tokens in URL, checking for existing session...');
            // Wait a bit for Supabase to process
            await new Promise(resolve => setTimeout(resolve, 1500));
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              console.error('Error getting session:', sessionError);
              throw new Error(`No session found after OAuth callback: ${sessionError.message}`);
            }
            if (!session) {
              throw new Error('No session found after OAuth callback. The user was created but session was not set. Please try signing in again.');
            }
            console.log('Session found:', !!session);
          }
          
          // Verify session is set and refresh to trigger onAuthStateChange
          const { data: { session: finalSession }, error: finalError } = await supabase.auth.getSession();
          if (finalError) {
            console.error('Error getting final session:', finalError);
            throw finalError;
          }
          if (!finalSession) {
            throw new Error('Session verification failed. User was created but session is not available.');
          }
          console.log('OAuth sign-in completed successfully, user:', finalSession.user?.email);
          
          // Manually trigger session update to ensure onAuthStateChange fires
          // This is important because sometimes the session is set but the listener doesn't fire immediately
          setSession(finalSession);
          setUser(finalSession.user);
        } else if (result.type === 'cancel') {
          throw new Error('OAuth sign-in was cancelled');
        } else if (result.type === 'dismiss') {
          throw new Error('OAuth sign-in was dismissed');
        } else {
          console.log('OAuth result type:', result.type);
          throw new Error(`Unexpected OAuth result: ${result.type}`);
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'myapp://auth/reset-password',
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // If no active session, consider the user signed out and clear UI state
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSession(null);
        setUser(null);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      const message = (error as Error)?.message ?? '';
      if (message.includes('Auth session missing')) {
        // Best-effort local sign-out, ignore errors from this fallback
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setUser(null);
        return;
      }
      console.error('Error signing out:', error);
      throw error as Error;
    }
  };

  const value = {
    session,
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
