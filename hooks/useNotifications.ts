import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: any;
  read_at: string | null;
  created_at: string;
};

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { count: c, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (!error && typeof c === 'number') {
      setCount(c);
    } else if (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Any change might affect unread count
          fetchCount();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  // Export funkce pro okamžitou aktualizaci count (decrement)
  const decrementCount = useCallback(() => {
    setCount(prev => Math.max(0, prev - 1));
  }, []);

  return { count, refresh: fetchCount, decrementCount };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setNotifications(data as NotificationRecord[] || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', id);
    
    // Okamžitě aktualizuj lokální state pro rychlou UI reakci
    if (!error) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read_at: readAt } : notif
        )
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .is('read_at', null)
      .eq('user_id', user.id);
    
    // Okamžitě aktualizuj lokální state pro rychlou UI reakci
    if (!error) {
      setNotifications(prev => 
        prev.map(notif => 
          !notif.read_at ? { ...notif, read_at: readAt } : notif
        )
      );
    }
  }, [user]);

  return {
    notifications,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllRead,
  };
}


