# Internity on one K3s control plane and two workers

This runbook configures three existing Linux VMs. It does not create VMs:

```text
vm-control-plane   K3s server, Argo CD, kubectl/helm
vm-worker-1        K3s agent, application workloads
vm-worker-2        K3s agent, application workloads
```

## Quick setup with the checked-in scripts

The scripts are idempotent and are intended for Ubuntu 22.04/24.04 VMs. Run
the control-plane command once, then use the printed worker command on the
first worker and on every worker added later.

### 1. Install the control plane

On the control-plane VM, replace `10.0.0.10` with its stable private address:

```bash
curl -fsSL https://raw.githubusercontent.com/hasinesrak/internity/master/infra/scripts/setup-k3s-node.sh \
  | sudo bash -s -- server --node-ip 10.0.0.10
```

The script disables bundled Traefik, enables the K3s service at boot, waits
for the API to become ready, and prints a complete worker join command with
the same K3s version. Keep the printed token private.

### 2. Join the first worker

On the worker VM, run the exact command printed by the control plane. It looks
like this:

```bash
curl -fsSL https://raw.githubusercontent.com/hasinesrak/internity/master/infra/scripts/setup-k3s-node.sh \
  | sudo bash -s -- agent --server 10.0.0.10 --token 'TOKEN' \
    --node-name vm-worker-1 --label workload=internity
```

The script installs the K3s agent, enables it at boot, and adds the worker to
the cluster. Verify it from the control plane:

```bash
sudo k3s kubectl get nodes -o wide
```

### 3. Add another worker later

Provision a new Ubuntu VM, make sure it can reach the control plane on TCP
`6443`, UDP `8472`, and TCP `10250`, then run the same command with a unique
node name:

```bash
curl -fsSL https://raw.githubusercontent.com/hasinesrak/internity/master/infra/scripts/setup-k3s-node.sh \
  | sudo bash -s -- agent --server 10.0.0.10 --token 'TOKEN' \
    --node-name vm-worker-2 --label workload=internity
```

No application manifests need to be edited to add a worker. Kubernetes
Services and Deployments will use the new node automatically. The token can
also be supplied as `K3S_TOKEN` instead of placing it in shell history.

### 4. Start the Internity platform

On the control plane, clone the repository and configure secrets before the
first application sync:

```bash
git clone https://github.com/hasinesrak/internity.git
cd internity
cp env.example .env
chmod 600 .env
${EDITOR:-vi} .env
sudo bash infra/scripts/bootstrap-control-plane.sh --sync
```

`bootstrap-control-plane.sh` installs ingress-nginx and Argo CD, registers the
GitOps application, and requests the first sync. It never invents production
secrets. If `.env` is not ready, it installs the cluster add-ons and tells you
exactly what to set before rerunning with `--sync`.

For a pinned K3s release, add `--k3s-version <version>` to the node command.
The default is the current `stable` K3s channel.

The control-plane VM may also run workloads in the initial lab cluster. The
manifests use Kubernetes Services, so pods can move between the workers without
changing application URLs. MongoDB and uploads use local `ReadWriteOnce`
volumes; keep the two API surfaces co-located while that storage design is in
use. For high availability, move MongoDB to managed storage or a deliberate
three-member deployment and move uploads to object storage.

Replace the example addresses below with the real static addresses from your
network. Run commands as a user with `sudo` on the named VM.

## 1. Prepare all three VMs

Use Ubuntu 22.04 or 24.04, give each VM a stable address, and keep clocks
synchronized. Set hostnames and add name resolution on all three VMs (DNS is
preferred; `/etc/hosts` is enough for a lab):

```text
10.0.0.10 vm-control-plane
10.0.0.11 vm-worker-1
10.0.0.12 vm-worker-2
```

On every VM:

```bash
sudo apt-get update
sudo apt-get install -y curl ca-certificates git openssh-client
sudo swapoff -a
sudo sed -i.bak '/\sswap\s/ s/^/#/' /etc/fstab
```

Allow these connections in the VM firewall/security group:

