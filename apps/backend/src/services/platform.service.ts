import { AppError, notFound } from "../lib/errors.js"
import { getEnv } from "../config/env.js"
import { Organization, type OrganizationStatus } from "../models/organization.js"
import { OrganizationSettings } from "../models/organization-settings.js"
import { OrganizationSubscription, type SubscriptionStatus } from "../models/organization-subscription.js"
import { PlatformAuditLog } from "../models/platform-audit-log.js"
import { User } from "../models/user.js"
import { hashPassword } from "../lib/password.js"
import { planFor } from "./billing.service.js"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function presentOrganization(organization: {
  _id: { toString(): string }
  slug: string
  name: string
  legalName: string
  status: OrganizationStatus
  ownerUserId: { toString(): string } | null
  planCode: string
  trialEndsAt: Date | null
  createdAt: Date
  updatedAt: Date
}, subscription?: { planCode: string; status: SubscriptionStatus; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean }) {
  return {
    id: organization._id.toString(),
    slug: organization.slug,
    name: organization.name,
    legalName: organization.legalName,
    status: organization.status,
    ownerUserId: organization.ownerUserId?.toString() ?? null,
    planCode: organization.planCode,
    trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    subscription: subscription
      ? { planCode: subscription.planCode, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd }
      : null,
  }
}

export async function listOrganizations() {
  const organizations = await Organization.find().sort({ createdAt: -1 }).limit(1000)
  const subscriptions = await OrganizationSubscription.find({ organizationId: { $in: organizations.map((item) => item._id) } })
  const byOrganization = new Map(subscriptions.map((item) => [item.organizationId.toString(), item]))
  return organizations.map((organization) => presentOrganization(organization, byOrganization.get(organization._id.toString())))
}

export async function createOrganization(input: {
  slug: string
  name: string
  legalName?: string
  planCode?: string
  trialDays?: number
  ownerName?: string
  ownerEmail?: string
  ownerPassword?: string
}, platformAdminId?: string) {
  const slug = input.slug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Workspace slug may contain lowercase letters, numbers, and hyphens."
    )
  }
  const existing = await Organization.findOne({ slug })
  if (existing) throw new AppError(409, "CONFLICT", "That workspace slug is already in use.")
  if (input.ownerEmail) {
    const existingOwner = await User.findOne({ email: input.ownerEmail.toLowerCase() })
    if (existingOwner) throw new AppError(409, "EMAIL_IN_USE", "That owner email is already in use.")
  }
  const trialDays = Math.max(0, Math.min(90, input.trialDays ?? 14))
  const planCode = input.planCode?.trim() || "trial"
  planFor(planCode)
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
  const organization = await Organization.create({
    slug,
    name: input.name.trim(),
    legalName: input.legalName?.trim() ?? "",
    status: "trialing",
    planCode,
    trialEndsAt,
  })
  if (input.ownerEmail && input.ownerName && input.ownerPassword) {
    const owner = await User.create({
      name: input.ownerName,
      email: input.ownerEmail.toLowerCase(),
      passwordHash: await hashPassword(input.ownerPassword),
      role: "admin",
      status: "active",
      organizationId: organization._id,
      createdBy: null,
    })
    organization.ownerUserId = owner._id
    await organization.save()
  }
  await OrganizationSettings.create({
    organizationId: organization._id,
    timezone: getEnv().appTimezone,
    organizationName: organization.name,
    invitationTtlHours: 168,
    aiModel: getEnv().aiModel,
    aiProvider: "auto",
  })
  const subscription = await OrganizationSubscription.create({
    organizationId: organization._id,
    planCode: organization.planCode,
    status: "trialing",
    currentPeriodStart: new Date(),
    currentPeriodEnd: trialEndsAt,
  })
  if (platformAdminId) await PlatformAuditLog.create({ platformAdminId, action: "organization.created", entityType: "organization", entityId: organization._id, metadata: { planCode: organization.planCode } })
  return presentOrganization(organization, subscription)
}

export async function updateOrganizationStatus(
  id: string,
  status: OrganizationStatus,
  platformAdminId?: string
) {
  const organization = await Organization.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  )
  if (!organization) throw notFound("That organization was not found.")
  if (platformAdminId) await PlatformAuditLog.create({ platformAdminId, action: "organization.status_changed", entityType: "organization", entityId: organization._id, metadata: { status } })
  const subscription = await OrganizationSubscription.findOne({ organizationId: organization._id })
  return presentOrganization(organization, subscription ?? undefined)
}

export async function updateOrganizationSubscription(
  id: string,
  input: { planCode: string; status: SubscriptionStatus; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean },
  platformAdminId: string
) {
  const organization = await Organization.findById(id)
  if (!organization) throw notFound("That organization was not found.")
  planFor(input.planCode)
  const subscription = await OrganizationSubscription.findOneAndUpdate(
    { organizationId: organization._id },
    { $set: { planCode: input.planCode, status: input.status, requestedPlanCode: null, ...(input.currentPeriodEnd ? { currentPeriodEnd: new Date(input.currentPeriodEnd) } : {}), ...(input.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd } : {}) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  await Organization.updateOne({ _id: organization._id }, { $set: { planCode: input.planCode, status: input.status === "canceled" ? "closed" : input.status } })
  await PlatformAuditLog.create({ platformAdminId, action: "organization.subscription_changed", entityType: "organization", entityId: organization._id, metadata: { planCode: input.planCode, status: input.status } })
  const current = await Organization.findById(organization._id)
  if (!current) throw notFound("That organization was not found.")
  return presentOrganization(current, subscription)
}

export async function listPlatformAudit() {
  const rows = await PlatformAuditLog.find().sort({ createdAt: -1 }).limit(500)
  return rows.map((row) => ({
    id: row._id.toString(),
    platformAdminId: row.platformAdminId.toString(),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId?.toString() ?? null,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  }))
}
