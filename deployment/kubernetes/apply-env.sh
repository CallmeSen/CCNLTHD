#!/bin/sh
set -eu

NAMESPACE="${NAMESPACE:-investadvisor}"
BACKEND_ENV_PATH="${BACKEND_ENV_PATH:-Main_Project/Backend/.env}"
MULTI_AGENTS_ENV_PATH="${MULTI_AGENTS_ENV_PATH:-Main_Project/Backend/multi-agents-service/.env}"
FRONTEND_ENV_PATH="${FRONTEND_ENV_PATH:-Main_Project/Frontend/.env}"
RESTART="${RESTART:-false}"
INGRESS_NAME="${INGRESS_NAME:-investadvisor-ingress}"
LOCAL_INGRESS_ADDRESS="${LOCAL_INGRESS_ADDRESS:-127.0.0.1}"
PATCH_LOCAL_INGRESS_STATUS="${PATCH_LOCAL_INGRESS_STATUS:-auto}"
ARGO_APPLICATION_NAME="${ARGO_APPLICATION_NAME:-investadvisor}"
ARGO_NAMESPACE="${ARGO_NAMESPACE:-argocd}"

dotenv_get() {
  file="$1"
  wanted_key="$2"
  [ -f "$file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      ""|\#*) continue ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"
    [ "$key" = "$wanted_key" ] || continue

    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    printf '%s' "$value"
    return 0
  done < "$file"
  return 0
}

value_or_empty() {
  eval "printf '%s' \"\${$1:-}\""
}

pick_value() {
  key="$1"
  shift

  value="$(value_or_empty "$key")"
  if [ -n "$value" ]; then
    printf '%s' "$value"
    return 0
  fi

  for file in "$@"; do
    value="$(dotenv_get "$file" "$key")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 0
}

required_value() {
  key="$1"
  value="$(value_or_empty "$key")"
  if [ -z "$value" ]; then
    shift
    for file in "$@"; do
      value="$(dotenv_get "$file" "$key")"
      if [ -n "$value" ]; then
        printf '%s' "$value"
        return 0
      fi
    done
    echo "Missing required env value: $key" >&2
    exit 1
  fi
  printf '%s' "$value"
}

annotate_env_resource() {
  kind="$1"
  name="$2"
  kubectl annotate "$kind" "$name" -n "$NAMESPACE" \
    argocd.argoproj.io/sync-options=Prune=false \
    argocd.argoproj.io/compare-options=IgnoreExtraneous \
    --overwrite >/dev/null
  kubectl annotate "$kind" "$name" -n "$NAMESPACE" argocd.argoproj.io/tracking-id- --overwrite >/dev/null 2>&1 || true
}

patch_local_ingress_status() {
  case "$PATCH_LOCAL_INGRESS_STATUS" in
    false|0|no) return 0 ;;
  esac

  context="$(kubectl config current-context 2>/dev/null || true)"
  if [ "$PATCH_LOCAL_INGRESS_STATUS" = "auto" ]; then
    case "$context" in
      kind-*) ;;
      *)
        echo "Skipping local Ingress status patch: context '$context' is not a kind context."
        return 0
        ;;
    esac
  fi

  if ! kubectl get ingress "$INGRESS_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo "Skipping local Ingress status patch: ingress '$INGRESS_NAME' was not found in namespace '$NAMESPACE'."
    return 0
  fi

  existing_address="$(kubectl get ingress "$INGRESS_NAME" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"
  if [ -n "$existing_address" ]; then
    echo "Ingress '$INGRESS_NAME' already has address '$existing_address'."
    return 0
  fi

  patch_file="$(mktemp)"
  printf '%s\n' "{\"status\":{\"loadBalancer\":{\"ingress\":[{\"ip\":\"$LOCAL_INGRESS_ADDRESS\"}]}}}" > "$patch_file"
  kubectl patch ingress "$INGRESS_NAME" -n "$NAMESPACE" --subresource=status --type=merge --patch-file "$patch_file" >/dev/null
  rm -f "$patch_file"
  echo "Patched local kind Ingress '$INGRESS_NAME' status address to $LOCAL_INGRESS_ADDRESS."

  if kubectl get application "$ARGO_APPLICATION_NAME" -n "$ARGO_NAMESPACE" >/dev/null 2>&1; then
    kubectl annotate application "$ARGO_APPLICATION_NAME" -n "$ARGO_NAMESPACE" argocd.argoproj.io/refresh=hard --overwrite >/dev/null
  fi
}

