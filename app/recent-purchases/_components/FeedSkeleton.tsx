/** Mirrors the timeline geometry — rail included — so nothing jumps on load. */
export default function FeedSkeleton() {
  return (
    <div aria-hidden>
      <ul className="space-y-3.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="relative sm:pl-[104px]" style={{ opacity: 1 - index * 0.12 }}>
            <span className="absolute left-0 top-[26px] hidden h-3 w-[42px] animate-pulse rounded-full bg-white/[0.05] sm:block" />
            <span className="absolute left-[79px] top-[30px] hidden h-2.5 w-2.5 rounded-full bg-white/10 sm:block" />
            <div className="rounded-[20px] border border-white/8 bg-white/[0.02] p-4 sm:p-5">
              <div className="flex items-stretch gap-4 sm:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-[30px] w-[30px] flex-shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-24 animate-pulse rounded-full bg-white/[0.05]" />
                      <div className="h-2 w-16 animate-pulse rounded-full bg-white/[0.05]" />
                    </div>
                  </div>
                  <div className="mt-4 h-4 w-48 max-w-full animate-pulse rounded-full bg-white/[0.05]" />
                  <div className="mt-2 h-2.5 w-36 max-w-full animate-pulse rounded-full bg-white/[0.05]" />
                  <div className="mt-4 flex gap-1.5">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-white/[0.05]" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.05]" />
                  </div>
                </div>
                <div className="h-[84px] w-[84px] flex-shrink-0 animate-pulse self-center rounded-[16px] bg-white/[0.05] sm:h-[104px] sm:w-[104px]" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
