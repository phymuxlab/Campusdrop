'use client';

import { GraduationCap, ShoppingBag, Sparkles, UserRound } from 'lucide-react';

const defaults: Record<string, { label: string; className: string; Icon: typeof UserRound }> = {
  'default:campus': { label: 'Campus avatar', className: 'avatarDefault campus', Icon: GraduationCap },
  'default:drop': { label: 'Drop avatar', className: 'avatarDefault drop', Icon: ShoppingBag },
  'default:green': { label: 'Green avatar', className: 'avatarDefault green', Icon: Sparkles },
  'default:classic': { label: 'Classic avatar', className: 'avatarDefault classic', Icon: UserRound },
};

export function Avatar({
  url,
  name = 'CampusDrop student',
  size = 'md',
}: {
  url?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const preset = url && defaults[url];
  if (preset) {
    const Icon = preset.Icon;
    return <span className={`avatarWrap ${size} ${preset.className}`} role="img" aria-label={preset.label}><Icon className="avatarDefaultIcon" size={size === 'sm' ? 16 : size === 'lg' ? 30 : 21} strokeWidth={2.2} /></span>;
  }

  if (url) {
    return <img className={`avatarImg ${size}`} src={url} alt={`${name}'s avatar`} />;
  }

  return <span className={`avatarWrap ${size} avatarDefault classic`} role="img" aria-label={`${name} default avatar`}><UserRound className="avatarDefaultIcon" size={size === 'sm' ? 16 : size === 'lg' ? 30 : 21} strokeWidth={2.2} /></span>;
}

export function isPresetAvatar(value?: string | null) {
  return !!value && value in defaults;
}
