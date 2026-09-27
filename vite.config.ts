import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const configuredBase = process.env.VITE_BASE_PATH;
const githubPagesBase = repositoryName ? `/${repositoryName}/` : "/";

export default defineConfig({
  base: configuredBase ?? (process.env.GITHUB_ACTIONS === "true" ? githubPagesBase : "/"),
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
