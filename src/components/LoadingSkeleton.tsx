/**
 * Shimmer skeleton placeholder shown while a word lookup is loading.
 *
 * Mimics the layout of the WordDetail view so there's no layout shift
 * when real content appears.
 */
export function LoadingSkeleton() {
  return (
    <div className="flex-1 px-6 py-5 space-y-6 animate-fade-in">
      {/* Word heading skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="h-3 w-32 rounded animate-shimmer" />
      </div>

      {/* Divider */}
      <div
        className="h-px"
        style={{ backgroundColor: "var(--color-border)" }}
      />

      {/* POS section skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-20 rounded-full animate-shimmer" />

        {/* Sense skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 pl-1">
            <div className="h-4 w-6 rounded animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full rounded animate-shimmer" />
              <div className="h-4 w-3/4 rounded animate-shimmer" />
              <div className="h-3 w-48 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Second POS section skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-16 rounded-full animate-shimmer" />

        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 pl-1">
            <div className="h-4 w-6 rounded animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full rounded animate-shimmer" />
              <div className="h-4 w-2/3 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
