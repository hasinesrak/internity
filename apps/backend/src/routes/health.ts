import { Hono } from "hono"
import mongoose from "mongoose"

import type { AppEnv } from "../types.js"

export const healthRoutes = new Hono<AppEnv>()

healthRoutes.get("/", (c) => c.json({ status: "ok" }))

healthRoutes.get("/ready", async (c) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return c.json({ status: "unavailable", database: "down" }, 503)
    }
    await mongoose.connection.db.admin().command({ ping: 1 })
    return c.json({ status: "ok", database: "up" })
  } catch {
    return c.json({ status: "unavailable", database: "down" }, 503)
  }
})
