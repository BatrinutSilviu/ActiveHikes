import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Old address of the via ferrata participants list, now part of the combined list.
  // (Paths without a language are redirected to /ro or /en by src/proxy.ts.)
  async redirects() {
    return [
      { source: '/:lang(en|ro)/admin/via-ferrata-participants', destination: '/:lang/admin/participants', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile photos
    ],
  },
}

export default nextConfig
