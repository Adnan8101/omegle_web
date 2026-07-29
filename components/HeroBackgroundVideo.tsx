'use client';
import { useEffect, useRef } from 'react';

/**
 * Ambient looping hero video. Pauses decode/compositing work whenever it's
 * scrolled off-screen or the tab is backgrounded — identical pixels while
 * visible, zero GPU/CPU cost while not.
 */
export default function HeroBackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const tryPlay = () => video.play().catch(() => {});

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') {
          tryPlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0 }
    );
    observer.observe(video);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (video.getBoundingClientRect().bottom > 0) tryPlay();
      } else {
        video.pause();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <video
      ref={ref}
      className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover opacity-20 dark:opacity-10"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    >
      <source src="/Discord:Omegle.mp4" type="video/mp4" />
    </video>
  );
}