DB_PASSWORD_VALUE="$(pick_value DB_PASSWORD "$BACKEND_ENV_PATH")"
if [ -z "$DB_PASSWORD_VALUE" ]; then
  DB_PASSWORD_VALUE="$(dotenv_get "$BACKEND_ENV_PATH" POSTGRES_PASSWORD)"
fi
if [ -z "$DB_PASSWORD_VALUE" ]; then
  echo "Missing DB_PASSWORD or POSTGRES_PASSWORD" >&2
  exit 1
fi

POSTGRES_MA_PASSWORD_VALUE="$(pick_value POSTGRES_MA_PASSWORD "$BACKEND_ENV_PATH" "$MULTI_AGENTS_ENV_PATH")"
if [ -z "$POSTGRES_MA_PASSWORD_VALUE" ]; then
  POSTGRES_MA_PASSWORD_VALUE="$(dotenv_get "$MULTI_AGENTS_ENV_PATH" POSTGRES_PASSWORD)"
fi
if [ -z "$POSTGRES_MA_PASSWORD_VALUE" ]; then
  POSTGRES_MA_PASSWORD_VALUE="${POSTGRES_PASSWORD:-$DB_PASSWORD_VALUE}"
fi

POSTGRES_USER_VALUE="$(pick_value POSTGRES_USER "$MULTI_AGENTS_ENV_PATH")"
POSTGRES_USER_VALUE="${POSTGRES_USER_VALUE:-user}"
POSTGRES_DB_VALUE="$(pick_value POSTGRES_DB "$MULTI_AGENTS_ENV_PATH")"
POSTGRES_DB_VALUE="${POSTGRES_DB_VALUE:-financial_advisor}"
BACKEND_POSTGRES_USER_VALUE="$(pick_value DB_USERNAME "$BACKEND_ENV_PATH")"
if [ -z "$BACKEND_POSTGRES_USER_VALUE" ]; then
  BACKEND_POSTGRES_USER_VALUE="$(dotenv_get "$BACKEND_ENV_PATH" POSTGRES_USER)"
fi
BACKEND_POSTGRES_USER_VALUE="${BACKEND_POSTGRES_USER_VALUE:-postgres}"
DATABASE_URL_VALUE="postgresql://${POSTGRES_USER_VALUE}:${POSTGRES_MA_PASSWORD_VALUE}@postgres-ma.${NAMESPACE}.svc.cluster.local:5432/${POSTGRES_DB_VALUE}"
JWT_SECRET_VALUE="$(required_value JWT_SECRET "$BACKEND_ENV_PATH")"
SECRET_KEY_VALUE="$(pick_value SECRET_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")"
SECRET_KEY_VALUE="${SECRET_KEY_VALUE:-$JWT_SECRET_VALUE}"
LLM_MAX_TOKENS_VALUE="$(pick_value LLM_MAX_TOKENS "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")"
LLM_MAX_TOKENS_VALUE="${LLM_MAX_TOKENS_VALUE:-4000}"
ACCESS_TOKEN_EXPIRE_MINUTES_VALUE="$(pick_value ACCESS_TOKEN_EXPIRE_MINUTES "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")"
ACCESS_TOKEN_EXPIRE_MINUTES_VALUE="${ACCESS_TOKEN_EXPIRE_MINUTES_VALUE:-30}"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic backend-secrets \
  -n "$NAMESPACE" \
  --from-literal=JWT_SECRET="$JWT_SECRET_VALUE" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD_VALUE" \
  --from-literal=POSTGRES_USER="$BACKEND_POSTGRES_USER_VALUE" \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD_VALUE" \
  --from-literal=POSTGRES_MA_PASSWORD="$POSTGRES_MA_PASSWORD_VALUE" \
  --from-literal=DATABASE_URL="$DATABASE_URL_VALUE" \
  --from-literal=OPENROUTER_API_KEY="$(pick_value OPENROUTER_API_KEY "$BACKEND_ENV_PATH" "$MULTI_AGENTS_ENV_PATH")" \
  --from-literal=OPENAI_API_KEY="$(pick_value OPENAI_API_KEY "$BACKEND_ENV_PATH" "$MULTI_AGENTS_ENV_PATH")" \
  --from-literal=TAVILY_API_KEY="$(pick_value TAVILY_API_KEY "$BACKEND_ENV_PATH" "$MULTI_AGENTS_ENV_PATH")" \
  --from-literal=VNSTOCK_API_KEY="$(pick_value VNSTOCK_API_KEY "$BACKEND_ENV_PATH" "$MULTI_AGENTS_ENV_PATH")" \
  --from-literal=LANGCHAIN_API_KEY="$(pick_value LANGCHAIN_API_KEY "$BACKEND_ENV_PATH" "$MULTI_AGENTS_ENV_PATH")" \
  --dry-run=client -o yaml | kubectl apply -f -
