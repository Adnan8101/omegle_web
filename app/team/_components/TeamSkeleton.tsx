/**
 * Loading state that mirrors the real roster layout, so the page doesn't
 * reflow when data lands.
 */
export default function TeamSkeleton() {
  return (
    <div className="space-y-24" aria-hidden>
      {[
        { cards: 2, columns: 'sm:grid-cols-2' },
        { cards: 3, columns: 'sm:grid-cols-2 lg:grid-cols-3' },
      ].map((group, groupIndex) => (
        <section key={groupIndex}>
          <div className="mb-9 flex items-start gap-5 sm:gap-8">
            <div className="fx-skeleton hidden h-20 w-16 rounded-[var(--fx-r-sm)] sm:block" />
            <div className="flex-1 space-y-3">
              <div className="fx-skeleton h-3 w-28 rounded-full" />
              <div className="fx-skeleton h-8 w-72 max-w-full rounded-[var(--fx-r-xs)]" />
              <div className="fx-skeleton h-3.5 w-full max-w-lg rounded-full" />
              <hr className="fx-rule mt-6" />
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-5 ${group.columns}`}>
            {Array.from({ length: group.cards }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="fx-surface overflow-hidden rounded-[var(--fx-r-lg)]"
              >
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
        </section>
      ))}
    </div>
  );
}
