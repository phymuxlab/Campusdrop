export function Skeleton({ className = '' }: { className?: string }) { return <span aria-hidden="true" className={`skeleton ${className}`} />; }
export function PageSkeleton({ rows = 4 }: { rows?: number }) { return <div className="skeletonPage">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className={i === 0 ? 'skeletonTitle' : 'skeletonLine'} />)}</div>; }
