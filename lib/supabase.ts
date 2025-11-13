import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Try to get from process.env first (development), then from Constants.extra (build)
// Support both expoConfig (newer) and manifest (older) formats
const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const supabaseUrl = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  extra.supabaseUrl || 
  '';
const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  extra.supabaseAnonKey || 
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env file or app.config.js');
  throw new Error('supabaseUrl and supabaseAnonKey are required. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export supabaseUrl for use in OAuth flows
export { supabaseUrl };
