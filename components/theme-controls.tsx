'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
}

export default function ThemeControls() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('campusdrop-theme') as Theme | null) || 'system';
    setTheme(saved);
    applyTheme(saved);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if ((localStorage.getItem('campusdrop-theme') || 'system') === 'system') applyTheme('system');
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  function choose(next: Theme) {
    localStorage.setItem('campusdrop-theme', next);
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="themeControls" aria-label="Appearance">
      <span className="themeTitle">Appearance</span>
      <div className="themeOptions">
        <button className={theme === 'light' ? 'active' : ''} onClick={() => choose('light')}><Sun size={15}/> Light</button>
        <button className={theme === 'dark' ? 'active' : ''} onClick={() => choose('dark')}><Moon size={15}/> Dark</button>
        <button className={theme === 'system' ? 'active' : ''} onClick={() => choose('system')}><Monitor size={15}/> System</button>
      </div>
    </div>
  );
}
