import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb', // Set your desired limit here
    },
  },
  reactCompiler: true,
};

export default nextConfig;
