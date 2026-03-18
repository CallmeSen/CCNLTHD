# Hướng dẫn chạy và test `inventory_service`

## Môi trường chuẩn bị
- Java 21 (đã dùng trong dự án).  
- Maven (3.x).  
- Docker & Docker Compose (nếu muốn chạy Postgres/Zipkin bằng container).

## 1) Chạy nhanh (local, không cần Eureka)
Nếu bạn chỉ chạy service này độc lập (không cần Eureka):

```bash
# Build
mvn clean package

# Chạy bằng spring-boot:run và tắt đăng ký Eureka
mvn spring-boot:run -Dspring-boot.run.arguments="--eureka.client.register-with-eureka=false --eureka.client.fetch-registry=false"

# Hoặc chạy jar đã đóng gói
java -jar target/inventory-service-0.0.1-SNAPSHOT.jar --eureka.client.register-with-eureka=false --eureka.client.fetch-registry=false
```

## 2) Chạy cùng phụ trợ (Postgres, Zipkin) bằng Docker Compose
Trong thư mục `inventory_service` có `docker-compose.yml` (chứa `postgres` và `zipkin`).

```bash
# Bật Postgres và Zipkin
docker compose up -d

# Kiểm tra logs nếu cần
docker compose logs -f postgres
```

Sau khi phụ trợ sẵn sàng, chạy service (bình thường có thể đăng ký Eureka nếu có):

```bash
mvn spring-boot:run
# hoặc
mvn clean package && java -jar target/inventory-service-0.0.1-SNAPSHOT.jar
```

> Lưu ý: nếu bạn dùng docker-compose để chạy cả `eureka_server` (nếu có trong workspace), đảm bảo Eureka chạy ở `http://localhost:8761` trước khi khởi động `inventory_service`.

## 3) Nếu dự án dùng Eureka (microservices full-stack)
- Khởi động `eureka-server` trước.
- Sau đó chạy `inventory_service` bình thường (không cần tắt `eureka.client`).

Nếu không có Eureka hoặc muốn tắt:
- Thêm trong `src/main/resources/application.properties` hoặc profile:
```
eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false
```

## 4) Biến môi trường / cấu hình DB
`docker-compose.yml` hiện đặt:
- POSTGRES_DB=inventory
- POSTGRES_USER=thaituan
- POSTGRES_PASSWORD=123

Ứng dụng có thể dùng biến môi trường sau nếu cần override (theo code dự án):
- INVENTORY_DB_URL (ví dụ: jdbc:postgresql://postgres:5432/inventory)
- INVENTORY_DB_USERNAME
- INVENTORY_DB_PASSWORD

Ví dụ chạy với biến môi trường (PowerShell):

```powershell
$env:INVENTORY_DB_URL = 'jdbc:postgresql://localhost:5432/inventory'
$env:INVENTORY_DB_USERNAME = 'thaituan'
$env:INVENTORY_DB_PASSWORD = '123'
mvn spring-boot:run
```

## 5) Chạy test
- Chạy unit/integration tests bằng Maven:

```bash
mvn test
```

- Nếu muốn chỉ build mà bỏ test:

```bash
mvn clean package -DskipTests
```

- Kết quả test và báo coverage (jacoco) sẽ nằm trong `target` sau khi chạy `mvn test` hoặc `mvn package`.

## 6) Kiểm tra logs và debug
- Logs khi chạy `mvn spring-boot:run` hiển thị ở terminal.
- Nếu có lỗi kết nối tới Eureka (Connection refused http://localhost:8761):
  - Chạy Eureka server trước, hoặc
  - Tắt đăng ký Eureka theo mục 1/3.

## 7) Tóm tắt lệnh thường dùng
```bash
# Start postgres & zipkin (compose)
docker compose up -d

# Build
mvn clean package

# Run local without Eureka
mvn spring-boot:run -Dspring-boot.run.arguments="--eureka.client.register-with-eureka=false --eureka.client.fetch-registry=false"

# Run packaged jar
java -jar target/inventory-service-0.0.1-SNAPSHOT.jar

# Run tests
mvn test
```

---
File này được tạo để hướng dẫn nhanh cách chạy và test `inventory_service` trong workspace.