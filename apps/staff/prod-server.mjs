// Production Node server for the built TanStack Start app.
// Serves hashed client files, then hands every other request to the SSR entry.
// The socket address is attached as `ip` so the staff gate can see the client.
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, normalize, sep } from "node:path"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"

const appDir = fileURLToPath(new URL(".", import.meta.url))
const clientRoot = join(appDir, "dist", "client")
const basePath = (process.env.STAFF_BASE_PATH || "").replace(/\/+$/, "")
const { default: app } = await import("./dist/server/server.js")

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
}

const SECURITY = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
}

function clientFile(urlPath) {
  let pathname = decodeURIComponent((urlPath ?? "/").split("?")[0] ?? "/")
  if (basePath && pathname.startsWith(`${basePath}/`)) {
    pathname = pathname.slice(basePath.length)
  }
  if (!pathname || pathname.includes("\0")) return null
  const relative = normalize(pathname).replace(/^[/\\]+/, "")
  if (!relative || relative.split(sep).includes("..")) return null
  if (!extname(relative)) return null
  const file = join(clientRoot, relative)
  const root = clientRoot.endsWith(sep) ? clientRoot : clientRoot + sep
  if (!file.startsWith(root)) return null
  if (!existsSync(file) || !statSync(file).isFile()) return null
  return file
}

function headerEntries(incoming) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else headers.set(key, value)
  }
  return headers
}

const host = process.env.HOST || "0.0.0.0"
const port = Number(process.env.PORT || "3001")
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port")
}

const server = createServer(async (req, res) => {
  try {
    const pathname = (req.url ?? "/").split("?")[0]
    if (pathname === "/health" || pathname === `${basePath}/health`) {
      res.writeHead(200, { ...SECURITY, "content-type": "text/plain; charset=utf-8" })
      res.end("ok")
      return
    }
    const file = req.method === "GET" || req.method === "HEAD" ? clientFile(req.url) : null
    if (file) {
      const type = MIME[extname(file)] ?? "application/octet-stream"
      res.writeHead(200, {
        ...SECURITY,
        "content-type": type,
        "cache-control": file.includes(`${sep}assets${sep}`)
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      })
      if (req.method === "HEAD") {
        res.end()
        return
      }
      createReadStream(file).pipe(res)
      return
    }

    const request = new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, {
      method: req.method,
      headers: headerEntries(req.headers),
      body: req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req),
      duplex: "half",
    })
    Object.defineProperty(request, "ip", { value: req.socket.remoteAddress ?? "" })
    const response = await app.fetch(request)
    const headers = { ...SECURITY }
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return
      headers[key] = value
    })
    const cookies =
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : []
    if (cookies.length > 0) headers["set-cookie"] = cookies
    res.writeHead(response.status, headers)
    if (!response.body || req.method === "HEAD") {
      res.end()
      return
    }
    Readable.fromWeb(response.body).pipe(res)
  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      res.writeHead(500, { ...SECURITY, "content-type": "text/plain; charset=utf-8" })
    }
    res.end("The server could not handle that request.")
  }
})

server.listen(port, host, () => {
  console.info(JSON.stringify({ msg: "listening", url: `http://localhost:${port}`, host }))
})
