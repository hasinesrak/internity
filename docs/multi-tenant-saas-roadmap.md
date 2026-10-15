# Internity Multi-Organization SaaS Roadmap

This document defines the implementation plan for turning Internity from a single-organization intern-management system into a hosted SaaS product used by multiple companies.

The target product has three security boundaries:

1. **Platform** — Internity's own subscription and customer-management control plane.
2. **Organization** — one customer company and its staff, interns, departments, settings, and records.
3. **Department** — the existing supervisor/instructor/intern scope inside an organization.

The boundary must be enforced by the backend. A workspace selector or a hidden frontend route is not an authorization mechanism.

## Architectural decisions

### 1. Keep three separate application surfaces

The monorepo should contain:

| Surface | Existing/new | Users | Purpose |
|---|---|---|---|
| `apps/web` | Existing | Interns | Intern portal |
| `apps/staff` | Existing | Organization admin, HR, supervisor, instructor | Company operations |
| `apps/platform` | New | `platform_admin` users employed by Internity | Companies, plans, subscriptions, usage, support, and platform settings |

The new platform app must not be added as another page group inside `apps/staff`. It has a different trust boundary, navigation, session, API surface, deployment, and audit policy.

Use the same shared UI package and the same backend image, but run a third backend process with `API_SURFACE=platform`:

```text
apps/web      -> backend-public   -> public + intern routes
apps/staff    -> backend-staff    -> organization staff routes
apps/platform -> backend-platform -> platform admin routes only
```

`apps/backend/src/app.ts` currently knows only `public` and `staff`; the first platform change is to add the third surface and ensure platform routes are absent from the other two processes.

### 2. Use a shared database with explicit organization ownership

For the first SaaS release, keep one MongoDB database and shared collections. Add a required `organizationId` to every customer-owned document and include it in every read, update, delete, aggregate, and file lookup.

This is appropriate while customers have the same data shape and avoids creating a collection for every company. MongoDB's multi-tenant guidance describes this pattern and its trade-off: isolation is logical and must be enforced at the application layer.

Do not create one collection per organization. If an enterprise customer later needs stronger isolation, support a dedicated database/cluster as an explicit enterprise tier.

### 3. Add a platform administrator boundary, not a normal company role

Create a separate `PlatformAdmin` model and use the role name `platform_admin` in platform authentication. Do not add this role to the existing company-role authorization paths.

Use a separate session cookie, for example `internity_platform_session`, and separate platform API routes:

```text
/api/platform/auth/login
/api/platform/auth/logout
/api/platform/me
/api/platform/organizations
/api/platform/organizations/:id
/api/platform/subscriptions
/api/platform/audit
```

This prevents a platform administrator from accidentally entering the company-admin path with broader powers than intended. Platform access should be MFA-protected and every customer-data access should be audited. Support access to customer content should require an explicit, time-limited impersonation/support session rather than a permanent hidden bypass.

### 4. Keep the first customer release to one organization per user

The current `User` model contains the role and department directly, and the email index is globally unique. For the first migration, keep that model and add a required `organizationId`. This preserves the existing service and frontend flows while establishing the tenant boundary.

Design the organization field so a later release can split identity from membership:

```text
UserAccount (identity, email, password)
OrganizationMembership (userId, organizationId, role, departmentId, status)
```

Do not make multi-organization memberships part of the first migration unless a real customer needs them. It would multiply the authorization changes while adding no value for the initial product.

## Target data model

### `Organization`

```text
_id
slug                 unique platform-wide
name
legalName
status               trialing | active | past_due | suspended | closed
ownerUserId          first organization admin
planCode
trialEndsAt
createdAt, updatedAt
```

### `OrganizationSettings`

```text
organizationId       unique
timezone
logo/branding fields
invitationTtlHours
ai provider/model settings
staff access policy
```

Replace the current `PlatformSettings` record with an organization-scoped settings record. Platform-wide defaults belong in environment/configuration or a separate platform-settings document.

### Existing models that need `organizationId`

Add the field to `User`, `Department`, `Invitation`, `ClassSession`, `Assignment`, `Submission`, `VerificationRun`, `Review`, `Attendance`, `InternDocument`, `Upload`, and `ActivityLog`. Any future customer-owned model must include it from its first migration.

Use compound indexes such as:

```text
{ organizationId: 1, status: 1 }
{ organizationId: 1, departmentId: 1 }
{ organizationId: 1, createdAt: -1 }
```

