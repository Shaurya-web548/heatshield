import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static site for GitHub Pages (no API routes there —
// the advisory panel silently keeps its generated text). Local dev and normal
// builds are unaffected.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      basePath: "/heatshield",
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
