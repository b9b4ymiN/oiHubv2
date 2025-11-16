/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BINANCE_API_URL: process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://fapi.binance.com',
    NEXT_PUBLIC_BINANCE_WS_URL: process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://fstream.binance.com',
  },
}

module.exports = nextConfig
