'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Save, Upload, UserRound } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Avatar } from '../../components/avatar';

const presets = ['default:campus', 'default:drop', 'default:green', 'default:classic'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function compressAvatar(file: File) {
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Avatar images must be 5MB or smaller.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bitmap = await createImageBitmap(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not prepare the image.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not compress the image.')), 'image/jpeg', 0.82));
}

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [campus, setCampus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('default:campus');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.assign('/auth/login?next=/settings'); return; }
      setUser(user);
      const { data } = await supabase.from('profiles').select('full_name,campus,avatar_url').eq('id', user.id).maybeSingle();
      setName(data?.full_name || user.user_metadata?.full_name || '');
      setCampus(data?.campus || '');
      setAvatarUrl(data?.avatar_url || 'default:campus');
    })();
  }, []);

  async function save() {
    if (!user || saving) return;
    setSaving(true); setError(''); setMessage('');
    const cleanName = name.trim().slice(0, 80);
    const cleanCampus = campus.trim().slice(0, 120);
    if (!cleanName) { setError('Please enter your full name.'); setSaving(false); return; }
    if (!cleanCampus) { setError('Please enter your campus.'); setSaving(false); return; }
    const { error } = await createClient().from('profiles').update({ full_name: cleanName, campus: cleanCampus, avatar_url: avatarUrl }).eq('id', user.id);
    if (error) setError(error.message); else setMessage('Settings saved.');
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploading(true); setError(''); setMessage('');
    try {
      const blob = await compressAvatar(file);
      const path = `${user.id}/avatar.jpg`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      setMessage('Avatar uploaded. Save settings to keep it on your profile.');
    } catch (err: any) {
      setError(err?.message || 'Avatar upload failed.');
    } finally { setUploading(false); }
  }

  return <main className="section"><div className="container settingsLayout">
    <div><div className="eyebrow">Account</div><h1>Settings</h1><p className="muted">Manage your campus profile and avatar.</p></div>
    <div className="panel settingsCard">
      <div className="settingsAvatarRow">
        <Avatar url={avatarUrl} name={name || 'CampusDrop student'} size="lg" />
        <div><h3 style={{margin:'0 0 5px'}}>Profile avatar</h3><p className="muted" style={{margin:0}}>Images are resized to 512px and compressed before upload.</p><button className="btn light" style={{marginTop:12}} onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus size={17}/>{uploading ? 'Processing...' : 'Upload photo'}</button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => { const f=e.target.files?.[0]; if(f) uploadAvatar(f); e.currentTarget.value=''; }} /></div>
      </div>
      <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" value={name} maxLength={80} onChange={e=>setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="campus">Campus</label><input id="campus" value={campus} maxLength={120} placeholder="e.g. TASUED" onChange={e=>setCampus(e.target.value)} /></div>
      <div className="field"><label>Choose a default avatar</label><div className="avatarChoices">{presets.map(p=><button key={p} type="button" className={`avatarChoice ${avatarUrl===p?'selected':''}`} onClick={()=>setAvatarUrl(p)} aria-label={`Choose ${p.replace('default:','')} avatar`}><Avatar url={p} size="md" />{avatarUrl===p&&<Check size={15}/>}</button>)}</div></div>
      {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
      <button className="btn green" onClick={save} disabled={saving}><Save size={17}/>{saving?'Saving...':'Save settings'}</button>
    </div>
    <div className="panel settingsInfo"><UserRound size={20}/><div><b>Account email</b><div className="muted">{user?.email || 'Loading...'}</div></div></div>
  </div></main>;
}
