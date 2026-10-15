#!/usr/bin/env bash
# Install or join the Internity K3s cluster.
#
# Control-plane VM:
#   curl -fsSL https://raw.githubusercontent.com/hasinesrak/internity/master/infra/scripts/setup-k3s-node.sh \
#     | sudo bash -s -- server --node-ip 10.0.0.10
#
# Worker VM (use the token printed by the server command):
#   curl -fsSL https://raw.githubusercontent.com/hasinesrak/internity/master/infra/scripts/setup-k3s-node.sh \
#     | sudo bash -s -- agent --server 10.0.0.10 --token 'K10...::server:...'
#
# Run the same agent command on every new worker VM. The script is safe to
# re-run: an already installed K3s service is started rather than replaced.
set -Eeuo pipefail

readonly SCRIPT_NAME="setup-k3s-node.sh"
readonly K3S_INSTALL_URL="https://get.k3s.io"

usage() {
  cat <<'EOF'
Usage:
  setup-k3s-node.sh server --node-ip <control-plane-ip> [options]
  setup-k3s-node.sh agent --server <control-plane-ip> --token <token> [options]

Commands:
  server       Install the K3s control plane and disable bundled Traefik.
  agent        Install a worker and connect it to the control plane.

Options:
  --node-ip <ip>       Address this VM advertises to the cluster.
  --node-name <name>   Kubernetes node name (defaults to the VM hostname).
  --server <address>   Control-plane address for an agent. Port 6443 is added.
  --token <token>      K3s join token. K3S_TOKEN can be used instead.
  --label <key=value>  Add a node label. May be repeated for agents.
  --k3s-version <ver>  Pin a K3s version, for example v1.33.5+k3s1.
  --channel <channel>  K3s install channel (default: stable).
  -h, --help           Show this help.

Examples:
  sudo bash setup-k3s-node.sh server --node-ip 10.0.0.10
  sudo bash setup-k3s-node.sh agent --server 10.0.0.10 --token 'K10...'
  sudo bash setup-k3s-node.sh agent --server 10.0.0.10 --token 'K10...' \
    --node-name vm-worker-2 --label workload=internity

The control-plane command prints the exact worker join command and token after
the server is ready. Keep that token private; it grants cluster join access.
EOF
}

die() {
  echo "${SCRIPT_NAME}: $*" >&2
  exit 1
}

log() {
  echo "[k3s] $*"
}

require_root() {
  [[ "${EUID}" -eq 0 ]] || die "run this script with sudo"
}

require_linux() {
  [[ "$(uname -s)" == "Linux" ]] || die "this script supports Linux VMs only"
  [[ -r /etc/os-release ]] || die "cannot identify the Linux distribution"
  # shellcheck disable=SC1091
  source /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) ;;
    *) die "supported distributions are Ubuntu and Debian (found ${ID:-unknown})" ;;
  esac
  command -v apt-get >/dev/null 2>&1 || die "apt-get is required"
  command -v systemctl >/dev/null 2>&1 || die "systemd is required"
}

install_prerequisites() {
  export DEBIAN_FRONTEND=noninteractive
  log "Installing host prerequisites"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl conntrack iptables socat

  # Kubernetes nodes should not have swap enabled. Keep fstab unchanged apart
  # from commenting swap entries so the setting survives a reboot.
  swapoff -a || true
  if grep -Eq '^[^#].*[[:space:]]swap[[:space:]]' /etc/fstab; then
    cp -n /etc/fstab /etc/fstab.internity-k3s.bak || true
    sed -ri '/^[^#].*[[:space:]]swap[[:space:]]/ s/^/#/' /etc/fstab
  fi
}

