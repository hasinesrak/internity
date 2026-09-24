# Architecture

Project name: **Internity**

Internity is a role-based intern management system. The architecture stays as one backend codebase, one MongoDB database, and two frontends. The backend image runs twice: a public process for interns and a staff process for admin, HR, supervisor, and instructor routes. Docker images stay split by app, and GitOps deployment goes into K3s through Argo CD.

## Architecture Goals

- Keep the project understandable for a small team.
- Keep frontend and backend separated by clear responsibilities.
- Enforce permissions on the backend, not only in the UI.
- Scope department data carefully.
- Make local development work through Docker Compose.
- Make production deployment work through Docker Hub, K3s, and Argo CD.

## High-Level System

```text
Intern browser
  |
  v
apps/web  (any address)
  |
  v
Backend API_SURFACE=public
  |
  v
MongoDB 7.x
  ^
  |
Backend API_SURFACE=staff
  ^
  |
apps/staff  (office address or VPN)
  ^
  |
Staff browser
```

`API_SURFACE=public` registers `/health`, `/api/auth`, `/api/intern`, and `/api/departments`. Staff sign-in and staff activation are refused on that process. `API_SURFACE=staff` registers those routes plus `/api/admin`, `/api/hr`, `/api/supervisor`, and `/api/instructor`. Role checks stay on every mounted route. `STAFF_ALLOWED_IPS` is the office address list. An empty list allows only this computer in development, and production will not start the staff process until the list is set. Staff outside that address use the office VPN. Both processes share `MONGODB_URI` and `JWT_SECRET`. Intern links use `APP_URL`. Staff links use `STAFF_APP_URL`.

Production deployment:

```text
GitHub
  |
  v
GitHub Actions
  |
  v
Docker Hub
  |
  v
Git repository manifests
  |
  v
Argo CD
  |
  v
K3s on Linux VM
```

## Monorepo Structure

The repo is a pnpm workspace (`apps/*`, `packages/*`) driven by Turborepo:

```text
internity/
  apps/
    web/                      # Intern app. Public address.
    staff/                    # Staff app. Office address or VPN.
    backend/                  # One Hono image, started as public or staff.
      src/
        config/
        db/
        middleware/
        models/
        routes/
        services/
        validators/
        lib/
      package.json
      Dockerfile

  packages/
    ui/                       # design system
      src/
        components/           # shadcn + Base UI primitives + installed beUI source
        hooks/
        lib/
        styles/globals.css    # tokens, Manrope, radius scale
      components.json         # shadcn config: base-rhea, neutral base, phosphor icons
      package.json

  infra/
    k8s/
      base/
        frontend/
        backend/
        mongodb/
      overlays/
        production/
    argocd/
    docker/

  docs/
    plan.md
    architecture.md
    design-system.md
    dashboard-design.md
    requirements.md
    deployment.md
    CD.md

  .github/
    workflows/

  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  docker-compose.yml
  README.md
```

## Folder Responsibilities

`apps/web/`

The intern TanStack Start application. It calls the public API. Screen composition for intern routes follows `docs/dashboard-design.md`.

`apps/staff/`

The staff TanStack Start application for admin, HR, supervisor, and instructor screens. It calls the staff API and is published only on the office address or VPN. It uses the same `packages/ui` exports.

`apps/backend/`

The Hono API. It owns authentication, authorization, request validation, department scoping, database access, business logic, and secure API responses.

`packages/ui/`

The design system: shadcn-style components on Base UI primitives, the token set in `src/styles/globals.css`, shared hooks and helpers, and beUI components installed as source. Consumed by `apps/web` and `apps/staff` through the `@workspace/ui/*` exports. Defined in `docs/design-system.md`.

`packages/shared/`

Optional shared package for types, constants, and validation contracts used by both frontend and backend. Add this only when duplication appears.

`infra/k8s/`

Kubernetes manifests for Deployments, Services, ConfigMaps, Secrets references, Ingress, and MongoDB if MongoDB is deployed inside the cluster.

`infra/argocd/`

Argo CD Application definitions for syncing Kubernetes manifests to K3s.

`.github/workflows/`

GitHub Actions workflows for validation, Docker builds, Docker Hub pushes, and GitOps manifest updates.

## Frontend Architecture

Intern screens live in `apps/web`. Admin, HR, supervisor, and instructor screens live in `apps/staff`.

Frontend responsibilities:

- login and account activation screens
- the shared dashboard shell (topbar, ai-sidebar navigation, content template)
- route-level auth guards
- role-specific navigation trees
- Admin screens
- HR screens
- Supervisor screens
- Instructor screens
- Intern screens
- API client layer
- form validation UI
- loading, empty, error, and success states

### Dashboard shell

One shell wraps every signed-in route. Its structure, the `@beui/ai-sidebar` navigation with the approved tweaks, and the per-role layouts are specified in `docs/dashboard-design.md`:

