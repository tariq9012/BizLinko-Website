import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // Phase 12: without this, `vite build` produces a server bundle that only
    // exports a `{ fetch }` handler and has no self-starting runtime — plain
    // `node dist/server/server.js` exits immediately (a known TanStack Start
    // gap without an explicit deployment target). Adding the Nitro plugin
    // gives the build a real entry point.
    //
    // `preset: "vercel"` only when Vercel's own build environment sets
    // `VERCEL=1` (this nitro version has no built-in auto-detection for
    // that, so it's done explicitly here) — outputs `.vercel/output/`,
    // which Vercel's build step expects. Anywhere else (local build, a
    // plain Node host), it falls back to the "node-server" preset:
    // `.output/server/index.mjs`, a self-starting Node server — see
    // README's Deployment section for both paths.
    nitro({
      ...(process.env["VERCEL"] ? { preset: "vercel" as const } : {}),
    }),
    viteReact(),
  ],
});
