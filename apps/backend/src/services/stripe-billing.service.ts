import Stripe from "stripe"
import { Types } from "mongoose"

import { getEnv } from "../config/env.js"
import { AppError, notFound } from "../lib/errors.js"
import { BillingEvent } from "../models/billing-event.js"
import { Invoice } from "../models/invoice.js"
import { Organization } from "../models/organization.js"
import { OrganizationSubscription } from "../models/organization-subscription.js"
import { withTenantWriteLock } from "./tenant-lock.service.js"

let testClient: Stripe | null = null
export function setStripeClientForTesting(client: Stripe | null) {
  if (getEnv().nodeEnv !== "test") throw new Error("Billing test adapters require NODE_ENV=test")
  testClient = client
}
function client(): Stripe {
  if (testClient) return testClient
  const env = getEnv()
  if (!env.stripeSecretKey) throw new AppError(503, "BILLING_NOT_CONFIGURED", "Online billing is not configured. Contact the platform operator.")
  return new Stripe(env.stripeSecretKey, { timeout: 10_000, maxNetworkRetries: 1 })
}

function priceFor(plan: "starter" | "growth"): string {
  const env = getEnv(); const price = plan === "starter" ? env.stripeStarterPriceId : env.stripeGrowthPriceId
  if (!price || !env.stripeWebhookSecret) throw new AppError(503, "BILLING_NOT_CONFIGURED", "Online billing is not configured for that plan.")
  return price
}
function objectId(value: string) {
  if (!Types.ObjectId.isValid(value)) throw new AppError(400, "VALIDATION_ERROR", "Use a valid organization id.")
  return new Types.ObjectId(value)
}
function refId(value: string | { id: string } | null | undefined) { return typeof value === "string" ? value : value?.id ?? null }
function billingReturnUrl() { return `${getEnv().staffAppUrl}/admin/billing` }

export async function createCheckoutSession(organizationId: string, plan: "starter" | "growth") {
  const stripe = client(); const price = priceFor(plan)
  return withTenantWriteLock(organizationId, async () => {
    const organization = await Organization.findById(objectId(organizationId))
    const subscription = await OrganizationSubscription.findOne({ organizationId: objectId(organizationId) })
    if (!organization || !subscription) throw notFound("This workspace has no subscription.")
    if (organization.status === "suspended" || organization.status === "closed") throw new AppError(403, "WORKSPACE_INACTIVE", "Contact the platform operator before changing billing for this workspace.")
    if (subscription.providerSubscriptionId) {
      const existing = await stripe.subscriptions.retrieve(subscription.providerSubscriptionId)
      if (existing.status !== "canceled" && existing.status !== "incomplete_expired") throw new AppError(409, "USE_BILLING_PORTAL", "Use Manage billing to change your existing subscription.")
    }
    if (!subscription.providerCustomerId) {
      const customer = await stripe.customers.create({ name: organization.legalName || organization.name, metadata: { organizationId } }, { idempotencyKey: `internity-customer-${organizationId}` })
      subscription.providerCustomerId = customer.id
      await subscription.save()
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription", customer: subscription.providerCustomerId, client_reference_id: organizationId,
      line_items: [{ price, quantity: 1 }], subscription_data: { metadata: { organizationId } }, metadata: { organizationId },
      success_url: `${billingReturnUrl()}?checkout=success`, cancel_url: `${billingReturnUrl()}?checkout=canceled`,
    }, { idempotencyKey: `internity-checkout-${organizationId}-${plan}-${Math.floor(Date.now() / 900_000)}` })
    if (!checkout.url) throw new AppError(502, "BILLING_PROVIDER_ERROR", "The billing provider did not return a checkout link.")
    return { url: checkout.url }
  })
}

export async function createBillingPortal(organizationId: string) {
  const subscription = await OrganizationSubscription.findOne({ organizationId: objectId(organizationId) })
  if (!subscription?.providerCustomerId) throw new AppError(409, "NO_BILLING_CUSTOMER", "Start checkout before managing online billing.")
  const portal = await client().billingPortal.sessions.create({ customer: subscription.providerCustomerId, return_url: billingReturnUrl() })
  return { url: portal.url }
}

