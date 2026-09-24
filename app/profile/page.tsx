'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Package, Settings, LogOut, MapPin, BadgeCheck } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Avatar } from '../../components/avatar';
import { VerifiedName } from '../../components/verified-name';

export default function Profile(){
  const [profile,setProfile]=useState<any>(null); const [count,setCount]=useState(0);
  useEffect(()=>{
    const s=createClient(); let mounted=true; let profileChannel:any; let listingChannel:any;
    (async()=>{
      const {data:{user}}=await s.auth.getUser(); if(!user){window.location.assign('/auth/login');return}
      const load=async()=>{
        const [{data:p},{count:c}]=await Promise.all([s.from('profiles').select('id,full_name,campus,location,avatar_url').eq('id',user.id).single(),s.from('listings').select('id',{count:'exact',head:true}).eq('seller_id',user.id).neq('status','hidden')]);
        if(mounted){setProfile(p);setCount(c||0)}
      };
      await load();
      profileChannel=s.channel(`profile-page-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'profiles',filter:`id=eq.${user.id}`},()=>load()).subscribe();
      listingChannel=s.channel(`profile-listings-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'listings',filter:`seller_id=eq.${user.id}`},()=>load()).subscribe();
    })();
    return()=>{mounted=false;if(profileChannel)s.removeChannel(profileChannel);if(listingChannel)s.removeChannel(listingChannel)};
  },[]);
  async function signout(){await createClient().auth.signOut();window.location.assign('/')}
  return <main className="section"><div className="container">{!profile?<div className="empty">Loading profile...</div>:<><div className="profileHero panel"><div className="profileRow"><div className="row"><Avatar url={profile.avatar_url} name={profile.full_name} size="lg"/><div><h1 style={{margin:'0 0 5px'}}><VerifiedName userId={profile.id} name={profile.full_name}/></h1><div className="muted">{profile.campus||'Campus not set'}</div>{profile.location&&<div className="profilePublicMeta"><MapPin size={14}/>{profile.location}</div>}</div></div><div className="actionsRow"><Link className="btn light" href="/verification"><BadgeCheck size={17}/> Verification</Link><Link className="btn light" href="/settings"><Settings size={17}/> Settings</Link><button className="btn danger" onClick={signout}><LogOut size={17}/> Sign out</button></div></div></div><div className="grid profileTiles" style={{marginTop:18}}><Link className="panel" href="/my-listings"><Package/><h3>My listings</h3><p className="muted">{count} active listing{count===1?'':'s'}</p></Link><Link className="panel" href="/favourites"><Heart/><h3>Favourites</h3><p className="muted">Saved items</p></Link><Link className="panel" href="/messages"><MessageCircle/><h3>Messages</h3><p className="muted">Chat with buyers and sellers</p></Link></div></>}</div></main>
}
