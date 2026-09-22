# Project Plan

Project name: **InternFlow**

InternFlow is a lightweight intern management platform for onboarding interns, organizing departments, scheduling classes, assigning tasks, collecting submissions, and reviewing intern work. It is designed as a modern web application with a simple monorepo, Docker-first development, and GitOps deployment to a Linux VM running K3s.

## Recommended Name

Use **InternFlow**.

Why this name fits:

- It clearly describes the product domain.
- It covers the whole lifecycle: invite, onboard, learn, submit, review.
- It sounds simple and professional.
- It works well as an app name, repository name, Docker image prefix, and Kubernetes namespace.

Suggested repository slug:

- `internflow`

Suggested Docker image names:

- `dockerhub-username/internflow-frontend`
- `dockerhub-username/internflow-backend`

Other possible names:

- InternDeck
- MentorDesk
- CohortFlow
- SkillTrack
- TraineeHub

## Product Overview

InternFlow will support five roles:

- Admin
- HR
- Supervisor
- Instructor
- Intern

The system should make it easy to:

- create and manage departments
- invite interns by email
- activate intern accounts with secure onboarding links
- assign supervisors and instructors to departments
- schedule classes with external meeting links
- publish assignments
- receive intern submission links
- review submissions with scores and written feedback
- keep users scoped to the departments and permissions they are allowed to access

## MVP Scope

The MVP should stay minimal and focused.

Included:

- role-based authentication
- department management
- user management
- intern invitations
- class scheduling
- assignment creation
- intern submission links
- review status, score, and feedback
- Docker local development
- GitHub Actions image publishing
- K3s deployment
- Argo CD GitOps sync

Out of scope:

- native video calls
- in-app file hosting
- real-time chat
- advanced analytics pipelines
- automated code execution
- multi-tenant enterprise features
- complex Kubernetes scaling before the app works end to end

## Technology Direction

Frontend:

- TanStack Start
- TanStack Router
- React
- TypeScript
- Tailwind CSS
- Shazia/shadcn-style registry components

Backend:

- Hono.js
- TypeScript
- JWT-based stateless authentication
- role-check and department-scope middleware
- Mongoose
- MongoDB 7.x

Infrastructure:

- npm workspaces
- Docker
- Docker Compose
- Docker Hub
- GitHub Actions
- K3s
- Argo CD

## Repository Direction

Use one simple monorepo for the first version.

The detailed notes mention dedicated frontend and backend repositories. That can work later, but for this stage a monorepo is easier because:

- frontend and backend changes can be reviewed together
- shared types can live in one place
- CI/CD is easier to understand at the beginning
- Docker Compose can run the whole project from one repo
- Argo CD manifests can live beside the app until the deployment process is stable

If the project grows, split into three repositories later:

- `internflow-frontend`
- `internflow-backend`
- `internflow-gitops`

## Future Monorepo Structure

Create this later when implementation begins:

```text
internflow/
  frontend/
  backend/
  packages/
    shared/
  infra/
    k8s/
    argocd/
    docker/
  docs/
  .github/
    workflows/
  package.json
  package-lock.json
  docker-compose.yml
  README.md
```

## Role Summary

Admin:

- manages HR accounts
- has full user oversight
- can override departments
- manages system-level configuration
- can revoke access and reset accounts

HR:

- creates departments
- assigns supervisors
- assigns instructors to departments
- sends intern email invitations
- views organization directories

Supervisor:

- manages instructors in their assigned department
- can act as an instructor
- can view department interns, classes, and assignments
- cannot manage other departments

Instructor:

- schedules classes
- creates assignments
- reviews submissions
- provides scores and feedback
- stays scoped to assigned department

Intern:

- activates account from email invitation
- views department dashboard
- views classes and assignments
- submits external links with notes
- views feedback and grades

## Phase 1: Documentation And Decisions

Deliverables:

