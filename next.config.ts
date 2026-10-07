// Configurarea Next.js: export static (folderul out/), folosit atât pe Vercel, cât și în aplicația nativă Capacitor.
// Imaginile nu sunt optimizate de server (nu există server cu exportul static).
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",

  images: {
    unoptimized: true,
  },

  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
