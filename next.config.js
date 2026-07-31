/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'three'],
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true, // For GIF animations
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    // Only in production — these shouldn't fight Next.js's dev-mode
    // websocket/eval-based Fast Refresh, since dev builds are never public.
    if (process.env.NODE_ENV !== 'production') return []

    // NOTE: a Content-Security-Policy and Cross-Origin-Opener-Policy were
    // trialled here and pulled after a production Lighthouse run showed a
    // severe regression (Speed Index 3.2s -> 10.7s, TBT 0 -> 130ms, a new
    // "browser errors logged to console" flag, and a ~16s render delay on
    // the LCP element) — all symptoms of blocked/broken script execution,
    // and the CSP wasn't even being credited by Lighthouse's own audit. Redo
    // that pair with real browser testing (not just a local `next start`
    // curl check) before reintroducing them; the headers below are purely
    // declarative and can't block resource loading, so they're safe as-is.
    return [
      {
        source: '/:path*',
        headers: [
          // `includeSubDomains` is safe to add here — unlike CSP/COOP this
          // header can't block a script or resource, it only upgrades future
          // requests to HTTPS. `preload` is deliberately left out: getting a
          // domain into browsers' static preload lists takes weeks to
          // reverse, so that's a separate decision to opt into explicitly.
          { key: 'Strict-Transport-Security', value: 'max-age=86400; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
