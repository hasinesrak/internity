import { Hono } from "hono"

import { readBoundedBytes } from "../lib/http.js"
import { processStripeWebhook } from "../services/stripe-billing.service.js"
import type { AppEnv } from "../types.js"

export const billingWebhookRoutes = new Hono<AppEnv>()
billingWebhookRoutes.post("/stripe", async (c) => {
  const body = Buffer.from(await readBoundedBytes(c, 1024 * 1024))
  return c.json(await processStripeWebhook(body, c.req.header("stripe-signature") ?? ""))
})
