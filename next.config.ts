import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Fallback for Node.js modules not available in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        os: false,
        util: false,
        stream: false,
        crypto: false,
        zlib: false,
        http: false,
        https: false,
        child_process: false,
      };
      
      // Completely exclude winston from client bundles
      config.externals = {
        ...config.externals,
        winston: 'winston',
      };
    }
    
    // Optimize build performance
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }
    
    return config;
  },
  serverExternalPackages: ['winston', 'sqlite3', '@keyv/sqlite'],
};

export default nextConfig;
