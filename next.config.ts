import type { NextConfig } from 'next'

// Security headers for every page. The Content-Security-Policy is set per request in src/proxy.ts,
// because its script nonce changes with every response.
const securityHeaders = [
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
