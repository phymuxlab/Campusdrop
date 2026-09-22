'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
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

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const loadProfile = async (currentUser: any) => {
      if (!currentUser) {
        if (mounted) { setUser(null); setProfile(null); }
        return;
      }
      if (mounted) setUser(currentUser);
      const { data } = await supabase.from('profiles').select('full_name,campus,avatar_url,role').eq('id', currentUser.id).maybeSingle();
      if (mounted) setProfile(data || null);
    };

    const loadUnread = async (currentUser: any) => {
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

    supabase.auth.getUser().then(({ data }) => {
      loadProfile(data.user);
      loadUnread(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        loadProfile(session?.user || null);
        loadUnread(session?.user || null);
      }, 0);
    });

    const channel = supabase.channel('campusdrop-unread-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        supabase.auth.getUser().then(({ data }) => loadUnread(data.user));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        supabase.auth.getUser().then(({ data }) => loadUnread(data.user));
      })
      .subscribe();

    return () => { mounted = false; listener.subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  async function signOut() {
    setMenuOpen(false);
    await createClient().auth.signOut();
    window.location.assign('/');
  }

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'CampusDrop student';

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
          <Link href="/messages" className="navTextBadge">Messages{unreadMessages > 0 && <span className="unreadBadge navTextBadgeCount">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</Link>
        </nav>
        <div className="actions">
          {user ? <>
            <Link className="iconBtn navBadgeWrap" href="/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"}><Bell size={18} />{unreadNotifications > 0 && <span className="unreadBadge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</Link>
            <div className="accountMenu">
              <button className="avatarButton" aria-label="Open account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
                <Avatar url={avatarUrl} name={displayName} size="sm" />
                <ChevronDown size={14} />
              </button>
              {menuOpen && <div className="accountDropdown">
                <div className="accountSummary"><Avatar url={avatarUrl} name={displayName} size="md" /><div><VerifiedName userId={user?.id} name={displayName}/><span>{profile?.campus || 'Campus not set'}</span></div></div>
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
      <Link href="/"><Home size={19} /><span>Home</span></Link>
      <Link href="/marketplace"><ShoppingBag size={19} /><span>Marketplace</span></Link>
      <Link href="/sell"><Plus size={21} /><span>Sell</span></Link>
      <Link href="/messages" aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : "Messages"}><span className="navBadgeWrap"><MessageCircle size={19} />{unreadMessages > 0 && <span className="unreadBadge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</span><span>Messages</span></Link>
      <Link href="/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"}><span className="navBadgeWrap"><Bell size={19} />{unreadNotifications > 0 && <span className="unreadBadge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}</span><span>Notifications</span></Link>
    </nav>
  </>;
}
