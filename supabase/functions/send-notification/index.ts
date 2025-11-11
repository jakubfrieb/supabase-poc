// Supabase Edge Function for sending push notifications
// Triggered automatically by database trigger when issue is created

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  issueId: string;
  issueTitle: string;
  facilityId: string;
  facilityName: string;
  ownerId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();
    console.log('Sending notification for issue:', payload);

    // Determine recipients: facility owner + admins
    const recipientIds = new Set<string>();
    recipientIds.add(payload.ownerId);

    // Admins of the facility
    const { data: admins, error: adminsError } = await supabaseClient
      .from('facility_members')
      .select('user_id')
      .eq('facility_id', payload.facilityId)
      .in('role', ['admin']);

    if (adminsError) {
      console.warn('Failed to fetch facility admins:', adminsError.message);
    } else {
      for (const a of admins ?? []) {
        if (a?.user_id) recipientIds.add(a.user_id as string);
      }
    }

    const recipientIdArray = Array.from(recipientIds);

    // Get push tokens for recipients
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('user_push_tokens')
      .select('token, user_id')
      .in('user_id', recipientIdArray);

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for recipients:', recipientIdArray);
      return new Response(
        JSON.stringify({ message: 'No push tokens found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification messages for Expo Push API
    const messages = tokens.map(({ token }) => ({
      to: token,
      sound: 'default',
      title: 'Nová závada',
      body: `${payload.facilityName}: ${payload.issueTitle}`,
      data: {
        type: 'issue_created',
        issueId: payload.issueId,
        facilityId: payload.facilityId,
        facilityName: payload.facilityName,
      },
    }));

    // Insert in-app notifications for recipients
    const insertRows = recipientIdArray.map((uid) => ({
      user_id: uid,
      type: 'issue_created',
      title: 'Nová závada',
      body: `${payload.facilityName}: ${payload.issueTitle}`,
      data: {
        issueId: payload.issueId,
        facilityId: payload.facilityId,
        facilityName: payload.facilityName,
      },
    }));
    const { error: insertNotifError } = await supabaseClient
      .from('notifications')
      .insert(insertRows);
    if (insertNotifError) {
      console.warn('Failed to insert notifications:', insertNotifError.message);
    }

    // Send notifications via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo Push API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Notifications sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, sent: messages.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

