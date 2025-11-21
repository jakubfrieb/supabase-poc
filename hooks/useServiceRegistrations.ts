import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceRegistration, Service } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useServiceRegistrations(providerId?: string) {
  const { user } = useAuth();
  const targetProviderId = providerId || user?.id;
  
  const [registrations, setRegistrations] = useState<ServiceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRegistrations = useCallback(async () => {
    if (!targetProviderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_registrations')
        .select('*, services(*)')
        .eq('provider_id', targetProviderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching service registrations:', err);
    } finally {
      setLoading(false);
    }
  }, [targetProviderId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const createRegistrations = async (serviceIds: string[]) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const registrations = serviceIds.map(serviceId => ({
        provider_id: user.id,
        service_id: serviceId,
        status: 'pending' as const,
      }));

      const { data, error } = await supabase
        .from('service_registrations')
        .insert(registrations)
        .select();

      if (error) throw error;
      await fetchRegistrations();
      return data;
    } catch (err) {
      console.error('Error creating registrations:', err);
      throw err;
    }
  };

  const activateWithVoucher = async (voucherCode: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const trimmedCode = voucherCode.trim();

      // Validate voucher
      const { data: voucher, error: voucherError } = await supabase
        .from('service_vouchers')
        .select('months, active, expires_at, max_uses')
        .eq('code', trimmedCode)
        .single();

      if (voucherError || !voucher) throw new Error('Neplatný voucher');
      if (!voucher.active) throw new Error('Voucher je neaktivní');
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        throw new Error('Voucher vypršel');
      }

      // Check if this user already used this voucher
      const { data: existingUse } = await supabase
        .from('service_voucher_uses')
        .select('id')
        .eq('voucher_code', trimmedCode)
        .eq('provider_id', user.id)
        .single();

      if (existingUse) throw new Error('Tento voucher jste již použili');

      // Check if voucher has reached max uses
      const { count: useCount, error: countError } = await supabase
        .from('service_voucher_uses')
        .select('*', { count: 'exact', head: true })
        .eq('voucher_code', trimmedCode);

      if (countError) throw countError;

      const maxUses = voucher.max_uses ?? 1;
      if (useCount !== null && useCount >= maxUses) {
        throw new Error(`Voucher byl již použit maximální počet (${maxUses}x)`);
      }

      // Calculate paid_until date
      const paidUntil = new Date();
      paidUntil.setMonth(paidUntil.getMonth() + (voucher.months || 3));

      // Update all pending registrations to active
      const { error: updateError } = await supabase
        .from('service_registrations')
        .update({
          status: 'active',
          paid_until: paidUntil.toISOString(),
        })
        .eq('provider_id', user.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      // Record voucher use
      const { error: useError } = await supabase
        .from('service_voucher_uses')
        .insert({
          voucher_code: trimmedCode,
          provider_id: user.id,
        });

      if (useError) throw useError;

      await fetchRegistrations();
      return { success: true, paidUntil };
    } catch (err: any) {
      console.error('Error activating with voucher:', err);
      throw err;
    }
  };

  const activateWelcomePackage = async (serviceIds: string[]) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Create registrations if they don't exist
      const registrations = serviceIds.map(serviceId => ({
        provider_id: user.id,
        service_id: serviceId,
        status: 'pending' as const,
      }));

      // Insert registrations (ignore conflicts if already exist)
      const { data: createdRegs, error: insertError } = await supabase
        .from('service_registrations')
        .upsert(registrations, { onConflict: 'provider_id,service_id' })
        .select();

      if (insertError) throw insertError;

      // Calculate paid_until date (3 months from now)
      const paidUntil = new Date();
      paidUntil.setMonth(paidUntil.getMonth() + 3);

      // Activate registrations for selected services
      const { error: updateError } = await supabase
        .from('service_registrations')
        .update({
          status: 'active',
          paid_until: paidUntil.toISOString(),
        })
        .eq('provider_id', user.id)
        .in('service_id', serviceIds);

      if (updateError) throw updateError;

      await fetchRegistrations();
      return { success: true, paidUntil };
    } catch (err: any) {
      console.error('Error activating welcome package:', err);
      throw err;
    }
  };

  const createPayment = async (registrationId: string, amount: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('service_payments')
        .insert({
          registration_id: registrationId,
          amount,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating payment:', err);
      throw err;
    }
  };

  return {
    registrations,
    loading,
    error,
    refetch: fetchRegistrations,
    createRegistrations,
    activateWithVoucher,
    activateWelcomePackage,
    createPayment,
  };
}