Change global uniqueness to tenant uniqueness where appropriate. For example, department name should be unique by `{ organizationId, normalizedName }`, not globally. Keep `Organization.slug` globally unique.

### `OrganizationSubscription`

```text
organizationId       unique
provider             stripe | manual
providerCustomerId
providerSubscriptionId
planCode
status               trialing | active | past_due | canceled | unpaid | paused
currentPeriodEnd
cancelAtPeriodEnd
seat/internLimit
storageLimitBytes
aiUsageLimit
```

### `BillingEvent`

Store provider event IDs with a unique index so webhook retries are idempotent. Store the raw event metadata needed for support and reconciliation, never payment secrets.

## Backend implementation sequence

### Phase 0 — Product and policy decisions

Define before changing schemas:

- plans and included limits;
- trial length and grace period;
- what happens to data when payment fails or an organization closes;
- who can export/delete a company;
- organization timezone and data-retention policy;
- whether platform staff may view customer content, and how that access is approved and logged;
- the payment provider and legal/tax setup for the company selling the service.

The output is a short product policy document and stable status/plan enums. Do not encode plan behavior as scattered conditionals.

### Phase 1 — Introduce tenant context and schemas

1. Add `Organization`, `OrganizationSettings`, `PlatformAdmin`, `OrganizationSubscription`, and `BillingEvent` models.
2. Add `organizationId` to the existing customer-owned models.
3. Add `organizationId` to `SessionUser` and derive it from the authenticated user record.
4. Add a tenant middleware after authentication that verifies the user is active and has an organization.
5. Add a small query helper/pattern requiring an organization filter; avoid accepting an organization ID from request bodies as authority.
6. Update serializers, validators, activity records, upload paths, and CLI verification records.
7. Change indexes and uniqueness constraints after the migration has populated all records.

The invariant for this phase is: a normal company request has exactly one verified organization context, or fails closed.

### Phase 2 — Scope every existing service and route

Update every service under `apps/backend/src/services` and every route under `apps/backend/src/routes` so queries include the organization context. Pay special attention to:

- admin and HR directory/summary queries;
- department assignment and supervisor checks;
- invitation acceptance and password reset links;
- assignment/submission/review access by ID;
- attendance grids;
- CV and upload metadata plus the filesystem/object-storage key;
- CLI bearer-token verification and run persistence;
- AI drafting/review context and sandbox evidence;
- activity logs and aggregate counts.

The server must derive organization ownership from the authenticated user and the target record. A supplied `organizationId` may be used as a selector only after membership is verified.

### Phase 3 — Migrate the current installation

Create an explicit migration script, separate from the seed script:

1. Back up MongoDB and upload storage.
2. Create the first organization from the existing organization name/settings.
3. Assign all existing users and customer-owned records to it.
4. Convert the current `PlatformSettings` document into `OrganizationSettings`.
5. Move uploads into an organization-prefixed path such as `organizations/<orgId>/...`.
6. Add and validate the new indexes.
7. Refuse startup or fail the migration if any customer-owned record is missing an organization.
8. Keep a rollback snapshot and a migration report with counts per collection.

The application should remain single-organization compatible until this migration has completed successfully in staging.

### Phase 4 — Build the platform API and application

Add `apps/platform` as a TanStack Start app, following the conventions in `apps/staff`:

- platform sign-in and MFA challenge;
- overview dashboard: organizations, active trials, paid accounts, past-due accounts, and usage;
- organization list/search/filter;
- organization detail: status, plan, owner, users, usage, subscription, audit history;
- create/suspend/reactivate/close organization;
- plan and limit management;
- subscription status and billing-event history;
- platform-admin management;
- support session/impersonation with reason, expiry, banner, and audit trail;
- platform settings and operational health.

Add platform API services and routes under a separate namespace. Platform endpoints may query across organizations, but only after platform authorization and with clear audit records. Never reuse organization-admin service functions without an explicit platform authorization wrapper.

Update `apps/platform/src/router.tsx`, generated route tree, API client, auth guards, Dockerfile, and production server. Add a platform entry to the root scripts and workspace automatically via the existing `apps/*` pattern.

### Phase 5 — Customer onboarding and organization administration

Implement the customer flow:

1. A visitor starts a trial or checkout.
2. The service creates an organization in `trialing` state.
3. The first owner becomes the organization `admin`.
4. The owner verifies email and completes organization settings.
5. The owner invites HR, supervisors, instructors, and interns.
6. The staff app uses the organization context for all subsequent requests.

Keep company administration in `apps/staff`; add an organization settings area there for branding, timezone, invitations, plan usage, and billing link. The platform app manages the customer account as a service operator, while the company admin manages its own people and internship program.

