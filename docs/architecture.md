# Architecture

Project name: **InternFlow**

InternFlow is a role-based intern management system. The architecture should stay simple: one frontend app, one backend API, one MongoDB database, Docker images for each app, and GitOps deployment into K3s through Argo CD.

## Architecture Goals

- Keep the project understandable for a small team.
- Keep frontend and backend separated by clear responsibilities.
- Enforce permissions on the backend, not only in the UI.
- Scope department data carefully.
- Make local development work through Docker Compose.
- Make production deployment work through Docker Hub, K3s, and Argo CD.

## High-Level System

```text
Browser
  |
  v
Frontend: TanStack Start
  |
  v
Backend API: Hono.js
  |
  v
MongoDB 7.x
```

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

## Recommended Monorepo Structure

Use this structure when creating the project:

```text
internflow/
  frontend/
    app/
    components/
    routes/
    styles/
    public/
    package.json
    Dockerfile

  backend/
    src/
      config/
      db/
      middleware/
      models/
      routes/
      services/
      validators/
    package.json
    Dockerfile

  packages/
    shared/
      src/
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
    deployment.md
    CI-CD.md
    requirements.md

  .github/
    workflows/

  package.json
  package-lock.json
  docker-compose.yml
  README.md
```

## Folder Responsibilities

`frontend/`

The TanStack Start application. It owns routing, layouts, dashboard pages, forms, data tables, charts, visual states, and role-aware navigation.

`backend/`

The Hono API. It owns authentication, authorization, request validation, department scoping, database access, business logic, and secure API responses.

`packages/shared/`

Optional shared package for types, constants, and validation contracts used by both frontend and backend. Add this only when duplication appears.

`infra/k8s/`

Kubernetes manifests for Deployments, Services, ConfigMaps, Secrets references, Ingress, and MongoDB if MongoDB is deployed inside the cluster.

`infra/argocd/`

Argo CD Application definitions for syncing Kubernetes manifests to K3s.

`.github/workflows/`

GitHub Actions workflows for validation, Docker builds, Docker Hub pushes, and GitOps manifest updates.

## Frontend Architecture

Frontend responsibilities:

- login and account activation screens
- route-level auth guards
- role-specific navigation
- dashboard layout
- Admin screens
- HR screens
- Supervisor screens
- Instructor screens
- Intern screens
- API client layer
- form validation UI
- loading, empty, error, and success states

Recommended dashboard pages:

- `/login`
- `/activate`
- `/dashboard`
- `/admin/users`
- `/admin/departments`
- `/hr/departments`
- `/hr/invitations`
- `/supervisor/instructors`
- `/classes`
- `/assignments`
- `/submissions`
- `/settings`

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

Use Shazia/shadcn-style components as the design foundation.

Recommended dashboard components:

- sidebar
- breadcrumb
- command menu
- data table
- dialog
- sheet
- tabs
- badge
- card
- form
- select
- calendar/date picker
- chart
- toast/sonner

Role-specific UX:

- Admin: global roster tables and system status cards
- HR: department table, invitation form, staff directory
- Supervisor: instructor roster and department activity
- Instructor: class scheduler, assignment editor, submission review table
- Intern: upcoming classes, assignment list, submission status, feedback view

## Deployment Architecture

Kubernetes workload plan:

- frontend Deployment
- frontend Service
- backend Deployment
- backend Service
- MongoDB StatefulSet if self-hosted
- ConfigMaps for non-sensitive config
- Secrets for sensitive config
- Ingress for public traffic

Argo CD application plan:

- one Argo CD app for frontend
- one Argo CD app for backend
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

