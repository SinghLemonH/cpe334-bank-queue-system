import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server for the Docker image (apps/web/Dockerfile).
  // Tracing from the monorepo root keeps the layout fixed: .next/standalone/apps/web/server.js
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
