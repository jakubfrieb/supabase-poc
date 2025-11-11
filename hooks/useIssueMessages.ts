import { useEffect, useState, useCallback, useRef } from 'react';
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
  const recentlySentMessageIdsRef = useRef<Set<string>>(new Set());

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
            const newMessage = payload.new as IssueMessage;
            setMessages((prev) => {
              // Check if message already exists (to avoid duplicates from optimistic updates)
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev;
              }
              // Ignore real-time events for messages we just sent (they're already added optimistically)
              if (recentlySentMessageIdsRef.current.has(newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
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
      
      // Optimistic update - add message immediately
      const optimisticMessage: IssueMessage = {
        id: `temp-${Date.now()}`,
        issue_id: issueId,
        user_id: user.id,
        content,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      
      // Insert message to database
      const { data, error } = await supabase
        .from('issue_messages')
        .insert([
          { issue_id: issueId, user_id: user.id, content, attachment_url: attachmentUrl },
        ])
        .select()
        .single();
      
      if (error) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        throw error;
      }
      
      // Replace optimistic message with real one
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? data : m))
        );
        // Track this message ID to ignore real-time events for it
        recentlySentMessageIdsRef.current.add(data.id);
        // Clear the tracking after a short delay
        setTimeout(() => {
          recentlySentMessageIdsRef.current.delete(data.id);
        }, 2000);
      }
      
      return data;
    },
    [issueId, user]
  );

  return { messages, loading, fetchMessages, sendMessage };
}


