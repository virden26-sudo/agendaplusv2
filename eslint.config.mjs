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
            "react-hooks/set-state-in-effect": "off",
        }
    },
    {
        ignores: [".next/", "out/", "build/", "FinalA+/", "android/app/build/", "android/build/", "android/app/src/main/assets/", "electron/build/", "electron/app/"]
    }
];
