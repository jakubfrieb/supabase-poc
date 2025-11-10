import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Issue, IssueStatus, IssuePriority } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useIssues(facilityId?: string) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user && facilityId) {
      fetchIssues();
    }
  }, [user, facilityId]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      let query = supabase.from('issues').select('*');

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const createIssue = async (issue: {
    title: string;
    description?: string;
    status?: IssueStatus;
    priority?: IssuePriority;
    facility_id: string;
  }) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('issues')
        .insert([{ ...issue, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      setIssues([data, ...issues]);
      return data;
    } catch (err) {
      console.error('Error creating issue:', err);
      throw err;
    }
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setIssues(issues.map(i => i.id === id ? data : i));
      return data;
    } catch (err) {
      console.error('Error updating issue:', err);
      throw err;
    }
  };

  const deleteIssue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setIssues(issues.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting issue:', err);
      throw err;
    }
  };

  return {
    issues,
    loading,
    error,
    fetchIssues,
    createIssue,
    updateIssue,
    deleteIssue,
  };
}
