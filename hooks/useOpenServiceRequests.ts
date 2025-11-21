import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface OpenServiceRequest {
  id: string;
  issue_id: string;
  service_id: string;
  status: 'open' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
  services: {
    id: string;
    name: string;
    description: string | null;
  };
  issues: {
    id: string;
    title: string;
    facility_id: string;
    status: string;
    requires_cooperation: boolean | null;
    cooperation_user_id: string | null;
    assigned_provider_id: string | null;
    selected_appointment_id: string | null;
  };
  facilities: {
    id: string;
    name: string;
  };
  application_count?: number;
}

export function useOpenServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OpenServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all facilities where user is owner, admin, or member
      const { data: ownedFacilities } = await supabase
        .from('facilities')
        .select('id')
        .eq('user_id', user.id);

      const { data: memberFacilities } = await supabase
        .from('facility_members')
        .select('facility_id')
        .eq('user_id', user.id);

      const facilityIds = [
        ...(ownedFacilities || []).map(f => f.id),
        ...(memberFacilities || []).map(m => m.facility_id),
      ];

      // Get all issues where:
      // 1. User is owner/admin/member of facility (facility_id in facilityIds), OR
      // 2. Issue requires cooperation and user is the cooperation_user_id
      // First, get issues in user's facilities
      let facilityIssueIds: string[] = [];
      if (facilityIds.length > 0) {
        const { data: facilityIssues, error: facilityIssuesError } = await supabase
          .from('issues')
          .select('id')
          .in('facility_id', facilityIds);

        if (facilityIssuesError) throw facilityIssuesError;
        facilityIssueIds = (facilityIssues || []).map(i => i.id);
      }

      // Get issues where user is cooperation_user_id
      const { data: cooperationIssues, error: cooperationIssuesError } = await supabase
        .from('issues')
        .select('id')
        .eq('requires_cooperation', true)
        .eq('cooperation_user_id', user.id);

      if (cooperationIssuesError) throw cooperationIssuesError;
      const cooperationIssueIds = (cooperationIssues || []).map(i => i.id);

      // Get issues where user is assigned provider
      const { data: providerIssues, error: providerIssuesError } = await supabase
        .from('issues')
        .select('id')
        .eq('assigned_provider_id', user.id);

      if (providerIssuesError) throw providerIssuesError;
      const providerIssueIds = (providerIssues || []).map(i => i.id);

      // Get issues where user has applied (via service_applications)
      let appliedIssueIds: string[] = [];
      const { data: applications } = await supabase
        .from('service_applications')
        .select('issue_service_requests(issue_id)')
        .eq('provider_id', user.id)
        .in('status', ['pending', 'selected']);

      if (applications) {
        appliedIssueIds = applications
          .map((app: any) => app.issue_service_requests?.issue_id)
          .filter(Boolean);
      }

      // Combine and deduplicate
      const relevantIssueIds = [...new Set([...facilityIssueIds, ...cooperationIssueIds, ...providerIssueIds, ...appliedIssueIds])];

      if (relevantIssueIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get open service requests for these issues
      const { data: requestsData, error: requestsError } = await supabase
        .from('issue_service_requests')
        .select(`
          *,
          services(*),
          issues(id, title, facility_id, status, requires_cooperation, cooperation_user_id, assigned_provider_id, selected_appointment_id)
        `)
        .in('issue_id', relevantIssueIds)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Get facility IDs and fetch facilities
      const requestFacilityIds = [...new Set((requestsData || []).map((req: any) => req.issues?.facility_id).filter(Boolean))];
      let facilitiesMap: Record<string, { id: string; name: string }> = {};

      if (requestFacilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from('facilities')
          .select('id, name')
          .in('id', requestFacilityIds);

        facilitiesMap = (facilities || []).reduce((acc, fac) => {
          acc[fac.id] = fac;
          return acc;
        }, {} as Record<string, { id: string; name: string }>);
      }

      // Get application counts for each request
      const requestIds = (requestsData || []).map(r => r.id);
      let applicationCounts: Record<string, number> = {};

      if (requestIds.length > 0) {
        const { data: applications } = await supabase
          .from('service_applications')
          .select('request_id')
          .in('request_id', requestIds)
          .in('status', ['pending', 'selected']);

        applicationCounts = (applications || []).reduce((acc, app) => {
          acc[app.request_id] = (acc[app.request_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      // Transform data to include application counts and facilities
      const transformedRequests = (requestsData || []).map((req: any) => ({
        ...req,
        facilities: req.issues?.facility_id ? facilitiesMap[req.issues.facility_id] || null : null,
        application_count: applicationCounts[req.id] || 0,
      }));

      setRequests(transformedRequests);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching open service requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
  };
}

