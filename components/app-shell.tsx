'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bell, Home, MessageCircle, Plus, ShoppingBag, ChevronDown, Settings, LogOut } from 'lucide-react';
import { createClient } from '../lib/supabase';
import { Avatar } from './avatar';
import ThemeControls from './theme-controls';


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

    supabase.auth.getUser().then(({ data }) => loadProfile(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => loadProfile(session?.user || null), 0);
    });

    return () => { mounted = false; listener.subscription.unsubscribe(); };
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
          <Link href="/messages">Messages</Link>
        </nav>
        <div className="actions">
          {user ? <>
            <Link className="iconBtn" href="/notifications" aria-label="Notifications"><Bell size={18} /></Link>
            <div className="accountMenu">
              <button className="avatarButton" aria-label="Open account menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>
                <Avatar url={avatarUrl} name={displayName} size="sm" />
                <ChevronDown size={14} />
              </button>
              {menuOpen && <div className="accountDropdown">
                <div className="accountSummary"><Avatar url={avatarUrl} name={displayName} size="md" /><div><b>{displayName}</b><span>{profile?.campus || 'Campus not set'}</span></div></div>
                <Link href="/profile" onClick={() => setMenuOpen(false)}><Avatar url={avatarUrl} size="sm" /> Profile</Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}><Settings size={17} /> Settings</Link>
                <div className="dropdownTheme"><ThemeControls /></div>
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
      <Link href="/messages"><MessageCircle size={19} /><span>Messages</span></Link>
      <Link href="/notifications"><Bell size={19} /><span>Notifications</span></Link>
    </nav>
  </>;
}
