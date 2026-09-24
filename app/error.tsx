'use client';

import { useEffect } from 'react';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep unexpected client failures recoverable without leaving the user on a blank screen.
    console.error('CampusDrop client error');
  }, []);

  return (
    <main className="section">
      <div className="container">
        <div className="formCard" style={{ maxWidth: 620, margin: '48px auto', textAlign: 'center' }}>
          <div className="eyebrow">CampusDrop</div>
          <h1>Something went wrong</h1>
          <p className="muted">The page hit a temporary error. Try again without leaving CampusDrop.</p>
          <button className="btn green" onClick={() => reset()}>Try again</button>
        </div>
      </div>
    </main>
  );
}