- topbar: department switcher, ⌘K command menu (`@beui/command-palette`), theme toggle (`@beui/theme-toggle`), user menu
- sidebar: `@beui/ai-sidebar` as a navigation tree with Phosphor duotone icons; a 64px icon rail when collapsed; a `@beui/bottom-sheet` below 768px
- content: page header, KPI row (`@beui/animated-number` values), panels (`@beui/table`, lists, editors)
- detail surfaces: `@beui/drawer` desktop, `@beui/bottom-sheet` mobile
- feedback: `@beui/animated-toast-stack`

Client state that is pure UI (sidebar collapse, open drawer, table filters) lives in Zustand stores in `apps/web/src/stores/`. Route data comes from TanStack Router loaders calling the API client. The sidebar nav is a controlled list: `activeId` derives from the router location and `onActiveChange` navigates.

### Routes

Public:

- `/login`
- `/activate`

Inside the dashboard shell:

- `/dashboard` — role home with the KPI row
- `/admin/users`, `/admin/hr`, `/admin/departments`, `/admin/activity`
- `/hr/departments`, `/hr/invitations`, `/hr/invitations/new`, `/hr/directory`
- `/supervisor/instructors`, `/supervisor/drafts`
- `/classes`, `/classes/new`
- `/assignments`, `/assignments/new`, `/assignments/:id`
- `/submissions`, `/submissions/:id` (review drawer)
- `/settings`
- `*` — `@beui/not-found-glitch`

The frontend should hide unavailable routes based on role, but that is only for user experience. The backend must still enforce every permission.

## Backend Architecture

Backend responsibilities:

- JWT session issuing and verification
- password hashing
- invitation token generation and expiration
- role permission checks
- department-scope checks
- MongoDB access through Mongoose
- class scheduling APIs
- assignment APIs
- submission APIs
- review APIs
- consistent error handling
- audit-friendly activity logging

Recommended route groups:

- `/health`
- `/auth`
- `/admin`
- `/hr`
- `/supervisor`
- `/instructor`
- `/instructor/ai` — assignment and class-agenda drafting (supervisors included)
- `/intern`
- `/departments`
- `/classes`
- `/assignments`
- `/submissions`

## Core Domain Models

Recommended first data models:

- User
- Department
- Invitation
- ClassSession
- Assignment
- Submission
- Review
- ActivityLog

Possible user fields:

- name
- email
- password hash
- role
- status
- department ID
- created by
- last login

Possible department fields:

- name
- description
- supervisor ID
- status

Possible invitation fields:

- email
- department ID
- role
- token hash
- expires at
- accepted at
- invited by

Possible class session fields:

- department ID
- title
- agenda
- meeting URL
- scheduled start
- scheduled end
- created by

Possible assignment fields:

- department ID
- title
- instructions
- rubric
- deadline
- created by
- status

Possible submission fields:

- assignment ID
- intern ID
- submission URL
- notes
- submitted at
- status
- score
- feedback
- reviewed by
- reviewed at

## Role And Permission Boundaries

Admin:

- full user oversight
- HR account management
- global department override
- system-level configuration
- global password reset and access revocation

HR:

- department creation and archive
- supervisor assignment
- instructor department assignment
- intern email invitations
- organization directory visibility

Supervisor:

- instructor roster management inside own department
- instructor-level actions inside own department
- view department interns, classes, assignments, and submissions

Instructor:

- schedule class sessions inside assigned department
- create and manage assignments inside assigned department
- review intern submissions inside assigned department

Intern:

- activate account from invitation
- view own department dashboard
- view classes and assignments
- submit external links
- view own feedback and scores

## Access Control Rules

The backend must enforce:

- active user status
- valid JWT
- valid role
- department ownership or membership
- resource-level department match
- submission owner checks for interns

Frontend guards are helpful, but they are not security controls.

## Authentication Strategy

Use JWT-based stateless sessions.

Recommended storage:

- use secure, HTTP-only cookies for browser sessions
- avoid storing long-lived JWTs in local storage
- use short token lifetimes
- add refresh strategy later only if needed

Invitation activation flow:

1. HR enters intern email and department.
2. Backend creates expiring invitation token.
3. Backend emails activation link.
4. Intern opens link.
5. Intern sets password.
6. Backend marks invitation accepted.
7. Intern account becomes active.

## Database Strategy

Use MongoDB 7.x with Mongoose.

Local development:

- MongoDB runs in Docker Compose.

Production options:

- recommended: external managed MongoDB if available
- acceptable for learning/MVP: MongoDB StatefulSet inside K3s with persistent volume and backup plan

If MongoDB runs inside K3s, backups are not optional. Document backup and restore before trusting production data.

## UI Component Strategy

The design foundation is beUI components composed with shadcn-style components on Base UI primitives. Both live in `packages/ui` and both use the same shadcn semantic color tokens, so the whole app shares one theme. The full inventory, tokens, icons, and motion rules are in `docs/design-system.md`; screen-level composition is in `docs/dashboard-design.md`.

