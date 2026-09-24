'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { createClient } from '../lib/supabase';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Push notifications are not supported by this browser.');
  return navigator.serviceWorker.register('/sw.js');
}

export default function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        setEnabled(!!subscription);
      } catch {}
    })();
  }, []);

  async function enable() {
    setBusy(true); setMessage(''); setError('');
    try {
      if (!supported) throw new Error('Push notifications are not supported on this device/browser.');
      if (!PUBLIC_KEY) throw new Error('Push notifications are not configured yet. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to the production environment.');
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') throw new Error('Notification permission was not granted.');
      const registration = await registerPushServiceWorker();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Could not create a push subscription.');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in first.');
      const { error: saveError } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 500),
      }, { onConflict: 'endpoint' });
      if (saveError) throw saveError;
      setEnabled(true);
      setMessage('Phone notifications are enabled.');
    } catch (err: any) {
      setError(err?.message || 'Could not enable notifications.');
    } finally { setBusy(false); }
  }

  async function testPush() {
    setBusy(true); setMessage(''); setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in first.');
      const { error: pushError } = await supabase.functions.invoke('push-notify', { body: { user_ids: [user.id], title: 'CampusDrop test', body: 'Push notifications are working on this device.', url: '/settings' } });
      if (pushError) throw pushError;
      setMessage('Test notification sent.');
    } catch (err: any) {
      setError(err?.message || 'Could not send the test notification.');
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMessage(''); setError('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      await subscription?.unsubscribe();
      const supabase = createClient();
      if (endpoint) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      setEnabled(false);
      setMessage('Phone notifications are disabled.');
    } catch (err: any) {
      setError(err?.message || 'Could not disable notifications.');
    } finally { setBusy(false); }
  }

  if (!supported) return <div className="pushCard"><div className="pushIcon"><Smartphone size={19}/></div><div><b>Phone notifications</b><p className="muted">This browser does not support web push notifications.</p></div></div>;

  return <div className="pushCard">
    <div className="pushIcon"><Bell size={19}/></div>
    <div className="pushContent">
      <div className="pushHead"><div><b>Phone notifications</b><p className="muted">Get alerts for new messages and important CampusDrop notifications.</p></div><span className={`pushStatus ${enabled ? 'on' : ''}`}>{enabled ? 'On' : 'Off'}</span></div>
      <div className="actionsRow pushActions">
        {!enabled ? <button className="btn green" onClick={enable} disabled={busy}><Bell size={16}/>{busy ? 'Enabling...' : 'Enable notifications'}</button> : <><button className="btn green" onClick={testPush} disabled={busy}><Bell size={16}/>{busy ? 'Sending...' : 'Send test notification'}</button><button className="btn light" onClick={disable} disabled={busy}><BellOff size={16}/>{busy ? 'Disabling...' : 'Disable notifications'}</button></>}
      </div>
      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}
      {permission === 'denied' && <p className="muted pushHint">Notifications are blocked in your browser settings. Allow CampusDrop notifications there, then try again.</p>}
      <p className="muted pushHint">On iPhone, add CampusDrop to your Home Screen first, then enable notifications.</p>
    </div>
  </div>;
}
