import './globals.css';
import type { ReactNode } from 'react';
import AppShell from '../components/app-shell';

export const metadata = {
  title: 'CampusDrop — Your Campus. Your Marketplace.',
  description: 'Buy, sell and connect with students on campus.',
  icons: { icon: '/favicon.png' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CampusDrop', statusBarStyle: 'default' },
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><head /><body><AppShell>{children}</AppShell></body></html>;
}
