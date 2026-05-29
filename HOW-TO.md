# HOW-TO: Setup Proxmox + Ansible + K3s

Hướng dẫn này ghi lại cách dựng K3s cluster trên Proxmox bằng Ansible trong repo này.

Mô hình đang dùng:

- Proxmox host: `pve`
- Proxmox API/IP: `192.168.0.203`
- Proxmox bridge: `vmbr0`
- Gateway LAN: `192.168.0.1`
- Cloud-init template name: `ubuntu-cloud`
- K3s server VM: `ia-k3s-server-01`, VMID `301`, IP `192.168.0.211`
- K3s agent VM: `ia-k3s-agent-01`, VMID `302`, IP `192.168.0.212`
- Ansible control node: Ubuntu LXC tên `ansible-control`

Quan trọng: không chạy các bước Ansible trong Git Bash Windows. Chạy Ansible trong Ubuntu LXC `ansible-control`, hoặc WSL Ubuntu. Với homelab này, ưu tiên Ubuntu LXC trong Proxmox.

Trạng thái hiện tại sau khi xử lý các lỗi setup:

- Template `ubuntu-cloud` đã tạo lại đúng bằng `qm importdisk`.
- Ansible control node chạy trong LXC `ansible-control`.
- `provision_vms.yml` đã clone/config VM `301` và `302`.
- SSH từ `ansible-control` vào VM bằng user `ubuntu` đã hoạt động sau khi cập nhật đúng SSH public key trong vault.
- `install_k3s.yml` đã cài K3s thành công: `ia-k3s-server-01` và `ia-k3s-agent-01` đều `Ready`.
- Traefik đã được disable, chỉ còn `coredns`, `local-path-provisioner`, `metrics-server` trong `kube-system`.
- `ingress-nginx` đã cài thành công, ingress class `nginx` tồn tại, LoadBalancer nhận IP `192.168.0.211,192.168.0.212`.
- GitLab registry pull secret đã tạo.
- ArgoCD đã cài thành công; `investadvisor-platform`, `vault`, `vault-dev-bootstrap` healthy; `external-secrets` đang `Degraded`, `investadvisor` đang `OutOfSync`.
- Bước tiếp theo là debug `external-secrets`, rồi seed HashiCorp Vault secrets.

## 1. Tạo Ubuntu Cloud-init Template Đúng Cách

Chạy các lệnh này trên **Proxmox host shell**, tức là shell của node `pve`.

Không attach file cloud image như CD-ROM. Nếu template chỉ hiện `ide2: ... img,media=cdrom` và `scsi0: ... cloudinit,media=cdrom` thì template đó sai vì không có ổ cứng boot thật.

### 1.1. Xóa VM clone lỗi nếu có

Nếu đã clone ra VM `301` và `302` nhưng bị lỗi resize CD-ROM, xóa chúng:

```bash
qm stop 301 || true
qm stop 302 || true
qm destroy 301 || true
qm destroy 302 || true
```

### 1.2. Xóa template sai nếu có

Tìm VMID của template:

```bash
qm list | grep ubuntu-cloud
```

Nếu template sai là VMID `9000`, xóa:

```bash
qm destroy 9000
```

### 1.3. Tạo lại template `ubuntu-cloud`

Chạy trên Proxmox host:

```bash
cd /root
wget -O noble-server-cloudimg-amd64.img https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

qm create 9000 \
  --name ubuntu-cloud \
  --memory 2048 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0

qm importdisk 9000 /root/noble-server-cloudimg-amd64.img local-lvm

qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0
qm set 9000 --ide2 local-lvm:cloudinit
qm set 9000 --boot c --bootdisk scsi0
qm set 9000 --serial0 socket --vga serial0
qm set 9000 --agent enabled=1

qm template 9000
```

### 1.4. Kiểm tra template

```bash
qm config 9000 | grep -E '^(scsi|sata|virtio|ide)[0-9]:'
```

Kết quả đúng phải có ổ cứng thật ở `scsi0`, ví dụ:

