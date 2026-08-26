/** Loading state mirroring the real rhythm — filter chips, then a ranked
    section per tier — so nothing reflows once the roster lands. */
export default function TeamSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-11 flex justify-center">
        <div className="fx-skeleton h-11 w-72 max-w-full rounded-full" />
      </div>

      <div className="flex flex-col gap-12 sm:gap-14">
        <SectionSkeleton>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="fx-surface flex items-center gap-6 rounded-[var(--fx-r-lg)] p-6">
                <div className="fx-skeleton h-20 w-20 flex-shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="fx-skeleton h-3 w-20 rounded-full" />
                  <div className="fx-skeleton mt-3 h-4 w-36 rounded-full" />
                  <div className="fx-skeleton mt-2 h-3 w-24 rounded-full" />
                  <div className="mt-5 border-t border-[var(--fx-hairline)] pt-3.5">
                    <div className="fx-skeleton h-3 w-28 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionSkeleton>

        <SectionSkeleton>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
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
        </SectionSkeleton>

        <SectionSkeleton>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="fx-surface flex items-center gap-3.5 rounded-[var(--fx-r-md)] px-4 py-3.5">
                <div className="fx-skeleton h-[46px] w-[46px] flex-shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="fx-skeleton h-3.5 w-28 rounded-full" />
                  <div className="fx-skeleton mt-2 h-3 w-20 rounded-full" />
                </div>
                <div className="fx-skeleton h-3 w-14 flex-shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </SectionSkeleton>
      </div>
    </div>
  );
}

function SectionSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="fx-skeleton h-3.5 w-3.5 rounded-full" />
        <div className="fx-skeleton h-3 w-24 rounded-full" />
        <div className="fx-skeleton h-px flex-1" />
        <div className="fx-skeleton h-3 w-4 rounded-full" />
      </div>
      {children}
    </div>
  );
}
