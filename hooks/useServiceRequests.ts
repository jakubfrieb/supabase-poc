import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IssueServiceRequest } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useServiceRequests(issueId?: string) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<IssueServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from('issue_service_requests').select('*, services(*), issues(facility_id)');

      if (issueId) {
        query = query.eq('issue_id', issueId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching service requests:', err);
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const createRequest = async (request: {
    issue_id: string;
    service_id: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Create the request
      const { data, error } = await supabase
        .from('issue_service_requests')
        .insert([{ ...request, created_by: user.id, status: 'open' }])
        .select()
        .single();

      if (error) throw error;
      setRequests([data, ...requests]);

      // Get issue and service info for notifications
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .select('title, facility_id')
        .eq('id', request.issue_id)
        .single();

      let facilityName = 'Neznámá nemovitost';
      if (issue && !issueError && issue.facility_id) {
        const { data: facility } = await supabase
          .from('facilities')
          .select('name')
          .eq('id', issue.facility_id)
          .single();
        if (facility) {
          facilityName = facility.name;
        }
      }

      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('name')
        .eq('id', request.service_id)
        .single();

      if (issueError || serviceError) {
        console.warn('Failed to fetch issue or service info for notifications:', issueError || serviceError);
      }

      // Find all providers with active registration for this service
      // (status = 'active' AND (paid_until IS NULL OR paid_until > NOW()))
      const now = new Date().toISOString();
      const { data: allRegistrations, error: allRegError } = await supabase
        .from('service_registrations')
        .select('provider_id, paid_until')
        .eq('service_id', request.service_id)
        .eq('status', 'active');

      // Filter to only those with valid paid_until (null or future date)
      const registrations = allRegistrations?.filter(reg => 
        !reg.paid_until || new Date(reg.paid_until) > new Date()
      ) || [];
      
      const regError = allRegError;

      if (regError) {
        console.warn('Failed to fetch service registrations for notifications:', regError);
      } else if (registrations && registrations.length > 0) {
        // Create notifications for all relevant providers
        const providerIds = registrations.map(r => r.provider_id);
        const issueTitle = issue?.title || 'Nová závada';
        const serviceName = service?.name || 'Služba';

        const notifications = providerIds.map(providerId => ({
          user_id: providerId,
          type: 'service_request_created',
          title: 'Nová poptávka',
          body: `${facilityName}: ${issueTitle} - ${serviceName}`,
          data: {
            issueId: request.issue_id,
            requestId: data.id,
            serviceId: request.service_id,
            facilityId: issue?.facility_id,
            facilityName,
            issueTitle,
            serviceName,
          },
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.warn('Failed to create notifications for providers:', notifError);
        } else {
          console.log(`Created ${notifications.length} notifications for service providers`);
        }
      }

      return data;
    } catch (err) {
      console.error('Error creating service request:', err);
      throw err;
    }
  };

  const closeRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('issue_service_requests')
        .update({ status: 'closed' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      setRequests(requests.map(r => (r.id === requestId ? data : r)));
      return data;
    } catch (err) {
      console.error('Error closing service request:', err);
      throw err;
    }
  };

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    closeRequest,
  };
}

