import { memo } from 'react';

interface CyberSkeletonProps {
  variant?: 'card' | 'planet' | 'list';
  count?: number;
}

const SkeletonCard: React.FC = memo(() => (
  <div className="relative overflow-hidden rounded-xl bg-gray-900/50 border border-cyan-500/10">
    <div className="aspect-square bg-gradient-to-br from-gray-800/50 to-gray-900/50 relative">
      <div className="absolute inset-0 cyber-shimmer" />
      <div className="absolute top-2 left-2 w-8 h-8 rounded-full border border-cyan-500/20 bg-gray-800/50" />
      <div className="absolute bottom-2 right-2 w-6 h-6 rounded border border-cyan-500/10 bg-gray-800/30" />
    </div>
    <div className="p-2 space-y-1.5">
      <div className="h-2.5 w-3/4 rounded-full bg-cyan-500/10 relative overflow-hidden">
        <div className="absolute inset-0 cyber-shimmer" />
      </div>
      <div className="h-2 w-1/2 rounded-full bg-cyan-500/5 relative overflow-hidden">
        <div className="absolute inset-0 cyber-shimmer" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonPlanet: React.FC = memo(() => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/30 border border-cyan-500/5">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700/50 to-gray-800/50 relative overflow-hidden border border-cyan-500/10">
      <div className="absolute inset-0 cyber-shimmer" />
    </div>
    <div className="flex-1 space-y-1.5">
      <div className="h-2.5 w-2/3 rounded-full bg-cyan-500/10 relative overflow-hidden">
        <div className="absolute inset-0 cyber-shimmer" />
      </div>
      <div className="h-2 w-1/3 rounded-full bg-cyan-500/5 relative overflow-hidden">
        <div className="absolute inset-0 cyber-shimmer" style={{ animationDelay: '0.15s' }} />
      </div>
    </div>
  </div>
));

SkeletonPlanet.displayName = 'SkeletonPlanet';

const SkeletonList: React.FC = memo(() => (
  <div className="flex items-center gap-3 p-2 rounded-lg">
    <div className="w-12 h-12 rounded-lg bg-gray-800/50 relative overflow-hidden">
      <div className="absolute inset-0 cyber-shimmer" />
    </div>
    <div className="flex-1 space-y-1.5">
      <div className="h-2.5 w-4/5 rounded-full bg-cyan-500/10 relative overflow-hidden">
        <div className="absolute inset-0 cyber-shimmer" />
      </div>
      <div className="h-2 w-2/5 rounded-full bg-cyan-500/5 relative overflow-hidden">
        <div className="absolute inset-0 cyber-shimmer" style={{ animationDelay: '0.1s' }} />
      </div>
    </div>
  </div>
));

SkeletonList.displayName = 'SkeletonList';

const CyberSkeleton: React.FC<CyberSkeletonProps> = memo(({ variant = 'card', count = 6 }) => {
  const SkeletonComponent = variant === 'card' ? SkeletonCard : variant === 'planet' ? SkeletonPlanet : SkeletonList;

  return (
    <div className={
      variant === 'card' 
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4'
        : 'space-y-2 p-2'
    }>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
});

CyberSkeleton.displayName = 'CyberSkeleton';

export default CyberSkeleton;
