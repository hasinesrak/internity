import { fileURLToPath } from "node:url"

import { defineConfig, loadEnv } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const appDir = fileURLToPath(new URL(".", import.meta.url))
const rootDir = fileURLToPath(new URL("../..", import.meta.url))

function setting(
  name: string,
  fileEnv: Record<string, string>,
  fallback: string
): string {
  const fromProcess = process.env[name]?.trim()
  if (fromProcess) return fromProcess
  const fromFile = fileEnv[name]
  if (fromFile && fromFile.trim()) return fromFile.trim()
  return fallback
}

function portSetting(name: string, fileEnv: Record<string, string>, fallback: string): number {
  const raw = setting(name, fileEnv, fallback)
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid port`)
  }
  return port
}

export default defineConfig(({ mode }) => {
  const fileEnv = {
    ...loadEnv(mode, rootDir, ""),
    ...loadEnv(mode, appDir, ""),
  }
  const host = setting("WEB_HOST", fileEnv, "0.0.0.0")
  const port = portSetting("WEB_PORT", fileEnv, "3000")
  return {
    // The badge model ships as a binary asset; Lanyard imports it by URL.
    assetsInclude: ["**/*.glb"],
    resolve: { tsconfigPaths: true },
    // A Windows file lock on a static asset (an editor or antivirus holding a
    // PNG open) makes the watcher throw EBUSY and take the whole dev server
    // down, so public/ stays unwatched. Assets there are served as-is; refresh
    // the page after changing one.
    server: {
      host,
      port,
      strictPort: true,
      watch: { ignored: ["**/public/**"] },
    },
    preview: { host, port, strictPort: true },
    plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  }
})
