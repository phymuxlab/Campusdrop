import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@campusdrop.app';

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorised.');

    const body = await req.json();
    const userIds = Array.isArray(body.user_ids) ? body.user_ids.filter((v: unknown): v is string => typeof v === 'string') : [];
    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : null;
    const title = String(body.title || 'CampusDrop').slice(0, 120);
    const message = String(body.body || '').slice(0, 500);
    const url = String(body.url || '/').slice(0, 500);
    if (!userIds.length || !message) throw new Error('user_ids and body are required.');

    const admin = createClient(supabaseUrl, serviceKey);
    if (conversationId) {
      const { data: conversation, error: conversationError } = await admin.from('conversations').select('buyer_id,seller_id').eq('id', conversationId).maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation || ![conversation.buyer_id, conversation.seller_id].includes(user.id)) throw new Error('You are not a participant in this conversation.');
      if (userIds.length !== 1 || ![conversation.buyer_id, conversation.seller_id].includes(userIds[0])) throw new Error('Invalid conversation recipient.');
      if (userIds[0] === user.id) throw new Error('Cannot send a message push to yourself.');
    } else if (userIds.some((id: string) => id !== user.id)) {
      throw new Error('A self notification can only be sent for the signed-in user.');
    }

    const { data: subscriptions, error: subError } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', userIds);
    if (subError) throw subError;

    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({ title, body: message, url, icon: '/campusdrop-mark.png', badge: '/campusdrop-mark.png' });
    let sent = 0;
    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      }
    }
    return new Response(JSON.stringify({ sent }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Push failed.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
