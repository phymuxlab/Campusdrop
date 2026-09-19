'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin } from 'lucide-react';
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
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main className="section"><div className="container"><div className="empty">Loading profile...</div></div></main>;
  if (error || !profile) return <main className="section"><div className="container"><div className="empty">{error || 'Profile not found.'}</div></div></main>;

  return (
    <main className="section">
      <div className="container publicProfile">
        <Link href="/marketplace" className="productBack"><ArrowLeft size={17}/> Back to marketplace</Link>
        <div className="panel publicProfileHero">
          <div className="row">
            <Avatar url={profile.avatar_url} name={profile.full_name || 'Student'} size="lg" />
            <div>
              <h1>{profile.full_name || 'CampusDrop student'}</h1>
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
