import { Types } from "mongoose"

import { AppError, notFound } from "../lib/errors.js"
import { Assignment } from "../models/assignment.js"
import { Department } from "../models/department.js"
import { Invoice, type InvoiceStatus } from "../models/invoice.js"
import { Organization } from "../models/organization.js"
import { OrganizationSubscription } from "../models/organization-subscription.js"
import { OrganizationUsage } from "../models/organization-usage.js"
import { Upload } from "../models/upload.js"
import { User } from "../models/user.js"
import { getEnv } from "../config/env.js"
import { recordActivity } from "./activity.service.js"
import { withTenantWriteLock } from "./tenant-lock.service.js"

export const PLAN_CATALOG = {
  trial: { name: "Trial", monthlyAmountMinor: 0, limits: { activeUsers: 25, activeInterns: 20, storageBytes: 1_000_000_000 } },
  starter: { name: "Starter", monthlyAmountMinor: 4900, limits: { activeUsers: 100, activeInterns: 80, storageBytes: 10_000_000_000 } },
  growth: { name: "Growth", monthlyAmountMinor: 14900, limits: { activeUsers: 500, activeInterns: 400, storageBytes: 100_000_000_000 } },
  enterprise: { name: "Enterprise", monthlyAmountMinor: 0, limits: { activeUsers: Number.MAX_SAFE_INTEGER, activeInterns: Number.MAX_SAFE_INTEGER, storageBytes: Number.MAX_SAFE_INTEGER } },
} as const

export function planFor(code: string) {
  if (code === "legacy") return { ...PLAN_CATALOG.enterprise, name: "Legacy" }
  if (!(code in PLAN_CATALOG)) throw new AppError(409, "UNKNOWN_PLAN", "The workspace plan needs to be configured by a platform administrator.")
  return PLAN_CATALOG[code as keyof typeof PLAN_CATALOG]
}

function period(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return { start, end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) }
}

function oid(id: string) { if (!Types.ObjectId.isValid(id)) throw new AppError(400, "VALIDATION_ERROR", "Use a valid organization id."); return new Types.ObjectId(id) }

