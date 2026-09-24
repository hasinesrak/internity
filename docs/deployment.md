# Deployment Plan

Project name: **Internity**

Internity will deploy to a Linux virtual machine running K3s. Docker images will be built by GitHub Actions, pushed to Docker Hub, and deployed through Argo CD using a GitOps workflow.

## Deployment Goal

The end goal:

- code is pushed to GitHub
- GitHub Actions validates and builds the app
- frontend and backend images are pushed to Docker Hub
- Kubernetes manifests reference those images
- Argo CD syncs the manifests into K3s
- K3s runs frontend, backend, and optionally MongoDB
- users access the frontend through an ingress route

## Target Environment

Production target:

- Linux virtual machine
- Docker installed
- K3s installed
- Argo CD installed inside K3s
- Ingress enabled
- MongoDB either external or inside K3s

Recommended namespaces:

- `argocd`
- `internity`
- `monitoring` later if observability is added

## Production Components

Frontend:

- TanStack Start app
- Kubernetes Deployment
- Kubernetes Service
- public Ingress route

Backend:

- Hono API
- Kubernetes Deployment
- Kubernetes Service
- internal or public API route
- environment configuration from ConfigMap and Secrets

Database:

- MongoDB 7.x
- local development through Docker Compose
- production through managed MongoDB or K3s StatefulSet

GitOps:

- Argo CD watches Git
- Argo CD compares desired state with live cluster state
- Argo CD syncs changes into the cluster

## Recommended First Production Shape

For the first real deployment:

- deploy frontend and backend to K3s
- use one namespace: `internity`
- use one domain if available
- use simple rolling updates
- create secrets manually in the cluster
- use manual Argo CD sync until you understand the flow
- enable automated sync later

Do not begin with advanced Kubernetes patterns. First make the app run.

## URL Strategy

Option A: one domain

- frontend: `https://internity.example.com`
- backend API: `https://internity.example.com/api`

Option B: two subdomains

- frontend: `https://app.example.com`
- backend API: `https://api.example.com`

Recommended first choice: Option A. It is easier for CORS, cookies, and early deployment.

## Image Strategy

Docker Hub repositories:

- `dockerhub-username/internity-frontend`
- `dockerhub-username/internity-backend`

Image tags:

- commit SHA for every main branch deployment
- semantic version tags for releases

Avoid using `latest` in Kubernetes manifests because it makes rollbacks unclear.

## Kubernetes Resource Plan

Frontend resources:

- Deployment
- Service
- ConfigMap
- Ingress

Backend resources:

- Deployment
- Service
- ConfigMap
- Secret references
- Ingress path or internal service route

MongoDB resources if self-hosted:

- StatefulSet
- Service
- PersistentVolumeClaim
- Secret
- backup plan

Shared resources:

- Namespace
- image pull secret if Docker Hub images are private
- TLS certificate later

## Configuration Plan

Use ConfigMaps for non-sensitive values:

- environment name
- frontend public URL
- backend public URL
- log level
- feature flags
- invite token expiry duration

Use Secrets for sensitive values:

- MongoDB connection string
- JWT secret
- password hashing secret or pepper if used
- email provider API key
- SMTP username and password
- Docker registry pull credentials if private images are used

Important: plain secret values should not be committed to Git.

## Secret Management Path

Stage 1:

- create Kubernetes Secrets manually in the VM cluster
- keep the required secret names documented
- do not commit secret values

Stage 2:

- add Sealed Secrets, SOPS, External Secrets Operator, or Argo CD Vault Plugin

Recommended learning path:

1. manual secrets first
2. Sealed Secrets or SOPS once the cluster deployment works
3. external secret manager later if the project becomes production-critical

## Argo CD Plan

Start with these applications:

- `internity-frontend`
- `internity-backend`
- `internity-mongodb` only if MongoDB is managed inside K3s

Recommended sync settings at first:

- manual sync
- pruning disabled
- self-heal disabled

Recommended sync settings after confidence:

- automated sync enabled
- self-heal enabled
- pruning enabled only when manifests are clean and ownership is clear

## Deployment Flow

1. Developer merges code to `main`.
2. GitHub Actions validates code.
3. GitHub Actions builds Docker images.
4. GitHub Actions pushes images to Docker Hub.
5. GitHub Actions updates image tags in Kubernetes manifests.
6. Argo CD detects the Git change.
7. Argo CD marks the application out of sync.
8. Argo CD syncs the desired state.
9. K3s pulls the new images.
10. Kubernetes rolls out new pods.

## Local Development Flow

Local development should use Docker Compose:

- frontend container
- backend container
- MongoDB container

The local setup should prove:

- frontend can call backend
- backend can connect to MongoDB
- invitation email can be mocked or sent through a development provider
- auth and role checks work locally

## Health Checks

Backend:

- expose a health endpoint
- verify server is running
- optionally verify database connectivity

Frontend:

- expose a basic HTTP readiness check

Kubernetes:

- readiness probes prevent traffic before startup completes
- liveness probes restart stuck containers

## Rollback Plan

Rollback should be Git-based:

1. Find the last working image tag.
2. Revert the manifest change or update the tag back.
3. Commit and push the rollback.
4. Argo CD syncs the previous image.

This keeps the cluster state traceable.

## MongoDB Production Warning

Running MongoDB inside a single-node K3s VM is acceptable for learning or a small MVP, but it creates operational responsibilities:

- persistent volumes
- disk monitoring
- backups
- restore testing
- upgrade process
- data loss planning

If this app stores important real intern records, use a managed MongoDB service or a carefully maintained external MongoDB server.

## First Deployment Checklist

- Linux VM is ready.
- Docker is installed.
- K3s is installed.
- `kubectl` works on the VM.
- Argo CD is installed.
- `internity` namespace exists.
- Docker Hub repositories exist.
- GitHub repository secrets are configured.
- Frontend image can be pulled by K3s.
- Backend image can be pulled by K3s.
- MongoDB connection is available.
- JWT secret exists in Kubernetes.
- Email provider secret exists in Kubernetes.
- Argo CD can read the Git repository.
- Ingress route points to the frontend.
- Backend API route is reachable.

## Deployment Milestones

1. Run the app locally without Docker.
2. Run MongoDB locally through Docker Compose.
3. Run frontend, backend, and MongoDB through Docker Compose.
4. Build frontend and backend Docker images locally.
5. Push images through GitHub Actions.
6. Deploy manually to K3s with `kubectl`.
7. Install Argo CD.
8. Let Argo CD deploy the manifests.
9. Add TLS.
10. Add safer secret management.
11. Add monitoring and backups.

## Common Mistakes To Avoid

- storing JWT secrets or email API keys in Git
- using `latest` for production image tags
- letting GitHub Actions and Argo CD both deploy to the cluster
- skipping backend authorization checks
- running MongoDB in K3s without backups
- exposing backend admin routes without role middleware
- trusting frontend route guards as security
