'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, ShieldCheck } from 'lucide-react';
import { createClient } from '../../../lib/supabase';

const COOLDOWN_MS = 8000;

export default function Login(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false); const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{const until=Number(localStorage.getItem('campusdrop-login-cooldown')||0);if(until>Date.now())setCooldown(Math.ceil((until-Date.now())/1000));},[]);
  useEffect(()=>{if(cooldown<=0)return;const t=setInterval(()=>setCooldown(Math.max(0,Math.ceil((Number(localStorage.getItem('campusdrop-login-cooldown')||0)-Date.now())/1000))),500);return()=>clearInterval(t)},[cooldown]);
  function beginCooldown(){const until=Date.now()+COOLDOWN_MS;localStorage.setItem('campusdrop-login-cooldown',String(until));setCooldown(Math.ceil(COOLDOWN_MS/1000));}
  async function submit(e:React.FormEvent){e.preventDefault();if(loading||cooldown>0)return;setLoading(true);setError('');beginCooldown();const supabase=createClient();const {error:signInError}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(signInError){setError('Sign-in failed. Check your email and password, then try again.');setLoading(false);return;}const {data:{session}}=await supabase.auth.getSession();if(!session){setError('Sign-in completed but the session could not be saved. Please try again.');setLoading(false);return;}const next=new URLSearchParams(window.location.search).get('next')||'/marketplace';const destination=next.startsWith('/')&&!next.startsWith('//')?next:'/marketplace';window.location.assign(destination);}
  async function google(){if(loading||cooldown>0)return;setLoading(true);setError('');beginCooldown();const {error}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(new URLSearchParams(window.location.search).get('next')||'/marketplace')}`}});if(error){setError(error.message);setLoading(false)}}
  return <main className="formPage"><div className="formCard"><img src="/campusdrop-logo.png" style={{width:220,maxWidth:'100%'}} alt="CampusDrop"/><h1>Welcome back</h1><p className="muted">Sign in to your campus marketplace.</p>{error&&<div className="error">{error}</div>}
    <button type="button" className="btn light full googleButton" onClick={google} disabled={loading||cooldown>0}><span className="googleMark">G</span>{loading?'Connecting...':'Continue with Google'}</button><div className="authDivider"><span>or continue with email</span></div>
    <form onSubmit={submit}><div className="field"><label htmlFor="loginEmail">Email</label><input id="loginEmail" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></div><div className="field"><label htmlFor="loginPassword">Password</label><input id="loginPassword" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></div><div className="authRow"><Link href="/auth/forgot-password" className="textLink">Forgot password?</Link>{cooldown>0&&<span className="muted">Try again in {cooldown}s</span>}</div><button className="btn green full" disabled={loading||cooldown>0}><LogIn size={17}/>{loading?'Signing in...':'Sign in'}</button></form>
    <div className="securityNote"><ShieldCheck size={16}/><span>Protected by Supabase Auth and server-side session validation.</span></div><p className="muted" style={{marginTop:20}}>New here? <Link href="/auth/register" className="textLink">Create an account</Link></p>
  </div></main>
}
