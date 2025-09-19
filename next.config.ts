import type { NextConfig } from "next";

const { execSync } = require("child_process");

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
  },
};



export default nextConfig;
