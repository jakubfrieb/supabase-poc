import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceApplication } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useServiceApplications(requestId: string) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ServiceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_applications')
        .select('*, service_providers(*)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching service applications:', err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (user && requestId) {
      fetchApplications();
    }
  }, [user, requestId, fetchApplications]);

  const createApplication = async (application: {
    request_id: string;
    message?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Check if limit of 3 applicants is reached and if user has already applied
      const { data: existingApplications, error: countError } = await supabase
        .from('service_applications')
        .select('provider_id')
        .eq('request_id', application.request_id)
        .in('status', ['pending', 'selected']);

      if (countError) throw countError;

      // Check if user has already applied
      if (existingApplications?.some(app => app.provider_id === user.id)) {
        throw new Error('Již jste se k této poptávce přihlásili.');
      }

      // Check if limit of 3 applicants is reached
      if (existingApplications && existingApplications.length >= 3) {
        throw new Error('Maximální počet uchazečů (3) byl dosažen pro tuto poptávku.');
      }

      const { data, error } = await supabase
        .from('service_applications')
        .insert([{ ...application, provider_id: user.id, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      
      // If message is provided, add it to issue messages
      if (application.message && application.message.trim()) {
        // Get issue_id from request
        const { data: request, error: requestError } = await supabase
          .from('issue_service_requests')
          .select('issue_id')
          .eq('id', application.request_id)
          .single();

        if (!requestError && request) {
          // Get provider info for the message
          const { data: provider } = await supabase
            .from('service_providers')
            .select('company_name')
            .eq('user_id', user.id)
            .single();

          const providerName = provider?.company_name || 'Dodavatel';
          const messageText = `[Přihláška k poptávce - ${providerName}]\n${application.message.trim()}`;

          // Add message to issue
          await supabase
            .from('issue_messages')
            .insert([{
              issue_id: request.issue_id,
              user_id: user.id,
              content: messageText,
            }]);
        }
      }
      
      setApplications([data, ...applications]);
      return data;
    } catch (err) {
      console.error('Error creating service application:', err);
      throw err;
    }
  };

  const selectApplication = async (applicationId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Update selected application
      const { data: selected, error: selectError } = await supabase
        .from('service_applications')
        .update({ status: 'selected' })
        .eq('id', applicationId)
        .select()
        .single();

      if (selectError) throw selectError;

      // Reject other applications for the same request
      const { error: rejectError } = await supabase
        .from('service_applications')
        .update({ status: 'rejected' })
        .eq('request_id', selected.request_id)
        .neq('id', applicationId)
        .eq('status', 'pending');

      if (rejectError) throw rejectError;

      // Get request to update issue
      const { data: request, error: requestError } = await supabase
        .from('issue_service_requests')
        .select('issue_id')
        .eq('id', selected.request_id)
        .single();

      if (requestError) throw requestError;

      // Update issue with assigned provider
      const { error: issueError } = await supabase
        .from('issues')
        .update({
          assigned_provider_id: selected.provider_id,
          status: 'in_progress',
        })
        .eq('id', request.issue_id);

      if (issueError) throw issueError;

      // Close the request
      await supabase
        .from('issue_service_requests')
        .update({ status: 'closed' })
        .eq('id', selected.request_id);

      await fetchApplications();
      return selected;
    } catch (err) {
      console.error('Error selecting application:', err);
      throw err;
    }
  };

  const rejectApplication = async (applicationId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      setApplications(applications.map(a => (a.id === applicationId ? data : a)));
      return data;
    } catch (err) {
      console.error('Error rejecting application:', err);
      throw err;
    }
  };

  return {
    applications,
    loading,
    error,
    refetch: fetchApplications,
    createApplication,
    selectApplication,
    rejectApplication,
  };
}

