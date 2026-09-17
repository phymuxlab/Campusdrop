'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { createClient } from '../../lib/supabase';

export default function Admin() {
  const [reports, setReports] = useState<any[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) { window.location.assign('/auth/login?next=/admin'); return; }
    const { data: p } = await s.from('profiles').select('role').eq('id', user.id).single();
    if (p?.role !== 'admin') { setLoading(false); return; }
    setAllowed(true);
    const { data, error: reportError } = await s.from('reports').select('*, listings(title,status)').order('created_at', { ascending: false });
    if (reportError) setError(reportError.message); else setReports((data || []).filter((r: any) => r.status === 'pending'));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function action(report: any, status: 'removed' | 'dismissed') {
    setActionId(report.id); setError('');
    const s = createClient();
    try {
      if (status === 'removed') {
        const { error: listingError } = await s.from('listings').update({ status: 'hidden' }).eq('id', report.listing_id);
        if (listingError) throw listingError;
      }
      const { data: { user } } = await s.auth.getUser();
      const { error: reportError } = await s.from('reports').update({ status, reviewed_by: user?.id || null, reviewed_at: new Date().toISOString() }).eq('id', report.id);
      if (reportError) throw reportError;
      setReports((current: any[]) => current.filter((r: any) => r.id !== report.id));
    } catch (err: any) {
      setError(err?.message || 'Moderation action failed.');
    } finally { setActionId(null); }
  }

  if (loading) return <main className="section"><div className="container"><div className="empty">Loading moderation queue...</div></div></main>;
  if (!allowed) return <main className="section"><div className="container"><div className="empty"><ShieldCheck size={30}/><h2>Admin access required</h2><p>Promote a trusted account to role <b>admin</b> in Supabase before using this area.</p></div></div></main>;

  return <main className="section"><div className="container"><div className="eyebrow">Moderation</div><h1>Admin dashboard</h1>{error && <div className="error">{error}</div>}<div className="panel adminQueue">{!reports.length ? <div className="empty"><CheckCircle2 size={30}/><p>No pending reports.</p></div> : reports.map((r) => <div className="noticeRow adminReport" key={r.id}><ShieldCheck size={20}/><div className="adminReportCopy"><b>{r.listings?.title || 'Listing'}</b><div className="muted">{r.reason} · Reported {new Date(r.created_at).toLocaleString()}</div><div className="muted">Current listing status: {r.listings?.status || 'unknown'}</div></div><button className="btn danger" disabled={actionId === r.id} onClick={() => action(r, 'removed')}><Trash2 size={16}/> Remove listing</button><button className="btn light" disabled={actionId === r.id} onClick={() => action(r, 'dismissed')}><XCircle size={16}/> Dismiss</button></div>)}</div></div></main>;
}
