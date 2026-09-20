'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Save, UserRound, ShieldCheck } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Avatar } from '../../components/avatar';
import { PageSkeleton } from '../../components/skeleton';

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
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('default:campus'); const [prefs,setPrefs]=useState({messages:true,favourites:true,price_alerts:true,system:true});
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
      const [{ data: profile }, { data: privateProfile }, { data: pref }] = await Promise.all([
        supabase.from('profiles').select('full_name,campus,location,avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('profile_private').select('phone,whatsapp').eq('user_id', user.id).maybeSingle(),
        supabase.from('notification_preferences').select('messages,favourites,price_alerts,system').eq('user_id', user.id).maybeSingle(),
      ]);
      setName(profile?.full_name || user.user_metadata?.full_name || '');
      setCampus(profile?.campus || '');
      setLocation(profile?.location || '');
      setAvatarUrl(profile?.avatar_url || 'default:campus');
      setPhone(privateProfile?.phone || '');
      setWhatsapp(privateProfile?.whatsapp || '');
      if (pref) setPrefs({messages:!!pref.messages,favourites:!!pref.favourites,price_alerts:!!pref.price_alerts,system:!!pref.system});
    })();
  }, []);

  async function save() {
    if (!user || saving) return;
    setSaving(true); setError(''); setMessage('');
    const cleanName = name.trim().slice(0, 80);
    const cleanCampus = campus.trim().slice(0, 120);
    const cleanLocation = location.trim().slice(0, 160);
    const cleanPhone = phone.trim().slice(0, 30);
    const cleanWhatsapp = whatsapp.trim().slice(0, 30);
    if (!cleanName || !cleanCampus) { setError('Full name and campus are required.'); setSaving(false); return; }
    const supabase = createClient();
    const { error: profileError } = await supabase.from('profiles').update({ full_name: cleanName, campus: cleanCampus, location: cleanLocation || null, avatar_url: avatarUrl }).eq('id', user.id);
    if (profileError) { setError(profileError.message); setSaving(false); return; }
    const { error: privateError } = await supabase.from('profile_private').upsert({ user_id: user.id, phone: cleanPhone || null, whatsapp: cleanWhatsapp || null }, { onConflict: 'user_id' });
    if (privateError) { setError(privateError.message); setSaving(false); return; }
    const { error: prefError } = await supabase.from('notification_preferences').upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (prefError) setError(prefError.message); else setMessage('Settings saved.');
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
    } catch (err: any) { setError(err?.message || 'Avatar upload failed.'); }
    finally { setUploading(false); }
  }

  if (!user) return <main className="section"><div className="container"><PageSkeleton rows={7}/></div></main>;

  return <main className="section"><div className="container settingsLayout">
    <div><div className="eyebrow">Account</div><h1>Settings</h1><p className="muted">Manage your profile and private contact details.</p></div>
    <div className="panel settingsCard">
      <div className="settingsAvatarRow">
        <Avatar url={avatarUrl} name={name || 'CampusDrop student'} size="lg" />
        <div><h3 style={{margin:'0 0 5px'}}>Profile avatar</h3><p className="muted" style={{margin:0}}>Images are resized to 512px and compressed before upload.</p><button className="btn light" style={{marginTop:12}} onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus size={17}/>{uploading ? 'Processing...' : 'Upload photo'}</button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => { const f=e.target.files?.[0]; if(f) uploadAvatar(f); e.currentTarget.value=''; }} /></div>
      </div>
      <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" value={name} maxLength={80} onChange={e=>setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="campus">Campus</label><input id="campus" value={campus} maxLength={120} placeholder="e.g. TASUED" onChange={e=>setCampus(e.target.value)} /></div>
      <div className="field"><label htmlFor="location">Location <span className="muted">(public)</span></label><input id="location" value={location} maxLength={160} placeholder="e.g. Ijebu-Ode" onChange={e=>setLocation(e.target.value)} /></div>
      <div className="field"><label>Choose a default avatar</label><div className="avatarChoices">{presets.map(p=><button key={p} type="button" className={`avatarChoice ${avatarUrl===p?'selected':''}`} onClick={()=>setAvatarUrl(p)} aria-label={`Choose ${p.replace('default:','')} avatar`}><Avatar url={p} size="md" />{avatarUrl===p&&<Check size={15}/>}</button>)}</div></div>
      <div className="privateContactBox"><div className="privateContactHead"><ShieldCheck size={18}/><div><b>Private contact details</b><p className="muted">Only you can read or edit these fields. They are never shown on public profiles.</p></div></div><div className="privateGrid"><div className="field"><label htmlFor="phone">Phone number</label><input id="phone" value={phone} maxLength={30} inputMode="tel" onChange={e=>setPhone(e.target.value)} /></div><div className="field"><label htmlFor="whatsapp">WhatsApp number</label><input id="whatsapp" value={whatsapp} maxLength={30} inputMode="tel" onChange={e=>setWhatsapp(e.target.value)} /></div></div></div><div className="privateContactBox"><div className="privateContactHead"><ShieldCheck size={18}/><div><b>Notification preferences</b><p className="muted">Choose which in-app notification categories CampusDrop should use.</p></div></div><div className="prefGrid">{([['messages','Messages'],['favourites','Favourites'],['price_alerts','Price alerts'],['system','System updates']] as const).map(([key,label])=><label className="prefItem" key={key}><input type="checkbox" checked={prefs[key]} onChange={e=>setPrefs({...prefs,[key]:e.target.checked})}/><span>{label}</span></label>)}</div></div>
      {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
      <button className="btn green" onClick={save} disabled={saving}><Save size={17}/>{saving?'Saving...':'Save settings'}</button>
    </div>
    <div className="panel settingsInfo"><UserRound size={20}/><div><b>Account email</b><div className="muted">{user?.email || 'Loading...'}</div></div></div>
  </div></main>;
}
