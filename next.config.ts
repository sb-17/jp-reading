import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static HTML export — GitHub Pages serves files, it cannot run a Node server.
     No basePath: the site lives at the root of reading.kanjii.org (see
     public/CNAME). If it ever moves to a project site
     (username.github.io/jp-reading) both basePath and assetPrefix have to be set
     to "/jp-reading" or every asset 404s. */
  output: "export",
  /* /stories/foo/ -> stories/foo/index.html, which is what GitHub Pages can
     serve without a rewrite rule. */
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
