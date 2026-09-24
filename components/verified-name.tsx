'use client';

export function VerifiedName({ userId, name, className = '', verified = false }: { userId?: string | null; name?: string | null; className?: string; verified?: boolean }) {
  return <span className={`verifiedName ${className}`}><span>{name || 'CampusDrop student'}</span>{verified && <img className="verifiedBadge" src="/campusdrop-verification-badge.png" width={17} height={17} alt="Verified student"/>}</span>;
}
