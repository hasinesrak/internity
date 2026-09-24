import { Hono } from "hono"
import { cors } from "hono/cors"
import { secureHeaders } from "hono/secure-headers"

import { getEnv } from "./config/env.js"
import { handleError } from "./middleware/error.js"
import { adminRoutes } from "./routes/admin.js"
import { authRoutes } from "./routes/auth.js"
import { departmentRoutes } from "./routes/departments.js"
import { healthRoutes } from "./routes/health.js"
import { hrRoutes } from "./routes/hr.js"
import { instructorRoutes } from "./routes/instructor.js"
import { internRoutes } from "./routes/intern.js"
import { supervisorRoutes } from "./routes/supervisor.js"
import { uploadRoutes } from "./routes/uploads.js"
import type { AppEnv } from "./types.js"

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
      allowHeaders: ["Content-Type"],
    })
  )
  const staffSurface = env.apiSurface === "staff"
  const routers = [
    healthRoutes,
    authRoutes,
    internRoutes,
    departmentRoutes,
    uploadRoutes,
    ...(staffSurface
      ? [adminRoutes, hrRoutes, supervisorRoutes, instructorRoutes]
      : []),
  ]
  installErrors(app)
  for (const router of routers) installErrors(router)
  app.route("/health", healthRoutes)
  app.route("/api/auth", authRoutes)
  app.route("/api/intern", internRoutes)
  app.route("/api/departments", departmentRoutes)
  app.route("/api/uploads", uploadRoutes)
  if (staffSurface) {
    app.route("/api/admin", adminRoutes)
    app.route("/api/hr", hrRoutes)
    app.route("/api/supervisor", supervisorRoutes)
    app.route("/api/instructor", instructorRoutes)
  }
  return app
}
