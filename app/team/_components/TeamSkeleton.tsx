/** Loading state matching the filter chip + card grid so nothing reflows when data lands. */
export default function TeamSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-9 flex justify-center">
        <div className="fx-skeleton h-11 w-64 max-w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="fx-surface overflow-hidden rounded-[var(--fx-r-lg)]">
            <div className="fx-skeleton h-24 w-full" />
            <div className="px-5 pb-5">
              <div className="fx-skeleton -mt-9 mb-4 h-16 w-16 rounded-full border-[3px] border-[rgb(var(--color-bg-primary))]" />
              <div className="fx-skeleton mb-2 h-4 w-32 rounded-full" />
              <div className="fx-skeleton h-3 w-20 rounded-full" />
              <div className="mt-5 border-t border-[var(--fx-hairline)] pt-3.5">
                <div className="fx-skeleton h-3 w-40 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
