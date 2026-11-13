import type { NextConfig } from 'next'

// Security headers for every page. The CSP allows Next's inline bootstrap scripts and styles
// ('unsafe-inline'; eval only in development), images from anywhere over HTTPS (map tiles, Google
// profile photos), and nothing may frame the site.
const isDev = process.env.NODE_ENV !== 'production'
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  // Old address of the via ferrata participants list, now part of the combined list.
  // (Paths without a language are redirected to /ro or /en by src/proxy.ts.)
  async redirects() {
    return [
      { source: '/:lang(en|ro)/admin/via-ferrata-participants', destination: '/:lang/admin/participants', permanent: true },
    ]
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Participants' documents and GPX tracks are always saved as files, never opened as a page of
      // this site (uploads only accept PDFs, images, Word files and tracks — see api/upload).
      { source: '/uploads/hike-document-submissions/:path*', headers: [{ key: 'Content-Disposition', value: 'attachment' }] },
      { source: '/uploads/hike-gpx/:path*', headers: [{ key: 'Content-Disposition', value: 'attachment' }] },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile photos
    ],
  },
}

export default nextConfig
