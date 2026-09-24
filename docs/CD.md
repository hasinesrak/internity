# CI/CD Plan

Project name: **Internity**

This document describes the CI/CD plan for the Internity monorepo. GitHub Actions will validate the code, build Docker images, push images to Docker Hub, and update GitOps deployment manifests. Argo CD will handle deployment into K3s.

## CI/CD Goal

The goal is a simple pipeline:

1. Push code to GitHub.
2. GitHub Actions checks the code.
3. GitHub Actions builds frontend and backend images.
4. GitHub Actions pushes images to Docker Hub.
5. Kubernetes manifests are updated with immutable image tags.
6. Argo CD deploys the desired state to K3s.

## Responsibility Split

GitHub Actions owns:

- dependency installation
- linting
- type checking
- tests
- frontend build
- backend build
- Docker image build
- Docker Hub push
- manifest image tag update

Argo CD owns:

- reading deployment manifests from Git
- detecting drift
- syncing Kubernetes resources
- showing deployment health
- rollback through Git history

K3s owns:

- running pods
- restarting failed workloads
- routing traffic through Services and Ingress
- mounting ConfigMaps and Secrets

## Recommended Workflows

Use separate workflows so each job is easy to understand.

`validate.yml`

- runs on pull requests and pushes
- installs npm dependencies
- runs lint
- runs type checks
- runs tests
- builds frontend and backend

`docker-publish.yml`

- runs on push to `main`
- builds frontend Docker image
- builds backend Docker image
- tags images with commit SHA
- pushes images to Docker Hub

`gitops-update.yml`

- runs after image publishing
- updates Kubernetes manifest image tags
- commits the manifest change back to Git
- lets Argo CD detect and deploy the change

These can be combined later, but separate files are easier while learning.

## Monorepo Pipeline Scope

Frontend checks:

- install dependencies
- lint
- type check
- build TanStack Start app

Backend checks:

- install dependencies
- lint
- type check
- run API tests
- verify Hono app builds

Shared package checks if used:

- type check
- test
- ensure frontend and backend can import shared types safely

## Docker Hub Repositories

Use separate repositories:

- `dockerhub-username/internity-frontend`
- `dockerhub-username/internity-backend`

Recommended tags:

- `sha-<short-commit-sha>`
- `v1.0.0` for release tags

Avoid using `latest` in Kubernetes manifests.

## Required GitHub Secrets

Add these repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Optional later:

- `RESEND_API_KEY` only for test environments that send email
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- security scanner token
- notification webhook

Do not add production Kubernetes credentials to GitHub Actions in the first version. Argo CD should deploy from Git.

## Build Trigger Strategy

Pull request:

- run validation only
- do not publish Docker images
- do not update deployment manifests

Push to `main`:

- run validation
- build images
- push images
- update manifests

Git tag like `v1.0.0`:

- build release images
- push semantic version tags
- optionally update production manifests

## Image Tag Update Strategy

Recommended first approach:

- GitHub Actions updates the image tags in Kubernetes manifests.
- The update is committed to the repository.
- Argo CD detects the Git commit and syncs.

Alternative later:

- use Argo CD Image Updater to watch Docker Hub and update image references automatically.

Start with the GitHub Actions manifest update because it is easier to understand.

## Environment Strategy

Start with:

- `local`: Docker Compose
- `production`: K3s on Linux VM

Add `staging` later when the app has real users or risky deployment changes.

## Branch Strategy

Simple strategy:

- `main`: production-ready branch
- feature branches: short-lived work branches

Optional later:

- `develop`: staging branch
- release branches for versioned releases

Do not add too much branching before the team needs it.

## Validation Rules

Every pull request should pass:

- install
- lint
- type check
- tests
- frontend build
- backend build

Before production deployment:

- Docker images build successfully
- images are pushed to Docker Hub
- manifests reference existing image tags
- Argo CD sync is healthy

## Security Checks To Add Later

Add these after the basic pipeline works:

- dependency audit
- Docker image vulnerability scan
- secret scanning
- Dockerfile linting
- Kubernetes manifest linting
- branch protection rules
- required pull request review

## Rollback Process

Rollback is done through Git:

1. Find the last working image tag.
2. Revert the manifest commit or set the image tag back manually.
3. Push the rollback commit.
4. Argo CD detects the change.
5. Argo CD syncs the previous image.

This keeps deployment history clear.

## CI/CD Milestones

1. Create validation workflow.
2. Add Docker image builds.
3. Push images to Docker Hub.
4. Add Kubernetes manifests.
5. Add automated manifest tag updates.
6. Install Argo CD in K3s.
7. Create Argo CD apps.
8. Test rollback.
9. Add image scanning.
10. Add deployment notifications.

## Important Notes

- GitHub Actions should not be the deployment tool.
- Argo CD should be the deployment tool.
- Docker Hub should store immutable build artifacts.
- Git should store desired deployment state.
- K3s should run the desired state.
