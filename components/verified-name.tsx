'use client';
import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { createClient } from '../lib/supabase';

export function VerifiedName({ userId, name, className = '' }: { userId?: string | null; name?: string | null; className?: string }) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    createClient().from('student_verifications').select('status').eq('user_id', userId).eq('status', 'approved').maybeSingle().then(({ data }) => {
      if (active) setVerified(!!data);
    });
    return () => { active = false; };
  }, [userId]);
  return <span className={`verifiedName ${className}`}>{verified && <BadgeCheck className="verifiedBadge" size={17} aria-label="Verified student" />}<span>{name || 'CampusDrop student'}</span></span>;
}
