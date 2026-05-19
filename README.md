# CCNLTHD-gitlab

`CCNLTHD-gitlab` là một monorepo cho nền tảng **InvestAdvisor**: gồm ứng dụng web, backend microservices, dịch vụ AI đa tác tử, hạ tầng Docker/Kubernetes và các tài liệu học tập/phát triển của môn học.

## Tổng quan

- **Frontend**: giao diện React/Vite cho chat AI, dashboard, báo cáo và lịch sử phiên.
- **Backend**: bộ microservices Spring Boot + dịch vụ đa tác tử Python/FastAPI.
- **Hạ tầng**: Docker Compose, Kubernetes, ArgoCD, Vault, External Secrets, Grafana/Prometheus.
- **Tài liệu**: nhật ký sprint, ghi chú nghiên cứu, hướng dẫn test backend và triển khai GitOps.

## Công nghệ chính

- React 19, Vite, Tailwind CSS, React Router, React Query, Zustand
- Spring Boot, Eureka, API Gateway, PostgreSQL, Kafka
- Python/FastAPI cho `multi-agents-service`
- Docker, Kubernetes, ArgoCD, Vault, External Secrets, Grafana, Prometheus
- PowerShell, Bash, YAML, TypeScript/JavaScript

## Cấu trúc thư mục

| Đường dẫn | Mục đích |
|---|---|
| `Main_Project/` | Dự án chính của nền tảng InvestAdvisor |
| `Main_Project/Backend/` | Microservices, Docker Compose, script khởi tạo CSDL, tài liệu test backend |
| `Main_Project/Frontend/` | Ứng dụng web React/Vite và tài liệu UI chat AI |
| `Main_Project/Python Script/` | Script/tiện ích hỗ trợ |
| `Main_Project/tests/` | Kiểm thử bổ sung |
| `deployment/` | Manifest Kubernetes, ArgoCD, GitOps, monitoring, addon |
| `Development_Process/` | Nhật ký sprint, báo cáo tiến độ, nghiên cứu |
| `Lectures/` | Tài liệu học tập, sách, bài giảng |

## Các thành phần chính

| Thành phần | Vai trò | Cổng mặc định |
|---|---|---|
| Frontend | UI chat AI, report, history | `5173` khi chạy dev / `80` khi chạy Docker |
| API Gateway | Cửa vào chính của backend | `8085` (có thể đổi bằng `API_GATEWAY_PORT`) |
| Eureka Server | Service registry | `8761` |
| Kafka UI | Theo dõi Kafka | `8090` |
| `user-service` | Đăng ký, đăng nhập, hồ sơ người dùng | `8081` |
| `market-data-service` | Dữ liệu thị trường | `8082` |
| `portfolio-service` | Danh mục và phân tích | `8083` |
| `notification-service` | Gửi thông báo/email | `8084` |
| `multi-agents-service` | AI chat và phân tích đa tác tử | `8086` |
| PostgreSQL | CSDL | `5432` / `5433` |

## Cấu hình môi trường

Trước khi chạy backend, hãy tạo file môi trường local từ các file mẫu:

```powershell
Copy-Item Main_Project\Backend\.env.example Main_Project\Backend\.env
Copy-Item Main_Project\Backend\multi-agents-service\.env.example Main_Project\Backend\multi-agents-service\.env
```

Các biến thường cần kiểm tra/điền giá trị thật:

- `JWT_SECRET`
- `VNSTOCK_API_KEY`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`
- `SECRET_KEY`

> Không commit file `.env` lên Git. Các khóa dịch vụ bên thứ ba chỉ nên lưu ở máy local hoặc hệ thống secret management.

## Chạy nhanh bằng Docker Compose

### Chạy toàn bộ stack

```powershell
cd Main_Project
docker compose up -d --build
```

Sau khi chạy xong, kiểm tra trạng thái:

```powershell
docker compose ps
```

Các địa chỉ thường dùng:

- Frontend: `http://localhost`
- API Gateway: `http://localhost:8085`
- Eureka: `http://localhost:8761`
- Kafka UI: `http://localhost:8090`

Để dừng và xóa volume:

```powershell
docker compose down -v
```

### Chỉ chạy backend

Nếu bạn chỉ muốn chạy phần API và các service phía sau, dùng compose trong thư mục backend:

```powershell
cd Main_Project\Backend
docker compose up -d --build
```

## Phát triển frontend cục bộ

```powershell
cd Main_Project\Frontend
npm install
npm run dev
```

Một số biến cấu hình frontend:

- `VITE_API_URL`: mặc định là `/api`
- `VITE_API_GATEWAY_URL`: địa chỉ gateway mà Vite proxy tới, mặc định `http://localhost:8085`
- `VITE_MOCK_API`: bật chế độ mock cho dev nếu cần thử giao diện khi backend chưa sẵn sàng

Frontend cũng có tài liệu riêng về luồng chat AI và mock mode tại `Main_Project/Frontend/CHATBOT_UI_IMPLEMENTATION.md` và `Main_Project/Frontend/src/mock/README.md`.

## Triển khai Kubernetes / GitOps

Thư mục `deployment/kubernetes` là source of truth cho Kubernetes theo mô hình GitOps.

- Root ArgoCD app-of-apps: `deployment/kubernetes/argocd-platform-application.yaml`
- External Secrets: `deployment/kubernetes/argocd-external-secrets-application.yaml`
- Vault dev/local: `deployment/kubernetes/argocd-vault-dev-application.yaml`
- Quy trình đồng bộ và thứ tự bootstrap: `deployment/kubernetes/GITOPS.md`

Luồng secret được quản lý qua Vault + External Secrets, không lưu giá trị secret thật trong Git.

Nếu chạy với Kind theo cấu hình trong repo, các NodePort quan trọng là:

- Grafana: `31100`
- Prometheus: `31200`

## Tài liệu hữu ích

- `Main_Project/docs/backend-test.md` — hướng dẫn test backend từ đầu đến cuối bằng PowerShell
- `Main_Project/Frontend/CHATBOT_UI_IMPLEMENTATION.md` — mô tả chi tiết UI chat AI và luồng SSE
- `deployment/kubernetes/GITOPS.md` — mô tả GitOps, Vault và External Secrets
- `Main_Project/BACKEND_INTEGRATION.md` — ghi chú tích hợp backend

## Ghi chú

- Repo này là một monorepo nên mỗi phần có thể có vòng đời phát triển riêng.
- Khi debug nhanh frontend, hãy kiểm tra `VITE_API_URL` hoặc cấu hình proxy của Vite trước.
- Khi triển khai thật, hãy thay các giá trị mặc định trong `.env` bằng secret phù hợp môi trường.

## Thành viên:

- **Project Leader:** *[Lâm Quang Khôi](https://github.com/kohi-vip)*
- **Team Member:** *[Huỳnh Thanh Tuấn](https://github.com/CallmeSen)*
- **Team Member:** *[Nguyễn Trọng Nghĩa](https://github.com/nghia108)*
- **Team Member:** *[Đỗ Minh Triết](https://github.com/tkegend)*
