'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase';

export function VerifiedName({ userId, name, className = '' }: { userId?: string | null; name?: string | null; className?: string }) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const supabase=createClient(); let active=true; let channel:any;
    const load=async()=>{const {data}=await supabase.from('student_verifications').select('status').eq('user_id',userId).eq('status','approved').maybeSingle();if(active)setVerified(!!data)};
    load();
    channel=supabase.channel(`verified-name-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'student_verifications',filter:`user_id=eq.${userId}`},()=>load()).subscribe();
    return()=>{active=false;if(channel)supabase.removeChannel(channel)};
  }, [userId]);
  return <span className={`verifiedName ${className}`}><span>{name || 'CampusDrop student'}</span>{verified && <img className="verifiedBadge" src="/campusdrop-verification-badge.png" width={17} height={17} alt="Verified student"/>}</span>;
}
