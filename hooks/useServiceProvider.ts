import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceProvider, ServiceRegistration } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useServiceProvider(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [registrations, setRegistrations] = useState<ServiceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProvider = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch provider profile
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (providerError && providerError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is OK if provider doesn't exist yet
        throw providerError;
      }

      setProvider(providerData || null);

      // Fetch registrations if provider exists
      if (providerData) {
        const { data: regData, error: regError } = await supabase
          .from('service_registrations')
          .select('*')
          .eq('provider_id', targetUserId)
          .order('created_at', { ascending: false });

        if (regError) throw regError;
        setRegistrations(regData || []);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching service provider:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const createOrUpdateProvider = async (providerData: {
    company_name: string;
    ico?: string;
    dic?: string;
    address?: string;
    phone: string;
    billing_email: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('service_providers')
        .upsert({
          user_id: user.id,
          ...providerData,
        })
        .select()
        .single();

      if (error) throw error;
      setProvider(data);
      return data;
    } catch (err) {
      console.error('Error creating/updating provider:', err);
      throw err;
    }
  };

  return {
    provider,
    registrations,
    loading,
    error,
    refetch: fetchProvider,
    createOrUpdateProvider,
  };
}

