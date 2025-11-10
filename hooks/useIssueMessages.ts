import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface IssueMessage {
  id: string;
  issue_id: string;
  user_id: string;
  content: string | null;
  attachment_url: string | null;
  created_at: string;
}

export function useIssueMessages(issueId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<IssueMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('issue_messages')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data ?? []);
    setLoading(false);
  }, [issueId]);

  useEffect(() => {
    if (!issueId) return;
    fetchMessages();
    const channel = supabase
      .channel(`issue_messages:${issueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issue_messages', filter: `issue_id=eq.${issueId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as IssueMessage]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as IssueMessage) : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [issueId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string | null, attachmentUrl: string | null) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('issue_messages').insert([
        { issue_id: issueId, user_id: user.id, content, attachment_url: attachmentUrl },
      ]);
      if (error) throw error;
    },
    [issueId, user]
  );

  return { messages, loading, fetchMessages, sendMessage };
}


