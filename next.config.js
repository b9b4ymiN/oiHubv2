/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: ['duckdb'],
  env: {
    NEXT_PUBLIC_BINANCE_API_URL: process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://fapi.binance.com',
    NEXT_PUBLIC_BINANCE_WS_URL: process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://fstream.binance.com',
  },
  // Externalize DuckDB for server-side routes (Node.js runtime only)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('duckdb')
    }
    return config
  },
}

module.exports = nextConfig
