import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./tests/setup/vitest.setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        globals: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "server-only": path.resolve(__dirname, "./tests/setup/server-only.ts"),
        },
    },
});
