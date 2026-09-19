'use client';

import Link from 'next/link';
import { ArrowLeft, Home, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="notFoundPage">
      <div className="notFoundCard">
        <img src="/campusdrop-mark.png" alt="" className="notFoundMark" />
        <div className="eyebrow">404</div>
        <h1>We could not find that page.</h1>
        <p className="muted">The page may have moved, the link may be incorrect, or the listing is no longer available.</p>
        <div className="notFoundActions">
          <button className="btn light" onClick={() => history.back()}><ArrowLeft size={17} /> Go back</button>
          <Link className="btn green" href="/"><Home size={17} /> Home</Link>
          <Link className="btn primary" href="/marketplace"><ShoppingBag size={17} /> Marketplace</Link>
        </div>
      </div>
    </main>
  );
}
