import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/csp";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The iPhone-photo decoder runs in its own worker: it may run its own code, but can't reach the network.
      { source: "/heic-worker.js", headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'unsafe-eval'" }] },
    ];
  },
};

export default nextConfig;
