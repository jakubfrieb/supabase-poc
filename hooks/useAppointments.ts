import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceAppointment } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useAppointments(issueId: string) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!issueId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_appointments')
        .select('*')
        .eq('issue_id', issueId)
        .order('proposed_date', { ascending: true })
        .order('proposed_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (user && issueId) {
      fetchAppointments();
    }
  }, [user, issueId, fetchAppointments]);

  const proposeAppointment = async (appointment: {
    issue_id: string;
    provider_id: string;
    proposed_date: string;
    proposed_time: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('service_appointments')
        .insert([{
          ...appointment,
          proposed_by: user.id,
          status: 'proposed',
        }])
        .select()
        .single();

      if (error) throw error;
      setAppointments([...appointments, data]);
      return data;
    } catch (err) {
      console.error('Error proposing appointment:', err);
      throw err;
    }
  };

  const confirmAppointment = async (appointmentId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Use RPC function to confirm appointment (bypasses RLS issues)
      const { data, error } = await supabase
        .rpc('confirm_appointment', {
          appointment_uuid: appointmentId,
          issue_uuid: issueId,
        });

      if (error) throw error;

      // Refresh appointments list to get updated data
      await fetchAppointments();
      
      // Return the first result from RPC (should be the confirmed appointment)
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error confirming appointment:', err);
      throw err;
    }
  };

  const rejectAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_appointments')
        .update({ status: 'rejected' })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      setAppointments(appointments.map(a => (a.id === appointmentId ? data : a)));
      return data;
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      throw err;
    }
  };

  const completeAppointment = async (appointmentId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('service_appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      setAppointments(appointments.map(a => (a.id === appointmentId ? data : a)));
      return data;
    } catch (err) {
      console.error('Error completing appointment:', err);
      throw err;
    }
  };

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    proposeAppointment,
    confirmAppointment,
    rejectAppointment,
    completeAppointment,
  };
}