```text
scsi0: local-lvm:vm-9000-disk-0,size=...
ide2: local-lvm:vm-9000-cloudinit,media=cdrom
```

Nếu chỉ thấy CD-ROM/cloudinit và không có disk thật thì quay lại bước tạo template.

## 2. Tạo API Token Trên Proxmox

Làm trong Proxmox GUI:

```text
Datacenter -> Permissions -> API Tokens -> Add
```

Điền:

```text
User: root@pam
Token ID: ansible
Privilege Separation: bỏ tick cho lab đơn giản
```

Sau khi tạo xong, copy `Secret`. Secret chỉ hiện một lần.

Trong file vault sau này sẽ dùng:

```yaml
vault_proxmox_api_user: "root@pam"
vault_proxmox_api_token_id: "ansible"
vault_proxmox_api_token_secret: "SECRET_VUA_COPY"
```

## 3. Tạo Ubuntu LXC Làm Ansible Control Node

Làm trong Proxmox GUI.

Tải Ubuntu CT template:

```text
pve -> local -> CT Templates -> Templates -> ubuntu-24.04-standard
```

Tạo container:

```text
Create CT
Hostname: ansible-control
Password: đặt password root
Unprivileged container: có thể tick
Disk: 16G hoặc hơn
CPU: 2 cores
Memory: 2048 MB hoặc hơn
Network: vmbr0
IPv4: DHCP hoặc static trong mạng 192.168.0.0/24
Gateway: 192.168.0.1
DNS domain: homedell.local
DNS servers: 192.168.0.1 1.1.1.1
```

Start LXC rồi vào:

```text
ansible-control -> Console
```

Từ đây trở đi, các lệnh ở mục 4 trở xuống chạy trong LXC `ansible-control`, không chạy trên Proxmox host.

## 4. Clone Repo Vào Ansible Control Node

Trong LXC `ansible-control`:

```bash
apt update
apt install -y git
```

Clone repo:

```bash
cd /root
git clone <URL_REPO_CUA_BAN> CCNLTHD
cd /root/CCNLTHD/deployment/ansible/proxmox
```

Nếu repo private thì clone bằng SSH key hoặc Git token.

## 5. Bootstrap Ansible Control Node

Chạy trong thư mục:

```bash
cd /root/CCNLTHD/deployment/ansible/proxmox
```

Cài tool cần thiết:

```bash
chmod +x scripts/bootstrap-control-node.sh
./scripts/bootstrap-control-node.sh
```

Kích hoạt Python virtualenv:

```bash
source .venv/bin/activate
```

Cài Ansible roles/collections:

```bash
ansible-galaxy install -r requirements.yml
```

Kiểm tra:

```bash
ansible --version
ansible-vault --version
```

Nếu `ansible-vault` báo command not found, thường là chưa chạy `source .venv/bin/activate`.

## 6. Chuẩn Bị File Config

Trong thư mục:

```bash
cd /root/CCNLTHD/deployment/ansible/proxmox
```

Tạo file local nếu chưa có:

```bash
cp inventories/proxmox.example.yml inventories/proxmox.yml
mkdir -p inventories/group_vars/all
cp inventories/group_vars/all/vault.yml.example inventories/group_vars/all/vault.yml
```

Nếu trước đó đã lỡ tạo vault ở đường dẫn cũ `group_vars/all/vault.yml`, chỉ dùng nó để copy secret sang đúng chỗ một lần. Sau khi xác nhận `inventories/group_vars/...` chạy ổn, xóa folder cũ `group_vars/` để khỏi sửa nhầm.

Đường dẫn vault đúng khi chạy với `-i inventories/proxmox.yml` là:

```text
deployment/ansible/proxmox/inventories/group_vars/all/vault.yml
```

## 7. Sửa Inventory `proxmox.yml`

Mở file:

```bash
nano inventories/proxmox.yml
```

Cấu hình mẫu đang dùng:

