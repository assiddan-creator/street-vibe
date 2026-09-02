/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Turbopack scoped to this app when a parent directory also contains a lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