| Port | Direction | Purpose |
| --- | --- | --- |
| 6443/TCP | workers → control plane | K3s API |
| 8472/UDP | all cluster nodes | K3s Flannel VXLAN |
| 10250/TCP | control plane ↔ workers | Kubelet |
| 80, 443/TCP | clients → ingress node(s) | Application and Argo CD ingress |

Do not expose MongoDB or Redis to the network; they are cluster-internal.

## 2. Install the K3s control plane manually

On `vm-control-plane`, disable the bundled Traefik controller because this
project uses ingress-nginx:

```bash
sudo mkdir -p /etc/rancher/k3s
cat <<'EOF' | sudo tee /etc/rancher/k3s/config.yaml
write-kubeconfig-mode: "0640"
disable:
  - traefik
EOF
curl -sfL https://get.k3s.io | sh -s - server
sudo systemctl enable --now k3s
sudo k3s kubectl get nodes
```

Use the K3s kubeconfig as your normal user:

```bash
mkdir -p "$HOME/.kube"
sudo k3s kubectl config view --raw | sed "s#server: https://127.0.0.1:6443#server: https://10.0.0.10:6443#" > "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"
kubectl get nodes
```

The replacement address must be reachable from the worker VMs and from any
machine that will administer the cluster. If you only administer locally, keep
`127.0.0.1` and use `sudo k3s kubectl`.

## 3. Join both workers manually

On the control plane, copy the join token:

```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

On each worker, replace `TOKEN` and `10.0.0.10` and run:

```bash
curl -sfL https://get.k3s.io | K3S_URL=https://10.0.0.10:6443 K3S_TOKEN='TOKEN' sh -s - agent
sudo systemctl enable --now k3s-agent
```

Back on the control plane, confirm all nodes are ready and record their names:

```bash
kubectl get nodes -o wide
kubectl label node vm-worker-1 workload=internity
kubectl label node vm-worker-2 workload=internity
```

Do not add a control-plane taint until you have verified Argo CD and the
application. If you later taint the control plane, add matching tolerations to
the Argo CD installation and any workloads you intentionally keep there.

## 4. Install ingress-nginx and Argo CD

On the control plane, clone this repository and enter it:

```bash
git clone https://github.com/hasinesrak/internity.git
cd internity
```

Install Helm if it is not already present, then install ingress-nginx with the
checked-in values:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --values infra/k8s/ingress-nginx/values.yaml
kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=180s
```

Install Argo CD from its upstream release manifest:

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deployment/argocd-server --timeout=180s
```

For a lab, administer Argo CD through a local port-forward. Keep this terminal
open while using the CLI:

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443 --address 127.0.0.1
```

In a second terminal on the control plane:

```bash
ARGOCD_ADMIN_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d)
argocd login 127.0.0.1:8080 --username admin --password "$ARGOCD_ADMIN_PASSWORD" \
  --insecure --grpc-web
```

Keep the Argo CD admin password private and delete the initial secret after
rotating the password if your Argo CD version supports that operation.

## 5. Set cluster-specific configuration

The public and staff ingresses are hostless and use the ingress address. The
platform ingress uses `platform.internity.local`; create a DNS record or add
this entry to each client that needs the platform UI:

```text
10.0.0.10 platform.internity.local
```

Edit `infra/k8s/base/configmap.yaml` before syncing. Set `APP_URL`,
`STAFF_APP_URL`, `PUBLIC_CORS_ORIGIN`, and `STAFF_CORS_ORIGIN` to the URL that
users will enter in their browser. These four values must use the same scheme,
host, and port. For example, with ingress on `10.0.0.10`:

```yaml
APP_URL: http://10.0.0.10
STAFF_APP_URL: http://10.0.0.10/staff
PUBLIC_CORS_ORIGIN: http://10.0.0.10
STAFF_CORS_ORIGIN: http://10.0.0.10
```

For HTTPS, put TLS termination in front of ingress-nginx or add a certificate
and set all four values to `https://...`; then set `COOKIE_SECURE: "true"`.

