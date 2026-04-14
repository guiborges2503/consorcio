import { Skeleton } from "./ui/skeleton";

type PageSkeletonProps = {
  showHeader?: boolean;
  statCards?: number;
  rows?: number;
};

export function PageSkeleton({ showHeader = true, statCards = 4, rows = 3 }: PageSkeletonProps) {
  return (
    <div className="space-y-6" aria-hidden="true">
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
      )}

      {statCards > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: statCards }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      )}

      <Skeleton className="h-16 rounded-3xl" />

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