- choose product name
- confirm monorepo structure
- define role permissions
- define core modules
- define deployment direction
- define CI/CD direction
- define UX direction

Exit criteria:

- the project can be created without guessing the folder layout, role boundaries, or deployment strategy

## Phase 2: Monorepo Setup

Deliverables:

- npm workspace root
- `frontend/` app folder
- `backend/` app folder
- optional `packages/shared/`
- root scripts for install, lint, test, build, and dev
- environment examples
- project README

Exit criteria:

- frontend and backend can be started locally
- npm workspace commands are clear

## Phase 3: Backend Foundation

Deliverables:

- Hono app structure
- MongoDB connection through Mongoose
- environment config loader
- health route
- auth route group
- role middleware
- department-scope middleware
- consistent error responses

Exit criteria:

- backend can authenticate users and protect role-specific routes

## Phase 4: Frontend Foundation

Deliverables:

- TanStack Start app
- dashboard shell
- route-level guards
- role-aware navigation
- auth pages
- basic department dashboard
- reusable UI layout components

Exit criteria:

- users see only the dashboard areas allowed for their role

## Phase 5: Core Product Modules

Deliverables:

- Admin user management
- HR department and invitation flow
- Supervisor instructor roster
- Instructor class scheduling
- Instructor assignment workflow
- Intern class and assignment dashboard
- Intern submission form
- Instructor submission review flow

Exit criteria:

- the complete intern lifecycle works from invitation to reviewed submission

## Phase 6: Local Docker

Deliverables:

- frontend Dockerfile
- backend Dockerfile
- MongoDB service in Docker Compose
- local environment documentation

Exit criteria:

- the full app runs locally through Docker Compose

## Phase 7: CI/CD

Deliverables:

- GitHub Actions validation workflow
- GitHub Actions Docker build workflow
- Docker Hub image publishing
- immutable image tags
- manifest image tag update process

Exit criteria:

- merging to main can publish frontend and backend images

## Phase 8: K3s And Argo CD Deployment

Deliverables:

- Linux VM setup
- K3s installed
- Argo CD installed
- Kubernetes manifests
- frontend Argo CD app
- backend Argo CD app
- MongoDB deployment decision documented
- ingress configured

Exit criteria:

- Argo CD can sync the app into K3s from Git

## Dashboard UX Direction

InternFlow should feel like a practical operations dashboard, not a marketing site.

Use dashboard patterns that match the product:

- left sidebar navigation
- role-specific home screen
- compact KPI cards
- department tables
- intern rosters
- assignment status cards
- submission review table
- class schedule timeline
- detail drawers for fast review
- clear empty, loading, error, and success states

Good Shazia/shadcn-style UX experiments:

- fixed sidebar vs collapsible sidebar
- command menu vs simple top search
- table row detail drawer vs full detail page
- assignment cards vs dense assignment table
- intern onboarding checklist vs simple activation flow
- score entry inside drawer vs dedicated review page
- status badges vs timeline-style submission history

Useful component sources to inspect before implementation:

- official shadcn/ui components, blocks, charts, and registry directory
- Shadcn UI Kit admin dashboard blocks and templates
- Shadcn Space dashboard-compatible blocks and components
- Shadcn Admin Kit for admin panel and B2B dashboard patterns

Review licenses before using third-party blocks in production.

## Success Criteria

The project is successful when:

- HR can invite an intern
- an intern can activate an account
- users can log in with correct role access
- departments scope data correctly
- instructors can schedule classes
- instructors can create assignments
- interns can submit external task links
- instructors can review submissions
- Docker can run the app locally
- GitHub Actions can publish images
- Argo CD can deploy the app to K3s

## Immediate Next Steps

1. Confirm the name **InternFlow**.
2. Confirm monorepo instead of separate frontend/backend repos.
3. Create the actual project folders.
4. Scaffold frontend and backend.
5. Add MongoDB local Docker Compose.
6. Implement auth and role boundaries first.
7. Add the intern invitation workflow.

