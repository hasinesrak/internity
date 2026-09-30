#!/usr/bin/env bash
# Create the internity namespace secret from the local env files.
# Run this on the Ubuntu VM, from any directory:
#   bash infra/scripts/apply-cluster-env.sh
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

if command -v kubectl >/dev/null 2>&1; then
  kctl=(kubectl)
elif command -v k3s >/dev/null 2>&1; then
  kctl=(sudo k3s kubectl)
else
  echo "kubectl is not on this machine. Run this script on the Ubuntu VM." >&2
  exit 1
fi

declare -A env=()

load() {
  local file=$1
  [[ -f $file ]] || return 0
  local line key val
  while IFS= read -r line || [[ -n $line ]]; do
    line=${line%$'\r'}
    [[ $line =~ ^[[:space:]]*# ]] && continue
    [[ $line =~ ^[[:space:]]*$ ]] && continue
    [[ $line =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    key=${line%%=*}
    val=${line#*=}
    if [[ $val == \"*\" && $val == *\" ]]; then
      val=${val:1:${#val}-2}
    elif [[ $val == \'*\' && $val == *\' ]]; then
      val=${val:1:${#val}-2}
    fi
    # A later file fills a key only when its value is set.
    [[ -n $val ]] && env[$key]=$val
  done <"$file"
}

load .env
load apps/backend/.env
load apps/staff/.env

require() {
  local key=$1
  if [[ -z ${env[$key]:-} ]]; then
    echo "Set $key in .env or apps/backend/.env, then run this script again." >&2
    exit 1
  fi
}

require JWT_SECRET
require STAFF_ALLOWED_IPS

if ((${#env[JWT_SECRET]} < 32)); then
  echo "JWT_SECRET must be at least 32 characters." >&2
  exit 1
fi

if [[ -n ${env[ADMIN_PASSWORD]:-} ]]; then
  if ((${#env[ADMIN_PASSWORD]} < 8)) || [[ ! ${env[ADMIN_PASSWORD]} =~ [A-Za-z] ]] || [[ ! ${env[ADMIN_PASSWORD]} =~ [0-9] ]]; then
    echo "ADMIN_PASSWORD must be at least 8 characters and include a letter and a number." >&2
    exit 1
  fi
fi

# Compose uses localhost. Pods reach Mongo through the mongo Service.
mongo_uri=${env[MONGODB_URI]:-mongodb://mongo:27017/internity}
mongo_uri=${mongo_uri//:\/\/127.0.0.1/:\/\/mongo}
mongo_uri=${mongo_uri//:\/\/localhost/:\/\/mongo}

tmp=$(mktemp)
ns=$(mktemp)
sec=$(mktemp)
chmod 600 "$tmp" "$ns" "$sec"
trap 'rm -f "$tmp" "$ns" "$sec"' EXIT

emit() {
  local key=$1
  local val=$2
  [[ -n $val ]] || return 0
  printf '%s=%s\n' "$key" "$val" >>"$tmp"
}

emit MONGODB_URI "$mongo_uri"
emit JWT_SECRET "${env[JWT_SECRET]}"
emit STAFF_ALLOWED_IPS "${env[STAFF_ALLOWED_IPS]}"
emit ADMIN_NAME "${env[ADMIN_NAME]:-}"
emit ADMIN_EMAIL "${env[ADMIN_EMAIL]:-}"
emit ADMIN_PASSWORD "${env[ADMIN_PASSWORD]:-}"
emit RESEND_API_KEY "${env[RESEND_API_KEY]:-}"
emit RESEND_FROM_EMAIL "${env[RESEND_FROM_EMAIL]:-}"
emit GROQ_API_KEY "${env[GROQ_API_KEY]:-}"

echo "Writing secret internity-secrets from the env files. Keys:"
cut -d= -f1 "$tmp"

"${kctl[@]}" create namespace internity --dry-run=client -o yaml >"$ns"
"${kctl[@]}" apply -f "$ns"
"${kctl[@]}" -n internity create secret generic internity-secrets \
  --from-env-file="$tmp" \
  --dry-run=client -o yaml >"$sec"
"${kctl[@]}" apply -f "$sec"

echo "Secret internity-secrets is applied in namespace internity."
