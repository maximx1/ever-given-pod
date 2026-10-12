import type { NextConfig } from "next";

// SVGO strips the viewBox by default. Without it an icon cannot scale: drawn smaller than
// its natural 24px it is cropped at the right and bottom instead of shrinking.
const svgrLoader = {
  loader: '@svgr/webpack',
  options: {
    svgoConfig: {
      plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }, 'prefixIds'],
    },
  },
};

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      './src/icons/**/*.svg': {
        loaders: [svgrLoader],
        as: '*.js',
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [svgrLoader],
    });
    return config;
  },
  images: {
    remotePatterns: [new URL('https://placehold.co/**')],
  }
};

export default nextConfig;
