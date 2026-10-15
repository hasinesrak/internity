import { Hono } from "hono"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"

import { getEnv } from "./config/env.js"
import { handleError } from "./middleware/error.js"
import { adminRoutes } from "./routes/admin.js"
import { authRoutes } from "./routes/auth.js"
import { cliRoutes } from "./routes/cli.js"
import { departmentRoutes } from "./routes/departments.js"
import { healthRoutes } from "./routes/health.js"
import { attendanceRoutes } from "./routes/attendance.js"
import { documentRoutes } from "./routes/documents.js"
import { hrRoutes } from "./routes/hr.js"
import { instructorRoutes } from "./routes/instructor.js"
import { internRoutes } from "./routes/intern.js"
import { supervisorRoutes } from "./routes/supervisor.js"
import { uploadRoutes } from "./routes/uploads.js"
import { platformAuthRoutes } from "./routes/platform-auth.js"
import { platformRoutes } from "./routes/platform.js"
import type { AppEnv } from "./types.js"
import { billingWebhookRoutes } from "./routes/billing-webhook.js"

function installErrors(app: Hono<AppEnv>) {
  app.notFound((c) =>
    c.json(
      { error: { code: "NOT_FOUND", message: "That route was not found." } },
      404
    )
  )
  app.onError(handleError)
}

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()
  const env = getEnv()
  // API responses include account data and session cookies. Keep them out of
  // every intermediary cache; the ingress only caches immutable frontend
  // assets served by the web and staff applications.
  app.use("*", async (c, next) => {
    await next()
    c.header("Cache-Control", "no-store")
  })
  app.use(
    "*",
    secureHeaders({
      // The theme boot script is inline. A strict script policy would block it
      // on the sites; this middleware only covers the API.
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
      },
    })
  )
  app.use(
    "*",
    cors({
      origin: env.corsOrigins,
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  )
  const staffSurface = env.apiSurface === "staff"
  const platformSurface = env.apiSurface === "platform"
  const routers = platformSurface
    ? [healthRoutes, platformAuthRoutes, platformRoutes, billingWebhookRoutes]
    : [
        healthRoutes,
        authRoutes,
        cliRoutes,
        internRoutes,
        departmentRoutes,
        uploadRoutes,
        attendanceRoutes,
        documentRoutes,
        ...(staffSurface
          ? [adminRoutes, hrRoutes, supervisorRoutes, instructorRoutes]
          : []),
      ]
  installErrors(app)
  for (const router of routers) installErrors(router)
  app.route("/health", healthRoutes)
  if (platformSurface) {
    app.route("/api/platform/auth", platformAuthRoutes)
    app.route("/api/platform/billing/webhooks", billingWebhookRoutes)
    app.route("/api/platform", platformRoutes)
  } else {
    app.route("/api/auth", authRoutes)
    app.route("/api/cli", cliRoutes)
    app.route("/api/intern", internRoutes)
    app.route("/api/departments", departmentRoutes)
    app.route("/api/uploads", uploadRoutes)
    app.route("/api/attendance", attendanceRoutes)
    app.route("/api/documents", documentRoutes)
  }
  if (staffSurface) {
    app.route("/api/admin", adminRoutes)
    app.route("/api/hr", hrRoutes)
    app.route("/api/supervisor", supervisorRoutes)
    app.route("/api/instructor", instructorRoutes)
  }
  return app
}
