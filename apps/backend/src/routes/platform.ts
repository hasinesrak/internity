import { Hono } from "hono"

import { requirePlatformAuth } from "../middleware/platform-auth.js"
import { parseBody, readJson } from "../lib/http.js"
import {
  createOrganization,
  listOrganizations,
  listPlatformAudit,
  updateOrganizationSubscription,
  updateOrganizationStatus,
} from "../services/platform.service.js"
import {
  platformOrganizationSchema,
  platformOrganizationStatusSchema,
  platformSubscriptionSchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"
import { getBillingOverview, listInvoices, createInvoice, updateInvoiceStatus } from "../services/billing.service.js"
import { platformInvoiceSchema, platformInvoiceStatusSchema } from "../validators.js"
import { requireId } from "../lib/http.js"
import { createSupportSession, listSupportSessions, revokeSupportSession } from "../services/support.service.js"
import { supportSessionSchema } from "../validators.js"

export const platformRoutes = new Hono<AppEnv>()

platformRoutes.use("*", requirePlatformAuth)

platformRoutes.get("/organizations", async (c) => {
  return c.json({ organizations: await listOrganizations() })
})

platformRoutes.get("/audit", async (c) => c.json({ audit: await listPlatformAudit() }))
platformRoutes.get("/organizations/:id/billing", async (c) => c.json({ billing: await getBillingOverview(requireId(c)) }))
platformRoutes.get("/organizations/:id/invoices", async (c) => c.json({ invoices: await listInvoices(requireId(c)) }))
platformRoutes.post("/organizations/:id/invoices", async (c) => {
  const body = parseBody(platformInvoiceSchema, await readJson(c)); const invoice = await createInvoice(requireId(c), body)
  return c.json({ invoice: { id: invoice._id.toString(), number: invoice.number, status: invoice.status, amountMinor: invoice.amountMinor } }, 201)
})
platformRoutes.patch("/organizations/:id/invoices/:invoiceId/status", async (c) => {
  const body = parseBody(platformInvoiceStatusSchema, await readJson(c)); const invoice = await updateInvoiceStatus(requireId(c), requireId(c, "invoiceId"), body.status)
  return c.json({ invoice: { id: invoice._id.toString(), number: invoice.number, status: invoice.status, paidAt: invoice.paidAt?.toISOString() ?? null } })
})
platformRoutes.get("/support-sessions", async (c) => c.json({ sessions: await listSupportSessions(c.get("platformUser").id) }))
platformRoutes.post("/organizations/:id/support-sessions", async (c) => {
  const body = parseBody(supportSessionSchema, await readJson(c))
  return c.json({ session: await createSupportSession(c.get("platformUser").id, requireId(c), body.reason, body.ttlMinutes) }, 201)
})
platformRoutes.post("/support-sessions/:id/revoke", async (c) => c.json({ session: await revokeSupportSession(c.get("platformUser").id, requireId(c)) }))

platformRoutes.post("/organizations", async (c) => {
  const body = parseBody(platformOrganizationSchema, await readJson(c))
  return c.json({ organization: await createOrganization(body, c.get("platformUser").id) }, 201)
})

platformRoutes.patch("/organizations/:id/status", async (c) => {
  const body = parseBody(platformOrganizationStatusSchema, await readJson(c))
  return c.json({
    organization: await updateOrganizationStatus(c.req.param("id"), body.status, c.get("platformUser").id),
  })
})

platformRoutes.patch("/organizations/:id/subscription", async (c) => {
  const body = parseBody(platformSubscriptionSchema, await readJson(c))
  return c.json({
    organization: await updateOrganizationSubscription(c.req.param("id"), body, c.get("platformUser").id),
  })
})
