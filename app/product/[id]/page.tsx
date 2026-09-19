'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Flag, Heart, MessageCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase';
import { Avatar } from '../../../components/avatar';

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [reporting, setReporting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    const { data, error: listingError } = await supabase
      .from('listings')
      .select('*, listing_images(url,sort_order), profiles: seller_id(full_name,avatar_url)')
      .eq('id', id).single();
    if (listingError) { setError(listingError.message); return; }
    const images = [...(data?.listing_images || [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setItem({ ...data, listing_images: images });
    if (currentUser) {
      const { data: favourite } = await supabase.from('favourites').select('listing_id').eq('listing_id', id).eq('user_id', currentUser.id).maybeSingle();
      setSaved(!!favourite);
    }
  }

  async function fav() {
    if (!user) { window.location.assign(`/auth/login?next=/product/${id}`); return; }
    const supabase = createClient();
    if (saved) { await supabase.from('favourites').delete().eq('listing_id', id).eq('user_id', user.id); setSaved(false); }
    else { const { error: favouriteError } = await supabase.from('favourites').insert({ listing_id: id, user_id: user.id }); if (!favouriteError) setSaved(true); }
  }

  async function chat() {
    if (!user) { window.location.assign(`/auth/login?next=/product/${id}`); return; }
    if (user.id === item.seller_id) { window.location.assign('/my-listings'); return; }
    const supabase = createClient();
    const { data, error: chatError } = await supabase.from('conversations').upsert({ listing_id: id, buyer_id: user.id, seller_id: item.seller_id }, { onConflict: 'listing_id,buyer_id,seller_id' }).select().single();
    if (chatError) { setError(chatError.message); return; }
    if (data) window.location.assign(`/messages/${data.id}`);
  }

  async function report() {
    if (!user) { window.location.assign(`/auth/login?next=/product/${id}`); return; }
    const { error: reportError } = await createClient().from('reports').insert({ listing_id: id, reporter_id: user.id, reason: 'Suspicious or inappropriate listing' });
    if (reportError) setError(reportError.message); else setReporting(false);
  }

  if (!item) return <main className="section"><div className="container"><div className="empty">{error || 'Loading listing...'}</div></div></main>;

  const images = item.listing_images || [];
  const image = images[selectedImage]?.url || images[0]?.url || '';
  const seller = item.profiles?.[0];

  return (
    <main className="section productSection">
      <div className="container">
        <Link href="/marketplace" className="productBack"><ArrowLeft size={18}/> Back to marketplace</Link>
        {error && <div className="error">{error}</div>}
        <div className="product">
          <div className="productGallery">
            <div className="productImage" style={image ? { backgroundImage: `url(${image})` } : undefined} role="img" aria-label={item.title} />
            {images.length > 1 && <div className="productThumbs">{images.map((img: any, index: number) => <button key={img.url || index} className={`productThumb ${selectedImage === index ? 'selected' : ''}`} onClick={() => setSelectedImage(index)} aria-label={`View photo ${index + 1}`}><img src={img.url} alt="" /></button>)}</div>}
          </div>
          <div className="productInfo">
            <div className="row between"><span className="tag">{item.category}</span><button className="iconBtn" onClick={fav} aria-label={saved ? 'Remove from saved' : 'Save listing'}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button></div>
            <h1>{item.title}</h1>
            <div className="price">₦{Number(item.price || 0).toLocaleString()}</div>
            <div className="productMeta">{item.campus || 'Campus'} <span>·</span> {item.condition || 'Listed item'}</div>
            <hr className="productRule" />
            <h3>Description</h3>
            <p className="productDescription">{item.description || 'No description provided.'}</p>
            <Link href={`/users/${item.seller_id}`} className="panel sellerPanel"><div className="row"><Avatar url={seller?.avatar_url} name={seller?.full_name || 'CampusDrop seller'} size="md"/><div><b>{seller?.full_name || 'CampusDrop seller'}</b><div className="muted">View public profile</div></div></div></Link>
            <div className="actionsRow productActions"><button className="btn green" onClick={chat}><MessageCircle size={17}/> Chat seller</button><button className="btn light" onClick={fav}><Heart size={17}/> {saved ? 'Saved' : 'Save'}</button><button className="btn light" onClick={() => setReporting(true)}><Flag size={17}/> Report</button></div>
            {reporting && <div className="notice reportNotice">Report this listing? <button className="btn danger" onClick={report}>Report</button><button className="btn light" onClick={() => setReporting(false)}>Cancel</button></div>}
            {user?.id === item.seller_id && <button className="btn danger" style={{ marginTop: 14 }} onClick={async () => { await createClient().from('listings').update({ status: 'hidden' }).eq('id', id); window.location.assign('/my-listings'); }}><Trash2 size={17}/> Hide listing</button>}
          </div>
        </div>
      </div>
    </main>
  );
}
