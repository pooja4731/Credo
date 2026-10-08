/** Skeleton placeholder for a grid of stat cards while data is loading. */
export default function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-5">
          <div className="h-7 w-16 animate-pulse rounded bg-olive-900/10" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-olive-900/10" />
        </div>
      ))}
    </div>
  );
}