### Phase 6 — Subscription and limits

Add a billing service boundary rather than putting provider calls directly in route handlers:

- create checkout/customer-portal sessions;
- receive and verify signed webhooks;
- process subscription created/updated/deleted, invoice paid, and payment failed events;
- make handlers idempotent using `BillingEvent`;
- map provider status to the local subscription status;
- apply a documented grace period for `past_due`;
- gate new invitations, active interns, storage, and AI/sandbox usage in backend services;
- run a periodic reconciliation job against the provider.

Access should be based on the local subscription state updated by verified events, with a safe recovery path if a webhook is delayed. Stripe's subscription documentation recommends handling lifecycle changes and revoking access for canceled/unpaid subscriptions; apply the same principle for the selected provider.

### Phase 7 — Replace the single office-network assumption

The current staff API and staff app use `STAFF_ALLOWED_IPS`. That is useful for one internal deployment but cannot be the SaaS access model for unrelated customer companies.

For hosted SaaS:

- serve staff and intern traffic over HTTPS;
- keep backend route-surface isolation;
- use authenticated sessions and MFA for staff roles;
- rate-limit sign-in and sensitive operations;
- make optional IP allowlisting an organization setting for customers that need it;
- retain network restrictions for the platform API as a separate platform security control.

Do not remove the existing allowlist before the hosted deployment has its replacement controls in place.

### Phase 8 — Verification, pilot, and rollout

Create a staging deployment with at least two organizations and run the full system against realistic data. Pilot with a small number of companies before enabling self-service billing.

Roll out in this order:

1. schema and tenant-context changes behind a feature flag;
2. migrated first organization in staging;
3. cross-tenant security tests and backup/restore drill;
4. platform app for internal operators;
5. manual-plan pilot customers;
6. automated billing and self-service onboarding;
7. enterprise isolation options only when required.

## Required test strategy

The test suite must include fixtures for two organizations, two organization admins, and a platform admin.

Required negative tests include:

- organization A cannot list, read, update, delete, aggregate, or download organization B records;
- an ID from another organization returns the same safe not-found response as an unknown ID;
- a department ID from another organization cannot be used in an invitation or assignment;
- CLI bearer tokens cannot create verification runs in another organization;
- upload paths cannot escape the organization prefix;
- cached or asynchronous work never reuses another organization's context;
- staff/public processes do not expose platform routes;
- company admins cannot call platform endpoints;
- platform support sessions expire and leave an audit record;
- webhook retries do not double-apply a subscription change;
- each plan limit is enforced server-side;
- suspended, past-due, closed, and restored organizations behave as specified.

Add an integration test that boots the public, staff, and platform app surfaces and verifies route absence, not only a `403` response.

## Repository changes by area

```text
apps/
  backend/src/models/organization.ts
  backend/src/models/organization-settings.ts
  backend/src/models/platform-admin.ts
  backend/src/models/organization-subscription.ts
  backend/src/models/billing-event.ts
  backend/src/middleware/tenant.ts
  backend/src/routes/platform-auth.ts
  backend/src/routes/platform.ts
  backend/src/services/platform.service.ts
  backend/src/services/billing.service.ts
  backend/src/scripts/migrate-to-multi-tenant.ts
  platform/                         # new TanStack Start app
    src/routes/
    src/components/
    src/lib/
    Dockerfile
    env.example
docker-compose.yml                  # platform API and platform app
infra/k8s/base/                     # platform deployments/services/ingress
packages/ui/                         # shared components as needed
docs/multi-tenant-saas-roadmap.md    # this plan
```

The existing `.github/workflows/ci.yml` must build, lint, typecheck, test, and publish the new app and platform backend surface before it can be promoted.

## Definition of done for the first SaaS release

The milestone is complete when:

1. two companies can use all current intern-management features from the same deployment;
2. all customer-owned records and files have a verified organization owner;
3. a platform admin can create, suspend, restore, and inspect companies from `apps/platform`;
4. company admins can manage only their own company;
5. platform authentication and company authentication use separate routes and sessions;
6. subscription state and plan limits are enforced by the backend;
7. verified cross-tenant negative tests pass;
8. backups, restore, export, closure, audit, and monitoring procedures are documented and tested;
9. a staged migration can be repeated from a clean database and produces the same result.

The safest implementation order is tenant context and migration first, platform control plane second, customer onboarding third, and billing automation fourth. This lets the platform team operate customer organizations before payment automation is exposed to customers.
