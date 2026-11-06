import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Biometric terminals (ZKTeco / eSSL ADMS push) call /iclock/* — keep those paths exact.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
