# Internity — Intern Management System

Internity is a role-based intern management platform for onboarding interns, organizing departments, scheduling classes, publishing assignments, collecting submissions, and reviewing intern work.

One monorepo contains the full system: an **intern web app** (`apps/web`), a **staff web app** (`apps/staff`), a shared **design system** (`packages/ui`), and a single **API codebase** (`apps/backend`) that runs as two isolated surfaces (public + staff) against one MongoDB database.

**Roles:** Admin · HR · Supervisor · Instructor · Intern

---

## Table of Contents

1. [Features](#1-features)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Repository Structure](#4-repository-structure)
5. [Prerequisites](#5-prerequisites)
6. [Run Locally](#6-run-locally)
7. [Environment Variables](#7-environment-variables)
8. [Seed Data and Admin Account](#8-seed-data-and-admin-account)
9. [Scripts Reference](#9-scripts-reference)
10. [Linting and Typechecking](#10-linting-and-typechecking)
11. [Security Model](#11-security-model)
12. [Troubleshooting](#12-troubleshooting)
13. [Deployment Overview](#13-deployment-overview)
14. [Further Documentation](#14-further-documentation)

---

## 1. Features

- **Role-based access** — Admin, HR, Supervisor, Instructor, and Intern, enforced on the backend.
- **Department management** — Create/archive departments, assign supervisors and instructors.
- **Invitation onboarding** — HR invites interns by email; interns activate via expiring token link.
- **Class scheduling** — Instructors and supervisors schedule classes with external meeting links, a calendar view, cancellation/restore controls, and automatic intern email notices for new or changed sessions.
- **Assignments and submissions** — Publish assignments, collect external submission links, review with score + feedback.
- **Optional CLI verification** — Instructors can leave checks off, write them manually, or ask AI to recommend bounded setup checks for technical assignments. Interns see clear instructions, run locally with `@internity/cli`, and the API stores the structured verification run for staff review.
- **AI drafting assistance** — Supervisors and instructors can draft assignment text, rubrics, and class agendas via the Vercel AI Gateway (optional, backend-only).
- **Automated assignment review** — Instructors and supervisors can use the AI review command from a submission drawer. A public repository is cloned into a disposable Railway Sandbox, bounded tests and source evidence are inspected, and the AI returns an editable review draft. A staff member must still save the score and feedback.
- **Department scoping** — Supervisors and instructors operate strictly inside their assigned department.
- **Activity logging** — Admin-visible audit trail of key actions.
- **Attendance monitoring** — Interns mark their own daily attendance; supervisors can correct attendance for their department and review a weekly/monthly calendar grid.
- **Intern CV records** — HR can upload or replace an intern CV, while authorized supervisors can view it from the intern profile.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Intern frontend (`apps/web`) | TanStack Start, TanStack Router, React 19, Tailwind CSS v4, Zustand |
| Staff frontend (`apps/staff`) | TanStack Start, TanStack Router, React 19, Tailwind CSS v4, Zustand |
| Shared UI (`packages/ui`) | shadcn-style components on Base UI primitives, beUI motion blocks (installed as source), Phosphor Icons (duotone), Manrope |
| Backend (`apps/backend`) | Hono.js, TypeScript, Mongoose, Zod, `jose` (JWT), `bcryptjs` |
| AI features (optional) | Vercel AI Gateway + Vercel AI SDK (`ai`), default model `deepseek/deepseek-v4.1-flash` |
| Database | MongoDB 7.x |
| Local runtime | Docker + Docker Compose |
| Production | Docker Hub → GitHub Actions → Argo CD → K3s |

Package manager is **pnpm** (`10.33.4`). Node `>= 20` is required. Dependency versions are held one week behind release (`minimumReleaseAge` in `pnpm-workspace.yaml`) to reduce supply-chain risk.

---

## 3. Architecture

### 3.1 High-level request flow

```text
Intern browser ──► apps/web (:3000) ──► Backend API_SURFACE=public (:4000) ──┐
                                                                              ├─► MongoDB 7.x (:27017)
Staff browser ──► apps/staff (:3001) ──► Backend API_SURFACE=staff (:4001) ───┘
                        (office IP or VPN only)
```

There are **two frontends and two API processes**, but **one backend image and one database**:

- `apps/web` (intern site) talks only to the **public API**. Reachable from any address.
- `apps/staff` (staff site) talks only to the **staff API**. Published on loopback and gated by `STAFF_ALLOWED_IPS`.
- Both API processes share `MONGODB_URI` and `JWT_SECRET`. Session cookie (`internity_session`) works against both.

### 3.2 Dual-surface backend (the core isolation mechanism)

`apps/backend/src/app.ts:createApp` selects routes by `API_SURFACE`:

| Surface | `API_SURFACE` | Registered routes | Purpose |
|---|---|---|---|
| Public | `public` | `GET /health`, `/api/auth` (intern only), `/api/intern`, `/api/departments` (read) | Intern traffic. Staff routes are **not registered** — the URLs do not exist here. Staff sign-in is refused. |
| Staff | `staff` | Everything above **plus** `/api/admin`, `/api/hr`, `/api/supervisor`, `/api/instructor` | All staff operations. Staff sign-in requires the client IP to be in `STAFF_ALLOWED_IPS`. |

Isolation is by **route absence**, not just role checks: an attacker on the public address cannot reach staff handlers because they are never mounted. Role and department checks still run on every mounted route as defense in depth (`apps/backend/src/app.ts:51-72`).

Route groups (`apps/backend/src/routes/`):

- `/health` — liveness (`GET /health`) and readiness (`GET /health/ready`)
- `/api/auth` — sign-in/out, activation, password reset
- `/api/admin` — users, HR accounts, departments override, settings, activity log
- `/api/hr` — departments, supervisor assignment, invitations, directory
- `/api/supervisor` — instructor roster within own department (+ instructor-level actions there)
- `/api/instructor` — classes (including cancel/restore), assignments, submission review; `POST /api/instructor/ai/*` drafting endpoints and `POST /api/instructor/submissions/:id/ai-review` for human-approved automated review drafts
- `/api/intern` — own department view, classes/assignments, submission links, feedback
- `/api/cli` — Bearer-authenticated verification manifest and run endpoints for `@internity/cli`
- `/api/attendance` — date-keyed self attendance and supervisor-scoped attendance grids
- `/api/documents` — HR CV upload plus department-scoped intern document/profile reads
- `/api/departments` — department reads

### 3.3 Backend layering

```text
apps/backend/src/
  config/       env loading and validation (all behavior is env-driven)
  db/           Mongoose connection lifecycle
  middleware/   auth (JWT verify), requireRole, department scope, error handler,
                client-IP extraction, rate limiting
  models/       Mongoose schemas: User, Department, Invitation,
                ClassSession, Assignment, Submission, VerificationRun, Review, ActivityLog
  routes/       one module per group above; thin handlers
  services/     business logic (invitations, mail, AI drafting)
  validators/   Zod request/response contracts
  lib/          shared helpers (IP matching, rate-limit store, Groq client)
```

Key design decisions:

- **Stateless JWT sessions** in a secure, HTTP-only cookie (`internity_session`). No long-lived tokens in `localStorage`. Short lifetime (`JWT_EXPIRES_IN`, default `8h`).
- **Backend is the authorization source of truth.** Frontend route guards exist for UX only; every permission (active status, valid JWT, role, department membership, resource-department match, intern submission ownership) is re-checked server-side.
- **Department scoping** is enforced in middleware + service queries, so supervisors/instructors cannot cross into other departments even with valid IDs.
- **AI features are assistive, not authoritative.** The backend loads department context itself (never trusts a department ID from the browser), calls Vercel AI Gateway with a Zod-validated `Output.object` schema, and returns an editable draft or scoped Copilot response. Automated repository review creates a temporary `ssh railway.new` VM, runs the preinstalled OpenCode agent plus bounded checks, and sends only capped evidence to the AI Gateway. Nothing is persisted until the user submits the normal create/update action. An empty `AI_GATEWAY_API_KEY` disables AI features; the rest of the API keeps running.

### 3.4 Frontend architecture

Both apps are TanStack Start applications sharing one design system:

- **Shell:** one dashboard shell per role — topbar (department switcher, ⌘K command menu, theme toggle, user menu), left navigation (`@beui/ai-sidebar` adapted with Phosphor duotone icons; icon rail when collapsed; bottom-sheet under 768 px), content template (page header → KPI row → panels), drawers/bottom-sheets for detail, toast stack for feedback.
- **Data:** route loaders call the API client; pure UI state (sidebar, drawers, table filters) lives in Zustand stores. No business rules live in the client.
- **Design system (`packages/ui`):** shadcn-style components on Base UI primitives for forms/buttons/dialogs, beUI source blocks for motion and composed surfaces (tables, badges, KPI numbers, drawers, modals, toasts). Both apps import through `@workspace/ui/*` and share one theme (shadcn semantic tokens, Manrope).

### 3.5 Data model (simplified)

```text
Department 1──* User (role, status, departmentId)
Department 1──* Invitation (email, role, tokenHash, expiresAt)
Department 1──* ClassSession (title, agenda, meetingUrl, schedule, status)
Department 1──* Assignment (title, instructions, rubric, deadline, status)
Assignment 1──* Submission (internId, url, notes, status, score, feedback)
User *──* ActivityLog (who, what, when)
```

Submissions are **external links + notes** (no file hosting in MVP).

---

## 4. Repository Structure

```text
internity/
  apps/
    web/            # Intern TanStack Start app (public)
    staff/          # Staff TanStack Start app (office/VPN)
    backend/        # Hono API — one image, API_SURFACE=public|staff
      src/          # config, db, middleware, models, routes, services, validators, lib
      Dockerfile
      env.example
  packages/
    ui/             # Design system (shadcn + Base UI + beUI source)
  infra/
    k8s/            # base + overlays/production manifests
    argocd/         # Argo CD Application definitions
  docs/             # Argo CD quick start and VM operations
  .github/workflows/# validation + Docker build/publish
  docker-compose.yml# mongo + 2 APIs + 2 sites (local)
  env.example       # root compose env template
  turbo.json        # Turborepo task graph
  pnpm-workspace.yaml
```

---

## 5. Prerequisites

- **Node.js** `>= 20`
- **pnpm** `10.33.4` (`corepack enable && corepack prepare pnpm@10.33.4 --activate`)
- **Docker + Docker Compose** (for the recommended full-stack run)
- **Local MongoDB optional** — only needed for the manual (non-Docker) path; Compose provides `mongo:7.0` automatically.
- Optional: `RESEND_API_KEY` (real invitation emails), `AI_GATEWAY_API_KEY` (AI Gateway models). Both can stay empty for local development.

Verify:

```powershell
node --version; pnpm --version; docker --version; docker compose version
```

```bash
node --version && pnpm --version && docker --version && docker compose version
```

---

## 6. Run Locally

Two supported paths. **Option A (Docker Compose)** is recommended — it starts MongoDB, both APIs, and both sites with correct wiring. **Option B (manual)** is for frontend/backend iteration with hot reload.

### Option A — Full stack via Docker Compose (recommended)

```powershell
# 1. Root env (ports, URLs, secrets)
copy env.example .env

# 2. Build and start everything in the background
docker compose up -d --build

# 3. Install deps and seed the admin account (first run only)
pnpm install
pnpm --filter backend seed
```

```bash
# 1. Root env
cp env.example .env

# 2. Build and start everything
docker compose up -d --build

# 3. Install deps and seed the admin account (first run only)
pnpm install
pnpm --filter backend seed
```

Open:

| Service | URL | Notes |
|---|---|---|
| Intern site | http://localhost:3000 | Sign in as intern |
| Staff site | http://localhost:3001 | Sign in as admin/HR/supervisor/instructor |
| Public API | http://localhost:4000 | `GET /health`, `GET /health/ready` |
| Staff API | http://localhost:4001 | Staff routes live here only |
| MongoDB | mongodb://127.0.0.1:27017/internity | Data volume `internity_mongo` |

Useful Compose commands:

```powershell
docker compose ps
docker compose logs -f backend-public backend-staff
docker compose down        # stop (keep data)
docker compose down -v     # stop and delete DB data
```

> Compose sets `STAFF_ALLOW_PRIVATE=true` so staff sign-in works from your machine through the Docker bridge. Never set `STAFF_ALLOW_PRIVATE` in production.

### Open the app from another computer on the same network

The computer running Docker is the server. Give it a LAN address and use that
address everywhere the browser needs to connect. In the root `.env`, set the
following values (replace `192.168.1.25` with the server's IPv4 address):

```dotenv
APP_HOST=192.168.1.25
WEB_HOST=0.0.0.0
STAFF_HOST=0.0.0.0
PUBLIC_API_BIND=0.0.0.0
STAFF_API_BIND=0.0.0.0
PUBLIC_CORS_ORIGIN=
STAFF_CORS_ORIGIN=
APP_URL=
STAFF_APP_URL=
VITE_PUBLIC_API_URL=
VITE_STAFF_API_URL=
STAFF_ALLOWED_IPS=
STAFF_ALLOW_PRIVATE=true
```

The empty URL values let Compose derive `http://192.168.1.25` for the sites,
APIs, CORS, and bootstrap links. Rebuild after changing them because the
`VITE_*_API_URL` values are embedded in the frontend bundle:

```powershell
docker compose up -d --build
```

Open `http://192.168.1.25:3000` for the intern site and
`http://192.168.1.25:3001` for the staff and admin site. Both computers must be
on the same LAN (or connected through the office VPN). If the server's firewall
blocks the ports, allow TCP `3000,3001,4000,4001`. On Windows, run this in an
elevated PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Internity LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000,3001,4000,4001 -Profile Private
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before the first startup, then
run the seed command shown above. The staff gate allows private LAN addresses
in this Compose setup; use a VPN or a production reverse proxy instead of
exposing the staff ports directly to the public internet.

### Option B — Manual dev with hot reload

Run MongoDB (via Compose's mongo service or your own), then each app in its own terminal:

```powershell
# Terminal 1 — MongoDB only
docker compose up -d mongo

# Terminal 2 — backend (defaults to API_SURFACE=staff; see note below)
copy apps\backend\env.example apps\backend\.env
pnpm install
pnpm --filter backend seed
pnpm --filter backend dev

# Terminal 3 — intern site
copy apps\web\env.example apps\web\.env
pnpm --filter web dev      # http://localhost:3000

# Terminal 4 — staff site
copy apps\staff\env.example apps\staff\.env
pnpm --filter staff dev    # http://localhost:3001
```

```bash
docker compose up -d mongo

cp apps/backend/env.example apps/backend/.env
pnpm install
pnpm --filter backend seed
pnpm --filter backend dev

cp apps/web/env.example apps/web/.env
pnpm --filter web dev

cp apps/staff/env.example apps/staff/.env
pnpm --filter staff dev
```

Or start everything at once (after env files exist):

```powershell
pnpm dev
```

**Backend surface note:** `pnpm --filter backend dev` runs a single process defaulting to `API_SURFACE=staff` (reads `PORT`/`HOST` from `apps/backend/.env`). To run the public copy manually, set `API_SURFACE=public` in that file or env. In Compose you get both automatically.

---

## 7. Environment Variables

| File | Purpose | Key values |
|---|---|---|
| `.env` (root) | Docker Compose wiring | `APP_HOST`, `PUBLIC_API_PORT` (4000), `STAFF_API_PORT` (4001), `WEB_PORT` (3000), `STAFF_PORT` (3001), `APP_URL`, `STAFF_APP_URL`, `JWT_SECRET`, `STAFF_ALLOWED_IPS`, `TRUST_PROXY`, `RESEND_API_KEY`, `AI_GATEWAY_API_KEY`, `AI_MODEL`, `AI_FILE_MODEL` (defaults to `google/gemini-3.5-flash-lite` for Copilot attachments), optional `RAILWAY_NEW_SSH_PRIVATE_KEY_B64`/`RAILWAY_NEW_SSH_KEY_PATH`, `ADMIN_*` bootstrap |
| `apps/backend/.env` | Manual `pnpm --filter backend dev` | `HOST`, `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `API_SURFACE=staff\|public`, `JWT_SECRET`, `STAFF_ALLOWED_IPS`, mail + Groq keys |
| `apps/web/.env` | Intern site | `WEB_HOST`, `WEB_PORT`, `VITE_API_URL=http://localhost:4000` (public API) |
| `apps/staff/.env` | Staff site | `STAFF_HOST`, `STAFF_PORT`, `VITE_API_URL=http://localhost:4001` (staff API), `STAFF_ALLOWED_IPS` mirror |

Rules that matter:

- `JWT_SECRET` and `MONGODB_URI` must be identical across both API processes.
- `APP_HOST` is the address other computers use to reach this server. Compose derives `APP_URL`, `STAFF_APP_URL`, CORS origins, and both frontend API URLs from it when those values are blank.
- `APP_URL` builds intern links; `STAFF_APP_URL` builds staff links — keep them aligned with the site ports.
- `STAFF_ALLOWED_IPS` controls which client addresses may use the staff surface. Use `127.0.0.1` for the localhost deployment. **Production staff API refuses to start until it is set.**
- `VITE_API_URL` is baked at build time — the Docker `web`/`staff` images take it from `VITE_PUBLIC_API_URL` / `VITE_STAFF_API_URL` build args.
- Set `TRUST_PROXY=true` only behind a proxy that overwrites `X-Forwarded-For` with the observed client IP.
- Never commit any `.env`. Templates are `env.example` / `apps/*/[env.example]`.

For automated assignment review, the backend runs `ssh railway.new`. Railway's
anonymous VM has OpenCode preinstalled, so the repository is cloned into the VM
and inspected by OpenCode. The backend generates and reuses an ephemeral SSH
key for the process; for a stable local VM across backend restarts, configure
`RAILWAY_NEW_SSH_PRIVATE_KEY_B64` or `RAILWAY_NEW_SSH_KEY_PATH`. The VM is
temporary and expires automatically; no Railway token or AI Gateway key is
passed into it. The backend still sends only capped repository evidence to the
AI Gateway and returns an editable draft.

---

## 8. Seed Data and Admin Account

`pnpm --filter backend seed` creates or updates only the configured admin account from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. It does not create demo HR, supervisor, instructor, or intern accounts. On the staff API's first startup, the same `ADMIN_*` values are used to bootstrap the admin automatically when no active admin exists.

Set `ADMIN_PASSWORD` to a value with at least eight characters, including a letter and a number. Keep the credentials in the VM environment files and never commit them.

---

## 9. Scripts Reference

Root (`package.json`, Turborepo-orchestrated):

| Command | Effect |
|---|---|
| `pnpm dev` | `turbo dev` — all apps in dev mode |
| `pnpm dev:web` / `dev:staff` / `dev:backend` | Single app in dev mode |
| `pnpm build` | Build all apps |
| `pnpm seed` | Seed or update the configured admin account via the backend |
| `pnpm lint` / `typecheck` / `format` | Quality gates across the workspace |

Backend (`pnpm --filter backend <script>`): `dev` (watch), `build` → `dist/`, `start` (`node dist/index.js`), `seed`, `lint`, `typecheck`.

CLI (`pnpm --filter @internity/cli <script>`): `build`, `dev`, `typecheck`, `lint`. After publishing, interns can run `npm install -g @internity/cli`, `internity login`, `internity run <assignment-id>` to practice locally, and `internity verify <assignment-id>` to submit completion from the project folder.

The CLI has its own GitHub Actions workflow at `.github/workflows/cli.yml`.
Pull requests and `master` changes run lint and build. Publishing is explicit:
bump `packages/cli/package.json`,
commit the change, create a matching `cli-v<version>` tag, and push the tag.
The repository must have an `NPM_TOKEN` secret with permission to publish
`@internity/cli`; the workflow publishes with npm provenance enabled.

Frontends (`pnpm --filter web|staff <script>`): `dev`, `build`, `start` (prod server), `preview`, `lint`, `typecheck`.

---

## 10. Linting and Typechecking

```powershell
pnpm typecheck
pnpm lint
```

---

## 11. Security Model

- **HTTP-only session cookie** (`internity_session`); no JWT in `localStorage`.
- **CLI credentials** — The CLI uses a Bearer token returned by the dedicated intern-only CLI login endpoint and stores it in the platform config directory with restrictive permissions. Browser sessions remain cookie-based.
- **Dual-surface isolation** — staff handlers absent from the public process.
- **IP gating** — staff sign-in is restricted to `STAFF_ALLOWED_IPS`; the localhost deployment uses `127.0.0.1`. Public process refuses staff accounts unconditionally.
- **RBAC + department scope on every route** — frontend guards are cosmetic.
- **Verification bounds** — Assignment manifests limit shells, working directories, step counts, timeouts, assertion sizes, and captured output. The server re-evaluates assertions before persisting a run.
- **Secrets hygiene** — `JWT_SECRET`, `AI_GATEWAY_API_KEY`, `RESEND_API_KEY`, and `ADMIN_PASSWORD` use env/secrets only. AI credentials never enter the frontend bundle or the anonymous sandbox. Repository URLs are limited to public HTTPS GitHub, GitLab, and Bitbucket hosts.
- **Mail fallback** — with `RESEND_API_KEY` empty, invitation/reset links are returned to the caller and written to the server log (dev-friendly, no silent failures).

---

## 12. Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Staff sign-in rejected locally (non-Docker) | Use `http://localhost:3001` and keep `STAFF_ALLOWED_IPS=127.0.0.1` for the local staff API |
| Staff sign-in rejected in Compose | `STAFF_ALLOW_PRIVATE` unset → set `STAFF_ALLOW_PRIVATE=true` in root `.env` (local only) |
| Staff site unavailable from another computer | Set `APP_HOST` to the server LAN IPv4 address, bind the staff UI/API to `0.0.0.0`, leave `STAFF_ALLOWED_IPS` empty with `STAFF_ALLOW_PRIVATE=true` in Compose, then rebuild |
| Staff API exits in production | `STAFF_ALLOWED_IPS` empty → set `STAFF_ALLOWED_IPS=127.0.0.1` |
| Frontend calls wrong API | Stale `VITE_API_URL` baked at build → rebuild after changing it; check `apps/web/.env` vs `apps/staff/.env` |
| Seed does nothing / login fails | Seeded a different DB than the API reads → compare `MONGODB_URI` in `apps/backend/.env` vs Compose |
| Port already in use | Another service on 3000/3001/4000/4001/27017 → change the `*_PORT` in `.env` or stop the conflict |
| Wrong client IP behind proxy | `TRUST_PROXY` misconfigured → enable only behind a proxy that sanitizes `X-Forwarded-For` |

Health probes: `GET /health` (liveness), `GET /health/ready` (readiness incl. DB).

---

## 13. Deployment Overview

The k3s deployment uses the VM IP directly. Open `http://192.168.0.103/` for the intern app and `http://192.168.0.103/staff` for staff. No hosts-file entries are needed. Public API requests use `/api/*`; staff API requests use `/staff-api/api/*`. Readiness checks are `/health/ready` and `/staff-api/health/ready`. The staff router and assets are built with `VITE_BASE_PATH=/staff`, and the production server receives `STAFF_BASE_PATH=/staff`.

`infra/k8s/base/configmap.yaml` sets the VM IP for application links and CORS. If the VM IP changes, update its `APP_URL`, `STAFF_APP_URL`, `PUBLIC_CORS_ORIGIN`, and `STAFF_CORS_ORIGIN`. `STAFF_ALLOWED_IPS` accepts individual IPs and IPv4 CIDRs; the VM environment uses `192.168.0.0/24,127.0.0.1` so staff can sign in from this LAN. For a different office network, update the VM environment and rerun `bash infra/scripts/apply-cluster-env.sh`.

Production path is GitOps. `.github/workflows/ci.yml` validates the repository, builds the three images, and publishes immutable `sha-<commit>` images to Docker Hub. It then opens a deployment pull request that updates `infra/k8s/overlays/production`; merging that pull request is the production promotion step, after which Argo CD (`infra/argocd/internity.yaml`) syncs the overlay into k3s. Separate Deployments run the intern site, the staff site, the public API, and the staff API. Both APIs are the same image with a different `API_SURFACE`. Staff access is enforced in the app from `STAFF_ALLOWED_IPS`, not by the ingress. On the VM, MongoDB is the `mongo` StatefulSet. Start it with the one-command flow in `docs/argocd-quickstart.md`.

---

## 14. Further Documentation

- `docs/argocd-quickstart.md` — one-command Argo CD registration and sync from the Linux VM
