import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

const config = [
  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
    }
  },
  {
    ignores: [".next/", "out/", "build/", "FinalA+/", "android/", ".portal-browser-profile/", "electron/", "playwright-report/", "test-results/", "dist/", "taskkill", "agent"]
  }
];

export default config;