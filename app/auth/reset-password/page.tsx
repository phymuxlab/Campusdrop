'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase';
import PasswordStrength, { passwordScore } from '../../../components/password-strength';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data, error }) => {
      if (error || !data.user) setError('This reset link is invalid or has expired. Please request a new one.');
      else setReady(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');
    setMessage('');

    if (passwordScore(password) < 5) {
      setError('Choose a stronger password that meets all requirements.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setMessage('Your password has been changed. You can now continue using CampusDrop.');
      setPassword('');
      setConfirm('');
    }
    setSaving(false);
  }

  return (
    <main className="formPage">
      <div className="formCard">
        <KeyRound size={28} color="#149866" />
        <h1>Reset your password</h1>
        <p className="muted">Choose a strong new password for your CampusDrop account.</p>
        {error && <div className="error">{error}</div>}
        {message && <div className="notice">{message}<div style={{ marginTop: 10 }}><Link href="/marketplace" className="textLink">Continue to CampusDrop</Link></div></div>}
        {ready && !message && (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" type="password" minLength={10} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              <PasswordStrength password={password} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" minLength={10} value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            <button className="btn green full" disabled={saving}>{saving ? 'Updating...' : 'Update password'}</button>
          </form>
        )}
      </div>
    </main>
  );
}
