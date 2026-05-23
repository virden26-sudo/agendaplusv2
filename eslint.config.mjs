import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

export default [
  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
    }
  },
  {
    ignores: [".next/", "out/", "build/", "FinalA+/", "android/", ".portal-browser-profile/", "electron/", "playwright-report/", "test-results/", "dist/", "taskkill", "agent"]
  }
];