Layering:

- Base UI (`@base-ui/react`) + shadcn-style components: form fields, buttons, cards, tabs structure, dialogs, text areas, calendars
- beUI (`@beui/*`, installed as source): motion components and composed dashboard blocks
- `apps/web` composition: shell, page templates, role screens

Dashboard surface mapping:

| Surface | beUI install slug |
| --- | --- |
| Dashboard navigation | `@beui/ai-sidebar` (adapted) |
| Command menu | `@beui/command-palette` |
| Data tables | `@beui/table`, `@beui/table-async` |
| Status badges | `@beui/animated-badge` |
| KPI values | `@beui/animated-number` |
| Detail drawer / bottom sheet | `@beui/drawer`, `@beui/bottom-sheet` |
| Modals | `@beui/morphing-modal`, `@beui/center-morph-modal` |
| Tabs | `@beui/tabs` |
| Toasts | `@beui/animated-toast-stack` |
| Tooltip | `@beui/tooltip` |
| Row actions | `@beui/context-menu`, `@beui/overflow-actions` |
| Forms | `@beui/input`, `@beui/select`, `@beui/combobox`, `@beui/checkbox`, `@beui/radio`, `@beui/switch`, `@beui/adaptive-stepper` |
| Buttons | `@beui/button-base`, `@beui/button-stateful`, `@beui/hold-action-button` |
| AI draft surfaces | `@beui/agent-activity`, `@beui/thinking-shimmer`, `@beui/todo-list`, `@beui/approval-card` |
| Loading | `@beui/loader` |
| Theme toggle | `@beui/theme-toggle` |
| 404 | `@beui/not-found-glitch` |

Install mechanics: slugs come from the live registry (`https://beui.dev/r/registry.json`), are added with `pnpm dlx shadcn@latest add @beui/<slug>` from `packages/ui`, and land as source under `@workspace/ui/*`. Their lucide icon imports are replaced with Phosphor duotone in one reviewed pass and `lucide-react` is dropped. No beUI runtime package exists and no beUI-specific color variables are introduced.

Role-specific UX:

- Admin: global roster tables, system status cards, platform activity
- HR: department table, invitation flow, staff directory
- Supervisor: instructor roster and department activity
- Instructor: class scheduler, assignment editor with AI draft, submission review drawer
- Intern: upcoming classes, assignment list, submission form, feedback view

## Deployment Architecture

Kubernetes workload plan:

- intern frontend Deployment and Service
- staff frontend Deployment and Service, ingress limited to the office range
- public backend Deployment (`API_SURFACE=public`) and Service
- staff backend Deployment (`API_SURFACE=staff`) and Service, same image, ingress limited to the office range
- MongoDB StatefulSet if self-hosted
- ConfigMaps for non-sensitive config
- Secrets for sensitive config
- Ingress for public traffic

Argo CD application plan:

- one Argo CD app for the intern frontend and one for the staff frontend
- one Argo CD app for the two backend processes
- one optional Argo CD app for MongoDB and shared infrastructure

## Important Decisions

Decision 1: Use a monorepo first.

Reason: It is easier to learn, easier to run locally, and easier to coordinate frontend/backend changes.

Decision 2: Use GitHub Actions for builds, not direct deployment.

Reason: Argo CD should own cluster deployment. GitHub Actions should build and publish images.

Decision 3: Keep intern submissions as external links.

Reason: Avoids file storage complexity in the MVP.

Decision 4: Backend authorization is the source of truth.

Reason: UI route guards can be bypassed, but backend permission checks protect the data.

Decision 5: beUI components are the design foundation, with shadcn components on Base UI primitives underneath.

Reason: beUI source uses shadcn semantic tokens, so motion blocks and primitives share one theme with no adapter layer. Installing source through the shadcn registry keeps every component editable in `packages/ui`.

Decision 6: The dashboard navigation is beUI's `ai-sidebar`, adapted rather than replaced.

Reason: it already provides the tree keyboard model, overflow-safe labels, a row menu, and a collapsed-state hook. The approved tweaks are Phosphor icons through `renderIcon`, a navigation row menu through `renderMenu`, and dropping the move/rename callbacks. Everything else is composed around it.

Decision 7: Phosphor Icons at the duotone weight is the only icon set.

Reason: one icon language across beUI source and app screens keeps optical weight consistent; state changes recolor the same icon instead of swapping assets.

Decision 8: Run one backend image as two processes.

Reason: The public process does not register admin, HR, supervisor, or instructor routes, so those URLs are absent from the intern address. The staff process registers every route and keeps the role checks and `STAFF_ALLOWED_IPS` gate. Both processes use one database and one session secret. A second frontend puts staff pages on the restricted address. The route split, not the second frontend, is what keeps staff APIs off the public address.
