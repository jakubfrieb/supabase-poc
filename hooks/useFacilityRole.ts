import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type FacilityRole = 'owner' | 'admin' | 'member' | 'viewer' | null;

export function useFacilityRole(facilityId: string | null) {
  const [role, setRole] = useState<FacilityRole>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!facilityId || !user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        // Check if user is owner (facility.user_id)
        const { data: facility, error: facilityError } = await supabase
          .from('facilities')
          .select('user_id')
          .eq('id', facilityId)
          .single();

        if (!facilityError && facility && facility.user_id === user.id) {
          setRole('owner');
          setLoading(false);
          return;
        }

        // Check if user is member with role
        const { data: member, error: memberError } = await supabase
          .from('facility_members')
          .select('role')
          .eq('facility_id', facilityId)
          .eq('user_id', user.id)
          .single();

        if (!memberError && member) {
          setRole(member.role as FacilityRole);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error('Error fetching facility role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [facilityId, user]);

  const isAdminOrOwner = role === 'owner' || role === 'admin';

  return { role, loading, isAdminOrOwner };
}

