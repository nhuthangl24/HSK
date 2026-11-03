import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  typescript: {
    // Enforce strict TypeScript compilation check during builds
    ignoreBuildErrors: false,
  },
  outputFileTracingExcludes: {
    '*': [
      './public/exam-files/**/*',
      './public/**/*.mp3',
      './public/**/*.pdf',
      './public/**/*.xlsx',
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
