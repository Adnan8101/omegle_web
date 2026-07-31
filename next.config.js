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
    // Only in production — a locked-down CSP fights Next.js's dev-mode
    // websocket/eval-based Fast Refresh for no real benefit, since dev
    // builds are never public.
    if (process.env.NODE_ENV !== 'production') return []

    const csp = [
      "default-src 'self'",
      // Next.js hydration data and our own inline styles rely on these —
      // going nonce-based would be the stricter follow-up, not a small tweak.
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.discordapp.com https://*.blob.vercel-storage.com",
      "font-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "frame-src https://checkout.razorpay.com https://api.razorpay.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Stage 1 of HSTS rollout, per the platform's own guidance — widen
          // to includeSubDomains/preload only after confirming nothing on a
          // subdomain depends on plain HTTP.
          { key: 'Strict-Transport-Security', value: 'max-age=86400' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
