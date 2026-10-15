#!/usr/bin/env bash
# Install the cluster add-ons and register the Internity Argo CD application.
# Run from the repository root on the K3s control-plane VM:
#   sudo bash infra/scripts/bootstrap-control-plane.sh
#
# The script does not create production secrets. Put them in .env first, then
# rerun the command (or run apply-cluster-env.sh directly) to start the app.
set -Eeuo pipefail

readonly ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly ARGOCD_MANIFEST="https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml"

usage() {
  cat <<'EOF'
Usage: sudo bash infra/scripts/bootstrap-control-plane.sh [options]

Options:
  --skip-ingress   Do not install or update ingress-nginx.
  --sync           Apply the Internity secret and request an Argo CD sync.
  -h, --help       Show this help.

Environment:
  HELM_VERSION     Optional Helm version, for example v3.18.4.
EOF
}

die() {
  echo "bootstrap-control-plane.sh: $*" >&2
  exit 1
}

log() {
  echo "[cluster] $*"
}

[[ "${EUID}" -eq 0 ]] || die "run this script with sudo"
command -v k3s >/dev/null 2>&1 || die "K3s is not installed; run setup-k3s-node.sh server first"
[[ -d "$ROOT/infra/k8s" ]] || die "run this script from a checked-out Internity repository"

skip_ingress=false
sync=false
while (($#)); do
  case "$1" in
    --skip-ingress) skip_ingress=true; shift ;;
    --sync) sync=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

cd "$ROOT"

if command -v kubectl >/dev/null 2>&1 && kubectl --request-timeout=5s get nodes >/dev/null 2>&1; then
  kctl=(kubectl)
else
  kctl=(k3s kubectl)
fi

install_helm() {
  if command -v helm >/dev/null 2>&1; then
    return
  fi

  log "Installing Helm"
  local helm_version_args=()
  [[ -n "${HELM_VERSION:-}" ]] && helm_version_args+=("DESIRED_VERSION=$HELM_VERSION")
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
    | env "${helm_version_args[@]}" bash
}

if [[ "$skip_ingress" != true ]]; then
  install_helm
  log "Installing ingress-nginx"
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
  helm repo update >/dev/null
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --values infra/k8s/ingress-nginx/values.yaml
  "${kctl[@]}" -n ingress-nginx rollout status \
    deployment/ingress-nginx-controller --timeout=180s
fi

log "Installing Argo CD"
"${kctl[@]}" create namespace argocd --dry-run=client -o yaml | "${kctl[@]}" apply -f -
"${kctl[@]}" apply -n argocd -f "$ARGOCD_MANIFEST"
"${kctl[@]}" -n argocd rollout status deployment/argocd-server --timeout=300s
"${kctl[@]}" apply -f infra/argocd/internity.yaml

if [[ -f .env || -f apps/backend/.env || -f apps/staff/.env ]]; then
  log "Applying Internity secrets and Argo CD application"
  if [[ "$sync" == true ]]; then
    bash infra/scripts/apply-cluster-env.sh --sync
  else
    bash infra/scripts/apply-cluster-env.sh
  fi
else
  echo
  echo "Cluster add-ons are ready. Before starting Internity:"
  echo "  1. cp env.example .env"
  echo "  2. Set JWT_SECRET, MFA_ENCRYPTION_KEY, STAFF_ALLOWED_IPS, and admin credentials"
  echo "  3. Run: sudo bash infra/scripts/bootstrap-control-plane.sh --sync"
fi

log "Control-plane bootstrap complete"