```yaml
---
all:
  vars:
    ansible_user: "{{ vault_vm_ciuser }}"
    ansible_ssh_private_key_file: "{{ vault_vm_ssh_private_key_file }}"
    ansible_python_interpreter: /usr/bin/python3

    proxmox_api_host: 192.168.0.203
    proxmox_api_user: "{{ vault_proxmox_api_user }}"
    proxmox_api_token_id: "{{ vault_proxmox_api_token_id }}"
    proxmox_api_token_secret: "{{ vault_proxmox_api_token_secret }}"
    proxmox_validate_certs: false
    proxmox_node: pve
    proxmox_template: ubuntu-cloud
    proxmox_storage: local-lvm
    proxmox_disk_format: raw
    proxmox_bridge: vmbr0

    vm_gateway: 192.168.0.1
    vm_nameservers:
      - 192.168.0.1
      - 1.1.1.1
    vm_searchdomains:
      - homedell.local
    vm_disk_name: scsi0
    vm_disk_resize: +60G
    vm_default_cores: 4
    vm_default_memory: 8192

  children:
    k3s_server:
      hosts:
        ia-k3s-server-01:
          ansible_host: 192.168.0.211
          proxmox_vmid: 301
          vm_ip_cidr: 192.168.0.211/24
          vm_cores: 4
          vm_memory: 8192
          vm_disk_resize: +60G
          k3s_control_node: true

    k3s_agent:
      hosts:
        ia-k3s-agent-01:
          ansible_host: 192.168.0.212
          proxmox_vmid: 302
          vm_ip_cidr: 192.168.0.212/24
          vm_cores: 4
          vm_memory: 8192
          vm_disk_resize: +60G
          k3s_control_node: false

    k3s_cluster:
      children:
        k3s_server:
        k3s_agent:
```

Lưu ý:

- `proxmox_api_host` nên dùng IP `192.168.0.203` cho chắc. Nếu dùng `pve.homedell.local` mà LXC không resolve được thì playbook sẽ lỗi.
- `proxmox_template` phải đúng tên template trên Proxmox, hiện là `ubuntu-cloud`.
- `vm_disk_name` phải là disk thật của VM, hiện template đúng sẽ dùng `scsi0`.
- IP `192.168.0.211` và `192.168.0.212` phải chưa bị thiết bị khác dùng.

## 8. Sửa Vault Secrets

Mở file:

```bash
nano inventories/group_vars/all/vault.yml
```

Điền các giá trị chính:

```yaml
vault_proxmox_api_user: "root@pam"
vault_proxmox_api_token_id: "ansible"
vault_proxmox_api_token_secret: "SECRET_VUA_COPY_TU_PROXMOX"

vault_vm_ciuser: "ubuntu"
vault_vm_ssh_private_key_file: "~/.ssh/id_ed25519"
vault_vm_ssh_public_key: "ssh-ed25519 PUBLIC_KEY_CUA_ANSIBLE_CONTROL ansible-control"
```

Nếu chưa có SSH key trong LXC:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Copy output của `cat ~/.ssh/id_ed25519.pub` vào `vault_vm_ssh_public_key`.

Các giá trị GitLab/OpenAI/Vault app secrets có thể để `CHANGEME` nếu hiện tại chỉ muốn test tạo VM và cài K3s. Trước khi chạy các bước registry/ArgoCD/app secrets thì phải điền thật.

## 9. Encrypt Vault

Chạy:

```bash
ansible-vault encrypt inventories/group_vars/all/vault.yml
```

Đặt một password dễ nhớ. Mỗi lần chạy playbook có `--ask-vault-pass`, nhập password này.

Nếu cần sửa vault sau khi encrypt:

```bash
ansible-vault edit inventories/group_vars/all/vault.yml
```

## 10. Kiểm Tra Inventory

Chạy:

```bash
ansible-inventory -i inventories/proxmox.yml --list --ask-vault-pass
```

Nếu inventory đúng, command sẽ in ra JSON/YAML và không báo undefined variable.

Nếu báo:

```text
'vault_vm_ciuser' is undefined
```

thì vault đang đặt sai chỗ. Kiểm tra file này có tồn tại không:

