import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Issue } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useProviderIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchIssues = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // First try normal access
      let { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('assigned_provider_id', user.id)
        .order('created_at', { ascending: false });

      // If that fails (e.g., due to RLS), try alternative approach
      if (error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.code === '42501')) {
        console.log('Normal access failed for provider issues, trying alternative approach');
        // Get issue IDs where provider is assigned via service_applications with selected status
        // or by checking issue_service_requests where provider has selected application
        const { data: selectedApplications } = await supabase
          .from('service_applications')
          .select('issue_service_requests(issue_id)')
          .eq('provider_id', user.id)
          .eq('status', 'selected');

        if (selectedApplications && selectedApplications.length > 0) {
          const issueIds = selectedApplications
            .map((app: any) => app.issue_service_requests?.issue_id)
            .filter(Boolean) as string[];
          
          // Fetch each issue using RPC function
          const issues: any[] = [];
          await Promise.all(
            issueIds.map(async (issueId) => {
              try {
                const { data: rpcData, error: rpcError } = await supabase
                  .rpc('get_issue_for_provider', { issue_uuid: issueId });
                
                if (!rpcError && rpcData && rpcData.length > 0) {
                  const issue = rpcData[0];
                  // Only include if provider is actually assigned
                  if (issue.assigned_provider_id === user.id) {
                    issues.push(issue);
                  }
                }
              } catch (err) {
                console.error(`Error fetching issue ${issueId}:`, err);
              }
            })
          );
          
          data = issues;
          error = null;
        } else {
          data = [];
        }
      }

      if (error) throw error;
      setIssues(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching provider issues:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return {
    issues,
    loading,
    error,
    refetch: fetchIssues,
  };
}

