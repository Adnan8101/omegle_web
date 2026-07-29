/** Matches the real card geometry so the feed doesn't jump when data lands. */
export default function PurchaseFeedSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="fx-surface rounded-[var(--fx-r-lg)] p-4 sm:p-6">
          <div className="flex items-stretch gap-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="fx-skeleton h-8 w-8 flex-shrink-0 rounded-full" />
                <div className="space-y-1.5">
                  <div className="fx-skeleton h-3 w-28 rounded-full" />
                  <div className="fx-skeleton h-2.5 w-20 rounded-full" />
                </div>
              </div>

              <div className="fx-skeleton h-5 w-52 max-w-full rounded-[var(--fx-r-xs)]" />
              <div className="fx-skeleton mt-2 h-3 w-40 max-w-full rounded-full" />

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="fx-skeleton h-6 w-24 rounded-full" />
                <div className="fx-skeleton h-6 w-20 rounded-full" />
                <div className="fx-skeleton h-6 w-20 rounded-full" />
              </div>
            </div>

            <div className="fx-skeleton h-[88px] w-[88px] flex-shrink-0 self-center rounded-[var(--fx-r-md)] sm:h-[116px] sm:w-[116px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