```bash
ls inventories/group_vars/all/vault.yml
```

## 11. Clone Và Cấu Hình VM Từ Template

Chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/provision_vms.yml --ask-vault-pass
```

Playbook này sẽ:

- clone template `ubuntu-cloud` thành VM `301` và `302`
- set CPU/RAM
- set network bridge `vmbr0`
- set static IP qua cloud-init
- inject SSH public key
- resize disk
- start VM
- wait SSH port `22`

Nếu bị lỗi:

```text
you can't resize a cdrom
```

thì template sai hoặc `vm_disk_name` sai. Kiểm tra trên Proxmox host:

```bash
qm config 301 | grep -E '^(scsi|sata|virtio|ide)[0-9]:'
```

Dòng đúng phải là disk thật, không có `media=cdrom`. Ví dụ đúng:

```text
scsi0: local-lvm:vm-301-disk-0,size=...
```

Nếu VM chỉ có CD-ROM/cloudinit thì quay lại bước 1 tạo lại template.

## 12. Test SSH Vào VM

Sau khi provision thành công, trong LXC `ansible-control` chạy:

```bash
ssh ubuntu@192.168.0.211
exit
ssh ubuntu@192.168.0.212
exit
```

Nếu SSH hỏi confirm fingerprint thì nhập `yes`.

Nếu SSH không vào được:

- kiểm tra VM đã start chưa trong Proxmox GUI
- kiểm tra IP trong tab Summary của VM
- kiểm tra cloud-init đã set đúng SSH key chưa
- kiểm tra `vault_vm_ssh_private_key_file` đang trỏ đúng `~/.ssh/id_ed25519`

Nếu báo host key đổi sau khi xóa/tạo lại VM:

```text
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
```

Xóa key cũ trên LXC `ansible-control`:

```bash
ssh-keygen -f '/root/.ssh/known_hosts' -R '192.168.0.211'
ssh-keygen -f '/root/.ssh/known_hosts' -R '192.168.0.212'
```

Sau đó SSH lại và nhập `yes` khi được hỏi fingerprint.

Nếu báo:

```text
Permission denied (publickey).
```

thì key trong cloud-init chưa khớp với private key trên LXC. Lấy public key đúng:

```bash
cat ~/.ssh/id_ed25519.pub
```

Sửa vault bằng `nano` thay vì Vim:

```bash
EDITOR=nano ansible-vault edit inventories/group_vars/all/vault.yml
```

Đặt:

```yaml
vault_vm_ssh_private_key_file: "~/.ssh/id_ed25519"
vault_vm_ssh_public_key: "ssh-ed25519 PUBLIC_KEY_CUA_ANSIBLE_CONTROL ansible-control"
```

Sau đó xóa VM `301`/`302`, provision lại để cloud-init nhận key mới.

## 13. Cài K3s

Trước khi chạy, kiểm tra `inventories/group_vars/all.yml` có các biến become cho role K3s:

```yaml
k3s_become: true
k3s_become_for_all: true
k3s_become_for_install_dir: true
k3s_become_for_package_install: true
k3s_become_for_usr_local_bin: true
```

Chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass
```

Sau khi xong, kubeconfig sẽ được fetch về:

```text
deployment/ansible/proxmox/artifacts/k3s.kubeconfig
```

Kiểm tra cluster:

```bash
export KUBECONFIG=artifacts/k3s.kubeconfig
kubectl get nodes
```

Kết quả mong muốn:

```text
ia-k3s-server-01   Ready
ia-k3s-agent-01    Ready
```

Nếu chỉ thấy `ia-k3s-server-01` mà không thấy `ia-k3s-agent-01`, đừng cài ingress vội. Kiểm tra agent từ LXC:

```bash
ansible -i inventories/proxmox.yml k3s_agent -m shell -a 'systemctl status k3s-agent --no-pager -l || true' --become --ask-vault-pass
ansible -i inventories/proxmox.yml k3s_agent -m shell -a 'journalctl -u k3s-agent -n 120 --no-pager || true' --become --ask-vault-pass
```

