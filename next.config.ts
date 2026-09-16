import type { NextConfig } from 'next';

const cspScript = process.env.NODE_ENV === 'development' ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Content-Security-Policy', value: `default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src ${cspScript}; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; },
};

export default nextConfig;
