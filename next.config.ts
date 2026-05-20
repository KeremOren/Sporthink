import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker / standalone deployment için
  output: 'standalone',

  // External package'lar Server Components içinde
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],

  // Bu workspace'in root'unu bildir (lockfile warning'i sustur)
  turbopack: {
    root: __dirname,
  },

  // Production header'ları zaten vercel.json'da. Burada da set ediyoruz
  // (Vercel dışı deploymentlar için).
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
