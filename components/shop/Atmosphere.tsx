'use client';

/**
 * The room the shop stands in: true black, one quiet light, nothing that
 * competes with the products. Restraint is the point — no drifting blobs,
 * no grain, no scroll-tied lighting rig.
 */
export default function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ contain: 'strict' }}>
      <div className="absolute inset-0" style={{ background: '#000000' }} />

      {/* One soft light, high and centred — everything else is pure black */}
      <div
        className="absolute left-1/2 top-[-22%] -translate-x-1/2"
        style={{
          width: 'min(1100px, 90vw)',
          height: 640,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(124,106,245,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}
