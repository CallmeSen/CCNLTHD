# ProjectWeb - Microservices Backend



## 🧰 Công nghệ sử dụng

| Thành phần           | Công nghệ                     |
|---------------------|-------------------------------|
| Ngôn ngữ             | Java 17                       |
| Framework           | Spring Boot 3                 |
| Service Discovery   | Eureka                        |
| API Gateway         | Spring Cloud Gateway          |
| Database            | PostgreSQL                    |
| Message Broker      | Apache Kafka                  |
| CI/CD               | GitHub Actions                |
| Containerization    | Docker                        |
| Orchestration       | Kubernetes (Minikube)         |
## 📁 Cấu trúc thư mục

```
ProjectWeb/
│
├── .github/workflows/        # File CI/CD GitHub Actions
├── BE/                       # Tất cả các service backend
│   ├── user-service/         
│   ├── product-service/
    ├── order-service/
    ├── notification-service/
    ├── payment-service/
    ├── eureka-server/
    ├── api-gateway/
├── k8s/                      # Các file YAML cho Kubernetes (Deployment, Service, Ingress, etc.)
├── docker-compose.yml        # (Tùy chọn) Compose dùng khi chạy local
└── README.md
```

[//]: # (## 🚀 CI/CD với GitHub Actions)

[//]: # ()
[//]: # (Workflow tự động thực hiện:)

[//]: # ()
[//]: # (1. **Phát hiện thay đổi** trong thư mục `BE/`)

[//]: # (2. Build từng service bị thay đổi)

[//]: # (3. Build và push Docker image lên Docker Hub)

[//]: # (4. Cập nhật image tương ứng trong cluster Kubernetes &#40;qua `kubectl` và `KUBECONFIG` bí mật&#41;)

[//]: # ()
[//]: # (> 👉 CI/CD chỉ kích hoạt khi có `push` vào nhánh `BE` và có thay đổi trong `BE/**`.)


## 🐳 Docker

Mỗi service có một `Dockerfile` riêng nằm trong `BE/[service-name]/Dockerfile`.

Bạn cần:

* Docker
* Docker Hub account
* Secrets `DOCKER_USERNAME` và `DOCKER_PASSWORD` trong GitHub repo

## ☸️ Triển khai Kubernetes

Cluster sử dụng:

* **Minikube** (hoặc cụm thật)
* File manifest nằm trong thư mục `k8s/`

Cần khai báo secret `KUBECONFIG` (nội dung file `~/.kube/config`) trong GitHub Secrets để CI/CD cập nhật deployment.

## 👨‍💻 Các bước cài đặt local (dev)

```bash
# Clone repo
git clone https://github.com/Taun0813/ProjectWeb.git
cd ProjectWeb

# Khởi chạy từng service hoặc dùng docker-compose
cd BE/user-service
./mvnw spring-boot:run
```

## 🥪 Testing & Build

```bash
./mvnw test          # Unit tests
./mvnw clean package # Build file JAR
```

## 🔐 Secrets trong GitHub cần thiết

| Tên secret        | Mô tả                      |
| ----------------- | -------------------------- |
| `DOCKER_USERNAME` | Tài khoản Docker Hub       |
| `DOCKER_PASSWORD` | Mật khẩu hoặc token Docker |
| `KUBECONFIG`      | Nội dung file kubeconfig   |

## 📬 Liên hệ

* **Tác giả:** [@Taun0813](https://github.com/Taun0813)
* **Repo chính:** [https://github.com/Taun0813/ProjectWeb](https://github.com/Taun0813/ProjectWeb)

---


