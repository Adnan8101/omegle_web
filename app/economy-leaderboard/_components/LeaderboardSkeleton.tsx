/** Mirrors the champion panel + ladder so nothing reflows when data arrives. */
export default function LeaderboardSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      {/* Pool stats */}
      <div className="fx-surface grid grid-cols-2 gap-px overflow-hidden rounded-[var(--fx-r-lg)] bg-[var(--fx-hairline)] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-[rgb(var(--color-bg-primary))] px-6 py-6">
            <div className="fx-skeleton h-2.5 w-24 rounded-full" />
            <div className="fx-skeleton mt-3 h-7 w-28 rounded-[var(--fx-r-xs)]" />
          </div>
        ))}
      </div>

      {/* Champion */}
      <div className="fx-surface flex flex-col items-center gap-7 rounded-[var(--fx-r-xl)] px-10 py-11 lg:flex-row lg:gap-10">
        <div className="fx-skeleton h-[132px] w-[132px] flex-shrink-0 rounded-full" />
        <div className="w-full flex-1 space-y-4">
          <div className="fx-skeleton h-5 w-28 rounded-full" />
          <div className="fx-skeleton h-10 w-64 max-w-full rounded-[var(--fx-r-xs)]" />
          <div className="fx-skeleton h-9 w-48 rounded-[var(--fx-r-xs)]" />
        </div>
        <div className="fx-skeleton h-[76px] w-full rounded-[var(--fx-r-md)] lg:w-[260px]" />
      </div>

      {/* Ladder */}
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="fx-surface flex items-center gap-4 rounded-[var(--fx-r-md)] px-5 py-4"
          >
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
