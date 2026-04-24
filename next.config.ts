import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // Playwright uses 127.0.0.1; allow Next dev resources (HMR/runtime) from this origin.
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