Kiểm tra agent có nhìn được API server không:

```bash
ansible -i inventories/proxmox.yml k3s_agent -m shell -a 'curl -k https://192.168.0.211:6443/readyz || true' --ask-vault-pass
```

Sau khi sửa lỗi agent, kiểm tra lại:

```bash
kubectl get nodes -o wide
```

Nếu agent có `k3s.service` nhưng không có `k3s-agent.service`, nghĩa là agent đã bị cài nhầm thành standalone server do thiếu biến `k3s_build_cluster`/`k3s_registration_address` lúc chạy role. Kiểm tra:

```bash
ansible-inventory -i inventories/proxmox.yml --host ia-k3s-agent-01 --ask-vault-pass
ansible -i inventories/proxmox.yml k3s_agent -m shell -a 'systemctl list-unit-files | grep k3s || true' --become --ask-vault-pass
```

Nếu inventory không có `k3s_build_cluster` và `k3s_registration_address`, đảm bảo file này tồn tại:

```bash
ls inventories/group_vars/all.yml
```

Nếu thiếu thì tạo lại từ nội dung mẫu trong repo hoặc từ phần cấu hình ở mục 13. Không dùng lại folder cũ `group_vars/` làm nguồn chính nữa.

Sau đó gỡ K3s bị cài sai trên agent rồi chạy lại:

```bash
ansible -i inventories/proxmox.yml k3s_agent -m shell -a '/usr/local/bin/k3s-uninstall.sh || true; /usr/local/bin/k3s-agent-uninstall.sh || true' --become --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass
```

Nếu server cũng đã bị cài với Traefik dù muốn dùng ingress-nginx, có thể gỡ sạch cả cluster rồi cài lại:

```bash
ansible -i inventories/proxmox.yml k3s_cluster -m shell -a '/usr/local/bin/k3s-uninstall.sh || true; /usr/local/bin/k3s-agent-uninstall.sh || true' --become --ask-vault-pass
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass
```

## 14. Cài Ingress Nginx

Chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_ingress_nginx.yml --ask-vault-pass
```

Kiểm tra:

```bash
export KUBECONFIG=artifacts/k3s.kubeconfig
kubectl get pods -n ingress-nginx
kubectl get ingressclass
```

## 15. Tạo GitLab Registry Pull Secret

## 15. Cài Platform CRDs Cho App

App manifests có dùng KEDA, VPA, và Prometheus Operator `ServiceMonitor`. Cài các platform CRD này trước khi sync `investadvisor`:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_platform_crds.yml --ask-vault-pass
```

Verify:

```bash
kubectl get crd scaledobjects.keda.sh
kubectl get crd triggerauthentications.keda.sh
kubectl get crd verticalpodautoscalers.autoscaling.k8s.io
kubectl get crd servicemonitors.monitoring.coreos.com
kubectl get pods -n keda
kubectl get pods -n monitoring
kubectl get pods -n kube-system | grep vpa
```

## 16. Tạo GitLab Registry Pull Secret

Trước bước này, sửa vault:

```bash
ansible-vault edit inventories/group_vars/all/vault.yml
```

Điền:

```yaml
vault_gitlab_registry_username: "USERNAME_GITLAB"
vault_gitlab_registry_token: "GITLAB_TOKEN"
```

Chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/create_registry_secret.yml --ask-vault-pass
```

Kiểm tra:

```bash
export KUBECONFIG=artifacts/k3s.kubeconfig
kubectl get secret gitlab-registry -n investadvisor
```

## 17. Cài ArgoCD

Nếu repo GitLab public, giữ:

```yaml
argocd_repo_private: false
```

Nếu repo private, sửa trong `inventories/group_vars/all.yml`:

```yaml
argocd_repo_private: true
```

và điền vault:

```yaml
vault_argocd_repo_username: "USERNAME_GITLAB"
vault_argocd_repo_token: "GITLAB_TOKEN"
```

Chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/bootstrap_argocd.yml --ask-vault-pass
```

Kiểm tra:

