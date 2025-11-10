import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Facility } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchFacilities();
    }
  }, [user]);

  // Refetch when auth state changes (e.g., session token becomes available after OAuth)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchFacilities();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchFacilities = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacilities(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching facilities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFacility = async (facility: { name: string; description?: string; address?: string }) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('facilities')
        .insert([{ ...facility, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setFacilities([data, ...facilities]);
      return data;
    } catch (err) {
      console.error('Error creating facility:', err);
      throw err;
    }
  };

  const updateFacility = async (id: string, updates: Partial<Facility>) => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setFacilities(facilities.map(f => f.id === id ? data : f));
      return data;
    } catch (err) {
      console.error('Error updating facility:', err);
      throw err;
    }
  };

  const deleteFacility = async (id: string) => {
    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFacilities(facilities.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error deleting facility:', err);
      throw err;
    }
  };

  return {
    facilities,
    loading,
    error,
    fetchFacilities,
    createFacility,
    updateFacility,
    deleteFacility,
  };
}
