'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { createClient } from '../../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await createClient().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` },
    );

    if (error) setError(error.message);
    else setMessage('If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.');
    setLoading(false);
  }

  return (
    <main className="formPage">
      <div className="formCard">
        <Link href="/auth/login" className="productBack"><ArrowLeft size={17} /> Back to sign in</Link>
        <Mail size={28} color="#149866" />
        <h1>Forgot your password?</h1>
        <p className="muted">Enter your email and we will send you a secure reset link.</p>
        {error && <div className="error">{error}</div>}
        {message && <div className="notice">{message}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <button className="btn green full" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
        </form>
      </div>
    </main>
  );
}
