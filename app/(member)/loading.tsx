import { Skeleton, SkeletonText } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-clay-200 bg-cream-50 p-5">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
