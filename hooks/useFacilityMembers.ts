import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FacilityRole } from './useFacilityRole';

export interface FacilityMember {
  user_id: string;
  role: FacilityRole;
  created_at: string;
  // User profile data
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function useFacilityMembers(facilityId: string | null) {
  const [members, setMembers] = useState<FacilityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!facilityId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch facility owner
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .select('user_id')
        .eq('id', facilityId)
        .single();

      if (facilityError) throw facilityError;

      const ownerId = facility.user_id;

      // Fetch facility members (excluding owner if they're also in members)
      const { data: membersData, error: membersError } = await supabase
        .from('facility_members')
        .select('user_id, role, created_at')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Get all user IDs (owner + members)
      const allUserIds = [ownerId, ...(membersData?.map(m => m.user_id) || [])].filter(
        (id, index, self) => self.indexOf(id) === index // Remove duplicates
      );

      // Fetch profiles for all users
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, phone, avatar_url')
        .in('user_id', allUserIds);

      // Fetch emails for all users using RPC function
      const emailPromises = allUserIds.map(async (userId) => {
        const { data, error } = await supabase.rpc('get_user_email', { user_id_param: userId });
        if (error || !data || data.length === 0) return { userId, email: null };
        return { userId, email: data[0].email || null };
      });

      const emailsData = await Promise.all(emailPromises);
      const emailsMap = new Map(emailsData.map(e => [e.userId, e.email]));

      // Build members array
      const allMembers: FacilityMember[] = [];

      // Add owner first
      const ownerProfile = profilesData?.find(p => p.user_id === ownerId);
      allMembers.push({
        user_id: ownerId,
        role: 'owner',
        created_at: '',
        first_name: ownerProfile?.first_name || null,
        last_name: ownerProfile?.last_name || null,
        phone: ownerProfile?.phone || null,
        email: emailsMap.get(ownerId) || null,
        avatar_url: ownerProfile?.avatar_url || null,
      });

      // Add members
      if (membersData) {
        for (const member of membersData) {
          // Skip owner if they're also in members
          if (member.user_id === ownerId) continue;

          const profile = profilesData?.find(p => p.user_id === member.user_id);
          allMembers.push({
            user_id: member.user_id,
            role: member.role as FacilityRole,
            created_at: member.created_at,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            phone: profile?.phone || null,
            email: emailsMap.get(member.user_id) || null,
            avatar_url: profile?.avatar_url || null,
          });
        }
      }

      setMembers(allMembers);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching facility members:', err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMemberRole = async (userId: string, newRole: FacilityRole) => {
    if (!facilityId || !newRole) return;

    try {
      const { error: updateError } = await supabase
        .from('facility_members')
        .update({ role: newRole })
        .eq('facility_id', facilityId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error('Error updating member role:', err);
      throw err;
    }
  };

  const removeMember = async (userId: string) => {
    if (!facilityId) return;

    try {
      const { error: deleteError } = await supabase
        .from('facility_members')
        .delete()
        .eq('facility_id', facilityId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  return {
    members,
    loading,
    error,
    fetchMembers,
    updateMemberRole,
    removeMember,
  };
}

