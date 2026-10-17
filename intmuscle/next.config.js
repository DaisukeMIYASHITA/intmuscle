/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_GA_DEPLOYMENT_ENV: process.env.VERCEL_ENV || "" },
  reactStrictMode: true,
}

module.exports = nextConfig
