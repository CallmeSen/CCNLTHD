# Product Service - Hướng dẫn cài đặt và chạy

## Yêu cầu bắt buộc
- [JDK 21](https://www.oracle.com/java/technologies/downloads/#java21) — cài và set `JAVA_HOME`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — đang chạy
- Git

> XAMPP và VS Code đã có sẵn — không cần cài thêm gì khác.

---

## Bước 1 — Clone repo và checkout branch

```powershell
git clone <repo-url>
cd D:\CNLTHD\CCNLTHD
git checkout product_service
```

---

## Bước 2 — Kiểm tra Java

```powershell
java -version
```

Expected: `java version "21.x.x"`

---

## Bước 3 — Tải images Docker (lần đầu cần internet)

```powershell
docker pull mongo:7
docker pull eclipse-temurin:21-jre
docker pull openzipkin/zipkin:latest
```

> Các lần sau không cần pull lại — Docker dùng cache trên máy.

---

## Bước 4 — Build JAR

```powershell
cd D:\CNLTHD\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices
.\product_service\mvnw -f pom.xml package -DskipTests
```

> Maven tự tải dependencies lần đầu (~2-5 phút tùy mạng).
> Kết quả: `BUILD SUCCESS` + file `product_service/target/product-service-0.0.1-SNAPSHOT.jar`

---

## Bước 5 — Khởi động server bằng Docker Compose

```powershell
cd D:\CNLTHD\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices
docker compose up -d mongodb eureka-server product-service
```

Đợi ~15 giây để các containers khởi động xong.

Kiểm tra trạng thái:
```powershell
docker compose ps
```

Expected (tất cả `running`):
```
microservices-demo-mongodb-1           running   27017/tcp
microservices-demo-eureka-server-1     running   8761/tcp
microservices-demo-product-service-1   running   8083/tcp
```

---

## Bước 6 — Test API

### Tạo sản phẩm (POST → HTTP 201)
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:8083/api/product `
  -ContentType "application/json" `
  -Body '{"name":"iPhone 13","description":"iPhone 13","price":1200}'
```

### Lấy danh sách sản phẩm (GET → HTTP 200)
```powershell
Invoke-RestMethod -Uri http://localhost:8083/api/product
```

Expected:
```json
[
  {
    "id": "...",
    "name": "iPhone 13",
    "description": "iPhone 13",
    "price": 1200
  }
]
```

### Health check
```powershell
Invoke-RestMethod -Uri http://localhost:8083/actuator/health
```

### Prometheus metrics
```powershell
Invoke-RestMethod -Uri http://localhost:8083/actuator/prometheus
```

---

## Xem database bằng MongoDB Compass (GUI)

1. Tải [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Mở Compass → **New Connection**
3. Dán URI:
```
mongodb://product_user:product_password@127.0.0.1:27017/?authSource=admin
```
4. Connect → chọn database `product_db` → collection `product`

> **Lưu ý:** Nếu máy đang chạy MongoDB local (XAMPP/service), phải tắt đi trước:
> `net stop MongoDB`

---

## Tắt server

```powershell
cd D:\CNLTHD\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices
docker compose down
```

Tắt và xóa data (reset hoàn toàn):
```powershell
docker compose down -v
```

---

## Chạy lại lần sau (đã có image và JAR)

```powershell
cd D:\CNLTHD\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices
docker compose up -d mongodb eureka-server product-service
```

> Không cần pull image hay build JAR lại trừ khi có thay đổi code.

---

## Nếu có thay đổi code — Rebuild

```powershell
cd D:\CNLTHD\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices

# 1. Build lại JAR
.\product_service\mvnw -f pom.xml package -DskipTests

# 2. Rebuild image và restart
docker compose up -d --build product-service
```

---

## Chạy local (không dùng Docker, dùng MongoDB local của XAMPP)

```powershell
cd D:\CNLTHD\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices\product_service
.\mvnw spring-boot:run
```

> MongoDB local kết nối vào `mongodb://localhost:27017/product-service` (không cần auth).
> Dữ liệu lưu vào database `product-service` thay vì `product_db`.

---

## Tóm tắt ports

| Service         | Port  | URL                                    |
|----------------|-------|----------------------------------------|
| product-service | 8083  | http://localhost:8083/api/product      |
| MongoDB         | 27017 | mongodb://localhost:27017              |
| Eureka Server   | 8761  | http://localhost:8761                  |
| Zipkin          | 9411  | http://localhost:9411                  |
