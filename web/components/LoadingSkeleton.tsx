'use client';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
  /** Card grid layout (e.g. marketplace, tipster coupons) */
  variant?: 'list' | 'cards';
}

export function LoadingSkeleton({ count = 3, className = '', variant = 'list' }: LoadingSkeletonProps) {
  const isCards = variant === 'cards';

  return (
    <div
      className={`${isCards ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-4'} ${className}`.trim()}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card-gradient rounded-2xl p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="skeleton h-4 w-24" />
          </div>
          <div className="skeleton h-5 w-3/4 mb-3" />
          <div className="skeleton h-4 w-1/2 mb-4" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-4/5" />
          </div>
          <div className="skeleton h-10 w-full mt-4 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
