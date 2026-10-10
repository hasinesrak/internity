# Nginx Kubernetes deployment

The application manifests target the `nginx` IngressClass. Install the ingress
controller once per cluster, outside the `internity` Argo CD application.

## Install ingress-nginx

On each K3s server, disable the packaged Traefik addon in the K3s config. Keep
any existing settings in the file and add `traefik` to its `disable` list:

```yaml
# /etc/rancher/k3s/config.yaml
disable:
  - traefik
```

Restart K3s after editing the config, then install the controller from the
control-plane node:

```bash
sudo systemctl restart k3s
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --values infra/k8s/ingress-nginx/values.yaml
```

The values enable `X-Forwarded-For` handling and set the controller body limit
to match the application's 10 MB upload limit. For a production HA setup,
raise `controller.replicaCount` to two or more and put a cloud load balancer,
MetalLB, or an equivalent VIP in front of the controller Service.

Verify the metrics server before syncing the HPAs. K3s includes it as a
[packaged component](https://docs.k3s.io/installation/packaged-components):

```bash
kubectl -n kube-system get deployment metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl top nodes
```

If the packaged metrics server was disabled, enable it again in the K3s config
or install your own after disabling the packaged deployment. Diagnose missing
metrics before relying on HPA.

## Apply the application

Argo CD syncs `infra/k8s/overlays/production`, or the rendered resources can be
checked before syncing:

```bash
kubectl kustomize infra/k8s/overlays/production > /tmp/internity.yaml
kubectl apply --dry-run=server -f /tmp/internity.yaml
kubectl get ingress -n internity
kubectl get hpa -n internity
```

The staff API ingress rewrites `/staff-api/...` to the backend's existing
`/api/...` routes. Public and staff API ingresses have separate per-IP limits;
the backend still applies account-specific limits. API responses carry
`Cache-Control: no-store`, while the frontend servers mark hashed `/assets`
files as immutable. The application Kustomization also deploys Redis at
`redis:6379`; both API Deployments use it for shared rate-limit counters.
Redis is intentionally ephemeral because these counters are disposable; if it
restarts, the APIs can fall back to process-local limits while it recovers.

MongoDB runs as a two-member `rs0` replica set. A bootstrap Job waits for both
members and initializes the set; it leaves an existing replica set untouched.
The cluster-env script creates
the `MONGODB_URI` with both stable StatefulSet addresses:
`mongodb://mongo-0.mongo:27017,mongo-1.mongo:27017/internity?replicaSet=rs0`.
Run
`bash infra/scripts/apply-cluster-env.sh` after changing the cluster env so the
secret gets the replica-set URI.

## Upgrade an existing single Mongo deployment

The existing Mongo Service has an allocated ClusterIP. Kubernetes cannot change
that Service to headless in place, so perform this migration in a maintenance
window after the new revision and backend image are available to Argo CD. The
existing `data-mongo-0` PVC holds the data and must be retained.

Pause automated sync and stop the APIs so the standalone database backup is
consistent. Remove any API HPAs before scaling their Deployments to zero:

```bash
kubectl -n argocd patch application internity --type merge \
  --patch '{"spec":{"syncPolicy":{"automated":null}}}'
kubectl -n internity delete hpa backend-public backend-staff --ignore-not-found
kubectl -n internity scale deployment backend-public backend-staff --replicas=0
kubectl -n internity wait --for=delete pod \
  -l 'app in (backend-public,backend-staff)' --timeout=180s
kubectl -n internity exec mongo-0 -- mongodump \
  --archive=/tmp/internity-pre-replica.gz --gzip
kubectl -n internity cp mongo-0:/tmp/internity-pre-replica.gz \
  ./internity-pre-replica.gz
```

Store the backup securely, outside the repository. Stop Mongo, replace only the
Service, then update the secret and resume GitOps sync:

```bash
kubectl -n internity scale statefulset mongo --replicas=0
kubectl -n internity wait --for=delete pod -l app=mongo --timeout=180s
kubectl -n internity delete service mongo
kubectl -n internity apply -f infra/k8s/base/mongo-service.yaml
bash infra/scripts/apply-cluster-env.sh --sync
kubectl -n internity wait --for=condition=complete \
  job/mongo-replica-init --timeout=600s
kubectl -n internity exec mongo-0 -- mongosh --quiet --eval \
  'rs.status().members.map(m => ({name: m.name, state: m.stateStr}))'
kubectl -n internity rollout status deployment/backend-public
kubectl -n internity rollout status deployment/backend-staff
```

Wait until Argo CD creates the Job before running its wait command. Check
`kubectl -n internity logs job/mongo-replica-init` if initialization fails. After
correcting the problem, delete that failed Job and resync to retry it.

Compose keeps a standalone Mongo service for local development; the two-member
replica set is deployed by Kubernetes. Redis integration tests can be run with
a local Redis URL:

```bash
docker compose up -d --wait mongo redis
docker compose exec -T redis redis-cli -n 15 FLUSHDB
REDIS_URL=redis://127.0.0.1:6379/15 \
REDIS_TEST_URL=redis://127.0.0.1:6379/15 \
  pnpm --filter backend test
```

## Stateful scaling prerequisites

The API upload volume is still local `ReadWriteOnce`, so API pods remain
co-located until uploads move to S3/MinIO. The Mongo PVCs also use the cluster's
local storage class; Mongo replicates data between its members, while each
member's local PVC remains tied to its node. A two-member replica set loses write
quorum when either member is down, so use three members or managed MongoDB for
[production availability](https://www.mongodb.com/docs/v7.0/core/replica-set-architectures/).
Once shared uploads and durable Mongo storage exist,
remove the API pod affinity and add topology spread constraints.