```bash
export KUBECONFIG=artifacts/k3s.kubeconfig
kubectl get pods -n argocd
kubectl get applications -n argocd
```

## 18. Seed Secrets Vào HashiCorp Vault

Chỉ chạy bước này sau khi manifests trong cluster đã deploy Vault dev pod.

Sửa vault:

```bash
ansible-vault edit inventories/group_vars/all/vault.yml
```

Điền các secret app:

```yaml
vault_app_secrets:
  backend:
    DB_PASSWORD: "..."
    JWT_SECRET: "..."
    VNSTOCK_API_KEY: "..."
    POSTGRES_MA_PASSWORD: "..."
  multi_agents:
    DATABASE_URL: "..."
    OPENROUTER_API_KEY: "..."
    OPENAI_API_KEY: "..."
    TAVILY_API_KEY: "..."
    SECRET_KEY: "..."
  mail:
    MAIL_USERNAME: "..."
    MAIL_PASSWORD: "..."
  frontend:
    VITE_API_URL: "/api"
```

Chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/seed_hashicorp_vault.yml --ask-vault-pass
```

Kiểm tra:

```bash
export KUBECONFIG=artifacts/k3s.kubeconfig
kubectl get externalsecrets -n investadvisor
```

## 19. Chạy Full Flow Một Lần

Khi mọi thứ đã ổn, có thể chạy full:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/site.yml --ask-vault-pass
```

Nếu đang setup lần đầu và còn debug, nên chạy từng playbook như các bước trên để dễ bắt lỗi.

## 20. Các Lỗi Hay Gặp

### `ansible-vault: command not found`

Chưa activate venv:

```bash
source .venv/bin/activate
```

Nếu vẫn lỗi, chạy lại bootstrap:

```bash
./scripts/bootstrap-control-node.sh
source .venv/bin/activate
```

### `community.general.yaml callback plugin has been removed`

Sửa `ansible.cfg`:

```ini
stdout_callback = default
result_format = yaml
```

### `'vault_vm_ciuser' is undefined`

Vault để sai chỗ. File đúng là:

```text
inventories/group_vars/all/vault.yml
```

Test:

```bash
ansible-inventory -i inventories/proxmox.yml --list --ask-vault-pass
```

### `Destination /usr/local/bin is not writable`

Role K3s đang ghi binary vào `/usr/local/bin` mà chưa dùng root cho task đó. Sửa `inventories/group_vars/all.yml`:

```yaml
k3s_become: true
k3s_become_for_all: true
k3s_become_for_install_dir: true
k3s_become_for_package_install: true
k3s_become_for_usr_local_bin: true
```

Sau đó chạy lại:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass
```

Nếu vẫn lỗi, truyền biến trực tiếp khi chạy:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass -e 'k3s_become=true k3s_become_for_all=true k3s_become_for_usr_local_bin=true'
```

### `'generated_artifacts_dir' is undefined`

Thiếu file vars thường dưới inventory. File đúng là:

```text
inventories/group_vars/all.yml
```

Hoặc tạo tối thiểu các biến này trong `inventories/group_vars/all.yml`:

```yaml
repo_root: "{{ playbook_dir }}/../../../.."
generated_artifacts_dir: "{{ repo_root }}/deployment/ansible/proxmox/artifacts"
kubeconfig_path: "{{ generated_artifacts_dir }}/k3s.kubeconfig"
```

