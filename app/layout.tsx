import './globals.css';
import type { ReactNode } from 'react';
import AppShell from '../components/app-shell';

export const metadata = {
  title: 'CampusDrop — Your Campus. Your Marketplace.',
  description: 'Buy, sell and connect with students on campus.',
  icons: { icon: '/favicon.png' },
};

const themeScript = `(() => { try { const t = localStorage.getItem('campusdrop-theme') || 'system'; document.documentElement.dataset.theme = t; document.documentElement.style.colorScheme = t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t; } catch {} })()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AppShell>{children}</AppShell></body></html>;
}
