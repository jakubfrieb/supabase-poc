import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      setProfile(data || null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      let result;
      if (existing) {
        // Update existing profile
        const { data, error: updateError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        // Insert new profile
        const { data, error: insertError } = await supabase
          .from('user_profiles')
          .insert([{ user_id: user.id, ...updates }])
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
      }

      setProfile(result);
      return result;
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  };

  const uploadAvatar = async (imageUri: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Read image as arrayBuffer (React Native compatible)
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Determine file extension and content type
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = fileExt === 'png' ? 'image/png' : 
                         fileExt === 'gif' ? 'image/gif' : 
                         fileExt === 'webp' ? 'image/webp' : 
                         'image/jpeg';

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        // Extract path from public URL (format: .../storage/v1/object/public/avatars/user_id/filename)
        const urlParts = profile.avatar_url.split('/avatars/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1].split('?')[0]; // Remove query params if any
          await supabase.storage
            .from('avatars')
            .remove([oldPath])
            .catch(() => {}); // Ignore errors if file doesn't exist
        }
      }

      // Upload new avatar
      const path = `${user.id}/${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { 
          cacheControl: '3600', 
          upsert: false, 
          contentType 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      
      // Update profile with new avatar URL
      await updateProfile({ avatar_url: data.publicUrl });

      // Small delay to ensure real-time subscription propagates
      await new Promise(resolve => setTimeout(resolve, 500));

      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}