Sau đó chạy lại:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_k3s.yml --ask-vault-pass
```

### `vault kv put ... @/tmp/file.json` fails

Vault CLI does not accept a raw JSON file with `vault kv put secret/path @file`. For KV v2, write to the data endpoint with a JSON object containing `data`:

```bash
vault write secret/data/investadvisor/dev/backend @/tmp/backend.json
```

where `/tmp/backend.json` looks like:

```json
{"data":{"KEY":"value"}}
```

The simplest reliable playbook form is to call `vault kv put` with expanded `KEY=value` args:

```yaml
argv: "{{ ['kubectl', '--kubeconfig', kubeconfig_path, '-n', hashicorp_vault_namespace, 'exec', hashicorp_vault_pod, '--', 'env', 'VAULT_ADDR=' ~ hashicorp_vault_addr, 'VAULT_TOKEN=' ~ vault_hashicorp_token, 'vault', 'kv', 'put', hashicorp_vault_kv_mount ~ '/' ~ item.path] + (item.data | dict2items | map(attribute='key') | zip(item.data | dict2items | map(attribute='value') | map('string')) | map('join', '=') | list) }}"
```

### `investadvisor` sync fails because CRDs are missing

If ArgoCD reports missing CRDs for:

```text
keda.sh/ScaledObject
keda.sh/TriggerAuthentication
autoscaling.k8s.io/VerticalPodAutoscaler
monitoring.coreos.com/ServiceMonitor
```

then the app overlay references optional KEDA, VPA, and Prometheus Operator resources before those platform CRDs are installed. Install them:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_platform_crds.yml --ask-vault-pass
```

If you want the app up before installing platform dependencies, temporarily comment these optional resources in `deployment/kubernetes/base/kustomization.yaml`:

```yaml
# - vpa/...
# - servicemonitors/...
# - keda/scaledobjects.yaml
```

Commit/push that change, then resync `investadvisor`.

### `vpa-admission-controller` rollout times out

The upstream VPA admission controller requires the `kube-system/vpa-tls-certs` secret. If rollout waits forever:

```text
Waiting for deployment "vpa-admission-controller" rollout to finish: 0 of 1 updated replicas are available
```

use the current `install_platform_crds.yml`, which generates the VPA CA/server certs, applies `vpa-tls-certs`, applies `admission-controller-deployment.yaml`, and restarts the deployment before waiting.

### `'ingress_nginx_chart_ref' is undefined`

Các playbook `hosts: localhost` cũng cần vars mặc định. Nếu gặp lỗi này, đảm bảo `playbooks/install_ingress_nginx.yml` có block:

```yaml
  vars:
    repo_root: "{{ playbook_dir }}/../../../.."
    generated_artifacts_dir: "{{ repo_root }}/deployment/ansible/proxmox/artifacts"
    kubeconfig_path: "{{ generated_artifacts_dir }}/k3s.kubeconfig"
    ingress_nginx_namespace: ingress-nginx
    ingress_nginx_release_name: ingress-nginx
    ingress_nginx_chart_ref: ingress-nginx/ingress-nginx
    ingress_nginx_chart_version: ""
```

Sau đó chạy lại:

```bash
ansible-playbook -i inventories/proxmox.yml playbooks/install_ingress_nginx.yml --ask-vault-pass
```

### `Failed to resolve 'pve.homedell.local'`

LXC không resolve được domain nội bộ. Dùng IP trong `inventories/proxmox.yml`:

```yaml
proxmox_api_host: 192.168.0.203
```

Hoặc thêm vào `/etc/hosts` trong LXC:

```bash
echo "192.168.0.203 pve.homedell.local pve" >> /etc/hosts
```

### `you can't resize a cdrom`

Template sai hoặc resize nhầm CD-ROM. Kiểm tra VM:

```bash
qm config 301 | grep -E '^(scsi|sata|virtio|ide)[0-9]:'
```

Nếu chỉ thấy:

```text
ide2: ... img,media=cdrom
scsi0: ... cloudinit,media=cdrom
```

thì template không có disk boot thật. Quay lại bước 1 tạo template bằng `qm importdisk`.

## 21. File Không Nên Commit

Không commit các file chứa secret/local config:

```text
deployment/ansible/proxmox/inventories/proxmox.yml
deployment/ansible/proxmox/inventories/group_vars/all/vault.yml
deployment/ansible/proxmox/.vault-pass
deployment/ansible/proxmox/artifacts/
```

Các file example và hướng dẫn thì có thể commit:

```text
deployment/ansible/proxmox/inventories/proxmox.example.yml
deployment/ansible/proxmox/inventories/group_vars/all/vault.yml.example
HOW-TO.md
```
