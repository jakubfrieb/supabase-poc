import { useEffect, useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useServiceProvider } from './useServiceProvider';

export type IssueAttachment = {
  id: string;
  issue_id: string;
  uploaded_by: string;
  file_name: string;
  content_type: string;
  file_size: number | null;
  url: string;
  created_at: string;
};

export function useIssueAttachments(issueId: string) {
  const { user } = useAuth();
  const { provider } = useServiceProvider();
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    // First try normal access
    let { data, error } = await supabase
      .from('issue_attachments')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false });

    // If that fails (e.g., due to RLS for providers), try RPC function
    // PGRST116 = no rows returned, 42501 = insufficient privilege
    // Also try RPC if user is a provider and got empty result (RLS might return empty instead of error)
    const shouldTryRPC = error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.code === '42501') ||
                         (provider && (!data || data.length === 0) && !error);

    if (shouldTryRPC) {
      console.log('Trying RPC function for provider access to attachments');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_issue_attachments_for_provider', { issue_uuid: issueId });

      if (rpcError) {
        console.error('RPC error fetching attachments:', rpcError);
        // If RPC also fails, use empty array or original data if available
        setAttachments(data ?? []);
      } else {
        // Use RPC data if available, otherwise use original data
        setAttachments(rpcData && rpcData.length > 0 ? rpcData : (data ?? []));
      }
    } else if (error) {
      console.error('Error fetching issue attachments:', error);
      setAttachments([]);
    } else {
      setAttachments(data ?? []);
    }
    setLoading(false);
  }, [issueId, provider]);

  useEffect(() => {
    if (!issueId) return;
    fetchAttachments();
  }, [issueId, fetchAttachments]);

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    return res;
  };

  const uploadFile = async (file: { uri: string; name: string; mimeType?: string; size?: number }) => {
    if (!user) throw new Error('Not authenticated');
    const response = await fetch(file.uri);
    const ab = await response.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const contentType = file.mimeType || (ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'application/octet-stream');
    const path = `issues/${issueId}/${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('issue-attachments')
      .upload(path, bytes, { cacheControl: '3600', upsert: false, contentType });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('issue-attachments').getPublicUrl(path);
    const { data: inserted, error: insErr } = await supabase
      .from('issue_attachments')
      .insert([{
        issue_id: issueId,
        uploaded_by: user.id,
        file_name: file.name,
        content_type: contentType,
        file_size: typeof file.size === 'number' ? file.size : null,
        url: data.publicUrl,
      }])
      .select()
      .single();
    if (insErr) throw insErr;
    setAttachments((prev) => [inserted, ...prev]);
  };

  const deleteAttachment = async (id: string) => {
    const att = attachments.find(a => a.id === id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    await supabase.from('issue_attachments').delete().eq('id', id);
    // Optionally delete storage object (left as later improvement if we tracked path)
  };

  return { attachments, loading, fetchAttachments, pickDocument, uploadFile, deleteAttachment };
}


