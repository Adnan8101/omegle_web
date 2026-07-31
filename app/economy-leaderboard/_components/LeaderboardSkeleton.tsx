/** Mirrors the pool stats + podium + ladder so nothing reflows when data arrives. */
export default function LeaderboardSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      {/* Pool stats */}
      <div className="fx-surface grid grid-cols-2 gap-px overflow-hidden rounded-[var(--fx-r-lg)] bg-[var(--fx-hairline)] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-[rgb(var(--color-bg-primary))] px-6 py-6">
            <div className="fx-skeleton h-2.5 w-24 rounded-full" />
            <div className="fx-skeleton mt-3 h-7 w-28 rounded-[var(--fx-r-xs)]" />
          </div>
        ))}
      </div>

      {/* Podium */}
      <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-end sm:gap-5">
        {[{ h: 'sm:pb-4' }, { h: 'sm:pb-9' }, { h: 'sm:pb-0' }].map((row, index) => (
          <div key={index} className={`fx-surface flex-1 rounded-[var(--fx-r-lg)] px-5 pb-6 pt-8 ${row.h}`}>
            <div className="fx-skeleton mx-auto h-20 w-20 rounded-full" />
            <div className="fx-skeleton mx-auto mt-4 h-3.5 w-20 rounded-full" />
            <div className="fx-skeleton mx-auto mt-3 h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>

      {/* Ladder */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="fx-surface flex items-center gap-4 rounded-[var(--fx-r-md)] px-5 py-4">
            <div className="fx-skeleton h-6 w-7 rounded" />
            <div className="fx-skeleton h-12 w-12 flex-shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="fx-skeleton h-4 w-40 max-w-full rounded-full" />
              <div className="fx-skeleton h-1.5 w-full max-w-[240px] rounded-full" />
            </div>
            <div className="fx-skeleton h-6 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