detect_node_ip() {
  local target=${1:-1.1.1.1}
  local address
  address=$(ip -4 route get "$target" 2>/dev/null | awk '
    { for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }
  ')
  [[ -n "$address" ]] || die "could not detect this VM's IPv4 address; pass --node-ip"
  printf '%s\n' "$address"
}

normalize_server_url() {
  local address=$1
  if [[ "$address" != https://* ]]; then
    address="https://${address}"
  fi
  if [[ "$address" != *:6443 ]]; then
    address="${address}:6443"
  fi
  printf '%s\n' "$address"
}

server_host() {
  local address=${1#https://}
  address=${address%%:*}
  printf '%s\n' "$address"
}

write_server_config() {
  local node_ip=$1
  local config=/etc/rancher/k3s/config.yaml
  install -d -m 0755 /etc/rancher/k3s

  if [[ -f "$config" ]]; then
    log "Keeping existing K3s config at $config"
    return
  fi

  cat >"$config" <<EOF
write-kubeconfig-mode: "0640"
disable:
  - traefik
node-ip: "$node_ip"
advertise-address: "$node_ip"
tls-san:
  - "$node_ip"
EOF
  chmod 0600 "$config"
}

install_server() {
  local node_ip=$1
  local node_name=${2:-}
  write_server_config "$node_ip"

  if systemctl list-unit-files k3s.service --no-legend 2>/dev/null | grep -q '^k3s.service'; then
    log "K3s server is already installed"
    systemctl enable --now k3s
    return
  fi

  local installer_env=("INSTALL_K3S_CHANNEL=$K3S_CHANNEL")
  [[ -n "$K3S_VERSION" ]] && installer_env+=("INSTALL_K3S_VERSION=$K3S_VERSION")
  [[ -n "$node_name" ]] && installer_env+=("K3S_NODE_NAME=$node_name")

  log "Installing K3s server"
  curl -fsSL "$K3S_INSTALL_URL" | env "${installer_env[@]}" sh -s - server
  systemctl enable --now k3s
}

wait_for_server() {
  local attempts=0
  until k3s kubectl get nodes >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    (( attempts < 60 )) || die "K3s server did not become ready"
    sleep 2
  done
}

print_join_command() {
  local node_ip=$1
  local token
  local installed_version
  token=$(cat /var/lib/rancher/k3s/server/node-token)
  installed_version=$(k3s --version | grep -oE 'v[0-9]+\.[0-9]+\.[^ ]+' | head -n 1 || true)

  echo
  echo "K3s control plane is ready. Run this on each worker VM:"
  if [[ -n "$installed_version" ]]; then
    printf "curl -fsSL %q | sudo bash -s -- agent --server %q --token %q --k3s-version %q --label workload=internity\n" \
      "$K3S_INSTALL_URL" "$node_ip" "$token" "$installed_version"
  else
    printf "curl -fsSL %q | sudo bash -s -- agent --server %q --token %q --label workload=internity\n" \
      "$K3S_INSTALL_URL" "$node_ip" "$token"
  fi
  echo
  echo "Join token (keep it private):"
  echo "$token"
  echo
  echo "Verify nodes from this VM with:"
  echo "  sudo k3s kubectl get nodes -o wide"
}

install_agent() {
  local server_url=$1
  local token=$2
  local node_ip=$3
  local node_name=$4
  shift 4
  local labels=("$@")

  server_url=$(normalize_server_url "$server_url")
  local host
  host=$(server_host "$server_url")

  if systemctl list-unit-files k3s-agent.service --no-legend 2>/dev/null | grep -q '^k3s-agent.service'; then
    log "K3s agent is already installed"
    systemctl enable --now k3s-agent
    return
  fi

  log "Checking connectivity to $server_url"
  curl --fail --silent --show-error --insecure --connect-timeout 8 \
    "$server_url/cacerts" >/dev/null || die "cannot reach the K3s API at $server_url"

  local installer_env=(
    "K3S_URL=$server_url"
    "K3S_TOKEN=$token"
    "INSTALL_K3S_CHANNEL=$K3S_CHANNEL"
  )
  [[ -n "$K3S_VERSION" ]] && installer_env+=("INSTALL_K3S_VERSION=$K3S_VERSION")

  local agent_args=(agent "--node-ip" "$node_ip")
  [[ -n "$node_name" ]] && agent_args+=("--node-name" "$node_name")
  for label in "${labels[@]}"; do
    agent_args+=("--node-label" "$label")
  done

  log "Joining $host as a worker"
  curl -fsSL "$K3S_INSTALL_URL" | env "${installer_env[@]}" sh -s - "${agent_args[@]}"
  systemctl enable --now k3s-agent
  log "Worker joined successfully"
}

main() {
  require_root
  require_linux

  local role=${1:-}
  [[ -n "$role" ]] || { usage; exit 2; }
  shift

  local node_ip=""
  local node_name=""
  local server=""
  local token=${K3S_TOKEN:-}
  local labels=()
  K3S_CHANNEL=${K3S_CHANNEL:-stable}
  K3S_VERSION=${K3S_VERSION:-}

  while (($#)); do
    case "$1" in
      --node-ip)
        [[ $# -ge 2 ]] || die "--node-ip needs a value"
        node_ip=$2
        shift 2
        ;;
      --node-name)
        [[ $# -ge 2 ]] || die "--node-name needs a value"
        node_name=$2
        shift 2
        ;;
      --server)
        [[ $# -ge 2 ]] || die "--server needs a value"
        server=$2
        shift 2
        ;;
      --token)
        [[ $# -ge 2 ]] || die "--token needs a value"
        token=$2
        shift 2
        ;;
      --label)
        [[ $# -ge 2 ]] || die "--label needs a value"
        [[ "$2" == *=* ]] || die "labels must use key=value"
        labels+=("$2")
        shift 2
        ;;
      --k3s-version)
        [[ $# -ge 2 ]] || die "--k3s-version needs a value"
        K3S_VERSION=$2
        shift 2
        ;;
      --channel)
        [[ $# -ge 2 ]] || die "--channel needs a value"
        K3S_CHANNEL=$2
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "unknown option: $1 (use --help)"
        ;;
    esac
  done

  case "$role" in
    server)
      [[ -n "$node_ip" ]] || die "server requires --node-ip"
      install_prerequisites
      install_server "$node_ip" "$node_name"
      wait_for_server
      print_join_command "$node_ip"
      ;;
    agent)
      [[ -n "$server" ]] || die "agent requires --server"
      [[ -n "$token" ]] || die "agent requires --token or K3S_TOKEN"
      local server_address
      server_address=$(normalize_server_url "$server")
      [[ -n "$node_ip" ]] || node_ip=$(detect_node_ip "$(server_host "$server_address")")
      ((${#labels[@]})) || labels=("workload=internity")
      install_prerequisites
      install_agent "$server_address" "$token" "$node_ip" "$node_name" "${labels[@]}"
      ;;
    *)
      usage >&2
      die "first argument must be server or agent"
      ;;
  esac
}

main "$@"
