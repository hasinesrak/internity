import { fileURLToPath } from "node:url"

import type { Connect, Plugin } from "vite"
import { defineConfig, loadEnv } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import {
  observedAddress,
  officeAddressAllowed,
  officeDeniedMessage,
  readAllowlist,
} from "./src/lib/office-network"

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function officeGate(
  allowlist: string[],
  trustProxy: boolean,
  loopbackWhenUnset: boolean
): Plugin {
  const gate: Connect.NextHandleFunction = (req, res, next) => {
    const allowed = officeAddressAllowed(
      observedAddress({
        remoteAddress: req.socket.remoteAddress,
        forwardedFor: headerValue(req.headers["x-forwarded-for"]),
        realIp: headerValue(req.headers["x-real-ip"]),
        trustProxy,
      }),
      allowlist,
      loopbackWhenUnset
    )
    if (allowed) {
      next()
      return
    }
    res.statusCode = 403
    res.setHeader("content-type", "text/plain; charset=utf-8")
    res.end(officeDeniedMessage)
  }
  return {
    name: "staff-office-gate",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use(gate)
    },
    configurePreviewServer(server) {
      server.middlewares.use(gate)
    },
  }
}

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

function portSetting(
  name: string,
  fileEnv: Record<string, string>,
  fallback: string
): number {
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
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  const host = setting("STAFF_HOST", fileEnv, "127.0.0.1")
  const port = portSetting("STAFF_PORT", fileEnv, "3001")
  const trustProxy = ["true", "1"].includes(
    setting("TRUST_PROXY", fileEnv, "false").toLowerCase()
  )
  return {
    resolve: { tsconfigPaths: true },
    server: { host, port, strictPort: true },
    preview: { host, port, strictPort: true },
    plugins: [
      officeGate(
        readAllowlist(process.env.STAFF_ALLOWED_IPS),
        trustProxy,
        mode !== "production"
      ),
      devtools(),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  }
})
