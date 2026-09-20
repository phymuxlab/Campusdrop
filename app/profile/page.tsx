'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Package, Settings, LogOut, MapPin, ShieldCheck } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Avatar } from '../../components/avatar';
import { PageSkeleton } from '../../components/skeleton';

export default function Profile(){
  const [profile,setProfile]=useState<any>(null); const [count,setCount]=useState(0); const [verified,setVerified]=useState(false);
  useEffect(()=>{(async()=>{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user){location.href='/auth/login';return}const {data:p}=await s.from('profiles').select('id,full_name,campus,location,avatar_url').eq('id',user.id).single();setProfile(p);const {count}=await s.from('listings').select('id',{count:'exact',head:true}).eq('seller_id',user.id).neq('status','hidden');setCount(count||0);const {data:v}=await s.from('student_verifications').select('status').eq('user_id',user.id).eq('status','approved').maybeSingle();setVerified(!!v)})()},[]);
  async function signout(){await createClient().auth.signOut();location.href='/'}
  return <main className="section"><div className="container">{!profile?<PageSkeleton rows={5}/>:<>
    <div className="profileHero panel"><div className="profileRow"><div className="row"><Avatar url={profile.avatar_url} name={profile.full_name} size="lg"/><div><h1 style={{margin:'0 0 5px'}}>{profile.full_name||'CampusDrop student'} {verified&&<span className="verifiedBadge"><ShieldCheck size={14}/> Verified Student</span>}</h1><div className="muted">{profile.campus||'Campus not set'}</div>{profile.location&&<div className="profilePublicMeta"><MapPin size={14}/>{profile.location}</div>}</div></div><div className="actionsRow"><Link className="btn light" href="/verify"><ShieldCheck size={17}/> {verified?'Verification status':'Get verified'}</Link><Link className="btn light" href="/settings"><Settings size={17}/> Settings</Link><button className="btn danger" onClick={signout}><LogOut size={17}/> Sign out</button></div></div></div>
    <div className="grid profileTiles" style={{marginTop:18}}><Link className="panel" href="/my-listings"><Package/><h3>My listings</h3><p className="muted">{count} active listing{count===1?'':'s'}</p></Link><Link className="panel" href="/favourites"><Heart/><h3>Favourites</h3><p className="muted">Saved items</p></Link><Link className="panel" href="/messages"><MessageCircle/><h3>Messages</h3><p className="muted">Chat with buyers and sellers</p></Link></div>
  </>}</div></main>
}
