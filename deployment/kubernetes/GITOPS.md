# GitOps Source Of Truth

This deployment folder is the desired state for Kubernetes. ArgoCD should own
the cluster state by syncing these declarative files from Git.

## Declared In Git

- Application workloads, services, ingress, config maps, jobs, KEDA, VPA, and
  monitoring resources are declared through the Kustomize base and overlays.
- External Secrets Operator is declared as the ArgoCD Helm Application in
  `argocd-external-secrets-application.yaml`.
- Local/dev Vault can be declared as the ArgoCD Helm Application in
  `argocd-vault-dev-application.yaml`.
- Local/dev Vault auth, policies, and roles can be bootstrapped by
  `argocd-vault-dev-bootstrap-application.yaml`.
- Vault auth integration is declared through the token review RBAC,
  `ClusterSecretStore`, and `ExternalSecret` resources.
- Runtime Kubernetes Secrets are declared indirectly through ExternalSecret
  resources. ArgoCD applies the ExternalSecret; ESO creates the Kubernetes
  Secret.
- The root ArgoCD app-of-apps is declared in
  `argocd-platform-application.yaml`, and it syncs the child Applications from
  `deployment/kubernetes/kustomization.yaml`.

## Not Stored In Git

Actual secret values are not committed to Git. The source of truth for runtime
secret values is Vault KV v2:

```text
secret/investadvisor/dev/backend
secret/investadvisor/dev/multi-agents
secret/investadvisor/dev/mail
secret/investadvisor/dev/frontend

secret/investadvisor/prod/backend
secret/investadvisor/prod/multi-agents
secret/investadvisor/prod/mail
secret/investadvisor/prod/frontend
```

The repository stores only the Vault paths, roles, and Kubernetes resources
needed to read those paths. Plain `.env` files stay local and are ignored by
Git.

## Bootstrap Order

After ArgoCD itself exists, bootstrap the root app once:

```sh
kubectl apply -f deployment/kubernetes/argocd-platform-application.yaml
```

The root app syncs the child Applications from `deployment/kubernetes`.
Those child Applications use sync waves to encode the order:

```text
vault dev/local -> vault auth bootstrap -> external-secrets -> investadvisor workloads
```

For production, replace `argocd-vault-dev-application.yaml` with a hardened
Vault deployment or external Vault IaC, and replace the dev bootstrap job with
production Vault policy/auth IaC. Do not use Vault dev mode for production.

## Secret Flow

```text
Git ExternalSecret -> ArgoCD sync -> ESO reconciles -> Vault KV v2 read -> Kubernetes Secret -> Deployment envFrom
```

The Kubernetes Secrets managed this way are:

```text
backend-secrets
multi-agents-secrets
mail-secrets
frontend-env
```

Do not use the legacy `apply-env.*` scripts in the ArgoCD flow. They are kept
only as an emergency/local migration helper and should not overwrite Secrets
managed by ESO. The disabled GitLab `deploy:secrets` flow must stay disabled for
Kubernetes/ArgoCD deployments.

The Vault bootstrap job configures the KV mount, Kubernetes auth mount,
environment policies, Vault roles, and the dev TokenReview RBAC for the Vault
ServiceAccount. It does not write real app secret values; those values remain
in Vault and must be loaded through an approved secret management process.

## Verification

```sh
kubectl get application investadvisor-platform vault external-secrets investadvisor -n argocd
kubectl get clustersecretstore investadvisor-vault
kubectl get externalsecrets -n investadvisor
kubectl get secret backend-secrets multi-agents-secrets mail-secrets frontend-env -n investadvisor
```
