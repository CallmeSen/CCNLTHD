# Proxmox Ansible Scaffold

This folder bootstraps a small K3s cluster on Proxmox from an Ubuntu LXC
Ansible control node.

The intended flow is:

1. Create an Ubuntu LXC on Proxmox manually for the Ansible control node.
2. Run `scripts/bootstrap-control-node.sh` inside this folder on that LXC.
3. Copy the example inventory and vault files to local, ignored files.
4. Encrypt `group_vars/all/vault.yml` with `ansible-vault`.
5. Run the playbooks to clone K3s VMs, install K3s, install ingress-nginx,
   bootstrap ArgoCD, create GitLab image pull secrets, and seed dev secrets
   into HashiCorp Vault.

## GitHub-Safe Files

Commit these files:

- `inventories/proxmox.example.yml`
- `group_vars/all.yml`
- `group_vars/all/vault.yml.example`
- playbooks, scripts, and this README

Do not commit these files:

- `inventories/proxmox.yml`
- `group_vars/all/vault.yml`
- `.vault-pass`
- private SSH keys
- generated kubeconfigs under `artifacts/`

The root `.gitignore` already excludes those files.

## Control Node Bootstrap

On the Ubuntu LXC control node:

```bash
cd deployment/ansible/proxmox
chmod +x scripts/bootstrap-control-node.sh
./scripts/bootstrap-control-node.sh
source .venv/bin/activate
ansible-galaxy install -r requirements.yml
```

## Local Configuration

Create local files from examples:

```bash
cp inventories/proxmox.example.yml inventories/proxmox.yml
cp group_vars/all/vault.yml.example group_vars/all/vault.yml
```

Edit `inventories/proxmox.yml` with real Proxmox host, node, storage, bridge,
VM IDs, static IP addresses, and disk resize value. The example uses
`vm_disk_resize: +60G`, intended for a 20G template disk to end at roughly 80G.

Edit `group_vars/all/vault.yml` with real secrets, then encrypt it:

```bash
ansible-vault encrypt group_vars/all/vault.yml
```

For non-interactive local runs, create a local vault password file:

```bash
printf '%s\n' 'your-local-vault-password' > .vault-pass
chmod 600 .vault-pass
```

`.vault-pass` is ignored by Git.

## Run

Check inventory:

```bash
ansible-inventory -i inventories/proxmox.yml --list --ask-vault-pass
```

Run the full flow:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/site.yml --ask-vault-pass
```

Or with a local ignored vault password file:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/site.yml --vault-password-file .vault-pass
```

You can also run individual playbooks:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/provision_vms.yml --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/install_ingress_nginx.yml --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/create_registry_secret.yml --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/bootstrap_argocd.yml --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/seed_hashicorp_vault.yml --ask-vault-pass
```

## Verify

After the playbooks run:

```bash
export KUBECONFIG=artifacts/k3s.kubeconfig
kubectl get nodes
kubectl get pods -A
kubectl get ingressclass
kubectl get applications -n argocd
kubectl get externalsecrets -n investadvisor
```

## Notes

- Proxmox must already have an Ubuntu cloud-init template.
- The playbooks use placeholders in `proxmox.example.yml`; replace them in the
  ignored `proxmox.yml`.
- K3s disables Traefik because the repository Kubernetes manifests use
  `ingressClassName: nginx`.
- ArgoCD keeps using the current GitLab repo URL from the Kubernetes manifests.
- HashiCorp Vault dev mode is suitable only for homelab/dev experiments.
