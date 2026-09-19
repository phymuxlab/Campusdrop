'use client';

import { Check, X } from 'lucide-react';

export function passwordScore(password: string) {
  return [
    password.length >= 10,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const checks = [
    ['At least 10 characters', password.length >= 10],
    ['Lowercase letter', /[a-z]/.test(password)],
    ['Uppercase letter', /[A-Z]/.test(password)],
    ['Number', /\d/.test(password)],
    ['Special character', /[^A-Za-z0-9]/.test(password)],
  ] as const;

  return (
    <div className="passwordStrength" aria-live="polite">
      <div className="passwordMeter"><span style={{ width: `${score * 20}%` }} /></div>
      <b>Password strength: {labels[Math.max(0, score - 1)]}</b>
      <ul>
        {checks.map(([label, ok]) => (
          <li key={label} className={ok ? 'ok' : 'bad'}>
            {ok ? <Check size={14} /> : <X size={14} />} {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
