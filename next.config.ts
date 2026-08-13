import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Keep pdfkit, docx, and archiver as external Node modules so their
  // __dirname-based asset loading (font .afm files) and binary stream APIs
  // work at runtime. Without this Next.js bundles them and __dirname
  // resolves to "/ROOT" which breaks font loading.
  serverExternalPackages: ["pdfkit", "docx", "fontkit", "linebreak", "png-js", "archiver"],
};

export default nextConfig;
