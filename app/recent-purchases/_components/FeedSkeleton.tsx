/** Mirrors the timeline geometry — rail included — so nothing jumps on load. */
export default function FeedSkeleton() {
  return (
    <div aria-hidden>
      <div className="sx-skel mb-5 h-4 w-24 rounded-full" />
      <ul className="space-y-3.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="relative sm:pl-[104px]" style={{ opacity: 1 - index * 0.12 }}>
            <span className="sx-skel absolute left-0 top-[26px] hidden h-3 w-[42px] rounded-full sm:block" />
            <span
              className="absolute left-[79px] top-[30px] hidden h-2.5 w-2.5 rounded-full sm:block"
              style={{ background: 'rgba(255,255,255,0.14)' }}
            />
            <div
              className="border p-4 sm:p-5"
              style={{
                borderRadius: 'var(--sx-r-lg)',
                borderColor: 'var(--sx-hair)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-stretch gap-4 sm:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="sx-skel h-[30px] w-[30px] flex-shrink-0 rounded-full" />
                    <div className="space-y-1.5">
                      <div className="sx-skel h-2.5 w-24 rounded-full" />
                      <div className="sx-skel h-2 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="sx-skel mt-4 h-4 w-48 max-w-full rounded-full" />
                  <div className="sx-skel mt-2 h-2.5 w-36 max-w-full rounded-full" />
                  <div className="mt-4 flex gap-1.5">
                    <div className="sx-skel h-6 w-20 rounded-full" />
                    <div className="sx-skel h-6 w-16 rounded-full" />
                  </div>
                </div>
                <div
                  className="sx-skel h-[84px] w-[84px] flex-shrink-0 self-center sm:h-[104px] sm:w-[104px]"
                  style={{ borderRadius: 'var(--sx-r-md)' }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
