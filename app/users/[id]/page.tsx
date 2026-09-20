'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, ShieldCheck, Ban } from 'lucide-react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import { Avatar } from '../../../components/avatar';

type Profile = { id: string; full_name: string | null; campus: string | null; location: string | null; avatar_url: string | null; created_at: string | null };
type Listing = { id: string; title: string; price: number; campus: string | null; status: string; created_at: string; listing_images?: { url: string | null; storage_path: string }[] };

export default function PublicUserProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false); const [blocked,setBlocked]=useState(false); const [blockMessage,setBlockMessage]=useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: p, error: profileError }, { data: l }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,campus,location,avatar_url,created_at').eq('id', id).maybeSingle(),
        supabase.from('listings').select('id,title,price,campus,status,created_at,listing_images(url,storage_path)').eq('seller_id', id).eq('status', 'available').order('created_at', { ascending: false }),
      ]);
      if (profileError || !p) setError('This profile could not be found.');
      else setProfile(p);
      setListings((l || []) as Listing[]);
      const { data: v } = await supabase.from('student_verifications').select('status').eq('user_id', id).eq('status', 'approved').maybeSingle();
      setVerified(!!v);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== id) { const { data: b } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', id).maybeSingle(); setBlocked(!!b); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main className="section"><div className="container"><div className="skeletonPage"><span className="skeleton skeletonTitle"/><span className="skeleton skeletonLine"/><span className="skeleton skeletonLine"/></div></div></main>;
  async function toggleBlock(){const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)return;if(blocked){await s.from('blocked_users').delete().eq('blocker_id',user.id).eq('blocked_id',id);setBlocked(false);setBlockMessage('User unblocked.')}else{const {error:e}=await s.from('blocked_users').insert({blocker_id:user.id,blocked_id:id});if(e)setBlockMessage(e.message);else{setBlocked(true);setBlockMessage('User blocked. Their profile remains hidden from your future interactions.')}}}

  if (error || !profile) return <main className="section"><div className="container"><div className="empty">{error || 'Profile not found.'}</div></div></main>;

  return (
    <main className="section">
      <div className="container publicProfile">
        <Link href="/marketplace" className="productBack"><ArrowLeft size={17}/> Back to marketplace</Link>
        <div className="panel publicProfileHero">
          <div className="row">
            <Avatar url={profile.avatar_url} name={profile.full_name || 'Student'} size="lg" />
            <div>
              <h1>{profile.full_name || 'CampusDrop student'} {verified&&<span className="verifiedBadge"><ShieldCheck size={14}/> Verified Student</span>}</h1>
              <p className="muted">{profile.campus || 'Campus not set'}</p>
              {profile.location && <p className="profilePublicMeta"><MapPin size={15}/> {profile.location}</p>}
            </div>
          </div>
          <div className="publicProfileMeta">
            <Package size={16}/> {listings.length} active listing{listings.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="sectionHead" style={{ marginTop: 28 }}>
          <div><div className="eyebrow">Marketplace</div><h2>Active listings</h2></div>
        </div>

        {listings.length ? (
          <div className="grid">
            {listings.map(item => {
              const image = item.listing_images?.[0]?.url || '';
              return <Link key={item.id} href={`/product/${item.id}`} className="card">
                <div className="pic" style={image ? { backgroundImage: `url(${image})` } : undefined}/>
                <div className="cardbody">
                  <h3>{item.title}</h3>
                  <div className="cardprice">₦{Number(item.price).toLocaleString()}</div>
                  <div className="muted">{item.campus || 'Campus'} · {new Date(item.created_at).toLocaleDateString()}</div>
                </div>
              </Link>;
            })}
          </div>
        ) : <div className="empty">This user has no active listings.</div>}
      </div>
    </main>
  );
}
