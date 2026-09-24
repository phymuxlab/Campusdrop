'use client';
import {useEffect,useState} from 'react';
import {Bell,Check} from 'lucide-react';
import {createClient} from '../../lib/supabase';

export default function Notifications(){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{
    const s=createClient(); let mounted=true; let channel:any;
    (async()=>{
      const {data:{user}}=await s.auth.getUser();
      if(!user){window.location.assign('/auth/login');return}
      const load=async()=>{const {data}=await s.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(mounted)setItems(data||[])};
      await load();
      channel=s.channel(`notifications-page-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},()=>load()).subscribe();
    })();
    return()=>{mounted=false;if(channel)s.removeChannel(channel)};
  },[]);
  async function read(id:string){const now=new Date().toISOString();await createClient().from('notifications').update({read_at:now}).eq('id',id);setItems(x=>x.map(n=>n.id===id?{...n,read_at:now}:n))}
  return <main className="section"><div className="container"><div className="eyebrow">Updates</div><h1>Notifications</h1><div className="panel">{!items.length?<div className="empty">You are all caught up.</div>:items.map(n=><div className="noticeRow" key={n.id}><Bell size={20}/><div style={{flex:1}}><b>{n.title}</b><div className="muted">{n.body}</div></div>{!n.read_at&&<button className="iconBtn" onClick={()=>read(n.id)}><Check size={17}/></button>}</div>)}</div></div></main>
}
