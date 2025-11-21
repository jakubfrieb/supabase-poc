import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { registerPushToken, savePushToken, setupNotificationListener } from '../lib/notifications';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createSessionFromUrl } from '../lib/deepLinking';

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
      WebBrowser.maybeCompleteAuthSession(); // required for web only
      
      const redirectTo = makeRedirectUri({ path: 'redirect' });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }

      const res = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (res.type === 'success' && res.url) {
        await createSessionFromUrl(res.url);
        // Session will be updated via onAuthStateChange listener
      } else if (res.type === 'cancel') {
        throw new Error('OAuth sign-in was cancelled');
      } else {
        // For dismiss/locked, session might still be created via deep link handler
        // Wait a bit and check
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('OAuth sign-in failed. Please try again.');
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
      const redirectTo = makeRedirectUri({ path: 'redirect' });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
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
