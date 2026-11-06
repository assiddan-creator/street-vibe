/**
 * Baseline browser hardening for every route. A Content-Security-Policy is
 * deliberately not set here: Clerk, fonts and inline styles need a tested
 * allowlist, and a wrong CSP breaks sign-in. Add it as Report-Only first.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Voice input uses the microphone on our own origin; nothing else is needed.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Turbopack scoped to this app when a parent directory also contains a lockfile.
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