annotate_env_resource secret backend-secrets

kubectl create secret generic multi-agents-secrets \
  -n "$NAMESPACE" \
  --from-literal=DATABASE_URL="$DATABASE_URL_VALUE" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_MA_PASSWORD_VALUE" \
  --from-literal=POSTGRES_USER="$POSTGRES_USER_VALUE" \
  --from-literal=POSTGRES_DB="$POSTGRES_DB_VALUE" \
  --from-literal=OPENROUTER_API_KEY="$(pick_value OPENROUTER_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=OPENAI_API_KEY="$(pick_value OPENAI_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=TAVILY_API_KEY="$(pick_value TAVILY_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=SECRET_KEY="$SECRET_KEY_VALUE" \
  --from-literal=LLM_MAX_TOKENS="$LLM_MAX_TOKENS_VALUE" \
  --from-literal=ACCESS_TOKEN_EXPIRE_MINUTES="$ACCESS_TOKEN_EXPIRE_MINUTES_VALUE" \
  --from-literal=SERPER_API_KEY="$(pick_value SERPER_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=BROWSERLESS_API_KEY="$(pick_value BROWSERLESS_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=SEC_API_API_KEY="$(pick_value SEC_API_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=GROQ_API_KEY="$(pick_value GROQ_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --from-literal=GEMINI_API_KEY="$(pick_value GEMINI_API_KEY "$MULTI_AGENTS_ENV_PATH" "$BACKEND_ENV_PATH")" \
  --dry-run=client -o yaml | kubectl apply -f -
annotate_env_resource secret multi-agents-secrets

kubectl create secret generic mail-secrets \
  -n "$NAMESPACE" \
  --from-literal=MAIL_USERNAME="$(pick_value MAIL_USERNAME "$BACKEND_ENV_PATH")" \
  --from-literal=MAIL_PASSWORD="$(pick_value MAIL_PASSWORD "$BACKEND_ENV_PATH")" \
  --dry-run=client -o yaml | kubectl apply -f -
annotate_env_resource secret mail-secrets

frontend_env_file="$(mktemp)"
trap 'rm -f "$frontend_env_file"' EXIT
env | sort | while IFS='=' read -r key value; do
  case "$key" in
    VITE_*) printf '%s=%s\n' "$key" "$value" ;;
  esac
done > "$frontend_env_file"

if [ -f "$FRONTEND_ENV_PATH" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      VITE_*=*) printf '%s\n' "$line" ;;
    esac
  done < "$FRONTEND_ENV_PATH" >> "$frontend_env_file"
fi

awk -F= '{ values[$1]=$0 } END { for (key in values) print values[key] }' "$frontend_env_file" > "$frontend_env_file.unique"
mv "$frontend_env_file.unique" "$frontend_env_file"

frontend_api_url="$(grep '^VITE_API_URL=' "$frontend_env_file" | tail -n 1 | sed 's/^VITE_API_URL=//')"
case "$frontend_api_url" in
  http://localhost*|https://localhost*|http://127.0.0.1*|https://127.0.0.1*)
    printf '%s\n' "LOCAL_VITE_API_URL_FROM_ENV=$frontend_api_url" >> "$frontend_env_file"
    sed -i '/^VITE_API_URL=/d' "$frontend_env_file"
    printf '%s\n' 'VITE_API_URL=/api' >> "$frontend_env_file"
    ;;
esac

if ! grep -q '^VITE_API_URL=' "$frontend_env_file"; then
  printf '%s\n' 'VITE_API_URL=/api' >> "$frontend_env_file"
fi
if ! grep -q '^VITE_MOCK_API=' "$frontend_env_file"; then
  printf '%s\n' 'VITE_MOCK_API=false' >> "$frontend_env_file"
fi

kubectl create secret generic frontend-env \
  -n "$NAMESPACE" \
  --from-env-file "$frontend_env_file" \
  --dry-run=client -o yaml | kubectl apply -f -
annotate_env_resource secret frontend-env
patch_local_ingress_status

echo "Applied Kubernetes env resources from environment/.env files. Values hidden."
kubectl get secret backend-secrets multi-agents-secrets mail-secrets frontend-env -n "$NAMESPACE"

if [ "$RESTART" = "true" ]; then
  kubectl rollout restart statefulset/postgres-ma -n "$NAMESPACE"
  kubectl rollout restart deployment/frontend -n "$NAMESPACE"
  kubectl rollout restart deployment/api-gateway deployment/user-service deployment/market-data-service deployment/portfolio-service deployment/notification-service deployment/multi-agents-service -n "$NAMESPACE"
fi