Create a protected environment file on the control plane. Do not commit it:

```bash
cp env.example .env
chmod 600 .env
${EDITOR:-vi} .env
```

At minimum, set these values to production-safe values:

```dotenv
JWT_SECRET=<at least 32 random characters>
MFA_ENCRYPTION_KEY=<at least 32 random characters>
STAFF_ALLOWED_IPS=10.0.0.0/24,127.0.0.1
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<at least 8 characters with letters and numbers>
PLATFORM_ADMIN_EMAIL=platform-admin@example.com
PLATFORM_ADMIN_PASSWORD=<at least 8 characters with letters and numbers>
```

If the public application is built by GitHub Actions, also set the repository
Variables `PUBLIC_API_URL`, `STAFF_API_URL`, and `PLATFORM_API_URL` to the
ingress paths (`/`, `/staff-api`, and `/` respectively) before the next image
release. The workflow bakes these values into the frontend bundles.

## 6. Register the Argo CD application

Run the checked-in helper from the repository root. It creates the namespace,
creates or updates `internity-secrets`, and registers the Argo CD Project and
Application:

```bash
bash infra/scripts/apply-cluster-env.sh
```

Request an immediate sync, or sync from the Argo CD UI:

```bash
bash infra/scripts/apply-cluster-env.sh --sync
argocd app wait internity --sync --health --timeout 900
```

The helper rewrites a local Mongo URI to the in-cluster two-member replica-set
URI. It leaves externally managed MongoDB URIs unchanged. The replica-set Job
waits for both Mongo pods and initializes `rs0` once.

## 7. Seed accounts and verify the rollout

After the first healthy rollout, seed the customer admin and platform admin
from the images already running in the cluster:

```bash
kubectl -n internity exec deploy/backend-staff -- node dist/scripts/seed.js
kubectl -n internity exec deploy/backend-platform -- node dist/scripts/seed-platform-admin.js
```

Check placement, health, ingress endpoints, metrics, and rollout state:

```bash
kubectl get nodes -o wide
kubectl get pods -n internity -o wide
kubectl get svc,ingress,endpointslice,hpa -n internity
kubectl -n internity wait --for=condition=complete job/mongo-replica-init --timeout=600s
kubectl -n internity rollout status deployment/backend-public
kubectl -n internity rollout status deployment/backend-staff
kubectl -n internity rollout status deployment/web
kubectl -n internity rollout status deployment/staff
kubectl -n internity rollout status deployment/platform
kubectl -n kube-system get deployment metrics-server
kubectl top nodes
argocd app get internity
```

From a client that can reach the ingress address:

```bash
curl --fail http://10.0.0.10/health
curl --fail http://10.0.0.10/api/health/ready
curl --fail http://10.0.0.10/staff-api/health/ready
curl --fail -H 'Host: platform.internity.local' http://10.0.0.10/health
```

The expected API response includes `{"status":"ok","database":"up"}`.
Sign in at `/` for interns, `/staff` for staff, and
`http://platform.internity.local/` for the platform administrator.

## 8. Release and rollback

Push application changes to `master`. GitHub Actions runs lint, typecheck,
Mongo-backed tests, Docker builds, and a Compose smoke test. On `master`, it
publishes immutable `sha-<commit>` image tags and opens a deployment pull
request that updates the production Kustomize overlay. Merge that deployment
pull request; Argo CD then syncs the new images.

To inspect or roll back from the control plane:

```bash
argocd app history internity
argocd app rollback internity <HISTORY_ID>
kubectl -n internity rollout history deployment/backend-public
```

If Mongo initialization fails, inspect the Job and correct the underlying
problem before deleting and resyncing it:

```bash
kubectl -n internity logs job/mongo-replica-init
kubectl -n internity delete job mongo-replica-init
argocd app sync internity
```

For the storage and availability limits of the two-member Mongo replica set,
local uploads, Redis, and ingress-nginx, see
[`nginx-kubernetes-deployment.md`](nginx-kubernetes-deployment.md).