/** Read current provider state so retries and out-of-order deliveries converge. */
async function syncSubscription(providerId: string) {
  const remote = await client().subscriptions.retrieve(providerId)
  const customerId = refId(remote.customer)
  const local = await OrganizationSubscription.findOne({ providerCustomerId: customerId })
  if (!local || remote.metadata.organizationId !== local.organizationId.toString()) throw new AppError(409, "BILLING_TENANT_MISMATCH", "Subscription ownership could not be verified.")
  if (local.providerSubscriptionId && local.providerSubscriptionId !== remote.id) {
    const previous = await client().subscriptions.retrieve(local.providerSubscriptionId)
    if (!["canceled", "incomplete_expired"].includes(previous.status)) throw new AppError(409, "MULTIPLE_SUBSCRIPTIONS", "This customer already has an ongoing subscription.")
  }
  const price = remote.items.data[0]?.price.id; const env = getEnv()
  const planCode = price === env.stripeStarterPriceId ? "starter" : price === env.stripeGrowthPriceId ? "growth" : null
  if (!planCode) throw new AppError(409, "UNKNOWN_PRICE", "This subscription uses an unconfigured price.")
  const status = remote.status === "active" ? "active" : remote.status === "trialing" ? "trialing" : ["canceled", "incomplete_expired"].includes(remote.status) ? "canceled" : "past_due"
  const item = remote.items.data[0]
  await OrganizationSubscription.updateOne({ _id: local._id }, { $set: {
    provider: "stripe", providerSubscriptionId: remote.id, planCode, status,
    currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: remote.cancel_at_period_end, requestedPlanCode: null,
  } })
  await Organization.updateOne({ _id: local.organizationId }, { $set: { planCode, status: status === "canceled" ? "closed" : status } })
  return local.organizationId
}

async function syncInvoice(invoiceId: string) {
  const remote = await client().invoices.retrieve(invoiceId)
  const local = await OrganizationSubscription.findOne({ providerCustomerId: refId(remote.customer) })
  if (!local) throw new AppError(409, "BILLING_TENANT_MISMATCH", "Invoice ownership could not be verified.")
  const status = remote.status === "paid" ? "paid" : remote.status === "void" ? "void" : remote.status === "draft" ? "draft" : "open"
  await Invoice.findOneAndUpdate({ providerInvoiceId: remote.id }, { $set: {
    organizationId: local.organizationId, number: remote.number ?? remote.id, status, amountMinor: remote.amount_due, currency: remote.currency,
    dueAt: remote.due_date ? new Date(remote.due_date * 1000) : null,
    paidAt: remote.status_transitions.paid_at ? new Date(remote.status_transitions.paid_at * 1000) : null,
    hostedInvoiceUrl: remote.hosted_invoice_url, invoicePdfUrl: remote.invoice_pdf,
    lineItems: [{ description: remote.description || "Subscription", quantity: 1, unitAmountMinor: remote.amount_due, amountMinor: remote.amount_due }],
  } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  const providerSubscriptionId = refId(remote.parent?.subscription_details?.subscription)
  if (providerSubscriptionId) await syncSubscription(providerSubscriptionId)
  return local.organizationId
}

export async function processStripeWebhook(rawBody: Buffer, signature: string) {
  const env = getEnv()
  if (!env.stripeWebhookSecret) throw new AppError(503, "BILLING_NOT_CONFIGURED", "Billing webhooks are not configured.")
  let event: Stripe.Event
  try { event = client().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret) } catch { throw new AppError(400, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature verification failed.") }
  const customerId = "customer" in event.data.object ? refId(event.data.object.customer as string | { id: string } | null) : null
  const local = customerId ? await OrganizationSubscription.findOne({ providerCustomerId: customerId }) : null
  await BillingEvent.updateOne({ eventId: event.id }, { $setOnInsert: { type: event.type, organizationId: local?.organizationId ?? null } }, { upsert: true }).catch((error: unknown) => {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error
  })
  return withTenantWriteLock(local?.organizationId.toString() ?? null, async () => {
    if (await BillingEvent.exists({ eventId: event.id, processedAt: { $ne: null } })) return { received: true, duplicate: true }
    if (local) {
      if (event.type === "checkout.session.completed") {
        const checkout = event.data.object as Stripe.Checkout.Session
        if (checkout.client_reference_id !== local.organizationId.toString()) throw new AppError(409, "BILLING_TENANT_MISMATCH", "Checkout ownership could not be verified.")
        const providerId = refId(checkout.subscription); if (providerId) await syncSubscription(providerId)
      } else if (event.type.startsWith("customer.subscription.")) {
        await syncSubscription((event.data.object as Stripe.Subscription).id)
      } else if (event.type.startsWith("invoice.")) {
        await syncInvoice((event.data.object as Stripe.Invoice).id)
      }
    }
    await BillingEvent.updateOne({ eventId: event.id }, { $set: { processedAt: new Date() } })
    return { received: true, duplicate: false }
  })
}
