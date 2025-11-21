import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from './supabase';

/**
 * Creates a Supabase session from a deep link URL containing OAuth callback parameters.
 * Handles both access_token/refresh_token (implicit flow) and code (authorization code flow with PKCE).
 * 
 * @param url - The callback URL from OAuth provider (e.g., myapp://auth/callback?access_token=... or ?code=...)
 * @returns The created session or null if no valid tokens/code found
 * @throws Error if there's an error code in the URL or session creation fails
 */
export const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  
  if (errorCode) {
    throw new Error(errorCode);
  }
  
  const { access_token, refresh_token, code } = params;
  
  // Handle authorization code flow (PKCE)
  if (code && !access_token) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code as string);
    if (error) throw error;
    return data.session;
  }
  
  // Handle implicit flow (access_token/refresh_token)
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: access_token as string,
      refresh_token: refresh_token as string,
    });
    if (error) throw error;
    return data.session;
  }
  
  return null;
};

