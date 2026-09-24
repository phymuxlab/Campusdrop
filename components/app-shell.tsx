'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Home, MessageCircle, Plus, ShoppingBag, ChevronDown, Settings, LogOut } from 'lucide-react';
import { createClient } from '../lib/supabase';
import { Avatar } from './avatar';
import { VerifiedName } from './verified-name';


function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { setVisible(localStorage.getItem('campusdrop-cookie-notice') !== 'seen'); } catch { setVisible(false); }
  }, []);
  if (!visible) return null;
  return <div className="cookieNotice" role="status"><div><b>Essential cookies only</b><span>CampusDrop uses essential session storage to keep accounts signed in. Optional tracking is not active.</span></div><button className="btn green" onClick={() => { try { localStorage.setItem('campusdrop-cookie-notice','seen'); } catch {} setVisible(false); }}>Got it</button></div>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [verified, setVerified] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let profileChannel: any;
    let verificationChannel: any;
    let messagesChannel: any;
    let notificationsChannel: any;

    const refreshCounts = async (currentUser: any) => {
      if (!currentUser) {
        if (mounted) { setUnreadMessages(0); setUnreadNotifications(0); }
        return;
      }
      const [{ count: messageCount }, { count: notificationCount }] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact', head: true }).neq('sender_id', currentUser.id).is('read_at', null),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id).is('read_at', null),
      ]);
      if (mounted) {
        setUnreadMessages(messageCount || 0);
        setUnreadNotifications(notificationCount || 0);
      }
    };

    const loadProfile = async (currentUser: any) => {
      if (!currentUser) {
        if (mounted) { setUser(null); setProfile(null); setVerified(false); }
        await refreshCounts(null);
        return;
      }
      if (mounted) setUser(currentUser);
      const [{ data }, { data: verification }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,campus,avatar_url,role').eq('id', currentUser.id).maybeSingle(),
        supabase.from('student_verifications').select('user_id').eq('user_id', currentUser.id).eq('status', 'approved').maybeSingle(),
      ]);
      if (mounted) {
        setProfile(data || null);
        setVerified(!!verification);
      }
      await refreshCounts(currentUser);

      profileChannel = supabase.channel(`app-profile-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` }, (payload) => {
          if (payload.eventType === 'DELETE') {
            if (mounted) setProfile(null);
          } else if (mounted) {
            setProfile(payload.new);
          }
        })
        .subscribe();

      verificationChannel = supabase.channel(`app-verification-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_verifications', filter: `user_id=eq.${currentUser.id}` }, async () => {
          const [{ data: fresh }, { data: freshVerification }] = await Promise.all([
            supabase.from('profiles').select('id,full_name,campus,avatar_url,role').eq('id', currentUser.id).maybeSingle(),
            supabase.from('student_verifications').select('user_id').eq('user_id', currentUser.id).eq('status', 'approved').maybeSingle(),
          ]);
          if (mounted) {
            setProfile(fresh || null);
            setVerified(!!freshVerification);
          }
        })
        .subscribe();

      messagesChannel = supabase.channel(`app-unread-messages-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { refreshCounts(currentUser); })
        .subscribe();

      notificationsChannel = supabase.channel(`app-unread-notifications-${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
          refreshCounts(currentUser);
          if (payload.eventType === 'INSERT') {
            const n: any = payload.new;
            void supabase.functions.invoke('push-notify', { body: { user_ids: [currentUser.id], title: n.title || 'CampusDrop', body: n.body || 'You have a new notification.', url: n.listing_id ? `/product/${n.listing_id}` : '/notifications' } });
          }
        })
        .subscribe();
    };

    supabase.auth.getUser().then(({ data }) => loadProfile(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (profileChannel) supabase.removeChannel(profileChannel);
        if (verificationChannel) supabase.removeChannel(verificationChannel);
        if (messagesChannel) supabase.removeChannel(messagesChannel);
        if (notificationsChannel) supabase.removeChannel(notificationsChannel);
        profileChannel = verificationChannel = messagesChannel = notificationsChannel = null;
        loadProfile(session?.user || null);
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (verificationChannel) supabase.removeChannel(verificationChannel);
      if (messagesChannel) supabase.removeChannel(messagesChannel);
      if (notificationsChannel) supabase.removeChannel(notificationsChannel);
    };
  }, []);

  async function signOut() {
    setMenuOpen(false);
    await createClient().auth.signOut();
    window.location.assign('/');
  }

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'CampusDrop student';
  const messageBadge = unreadMessages > 99 ? '99+' : unreadMessages > 0 ? String(unreadMessages) : '';
  const notificationBadge = unreadNotifications > 99 ? '99+' : unreadNotifications > 0 ? String(unreadNotifications) : '';

  return <>
    <header className="nav">
      <div className="container navin">
        <Link href="/" className="brand" aria-label="CampusDrop home">
          <img src="/campusdrop-logo.png" alt="CampusDrop" />
          <span className="brandWord">CampusDrop</span>
        </Link>
        <nav className="links" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/sell">Sell</Link>
          <Link href="/messages" className="navBadgeLink">Messages{messageBadge && <span className="navCountBadge">{messageBadge}</span>}</Link>
        </nav>
        <div className="actions">
          {user ? <>
            <Link className="iconBtn navIconBadge" href="/notifications" aria-label={notificationBadge ? `Notifications, ${notificationBadge} unread` : 'Notifications'}><Bell size={18} />{notificationBadge && <span className="navCountBadge">{notificationBadge}</span>}</Link>
            <div className="accountMenu">
              <button className="avatarButton" aria-label="Open account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
                <Avatar url={avatarUrl} name={displayName} size="sm" />
                <ChevronDown size={14} />
              </button>
              {menuOpen && <div className="accountDropdown">
                <div className="accountSummary"><Avatar url={avatarUrl} name={displayName} size="md" /><div><VerifiedName userId={user?.id} name={displayName} verified={verified}/><span>{profile?.campus || 'Campus not set'}</span></div></div>
                <Link href="/profile" onClick={() => setMenuOpen(false)}><Avatar url={avatarUrl} size="sm" /> Profile</Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}><Settings size={17} /> Settings</Link>
                <button onClick={signOut}><LogOut size={17} /> Sign out</button>
              </div>}
            </div>
          </> : <Link className="btn green" href="/auth/login">Sign in</Link>}
          <Link className="btn green desktopSell" href="/sell"><Plus size={17} /> Sell item</Link>
        </div>
      </div>
    </header>
    {children}
    <footer className="footer"><div className="container footerIn"><div><strong>CampusDrop</strong><div className="muted footerMuted">Your campus marketplace.</div><div className="footerLinks"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refunds">Refunds</Link><Link href="/cookies">Cookies</Link></div></div><div className="muxlabCredit">A MUXLAB project</div></div></footer>
    <CookieNotice />
    <nav className="mobileNav" aria-label="Mobile navigation">
      <div className="mobileNavInner">
        {[
          { href: '/', label: 'Home', Icon: Home },
          { href: '/marketplace', label: 'Marketplace', Icon: ShoppingBag },
          { href: '/sell', label: 'Sell', Icon: Plus, special: true },
          { href: '/messages', label: 'Messages', Icon: MessageCircle, badge: messageBadge },
          { href: '/notifications', label: 'Notifications', Icon: Bell, badge: notificationBadge },
        ].map(({ href, label, Icon, badge, special }) => {
          const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link href={href} key={href} className={`mobileNavItem ${active ? 'active' : ''} ${special ? 'sellItem' : ''}`} aria-current={active ? 'page' : undefined}>
              <span className="mobileNavIcon">{active && !special && <span className="mobileNavActivePill" aria-hidden="true" />}<Icon size={special ? 21 : 19} strokeWidth={active ? 2.5 : 2} /></span>
              <span>{label}</span>
              {badge && <span className="navCountBadge">{badge}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  </>;
}
