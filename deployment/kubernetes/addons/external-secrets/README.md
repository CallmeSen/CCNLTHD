# External Secrets Addon

This folder bootstraps External Secrets Operator with Helm and creates the
`vault` namespace used by the planned Vault integration.

Run from the repository root on Windows:

```powershell
.\deployment\kubernetes\addons\external-secrets\install-external-secrets.ps1
```

Run from the repository root on Linux/macOS or GitLab runners:

```sh
sh deployment/kubernetes/addons/external-secrets/install-external-secrets.sh
```

The scripts add the External Secrets and HashiCorp Helm repositories, install
the `external-secrets/external-secrets` Helm chart version `2.4.1` from
`https://charts.external-secrets.io` with `installCRDs=true`, create the
`external-secrets` release namespace, and create the `vault` namespace. The
HashiCorp repository is added as `hashicorp` from
`https://helm.releases.hashicorp.com` for the later Vault install step.

Verify the addon:

```sh
kubectl get ns external-secrets vault
kubectl get pods -n external-secrets
kubectl get crd | grep external-secrets
helm status external-secrets -n external-secrets
helm search repo hashicorp/vault
```

For ArgoCD-managed installs, apply the Helm Application first:

```sh
kubectl apply -f deployment/kubernetes/argocd-external-secrets-application.yaml
```

Then sync the `investadvisor` application overlay. The dev and prod overlays
create `ClusterSecretStore` and `ExternalSecret` resources that read these Vault
KV v2 paths:

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

The Vault Kubernetes auth roles must be named `investadvisor-dev` and
`investadvisor-prod`, bound to the `external-secrets/external-secrets` service
account, and allow the `vault` audience.

Each ExternalSecret extracts all keys from its matching Vault path, so keep the
`frontend` paths limited to intended `VITE_*` values.
