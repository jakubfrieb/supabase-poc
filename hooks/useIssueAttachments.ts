import { useEffect, useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('issue_attachments')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false });
    if (!error) setAttachments(data ?? []);
    setLoading(false);
  }, [issueId]);

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


