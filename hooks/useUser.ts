import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export function useUser(userId: string | null) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setUserInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch profile data from user_profiles table
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, avatar_url')
        .eq('user_id', userId)
        .single();

      // If it's the current user, use their info directly
      if (currentUser && currentUser.id === userId) {
        const fullName = profileData 
          ? [profileData.first_name, profileData.last_name].filter(Boolean).join(' ')
          : currentUser.user_metadata?.name || currentUser.user_metadata?.full_name;
        
        setUserInfo({
          id: userId,
          email: currentUser.email || 'uživatel',
          name: fullName || undefined,
          avatar_url: profileData?.avatar_url || undefined,
        });
        setLoading(false);
        return;
      }

      // For other users, try to get email from RPC function
      const { data, error } = await supabase.rpc('get_user_email', { user_id_param: userId });
      
      if (error || !data || data.length === 0) {
        // Fallback: use generic user info
        setUserInfo({
          id: userId,
          email: 'uživatel',
          name: profileData 
            ? [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || undefined
            : undefined,
          avatar_url: profileData?.avatar_url || undefined,
        });
      } else {
        const userData = data[0];
        const fullName = profileData 
          ? [profileData.first_name, profileData.last_name].filter(Boolean).join(' ')
          : userData.name;
        
        setUserInfo({
          id: userId,
          email: userData.email || 'uživatel',
          name: fullName || undefined,
          avatar_url: profileData?.avatar_url || undefined,
        });
      }
    } catch (err) {
      // Fallback if RPC is not available
      setUserInfo({
        id: userId,
        email: 'uživatel',
        name: undefined,
        avatar_url: undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    fetchUser();

    // Subscribe to real-time updates for user_profiles
    if (userId) {
      const channel = supabase
        .channel(`user_profile_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // Refresh user data when profile changes
            fetchUser();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, fetchUser]);

  return { userInfo, loading, refresh: fetchUser };
}

