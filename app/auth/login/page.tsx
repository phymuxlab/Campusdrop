'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {LogIn} from 'lucide-react';
import {createClient} from '../../../lib/supabase';

export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault(); if(loading)return;
    setLoading(true); setError('');
    const supabase=createClient();
    const {error:signInError}=await supabase.auth.signInWithPassword({email,password});
    if(signInError){setError(signInError.message);setLoading(false);return;}
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setError('Sign-in completed but the session could not be saved. Please try again.');setLoading(false);return;}
    const next=new URLSearchParams(window.location.search).get('next')||'/marketplace';
    const destination=next.startsWith('/')&&!next.startsWith('//')?next:'/marketplace';
    router.replace(destination); router.refresh();
  }
  return <main className="formPage"><div className="formCard"><img src="/campusdrop-logo.png" style={{width:220,maxWidth:'100%'}} alt="CampusDrop"/><h1>Welcome back</h1><p className="muted">Sign in to your campus marketplace.</p>{error&&<div className="error">{error}</div>}<form onSubmit={submit}><div className="field"><label htmlFor="loginEmail">Email</label><input id="loginEmail" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label htmlFor="loginPassword">Password</label><input id="loginPassword" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div><button className="btn green full" disabled={loading}><LogIn size={17}/>{loading?'Signing in...':'Sign in'}</button></form><p className="muted" style={{marginTop:20}}>New here? <Link href="/auth/register" style={{color:'#0e8c59',fontWeight:800}}>Create an account</Link></p></div></main>
}
