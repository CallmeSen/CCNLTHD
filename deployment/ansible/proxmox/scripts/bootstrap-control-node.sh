#!/usr/bin/env bash
set -euo pipefail

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required on the Ansible control node." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  jq \
  openssh-client \
  python3 \
  python3-pip \
  python3-venv \
  sshpass \
  wget

python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install \
  ansible \
  hvac \
  jsonpatch \
  kubernetes \
  netaddr \
  openshift \
  proxmoxer \
  requests

if ! command -v kubectl >/dev/null 2>&1; then
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  kubectl_version="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  curl -fsSLo "$tmpdir/kubectl" "https://dl.k8s.io/release/${kubectl_version}/bin/linux/amd64/kubectl"
  sudo install -o root -g root -m 0755 "$tmpdir/kubectl" /usr/local/bin/kubectl
fi

if ! command -v helm >/dev/null 2>&1; then
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT
  curl -fsSLo "$tmpdir/get_helm.sh" https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
  chmod 700 "$tmpdir/get_helm.sh"
  "$tmpdir/get_helm.sh"
fi

if ! command -v vault >/dev/null 2>&1; then
  wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" | sudo tee /etc/apt/sources.list.d/hashicorp.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y vault
fi

ansible --version
kubectl version --client=true
helm version
vault version

cat <<'EOF'

Control node bootstrap complete.

Next steps:
  source .venv/bin/activate
  ansible-galaxy install -r requirements.yml
  cp inventories/proxmox.example.yml inventories/proxmox.yml
  cp group_vars/all/vault.yml.example group_vars/all/vault.yml
  ansible-vault encrypt group_vars/all/vault.yml

EOF
