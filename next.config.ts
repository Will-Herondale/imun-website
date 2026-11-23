import type { NextConfig } from "next";

const securityHeaders = () => {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
  ];

  return headers;
};

// `output: "standalone"` is only needed for the self-hosted Azure App Service
// artifact (npm run build:standalone). Netlify's Next.js runtime expects the
// default build output, so opt in via BUILD_STANDALONE instead of always on.
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true"
    ? { output: "standalone" as const }
    : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;