export async function refreshUsage(organizationId: string) {
  const id = oid(organizationId); const { start, end } = period(); const scope = { organizationId: id }
  const [activeUsers, activeInterns, departments, assignments, storage] = await Promise.all([
    User.countDocuments({ ...scope, status: "active" }), User.countDocuments({ ...scope, status: "active", role: "intern" }),
    Department.countDocuments({ ...scope, status: "active" }), Assignment.countDocuments(scope), Upload.aggregate([{ $match: scope }, { $group: { _id: null, bytes: { $sum: "$size" } } }]),
  ])
  const doc = await OrganizationUsage.findOneAndUpdate({ organizationId: id, periodStart: start }, { $set: { periodEnd: end, activeUsers, activeInterns, departments, assignments, storageBytes: storage[0]?.bytes ?? 0 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  return doc
}

export async function assertUserCapacity(organizationId: string | null, addingIntern: boolean, excludeUserId?: string) {
  if (!organizationId) return
  const overview = await getBillingOverview(organizationId)
  const previous = excludeUserId ? await User.findOne({ _id: excludeUserId, organizationId, status: "active" }) : null
  if (overview.usage.activeUsers - (previous ? 1 : 0) >= overview.plan.limits.activeUsers || (addingIntern && overview.usage.activeInterns - (previous?.role === "intern" ? 1 : 0) >= overview.plan.limits.activeInterns)) throw new AppError(422, "USAGE_LIMIT_REACHED", "Your plan limit has been reached. Upgrade the workspace to add another active account.")
}

export async function assertStorageCapacity(organizationId: string | null, bytes: number) {
  if (!organizationId) return
  const overview = await getBillingOverview(organizationId)
  if (overview.usage.storageBytes + bytes > overview.plan.limits.storageBytes) throw new AppError(413, "USAGE_LIMIT_REACHED", "Your plan storage limit has been reached. Upgrade the workspace or remove older files.")
}

function presentUsage(usage: OrganizationUsageShapeLike) { return { periodStart: usage.periodStart.toISOString(), periodEnd: usage.periodEnd.toISOString(), activeUsers: usage.activeUsers, activeInterns: usage.activeInterns, departments: usage.departments, assignments: usage.assignments, storageBytes: usage.storageBytes, apiRequests: usage.apiRequests } }
type OrganizationUsageShapeLike = { periodStart: Date; periodEnd: Date; activeUsers: number; activeInterns: number; departments: number; assignments: number; storageBytes: number; apiRequests: number }

export async function getBillingOverview(organizationId: string) {
  const organization = await Organization.findById(oid(organizationId)); if (!organization) throw notFound("That organization was not found.")
  const subscription = await OrganizationSubscription.findOne({ organizationId: organization._id }); const usage = await refreshUsage(organizationId)
  const plan = planFor(subscription?.planCode ?? organization.planCode)
  const env = getEnv()
  return { plan: { code: subscription?.planCode ?? organization.planCode, name: plan.name, monthlyAmountMinor: plan.monthlyAmountMinor, limits: plan.limits }, subscription: subscription ? { status: subscription.status, provider: subscription.provider, requestedPlanCode: subscription.requestedPlanCode, currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null, currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd } : null, usage: presentUsage(usage), selfService: { checkoutAvailable: Boolean(env.stripeSecretKey && env.stripeWebhookSecret && env.stripeStarterPriceId && env.stripeGrowthPriceId), portalAvailable: Boolean(env.stripeSecretKey && subscription?.providerCustomerId) } }
}

export async function listInvoices(organizationId: string) { return (await Invoice.find({ organizationId: oid(organizationId) }).sort({ createdAt: -1 }).limit(100)).map((item) => ({ id: item._id.toString(), number: item.number, status: item.status, amountMinor: item.amountMinor, currency: item.currency, dueAt: item.dueAt?.toISOString() ?? null, paidAt: item.paidAt?.toISOString() ?? null, hostedInvoiceUrl: item.hostedInvoiceUrl, invoicePdfUrl: item.invoicePdfUrl, lineItems: item.lineItems, createdAt: item.createdAt.toISOString() })) }

export async function createInvoice(organizationId: string, input: { number: string; amountMinor: number; currency: string; dueAt?: string; lineItems?: { description: string; quantity: number; unitAmountMinor: number }[] }) {
  const id = oid(organizationId); if (!(await Organization.exists({ _id: id }))) throw notFound("That organization was not found.")
  const lines = (input.lineItems ?? []).map((line) => ({ ...line, amountMinor: line.quantity * line.unitAmountMinor }))
  const amountMinor = input.amountMinor
  if (!Number.isSafeInteger(amountMinor) || lines.some((line) => !Number.isSafeInteger(line.amountMinor)) || (lines.length && lines.reduce((sum, line) => sum + line.amountMinor, 0) !== amountMinor)) throw new AppError(422, "INVOICE_TOTAL_MISMATCH", "Invoice total must equal its line items in minor currency units.")
  return Invoice.create({ organizationId: id, number: input.number, amountMinor, currency: input.currency, dueAt: input.dueAt ? new Date(input.dueAt) : null, lineItems: lines, status: "open" })
}

export async function updateInvoiceStatus(organizationId: string, invoiceId: string, status: InvoiceStatus) {
  const invoice = await Invoice.findOne({ _id: invoiceId, organizationId: oid(organizationId) }); if (!invoice) throw notFound("That invoice was not found.")
  if (invoice.providerInvoiceId) throw new AppError(409, "PROVIDER_MANAGED_INVOICE", "Manage this invoice through the billing provider.")
  if (invoice.status === status) return invoice
  if (invoice.status === "paid" || invoice.status === "void" || status === "draft") throw new AppError(409, "INVALID_INVOICE_TRANSITION", "This invoice cannot move to that status.")
  invoice.status = status; invoice.paidAt = status === "paid" ? new Date() : null; await invoice.save(); return invoice
}

export async function changeCustomerPlan(organizationId: string, input: { planCode: "starter" | "growth" }, actorId: string) {
  return withTenantWriteLock(organizationId, async () => {
    const subscription = await OrganizationSubscription.findOne({ organizationId: oid(organizationId) })
    if (!subscription) throw notFound("This workspace has no subscription.")
    subscription.requestedPlanCode = input.planCode
    await subscription.save()
    await recordActivity({ actorId, action: "billing.plan_requested", entityType: "organization", entityId: organizationId, metadata: { planCode: input.planCode } })
    return { requestedPlanCode: input.planCode, message: "Your plan change request has been recorded. The platform operator will arrange payment and activation." }
  })
}
