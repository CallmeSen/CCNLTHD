#!/bin/sh
set -eu

RELEASE_NAME="${RELEASE_NAME:-external-secrets}"
CHART_NAME="${CHART_NAME:-external-secrets/external-secrets}"
CHART_VERSION="${CHART_VERSION:-2.4.1}"
CHART_REPO_NAME="${CHART_REPO_NAME:-external-secrets}"
CHART_REPO_URL="${CHART_REPO_URL:-https://charts.external-secrets.io}"
HASHICORP_CHART_REPO_NAME="${HASHICORP_CHART_REPO_NAME:-hashicorp}"
HASHICORP_CHART_REPO_URL="${HASHICORP_CHART_REPO_URL:-https://helm.releases.hashicorp.com}"
EXTERNAL_SECRETS_NAMESPACE="${EXTERNAL_SECRETS_NAMESPACE:-external-secrets}"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-vault}"
TIMEOUT="${TIMEOUT:-5m}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' was not found in PATH." >&2
    exit 1
  fi
}

require_command helm
require_command kubectl

helm repo add "$CHART_REPO_NAME" "$CHART_REPO_URL" --force-update
helm repo add "$HASHICORP_CHART_REPO_NAME" "$HASHICORP_CHART_REPO_URL" --force-update
helm repo update

kubectl create namespace "$VAULT_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install "$RELEASE_NAME" "$CHART_NAME" \
  --version "$CHART_VERSION" \
  --namespace "$EXTERNAL_SECRETS_NAMESPACE" \
  --create-namespace \
  --set installCRDs=true \
  --wait \
  --timeout "$TIMEOUT"

kubectl get namespace "$EXTERNAL_SECRETS_NAMESPACE" "$VAULT_NAMESPACE"
kubectl get pods -n "$EXTERNAL_SECRETS_NAMESPACE"
helm status "$RELEASE_NAME" -n "$EXTERNAL_SECRETS_NAMESPACE"
