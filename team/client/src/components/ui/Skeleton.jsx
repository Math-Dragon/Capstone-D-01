export function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className={`${prefersReducedMotion ? 'bg-gray-200' : 'animate-pulse bg-gray-200'} ${variants[variant]} ${className}`}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Memuat...</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <Skeleton className="h-48 w-full mb-4" variant="rectangular" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circular" className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
