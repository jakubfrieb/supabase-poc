import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useServiceProvider } from './useServiceProvider';
import { useServiceRegistrations } from './useServiceRegistrations';

export interface ProviderServiceRequest {
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
    assigned_provider_id: string | null;
    selected_appointment_id: string | null;
  };
  facilities: {
    id: string;
    name: string;
  };
  application_status?: 'pending' | 'selected' | 'rejected' | null;
  application_id?: string | null;
  application_count?: number;
}

export function useProviderServiceRequests() {
  const { user } = useAuth();
  const { provider } = useServiceProvider();
  const { registrations } = useServiceRegistrations();
  const [requests, setRequests] = useState<ProviderServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user || !provider) {
      setLoading(false);
      setRequests([]);
      return;
    }

    try {
      setLoading(true);

      // Get active service IDs that provider has registered
      const now = new Date().toISOString();
      const activeServiceIds = registrations
        .filter(reg =>
          reg.status === 'active' &&
          (!reg.paid_until || new Date(reg.paid_until) > new Date())
        )
        .map(reg => reg.service_id);

      // Get requests where provider has applied
      const { data: applications } = await supabase
        .from('service_applications')
        .select('request_id, status, id')
        .eq('provider_id', user.id)
        .in('status', ['pending', 'selected']);

      const appliedRequestIds = (applications || []).map(app => app.request_id);
      const applicationMap = new Map(
        (applications || []).map(app => [app.request_id, { status: app.status, id: app.id }])
      );

      // Get all open requests for active services
      let requestsData: any[] = [];

      if (activeServiceIds.length > 0) {
        const { data, error: requestsError } = await supabase
          .from('issue_service_requests')
          .select(`
            *,
            services(*),
            issues(id, title, facility_id, status, assigned_provider_id, selected_appointment_id)
          `)
          .eq('status', 'open')
          .in('service_id', activeServiceIds)
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;
        requestsData = data || [];
      }

      // Also get requests where provider has applied (if not already included by service_id)
      let additionalRequests: any[] = [];
      if (appliedRequestIds.length > 0 && activeServiceIds.length > 0) {
        const { data: appliedRequestsData } = await supabase
          .from('issue_service_requests')
          .select(`
            *,
            services(*),
            issues(id, title, facility_id, status, assigned_provider_id, selected_appointment_id)
          `)
          .in('id', appliedRequestIds)
          .eq('status', 'open');

        // Filter out requests that are already included via activeServiceIds
        additionalRequests = (appliedRequestsData || []).filter(
          (req: any) => !activeServiceIds.includes(req.service_id)
        );
      } else if (appliedRequestIds.length > 0 && activeServiceIds.length === 0) {
        // If no active services, get all applied requests
        const { data: appliedRequestsData } = await supabase
          .from('issue_service_requests')
          .select(`
            *,
            services(*),
            issues(id, title, facility_id, status, assigned_provider_id, selected_appointment_id)
          `)
          .in('id', appliedRequestIds)
          .eq('status', 'open');

        additionalRequests = appliedRequestsData || [];
      }

      // Combine all requests and get facility IDs
      let allRequests = [...requestsData, ...additionalRequests];

      // Filter out requests for issues where provider is already assigned
      // (provider should not see these in available/applied requests, they're shown separately via useProviderIssues)
      // Note: We don't filter out issues where provider has applied - those should appear in "Přihlášené poptávky"
      if (user) {
        const { data: assignedIssues } = await supabase
          .from('issues')
          .select('id')
          .eq('assigned_provider_id', user.id);

        const assignedIssueIds = new Set((assignedIssues || []).map(i => i.id));

        allRequests = allRequests.filter((req: any) => {
          // Filter out requests created by the current user (provider shouldn't see their own requests)
          if (req.created_by === user.id) return false;

          // Keep request if issue is not assigned to this provider
          // (applied requests will be filtered in FacilitiesScreen when creating availableRequests)
          return !assignedIssueIds.has(req.issue_id);
        });
      }

      if (allRequests.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get issue IDs where issues is null (due to RLS) and fetch facility_id directly
      const issueIdsNeedingFacilityId = allRequests
        .filter((req: any) => !req.issues && req.issue_id)
        .map((req: any) => req.issue_id);

      let facilityIdMap: Record<string, string> = {};

      if (issueIdsNeedingFacilityId.length > 0) {
        // Try to fetch facility_id directly from issues table
        // This might fail due to RLS, but we'll try
        const { data: issuesData } = await supabase
          .from('issues')
          .select('id, facility_id')
          .in('id', issueIdsNeedingFacilityId);

        if (issuesData) {
          issuesData.forEach((issue: any) => {
            if (issue.facility_id) {
              facilityIdMap[issue.id] = issue.facility_id;
            }
          });
        }
      }

      // Get facility IDs from both sources
      const facilityIdsFromIssues = [...new Set(allRequests.map((req: any) => req.issues?.facility_id).filter(Boolean))];
      const facilityIdsFromMap = [...new Set(Object.values(facilityIdMap))];
      const allFacilityIds = [...new Set([...facilityIdsFromIssues, ...facilityIdsFromMap])];

      let facilitiesMap: Record<string, { id: string; name: string }> = {};

      if (allFacilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from('facilities')
          .select('id, name')
          .in('id', allFacilityIds);

        facilitiesMap = (facilities || []).reduce((acc, fac) => {
          acc[fac.id] = fac;
          return acc;
        }, {} as Record<string, { id: string; name: string }>);
      }

      // Get application counts for each request
      const requestIds = Array.from(new Set(allRequests.map((req: any) => req.id)));
      let applicationCounts: Record<string, number> = {};

      if (requestIds.length > 0) {
        const { data: allApplications } = await supabase
          .from('service_applications')
          .select('request_id')
          .in('request_id', requestIds)
          .in('status', ['pending', 'selected']);

        applicationCounts = (allApplications || []).reduce((acc, app) => {
          acc[app.request_id] = (acc[app.request_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      // Remove duplicates and add application status, facilities, and counts
      const uniqueRequests = new Map<string, any>();

      allRequests.forEach((req: any) => {
        if (!uniqueRequests.has(req.id)) {
          const appInfo = applicationMap.get(req.id);
          // Get facility_id from issues object or from facilityIdMap
          const facilityId = req.issues?.facility_id || facilityIdMap[req.issue_id];
          const facility = facilityId ? facilitiesMap[facilityId] || null : null;

          // If issues is null but we have facility_id, create a minimal issues object
          let issues = req.issues;
          if (!issues && facilityId) {
            issues = {
              id: req.issue_id,
              facility_id: facilityId,
              title: null,
              status: null,
            };
          }

          uniqueRequests.set(req.id, {
            ...req,
            issues,
            facilities: facility,
            application_status: appInfo?.status || null,
            application_id: appInfo?.id || null,
            application_count: applicationCounts[req.id] || 0,
          });
        }
      });

      setRequests(Array.from(uniqueRequests.values()));
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching provider service requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user, provider, registrations]);

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

